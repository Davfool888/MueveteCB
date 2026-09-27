import test from 'node:test';
import assert from 'node:assert/strict';

import { toOfficialRouteShape, toOfficialTransportPlanShape } from './officialPlanShapes.js';
import { listSitpAlternatives } from './sitpRoutesService.js';

/** Br. Meissen, con paraderos del SITP y a menos de 1 km del cable. */
const MEISSEN = { latitude: 4.56025, longitude: -74.13866, label: 'Br. Meissen' };
/** Mirador del Paraíso, extremo cumbre de la línea del cable. */
const PARAISO = { latitude: 4.55009985, longitude: -74.1588974, label: 'Mirador del Paraíso' };

function firstSitpPlan() {
  const plan = listSitpAlternatives({ originLocation: MEISSEN, destinationLocation: PARAISO })[0];
  assert.ok(plan, 'debe haber al menos una alternativa SITP para este par');
  return plan;
}

test('cada tramo en vehículo lleva su geometría para poder dibujarse', () => {
  // Sin `path` en los pasos, el mapa no dibujaba la alternativa: solo aparecía el
  // límite de la localidad y el texto describía un viaje que nadie veía.
  const transportPlan = toOfficialTransportPlanShape(firstSitpPlan());
  assert.ok(transportPlan);

  const rideLegs = transportPlan.legs.filter((leg) => leg.mode === 'sitp' || leg.mode === 'cable');
  assert.ok(rideLegs.length > 0, 'el plan debe tener al menos un tramo en vehículo');
  for (const leg of rideLegs) {
    assert.ok(Array.isArray(leg.path), `el tramo ${leg.mode} no lleva trazado`);
    assert.ok(leg.path.length >= 2, `el tramo ${leg.mode} lleva menos de dos puntos`);
  }
});

test('el tramo SITP dibuja solo el tramo recorrido, no el corredor entero', () => {
  const plan = firstSitpPlan();
  const transportPlan = toOfficialTransportPlanShape(plan);
  const sitpLeg = transportPlan.legs.find((leg) => leg.mode === 'sitp');

  assert.deepEqual(sitpLeg.path, plan.sitpPath);
  assert.equal(sitpLeg.path.length, plan.sitpPath.length);
});

test('el tramo de cable dibuja solo la parte de la línea que se recorre', () => {
  const plan = firstSitpPlan();
  if (!plan.cableLeg) {
    // Sin tramo de cable no hay línea que dibujar: no se inventa.
    const transportPlan = toOfficialTransportPlanShape(plan);
    assert.equal(
      transportPlan.legs.filter((leg) => leg.mode === 'cable').length,
      0,
    );
    return;
  }

  const cableLeg = toOfficialTransportPlanShape(plan).legs.find((leg) => leg.mode === 'cable');
  assert.deepEqual(cableLeg.path, plan.cableLeg.path);
});

test('los tramos a pie no llevan trazado inventado', () => {
  // No hay fuente oficial para la calle. Dibujar una línea recta entre el origen
  // y el paradero haría creer que ese es el camino recorrido.
  const transportPlan = toOfficialTransportPlanShape(firstSitpPlan());
  for (const leg of transportPlan.legs.filter((entry) => entry.mode === 'walk')) {
    assert.equal(leg.path, null, 'un tramo a pie no puede llevar trazado sin fuente');
  }
});

test('la forma de ruta conserva la geometría completa del viaje', () => {
  const plan = firstSitpPlan();
  const route = toOfficialRouteShape(plan);
  assert.deepEqual(route.mapPath, plan.path);
  assert.ok(route.mapPath.length >= 2, 'la ruta necesita al menos dos puntos');
});

test('ninguna forma oficial afirma una hora de salida o de llegada', () => {
  // El extracto no trae `stop_times`. Poner un reloj estimado sería publicar como
  // hecho lo que es una suposición.
  const plan = firstSitpPlan();
  const route = toOfficialRouteShape(plan);
  assert.equal(route.departureClock, undefined);
  assert.equal(route.arrivalClock, undefined);
  assert.equal(route.arrivalMinutes, undefined);
  assert.match(route.duration, /est\.|validar/i);
});

test('la alternativa se identifica con su código de ruta y no con un id de demostración', () => {
  const plan = firstSitpPlan();
  const route = toOfficialRouteShape(plan);
  assert.equal(route.isOfficialSitp, true);
  assert.equal(route.officialRouteCode, plan.routeCode);
  assert.equal(route.id, plan.id);
});

test('sin plan no se inventa ninguna forma', () => {
  assert.equal(toOfficialRouteShape(null), null);
  assert.equal(toOfficialTransportPlanShape(null), null);
  assert.equal(toOfficialRouteShape(undefined), null);
  assert.equal(toOfficialTransportPlanShape(undefined), null);
});
