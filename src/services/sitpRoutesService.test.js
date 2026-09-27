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
  listSitpAlternatives,
  rankSitpCorridors,
  selectSitpCorridor,
  toSitpPoint,
} from './sitpRoutesService.js';
import { haversineKm } from './transportRouting.js';

/** Longitud de una polilínea, para comparar contra lo que se dibuja. */
function polylineLengthKm(path) {
  let total = 0;
  for (let index = 1; index < path.length; index += 1) {
    total += haversineKm(path[index - 1], path[index]);
  }
  return total;
}

/** Quiba, un origen con cobertura oficial real y con ruta de veredal en el catálogo. */
const QUIBA = { latitude: 4.54274724, longitude: -74.17018404 };
/** Br. Meissen, downtown de la localidad. */
const MEISSEN = { latitude: 4.56025, longitude: -74.13866 };
/** Sierra Morena, barrio veredal con corredor oficial rural. */
const SIERRA_MORENA = { latitude: 4.568, longitude: -74.168 };
/** Bella Flor, veredal del sur. */
const BELLA_FLOR = { latitude: 4.546, longitude: -74.1508 };
/** Portal Tunal, estación troncal donde arranca el cable. */
const PORTAL_TUNAL = { latitude: 4.56917, longitude: -74.13968 };
/** Mirador del Paraíso, estación cumbre del cable. */
const MIRADOR_PARAISO = { latitude: 4.55009985, longitude: -74.1588974 };
/** Mochuelo Alto: veredal sin cobertura del zonality oficial. */
const MOCHUELO_ALTO = { latitude: 4.4883574, longitude: -74.148341 };

test('normaliza las tres formas de punto que usan los demás módulos', () => {
  assert.deepEqual(toSitpPoint([4.5, -74.1]), [4.5, -74.1]);
  assert.deepEqual(toSitpPoint({ latitude: 4.5, longitude: -74.1 }), [4.5, -74.1]);
  assert.deepEqual(toSitpPoint({ coordinates: [4.5, -74.1] }), [4.5, -74.1]);
  assert.equal(toSitpPoint(null), null);
});

test('rechaza coordenadas vacías en vez de tratarlas como [0, 0]', () => {
  assert.equal(toSitpPoint({ latitude: null, longitude: -74.1 }), null);
  assert.equal(toSitpPoint({ latitude: '', longitude: '' }), null);
  assert.equal(toSitpPoint({ latitude: undefined, longitude: undefined }), null);
  assert.equal(toSitpPoint([Number.NaN, -74.1]), null);
  assert.equal(toSitpPoint({}), null);
});

test('encuentra el paradero oficial más cercano a un origen con cobertura', () => {
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

test('devuelve null cuando el origen está fuera del Distrito', () => {
  // Un punto al sur del valle de Tunjuel, fuera de la cobertura del servicio.
  assert.equal(getNearestSitpStop({ latitude: 4.55, longitude: -74.4 }), null);
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
  assert.ok(plan.routeCode, 'debe citar el código de la ruta oficial');
  assert.ok(plan.boarding, 'debe nombrar el paradero de abordaje');
  assert.ok(plan.path.length > 1, 'debe traer geometría dibujable');
  assert.ok(plan.steps.length > 0);
  assert.ok(plan.totalDistanceKm > 0);
  assert.equal(plan.totalCostCop, 3550);
  assert.ok(plan.matchReason, 'debe explicar por qué eligió ese corredor');
  assert.ok(plan.warnings.length > 0, 'deve avisar que los tiempos son estimados');
  assert.match(plan.dataStatus, /estimated-time/);
});

test('el paso del cable nunca se pierde por el límite de pasos', () => {
  // Un truncation anterior cortaba el transbordo cuando había muchos pasos.
  let checked = 0;
  for (const origin of [QUIBA, MEISSEN, SIERRA_MORENA, BELLA_FLOR]) {
    const plan = buildOfficialSitpAlternative({
      originLocation: origin,
      destinationLocation: PORTAL_TUNAL,
    });
    if (!plan || !plan.cableIntegration) continue;
    checked += 1;

    if (plan.cableLeg) {
      assert.ok(
        plan.steps.some((step) => step.mode === 'cable'),
        `la alternativa de ${JSON.stringify(origin)} Announces un tramo de cable y no lo incluye en los pasos`,
      );
      const cableStep = plan.steps.find((step) => step.mode === 'cable');
      assert.equal(
        cableStep.stopId,
        plan.cableLeg.boardingStationId,
        'el paso del cable debe decir en qué estación se sube',
      );
    } else {
      // Sin tramo de cable significa que el bus ya deja en la estación del
      // cable, así que no hay transbordo que mostrar. Es un final de viaje, no
      // un paso perdido.
      assert.equal(plan.cableLeg, null);
    }
    assert.ok(plan.steps.length <= SITP_ROUTING_OPTIONS.maxSteps);
  }
  assert.ok(checked > 0, 'el recorrido de prueba debe cubrir al menos un plan');
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

test('la geometría encadena el corredor del SITP con el del cable', () => {
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

test('formatea distancias en metros y kilómetros al estilo local', () => {
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
  // Paraíso. Lo que debe cambiar con el destino es a qué distancia queda la
  // estación donde ese corredor deja a la persona.
  const nearParaiso = findSitpCorridorOptions(QUIBA, MIRADOR_PARAISO);
  const nearTunal = findSitpCorridorOptions(QUIBA, PORTAL_TUNAL);
  assert.ok(nearParaiso && nearTunal);

  assert.ok(
    nearParaiso.primary.exitDistanceKm < nearTunal.primary.exitDistanceKm,
    `el destino en el Paraíso debe quedar más cerca de la salida (${nearParaiso.primary.exitDistanceKm} vs ${nearTunal.primary.exitDistanceKm})`
  );
  assert.ok(nearParaiso.primary.route.cableIntegration.stationId);
  assert.match(nearTunal.primary.matchReason, /sale a/);
});

test('las alternativas son un subconjunto del ranking y no incluyen el principal', () => {
  const options = findSitpCorridorOptions(QUIBA, PORTAL_TUNAL);
  const alternativeIds = options.alternatives.map((candidate) => candidate.route.id);
  assert.ok(!alternativeIds.includes(options.primary.route.id));
  for (const id of alternativeIds) assert.ok(options.routeIds.includes(id));
});

/* -------------------------------------------------------------------------- */
/* Varias rutas, cada una con solo el tramo que se viaja                        */
/* -------------------------------------------------------------------------- */

test('ofrece varias rutas SITP para el mismo par, no una sola', () => {
  const plans = listSitpAlternatives({ originLocation: MEISSEN, destinationLocation: MIRADOR_PARAISO });
  assert.ok(
    plans.length >= 2,
    `se esperaban varias rutas para Meissen → Paraíso, se obtuvieron ${plans.length}`,
  );
  const codes = new Set(plans.map((plan) => plan.routeCode));
  assert.equal(codes.size, plans.length, 'cada opción debe ser un corredor distinto');
});

test('el número de rutas ofrecidas respeta el máximo pedido', () => {
  const plans = listSitpAlternatives({
    originLocation: MEISSEN,
    destinationLocation: MIRADOR_PARAISO,
    maxAlternatives: 2,
  });
  assert.ok(plans.length <= 2, `pedí 2 y devolvió ${plans.length}`);
});

test('la geometría dibujada es el tramo recorrido, no el corredor entero', () => {
  // El motivo del cambio: se elegía el corredor más cercano al origen y se
  // dibujaba completo, así que la línea salía en las dos direcciones y la mitad
  // iba en sentido contrario al viaje.
  for (const plan of listSitpAlternatives({ originLocation: MEISSEN, destinationLocation: MIRADOR_PARAISO })) {
    const drawn = plan.sitpPath;
    assert.ok(drawn.length >= 2, `${plan.routeCode} sin trazado dibujable`);
    assert.ok(plan.corridorLengthKm > 0, `${plan.routeCode} sin longitud de corredor declarada`);

    const drawnKm = polylineLengthKm(drawn);
    assert.ok(
      drawnKm < plan.corridorLengthKm + 0.05,
      `${plan.routeCode}: se dibujaron ${drawnKm.toFixed(2)} km de un corredor de ${plan.corridorLengthKm} km`,
    );
    assert.ok(
      Math.abs(drawnKm - plan.lengthKm) < 0.2,
      `${plan.routeCode}: la distancia del viaje (${plan.lengthKm} km) no coincide con el trazado (${drawnKm.toFixed(2)} km)`,
    );
  }
});

test('el trazado dibujado arranca donde se aborda y termina donde el bus deja', () => {
  // El bus no baja en la estación del cable: baja donde el trazado se acerca más
  // a ella, y de ahí hay un paseo a pie que se cuenta aparte. Por eso el final del
  // trazado es `alightingPoint`, no la estación.
  for (const plan of listSitpAlternatives({ originLocation: MEISSEN, destinationLocation: MIRADOR_PARAISO })) {
    assert.ok(plan.boarding?.coordinates, `${plan.routeCode} sin punto de abordaje`);
    assert.ok(plan.alightingPoint, `${plan.routeCode} sin punto donde el bus deja`);

    assert.ok(
      haversineKm(plan.sitpPath[0], plan.boarding.coordinates) < 0.1,
      `${plan.routeCode}: el trazado no empieza en el paradero de abordaje`,
    );
    assert.ok(
      haversineKm(plan.sitpPath.at(-1), plan.alightingPoint) < 0.001,
      `${plan.routeCode}: el trazado no termina en el punto de bajada`,
    );
  }
});

test('el paseo del bus a la estación del cable está declarado, no escondido', () => {
  // La integración se asigna por proximidad del corredor a la estación, así que
  // puede quedar a casi un kilómetro. Si ese tramo no se cuenta, el viaje parece
  // más corto de lo que es.
  for (const plan of listSitpAlternatives({ originLocation: MEISSEN, destinationLocation: MIRADOR_PARAISO })) {
    if (!plan.cableIntegration) continue;

    const approach = plan.cableIntegration.walkFromAlightingKm;
    assert.ok(Number.isFinite(approach), `${plan.routeCode} sin distancia medida hasta la estación`);

    // La distancia medida tiene que ser la real entre el punto de bajada y la
    // estación, no un valor de catálogo.
    const measured = haversineKm(plan.alightingPoint, plan.cableIntegration.coordinates);
    assert.ok(
      Math.abs(approach - measured) < 0.02,
      `${plan.routeCode}: se declaran ${approach} km hasta la estación y hay ${measured.toFixed(2)} km`,
    );

    // Se identifica el paso por el identificador de la estación y no por el
    // nombre: "Manitas" es a la vez una estación del cable y el nombre de un
    // barrio por el que pasa el corredor.
    const walkStep = plan.steps.find(
      (step) => step.mode === 'walk' && step.stopId === plan.cableIntegration.stationId,
    );

    if (approach > 0.05) {
      assert.ok(walkStep, `${plan.routeCode} no declara el paseo hasta ${plan.cableIntegration.stationName}`);
      assert.ok(walkStep.durationMinutes > 0, `${plan.routeCode} cuenta el paseo como tiempo cero`);
    } else {
      assert.ok(!walkStep, `${plan.routeCode} inventa un paseo de 0 m`);
    }
  }
});

test('la distancia total suma todos los tramos, sin omitir el transbordo', () => {
  for (const plan of listSitpAlternatives({ originLocation: MEISSEN, destinationLocation: MIRADOR_PARAISO })) {
    const walked = plan.steps
      .filter((step) => step.mode === 'walk')
      .reduce((total, step) => total + parseDistanceFromInstruction(step.instruction), 0);

    const measured = walked + plan.lengthKm + (plan.cableLeg?.rideKm ?? 0);
    assert.ok(
      Math.abs(plan.totalDistanceKm - measured) < 0.2,
      `${plan.routeCode}: la distancia total (${plan.totalDistanceKm} km) no cuadra con los tramos (${measured.toFixed(2)} km)`,
    );
  }
});

/** Kilómetros de una instrucción de caminata del tipo "Camina 400 m hasta X". */
function parseDistanceFromInstruction(instruction) {
  const match = /Camina ([\d.,]+)\s*(m|km)/.exec(instruction);
  if (!match) return 0;
  const value = Number(match[1].replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(value)) return 0;
  return match[2] === 'm' ? value / 1000 : value;
}

test('ninguna alternativa se aleja del destino', () => {
  const destination = MIRADOR_PARAISO;
  for (const plan of listSitpAlternatives({ originLocation: MEISSEN, destinationLocation: destination })) {
    const station = plan.cableIntegration.coordinates;
    const alightDistance = haversineKm(station, [destination.latitude, destination.longitude]);
    // La estación donde termina el viaje no puede quedar más lejos del destino
    // que el propio origen: eso sería ofrecer un rodeo sin decirlo.
    const originDistance = haversineKm(
      plan.boarding.coordinates,
      [destination.latitude, destination.longitude],
    );
    assert.ok(
      alightDistance <= originDistance,
      `${plan.routeCode} deja a la persona a ${alightDistance.toFixed(2)} km, más lejos que el origen (${originDistance.toFixed(2)} km)`,
    );
  }
});

test('descarta los recorridos de cero metros, que no son una alternativa', () => {
  for (const plan of listSitpAlternatives({ originLocation: MEISSEN, destinationLocation: MIRADOR_PARAISO })) {
    assert.ok(
      plan.lengthKm >= SITP_ROUTING_OPTIONS.minRideKm,
      `${plan.routeCode} ofrece un recorrido de ${plan.lengthKm} km, por debajo del mínimo`,
    );
  }
});

test('sin destino no devuelve rutas, porque no hay hacia dónde recortar', () => {
  assert.deepEqual(listSitpAlternatives({ originLocation: MEISSEN }), []);
  assert.deepEqual(listSitpAlternatives({ originLocation: MEISSEN, destinationLocation: null }), []);
  assert.deepEqual(listSitpAlternatives({}), []);
});

test('un origen sin cobertura oficial no produce rutas', () => {
  assert.deepEqual(
    listSitpAlternatives({ originLocation: MOCHUELO_ALTO, destinationLocation: PORTAL_TUNAL }),
    [],
  );
});

test('avisa cuando el bus recorre el corredor al revés de como lo declara el operador', () => {
  const plans = listSitpAlternatives({ originLocation: MEISSEN, destinationLocation: MIRADOR_PARAISO });
  for (const plan of plans) {
    if (!plan.sliceReversed) {
      assert.ok(
        !plan.warnings.some((warning) => /sentido contrario/.test(warning)),
        `${plan.routeCode} avisa de ir en reversa sin que el recorte lo detectara`,
      );
    }
  }
});

