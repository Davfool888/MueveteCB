import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAlternatives } from './alternativesService.js';
import { buildCableAlternative } from './cableService.js';
import { listSitpAlternatives } from './sitpRoutesService.js';
import { listTroncalAlternatives } from './trunkService.js';

/** Br. Meissen, downtown con paraderos SITP y a menos de 1 km del cable. */
const MEISSEN = { latitude: 4.56025, longitude: -74.13866, label: 'Br. Meissen' };
/** Mirador del Paraíso, extremo cumbre de la línea del cable. */
const PARAISO = { latitude: 4.55009985, longitude: -74.1588974, label: 'Mirador del Paraíso' };
/** Sierra Morena, al otro lado de la ciudad, con corredor troncal. */
const SIERRA_MORENA = { latitude: 4.568, longitude: -74.168, label: 'Sierra Morena' };

/** Catálogo completo con los motores reales inyectados. */
function catalog(input, maxPerKind) {
  return buildAlternatives({
    maxPerKind,
    ...input,
    buildCable: buildCableAlternative,
    listTrunk: (args) => listTroncalAlternatives(args),
    listSitp: (args) => listSitpAlternatives(args),
  });
}

test('sin origen devuelve listas vacías en vez de fallar', () => {
  const result = buildAlternatives({});
  assert.deepEqual(result.alternatives, []);
  assert.deepEqual(result.summaries, []);
  assert.deepEqual(result.groups, []);
});

test('ofrece varias alternativas del mismo medio, no solo la mejor', () => {
  // El motivo del cambio: una persona puede preferir la alimentadora corta aunque
  // el motor puntee otra. Todas son corredores que llevan hacia el destino.
  const result = catalog({ originLocation: MEISSEN, destinationLocation: PARAISO });

  const sitpPlans = result.alternatives.filter((plan) => plan.kind === 'official-sitp');
  assert.ok(
    sitpPlans.length >= 2,
    `se esperaban al menos 2 rutas SITP, se obtuvieron ${sitpPlans.length}`,
  );

  // Y son rutas distintas de verdad, no el mismo corredor repetido.
  const codes = new Set(sitpPlans.map((plan) => plan.routeCode));
  assert.equal(codes.size, sitpPlans.length, 'cada alternativa debe ser un corredor distinto');
});

test('agrupa las alternativas por medio para poder compararlas', () => {
  const result = catalog({ originLocation: MEISSEN, destinationLocation: PARAISO });
  assert.ok(result.groups.length > 0, 'debe haber al menos un grupo');

  for (const group of result.groups) {
    assert.ok(group.label, 'cada grupo necesita una etiqueta legible');
    assert.ok(group.icon, 'cada grupo necesita un icono');
    assert.ok(group.count > 0);
    // El `kind` del grupo es el del resumen, que es el que ve la interfaz.
    const inGroup = result.summaries.filter((summary) => summary.kind === group.kind);
    assert.equal(inGroup.length, group.count, 'el conteo del grupo debe cuadrar con los resúmenes');
  }
});

test('cada resumen lleva lo necesario para decidir sin abrir la pestaña', () => {
  const result = catalog({ originLocation: MEISSEN, destinationLocation: PARAISO });
  for (const summary of result.summaries) {
    assert.ok(summary.id, 'falta el identificador para seleccionarlo');
    assert.ok(summary.label || summary.routeCode, 'falta el nombre de la opción');
    assert.ok(Number.isFinite(summary.estimatedMinutes), `${summary.id} sin tiempo`);
    assert.ok(Number.isFinite(summary.totalDistanceKm), `${summary.id} sin distancia`);
  }
});

test('el orden de lectura va de cable a troncal, SITP y veredal', () => {
  const result = catalog({ originLocation: SIERRA_MORENA, destinationLocation: PARAISO });
  const order = result.alternatives.map((plan) => plan.kind);
  const expected = ['official-cable', 'official-trunk', 'official-sitp', 'veredal'];
  const ranks = order.map((kind) => expected.indexOf(kind));
  assert.ok(ranks.every((rank) => rank >= 0), `medio no contemplado en el orden: ${order.join(', ')}`);
  for (let index = 1; index < ranks.length; index += 1) {
    assert.ok(ranks[index] >= ranks[index - 1], `el orden se rompe en ${order[index]}`);
  }
});

test('limita cuántas opciones ofrece por medio', () => {
  const result = catalog({ originLocation: SIERRA_MORENA, destinationLocation: PARAISO }, 2);
  for (const group of result.groups) {
    assert.ok(group.count <= 2, `el grupo ${group.kind} ofreció ${group.count} opciones, el máximo era 2`);
  }
});

test('toda alternativa oficial lleva geometría dibujable', () => {
  const result = catalog({ originLocation: MEISSEN, destinationLocation: PARAISO });
  for (const plan of result.alternatives) {
    if (plan.kind === 'veredal') continue; // la van veredal no usa el trazado oficial
    assert.ok(Array.isArray(plan.path) && plan.path.length >= 2, `${plan.id} sin trazado`);
    assert.ok(Number.isFinite(plan.totalDistanceKm), `${plan.id} sin distancia total`);
    assert.ok(Number.isFinite(plan.estimatedMinutes), `${plan.id} sin tiempo estimado`);
    assert.ok(plan.steps.length > 0, `${plan.id} sin pasos`);
    // El aviso de que el tiempo es estimado acompaña siempre a un dato oficial.
    if (plan.kind !== 'veredal') {
      assert.match(plan.dataStatus, /estimated-time/);
    }
  }
});

test('el resumen de cada alternativa dice dónde abordar y dónde bajarse', () => {
  const result = catalog({ originLocation: MEISSEN, destinationLocation: PARAISO });
  for (const plan of result.alternatives.filter((entry) => entry.kind !== 'veredal')) {
    assert.ok(plan.boarding?.name, `${plan.id} no dice dónde abordar`);
    assert.ok(
      plan.cableIntegration?.stationName || plan.alighting?.name,
      `${plan.id} no dice dónde termina el viaje`,
    );
  }
});

test('sin destino el catálogo no inventa alternativas de tramo completo', () => {
  // Sin destino no hay hacia dónde recortar el corredor, así que solo se ofrecen
  // los medios que funcionan de punta a punta por su cuenta: el cable.
  const result = catalog({ originLocation: MEISSEN });
  const withGeometry = result.alternatives.filter((plan) => plan.kind !== 'veredal');
  for (const plan of withGeometry) {
    assert.equal(plan.kind, 'official-cable', `sin destino solo el cable cierra el viaje, no ${plan.kind}`);
  }
});

test('los identificadores de alternativa son únicos', () => {
  const result = catalog({ originLocation: SIERRA_MORENA, destinationLocation: PARAISO });
  const ids = result.alternatives.map((plan) => plan.id);
  assert.equal(new Set(ids).size, ids.length, 'dos alternativas comparten identificador');
});
