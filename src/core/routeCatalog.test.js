import test from 'node:test';
import assert from 'node:assert/strict';
import { ROUTE_CATALOG, getRouteById, parseClockToMinutes } from './routeCatalog.js';

test('la duración de cada ruta coincide con sus pasos y con salida/llegada', () => {
  for (const route of ROUTE_CATALOG) {
    const stepsTotal = route.steps.reduce((total, step) => total + step.durationMinutes, 0);
    assert.equal(stepsTotal, route.durationMinutes, `${route.id}: suma de pasos`);

    const departure = parseClockToMinutes(route.departureTime);
    const arrival = parseClockToMinutes(route.arrivalTime);
    assert.equal(arrival - departure, route.durationMinutes, `${route.id}: salida → llegada`);
    assert.equal(arrival, route.arrivalMinutes, `${route.id}: arrivalMinutes`);
  }
});

test('la ruta económica refleja el recorrido real de la 6-18 en el GTFS', () => {
  const route = getRouteById('economic');
  const sitpStep = route.steps.find((step) => step.mode === 'sitp');

  assert.equal(sitpStep.source, 'gtfs_20260818');
  assert.match(sitpStep.instruction, /6-18/);
  assert.match(sitpStep.detail, /Pq\. El Tunal/);
  assert.doesNotMatch(sitpStep.detail, /Portal Tunal|Av\. Boyac/);
  assert.ok(route.steps.some((step) => step.mode === 'walk' && /Portal Tunal/.test(step.detail)));
});

test('los pasos que citan una fuente oficial usan el tiempo del GTFS', () => {
  const cableRides = ROUTE_CATALOG.flatMap((route) =>
    route.steps.filter((step) => step.mode === 'transmicable' && step.source === 'gtfs_20260818')
  );

  assert.ok(cableRides.length >= 4);
  cableRides.forEach((step) => assert.equal(step.durationMinutes, 11));
});
