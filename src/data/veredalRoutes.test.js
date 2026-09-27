import test from 'node:test';
import assert from 'node:assert/strict';
import { VEREDAL_ROUTES } from './veredalRoutes.js';
import { CABLE_STATIONS } from './cableIndex.js';
import { haversineKm } from '../services/transportRouting.js';

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
  const quiba = routeById['van-veredal-quiba-01'];
  const sierra = routeById['van-veredal-sierra-01'];

  // La estación de la que parten se toma del inventario del operador, no de una
  // coordenada escrita a mano.
  const manitas = CABLE_STATIONS.find((station) => station.id === '103');
  const tunal = CABLE_STATIONS.find((station) => station.id === '101');
  const paraiso = CABLE_STATIONS.find((station) => station.id === '104');

  for (const route of [quiba, sierra]) {
    assert.ok(route.continuation.length >= 2, `${route.id} sin continuación`);
    assert.ok(
      haversineKm(route.continuation[0], manitas.coordinates) < 0.05,
      `${route.id} no parte de Manitas`,
    );
    assert.ok(
      haversineKm(route.continuation.at(-1), tunal.coordinates) < 0.2,
      `${route.id} no llega a Tunal`,
    );
    // Y no arrancan en el otro extremo de la línea, que era el error que
    // producía el `slice(0, 3).reverse()` sobre una ruta de cuatro puntos.
    assert.ok(
      haversineKm(route.continuation[0], paraiso.coordinates) > 0.5,
      `${route.id} arranca en el Paraíso en vez de en Manitas`,
    );
  }
});

test('la continuación sigue la geometría real de la línea del cable', () => {
  const routeById = Object.fromEntries(VEREDAL_ROUTES.map((route) => [route.id, route]));
  const quiba = routeById['van-veredal-quiba-01'];

  // La línea oficial mide 3,35 km y Manitas está a 2,43 km de Tunal, así que el
  // tramo son 2,43 km. Si la continuación fuera la línea entera, el viaje
  // dibujado se alargaría un kilómetro sin motivo.
  let length = 0;
  for (let index = 1; index < quiba.continuation.length; index += 1) {
    length += haversineKm(quiba.continuation[index - 1], quiba.continuation[index]);
  }
  assert.ok(length > 2.3 && length < 2.6, `el tramo mide ${length.toFixed(2)} km, se esperaban unos 2,43`);

  // Y las posiciones acumuladas del inventario cuadran con la línea medida.
  const tunal = CABLE_STATIONS.find((station) => station.id === '101');
  assert.equal(tunal.positionKm, 0, 'Tunal arranca la línea');
});
