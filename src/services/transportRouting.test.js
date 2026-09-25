import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getNearbySitpStops,
  getNearestGtfsStop,
  getNearestIntegrationPoint,
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
