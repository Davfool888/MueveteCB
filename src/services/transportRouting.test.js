import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getNearbySitpStops,
  getNearestGtfsStop,
  getNearestIntegrationPoint,
  getNearestPointOnPolyline,
  getNearestTransmicableStation,
  getNearestVeredalRoute,
  getTransportPlan,
  haversineKm,
} from './transportRouting.js';

const MOCHUELO_ALTO = {
  label: 'Mochuelo Alto',
  latitude: 4.4883574,
  longitude: -74.148341,
  source: 'manual',
};

const PORTAL_TUNAL = {
  label: 'Portal Tunal',
  latitude: 4.56917,
  longitude: -74.13968,
  source: 'manual',
};

test('calcula la distancia geográfica entre dos puntos', () => {
  const distance = haversineKm([4.55, -74.15], [4.56, -74.15]);
  assert.ok(distance > 1 && distance < 1.2);
});

test('encuentra la parada GTFS más cercana y conserva su fuente', () => {
  const stop = getNearestGtfsStop(PORTAL_TUNAL);
  assert.ok(stop);
  assert.equal(stop.source, 'gtfs_20260818');
  assert.ok(Array.isArray(stop.routes));
});

test('limita y ordena los paraderos SITP cercanos', () => {
  const stops = getNearbySitpStops(PORTAL_TUNAL, {
    radiusKm: 5,
    maxStops: 3,
  });
  assert.ok(stops.length <= 3);
  for (let index = 1; index < stops.length; index += 1) {
    assert.ok(stops[index - 1].distanceKm <= stops[index].distanceKm);
  }
});

test('encuentra la van veredal disponible para un origen rural', () => {
  const match = getNearestVeredalRoute(MOCHUELO_ALTO, { radiusKm: 5 });
  assert.ok(match);
  assert.equal(match.route.simulated, true);
  assert.equal(match.route.origin.id, 'mochuelo_alto');
});

test('propone van e integración para un origen fuera de la cobertura SITP', () => {
  const plan = getTransportPlan({
    originLocation: MOCHUELO_ALTO,
    destinationLocation: PORTAL_TUNAL,
    selectedMode: 'auto',
  });

  assert.equal(plan.status, 'veredal-route');
  assert.equal(plan.mode, 'veredal');
  assert.equal(plan.simulated, true);
  assert.ok(plan.veredalRoute);
  assert.ok(plan.contextStops.length >= 2);
  assert.ok(plan.continuationPath.length > 1);
});

test('trata un sector rural con parada lejana como candidato veredal', () => {
  const plan = getTransportPlan({
    originLocation: {
      label: 'Sierra Morena',
      latitude: 4.568,
      longitude: -74.168,
      source: 'manual',
    },
    destinationLocation: PORTAL_TUNAL,
  });

  assert.equal(plan.mode, 'veredal');
  assert.equal(plan.simulated, true);
});

test('usa el punto de integración GTFS/transmilenio más cercano', () => {
  const integration = getNearestIntegrationPoint(PORTAL_TUNAL);
  assert.ok(integration);
  assert.ok(integration.coordinates.length === 2);
  assert.ok(['gtfs_20260818', 'transmilenio_2026'].includes(integration.source));
});

test('calcula el punto más cercano sobre un segmento, no solo en vértices', () => {
  const nearest = getNearestPointOnPolyline(
    [4.55, -74.15],
    [
      [4.54, -74.15],
      [4.56, -74.15],
    ],
  );

  assert.ok(nearest);
  assert.ok(nearest.distanceKm < 0.01);
  assert.ok(nearest.point[0] > 4.549 && nearest.point[0] < 4.551);
});

test('encuentra la van por corredor y paradero de Quiba', () => {
  const match = getNearestVeredalRoute(
    { latitude: 4.543, longitude: -74.17, label: 'Corredor Quiba' },
    { radiusKm: 1 },
  );

  assert.ok(match);
  assert.equal(match.route.id, 'van-veredal-quiba-01');
  assert.equal(match.paradero.id, 'quiba-pickup');
  assert.ok(match.path.length > 1);
});

test('reconoce una estación TransMiCable como candidato cable', () => {
  const station = getNearestTransmicableStation({
    latitude: 4.5503,
    longitude: -74.1505,
    label: 'Cerca de Manitas',
  });
  assert.ok(station);
  assert.equal(station.id, 'manitas');

  const plan = getTransportPlan({
    originLocation: {
      latitude: 4.5503,
      longitude: -74.1505,
      label: 'Cerca de Manitas',
    },
    destinationLocation: PORTAL_TUNAL,
  });
  assert.equal(plan.mode, 'cable');
  assert.equal(plan.showCable, true);
  assert.ok(plan.legs.some((leg) => leg.mode === 'cable'));
});

test('el auto prioriza cable cuando cable y van están empatados', () => {
  const plan = getTransportPlan({
    originLocation: {
      latitude: 4.54814,
      longitude: -74.15065,
      label: 'Empate',
    },
    destinationLocation: PORTAL_TUNAL,
    selectedMode: 'auto',
  });

  assert.equal(plan.mode, 'cable');
  assert.equal(plan.selection.status, 'selected');
  assert.ok(plan.candidates.some((candidate) => candidate.mode === 'cable'));
  assert.ok(plan.candidates.some((candidate) => candidate.mode === 'veredal'));
});

test('Mochuelo genera van seguida de TransMiCable hasta el destino', () => {
  const plan = getTransportPlan({
    originLocation: MOCHUELO_ALTO,
    destinationLocation: PORTAL_TUNAL,
    selectedMode: 'auto',
  });

  assert.equal(plan.mode, 'veredal');
  assert.deepEqual(
    plan.legs.filter((leg) => leg.mode === 'veredal' || leg.mode === 'cable').map((leg) => leg.mode),
    ['veredal', 'cable'],
  );
  assert.equal(plan.price.formatted, '$3.550 + van por confirmar');
  assert.equal(plan.price.estimateCop, 6050);
  assert.equal(plan.price.status, 'partial');
  assert.equal(plan.routingRequests.length, 0);
});

test('un modo explícito no disponible no hace fallback a van', () => {
  const plan = getTransportPlan({
    originLocation: MOCHUELO_ALTO,
    destinationLocation: PORTAL_TUNAL,
    selectedMode: 'cable',
  });

  assert.equal(plan.mode, 'none');
  assert.equal(plan.selection.status, 'unavailable');
  assert.ok(!plan.availableModes.includes('cable'));
  assert.ok(!plan.legs.some((leg) => leg.mode === 'veredal'));
});

test('los transferRoutes completan los tramos OSRM sin inventar-rt geometría', () => {
  const origin = {
    latitude: 4.5495,
    longitude: -74.1515,
    label: 'Origennear Manitas',
  };
  const destination = {
    latitude: 4.56,
    longitude: -74.145,
    label: 'Destino',
  };
  const initial = getTransportPlan({ originLocation: origin, destinationLocation: destination });
  assert.equal(initial.routingRequests.length, 2);

  const transferRoutes = Object.fromEntries(
    initial.routingRequests.map((request) => [
      request.requestKey,
      {
        requestKey: request.requestKey,
        mapPath: [
          [request.fromLocation.latitude, request.fromLocation.longitude],
          [
            (request.fromLocation.latitude + request.toLocation.latitude) / 2,
            (request.fromLocation.longitude + request.toLocation.longitude) / 2,
          ],
          [request.toLocation.latitude, request.toLocation.longitude],
        ],
      },
    ]),
  );
  const completed = getTransportPlan({
    originLocation: origin,
    destinationLocation: destination,
    transferRoutes,
  });

  assert.equal(completed.access.status, 'ready');
  assert.ok(completed.legs.some((leg) => leg.role === 'access' && leg.status === 'ready'));
  assert.ok(completed.legs.some((leg) => leg.role === 'onward' && leg.mode === 'road' && leg.status === 'ready'));
  assert.equal(completed.geometry.complete, true);
  assert.deepEqual(completed.fitPath[0], [origin.latitude, origin.longitude]);
  assert.deepEqual(completed.fitPath.at(-1), [destination.latitude, destination.longitude]);
});
