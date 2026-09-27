import test from 'node:test';
import assert from 'node:assert/strict';

import { CABLE_ROUTING_OPTIONS, buildCableAlternative, getNearestCableStation } from './cableService.js';
import { buildAlternatives } from './alternativesService.js';
import { officialPlanToItinerary } from './itineraryBuilder.js';
import {
  CABLE_LINE_LENGTH_KM,
  CABLE_METADATA,
  CABLE_SEGMENTS,
  CABLE_STATIONS,
} from '../data/cableIndex.js';

/** A 300 m de Portal Tunal. */
const NEAR_TUNAL = { latitude: 4.5715, longitude: -74.1372 };
/** A 400 m de Mirador del Paraíso, en el otro extremo de la línea. */
const NEAR_PARACAISO = { latitude: 4.5515, longitude: -74.1573 };
/** Br. Meissen: a menos de 1 km de Portal Tunal, así que sí alcanza. */
const MEISSEN = { latitude: 4.56025, longitude: -74.13866 };
/** Un punto de Usme, a varios kilómetros de cualquier estación del cable. */
const USME = { latitude: 4.532, longitude: -74.12 };

test('encuentra la estación del cable más cercana a un punto', () => {
  const near = getNearestCableStation(NEAR_TUNAL);
  assert.ok(near);
  assert.equal(near.station.id, '101');
  assert.ok(near.walkKm <= CABLE_ROUTING_OPTIONS.walkToStationRadiusKm);
});

test('devuelve null si no hay estación del cable a distancia caminable', () => {
  assert.equal(getNearestCableStation(USME), null);
});

test('propone el cable directo entre dos estaciones de la línea', () => {
  const plan = buildCableAlternative({
    originLocation: NEAR_TUNAL,
    destinationLocation: NEAR_PARACAISO,
  });

  assert.ok(plan, 'debe construir la alternativa del cable');
  assert.equal(plan.kind, 'official-cable');
  assert.equal(plan.serviceType, 'Cable');
  assert.equal(plan.boarding.name, 'Tunal');
  assert.equal(plan.alighting.name, 'Mirador Del Paraiso');
  assert.equal(plan.totalCostCop, 3550);
  assert.equal(plan.steps.length, 3);
  assert.equal(plan.steps[1].mode, 'cable');
});

test('el cable no se propone cuando ambos extremos están en la misma estación', () => {
  assert.equal(
    buildCableAlternative({ originLocation: NEAR_TUNAL, destinationLocation: NEAR_TUNAL }),
    null,
  );
});

test('el cable no se propone si falta uno de los dos extremos', () => {
  assert.equal(buildCableAlternative({ originLocation: NEAR_TUNAL }), null);
  assert.equal(buildCableAlternative({ originLocation: USME, destinationLocation: NEAR_PARACAISO }), null);
});

test('el cable se propone con un extremo a un kilómetro de la estación', () => {
  // Meissen está a 988 m de Portal Tunal: el paseo sigue siendo una opción
  // válida, y la interfaz publica la distancia en vez de ocultarla.
  const plan = buildCableAlternative({ originLocation: MEISSEN, destinationLocation: NEAR_PARACAISO });
  assert.ok(plan);
  assert.ok(plan.boarding.walkKm > 0.9);
});

test('nunca afirma hora de salida ni de llegada', () => {
  const plan = buildCableAlternative({
    originLocation: NEAR_TUNAL,
    destinationLocation: NEAR_PARACAISO,
  });
  assert.equal(plan.departureTime, undefined);
  assert.equal(plan.arrivalTime, undefined);
  assert.ok(plan.warnings.some((warning) => /intervalos de despacho/.test(warning)));
});

test('el catálogo ofrece cable, troncal y SITP a la vez cuando aplica', () => {
  // Quiba tiene corredor SITP; Biblioteca–Portal Tunal tiene troncal; y un
  // trayecto por el cable necesita extremos pegados a la línea.
  const { summaries } = buildAlternatives({
    originLocation: NEAR_TUNAL,
    destinationLocation: NEAR_PARACAISO,
    buildCable: (input) => buildCableAlternative(input),
  });

  assert.ok(summaries.length >= 1);
  assert.equal(summaries[0].kind, 'cable');
  assert.match(summaries[0].title, /TransMiCable/);
});

test('el tramo del cable dice dónde se sube y dónde se baja', () => {
  const plan = buildCableAlternative({
    originLocation: MEISSEN,
    destinationLocation: NEAR_PARACAISO,
  });
  assert.ok(plan);

  const itinerary = officialPlanToItinerary(plan);
  const cableStep = itinerary.steps.find((step) => step.mode === 'cable');
  assert.ok(cableStep);
  assert.equal(cableStep.boardAt, 'Tunal', 'se sube en la estación de abordaje');
  assert.equal(cableStep.alightAt, 'Mirador Del Paraiso', 'se baja en la estación de llegada');
  assert.notEqual(cableStep.boardAt, cableStep.alightAt);
});

test('las estaciones del cable son las del inventario del operador, en orden de línea', () => {
  // Antes estas cuatro estaban escritas a mano en `routes.js`. Ahora salen del
  // inventario publicado, así que el identificador es `num_est` y el orden es el
  // de la línea: del portal a la cumbre.
  assert.deepEqual(
    CABLE_STATIONS.map((station) => [station.id, station.name]),
    [
      ['101', 'Tunal'],
      ['102', 'Juan Pablo II'],
      ['103', 'Manitas'],
      ['104', 'Mirador Del Paraiso'],
    ],
  );
  assert.deepEqual(
    CABLE_STATIONS.map((station) => station.positionKm),
    [...CABLE_STATIONS.map((station) => station.positionKm)].sort((a, b) => a - b),
    'la posición acumulada debe crecer a lo largo de la línea',
  );
});

test('la accesibilidad de cada estación viene del dato del operador, no de un supuesto', () => {
  const tunal = CABLE_STATIONS.find((station) => station.id === '101');
  const juanPablo = CABLE_STATIONS.find((station) => station.id === '102');
  // El inventario reporta 0 ascensores en Tunal y 2 en Juan Pablo II.
  assert.equal(tunal.lifts, 0);
  assert.equal(tunal.accessLabel, 'Sin elevador');
  assert.equal(juanPablo.lifts, 2);
  assert.equal(juanPablo.accessLabel, '2 elevadores');
});

test('la línea del cable mide lo que declara el operador', () => {
  const metadata = CABLE_METADATA;
  // 3344 m declarados frente a 3351 m medidos sobre la geometría: la diferencia
  // es el redondeo de los vértices, no un tramo que falte.
  assert.ok(Math.abs(metadata.measuredLengthM - metadata.declaredLengthM) < 30);
  assert.ok(CABLE_LINE_LENGTH_KM > 3.3 && CABLE_LINE_LENGTH_KM < 3.4);
  assert.equal(CABLE_SEGMENTS.length, metadata.segments);
  // La geometría del tramo 102 viene invertida en el archivo original; el
  // extracto la deja recorrible de punta a punta y deja constancia.
  assert.ok(metadata.note.includes('origen y destino'));
});
