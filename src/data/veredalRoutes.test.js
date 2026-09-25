import test from 'node:test';
import assert from 'node:assert/strict';
import { VEREDAL_ROUTES } from './veredalRoutes.js';

test('declara las rutas veredales como simuladas y separadas de los datos oficiales', () => {
  assert.ok(VEREDAL_ROUTES.length >= 3);
  assert.ok(VEREDAL_ROUTES.every((route) => route.simulated === true));
  assert.ok(VEREDAL_ROUTES.every((route) => route.geometrySource === 'handcrafted_veredal_fixture'));
  assert.ok(VEREDAL_ROUTES.every((route) => route.sourceNote));
});

test('cada van tiene geometría multipunto, origen e integración', () => {
  VEREDAL_ROUTES.forEach((route) => {
    assert.ok(route.route.length >= 3);
    assert.ok(route.origin.coordinates.length === 2);
    assert.ok(route.integration.coordinates.length === 2);
    assert.ok(route.stops.length >= 2);
    assert.equal(route.stops.at(-1).kind, 'integration');
  });
});

test('los identificadores de vans son únicos', () => {
  const ids = VEREDAL_ROUTES.map((route) => route.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('las continuaciones de Quiba y Sierra parten de Manitas', () => {
  const routeById = Object.fromEntries(VEREDAL_ROUTES.map((route) => [route.id, route]));
  const manitas = [4.55028009, -74.15049744];
  const quiba = routeById['van-veredal-quiba-01'];
  const sierra = routeById['van-veredal-sierra-01'];

  assert.deepEqual(quiba.continuation[0], manitas);
  assert.deepEqual(sierra.continuation[0], manitas);
  assert.notDeepEqual(quiba.continuation[0], [4.55009985, -74.1588974]);
  assert.notDeepEqual(sierra.continuation[0], [4.55009985, -74.1588974]);
});
