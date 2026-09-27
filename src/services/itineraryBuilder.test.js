import test from 'node:test';
import assert from 'node:assert/strict';

import { buildItinerary, officialPlanToItinerary, transportPlanToItinerary } from './itineraryBuilder.js';
import { getTransportPlan } from './transportRouting.js';

const QUIBA = { latitude: 4.54274724, longitude: -74.17018404, label: 'Quiba Bajo' };
const PORTAL_TUNAL = { latitude: 4.56917, longitude: -74.13968, label: 'Portal Tunal' };

function fakeOfficialPlan() {
  return {
    title: 'Ruta oficial 6-2',
    corridorLabel: 'Portal Tunal → San Francisco',
    routeCode: '6-2',
    serviceType: 'Alimentación',
    busType: 'Padrón',
    operator: 'SUMA CIUDAD BOLIVAR BC',
    isRural: false,
    daysLabel: 'Lunes a domingo',
    scheduleType: 'Diurno',
    schedule: { weekday: '4:00 a. m. - 9:00 p. m.' },
    lengthKm: 5.18,
    totalDistanceKm: 9.4,
    estimatedMinutes: 30,
    matchReason: 'integra con Portal Tunal',
    totalCostCop: 3550,
    costFormatted: '$3.550 COP',
    disclaimer: 'Trazado oficial; tiempos estimados por distancia.',
    dataStatus: 'official-geometry-estimated-time',
    boarding: { stopId: 'x', name: 'Br. Meissen', street: 'AC 60G S', walkKm: 0.1, coordinates: [4.56, -74.13] },
    alighting: { stopId: 'y', name: 'Br. El Mirador', coordinates: [4.55, -74.14] },
    cableIntegration: {
      stationId: '102',
      stationName: 'Juan Pablo II',
      distanceKm: 0.04,
      walkFromAlightingKm: 0.34,
      coordinates: [4.55579, -74.14742],
    },
    cableLeg: {
      boardingStationId: '102',
      boardingStationName: 'Juan Pablo II',
      alightingStationId: '104',
      alightingStationName: 'Mirador Del Paraiso',
      rideKm: 1.63,
      walkKm: 0.2,
      path: [],
    },
    warnings: ['Los horarios son ventanas del operador.'],
    steps: [
      { order: 1, mode: 'sitp', instruction: 'Toma la ruta 6-2', detail: 'Alimentación · Padrón', durationMinutes: 16, estimatedCostCop: 3550, source: 'sitp_services_2026' },
      { order: 2, mode: 'walk', instruction: 'Baja en Br. El Mirador', detail: null, durationMinutes: 0, estimatedCostCop: null, source: 'sitp_stops_2026' },
      { order: 3, mode: 'walk', instruction: 'Camina 340 m hasta Juan Pablo II', detail: null, durationMinutes: 5, estimatedCostCop: 0, stopId: '102', source: 'cable_stations_2026' },
      { order: 4, mode: 'cable', instruction: 'Sube al TransMiCable hacia Mirador Del Paraiso', detail: null, durationMinutes: 9, estimatedCostCop: null, stopId: '102', source: 'cable_segments_2026' },
    ],
  };
}

test('el itinerario oficial declara dónde abordar y dónde bajar en cada tramo', () => {
  const itinerary = officialPlanToItinerary(fakeOfficialPlan());
  assert.equal(itinerary.kind, 'official-sitp');

  const sitp = itinerary.steps.find((step) => step.mode === 'sitp');
  const cable = itinerary.steps.find((step) => step.mode === 'cable');

  assert.equal(sitp.boardAt, 'Br. Meissen', 'el tramo SITP debe nombrar el paradero de abordaje');
  assert.equal(sitp.alightAt, 'Br. El Mirador');
  assert.ok(cable.boardAt, 'el tramo del cable debe declarar dónde se sube');
  assert.ok(cable.alightAt, 'el tramo del cable debe declarar dónde se baja');
});

test('el cable se aborda en la estación, no en el paradero donde baja el bus', () => {
  // El corredor del SITP pasa cerca de la estación y la persona termina el tramo
  // a pie. Nombrar el paradero como punto de abordaje del teleférico hacía creer
  // que se sube en la calle, a 340 m de la estación.
  const itinerary = officialPlanToItinerary(fakeOfficialPlan());
  const cable = itinerary.steps.find((step) => step.mode === 'cable');

  assert.equal(cable.boardAt, 'Juan Pablo II');
  assert.equal(cable.alightAt, 'Mirador Del Paraiso');
  assert.notEqual(cable.boardAt, 'Br. El Mirador');
  assert.notEqual(cable.boardAt, 'Br. Meissen');
});

test('el transbordo al cable declara el paseo a pie que lo separa del bus', () => {
  const itinerary = officialPlanToItinerary(fakeOfficialPlan());
  const approach = itinerary.steps.find(
    (step) => step.mode === 'walk' && step.title.includes('Juan Pablo II'),
  );
  assert.ok(approach, 'debe existir el paso a pie hasta la estación del cable');
  assert.equal(approach.title, 'Camina 340 m hasta Juan Pablo II');
  assert.notEqual(approach.durationLabel, '0 min', 'ese paseo no puede costar cero minutos');
  assert.equal(approach.verified, true, 'la estación del cable viene del inventario del operador');
});

test('el itinerario oficial marca como verificados los tramos de Transmilenio', () => {
  const itinerary = officialPlanToItinerary(fakeOfficialPlan());
  for (const step of itinerary.steps) {
    assert.equal(step.verified, true, `${step.mode} debe venir de fuente oficial`);
    assert.equal(step.simulated, false);
  }
});

test('el itinerario oficial no inventa una hora de salida', () => {
  const itinerary = officialPlanToItinerary(fakeOfficialPlan());
  const labels = itinerary.stats.map((stat) => stat.label);
  assert.ok(!labels.some((label) => /salir|llegar/i.test(label)), 'no debe publicar un reloj');
  assert.ok(itinerary.facts.some((fact) => fact.label === 'Horario del operador'));
});

test('el itinerario del planificador usa los nombres de abordaje de sus tramos', () => {
  const transportPlan = getTransportPlan({
    originLocation: QUIBA,
    destinationLocation: PORTAL_TUNAL,
    selectedMode: 'auto',
  });
  const itinerary = transportPlanToItinerary(transportPlan, {
    originLabel: 'Quiba Bajo',
    destinationLabel: 'Portal Tunal',
  });

  assert.equal(itinerary.kind, 'planner');
  assert.ok(itinerary.steps.length > 0);
  for (const step of itinerary.steps) {
    assert.ok(step.title, 'cada tramo debe tener instrucción');
    assert.ok(step.modeLabel, 'cada tramo debe nombrar el modo');
  }
  const vanStep = itinerary.steps.find((step) => step.mode === 'veredal');
  assert.ok(vanStep.boardAt, 'el tramo de la van debe decir dónde se aborda');
  assert.ok(vanStep.alightAt, 'el tramo de la van debe decir dónde se baja');
});

test('el itinerario del planificador marca el tramo veredal como simulado', () => {
  const transportPlan = getTransportPlan({
    originLocation: QUIBA,
    destinationLocation: PORTAL_TUNAL,
    selectedMode: 'auto',
  });
  const itinerary = transportPlanToItinerary(transportPlan);
  const vanStep = itinerary.steps.find((step) => step.mode === 'veredal');
  assert.equal(vanStep.simulated, true);
  assert.equal(vanStep.verified, false);
  assert.ok(
    itinerary.warnings.some((warning) => /simulada/.test(warning)),
    'debe avisar que el tramo veredal es simulado'
  );
  assert.equal(itinerary.badgeTone, 'alert');
});

test('un plan sin tramos no produce un itinerario vacío', () => {
  assert.equal(transportPlanToItinerary(null), null);
  assert.equal(transportPlanToItinerary({ status: 'idle', legs: [] }), null);
});

test('la alternativa oficial tiene prioridad cuando la persona la activó', () => {
  const transportPlan = getTransportPlan({
    originLocation: QUIBA,
    destinationLocation: PORTAL_TUNAL,
    selectedMode: 'auto',
  });

  const official = buildItinerary({ officialPlan: fakeOfficialPlan(), isOfficialActive: true, transportPlan });
  assert.equal(official.kind, 'official-sitp');

  const planner = buildItinerary({ officialPlan: fakeOfficialPlan(), isOfficialActive: false, transportPlan });
  assert.equal(planner.kind, 'planner');
});

test('sin alternativa activa se describe el plan que el mapa está pintando', () => {
  const transportPlan = getTransportPlan({
    originLocation: QUIBA,
    destinationLocation: PORTAL_TUNAL,
    selectedMode: 'auto',
  });
  const itinerary = buildItinerary({ transportPlan });
  assert.equal(itinerary.kind, 'planner');
  assert.ok(Array.isArray(itinerary.geometry));
});
