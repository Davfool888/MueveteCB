import test from 'node:test';
import assert from 'node:assert/strict';
import { extractIntent } from './intentParser.js';
import { isReportActive, resolveRouteIdForReports, selectRoute } from './recommendationEngine.js';

const NOW = new Date('2026-09-24T06:00:00.000Z');
const ACTIVE_REPORT = {
  id: 'report-1',
  type: 'bloqueo',
  location: 'alpes',
  status: 'reported',
  createdAt: '2026-09-24T05:30:00.000Z',
  expiresAt: '2026-09-24T08:30:00.000Z',
};

test('interpreta el caso de demo sin depender de regex rígidas', () => {
  const intent = extractIntent({
    message: 'Estoy en Mochuelo Alto y necesito llegar al Portal Tunal antes de las 7',
  });

  assert.equal(intent.type, 'route');
  assert.equal(intent.originId, 'mochuelo_alto');
  assert.equal(intent.destinationId, 'portal_tunal');
  assert.equal(intent.arrivalBy, '07:00');
  assert.equal(intent.priority, 'fastest');
});

test('selecciona la ruta principal y conserva coordenadas GeoJSON', () => {
  const intent = extractIntent({
    message: 'Ruta al Tunal',
    origin: 'Mochuelo Alto',
    destination: 'Portal Tunal',
    deadline: '07:00',
  });
  const decision = selectRoute({ intent, reports: [], now: NOW });

  assert.equal(decision.status, 'ok');
  assert.equal(decision.route.id, 'main');
  assert.equal(decision.route.dataStatus, 'demo');
  assert.equal(decision.route.totalCostCop, 6050);
  assert.equal(decision.route.bufferMinutes, 31);
  assert.deepEqual(decision.route.geometry.coordinates[0], [-74.148341, 4.4883574]);
});

test('la prioridad económica elige la ruta SITP de Mochuelo Bajo', () => {
  const intent = extractIntent({
    message: 'Mochuelo Bajo al Tunal antes de las 7,Priorizo economía',
    origin: 'Mochuelo Bajo',
    destination: 'Portal Tunal',
    deadline: '07:00',
    priority: 'cheapest',
  });
  const decision = selectRoute({ intent, reports: [], now: NOW });

  assert.equal(decision.route.id, 'economic');
  assert.equal(decision.route.totalCostCop, 3550);
  assert.equal(decision.route.steps[1].source, 'gtfs_20260818');
});

test('la ruta accesible se limita al origen formal disponible', () => {
  const accessibleIntent = extractIntent({
    message: 'Desde Mirador del Paraíso al Tunal antes de las 7, ruta formal PMR',
    origin: 'Mirador del Paraíso',
    destination: 'Portal Tunal',
    deadline: '07:00',
    priority: 'accessible',
  });
  const accessibleDecision = selectRoute({ intent: accessibleIntent, reports: [], now: NOW });
  assert.equal(accessibleDecision.route.id, 'accessible');
  assert.match(accessibleDecision.route.accessibilityLabel, /confirmar/i);

  const invalidIntent = extractIntent({
    message: 'Mochuelo Alto al Tunal antes de las 7',
    origin: 'Mochuelo Alto',
    destination: 'Portal Tunal',
    deadline: '07:00',
    priority: 'cheapest',
  });
  const invalidDecision = selectRoute({ intent: invalidIntent, reports: [], now: NOW });
  assert.equal(invalidDecision.status, 'no_route');
});

test('responde conocimiento oficial sin solicitar una ruta', () => {
  const intent = extractIntent({
    message: '¿Cuáles son las estaciones, la tarifa y el transbordo de TransMiCable?',
  });
  const decision = selectRoute({ intent, reports: [], now: NOW });

  assert.equal(decision.status, 'knowledge');
  assert.deepEqual(decision.knowledge.transMiCableStations, [
    'Tunal',
    'Juan Pablo II',
    'Manitas',
    'Mirador del Paraíso',
  ]);
  assert.equal(decision.knowledge.sitpFareCop, 3550);
  assert.equal(decision.knowledge.transferWindowMinutes, 125);
});

test('un bloqueo activo en Alpes–Quiba selecciona la alternativa', () => {
  const intent = extractIntent({
    message: 'Mochuelo Alto a Portal Tunal antes de las 7',
    origin: 'Mochuelo Alto',
    destination: 'Portal Tunal',
    deadline: '07:00',
  });
  const decision = selectRoute({ intent, reports: [ACTIVE_REPORT], now: NOW });

  assert.equal(decision.route.id, 'alternate');
  assert.deepEqual(decision.usedReportIds, ['report-1']);
});

test('un bloqueo en Portal Tunal advierte pero no inventa una salida', () => {
  const intent = extractIntent({
    message: 'Mochuelo Alto a Portal Tunal antes de las 7',
    origin: 'Mochuelo Alto',
    destination: 'Portal Tunal',
    deadline: '07:00',
  });
  const decision = selectRoute({
    intent,
    reports: [{ ...ACTIVE_REPORT, location: 'tunal' }],
    now: NOW,
  });

  assert.equal(decision.route.id, 'main');
  assert.ok(
    decision.warnings.some(
      (warning) => warning.includes('No encontré') && warning.includes('alternativa verificable')
    )
  );
});

test('un reporte vencido deja de afectar la recomendación', () => {
  const expired = {
    ...ACTIVE_REPORT,
    expiresAt: '2026-09-24T05:59:00.000Z',
  };

  assert.equal(isReportActive(expired, NOW), false);
  assert.equal(
    resolveRouteIdForReports({ preferredRouteId: 'alternate', reports: [expired], now: NOW }),
    'main'
  );
});

test('no crea una alternativa para Quiba si el reporte afecta el tramo', () => {
  const intent = extractIntent({
    message: 'Quiba al Portal Tunal antes de las 7',
    origin: 'Quiba',
    destination: 'Portal Tunal',
    deadline: '07:00',
  });
  const decision = selectRoute({ intent, reports: [ACTIVE_REPORT], now: NOW });

  assert.equal(decision.route.id, 'quiba');
  assert.ok(decision.warnings.some((warning) => warning.includes('No encontré otra ruta verificable')));
});

test('pide un dato cuando el destino no existe en el catálogo', () => {
  const intent = extractIntent({
    message: 'Quiero llegar a La Candelaria',
    origin: 'Mochuelo Alto',
    destination: 'La Candelaria',
    deadline: '07:00',
  });
  const decision = selectRoute({ intent, reports: [], now: NOW });

  assert.equal(decision.status, 'no_route');
  assert.equal(decision.route, null);
});
