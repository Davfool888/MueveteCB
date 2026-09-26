/**
 * ETL reproducible de la infraestructura troncal de TransMilenio.
 *
 * Entradas (versionadas en el repositorio):
 *   - src/data/Estaciones_Troncales_de_TRANSMILENIO.geojson  153 estaciones
 *   - src/data/Trazado_troncal.geojson                        22 trazados
 *
 * Salida:
 *   - src/data/trunk-snapshot.json
 *
 * Aquí `id_trazado` sí es la llave que une ambos conjuntos: cada estación
 * declara el trazado al que pertenece y los 153 registros casan sin huérfanos.
 * Eso permite algo que el extracto del SITP no permitía: saber qué estación
 * troncal hay cerca del origen, de qué tipo es y cuánto gente transporta.
 *
 * Los dominios están decodificados según el diccionario publicado por
 * Transmilenio; ver `sourceUrl` en la metadata de la salida.
 *
 * Uso:  node scripts/build-trunk-snapshot.mjs
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stationsInput = resolve(projectRoot, 'src/data/Estaciones_Troncales_de_TRANSMILENIO.geojson');
const corridorsInput = resolve(projectRoot, 'src/data/Trazado_troncal.geojson');
const outputFile = resolve(process.argv[2] || resolve(projectRoot, 'src/data/trunk-snapshot.json'));

const STATIONS_SOURCE_URL =
  'https://gis.transmilenio.gov.co/arcgis/rest/services/ConsultaSubgerenciaPlanificacionSITP/Consulta_Planificacion_SITP/FeatureServer/2';
const CORRIDORS_SOURCE_URL =
  'https://gis.transmilenio.gov.co/arcgis/rest/services/ConsultaSubgerenciaPlanificacionSITP/Consulta_Planificacion_SITP/FeatureServer/5';

/**
 * Se recorta a Ciudad Bolívar con un margen de 2,5 km. Fuera de esa ventana el
 * mapa no muestra nada (`maxBounds`) y las estaciones lejanas no sirven como
 * alternativa para un viaje dentro de la localidad.
 */
const CLIP_BOUNDS = { south: 4.39, west: -74.25, north: 4.64, east: -74.09 };

const SIMPLIFY_TOLERANCE = 0.0002;

/** Diccionario oficial: tipo de estación troncal. */
const STATION_TYPE_BY_CODE = {
  1: 'Portal',
  2: 'Intermedia',
  3: 'Intercambio',
  4: 'Sencilla',
  5: 'Por definir',
};

/** Diccionario oficial: etapa de operación de la estación. */
const STATION_STAGE_BY_CODE = {
  1: 'Operativa',
  2: 'Operativa con obras',
  3: 'Cierre temporal por obras',
  4: 'Cierre temporal por otros',
};

/** Diccionario oficial: tipo de trazado según el tránsito. */
const CORRIDOR_TYPE_BY_CODE = {
  1: 'Exclusivo',
  2: 'Mixto',
  3: 'Sin definir',
};

/* -------------------------------------------------------------------------- */
/* Geometría                                                                  */
/* -------------------------------------------------------------------------- */

function insideBounds([latitude, longitude]) {
  return (
    latitude >= CLIP_BOUNDS.south &&
    latitude <= CLIP_BOUNDS.north &&
    longitude >= CLIP_BOUNDS.west &&
    longitude <= CLIP_BOUNDS.east
  );
}

function perpendicularDistance(point, start, end) {
  const dx = end[1] - start[1];
  const dy = end[0] - start[0];
  const length = Math.hypot(dx, dy);
  if (length === 0) return Math.hypot(point[1] - start[1], point[0] - start[0]);
  return Math.abs(dy * (point[1] - start[1]) - dx * (point[0] - start[0])) / length;
}

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

/** Convierte cualquier geometría de línea a [lat, lng] y recorta por partes. */
function toClippedParts(geometry) {
  if (!geometry) return [];
  const lines =
    geometry.type === 'LineString'
      ? [geometry.coordinates]
      : geometry.type === 'MultiLineString'
        ? geometry.coordinates
        : [];

  return lines
    .map((line) => line.map(([longitude, latitude]) => [latitude, longitude]))
    .map((part) => simplifyPath(part, SIMPLIFY_TOLERANCE))
    .filter((part) => part.length > 1 && part.some(insideBounds))
    .map((part) => part.map(([latitude, longitude]) => [Number(latitude.toFixed(5)), Number(longitude.toFixed(5))]));
}

/* -------------------------------------------------------------------------- */
/* Corredores                                                                 */
/* -------------------------------------------------------------------------- */

const corridorsGeoJson = JSON.parse(await readFile(corridorsInput, 'utf8'));

const corridors = [];
for (const feature of corridorsGeoJson.features ?? []) {
  const p = feature.properties ?? {};
  const paths = toClippedParts(feature.geometry);
  if (paths.length === 0) continue;

  const lengthKm = Number(p.long_traz);
  corridors.push({
    id: p.id_trazado,
    name: p.nom_tronc || p.nom_traz,
    pathLabel: p.nom_traz || p.nom_tronc,
    /** Letra de la troncal (A, B, C…): así la nombran los usuarios. */
    letter: p.le_troncal || null,
    type: CORRIDOR_TYPE_BY_CODE[p.tipo_tra] ?? 'Sin definir',
    isExclusive: p.tipo_tra === 1,
    origin: p.ori_traz || null,
    destination: p.fin_traz || null,
    lengthKm: Number.isFinite(lengthKm) ? Number(lengthKm.toFixed(2)) : null,
    phase: p.fase_tronc || null,
    isExisting: p.esta_oper === 1,
    stationIds: [],
    paths,
  });
}

/* -------------------------------------------------------------------------- */
/* Estaciones                                                                 */
/* -------------------------------------------------------------------------- */

const stationsGeoJson = JSON.parse(await readFile(stationsInput, 'utf8'));

const stations = [];
for (const feature of stationsGeoJson.features ?? []) {
  const p = feature.properties ?? {};
  const latitude = Number(p.latitud);
  const longitude = Number(p.longitud);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
  if (!insideBounds([latitude, longitude])) continue;

  const stage = STATION_STAGE_BY_CODE[p.eta_oper] ?? null;
  const isTemporarilyClosed = p.eta_oper === 3 || p.eta_oper === 4;

  stations.push({
    id: p.num_est,
    nodeId: p.cod_nodo ?? null,
    name: p.nom_est,
    corridorId: p.id_trazado,
    type: STATION_TYPE_BY_CODE[p.tipo_esta] ?? 'Por definir',
    isPortal: p.tipo_esta === 1,
    isInterchange: p.tipo_esta === 3,
    location: p.ub_est || null,
    stage,
    isTemporarilyClosed,
    isOperating: p.esta_oper === 1 && !isTemporarilyClosed,
    cars: Number.isFinite(Number(p.num_vag)) ? Number(p.num_vag) : null,
    access: {
      total: Number.isFinite(Number(p.num_acc)) ? Number(p.num_acc) : null,
      fromStreet: Number.isFinite(Number(p.acc_esp)) ? Number(p.acc_esp) : null,
      depressed: Number.isFinite(Number(p.acc_depr)) ? Number(p.acc_depr) : null,
      bridge: Number.isFinite(Number(p.acc_puent)) ? Number(p.acc_puent) : null,
    },
    capacity: {
      articulated: Number.isFinite(Number(p.cap_art)) ? Number(p.cap_art) : null,
      biarticulated: Number.isFinite(Number(p.cap_biart)) ? Number(p.cap_biart) : null,
    },
    size: {
      lengthM: Number.isFinite(Number(p.long_est)) ? Number(p.long_est) : null,
      widthM: Number.isFinite(Number(p.ancho_est)) ? Number(p.ancho_est) : null,
      areaM2: Number.isFinite(Number(p.area_est)) ? Number(p.area_est) : null,
    },
    note: p.observ || null,
    coordinates: [Number(latitude.toFixed(5)), Number(longitude.toFixed(5))],
  });
}

/** Une estaciones con su corredor; descarta las que no tienen trazado conocido. */
const corridorById = new Map(corridors.map((corridor) => [corridor.id, corridor]));
const orphanStations = [];
const linkedStations = [];

for (const station of stations) {
  const corridor = corridorById.get(station.corridorId);
  if (!corridor) {
    orphanStations.push(station.id);
    continue;
  }
  corridor.stationIds.push(station.id);
  linkedStations.push(station);
}

const snapshot = {
  metadata: {
    title: 'Infraestructura troncal de TransMilenio para Ciudad Bolívar',
    source: 'TRANSMILENIO S.A. — Estaciones Troncales y Trazados Troncales',
    sourceUrl: { stations: STATIONS_SOURCE_URL, corridors: CORRIDORS_SOURCE_URL },
    license: 'CC BY 4.0',
    generatedAt: new Date().toISOString(),
    clipBounds: CLIP_BOUNDS,
    simplifyToleranceMeters: Math.round(SIMPLIFY_TOLERANCE * 110574),
    sourceStations: (stationsGeoJson.features ?? []).length,
    sourceCorridors: (corridorsGeoJson.features ?? []).length,
    selectedStations: linkedStations.length,
    selectedCorridors: corridors.length,
    orphanStations: orphanStations.length,
    note:
      'La capacidad y los accesos de cada estación son datos del inventario de Transmilenio. ' +
      'El extracto no incluye viajes ni despachos programados, así que no se puede afirmar ' +
      'cada cuántos minutos pasa un bus por una estación.',
  },
  corridors,
  stations: linkedStations,
};

await mkdir(dirname(outputFile), { recursive: true });
await writeFile(outputFile, `${JSON.stringify(snapshot)}\n`, 'utf8');

const vertices = corridors.reduce(
  (total, corridor) => total + corridor.paths.reduce((sum, path) => sum + path.length, 0),
  0
);

console.log(
  [
    'Trunk snapshot written',
    `  stations  : ${linkedStations.length} (de ${(stationsGeoJson.features ?? []).length}; ${orphanStations.length} sin corredor)`,
    `  corridors : ${corridors.length} (de ${(corridorsGeoJson.features ?? []).length})`,
    `  portals   : ${linkedStations.filter((station) => station.isPortal).length}`,
    `  cerradas  : ${linkedStations.filter((station) => station.isTemporarilyClosed).length}`,
    `  geom      : ${vertices} vértices`,
    `  -> ${outputFile}`,
  ].join('\n')
);
