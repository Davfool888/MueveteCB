import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { dirname, resolve } from 'node:path';

const inputDirectory = resolve(process.argv[2] || 'data/gtfs-20260818');
const outputFile = resolve(
  process.argv[3] || 'src/data/gtfs-ciudad-bolivar-snapshot.json'
);

const BOUNDS = {
  south: 4.4,
  west: -74.23,
  north: 4.62,
  east: -74.1,
};
const RELEVANT_NAME =
  /tunal|juan\s+pablo|manitas|par(?:a|á)iso|quiba|mochuelo|meissen|ciudad\s+bol[ií]var|cerro|villa\s+del\s+rosario|alfonsop[aá]ez|sierra\s+morena|bellaflor/i;

function parseCsvLine(line) {
  const values = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      values.push(value);
      value = '';
    } else {
      value += character;
    }
  }
  values.push(value);
  return values;
}

async function* readCsv(filePath) {
  const input = createInterface({
    input: createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let headers = null;
  for await (const line of input) {
    if (!headers) {
      headers = parseCsvLine(line);
      continue;
    }
    if (!line) continue;
    const values = parseCsvLine(line);
    yield Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  }
}

const routes = new Map();
for await (const route of readCsv(resolve(inputDirectory, 'routes.txt'))) {
  routes.set(route.route_id, {
    id: route.route_id,
    shortName: route.route_short_name || null,
    longName: route.route_long_name || null,
    agencyId: route.agency_id || null,
    routeType: Number(route.route_type),
    color: route.route_color ? `#${route.route_color}` : null,
  });
}

const selectedStops = new Map();
for await (const stop of readCsv(resolve(inputDirectory, 'stops.txt'))) {
  const latitude = Number(stop.stop_lat);
  const longitude = Number(stop.stop_lon);
  const insideBounds =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= BOUNDS.south &&
    latitude <= BOUNDS.north &&
    longitude >= BOUNDS.west &&
    longitude <= BOUNDS.east;

  if (!insideBounds || !RELEVANT_NAME.test(stop.stop_name)) continue;
  selectedStops.set(stop.stop_id, {
    id: stop.stop_id,
    code: stop.stop_code || null,
    name: stop.stop_name,
    latitude,
    longitude,
    wheelchairBoarding: stop.wheelchair_boarding === '' ? null : Number(stop.wheelchair_boarding),
    zoneId: stop.zone_id || null,
    locationType: stop.location_type === '' ? null : Number(stop.location_type),
  });
}

const tripToRoute = new Map();
for await (const trip of readCsv(resolve(inputDirectory, 'trips.txt'))) {
  tripToRoute.set(trip.trip_id, trip.route_id);
}

const routeStopIds = new Map();
for await (const stopTime of readCsv(resolve(inputDirectory, 'stop_times.txt'))) {
  if (!selectedStops.has(stopTime.stop_id)) continue;
  const routeId = tripToRoute.get(stopTime.trip_id);
  if (!routeId || !routes.has(routeId)) continue;
  if (!routeStopIds.has(routeId)) routeStopIds.set(routeId, new Set());
  routeStopIds.get(routeId).add(stopTime.stop_id);
}

const snapshotRoutes = [...routeStopIds.entries()]
  .map(([routeId, stopIds]) => ({
    ...routes.get(routeId),
    matchedStops: [...stopIds]
      .map((stopId) => selectedStops.get(stopId))
      .filter(Boolean)
      .sort((left, right) => left.name.localeCompare(right.name, 'es')),
  }))
  .filter((route) =>
    route.matchedStops.some((stop) =>
      /juan\s+pablo|manitas|par(?:a|á)iso|quiba|mochuelo|meissen|cerros?\s+de\s+oriente/i.test(stop.name)
    )
  )
  .sort((left, right) => {
    const leftKey = `${left.shortName || ''} ${left.longName || ''}`;
    const rightKey = `${right.shortName || ''} ${right.longName || ''}`;
    return leftKey.localeCompare(rightKey, 'es');
  });

const snapshot = {
  metadata: {
    title: 'Extracto GTFS del SITP para Ciudad Bolívar',
    source: 'TransMilenio S.A. / Datos Abiertos Colombia',
    sourceUrl: 'https://www.datos.gov.co/dataset/Especificaci-n-GTFS-General-Transport-Feed-Specifi/nysb-4689',
    snapshotDate: '2026-08-18',
    snapshotUrl: 'https://storage.googleapis.com/gtfs-estaticos/GTFS_20260818.zip',
    generatedAt: new Date().toISOString(),
    bounds: BOUNDS,
    note: 'Extracto para validar servicios próximos; por sí solo no demuestra una itinerary completa ni cubre rutas informales.',
  },
  stops: [...selectedStops.values()].sort((left, right) => left.name.localeCompare(right.name, 'es')),
  routes: snapshotRoutes,
};

await mkdir(dirname(outputFile), { recursive: true });
await writeFile(outputFile, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

console.log(
  `GTFS snapshot written: ${selectedStops.size} stops, ${snapshotRoutes.length} routes -> ${outputFile}`
);
