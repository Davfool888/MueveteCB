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

import { CIUDAD_BOLIVAR_POLYGON, TRANSMICABLE_STATIONS } from '../src/data/routes.js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const routesInput = resolve(projectRoot, 'src/data/Servicios_Rutas_Troncales_y_Zonales.geojson');
const stopsInput = resolve(projectRoot, 'src/data/paraderos.json');
const routesOutput = resolve(projectRoot, 'src/data/sitp-routes-snapshot.json');
const stopsOutput = resolve(process.argv[2] || resolve(projectRoot, 'src/data/sitp-stops-snapshot.json'));
const routesOutputArg = process.argv[3] || routesOutput;

/** Localidad de Ciudad Bolívar según el dominio `servicio_localidad` de Transmilenio. */
const CB_LOCALITY_CODE = 19;

/** Tolerancia de simplificación Douglas-Peucker, en grados (~22 m a esta latitud). */
const SIMPLIFY_TOLERANCE = 0.0002;

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

function isInsideLocality(latitude, longitude) {
  let inside = false;
  for (let i = 0, j = CIUDAD_BOLIVAR_POLYGON.length - 1; i < CIUDAD_BOLIVAR_POLYGON.length; j = i, i += 1) {
    const [yi, xi] = CIUDAD_BOLIVAR_POLYGON[i];
    const [yj, xj] = CIUDAD_BOLIVAR_POLYGON[j];
    const straddles = yi > latitude !== yj > latitude;
    if (straddles && longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

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
let insideLocalityCount = 0;
let rejectedNotOperational = 0;
let rejectedNotCommercial = 0;

for (const feature of routesGeoJson.features ?? []) {
  totalFeatures += 1;
  const properties = feature.properties ?? {};
  const parts = (feature.geometry?.coordinates ?? []).map((line) =>
    line.map(([longitude, latitude]) => [latitude, longitude]),
  );
  if (parts.length === 0) continue;

  const allPoints = parts.flat();
  const insidePoints = allPoints.filter(([latitude, longitude]) => isInsideLocality(latitude, longitude));
  if (insidePoints.length === 0) continue;
  insideLocalityCount += 1;

  if (properties.est_ruta !== 1) {
    rejectedNotOperational += 1;
    continue;
  }
  if (properties.tipo_ruta !== 1) {
    rejectedNotCommercial += 1;
    continue;
  }

  const corridorFraction = insidePoints.length / allPoints.length;
  if (corridorFraction < MIN_CORRIDOR_FRACTION) continue;

  // El resto del proyecto representa puntos como [lat, lng]; se conserva ese orden.
  const simplifiedPaths = parts
    .map((part) =>
      simplifyPath(part, SIMPLIFY_TOLERANCE).map(([latitude, longitude]) => [
        Number(latitude.toFixed(5)),
        Number(longitude.toFixed(5)),
      ])
    )
    .filter((part) => part.length > 1);

  const component = COMPONENT_BY_CODE[properties.comp_sitp] ?? 'Desconocido';
  const serviceType = SERVICE_TYPE_BY_COMPONENT[properties.comp_sitp]?.[properties.tip_serv] ?? 'Desconocido';

  let cableIntegration = null;
  for (const station of TRANSMICABLE_STATIONS) {
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
    objectId: properties.objectid,
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
    implementedAt: properties.fec_impl || null,
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
    corridorFraction: Number(corridorFraction.toFixed(3)),
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
const allStops = (stopsEsri.features ?? [])
  .map((entry) => entry.attributes ?? {})
  .filter((attributes) => attributes.localidad_ === CB_LOCALITY_CODE);

const selectedStops = allStops
  .filter((attributes) => Number.isFinite(attributes.latitud_pa) && Number.isFinite(attributes.longitud_p))
  .map((attributes) => ({
    id: attributes.cenefa_par,
    objectId: attributes.objectid,
    module: attributes.mdoulo_par || null,
    name: attributes.nombre_par || attributes.via_parade || 'Paradero sin nombre',
    street: attributes.via_parade || null,
    address: attributes.direccion_ || null,
    consoleText: attributes.consola_pa || null,
    panelText: attributes.panel_para || null,
    zone: { code: attributes.zona_parad, name: ZONE_BY_CODE[attributes.zona_parad] ?? 'Desconocida' },
    locality: { code: attributes.localidad_, name: LOCALITY_BY_CODE[attributes.localidad_] ?? 'Desconocida' },
    coordinates: [Number(attributes.latitud_pa.toFixed(5)), Number(attributes.longitud_p.toFixed(5))],
  }))
  .filter((stop) => Boolean(stop.id));

/* -------------------------------------------------------------------------- */
/* Puntos de abordaje y de bajada                                              */
/* -------------------------------------------------------------------------- */

/**
 * El extracto no publica una matriz de paradas por ruta, y aproximarla no sirve:
 * en Ciudad Bolívar las arteriales concentran paradas, así que una parada queda
 * a menos de 150 m de más de cien corredores. Guardar esa lista como "rutas que
 * sirven la parada" sería falso.
 *
 * En su lugar se guarda un único punto por extremo, que sí es defendible:
 *   - `boardingStop`: el paradero más cercano al propio trazado del corredor;
 *   - `alightingStop`: el paradero más cercano a la estación de integración.
 */

function nearestStopToPaths(stops, paths) {
  const pathMeters = paths.map((path) => path.map(([latitude, longitude]) => toXY([latitude, longitude])));
  let best = null;
  for (const stop of stops) {
    let closest = Infinity;
    for (const path of pathMeters) {
      const measured = measureAgainstPath(toXY(stop.coordinates), path);
      if (measured.distanceMeters < closest) closest = measured.distanceMeters;
    }
    if (!best || closest < best.distanceMeters) {
      best = { stop, distanceMeters: closest };
    }
  }
  return best;
}

function nearestStopToPoint(stops, point) {
  const [targetX, targetY] = toXY(point);
  let best = null;
  for (const stop of stops) {
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
  const boarding = nearestStopToPaths(selectedStops, route.paths);
  const station = route.cableIntegration
    ? TRANSMICABLE_STATIONS.find((item) => item.id === route.cableIntegration.stationId)
    : null;
  const alighting = station ? nearestStopToPoint(selectedStops, station.coordinates) : null;

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
    title: 'Extracto de servicios del SITP para Ciudad Bolívar',
    source: 'TRANSMILENIO S.A. — Servicios (Rutas Troncales y Zonales)',
    sourceUrl: SOURCE_URL,
    license: 'CC BY 4.0',
    generatedAt: new Date().toISOString(),
    locality: { code: CB_LOCALITY_CODE, name: LOCALITY_BY_CODE[CB_LOCALITY_CODE] },
    sourceFeatures: totalFeatures,
    featuresInsideLocality: insideLocalityCount,
    rejectedNotOperational: rejectedNotOperational,
    rejectedNotCommercial: rejectedNotCommercial,
    selectedRoutes: selectedRoutes.length,
    simplifyToleranceMeters: Math.round(SIMPLIFY_TOLERANCE * METERS_PER_DEGREE_LATITUDE),
    stopCorridorRadiusMeters: STOP_CORRIDOR_RADIUS_M,
    cableIntegrationRadiusKm: CABLE_INTEGRATION_RADIUS_KM,
    note:
      'Solo se conservan rutas operativas y comerciales cuyo trazado entra a Ciudad Bolívar. ' +
      'El punto de abordaje es el paradero más cercano al trazado dentro de ' +
      `${STOP_CORRIDOR_RADIUS_M} m: es una inferencia geográfica, no una matriz oficial de paradas por ruta. ` +
      'Los horarios son ventanas de operación del operador, no despachos programados.',
  },
  routes: routesWithStops,
};

const stopsSnapshot = {
  metadata: {
    title: 'Extracto de paraderos zonales del SITP para Ciudad Bolívar',
    source: 'TRANSMILENIO S.A. — Paraderos Zonales del SITP',
    sourceUrl: STOPS_SOURCE_URL,
    license: 'CC BY 4.0',
    generatedAt: new Date().toISOString(),
    locality: { code: CB_LOCALITY_CODE, name: LOCALITY_BY_CODE[CB_LOCALITY_CODE] },
    sourceStops: (stopsEsri.features ?? []).length,
    selectedStops: selectedStops.length,
    note:
      'El identificador es la cenefa del paradero, no un código de ruta: no permite unir de forma ' +
      'directa una parada con las rutas que la sirven. Para eso se usa la proximidad sobre el trazado, ' +
      'y el resultado vive en `routes[].stopIds` del extracto de rutas.',
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
    `  stops  : ${selectedStops.length} paraderos en Ciudad Bolívar`,
    `  geom   : ${vertices} vértices tras simplificar a ~${Math.round(SIMPLIFY_TOLERANCE * METERS_PER_DEGREE_LATITUDE)} m`,
    `  -> ${routesOutputArg}`,
    `  -> ${stopsOutput}`,
  ].join('\n')
);
