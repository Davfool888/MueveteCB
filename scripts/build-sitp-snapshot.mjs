/**
 * ETL reproducible de los servicios oficiales del SITP para Ciudad Bolívar.
 *
 * Entradas (ya versionadas en el repositorio):
 *   - src/data/Servicios_Rutas_Troncales_y_Zonales.geojson  "Servicios" (FeatureServer/15)
 *   - src/data/paraderos.json                               "Paraderos Zonales del SITP"
 *
 * Salidas:
 *   - src/data/sitp-routes-snapshot.json
 *   - src/data/sitp-stops-snapshot.json
 *
 * El extracto original cubre 682 rutas de todo Bogotá y no trae paradas asociadas,
 * por lo que aquí se filtra a Ciudad Bolívar, se decodifican los dominios officially
 * publicados por Transmilenio y se resuelve el vínculo ruta ↔ parada por proximity
 * espacial, que es una inferencia y no un dato oficial.
 *
 * Uso:  node scripts/build-sitp-snapshot.mjs
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const cableSnapshot = JSON.parse(await readFile(resolve(projectRoot, 'src/data/cable-snapshot.json'), 'utf8'));
const routesInput = resolve(projectRoot, 'src/data/Servicios_Rutas_Troncales_y_Zonales.geojson');
const stopsInput = resolve(projectRoot, 'src/data/paraderos.json');
const routesOutput = resolve(projectRoot, 'src/data/sitp-routes-snapshot.json');
const stopsOutput = resolve(process.argv[2] || resolve(projectRoot, 'src/data/sitp-stops-snapshot.json'));
const routesOutputArg = process.argv[3] || routesOutput;

/** Localidad de Ciudad Bolívar según el dominio `servicio_localidad` de Transmilenio. */
const CB_LOCALITY_CODE = 19;

/** Tolerancia de simplificación Douglas-Peucker, en grados (~22 m a esta latitud). */
const SIMPLIFY_TOLERANCE = 0.0004;

/** Radio máximo para considerar que una parada pertenece al corredor de una ruta. */
const STOP_CORRIDOR_RADIUS_M = 150;

/** Distancia máxima entre el trazado de una ruta y una estación para contar como integración. */
const CABLE_INTEGRATION_RADIUS_KM = 1;

/** Umbral de porcentaje del trazado dentro de Ciudad Bolívar para conservar la ruta. */
const MIN_CORRIDOR_FRACTION = 0.01;

/**
 * Diccionarios tomados del dominio publicado del FeatureServer/15.
 * @see https://gis.transmilenio.gov.co/arcgis/rest/services/ConsultaSubgerenciaPlanificacionSITP/Consulta_Planificacion_SITP/FeatureServer/15
 */
const LOCALITY_BY_CODE = {
  0: 'Soacha', 1: 'Usaquén', 2: 'Chapinero', 3: 'Santa Fe', 4: 'San Cristóbal',
  5: 'Usme', 6: 'Tunjuelo', 7: 'Bosa', 8: 'Kennedy', 9: 'Puente Aranda',
  10: 'La Candelaria', 11: 'Fontibón', 12: 'Engativá', 13: 'Suba',
  14: 'Barrios Unidos', 15: 'Teusaquillo', 16: 'Antonio Nariño', 17: 'Los Mártires',
  18: 'Rafael Uribe Uribe', 19: 'Ciudad Bolívar', 20: 'Sumapaz',
};

const ZONE_BY_CODE = {
  0: 'Neutra', 1: 'Usaquén', 2: 'Suba Oriental', 3: 'Suba Centro', 4: 'Calle 80',
  5: 'Engativá', 6: 'Fontibón', 7: 'Tintal - Zona Franca', 8: 'Kennedy', 9: 'Bosa',
  10: 'Perdomo', 11: 'Ciudad Bolívar', 12: 'Usme', 13: 'San Cristóbal',
  14: 'Soacha', 15: 'Fuera de Bogotá',
};

const COMPONENT_BY_CODE = { 1: 'Transmilenio', 2: 'TransMiZonal' };

/** `tip_serv` significa cosas distintas según el componente SITP. */
const SERVICE_TYPE_BY_COMPONENT = {
  1: { 1: 'Troncal', 2: 'Dual' },
  2: { 1: 'Urbano', 2: 'Alimentación', 3: 'Complementaria', 4: 'Especial' },
};

const BUS_TYPE_BY_CODE = {
  1: 'Biarticulado', 2: 'Articulado', 3: 'Padrón', 4: 'Busetón', 5: 'Buseta', 6: 'Articulado dual',
};

const ROUTE_STATE_BY_CODE = { 1: 'Operativa', 2: 'No operativa' };
const ROUTE_KIND_BY_CODE = { 1: 'Comercial', 2: 'Refuerzo', 3: 'Ciclorruta', 4: 'Temporal' };
const RURAL_BY_CODE = { 1: 'Sí', 2: 'No', 3: 'Por definir' };
const DAYS_BY_CODE = {
  1: 'Lunes a viernes', 2: 'Lunes a sábado', 3: 'Lunes a domingo', 4: 'Domingos y festivos',
};
const SCHEDULE_TYPE_BY_CODE = {
  1: 'Diurno', 2: 'Pico AM y PM', 3: 'Pico AM', 4: 'Pico PM',
};

const SOURCE_URL =
  'https://gis.transmilenio.gov.co/arcgis/rest/services/ConsultaSubgerenciaPlanificacionSITP/Consulta_Planificacion_SITP/FeatureServer/15';
const STOPS_SOURCE_URL =
  'https://gis.transmilenio.gov.co/arcgis/rest/services/Zonal/consulta_paraderos/FeatureServer/0';

/**
 * Estaciones del cable con su identificador oficial (`num_est`).
 *
 * Se leen del extracto del cable y no de `routes.js` porque la integración de un
 * corredor SITP con el cable tiene que apuntar al mismo identificador que usa el
 * índice del cable en tiempo de ejecución. Si las dos fuentes quedaran
 * desalineadas, ninguna alternativa que combine bus y cable encontraría su
 * estación. Requiere haber corrido antes `build-cable-snapshot.mjs`.
 */
const CABLE_STATIONS = (cableSnapshot.stations ?? []).map((station) => ({
  id: String(station.id),
  name: station.name,
  coordinates: [Number(station.coordinates[0].toFixed(5)), Number(station.coordinates[1].toFixed(5))],
}));

/* -------------------------------------------------------------------------- */
/* Proyección local                                                           */
/* -------------------------------------------------------------------------- */

const REFERENCE_LATITUDE = 4.536;
const METERS_PER_DEGREE_LATITUDE = 110574;
const METERS_PER_DEGREE_LONGITUDE = 111320 * Math.cos((REFERENCE_LATITUDE * Math.PI) / 180);

/** Proyecta [lat, lng] a metros locales. Válido solo para distancias cortas. */
function toXY([latitude, longitude]) {
  return [longitude * METERS_PER_DEGREE_LONGITUDE, latitude * METERS_PER_DEGREE_LATITUDE];
}

/* -------------------------------------------------------------------------- */
/* Geometría                                                                  */
/* -------------------------------------------------------------------------- */

/** Distancia perpendicular de un punto al segmento AB, en grados. */
function perpendicularDistance(point, start, end) {
  const dx = end[1] - start[1];
  const dy = end[0] - start[0];
  const length = Math.hypot(dx, dy);
  if (length === 0) return Math.hypot(point[1] - start[1], point[0] - start[0]);
  return Math.abs(dy * (point[1] - start[1]) - dx * (point[0] - start[0])) / length;
}

/** Douglas-Peucker sobre una polilínea [lat, lng]. */
function simplifyPath(points, tolerance) {
  if (points.length < 3) return points.slice();
  let farthestIndex = 0;
  let farthestDistance = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (distance > farthestDistance) {
      farthestDistance = distance;
      farthestIndex = i;
    }
  }
  if (farthestDistance > tolerance) {
    const head = simplifyPath(points.slice(0, farthestIndex + 1), tolerance).slice(0, -1);
    const tail = simplifyPath(points.slice(farthestIndex), tolerance);
    return head.concat(tail);
  }
  return [points[0], points[points.length - 1]];
}

/**
 * Distancia en metros de un punto a una polilínea, y su posición acumulada
 * en metros desde el inicio del trazado.
 */
function measureAgainstPath(pointMeters, pathMeters) {
  let best = { distanceMeters: Infinity, alongMeters: 0 };
  let walked = 0;
  for (let i = 0; i < pathMeters.length - 1; i += 1) {
    const [x1, y1] = pathMeters[i];
    const [x2, y2] = pathMeters[i + 1];
    const segmentLength = Math.hypot(x2 - x1, y2 - y1);
    const cross = (x2 - x1) * (pointMeters[1] - y1) - (y2 - y1) * (pointMeters[0] - x1);
    const squared = segmentLength === 0 ? 0 : (cross * cross) / (segmentLength * segmentLength);
    if (squared < best.distanceMeters) {
      best = { distanceMeters: Math.sqrt(squared), alongMeters: walked };
    }
    walked += segmentLength;
  }
  return best;
}

/** Distancia mínima en km de un punto a un trazado multibanda. */
function distanceKmToPaths(point, paths) {
  const pointMeters = toXY(point);
  let best = Infinity;
  for (const path of paths) {
    const measured = measureAgainstPath(pointMeters, path.map(toXY));
    if (measured.distanceMeters < best) best = measured.distanceMeters;
  }
  return best / 1000;
}

/* -------------------------------------------------------------------------- */
/* Lectura y filtrado de rutas                                               */
/* -------------------------------------------------------------------------- */

const routesGeoJson = JSON.parse(await readFile(routesInput, 'utf8'));

const selectedRoutes = [];
let totalFeatures = 0;
let rejectedNotOperational = 0;
let rejectedNotCommercial = 0;

for (const feature of routesGeoJson.features ?? []) {
  totalFeatures += 1;
  const properties = feature.properties ?? {};
  const parts = (feature.geometry?.coordinates ?? []).map((line) =>
    line.map(([longitude, latitude]) => [latitude, longitude]),
  );
  if (parts.length === 0) continue;

  if (properties.est_ruta !== 1) {
    rejectedNotOperational += 1;
    continue;
  }
  if (properties.tipo_ruta !== 1) {
    rejectedNotCommercial += 1;
    continue;
  }

  // El sentido se conserva tal como lo publica el operador: el extracto no marca
  // en qué extremo arranca el bus, así que no se infiere. Se declara lo que dice.

  // El resto del proyecto representa puntos como [lat, lng]; se conserva ese orden.
  const simplifiedPaths = parts
    .map((part) =>
      simplifyPath(part, SIMPLIFY_TOLERANCE).map(([latitude, longitude]) => [
        Number(latitude.toFixed(4)),
        Number(longitude.toFixed(4)),
      ]),
    )
    .filter((part) => part.length > 1);

  const component = COMPONENT_BY_CODE[properties.comp_sitp] ?? 'Desconocido';
  const serviceType = SERVICE_TYPE_BY_COMPONENT[properties.comp_sitp]?.[properties.tip_serv] ?? 'Desconocido';

  let cableIntegration = null;
  for (const station of CABLE_STATIONS) {
    const distanceKm = distanceKmToPaths(station.coordinates, simplifiedPaths);
    if (distanceKm <= CABLE_INTEGRATION_RADIUS_KM && (!cableIntegration || distanceKm < cableIntegration.distanceKm)) {
      cableIntegration = {
        stationId: station.id,
        stationName: station.name,
        distanceKm: Number(distanceKm.toFixed(3)),
      };
    }
  }

  const lengthKm = Number(properties.long_ruta);
  selectedRoutes.push({
    code: properties.cod_linea,
    id: properties.cod_ruta || `oid-${properties.objectid}`,
    name: properties.nom_ruta,
    origin: properties.orig_ruta,
    destination: properties.dest_ruta,
    component,
    serviceType,
    busType: BUS_TYPE_BY_CODE[properties.tip_bus] ?? 'Desconocido',
    busTypeCode: properties.tip_bus ?? null,
    state: ROUTE_STATE_BY_CODE[properties.est_ruta] ?? 'Desconocida',
    kind: ROUTE_KIND_BY_CODE[properties.tipo_ruta] ?? 'Desconocido',
    isRural: properties.ruta_rural === 1,
    ruralStatus: RURAL_BY_CODE[properties.ruta_rural] ?? 'Por definir',
    operator: properties.oper_ruta || null,
    daysLabel: DAYS_BY_CODE[properties.dias_oper] ?? 'Desconocido',
    scheduleType: SCHEDULE_TYPE_BY_CODE[properties.tip_hor] ?? 'Desconocido',
    schedule: {
      weekday: properties.hor_habil || null,
      Saturday: properties.hor_sab || null,
      holiday: properties.hor_fest || null,
    },
    originLocality: { code: properties.loc_orig, name: LOCALITY_BY_CODE[properties.loc_orig] ?? 'Desconocida' },
    destinationLocality: { code: properties.loc_dest, name: LOCALITY_BY_CODE[properties.loc_dest] ?? 'Desconocida' },
    originZone: { code: properties.zon_orig, name: ZONE_BY_CODE[properties.zon_orig] ?? 'Desconocida' },
    destinationZone: { code: properties.zon_dest, name: ZONE_BY_CODE[properties.zon_dest] ?? 'Desconocida' },
    lengthKm: Number.isFinite(lengthKm) && lengthKm < 1000 ? Number(lengthKm.toFixed(2)) : null,
    cableIntegration,
    boardingStop: null,
    alightingStop: null,
    paths: simplifiedPaths,
  });
}

/* -------------------------------------------------------------------------- */
/* Lectura y filtrado de paradas                                              */
/* -------------------------------------------------------------------------- */

const stopsEsri = JSON.parse(await readFile(stopsInput, 'utf8'));
const allStops = (stopsEsri.features ?? []).map((entry) => ({
  ...(entry.attributes ?? {}),
  __geometry: entry.geometry ?? null,
}));

/**
 * El feed trae la posición en dos sitios y no siempre coinciden: hay registros con
 * `latitud_pa` duplicada del longitud, y registros con 0,0. Se lee la geometría
 * cuando los atributos no caen en el Distrito, y si tampoco la geometría sirve se
 * descarta el registro en lugar de publicar un punto inventado.
 */
const DISTRICT_BOUNDS = { south: 4.3, west: -74.35, north: 4.85, east: -74.0 };

function readCoordinates(attributes, geometry) {
  const candidates = [
    [attributes.latitud_pa, attributes.longitud_p],
    geometry ? [geometry.y, geometry.x] : null,
  ].filter(Boolean);

  for (const [latitude, longitude] of candidates) {
    const lat = Number(latitude);
    const lon = Number(longitude);
    const usable =
      Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      lat >= DISTRICT_BOUNDS.south &&
      lat <= DISTRICT_BOUNDS.north &&
      lon >= DISTRICT_BOUNDS.west &&
      lon <= DISTRICT_BOUNDS.east;
    if (usable) return [lat, lon];
  }
  return null;
}

/**
 * Se conservan solo los campos que la interfaz usa. Con 7.653 paradas, incluir
 * `consola_pa`, `panel_para` y `objectid` multiplicaba el archivo por dos sin que
 * aportaran nada: son textos dirigidos al conductor y al panel del bus.
 */
const selectedStops = allStops
  .map((attributes) => {
    const geometry = attributes.__geometry;
    const coordinates = readCoordinates(attributes, geometry);
    if (!coordinates) return null;
    return {
      id: attributes.cenefa_par,
      name: attributes.nombre_par || attributes.via_parade || 'Paradero sin nombre',
      street: attributes.via_parade || attributes.direccion_ || null,
      zone: { code: attributes.zona_parad, name: ZONE_BY_CODE[attributes.zona_parad] ?? 'Desconocida' },
      locality: { code: attributes.localidad_, name: LOCALITY_BY_CODE[attributes.localidad_] ?? 'Desconocida' },
      coordinates: [Number(coordinates[0].toFixed(4)), Number(coordinates[1].toFixed(4))],
    };
  })
  .filter((stop) => stop && Boolean(stop.id));

/* -------------------------------------------------------------------------- */
/* Puntos de abordaje y de bajada                                              */
/* -------------------------------------------------------------------------- */

/**
 * Índice de rejilla sobre los paraderos.
 *
 * Comparar 682 corredores contra 7.653 paraderos punto a punto son cinco millones
 * de medidas por segmento: minutes of CPU. Con una rejilla de ~1,1 km cada
 * corredor solo consulta las celdas que su envolvente puede tocar, y el tiempo
 * baja a segundos sin cambiar el resultado.
 */
const GRID_CELL_DEGREES = 0.01;
const GRID_CELL_METERS = GRID_CELL_DEGREES * METERS_PER_DEGREE_LATITUDE;

function buildStopGrid(stops) {
  const grid = new Map();
  const pad = Math.ceil(STOP_CORRIDOR_RADIUS_M / GRID_CELL_METERS);

  for (const stop of stops) {
    const [latitude, longitude] = stop.coordinates;
    const cellX = Math.floor(longitude / GRID_CELL_DEGREES);
    const cellY = Math.floor(latitude / GRID_CELL_DEGREES);
    for (let dy = -pad; dy <= pad; dy += 1) {
      for (let dx = -pad; dx <= pad; dx += 1) {
        const key = `${cellX + dx}:${cellY + dy}`;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(stop);
      }
    }
  }
  return { grid, pad };
}

function* candidatesNear(grid, latitude, longitude) {
  const cellX = Math.floor(longitude / GRID_CELL_DEGREES);
  const cellY = Math.floor(latitude / GRID_CELL_DEGREES);
  for (let dy = -grid.pad; dy <= grid.pad; dy += 1) {
    for (let dx = -grid.pad; dx <= grid.pad; dx += 1) {
      const bucket = grid.grid.get(`${cellX + dx}:${cellY + dy}`);
      if (bucket) yield* bucket;
    }
  }
}

function boundingBoxOfPaths(paths) {
  let south = Infinity;
  let west = Infinity;
  let north = -Infinity;
  let east = -Infinity;
  for (const path of paths) {
    for (const [latitude, longitude] of path) {
      if (latitude < south) south = latitude;
      if (latitude > north) north = latitude;
      if (longitude < west) west = longitude;
      if (longitude > east) east = longitude;
    }
  }
  return { south, west, north, east };
}

/**
 * El extracto no publica una matriz de paradas por ruta, y aproximarla no sirve:
 * en las arteriales de la ciudad las paradas se concentran, así que un solo
 * paradero queda a menos de 150 m de más de cien corredores. Guardar esa lista
 * como "rutas que sirven la parada" sería falso.
 *
 * En su lugar se guarda un único punto por extremo, que sí es defendible:
 *   - `boardingStop`: el paradero más cercano al propio trazado del corredor;
 *   - `alightingStop`: el paradero más cercano a la estación de integración.
 */
const stopGrid = buildStopGrid(selectedStops);

function* stopsNearPaths(paths, bounds) {
  const seen = new Set();
  const south = bounds.south - GRID_CELL_DEGREES * 1.5;
  const north = bounds.north + GRID_CELL_DEGREES * 1.5;
  const west = bounds.west - GRID_CELL_DEGREES * 1.5;
  const east = bounds.east + GRID_CELL_DEGREES * 1.5;

  for (let cellY = Math.floor(south / GRID_CELL_DEGREES); cellY <= Math.floor(north / GRID_CELL_DEGREES); cellY += 1) {
    for (let cellX = Math.floor(west / GRID_CELL_DEGREES); cellX <= Math.floor(east / GRID_CELL_DEGREES); cellX += 1) {
      const bucket = stopGrid.grid.get(`${cellX}:${cellY}`);
      if (!bucket) continue;
      for (const stop of bucket) {
        if (seen.has(stop.id)) continue;
        seen.add(stop.id);
        yield stop;
      }
    }
  }
}

function nearestStopToPaths(stops, paths) {
  const pathMeters = paths.map((path) => path.map(([latitude, longitude]) => toXY([latitude, longitude])));
  let best = null;
  for (const stop of stops) {
    const pointMeters = toXY(stop.coordinates);
    let closest = Infinity;
    for (const path of pathMeters) {
      const measured = measureAgainstPath(pointMeters, path);
      if (measured.distanceMeters < closest) closest = measured.distanceMeters;
    }
    if (!best || closest < best.distanceMeters) {
      best = { stop, distanceMeters: closest };
    }
  }
  return best;
}

function nearestStopToPoint(point) {
  const [targetX, targetY] = toXY(point);
  let best = null;
  for (const stop of candidatesNear(stopGrid, point[0], point[1])) {
    const [stopX, stopY] = toXY(stop.coordinates);
    const distanceMeters = Math.hypot(stopX - targetX, stopY - targetY);
    if (!best || distanceMeters < best.distanceMeters) best = { stop, distanceMeters };
  }
  return best;
}

function describeStop(entry) {
  if (!entry) return null;
  return {
    stopId: entry.stop.id,
    name: entry.stop.name,
    street: entry.stop.street,
    distanceMeters: Math.round(entry.distanceMeters),
  };
}

for (const route of selectedRoutes) {
  const bounds = boundingBoxOfPaths(route.paths);
  const boarding = nearestStopToPaths([...stopsNearPaths(route.paths, bounds)], route.paths);
  const station = route.cableIntegration
    ? CABLE_STATIONS.find((item) => item.id === route.cableIntegration.stationId)
    : null;
  const alighting = station ? nearestStopToPoint(station.coordinates) : null;

  route.boardingStop = describeStop(boarding);
  route.alightingStop = describeStop(alighting);

  if (route.boardingStop && route.boardingStop.distanceMeters > STOP_CORRIDOR_RADIUS_M) {
    route.boardingStop = null;
  }
}

/* -------------------------------------------------------------------------- */
/* Escritura                                                                  */
/* -------------------------------------------------------------------------- */

const routesWithStops = selectedRoutes.filter((route) => route.boardingStop !== null);
const cableIntegrated = selectedRoutes.filter((route) => route.cableIntegration);

const routesSnapshot = {
  metadata: {
    title: 'Extracto de servicios del SITP para el Distrito Capital',
    source: 'TRANSMILENIO S.A. — Servicios (Rutas Troncales y Zonales)',
    sourceUrl: SOURCE_URL,
    license: 'CC BY 4.0',
    generatedAt: new Date().toISOString(),
    scope: 'Distrito Capital de Bogotá D.C.',
    focusLocality: { code: CB_LOCALITY_CODE, name: LOCALITY_BY_CODE[CB_LOCALITY_CODE] },
    sourceFeatures: totalFeatures,
    rejectedNotOperational: rejectedNotOperational,
    rejectedNotCommercial: rejectedNotCommercial,
    selectedRoutes: selectedRoutes.length,
    simplifyToleranceMeters: Math.round(SIMPLIFY_TOLERANCE * METERS_PER_DEGREE_LATITUDE),
    stopCorridorRadiusMeters: STOP_CORRIDOR_RADIUS_M,
    cableIntegrationRadiusKm: CABLE_INTEGRATION_RADIUS_KM,
    note:
      'Se conservan todas las rutas operativas y comerciales del Distrito, no solo las de Ciudad Bolívar. ' +
      'El punto de abordaje es el paradero más cercano al trazado dentro de ' +
      `${STOP_CORRIDOR_RADIUS_M} m: es una inferencia geográfica, no una matriz oficial de paradas por ruta. ` +
      'Los horarios son ventanas de operación del operador, no despachos programados. ' +
      'El extracto no marca en qué extremo arranca el bus, así que el sentido se publica tal como lo declara el operador.',
  },
  routes: routesWithStops,
};

const stopsSnapshot = {
  metadata: {
    title: 'Extracto de paraderos zonales del SITP para el Distrito Capital',
    source: 'TRANSMILENIO S.A. — Paraderos Zonales del SITP',
    sourceUrl: STOPS_SOURCE_URL,
    license: 'CC BY 4.0',
    generatedAt: new Date().toISOString(),
    scope: 'Distrito Capital de Bogotá D.C.',
    focusLocality: { code: CB_LOCALITY_CODE, name: LOCALITY_BY_CODE[CB_LOCALITY_CODE] },
    sourceStops: (stopsEsri.features ?? []).length,
    selectedStops: selectedStops.length,
    note:
      'El identificador es la cenefa del paradero, no un código de ruta: no permite unir de forma ' +
      'directa una parada con las rutas que la sirven. Para eso se usa la proximidad sobre el trazado, ' +
      'y el resultado vive en `routes[].boardingStop` del extracto de rutas.',
  },
  stops: selectedStops,
};

// Los extractos son compactos por diseño: se serializan sin sangrado para no
// multiplicar por tres el peso de las coordenadas.
await mkdir(dirname(routesOutputArg), { recursive: true });
await writeFile(routesOutputArg, `${JSON.stringify(routesSnapshot)}\n`, 'utf8');
await writeFile(stopsOutput, `${JSON.stringify(stopsSnapshot)}\n`, 'utf8');

const vertices = routesWithStops.reduce(
  (total, route) => total + route.paths.reduce((sum, path) => sum + path.length, 0),
  0
);

console.log(
  [
    `SITP snapshot written`,
    `  routes : ${routesWithStops.length} operativas/comerciales (de ${totalFeatures} features; ${rejectedNotOperational} no operativas, ${rejectedNotCommercial} no comerciales descartadas)`,
    `  cable  : ${cableIntegrated.length} rutas a <= ${CABLE_INTEGRATION_RADIUS_KM} km de una estación TransMiCable`,
    `  rural  : ${routesWithStops.filter((route) => route.isRural).length} rutas rurales`,
    `  stops  : ${selectedStops.length} paraderos del SITP en el Distrito`,
    `  geom   : ${vertices} vértices tras simplificar a ~${Math.round(SIMPLIFY_TOLERANCE * METERS_PER_DEGREE_LATITUDE)} m`,
    `  -> ${routesOutputArg}`,
    `  -> ${stopsOutput}`,
  ].join('\n')
);
