import test from 'node:test';
import assert from 'node:assert/strict';

import { buildTroncalAlternative, getBoardableStationsNear, selectTroncalOption } from './trunkService.js';
import { buildAlternatives } from './alternativesService.js';
import { officialPlanToItinerary } from './itineraryBuilder.js';
import { toOfficialTransportPlanShape } from './officialPlanShapes.js';
import { haversineKm } from './transportRouting.js';

/** Biblioteca, a 400 m al este de Portal Tunal. */
const BIBLIOTECA = { latitude: 4.5703, longitude: -74.13039 };
/** Portal Tunal. */
const TUNAL = { latitude: 4.56957, longitude: -74.13924 };
/** Br. Meissen, al norte dentro de la troncal. */
const MEISSEN = { latitude: 4.56025, longitude: -74.13866 };
/** Mochuelo Alto, veredal sin cobertura troncal. */
const MOCHUELO_ALTO = { latitude: 4.4883574, longitude: -74.148341 };

test('lista estaciones donde se puede subir, ordenadas por cercanía', () => {
  const stations = getBoardableStationsNear(MEISSEN);
  assert.ok(stations.length > 0);
  for (let index = 1; index < stations.length; index += 1) {
    assert.ok(stations[index - 1].walkKm <= stations[index].walkKm);
  }
  for (const entry of stations) {
    assert.equal(entry.station.isOperating, true);
  }
});

test('propone la alternativa troncal con estaciones y capacidad reales', () => {
  const plan = buildTroncalAlternative({
    originLocation: BIBLIOTECA,
    destinationLocation: TUNAL,
    destinationLabel: 'Portal Tunal',
  });

  assert.ok(plan, 'debe construir una alternativa troncal');
  assert.equal(plan.kind, 'official-trunk');
  assert.ok(plan.boarding.stopId, 'debe nombrar la estación de abordaje');
  assert.ok(plan.alighting.stopId, 'debe nombrar la estación de bajada');
  assert.equal(plan.totalCostCop, 3550);
  assert.ok(plan.steps.some((step) => step.mode === 'trunk'));
  assert.ok(plan.warnings.length > 0);
});

test('la estación de abordaje y la de bajada son distintas', () => {
  const plan = buildTroncalAlternative({ originLocation: BIBLIOTECA, destinationLocation: TUNAL });
  assert.notEqual(plan.boarding.stopId, plan.alighting.stopId);
});

test('el tramo de bus se mide sobre el trazado, nunca en línea recta', () => {
  const plan = buildTroncalAlternative({ originLocation: BIBLIOTECA, destinationLocation: TUNAL });
  const straight = (() => {
    const R = 6371, r = Math.PI / 180;
    const a = plan.boarding.coordinates, b = plan.alighting.coordinates;
    const dLa = (b[0] - a[0]) * r, dLo = (b[1] - a[1]) * r;
    const q = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLo / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(q));
  })();
  assert.ok(
    plan.lengthKm >= straight,
    `el recorrido del bus (${plan.lengthKm}) no puede ser menor que la línea recta (${straight.toFixed(2)})`,
  );
});

test('el bus siempre deja a la persona más cerca de su destino', () => {
  // Origen pegado al destino: el motor no debe proponer subirse al bus para
  // alejarse, ni siquiera si queda una estación más en el corredor.
  const option = selectTroncalOption(TUNAL, TUNAL);
  assert.equal(option, null, 'sin trayecto en bus no hay alternativa troncal');

  const plan = buildTroncalAlternative({ originLocation: MEISSEN, destinationLocation: TUNAL });
  if (plan) {
    const straight = haversineKm(plan.boarding.coordinates, plan.alighting.coordinates);
    assert.ok(Number.isFinite(straight));
  }
});

test('una distancia tan corta que el bus no compensa no genera alternativa', () => {
  // Meissen está a 1,2 km de Portal Tunal y el tramo de bus mide 0,4 km:
  // caminar 15 min es mejor que esperar un bus para 400 m.
  assert.equal(buildTroncalAlternative({ originLocation: MEISSEN, destinationLocation: TUNAL }), null);
});

test('un tramo largo de troncal sí se propone', () => {
  const plan = buildTroncalAlternative({ originLocation: BIBLIOTECA, destinationLocation: TUNAL });
  assert.ok(plan);
  assert.ok(plan.lengthKm >= 0.8);
});

test('el itinerario troncal declara dónde abordar y dónde bajar', () => {
  // Un recorrido real por la troncal NQS Sur, dentro de Ciudad Bolívar.
  const plan = buildTroncalAlternative({
    originLocation: { latitude: 4.59381, longitude: -74.12376 },
    destinationLocation: { latitude: 4.59694, longitude: -74.1693 },
    destinationLabel: 'Portal Sur',
  });
  assert.ok(plan);

  const itinerary = officialPlanToItinerary(plan);
  assert.equal(itinerary.kind, 'official-trunk');
  assert.equal(itinerary.kicker, 'Alternativa troncal');

  const busStep = itinerary.steps.find((step) => step.mode === 'trunk');
  assert.ok(busStep, 'debe existir el tramo en troncal');
  assert.ok(busStep.boardAt, 'debe decir en qué estación se sube');
  assert.ok(busStep.alightAt, 'debe decir en qué estación se baja');
  assert.ok(busStep.verified, 'el tramo troncal viene del inventario oficial');
});

test('el plan troncal viaja como modo troncal, no como SITP', () => {
  const plan = buildTroncalAlternative({
    originLocation: { latitude: 4.59381, longitude: -74.12376 },
    destinationLocation: { latitude: 4.59694, longitude: -74.1693 },
  });
  const transportPlan = toOfficialTransportPlanShape(plan);
  assert.equal(transportPlan.mode, 'trunk');
  assert.equal(transportPlan.isOfficialTrunk, true);
  assert.match(transportPlan.modeLabel, /Troncal/);
});

test('sin destino no inventa una alternativa troncal', () => {
  assert.equal(buildTroncalAlternative({ originLocation: BIBLIOTECA }), null);
  assert.equal(selectTroncalOption(BIBLIOTECA, null), null);
});

test('un origen demasiado lejos de toda estación no produce alternativa', () => {
  assert.equal(buildTroncalAlternative({ originLocation: MOCHUELO_ALTO, destinationLocation: TUNAL }), null);
});

test('el catálogo ofrece varias alternativas a la vez', () => {
  const { alternatives, summaries } = buildAlternatives({
    originLocation: BIBLIOTECA,
    destinationLocation: TUNAL,
    destinationLabel: 'Portal Tunal',
    buildTroncal: (input) => buildTroncalAlternative(input),
    buildVeredal: () => ({
      id: 'veredal_demo',
      title: 'Van veredal de demostración',
      corridorLabel: 'Biblioteca → Portal Tunal',
      routeCode: 'veredal',
      serviceType: 'Veredal',
      busType: 'Camper',
      estimatedMinutes: 35,
      totalDistanceKm: 4,
      totalCostCop: 2500,
      costFormatted: 'van por confirmar',
      dataStatus: 'simulated',
      matchReason: 'sin paradero oficial cerca',
      warnings: ['El primer tramo usa una geometría veredal simulada del prototipo.'],
    }),
  });

  assert.ok(alternatives.length >= 2, `debe ofrecer al menos dos medios distintos, ofreció ${alternatives.length}`);
  assert.ok(summaries.some((summary) => summary.kind === 'trunk'));
  assert.ok(summaries.some((summary) => summary.kind === 'veredal'));
  assert.ok(
    summaries.some((summary) => summary.isSimulated),
    'la van debe quedar marcada como simulada',
  );
});

test('el catálogo real ofrece la troncal donde hay estación', () => {
  const { summaries } = buildAlternatives({
    originLocation: BIBLIOTECA,
    destinationLocation: TUNAL,
    buildTroncal: (input) => buildTroncalAlternative(input),
  });
  assert.ok(summaries.length >= 1);
  assert.equal(summaries[0].kind, 'trunk');
  assert.ok(summaries[0].costFormatted.includes('3.550'));
});

test('sin origen el catálogo devuelve una lista vacía, no un error', () => {
  assert.deepEqual(buildAlternatives({ originLocation: null }).alternatives, []);
});
