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
import { CABLE_PATH, TRANSMICABLE_STATIONS } from '../data/routes.js';
import { VERIFIED_FACTS } from '../data/mobilitySources.js';
import { haversineKm, getNearestPointOnPolyline, joinPaths } from './transportRouting.js';

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
});

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
  const { minCorridorLengthKm, maxCorridorLengthKm, corridorSearchRadiusKm } = settings;
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

    const exitDistanceKm = destination ? distanceToCableExit(route, destination) : Number.NaN;

    const candidate = {
      route,
      corridorDistanceKm,
      boardingStop: boarding.stop,
      boardingDistanceKm: boarding.walkKm,
      exitDistanceKm,
    };
    candidates.push({
      ...candidate,
      score: scoreRouteCandidate(candidate) + destinationScore(candidate, destination),
      matchReason: describeMatch(candidate, destination),
    });
  }

  return candidates.sort((left, right) => right.score - left.score);
}

/** Distancia del destino a la estación donde el corredor integra con el cable. */
function distanceToCableExit(route, destination) {
  if (!route.cableIntegration) return Number.NaN;
  const station = stationById(route.cableIntegration.stationId);
  if (!station) return Number.NaN;
  return haversineKm(station.coordinates, destination);
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
  return TRANSMICABLE_STATIONS.find((station) => station.id === stationId) ?? null;
}

function buildSteps({ boardingStop, walkingKm, route, ridingKm, alightingStop, cableKm }) {
  const { estimatedSpeedKmh, walkSpeedKmh } = SITP_ROUTING_OPTIONS;
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

  if (cableKm > 0) {
    steps.push({
      mode: CABLE_MODE,
      instruction: 'Toma TransMiCable hasta el destino',
      detail: 'Integración verificada con el corredor del SITP',
      durationMinutes: estimateMinutes(cableKm, estimatedSpeedKmh),
      estimatedCostCop: null,
      source: 'transmilenio_2026',
    });
  }

  return steps;
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

  const { route, boardingStop, boardingDistanceKm, matchReason } = selection;
  const cableStation = route.cableIntegration ? stationById(route.cableIntegration.stationId) : null;
  const alightingStop = route.alightingStop
    ? (SITP_STOPS_BY_ID[route.alightingStop.stopId] ?? null)
    : null;

  const walkingKm = boardingDistanceKm;
  const ridingKm = route.lengthKm ?? 0;
  const cableKm = cableStation ? pathLengthKm(CABLE_PATH) : 0;
  const totalKm = walkingKm + ridingKm + cableKm;

  const steps = buildSteps({
    boardingStop,
    walkingKm,
    route,
    ridingKm,
    alightingStop,
    cableKm,
  }).map((step, index) => ({ ...step, order: index + 1 }));

  const warnings = [...SITP_DATA_BOUNDARIES];
  if (!cableStation) {
    warnings.push('Este corredor no integra con una estación TransMiCable; la conexión se resuelve solo en el SITP.');
  }

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
    cableIntegration: route.cableIntegration
      ? {
          stationId: route.cableIntegration.stationId,
          stationName: route.cableIntegration.stationName,
          distanceKm: route.cableIntegration.distanceKm,
          coordinates: cableStation ? [...cableStation.coordinates] : null,
        }
      : null,
    path: joinPaths(...route.paths, cableStation ? CABLE_PATH : []),
    sitpPath: route.paths.map((path) => path.map((point) => [...point])),
    cablePath: cableStation ? CABLE_PATH.map((point) => [...point]) : [],
    steps,
    totalCostCop: VERIFIED_FACTS.sitpFareCop,
    costFormatted: `$${VERIFIED_FACTS.sitpFareCop.toLocaleString('es-CO')} COP`,
    warnings,
    disclaimer: 'Trazado oficial; tiempos estimados por distancia.',
  };
}
