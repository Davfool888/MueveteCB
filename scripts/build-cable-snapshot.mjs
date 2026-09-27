/**
 * ETL reproducible del TransMiCable de Ciudad Bolívar.
 *
 * Entradas (versionadas en el repositorio):
 *   - src/data/Estaciones_cable.geojson   4 estaciones
 *   - src/data/Trazado_cable.geojson       3 tramos
 *
 * Salida:
 *   - src/data/cable-snapshot.json
 *
 * Este archivo reemplaza las constantes que estaban escritas a mano en
 * `src/data/routes.js`. La línea y sus estaciones ya no son una suposición del
 * prototipo, y `ascens` permite decir cuántos elevadores tiene cada estación
 * en lugar de un "accesible" sin fuente.
 *
 * Un detalle que obliga a normalizar: el servicio publica cada tramo con su
 * `origen` y su `destino`, pero no siempre en ese orden en la geometría. El
 * tramo Juan Pablo II → Manitas viene dibujado al revés. Aquí se invierte para
 * que la línea quede siempre recorrible de punta a punta.
 *
 * Uso:  node scripts/build-cable-snapshot.mjs
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stationsInput = resolve(projectRoot, 'src/data/Estaciones_cable.geojson');
const segmentsInput = resolve(projectRoot, 'src/data/Trazado_cable.geojson');
const outputFile = resolve(process.argv[2] || resolve(projectRoot, 'src/data/cable-snapshot.json'));

const STATIONS_SOURCE_URL =
  'https://gis.transmilenio.gov.co/arcgis/rest/services/ConsultaSubgerenciaPlanificacionSITP/Consulta_Planificacion_SITP/FeatureServer';
const SEGMENTS_SOURCE_URL = STATIONS_SOURCE_URL;

const METERS_PER_DEGREE_LATITUDE = 110574;
const METERS_PER_DEGREE_LONGITUDE = 111320 * Math.cos((4.536 * Math.PI) / 180);

/** Distancia en metros entre dos puntos [lat, lng]. */
function haversineMeters(pointA, pointB) {
  const toRadians = Math.PI / 180;
  const deltaLatitude = (pointB[0] - pointA[0]) * toRadians;
  const deltaLongitude = (pointB[1] - pointA[1]) * toRadians;
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(pointA[0] * toRadians) * Math.cos(pointB[0] * toRadians) * Math.sin(deltaLongitude / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}

/** Distancia en metros de un punto a una polilínea [lat, lng]. */
function distanceToPath(point, path) {
  const toXY = ([latitude, longitude]) => [
    longitude * METERS_PER_DEGREE_LONGITUDE,
    latitude * METERS_PER_DEGREE_LATITUDE,
  ];
  const [px, py] = toXY(point);
  let best = Infinity;
  for (let index = 1; index < path.length; index += 1) {
    const [x1, y1] = toXY(path[index - 1]);
    const [x2, y2] = toXY(path[index]);
    const lengthSquared = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (lengthSquared === 0) continue;
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / lengthSquared;
    t = Math.max(0, Math.min(1, t));
    const distance = Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
    if (distance < best) best = distance;
  }
  return best;
}

function normalizeName(value) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function pathLengthMeters(path) {
  let total = 0;
  for (let index = 1; index < path.length; index += 1) {
    total += haversineMeters(path[index - 1], path[index]);
  }
  return total;
}

/* -------------------------------------------------------------------------- */
/* Estaciones                                                                 */
/* -------------------------------------------------------------------------- */

const stationsGeoJson = JSON.parse(await readFile(stationsInput, 'utf8'));

const stations = (stationsGeoJson.features ?? [])
  .map((feature) => {
    const p = feature.properties ?? {};
    const latitude = Number(p.latitud);
    const longitude = Number(p.longitud);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return {
      id: String(p.num_est),
      nodeId: p.cod_nodo ?? null,
      name: p.nom_est,
      segmentId: p.id_subtram ?? null,
      /** Elevadores disponibles en la estación: dato de accesibilidad del operador. */
      lifts: Number.isFinite(Number(p.ascens)) ? Number(p.ascens) : null,
      rainProtected: Number(p.eq_h_lluv) === 1,
      powerGrid: Number(p.eq_h_potab) === 1,
      isOperating: Number(p.esta_oper) === 1,
      buildingAreaM2: Number.isFinite(Number(p.area_edif)) ? Number(p.area_edif) : null,
      coordinates: [Number(latitude.toFixed(5)), Number(longitude.toFixed(5))],
    };
  })
  .filter(Boolean);

const stationByNormalizedName = new Map(stations.map((s) => [normalizeName(s.name), s]));

/* -------------------------------------------------------------------------- */
/* Tramos                                                                      */
/* -------------------------------------------------------------------------- */

const segmentsGeoJson = JSON.parse(await readFile(segmentsInput, 'utf8'));

const rawSegments = [];
for (const feature of segmentsGeoJson.features ?? []) {
  const p = feature.properties ?? {};
  const path = (feature.geometry?.coordinates ?? []).map(([longitude, latitude]) => [
    Number(latitude.toFixed(5)),
    Number(longitude.toFixed(5)),
  ]);
  if (path.length < 2) continue;

  const originStation = stationByNormalizedName.get(normalizeName(p.origen)) ?? null;
  const destinationStation = stationByNormalizedName.get(normalizeName(p.destino)) ?? null;

  // El servicio no siempre dibuja el tramo en el orden que declara. Se comprueba
  // contra la geometría y se invierte cuando hace falta, para que la línea se
  // pueda recorrer de punta a punta sin que el motor adivine el sentido.
  let oriented = path;
  let wasReordered = false;
  if (originStation && destinationStation) {
    const startToOrigin = distanceToPath(path[0], [originStation.coordinates]);
    const startToDestination = distanceToPath(path[0], [destinationStation.coordinates]);
    if (startToDestination < startToOrigin) {
      oriented = [...path].reverse();
      wasReordered = true;
    }
  }

  rawSegments.push({
    id: p.id_subtram != null ? String(p.id_subtram) : null,
    name: p.nom_traz || p.cable || null,
    origin: p.origen || null,
    destination: p.destino || null,
    originStationId: originStation?.id ?? null,
    destinationStationId: destinationStation?.id ?? null,
    declaredLengthM: Number.isFinite(Number(p.long_traz)) ? Number(p.long_traz) : null,
    isOperating: Number(p.esta_oper) === 1,
    wasReordered,
    path: oriented,
  });
}

/**
 * Ordena los tramos encadenando extremos: un tramo whose destination is the next
 * tramo's origin va después. Si el archivo no permite encadenar, se cae al orden
 * de publication, que ya viene de portal a cumbre.
 */
function orderSegments(segments) {
  const remaining = [...segments];
  const ordered = [];

  while (remaining.length > 0) {
    if (ordered.length === 0) {
      ordered.push(remaining.shift());
      continue;
    }
    const previous = ordered[ordered.length - 1];
    const nextIndex = remaining.findIndex(
      (segment) =>
        segment.originStationId === previous.destinationStationId ||
        normalizeName(segment.origin) === normalizeName(previous.destination),
    );
    ordered.push(nextIndex >= 0 ? remaining.splice(nextIndex, 1)[0] : remaining.shift());
  }
  return ordered;
}

const orderedSegments = orderSegments(rawSegments);

/** Estaciones en el orden en que aparecen al recorrer la línea. */
const lineOrder = [];
for (const segment of orderedSegments) {
  if (segment.originStationId && !lineOrder.includes(segment.originStationId)) {
    lineOrder.push(segment.originStationId);
  }
  if (segment.destinationStationId && !lineOrder.includes(segment.destinationStationId)) {
    lineOrder.push(segment.destinationStationId);
  }
}
// Cualquier estación que no aparezca en los tramos se cuelga al final, no se pierde.
for (const station of stations) {
  if (!lineOrder.includes(station.id)) lineOrder.push(station.id);
}

const stationsInLine = lineOrder
  .map((id) => stations.find((station) => station.id === id))
  .filter(Boolean)
  .map((station, index) => ({
    ...station,
    lineIndex: index,
    /** Posición acumulada desde el inicio de la línea, en km. */
    positionKm: Number(
      (
        orderedSegments
          .slice(0, index)
          .reduce((total, segment) => total + pathLengthMeters(segment.path), 0) / 1000
      ).toFixed(2),
    ),
  }));

const linePath = orderedSegments.flatMap((segment) => segment.path);
const measuredLengthM = pathLengthMeters(linePath);
const declaredLengthM = orderedSegments.reduce(
  (total, segment) => total + (segment.declaredLengthM ?? 0),
  0,
);

const snapshot = {
  metadata: {
    title: 'TransMiCable de Ciudad Bolívar',
    source: 'TRANSMILENIO S.A. — Estaciones y trazados del cable',
    sourceUrl: { stations: STATIONS_SOURCE_URL, segments: SEGMENTS_SOURCE_URL },
    license: 'CC BY 4.0',
    generatedAt: new Date().toISOString(),
    measuredLengthM: Math.round(measuredLengthM),
    declaredLengthM: Math.round(declaredLengthM),
    stationsInLine: stationsInLine.length,
    segments: orderedSegments.length,
    reorderedSegments: orderedSegments.filter((segment) => segment.wasReordered).map((segment) => segment.id),
    note:
      'La línea y las estaciones provienen del inventario del operador, incluidos los elevadores por estación. ' +
      'El servicio publica cada tramo con origen y destino, pero no siempre dibuja la geometría en ese ' +
      'orden: aquí se invierte el tramo cuando hace falta y queda registrado en `reorderedSegments`. ' +
      'No hay intervalos de despacho ni tiempos de recorrido por tramo, así que el tiempo a bordo es una estimación.',
  },
  stations: stationsInLine,
  segments: orderedSegments,
};

await mkdir(dirname(outputFile), { recursive: true });
await writeFile(outputFile, `${JSON.stringify(snapshot)}\n`, 'utf8');

console.log(
  [
    'Cable snapshot written',
    `  estaciones : ${stationsInLine.length} (${stationsInLine.map((s) => s.name).join(' → ')})`,
    `  tramos     : ${orderedSegments.length}`,
    `  invertidos : ${snapshot.metadata.reorderedSegments.length ? snapshot.metadata.reorderedSegments.join(', ') : 'ninguno'}`,
    `  longitud   : ${Math.round(measuredLengthM)} m medidas / ${Math.round(declaredLengthM)} m declaradas`,
    `  -> ${outputFile}`,
  ].join('\n')
);
