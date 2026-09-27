/**
 * Motor de la alternativa oficial "SITP → Portal Tunal → TransMiCable".
 *
 * A diferencia de `transportRouting.js`, que ordena `cable | veredal | sitp` sobre
 * fixtures de demostración, aquí se trabaja con el extracto real del SITP: 176
 * corredores operativos de Ciudad Bolívar y 593 paraderos, con trazado, longitud,
 * tipo de bus, operador y ventana de horario publicados por Transmilenio.
 *
 * Lo que este módulo NO puede afirmar, y por eso lo marca en cada resultado:
 *   - una hora de salida o de llegada (el extracto no trae `stop_times`);
 *   - qué rutas sirven una parada dada (se infiere por cercanía al trazado);
 *   - la duración real del viaje (se estima con una velocidad media explícita).
 */

import {
  SITP_CABLE_ROUTE_IDS,
  SITP_RURAL_ROUTE_IDS,
  SITP_ROUTES,
  SITP_ROUTES_BY_ID,
  SITP_STOPS,
  SITP_STOPS_BY_ID,
  SITP_ROUTE_DATA_VERSION,
  SITP_DATA_BOUNDARIES,
} from '../data/sitpIndex.js';
import { CABLE_LINE_PATH, CABLE_STATIONS_BY_ID } from '../data/cableIndex.js';
import { VERIFIED_FACTS } from '../data/mobilitySources.js';
import { haversineKm, getNearestPointOnPolyline, joinPaths } from './transportRouting.js';
import { doesCorridorApproachDestination, sliceCorridorPath } from './corridorPath.js';

export const SITP_ROUTING_OPTIONS = Object.freeze({
  /** Distancia máxima al origen para considerarla cubierta por el SITP. */
  originSearchRadiusKm: 0.8,
  /** Distancia máxima al trazado de una ruta para proponerla. */
  corridorSearchRadiusKm: 0.5,
  /** Cuántos paraderos se evalúan como candidatos de abordaje. */
  maxStopCandidates: 6,
  /** Cuántos pasos se muestran como máximo. */
  maxSteps: 4,
  /**
   * Velocidad media asumida para estimar el tiempo de un corredor SITP.
   * Es una hipótesis, no un dato de Transmilenio, por eso viaja con la
   * estimación y se muestra como tal en la interfaz.
   */
  estimatedSpeedKmh: 20,
  /** Velocidad asumida para el tramo a pie. */
  walkSpeedKmh: 4.5,
  /** Longitud mínima para que un corredor valga como alternativa. */
  minCorridorLengthKm: 2,
  /** Longitud máxima: un corredor de 50 km no es una alternativa de barrio. */
  maxCorridorLengthKm: 20,
  /** Recorrido mínimo en bus una vez recortado al tramo que se viaja. */
  minRideKm: 0.8,
  /**
   * Recorrido mínimo en cable para que el transbordo valga la pena. Por debajo de
   * esto, pagar y esperar el teleférico cuesta más de lo que ahorra.
   */
  minCableRideKm: 0.8,
  /**
   * Velocidad media asumida del TransMiCable. Es una estimación: el operador
   * publica la línea y sus estaciones, pero no un tiempo de recorrido por tramo.
   */
  cableSpeedKmh: 12,
});

/**
 * Radio caminable hasta una estación del cable. Comparte el valor con
 * `cableService.js` porque es la misma decisión: hasta dónde tiene sentido ir a
 * pie para tomar el teleférico.
 */
const CABLE_ROUTING_OPTIONS = Object.freeze({ walkToStationRadiusKm: 1.2 });

const WALK_MODE = 'walk';
const SITP_MODE = 'sitp';
const CABLE_MODE = 'cable';

/* -------------------------------------------------------------------------- */
/* Utilidades de punto                                                        */
/* -------------------------------------------------------------------------- */

function isUsableNumber(value) {
  // `Number(null)` y `Number('')` valen 0, así que un origen vacío se convertiría
  // en el punto [0, 0] en vez de rechazarse.
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'boolean') return false;
  return Number.isFinite(Number(value));
}

function validCoordinate(value) {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    isUsableNumber(value[0]) &&
    isUsableNumber(value[1])
  );
}

/** Acepta [lat, lng], {latitude, longitude} o {coordinates: [lat, lng]}. */
export function toSitpPoint(value) {
  if (!value) return null;
  if (validCoordinate(value)) return [Number(value[0]), Number(value[1])];
  if (typeof value === 'object') {
    if (isUsableNumber(value.latitude) && isUsableNumber(value.longitude)) {
      return [Number(value.latitude), Number(value.longitude)];
    }
    if (validCoordinate(value.coordinates)) return [Number(value.coordinates[0]), Number(value.coordinates[1])];
  }
  return null;
}

function stopPoint(stop) {
  return [stop.latitude, stop.longitude];
}

function pathLengthKm(path) {
  let total = 0;
  for (let index = 1; index < path.length; index += 1) {
    total += haversineKm(path[index - 1], path[index]);
  }
  return total;
}

function estimateMinutes(distanceKm, speedKmh) {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0;
  return Math.max(1, Math.round((distanceKm / speedKmh) * 60));
}

export function formatKm(value) {
  if (!Number.isFinite(value)) return '—';
  if (value < 1) return `${Math.round(value * 1000)} m`;
  return `${value.toFixed(1).replace('.', ',')} km`;
}

/* -------------------------------------------------------------------------- */
/* Consultas sobre paraderos                                                   */
/* -------------------------------------------------------------------------- */

/** Paraderos oficiales alrededor de un punto, del más cercano al más lejano. */
export function getSitpStopsNear(point, options = {}) {
  const { originSearchRadiusKm, maxStopCandidates } = { ...SITP_ROUTING_OPTIONS, ...options };
  const origin = toSitpPoint(point);
  if (!origin) return [];

  return SITP_STOPS.map((stop) => ({ stop, distanceKm: haversineKm(origin, stopPoint(stop)) }))
    .filter((entry) => entry.distanceKm <= originSearchRadiusKm)
    .sort((left, right) => left.distanceKm - right.distanceKm)
    .slice(0, maxStopCandidates);
}

/** Paradero oficial más cercano a un punto, o `null` si excede el radio. */
export function getNearestSitpStop(point, options = {}) {
  return getSitpStopsNear(point, { ...options, maxStopCandidates: 1 })[0] ?? null;
}

/* -------------------------------------------------------------------------- */
/* Consultas sobre rutas                                                       */
/* -------------------------------------------------------------------------- */

function routeDistanceToPoint(route, point) {
  let best = Infinity;
  for (const path of route.paths) {
    const nearest = getNearestPointOnPolyline(point, path);
    if (nearest && nearest.distanceKm < best) best = nearest.distanceKm;
  }
  return best;
}

/** Corredores cuyo trazado pasa cerca de un punto. */
export function getSitpRoutesNear(point, options = {}) {
  const { corridorSearchRadiusKm } = { ...SITP_ROUTING_OPTIONS, ...options };
  const origin = toSitpPoint(point);
  if (!origin) return [];

  return SITP_ROUTES.map((route) => ({ route, distanceKm: routeDistanceToPoint(route, origin) }))
    .filter((candidate) => candidate.distanceKm <= corridorSearchRadiusKm)
    .sort((left, right) => left.distanceKm - right.distanceKm);
}

export function getSitpCableRoutes() {
  return SITP_CABLE_ROUTE_IDS.map((id) => SITP_ROUTES_BY_ID[id]).filter(Boolean);
}

export function getSitpRuralRoutes() {
  return SITP_RURAL_ROUTE_IDS.map((id) => SITP_ROUTES_BY_ID[id]).filter(Boolean);
}

export function getSitpRouteById(routeId) {
  return SITP_ROUTES_BY_ID[routeId] ?? null;
}

/* -------------------------------------------------------------------------- */
/* Selección del corredor                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Puntúa un corredor como candidato a alternativa.
 *
 * Se prioriza, en este orden:
 *   1. que tenga una estación TransMiCable cerca: es lo que el resto del
 *      sistema de la app sabe completar;
 *   2. que sea una ruta alimentadora o troncal, cuya función es precisamente
 *      llevar a un portal;
 *   3. que sea un corredor de barrio y no un viaje entre ciudades;
 *   4. que el paradero de abordaje no quede lejos del origen.
 */
function scoreRouteCandidate(candidate) {
  const { route, boardingDistanceKm, corridorDistanceKm } = candidate;
  let score = 0;

  if (route.cableIntegration) {
    score += 1000 - Math.min(400, route.cableIntegration.distanceKm * 200);
  }
  if (route.serviceType === 'Alimentación') score += 380;
  if (route.serviceType === 'Troncal' || route.serviceType === 'Dual') score += 300;
  if (route.serviceType === 'Especial') score += 140;
  if (route.busType === 'Biarticulado' || route.busType === 'Articulado') score += 60;
  if (route.isRural) score -= 120;

  const lengthKm = route.lengthKm ?? 0;
  score += Math.max(0, 240 - lengthKm * 10);
  score += Math.max(0, 140 - boardingDistanceKm * 160);
  score += Math.max(0, 60 - corridorDistanceKm * 120);

  return score;
}

function describeMatch(candidate, destination) {
  const reasons = [];
  if (candidate.route.cableIntegration) {
    reasons.push(`integra con ${candidate.route.cableIntegration.stationName}`);
  }
  if (destination && Number.isFinite(candidate.exitDistanceKm)) {
    reasons.push(`sale a ${formatKm(candidate.exitDistanceKm)} del destino`);
  }
  if (candidate.route.serviceType === 'Alimentación') reasons.push('es una ruta alimentadora');
  if (candidate.boardingStop) reasons.push(`el paradero más cercano es ${candidate.boardingStop.name}`);
  return reasons.join('; ');
}

/**
 * Ordena los corredores oficiales que cubren un origen, de mejor a peor.
 *
 * Cuando hay destino, se suma un término que mide how lejos queda del destino la
 * estación donde el corredor integra con el cable. Sin destino, el ranking es el
 * de "cuál corredor oficial me sirve desde aquí".
 */
export function rankSitpCorridors(originLocation, destinationLocation = null, options = {}) {
  const settings = { ...SITP_ROUTING_OPTIONS, ...options };
  const { minCorridorLengthKm, maxCorridorLengthKm, corridorSearchRadiusKm, minRideKm } = settings;
  const origin = toSitpPoint(originLocation);
  const destination = toSitpPoint(destinationLocation);
  if (!origin) return [];

  const nearbyStops = getSitpStopsNear(origin, settings);
  if (nearbyStops.length === 0) return [];

  const candidates = [];
  for (const route of SITP_ROUTES) {
    const lengthKm = route.lengthKm ?? 0;
    if (lengthKm < minCorridorLengthKm || lengthKm > maxCorridorLengthKm) continue;
    if (!route.boardingStop) continue;

    const corridorDistanceKm = routeDistanceToPoint(route, origin);
    if (corridorDistanceKm > corridorSearchRadiusKm) continue;

    // El paradero de abordaje debe ser alcanzable desde el origen.
    const boarding = nearbyStops
      .map((entry) => ({ ...entry, walkKm: haversineKm(origin, stopPoint(entry.stop)) }))
      .sort((left, right) => left.walkKm - right.walkKm)[0];
    if (!boarding) continue;

    const station = route.cableIntegration ? stationById(route.cableIntegration.stationId) : null;
    const exitDistanceKm = station && destination ? haversineKm(station.coordinates, destination) : Number.NaN;

    const candidate = {
      route,
      corridorDistanceKm,
      boardingStop: boarding.stop,
      boardingDistanceKm: boarding.walkKm,
      exitDistanceKm,
      cableStation: station,
    };

    /**
     * Con destino, un corredor solo vale si el tramo que se recorre de verdad
     * acerca. Antes se elegía el corredor más cercano al origen y se dibujaba
     * entero, así que la línea salía en las dos direcciones y la mitad iba en
     * sentido contrario al viaje. El recorte se hace sobre la geometría real.
     */
    if (destination && station) {
      const slice = sliceCorridorPath(route.paths, stopPoint(boarding.stop), station.coordinates);
      if (!slice) continue;
      // Un recorrido de cero metros no es una alternativa: significa que el
      // paradero y la estación caen en el mismo segmento del trazado, así que el
      // bus no avanza hacia ninguna parte.
      if (slice.distanceKm < minRideKm) continue;
      if (!doesCorridorApproachDestination(slice.path, origin, destination)) continue;
      candidate.slice = slice;
      candidate.rideKm = slice.distanceKm;
      // El destino viaja con el candidato porque hace falta para medir el tramo en
      // cable que cierra el viaje.
      candidate.destination = destination;
    } else if (destination) {
      continue;
    } else {
      candidate.slice = null;
      candidate.rideKm = lengthKm;
    }

    candidates.push({
      ...candidate,
      score: scoreRouteCandidate(candidate) + destinationScore(candidate, destination),
      matchReason: describeMatch(candidate, destination),
    });
  }

  return candidates.sort((left, right) => right.score - left.score);
}

/** Bonus o castigo por lo bien que el corredor aterriza cerca del destino. */
function destinationScore(candidate, destination) {
  if (!destination) return 0;
  if (!Number.isFinite(candidate.exitDistanceKm)) {
    // Sin integración con el cable no hay forma de cerrar el viaje con este dato.
    return -260;
  }
  return Math.max(0, 260 - candidate.exitDistanceKm * 90);
}

/**
 * Elige el corredor oficial que mejor conecta el origen con el cable.
 *
 * La búsqueda está anclada a paraderos reales, no solo al trazado: si el origen
 * no tiene un paradero oficial cerca, no hay alternativa oficial que proponer.
 * Un corredor de 48 km que pasa por el barrio sin parada en él no es una opción
 * defendible, y el veredal es justo el hueco que cubre la van.
 */
export function selectSitpCorridor(originLocation, options = {}) {
  const best = rankSitpCorridors(originLocation, null, options)[0];
  return best ?? null;
}

/**
 * Corredores que conectan un origen con un destino, con sus alternativas.
 *
 * Es la consulta que usa la capa del mapa: con destino seleccionado se muestran
 * solo estos corredores; sin destino, la capa muestra el catálogo completo.
 */
export function findSitpCorridorOptions(originLocation, destinationLocation, options = {}) {
  const { maxAlternatives = 4 } = options;
  const ranked = rankSitpCorridors(originLocation, destinationLocation, options);
  if (ranked.length === 0) return null;

  const [primary, ...rest] = ranked;
  return {
    primary,
    alternatives: rest.slice(0, maxAlternatives),
    /** Códigos de todos los corredores que sirven a este par A → B. */
    routeCodes: ranked.map((candidate) => candidate.route.code),
    routeIds: ranked.map((candidate) => candidate.route.id),
  };
}

/* -------------------------------------------------------------------------- */
/* Construcción del plan                                                      */
/* -------------------------------------------------------------------------- */

function stationById(stationId) {
  const station = CABLE_STATIONS_BY_ID[stationId];
  if (!station) return null;
  return { id: station.id, name: station.name, coordinates: station.coordinates };
}

/**
 * Tramo en TransMiCable para cerrar el viaje después del corredor SITP.
 *
 * Se mide sobre la línea entre la estación donde se sube y la más cercana al
 * destino. Si el recorrido en cable no compensa, se devuelve `null` en vez de
 * encadenar un transbordo que costaría más de lo que ahorra.
 */
function buildCableLeg({ boardingStation, destinationLocation, minRideKm }) {
  if (!boardingStation) return null;
  const destination = toSitpPoint(destinationLocation);
  if (!destination) return null;

  let alighting = null;
  for (const station of Object.values(CABLE_STATIONS_BY_ID)) {
    const walkKm = haversineKm(station.coordinates, destination);
    if (walkKm > CABLE_ROUTING_OPTIONS.walkToStationRadiusKm) continue;
    if (!alighting || walkKm < alighting.walkKm) alighting = { station, walkKm };
  }
  if (!alighting || alighting.station.id === boardingStation.id) return null;

  const slice = sliceCorridorPath(
    [CABLE_LINE_PATH],
    boardingStation.coordinates,
    alighting.station.coordinates,
  );
  if (!slice || slice.distanceKm < minRideKm) return null;

  return {
    boarding: boardingStation,
    alighting: alighting.station,
    rideKm: slice.distanceKm,
    walkKm: alighting.walkKm,
    path: slice.path,
  };
}

function buildSteps({
  boardingStop,
  walkingKm,
  route,
  ridingKm,
  alightingStop,
  alightingPoint,
  cableStation,
  cableApproachKm,
  cableLeg,
  finalWalkKm,
}) {
  const { estimatedSpeedKmh, walkSpeedKmh, cableSpeedKmh } = SITP_ROUTING_OPTIONS;
  const steps = [];

  if (boardingStop && walkingKm > 0.02) {
    steps.push({
      mode: WALK_MODE,
      instruction: `Camina ${formatKm(walkingKm)} hasta ${boardingStop.name}`,
      detail: boardingStop.street ? `Paradero en ${boardingStop.street}` : 'Paradero oficial del SITP',
      durationMinutes: estimateMinutes(walkingKm, walkSpeedKmh),
      estimatedCostCop: 0,
      stopId: boardingStop.id,
      source: 'sitp_stops_2026',
    });
  }

  steps.push({
    mode: SITP_MODE,
    instruction: `Toma la ruta ${route.code} hacia ${route.destination}`,
    detail: [
      route.serviceType,
      route.busType,
      route.isRural ? 'corredor rural' : null,
      route.operator ? `operador ${route.operator}` : null,
    ]
      .filter(Boolean)
      .join(' · '),
    durationMinutes: estimateMinutes(ridingKm, estimatedSpeedKmh),
    estimatedCostCop: VERIFIED_FACTS.sitpFareCop,
    routeCode: route.code,
    source: 'sitp_services_2026',
  });

  if (alightingStop) {
    steps.push({
      mode: WALK_MODE,
      instruction: `Baja en ${alightingStop.name}`,
      detail: alightingStop.street ? `Paradero en ${alightingStop.street}` : 'Paradero oficial del SITP',
      durationMinutes: 0,
      estimatedCostCop: null,
      stopId: alightingStop.id,
      source: 'sitp_stops_2026',
    });
  }

  // El bus deja a la persona donde el trazado se acerca más a la estación del
  // cable, no en la estación: si ese paseo no se cuenta, el viaje parece más corto
  // de lo que es.
  if (cableStation && cableApproachKm > 0.05) {
    steps.push({
      mode: WALK_MODE,
      instruction: `Camina ${formatKm(cableApproachKm)} hasta ${cableStation.name}`,
      detail: alightingPoint
        ? 'Desde donde el bus te deja; el corredor pasa cerca de la estación, no frente a ella'
        : 'Desde el punto donde termina la ruta',
      durationMinutes: estimateMinutes(cableApproachKm, walkSpeedKmh),
      estimatedCostCop: 0,
      stopId: cableStation.id,
      source: 'cable_stations_2026',
    });
  }

  if (cableLeg) {
    steps.push({
      mode: CABLE_MODE,
      instruction: `Sube al TransMiCable hacia ${cableLeg.alighting.name}`,
      detail: `${cableLeg.boarding.name} → ${cableLeg.alighting.name}`,
      durationMinutes: estimateMinutes(cableLeg.rideKm, cableSpeedKmh),
      estimatedCostCop: null,
      stopId: cableLeg.boarding.id,
      source: 'cable_segments_2026',
    });

    if (finalWalkKm > 0.05) {
      steps.push({
        mode: WALK_MODE,
        instruction: `Camina ${formatKm(finalWalkKm)} hasta tu destino`,
        detail: `Desde ${cableLeg.alighting.name}`,
        durationMinutes: estimateMinutes(finalWalkKm, walkSpeedKmh),
        estimatedCostCop: 0,
        source: 'planner_estimate',
      });
    }
  }

  return steps;
}

/**
 * Alternativas SITP para un par A → B, en orden de puntaje.
 *
 * Devuelve varias porque una persona puede preferir la alimentadora corta aunque
 * el motor puntee otra: son todas corredores que llevan hacia el destino, con la
 * geometría ya recortada al tramo que se recorre.
 */
export function listSitpAlternatives({
  originLocation,
  destinationLocation = null,
  maxAlternatives = 3,
  options = {},
} = {}) {
  const settings = { ...SITP_ROUTING_OPTIONS, ...options };
  const origin = toSitpPoint(originLocation);
  if (!origin || !destinationLocation) return [];

  return rankSitpCorridors(origin, destinationLocation, settings)
    .slice(0, maxAlternatives)
    .map((candidate) => buildOfficialSitpAlternativeFromCandidate(candidate, settings))
    .filter(Boolean);
}

/** Construye el plan completo a partir de un corredor ya elegido. */
export function buildOfficialSitpAlternativeFromCandidate(selection, settings = SITP_ROUTING_OPTIONS) {
  if (!selection) return null;
  return buildPlanFromSelection(selection, settings);
}

/**
 * Construye la alternativa oficial completa para un origen y un destino.
 *
 * Devuelve `null` cuando ningún corredor oficial cubre el origen, de modo que
 * quien llame pueda seguir mostrando su resultado anterior en lugar de
 * inventar uno.
 */
export function buildOfficialSitpAlternative({
  originLocation,
  destinationLocation = null,
  options = {},
} = {}) {
  const settings = { ...SITP_ROUTING_OPTIONS, ...options };
  const origin = toSitpPoint(originLocation);
  if (!origin) return null;

  // Con destino, el corredor se elige teniendo en cuenta dónde aterriza el cable;
  // sin destino, se elige el mejor corredor disponible desde el origen.
  const selection = rankSitpCorridors(origin, destinationLocation, settings)[0];
  if (!selection) return null;

  return buildPlanFromSelection(selection, settings);
}

/** Ensambla el plan publicable a partir de un corredor candidato. */
function buildPlanFromSelection(selection, settings) {
  const { route, boardingStop, boardingDistanceKm, matchReason, slice, rideKm } = selection;
  const cableStation = route.cableIntegration ? stationById(route.cableIntegration.stationId) : null;
  const alightingStop = route.alightingStop
    ? (SITP_STOPS_BY_ID[route.alightingStop.stopId] ?? null)
    : null;

  const walkingKm = boardingDistanceKm;
  const ridingKm = rideKm ?? route.lengthKm ?? 0;

  /**
   * El bus no baja en la estación del cable: baja donde el trazado se acerca más
   * a ella, y de ahí hay un paseo a pie. Medir ese paseo es lo que separa una
   * integración real de una que solo existe porque el corredor pasa cerca.
   */
  const alightingPoint = slice ? slice.path.at(-1) : null;
  const cableApproachKm = cableStation && alightingPoint
    ? haversineKm(alightingPoint, cableStation.coordinates)
    : 0;

  /**
   * Recorrido en cable medido sobre la línea, entre la estación donde se sube y
   * la más cercana al destino. Antes se usaba la longitud completa de la línea,
   * así que un viaje de una estación se cobraba como si fuera de punta a punta.
   */
  const cableLeg = buildCableLeg({
    boardingStation: cableStation,
    destinationLocation: selection.destination,
    minRideKm: settings.minCableRideKm,
  });
  const finalWalkKm = cableLeg ? cableLeg.walkKm : 0;

  const totalKm = walkingKm + ridingKm + cableApproachKm + (cableLeg?.rideKm ?? 0) + finalWalkKm;

  const steps = buildSteps({
    boardingStop,
    walkingKm,
    route,
    ridingKm,
    alightingStop,
    alightingPoint,
    cableStation,
    cableApproachKm,
    cableLeg,
    finalWalkKm,
  }).map((step, index) => ({ ...step, order: index + 1 }));

  const warnings = [...SITP_DATA_BOUNDARIES];
  if (!cableStation) {
    warnings.push('Este corredor no integra con una estación TransMiCable; la conexión se resuelve solo en el SITP.');
  }
  if (cableStation && cableApproachKm > 0.5) {
    warnings.push(
      `El bus pasa a ${formatKm(cableApproachKm)} de ${cableStation.name}, no frente a ella: ese tramo se cuenta como caminata.`,
    );
  }
  if (cableStation && !cableLeg) {
    warnings.push(
      'No se encontró una estación del cable más cercana al destino que compense el transbordo; el viaje se cierra en el SITP.',
    );
  }
  if (slice?.reversed) {
    warnings.push(
      'El bus recorre este corredor en sentido contrario al que declara el operador; la línea dibujada sigue el sentido real de la marcha.',
    );
  }

  // El recorte de `slice` puede ir en contra del orden en que el operador declara
  // el corredor. Se expone para que la interfaz pueda decirlo y no tener que
  // deducirlo de la geometría.
  const sliceReversed = Boolean(slice?.reversed);

  return {
    id: `sitp_${route.code}`,
    kind: 'official-sitp',
    dataVersion: SITP_ROUTE_DATA_VERSION,
    dataStatus: 'official-geometry-estimated-time',
    title: `Ruta oficial ${route.code}`,
    corridorLabel: route.corridorLabel,
    routeCode: route.code,
    routeId: route.id,
    serviceType: route.serviceType,
    busType: route.busType,
    operator: route.operator,
    isRural: route.isRural,
    daysLabel: route.daysLabel,
    scheduleType: route.scheduleType,
    schedule: route.schedule,
    lengthKm: Number(ridingKm.toFixed(2)),
    /**
     * Longitud del corredor completo, para poder decir "de 14 km solo se
     * recorren 3" en lugar de presentar el tramo como si fuera todo el corredor.
     */
    corridorLengthKm: route.lengthKm ?? null,
    totalDistanceKm: Number(totalKm.toFixed(2)),
    matchReason,
    estimatedMinutes: steps.reduce((total, step) => total + step.durationMinutes, 0),
    boarding: boardingStop
      ? {
          stopId: boardingStop.id,
          name: boardingStop.name,
          street: boardingStop.street,
          coordinates: stopPoint(boardingStop),
          walkKm: Number(walkingKm.toFixed(2)),
        }
      : null,
    alighting: alightingStop
      ? {
          stopId: alightingStop.id,
          name: alightingStop.name,
          street: alightingStop.street,
          coordinates: stopPoint(alightingStop),
        }
      : null,
    /** Punto exacto del trazado donde termina el tramo en bus. */
    alightingPoint: alightingPoint ? [...alightingPoint] : null,
    cableIntegration: route.cableIntegration
      ? {
          stationId: route.cableIntegration.stationId,
          stationName: route.cableIntegration.stationName,
          distanceKm: route.cableIntegration.distanceKm,
          walkFromAlightingKm: Number(cableApproachKm.toFixed(2)),
          coordinates: cableStation ? [...cableStation.coordinates] : null,
        }
      : null,
    cableLeg: cableLeg
      ? {
          boardingStationName: cableLeg.boarding.name,
          boardingStationId: cableLeg.boarding.id,
          alightingStationName: cableLeg.alighting.name,
          alightingStationId: cableLeg.alighting.id,
          rideKm: Number(cableLeg.rideKm.toFixed(2)),
          walkKm: Number(cableLeg.walkKm.toFixed(2)),
          path: cableLeg.path,
        }
      : null,
    // La geometría es el tramo realmente recorrido: del paradero de abordaje al
    // punto donde el trazado se acerca a la estación del cable, más el tramo de
    // cable que se recorre. Dibujar el corredor completo hacía que la línea
    // saliera en las dos direcciones.
    sliceReversed,
    sitpGeometry: slice ? slice.path : route.paths.flat(),
    path: joinPaths(
      slice ? slice.path : route.paths.flat(),
      cableLeg ? cableLeg.path : [],
    ),
    sitpPath: slice ? slice.path : route.paths.flat(),
    cablePath: cableLeg ? cableLeg.path.map((point) => [...point]) : [],
    steps,
    totalCostCop: VERIFIED_FACTS.sitpFareCop,
    costFormatted: `$${VERIFIED_FACTS.sitpFareCop.toLocaleString('es-CO')} COP`,
    warnings,
    disclaimer: 'Trazado oficial; tiempos estimados por distancia.',
  };
}
