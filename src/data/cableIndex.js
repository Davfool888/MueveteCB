/**
 * Índice del TransMiCable a partir del inventario oficial del operador.
 *
 * Sustituye a las constantes `TRANSMICABLE_STATIONS` y `CABLE_PATH` que estaban
 * escritas a mano en `routes.js`. La diferencia no es solo de Procedencia: el
 * extracto trae la cantidad de elevadores por estación, así que la
 * accesibilidad se puede afirmar con un dato y no con un "accesible" sin fuente.
 */

import snapshot from './cable-snapshot.json' with { type: 'json' };

export const CABLE_DATA_VERSION = 'cable-snapshot-2026-09-27-v1';

export const CABLE_DATA_BOUNDARIES = Object.freeze([
  'Las estaciones, la línea y los elevadores por estación provienen del inventario del TransMiCable de Transmilenio.',
  'No hay intervalos de despacho ni tiempos de recorrido por tramo publicados, así que el tiempo a bordo es una estimación por distancia.',
  'El servicio declara origen y destino de cada tramo, pero no garantiza que la geometría venga en ese orden: la línea se normalizó al generar el extracto.',
]);

function freezeStation(station) {
  return Object.freeze({
    id: station.id,
    nodeId: station.nodeId,
    name: station.name,
    segmentId: station.segmentId,
    lineIndex: station.lineIndex,
    positionKm: station.positionKm,
    lifts: station.lifts,
    rainProtected: station.rainProtected,
    powerGrid: station.powerGrid,
    isOperating: station.isOperating,
    buildingAreaM2: station.buildingAreaM2,
    latitude: station.coordinates[0],
    longitude: station.coordinates[1],
    coordinates: Object.freeze([...station.coordinates]),
    /** Texto de accesibilidad construido con el dato del operador. */
    accessLabel:
      station.lifts > 0
        ? `${station.lifts} ${station.lifts === 1 ? 'elevador' : 'elevadores'}`
        : 'Sin elevador',
  });
}

function freezeSegment(segment) {
  return Object.freeze({
    id: segment.id,
    name: segment.name,
    origin: segment.origin,
    destination: segment.destination,
    originStationId: segment.originStationId,
    destinationStationId: segment.destinationStationId,
    declaredLengthM: segment.declaredLengthM,
    isOperating: segment.isOperating,
    wasReordered: segment.wasReordered,
    path: Object.freeze(segment.path.map((point) => Object.freeze([...point]))),
  });
}

export const CABLE_METADATA = Object.freeze({ ...snapshot.metadata });

/** Estaciones en el orden en que se recorren la línea: portal → cumbre. */
export const CABLE_STATIONS = Object.freeze(snapshot.stations.map(freezeStation));

export const CABLE_STATIONS_BY_ID = Object.freeze(
  Object.fromEntries(CABLE_STATIONS.map((station) => [station.id, station])),
);

export const CABLE_SEGMENTS = Object.freeze(snapshot.segments.map(freezeSegment));

/** Polilínea completa de la línea, de un extremo al otro. */
export const CABLE_LINE_PATH = Object.freeze(
  snapshot.segments.flatMap((segment) => segment.path).map((point) => Object.freeze([...point])),
);

/** Longitud medida sobre la geometría, en kilómetros. */
export const CABLE_LINE_LENGTH_KM = Object.freeze(
  Number((snapshot.metadata.measuredLengthM / 1000).toFixed(2)),
);

export function getCableStationById(stationId) {
  return CABLE_STATIONS_BY_ID[stationId] ?? null;
}

/** Estación siguiente en la línea, o `null` si es la última. */
export function getNextCableStation(stationId) {
  const index = CABLE_STATIONS.findIndex((station) => station.id === stationId);
  if (index < 0 || index === CABLE_STATIONS.length - 1) return null;
  return CABLE_STATIONS[index + 1];
}

export function getPreviousCableStation(stationId) {
  const index = CABLE_STATIONS.findIndex((station) => station.id === stationId);
  if (index <= 0) return null;
  return CABLE_STATIONS[index - 1];
}
