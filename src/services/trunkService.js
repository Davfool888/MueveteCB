/**
 * Alternativa troncal: caminar a una estación real y viajar en bus articulado.
 *
 * Es la tercera opción frente a la van veredal y al SITP zonal, y es la única
 * que puede apoyarse en capacidad y accesibilidad verificadas por el inventario
 * de Transmilenio: tipo de estación, pax por articulado y accesos desde la calle,
 * por deprimido o por puente.
 *
 * Lo que no puede afirmar, igual que el resto del motor:
 *   - cada cuántos minutos pasa un bus (no hay `stop_times`);
 *   - dónde baja exactamente la persona, porque el destino puede quedar a cientos
 *     de metros de la estación más próxima. Por eso la salida se expresa como
 *     "baja en X y camina Y" y no como un punto exacto.
 */

import {
  TRUNK_BOARDABLE_STATIONS,
  TRUNK_CORRIDORS_BY_ID,
  TRUNK_DATA_BOUNDARIES,
  TRUNK_DATA_VERSION,
  TRUNK_STATIONS_BY_ID,
} from '../data/trunkIndex.js';
import { VERIFIED_FACTS } from '../data/mobilitySources.js';
import { haversineKm, getNearestPointOnPolyline, joinPaths } from './transportRouting.js';
import { toSitpPoint, formatKm } from './sitpRoutesService.js';

export const TRUNK_ROUTING_OPTIONS = Object.freeze({
  /** Distancia máxima al origen para tomar el bus a pie. */
  walkToStationRadiusKm: 1.4,
  /** Distancia máxima al destino para bajar a pie desde la estación. */
  walkFromStationRadiusKm: 1.6,
  /**
   * Recorrido mínimo del bus para que el viaje valga la pena.
   *
   * 800 m es el umbral: por debajo, caminar cuesta unos 11 minutos y el bus
   * añade la espera en el portal. No puede subirse más porque el corredor TZ014,
   * el que conecta con Portal Tunal, mide solo 1,76 km.
   */
  minRideKm: 0.8,
  /** Velocidad asumida en un bus troncal, ya con congestión. */
  rideSpeedKmh: 17,
  /** Velocidad asumida para los tramos a pie. */
  walkSpeedKmh: 4.5,
  /** Máximo de estaciones candidatas a comparar. */
  maxCandidates: 12,
});

const WALK_MODE = 'walk';
const TRUNK_MODE = 'trunk';

function estimateMinutes(distanceKm, speedKmh) {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0;
  return Math.max(1, Math.round((distanceKm / speedKmh) * 60));
}

function pointOfStation(station) {
  return [station.latitude, station.longitude];
}

/** Distancia entre dos puntos del trazado, medida sobre el propio trazado. */
function pathSliceLengthKm(path, fromIndex, fromT, toIndex, toT) {
  const anchorA = Math.max(0, Math.min(path.length - 1, fromIndex));
  const anchorB = Math.max(0, Math.min(path.length - 1, toIndex));

  const partial = (anchor, t) => {
    const next = Math.min(path.length - 1, anchor + 1);
    const a = path[anchor];
    const b = path[next];
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };

  const from = partial(anchorA, Math.min(1, Math.max(0, fromT)));
  const to = partial(anchorB, Math.min(1, Math.max(0, toT)));

  const ordered = anchorA <= anchorB ? [from, to] : [to, from];
  let total = 0;
  for (let index = 1; index < ordered.length; index += 1) {
    total += haversineKm(ordered[index - 1], ordered[index]);
  }
  return total;
}

/**
 * Recorrido del bus entre dos estaciones, medido sobre el trazado del corredor.
 *
 * Medir en línea recta daría un valor que el bus nunca recorre, y esa clase de
 * cifra es justo la que este proyecto evita publicar.
 */
function rideLengthKm(corridor, boardingStation, alightingStation) {
  let best = null;
  for (const path of corridor.paths) {
    const from = getNearestPointOnPolyline(pointOfStation(boardingStation), path);
    const to = getNearestPointOnPolyline(pointOfStation(alightingStation), path);
    if (!from || !to) continue;
    const length = pathSliceLengthKm(path, from.segmentIndex, from.t, to.segmentIndex, to.t);
    if (!best || length > best.length) best = { length, from, to };
  }
  return best?.length ?? Number.NaN;
}

/** Estaciones donde se puede subir, ordenadas por cercanía al origen. */
export function getBoardableStationsNear(point, options = {}) {
  const { walkToStationRadiusKm, maxCandidates } = { ...TRUNK_ROUTING_OPTIONS, ...options };
  const origin = toSitpPoint(point);
  if (!origin) return [];

  return TRUNK_BOARDABLE_STATIONS.map((station) => ({
    station,
    walkKm: haversineKm(origin, pointOfStation(station)),
  }))
    .filter((entry) => entry.walkKm <= walkToStationRadiusKm)
    .sort((left, right) => left.walkKm - right.walkKm)
    .slice(0, maxCandidates);
}

/**
 * Estación donde conviene bajarse: la más cercana al destino en ese corredor.
 *
 * Se descarta cualquier estación que no acerque a la persona al destino respecto
 * a donde empezó. Sin esa regla, si el origen ya está al lado del destino el
 * motor proponía subirse al bus para alejarse de él. La comparación es contra la
 * distancia origen → destino, y no contra el paseo a la estación: si el origen ya
 * es una estación, cualquier progreso sigue siendo progreso.
 */
function pickAlightingStation(boardingStation, corridor, destination, originToDestinationKm) {
  let best = null;
  for (const stationId of corridor.stationIds) {
    const station = TRUNK_STATIONS_BY_ID[stationId];
    if (!station || station.id === boardingStation.id) continue;
    const walkKm = haversineKm(pointOfStation(station), destination);
    if (walkKm >= originToDestinationKm) continue;
    if (!best || walkKm < best.walkKm) best = { station, walkKm };
  }
  return best;
}

function scoreCandidate(candidate) {
  const { boardingWalkKm, alightingWalkKm, corridor, boardingStation, alightingStation } = candidate;
  let score = 0;

  // Empezar y terminar sin caminar es lo que más pesa: cada metro a pie es una
  // barrera real para quien carga algo o lleva a un niño.
  score += Math.max(0, 260 - boardingWalkKm * 110);
  score += Math.max(0, 260 - alightingWalkKm * 110);

  // Un portal concentra más rutas que una estación sencilla.
  if (boardingStation.isPortal) score += 200;
  if (alightingStation.isPortal) score += 120;
  if (alightingStation.isInterchange) score += 90;
  if (alightingStation.type === 'Intermedia') score += 40;

  // Carril exclusivo es más rápido y no compite con los particulares.
  if (corridor.isExclusive) score += 140;

  // Y la capacidad importa en hora pico.
  score += Math.min(80, (alightingStation.capacity.articulated ?? 0) / 4);

  return score;
}

function describeMatch(candidate) {
  const { boardingStation, corridor, alightingStation } = candidate;
  return [
    `${boardingStation.name} es una estación ${boardingStation.type.toLowerCase()}`,
    boardingStation.isPortal ? 'es un portal con más rutas' : null,
    corridor.isExclusive ? `${corridor.name} es de carril exclusivo` : `${corridor.name} es de carril mixto`,
    alightingStation.capacity.articulated
      ? `${alightingStation.capacity.articulated} pax por articulado`
      : null,
  ]
    .filter(Boolean)
    .join('; ');
}

/**
 * Devuelve la mejor alternativa troncal para un par A → B, o `null` si ningún
 * corredor troncal conecta ambos puntos con un paseo a pie razonable.
 */
export function selectTroncalOption(originLocation, destinationLocation, options = {}) {
  const settings = { ...TRUNK_ROUTING_OPTIONS, ...options };
  const origin = toSitpPoint(originLocation);
  const destination = toSitpPoint(destinationLocation);
  if (!origin || !destination) return null;

  const candidates = [];
  const originToDestinationKm = haversineKm(origin, destination);
  for (const { station: boardingStation, walkKm: boardingWalkKm } of getBoardableStationsNear(origin, settings)) {
    const corridor = TRUNK_CORRIDORS_BY_ID[boardingStation.corridorId];
    if (!corridor) continue;

    const alighting = pickAlightingStation(boardingStation, corridor, destination, originToDestinationKm);
    if (!alighting) continue;
    if (alighting.walkKm > settings.walkFromStationRadiusKm) continue;

    const rideKm = rideLengthKm(corridor, boardingStation, alighting.station);
    if (!Number.isFinite(rideKm) || rideKm < settings.minRideKm) continue;

    const candidate = {
      boardingStation,
      boardingWalkKm,
      corridor,
      alightingStation: alighting.station,
      alightingWalkKm: alighting.walkKm,
      rideKm,
    };
    candidates.push({ ...candidate, score: scoreCandidate(candidate) });
  }

  const best = candidates.sort((left, right) => right.score - left.score)[0];
  if (!best) return null;
  return { ...best, matchReason: describeMatch(best) };
}

/**
 * Construye la alternativa troncal completa, con los mismos pasos y advertencias
 * que las demás, para que la interfaz pueda alternar sin cambiar de código.
 */
export function buildTroncalAlternative({
  originLocation,
  destinationLocation,
  destinationLabel = '',
  options = {},
} = {}) {
  const settings = { ...TRUNK_ROUTING_OPTIONS, ...options };
  const origin = toSitpPoint(originLocation);
  const destination = toSitpPoint(destinationLocation);
  if (!origin || !destination) return null;

  const selection = selectTroncalOption(origin, destination, settings);
  if (!selection) return null;

  const { boardingStation, boardingWalkKm, corridor, alightingStation, alightingWalkKm, rideKm } = selection;
  const totalKm = boardingWalkKm + rideKm + alightingWalkKm;

  const steps = [];
  if (boardingWalkKm > 0.02) {
    steps.push({
      order: 1,
      mode: WALK_MODE,
      instruction: `Camina ${formatKm(boardingWalkKm)} hasta ${boardingStation.name}`,
      detail: boardingStation.location ?? `${boardingStation.type} · corredor ${corridor.name}`,
      durationMinutes: estimateMinutes(boardingWalkKm, settings.walkSpeedKmh),
      estimatedCostCop: 0,
      stopId: boardingStation.id,
      source: 'trunk_stations_2026',
    });
  }

  steps.push({
    order: steps.length + 1,
    mode: TRUNK_MODE,
    instruction: `Sube al troncal de la ${corridor.name} hacia ${corridor.destination ?? 'el otro extremo'}`,
    detail: [
      corridor.isExclusive ? 'carril exclusivo' : 'carril mixto',
      corridor.letter ? `letra ${corridor.letter}` : null,
      corridor.lengthKm ? `${corridor.lengthKm} km de corredor` : null,
    ]
      .filter(Boolean)
      .join(' · '),
    durationMinutes: estimateMinutes(rideKm, settings.rideSpeedKmh),
    estimatedCostCop: VERIFIED_FACTS.sitpFareCop,
    routeCode: corridor.letter ?? corridor.id,
    source: 'trunk_corridors_2026',
  });

  steps.push({
    order: steps.length + 1,
    mode: WALK_MODE,
    instruction: `Baja en ${alightingStation.name}`,
    detail: [
      alightingStation.type,
      alightingStation.capacity.articulated
        ? `${alightingStation.capacity.articulated} pax por articulado`
        : null,
      alightingStation.accessSummary.length ? alightingStation.accessSummary.join(', ') : null,
    ]
      .filter(Boolean)
      .join(' · '),
    durationMinutes: 0,
    estimatedCostCop: null,
    stopId: alightingStation.id,
    source: 'trunk_stations_2026',
  });

  if (alightingWalkKm > 0.02) {
    steps.push({
      order: steps.length + 1,
      mode: WALK_MODE,
      instruction: `Camina ${formatKm(alightingWalkKm)} hasta tu destino`,
      detail: destinationLabel || 'El destino no queda justo en la estación',
      durationMinutes: estimateMinutes(alightingWalkKm, settings.walkSpeedKmh),
      estimatedCostCop: 0,
      source: 'planner_estimate',
    });
  }

  const warnings = [...TRUNK_DATA_BOUNDARIES];
  if (!corridor.isExclusive) {
    warnings.push(
      'Este corredor es de carril mixto: el bus compite con el tránsito particular y el tiempo varía mucho.',
    );
  }
  if (boardingWalkKm + alightingWalkKm > 1.5) {
    warnings.push(
      'El paseo a pie suma más de 1,5 km entre el origen y el destino; conviene revisarlo si cargas algo o viajas con alguien que camina con dificultad.',
    );
  }

  return {
    id: `trunk_${corridor.id}`,
    kind: 'official-trunk',
    dataVersion: TRUNK_DATA_VERSION,
    dataStatus: 'official-infrastructure-estimated-time',
    title: `Alternativa troncal ${corridor.name}`,
    corridorLabel: `${corridor.origin ?? '—'} → ${corridor.destination ?? '—'}`,
    routeCode: corridor.letter ?? corridor.id,
    routeId: corridor.id,
    serviceType: 'Troncal',
    busType: alightingStation.capacity.biacarticulated ? 'Biarticulado' : 'Articulado',
    operator: 'TransMilenio S.A.',
    isRural: false,
    daysLabel: 'Todos los días',
    scheduleType: corridor.isExclusive ? 'Carril exclusivo' : 'Carril mixto',
    schedule: { weekday: null, saturday: null, holiday: null },
    lengthKm: Number(rideKm.toFixed(2)),
    totalDistanceKm: Number(totalKm.toFixed(2)),
    matchReason: selection.matchReason,
    estimatedMinutes: steps.reduce((total, step) => total + step.durationMinutes, 0),
    boarding: {
      stopId: boardingStation.id,
      name: boardingStation.name,
      street: boardingStation.location,
      coordinates: pointOfStation(boardingStation),
      walkKm: Number(boardingWalkKm.toFixed(2)),
    },
    alighting: {
      stopId: alightingStation.id,
      name: alightingStation.name,
      street: alightingStation.location,
      coordinates: pointOfStation(alightingStation),
    },
    cableIntegration: null,
    path: joinPaths(...corridor.paths),
    sitpPath: corridor.paths.map((path) => path.map((point) => [...point])),
    cablePath: [],
    steps,
    totalCostCop: VERIFIED_FACTS.sitpFareCop,
    costFormatted: `$${VERIFIED_FACTS.sitpFareCop.toLocaleString('es-CO')} COP`,
    warnings,
    disclaimer: 'Infraestructura oficial; tiempos estimados por distancia.',
  };
}
