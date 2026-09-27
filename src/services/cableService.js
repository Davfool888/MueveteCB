/**
 * Alternativa TransMiCable: caminar a una estación del cable y subir al teleférico.
 *
 * El cable es el modo más rápido de la red, así que merece su propia alternativa
 * y no quedar escondido como un transbordo dentro del plan del SITP. Solo se
 * propone cuando los dos extremos están a distancia caminable del cable, porque
 * en cualquier otro caso no compensa: se iría más tiempo a pie que el ahorro.
 *
 * La línea y las cuatro estaciones vienen del inventario del operador
 * (`data/cableIndex.js`), incluidos los elevadores de cada estación.
 */

import { CABLE_LINE_PATH, CABLE_STATIONS, CABLE_DATA_BOUNDARIES } from '../data/cableIndex.js';
import { VERIFIED_FACTS } from '../data/mobilitySources.js';
import { haversineKm } from './transportRouting.js';
import { sliceCorridorPath } from './corridorPath.js';
import { toSitpPoint, formatKm } from './sitpRoutesService.js';

export const CABLE_ROUTING_OPTIONS = Object.freeze({
  /** Distancia máxima caminable hasta una estación del cable. */
  walkToStationRadiusKm: 1.2,
  /** Recorrido mínimo en cable para que valga la pena. */
  minRideKm: 0.8,
  /** Velocidad asumida para el tramo a pie. */
  walkSpeedKmh: 4.5,
  /**
   * Velocidad del cable. Es una estimación: Transmilenio publica la línea y sus
   * estaciones, pero no un tiempo de recorrido por tramo.
   */
  rideSpeedKmh: 12,
});

function pointOfStation(station) {
  return station.coordinates;
}

/** Estación del cable más cercana a un punto, con su distancia a pie. */
export function getNearestCableStation(point, options = {}) {
  const { walkToStationRadiusKm } = { ...CABLE_ROUTING_OPTIONS, ...options };
  const origin = toSitpPoint(point);
  if (!origin) return null;

  let best = null;
  for (const station of CABLE_STATIONS) {
    const walkKm = haversineKm(origin, pointOfStation(station));
    if (walkKm > walkToStationRadiusKm) continue;
    if (!best || walkKm < best.walkKm) best = { station, walkKm };
  }
  return best;
}

/**
 * Construye la alternativa del cable para un par A → B, o `null` si algún extremo
 * queda demasiado lejos o el recorrido en cable no compensa.
 */
export function buildCableAlternative({
  originLocation,
  destinationLocation,
  options = {},
} = {}) {
  const settings = { ...CABLE_ROUTING_OPTIONS, ...options };
  const origin = toSitpPoint(originLocation);
  const destination = toSitpPoint(destinationLocation);
  if (!origin || !destination) return null;

  const boarding = getNearestCableStation(origin, settings);
  const arrival = getNearestCableStation(destination, settings);
  if (!boarding || !arrival) return null;
  if (boarding.station.id === arrival.station.id) return null;

  // Se recorta la línea entre las dos estaciones en lugar de dibujar el tramo
  // completo, para que la geometría corresponda al viaje que se ofrece.
  const slice = sliceCorridorPath(
    [CABLE_LINE_PATH],
    pointOfStation(boarding.station),
    pointOfStation(arrival.station),
  );
  if (!slice || slice.distanceKm < settings.minRideKm) return null;

  const totalKm = boarding.walkKm + slice.distanceKm + arrival.walkKm;
  const steps = [];

  steps.push({
    order: 1,
    mode: 'walk',
    instruction: `Camina ${formatKm(boarding.walkKm)} hasta ${boarding.station.name}`,
    detail: boarding.station.accessLabel,
    durationMinutes: Math.max(1, Math.round((boarding.walkKm / settings.walkSpeedKmh) * 60)),
    estimatedCostCop: 0,
    stopId: boarding.station.id,
    source: 'cable_stations_2026',
  });

  steps.push({
    order: 2,
    mode: 'cable',
    instruction: `Sube al TransMiCable hacia ${arrival.station.name}`,
    detail: `${boarding.station.name} → ${arrival.station.name} · ${arrival.station.accessLabel}`,
    durationMinutes: Math.max(1, Math.round((slice.distanceKm / settings.rideSpeedKmh) * 60)),
    estimatedCostCop: VERIFIED_FACTS.sitpFareCop,
    source: 'cable_segments_2026',
  });

  steps.push({
    order: 3,
    mode: 'walk',
    instruction: `Camina ${formatKm(arrival.walkKm)} hasta tu destino`,
    detail: `Desde ${arrival.station.name}`,
    durationMinutes: Math.max(1, Math.round((arrival.walkKm / settings.walkSpeedKmh) * 60)),
    estimatedCostCop: 0,
    source: 'planner_estimate',
  });

  const estimatedMinutes = steps.reduce((total, step) => total + step.durationMinutes, 0);

  return {
    id: `cable_${boarding.station.id}_${arrival.station.id}`,
    kind: 'official-cable',
    dataVersion: 'cable-2026-09-27-v1',
    dataStatus: 'verified-geometry-estimated-time',
    title: 'TransMiCable directo',
    corridorLabel: `${boarding.station.name} → ${arrival.station.name}`,
    routeCode: 'CABLE',
    routeId: 'CABLE',
    serviceType: 'Cable',
    busType: 'Teleférico',
    operator: 'TransMilenio S.A.',
    isRural: false,
    daysLabel: 'Todos los días',
    scheduleType: 'Línea troncal del cable',
    schedule: { weekday: null, saturday: null, holiday: null },
    lengthKm: Number(slice.distanceKm.toFixed(2)),
    totalDistanceKm: Number(totalKm.toFixed(2)),
    matchReason:
      `las dos estaciones del cable están a ${formatKm(boarding.walkKm)} y ${formatKm(arrival.walkKm)} a pie, ` +
      'así que no hace falta combinar con bus',
    estimatedMinutes,
    boarding: {
      stopId: boarding.station.id,
      name: boarding.station.name,
      street: boarding.station.accessLabel,
      coordinates: pointOfStation(boarding.station),
      walkKm: Number(boarding.walkKm.toFixed(2)),
    },
    alighting: {
      stopId: arrival.station.id,
      name: arrival.station.name,
      street: arrival.station.accessLabel,
      coordinates: pointOfStation(arrival.station),
    },
    cableIntegration: {
      stationId: boarding.station.id,
      stationName: boarding.station.name,
      distanceKm: Number(boarding.walkKm.toFixed(3)),
      coordinates: pointOfStation(boarding.station),
    },
    path: slice.path,
    sitpPath: [],
    cablePath: slice.path,
    steps,
    totalCostCop: VERIFIED_FACTS.sitpFareCop,
    costFormatted: `$${VERIFIED_FACTS.sitpFareCop.toLocaleString('es-CO')} COP`,
    warnings: [...CABLE_DATA_BOUNDARIES],
    disclaimer: 'Línea verificada; tiempos estimados por distancia.',
  };
}
