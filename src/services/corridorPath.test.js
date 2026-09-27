import test from 'node:test';
import assert from 'node:assert/strict';

import { doesCorridorApproachDestination, sliceCorridorPath } from './corridorPath.js';
import { haversineKm } from './transportRouting.js';

/** Una línea recta norte-sur de 4 km, como un corredor de prueba. */
function straightPath() {
  const path = [];
  for (let index = 0; index <= 20; index += 1) path.push([4.5 + index * 0.002, -74.15]);
  return [path];
}

const SOUTH = [4.5, -74.15];
const MIDDLE = [4.52, -74.15];
const NORTH = [4.54, -74.15];

/** Polilínea recta con 21 vértices entre dos puntos. */
function line(from, to) {
  const path = [];
  for (let index = 0; index <= 20; index += 1) {
    const ratio = index / 20;
    path.push([from[0] + (to[0] - from[0]) * ratio, from[1] + (to[1] - from[1]) * ratio]);
  }
  return path;
}

test('recorta el tramo entre abordaje y bajada, no el corredor completo', () => {
  const paths = straightPath();
  const slice = sliceCorridorPath(paths, MIDDLE, NORTH);
  assert.ok(slice);

  const wholeCorridor = haversineKm(paths[0][0], paths[0][paths[0].length - 1]);
  assert.ok(
    slice.distanceKm < wholeCorridor * 0.7,
    `debe medir solo lo que se viaja: ${slice.distanceKm} km frente a ${wholeCorridor.toFixed(2)} km del corredor`
  );
  assert.ok(slice.path.length < paths[0].length, 'no debe devolver la polilínea entera');
  assert.equal(slice.reversed, false);
});

test('la distancia medida coincide con la línea recta entre los dos puntos', () => {
  const slice = sliceCorridorPath(straightPath(), SOUTH, NORTH);
  const straight = haversineKm(SOUTH, NORTH);
  assert.ok(Math.abs(slice.distanceKm - straight) < 0.01);
});

test('invierte el orden si la bajada queda antes en la geometría', () => {
  const slice = sliceCorridorPath(straightPath(), NORTH, SOUTH);
  assert.equal(slice.reversed, true);
  assert.ok(Math.abs(slice.distanceKm - haversineKm(NORTH, SOUTH)) < 0.01);
  // Y el primer punto del resultado es el de abordaje, no el de bajada.
  assert.ok(haversineKm(slice.path[0], NORTH) < 0.01);
});

test('devuelve el sentido real de la marcha en el orden de los puntos', () => {
  const northbound = sliceCorridorPath(straightPath(), SOUTH, NORTH);
  const southbound = sliceCorridorPath(straightPath(), NORTH, SOUTH);
  const firstNorth = northbound.path[0];
  const firstSouth = southbound.path[0];
  assert.ok(firstNorth[0] < firstSouth[0], 'hacia el norte debe empezar al sur');
});

test('la polilínea resultante va del abordaje a la bajada sin saltos', () => {
  const slice = sliceCorridorPath(straightPath(), MIDDLE, NORTH);
  for (let index = 1; index < slice.path.length; index += 1) {
    const step = haversineKm(slice.path[index - 1], slice.path[index]);
    assert.ok(step < 0.5, `salto de ${step} km entre puntos consecutivos`);
  }
});

test('une todas las bandas intermedias, no solo la primera y la última', () => {
  // El corredor 6-7 del SITP tiene los dos extremos en bandas distintas de su
  // MultiLineString. Una versión anterior conservaba solo la banda de abordaje y
  // la de bajada, se saltaba la intermedia, y el trazado dibujado terminaba a
  // kilómetros de la estación donde debía bajarse la persona.
  // Las tres bandas se encadenan, como en un corredor real.
  const paths = [
    line([4.5, -74.15], [4.52, -74.15]),
    line([4.52, -74.15], [4.54, -74.13]),
    line([4.54, -74.13], [4.56, -74.13]),
  ];
  const board = [4.504, -74.15];
  const alight = [4.556, -74.13];

  const slice = sliceCorridorPath(paths, board, alight);
  assert.ok(slice, 'debe poder recortar un corredor de varias bandas');
  assert.equal(slice.reversed, false);

  // Empieza donde se aborda y termina donde se baja, sin perder la banda intermedia.
  assert.ok(haversineKm(slice.path[0], board) < 0.05, 'no arranca en el punto de abordaje');
  assert.ok(haversineKm(slice.path.at(-1), alight) < 0.05, 'no termina en el punto de bajada');

  // Recorrer las tres bandas tiene que costar más que ir en línea recta.
  const straight = haversineKm(board, alight);
  assert.ok(
    slice.distanceKm > straight,
    `el recorrido (${slice.distanceKm} km) no puede ser menor que la línea recta (${straight.toFixed(2)} km)`,
  );

  // Y la geometría es continua: ninguna banda se salta.
  for (let index = 1; index < slice.path.length; index += 1) {
    assert.ok(haversineKm(slice.path[index - 1], slice.path[index]) < 0.5, 'hay un salto entre bandas');
  }

  // La banda intermedia sigue ahí: su punto medio aparece en el trazado.
  const middle = [4.53, -74.14];
  let closest = Infinity;
  for (const point of slice.path) closest = Math.min(closest, haversineKm(point, middle));
  assert.ok(closest < 0.1, 'la banda intermedia quedó fuera del trazado');
});

test('recorre las bandas al revés cuando el embarque ocurre en la última', () => {
  const paths = [line([4.5, -74.15], [4.52, -74.15]), line([4.52, -74.15], [4.54, -74.13])];

  // El punto de abordaje va sobre la banda: la diagonal va de 4.52 a 4.54, así
  // que a 4.538 le corresponde -74.132, no -74.13.
  const board = [4.538, -74.132];
  const alight = [4.504, -74.15];
  const slice = sliceCorridorPath(paths, board, alight);
  assert.ok(slice);
  assert.equal(slice.reversed, true);
  assert.ok(haversineKm(slice.path[0], board) < 0.05, 'no arranca en el punto de abordaje');
  assert.ok(haversineKm(slice.path.at(-1), alight) < 0.05, 'no termina en el punto de bajada');
  assert.ok(Math.abs(slice.distanceKm - haversineKm(board, alight) * 1.05) < 0.3);
});

test('sin paths o sin puntos devuelve null en vez de inventar una línea', () => {
  assert.equal(sliceCorridorPath([], SOUTH, NORTH), null);
  assert.equal(sliceCorridorPath(null, SOUTH, NORTH), null);
  assert.equal(sliceCorridorPath(straightPath(), null, NORTH), null);
});

test('rechaza un corredor que aleja del destino', () => {
  // El destino queda al sur, pero el tramo recorrido sube al norte.
  const destination = [4.505, -74.15];
  const away = sliceCorridorPath(straightPath(), MIDDLE, NORTH);
  assert.equal(doesCorridorApproachDestination(away.path, MIDDLE, destination), false);
});

test('acepta un corredor que acerca al destino aunque no llegue hasta él', () => {
  // El bus no pasa por el destino, pero queda 887 m frente a los 1422 m en línea
  // recta: es un avance real y debe aceptarse.
  const destination = [4.53, -74.142];
  const towards = sliceCorridorPath(straightPath(), MIDDLE, NORTH);
  const straight = haversineKm(MIDDLE, destination);
  let closest = Infinity;
  for (const point of towards.path) closest = Math.min(closest, haversineKm(point, destination));
  assert.ok(straight - closest > 0.4);
  assert.equal(doesCorridorApproachDestination(towards.path, MIDDLE, destination), true);
});
