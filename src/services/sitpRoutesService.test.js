import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SITP_ROUTING_OPTIONS,
  buildOfficialSitpAlternative,
  findSitpCorridorOptions,
  formatKm,
  getNearestSitpStop,
  getSitpCableRoutes,
  getSitpRoutesNear,
  rankSitpCorridors,
  selectSitpCorridor,
  toSitpPoint,
} from './sitpRoutesService.js';

/** Quiba, un origen con cobertura oficial real y con ruta de veredal en el catÃ¡logo. */
const QUIBA = { latitude: 4.54274724, longitude: -74.17018404 };
/** Br. Meissen, downtown de la localidad. */
const MEISSEN = { latitude: 4.56025, longitude: -74.13866 };
/** Sierra Morena, barrio veredal con corredor oficial rural. */
const SIERRA_MORENA = { latitude: 4.568, longitude: -74.168 };
/** Bella Flor, veredal del sur. */
const BELLA_FLOR = { latitude: 4.546, longitude: -74.1508 };
/** Portal Tunal, estaciÃ³n troncal donde arranca el cable. */
const PORTAL_TUNAL = { latitude: 4.56917, longitude: -74.13968 };
/** Mirador del ParaÃ­so, estaciÃ³n cumbre del cable. */
const MIRADOR_PARAISO = { latitude: 4.55009985, longitude: -74.1588974 };
/** Mochuelo Alto: veredal sin cobertura del zonality oficial. */
const MOCHUELO_ALTO = { latitude: 4.4883574, longitude: -74.148341 };

test('normaliza las tres formas de punto que usan los demÃ¡s mÃ³dulos', () => {
  assert.deepEqual(toSitpPoint([4.5, -74.1]), [4.5, -74.1]);
  assert.deepEqual(toSitpPoint({ latitude: 4.5, longitude: -74.1 }), [4.5, -74.1]);
  assert.deepEqual(toSitpPoint({ coordinates: [4.5, -74.1] }), [4.5, -74.1]);
  assert.equal(toSitpPoint(null), null);
});

test('rechaza coordenadas vacÃ­as en vez de tratarlas como [0, 0]', () => {
  assert.equal(toSitpPoint({ latitude: null, longitude: -74.1 }), null);
  assert.equal(toSitpPoint({ latitude: '', longitude: '' }), null);
  assert.equal(toSitpPoint({ latitude: undefined, longitude: undefined }), null);
  assert.equal(toSitpPoint([Number.NaN, -74.1]), null);
  assert.equal(toSitpPoint({}), null);
});

test('encuentra el paradero oficial mÃ¡s cercano a un origen con cobertura', () => {
  const nearest = getNearestSitpStop(QUIBA);
  assert.ok(nearest, 'Quiba debe tener un paradero oficial');
  assert.ok(nearest.distanceKm <= SITP_ROUTING_OPTIONS.originSearchRadiusKm);
  assert.ok(nearest.stop.name.length > 0, 'el paradero debe tener nombre legible');
  assert.equal(nearest.stop.locality.code, 19);
});

test('documenta que Mochuelo Alto no tiene cobertura oficial y no la inventa', () => {
  // El motor debe devolver null en lugar de estirar el radio: el veredal es
  // precisamente el hueco que cubre la van, no el SITP.
  assert.equal(getNearestSitpStop(MOCHUELO_ALTO), null);
  assert.equal(buildOfficialSitpAlternative({ originLocation: MOCHUELO_ALTO }), null);
});

test('devuelve null cuando el origen estÃ¡ fuera de Ciudad BolÃ­var', () => {
  assert.equal(getNearestSitpStop({ latitude: 4.5981, longitude: -74.0758 }), null);
});

test('lista los corredores que pasan cerca de un punto', () => {
  const nearby = getSitpRoutesNear(PORTAL_TUNAL);
  assert.ok(nearby.length > 0);
  for (const candidate of nearby) {
    assert.ok(candidate.route.paths.length > 0);
    assert.ok(Number.isFinite(candidate.distanceKm));
  }
});

test('prefiere un corredor que integra con TransMiCable y penaliza los largos', () => {
  const selection = selectSitpCorridor(QUIBA);
  assert.ok(selection, 'Quiba debe tener un corredor oficial');
  assert.ok(selection.route.cableIntegration, 'el corredor elegido debe integrar con el cable');
  assert.ok(selection.score > 0);
});

test('construye la alternativa oficial con trazado, paradas y advertencias', () => {
  const plan = buildOfficialSitpAlternative({
    originLocation: QUIBA,
    destinationLocation: PORTAL_TUNAL,
  });

  assert.ok(plan, 'debe construir una alternativa para Quiba');
  assert.equal(plan.kind, 'official-sitp');
  assert.ok(plan.routeCode, 'debe citar el cÃ³digo de la ruta oficial');
  assert.ok(plan.boarding, 'debe nombrar el paradero de abordaje');
  assert.ok(plan.path.length > 1, 'debe traer geometrÃ­a dibujable');
  assert.ok(plan.steps.length > 0);
  assert.ok(plan.totalDistanceKm > 0);
  assert.equal(plan.totalCostCop, 3550);
  assert.ok(plan.matchReason, 'debe explicar por quÃ© eligiÃ³ ese corredor');
  assert.ok(plan.warnings.length > 0, 'deve avisar que los tiempos son estimados');
  assert.match(plan.dataStatus, /estimated-time/);
});

test('el paso del cable nunca se pierde por el lÃ­mite de pasos', () => {
  // Un truncation anterior cortaba el transbordo cuando habÃ­a muchos pasos.
  for (const origin of [QUIBA, MEISSEN, SIERRA_MORENA, BELLA_FLOR]) {
    const plan = buildOfficialSitpAlternative({
      originLocation: origin,
      destinationLocation: PORTAL_TUNAL,
    });
    if (!plan || !plan.cableIntegration) continue;
    assert.ok(
      plan.steps.some((step) => step.mode === 'cable'),
      `la alternativa de ${JSON.stringify(origin)} debe incluir el transbordo al cable`
    );
    assert.ok(plan.steps.length <= SITP_ROUTING_OPTIONS.maxSteps);
  }
});

test('nunca afirma una hora de salida ni de llegada', () => {
  const plan = buildOfficialSitpAlternative({ originLocation: MEISSEN });
  assert.equal(plan.departureTime, undefined);
  assert.equal(plan.arrivalTime, undefined);
  assert.ok(plan.schedule.weekday, 'solo expone la ventana del operador, no un despacho');
});

test('los pasos van numerados sin saltos y nombran el transbordo', () => {
  const plan = buildOfficialSitpAlternative({ originLocation: MEISSEN });
  assert.ok(plan.steps.some((step) => step.mode === 'sitp'), 'debe incluir el tramo en SITP');
  for (const [index, step] of plan.steps.entries()) {
    assert.equal(step.order, index + 1);
  }
});

test('la geometrÃ­a encadena el corredor del SITP con el del cable', () => {
  const plan = buildOfficialSitpAlternative({
    originLocation: QUIBA,
    destinationLocation: PORTAL_TUNAL,
  });
  assert.ok(plan.sitpPath.length > 0, 'debe Separate el trazado del SITP del cable');
  if (plan.cableIntegration) {
    assert.ok(plan.cablePath.length > 1);
    assert.ok(plan.path.length > plan.cablePath.length);
  }
});

test('sin origen no inventa un plan', () => {
  assert.equal(buildOfficialSitpAlternative({ originLocation: null }), null);
  assert.equal(buildOfficialSitpAlternative({}), null);
});

test('expone los corredores que integran con el cable', () => {
  const cableRoutes = getSitpCableRoutes();
  assert.ok(cableRoutes.length > 0);
  for (const route of cableRoutes) {
    assert.ok(route.cableIntegration.stationName);
    assert.ok(route.cableIntegration.distanceKm <= 1);
  }
});

test('formatea distancias en metros y kilÃ³metros al estilo local', () => {
  assert.equal(formatKm(0.4), '400 m');
  assert.equal(formatKm(4.25), '4,3 km');
  assert.equal(formatKm(Number.NaN), '—');
});

test('con destino devuelve el corredor principal y sus alternativas', () => {
  const options = findSitpCorridorOptions(QUIBA, PORTAL_TUNAL);
  assert.ok(options, 'debe encontrar corredores para el par A â†’ B');
  assert.ok(options.primary, 'debe haber un corredor principal');
  assert.ok(options.routeIds.length > 0);
  assert.ok(options.routeIds.includes(options.primary.route.id));
  assert.ok(options.routeCodes.every((code) => typeof code === 'string'));
});

test('el corredor principal integra cerca del destino cuando existe', () => {
  const options = findSitpCorridorOptions(QUIBA, PORTAL_TUNAL);
  assert.ok(options.primary.route.cableIntegration, 'debe cerrar el viaje con el cable');
  assert.ok(Number.isFinite(options.primary.exitDistanceKm));
  assert.match(options.primary.matchReason, /sale a|integra con/);
});

test('sin destino no inventa una salida calculada', () => {
  const ranked = rankSitpCorridors(QUIBA, null);
  assert.ok(ranked.length > 0);
  for (const candidate of ranked) {
    assert.ok(Number.isNaN(candidate.exitDistanceKm), 'sin destino no hay distancia de salida');
  }
});

test('un origen sin cobertura oficial no devuelve corredores', () => {
  assert.equal(findSitpCorridorOptions(MOCHUELO_ALTO, PORTAL_TUNAL), null);
  assert.equal(findSitpCorridorOptions(null, PORTAL_TUNAL), null);
});

test('la salida medida depende del destino, no de un valor fijo', () => {
  // Desde Quiba solo califica el corredor 10-12, que integra en Mirador del
  // ParaÃ­so. Lo que debe cambiar con el destino es a quÃ© distancia queda la
  // estaciÃ³n donde ese corredor deja a la persona.
  const nearParaiso = findSitpCorridorOptions(QUIBA, MIRADOR_PARAISO);
  const nearTunal = findSitpCorridorOptions(QUIBA, PORTAL_TUNAL);
  assert.ok(nearParaiso && nearTunal);

  assert.ok(
    nearParaiso.primary.exitDistanceKm < nearTunal.primary.exitDistanceKm,
    `el destino en el ParaÃ­so debe quedar mÃ¡s cerca de la salida (${nearParaiso.primary.exitDistanceKm} vs ${nearTunal.primary.exitDistanceKm})`
  );
  assert.equal(nearParaiso.primary.route.cableIntegration.stationId, 'paraiso');
  assert.match(nearTunal.primary.matchReason, /sale a/);
});

test('las alternativas son un subconjunto del ranking y no incluyen el principal', () => {
  const options = findSitpCorridorOptions(QUIBA, PORTAL_TUNAL);
  const alternativeIds = options.alternatives.map((candidate) => candidate.route.id);
  assert.ok(!alternativeIds.includes(options.primary.route.id));
  for (const id of alternativeIds) assert.ok(options.routeIds.includes(id));
});

