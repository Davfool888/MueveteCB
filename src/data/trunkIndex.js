/**
 * Índice derivado del inventario de infraestructura troncal de Transmilenio.
 *
 * Complementa a `sitpIndex.js`: aquel describe los corredores zonales y sus
 * paraderos; este describe la red troncal (estaciones, tipo, capacidad y
 * accesos) con la que se puede comparar una alternativa de bus articulado
 * frente a la van veredal o al SITP zonal.
 *
 * La llave `id_trazado` es la que une estaciones con corredores, y en este
 * extracto no deja huérfanos: las 58 estaciones de la ventana de Ciudad Bolívar
 * tienen corredor.
 */

import snapshot from './trunk-snapshot.json' with { type: 'json' };

export const TRUNK_DATA_VERSION = 'trunk-snapshot-2026-09-26-v1';

export const TRUNK_DATA_BOUNDARIES = Object.freeze([
  'Estaciones, tipo, capacidad y accesos provienen del inventario de Transmilenio; no son una medición en tiempo real.',
  'El extracto no incluye viajes ni despachos programados: no se puede afirmar cada cuántos minutos pasa un bus.',
  'Las estaciones marcadas con cierre temporal por obras siguen en el mapa, pero no deben proponerse como punto de abordaje.',
  'La red troncal es de carril exclusivo o mixto según el corredor; un corredor mixto compite con el tránsito particular.',
]);

const ACCESS_LABELS = {
  fromStreet: 'acceso desde el espacio público',
  depressed: 'acceso por deprimido',
  bridge: 'acceso por puente',
};

function freezeAccess(access) {
  return Object.freeze({ ...access });
}

function freezeStation(station) {
  return Object.freeze({
    id: station.id,
    nodeId: station.nodeId,
    name: station.name,
    corridorId: station.corridorId,
    type: station.type,
    isPortal: station.isPortal,
    isInterchange: station.isInterchange,
    /** Un portal o un intercambio Concentra más oferta que una estación sencilla. */
    isMajor: station.isPortal || station.isInterchange,
    location: station.location,
    stage: station.stage,
    isTemporarilyClosed: station.isTemporarilyClosed,
    isOperating: station.isOperating,
    cars: station.cars,
    access: freezeAccess(station.access),
    /** Lista legible de cómo se accede: "acceso desde el espacio público, acceso por puente". */
    accessSummary: Object.entries(station.access)
      .filter(([, value]) => Number(value) > 0)
      .map(([key]) => ACCESS_LABELS[key] ?? key),
    capacity: Object.freeze({ ...station.capacity }),
    capacityLabel: station.capacity.articulated
      ? `${station.capacity.articulated} pax por articulado`
      : 'Capacidad sin dato',
    size: Object.freeze({ ...station.size }),
    note: station.note,
    latitude: station.coordinates[0],
    longitude: station.coordinates[1],
  });
}

function freezeCorridor(corridor) {
  return Object.freeze({
    id: corridor.id,
    name: corridor.name,
    pathLabel: corridor.pathLabel,
    letter: corridor.letter,
    type: corridor.type,
    isExclusive: corridor.isExclusive,
    origin: corridor.origin,
    destination: corridor.destination,
    lengthKm: corridor.lengthKm,
    phase: corridor.phase,
    isExisting: corridor.isExisting,
    stationIds: Object.freeze([...corridor.stationIds]),
    paths: Object.freeze(
      corridor.paths.map((path) => Object.freeze(path.map((point) => Object.freeze(point)))),
    ),
  });
}

export const TRUNK_METADATA = Object.freeze({ ...snapshot.metadata });

export const TRUNK_STATIONS = Object.freeze(snapshot.stations.map(freezeStation));

export const TRUNK_STATIONS_BY_ID = Object.freeze(
  Object.fromEntries(TRUNK_STATIONS.map((station) => [station.id, station]))
);

export const TRUNK_CORRIDORS = Object.freeze(snapshot.corridors.map(freezeCorridor));

export const TRUNK_CORRIDORS_BY_ID = Object.freeze(
  Object.fromEntries(TRUNK_CORRIDORS.map((corridor) => [corridor.id, corridor]))
);

export const TRUNK_STATIONS_BY_CORRIDOR = Object.freeze(
  TRUNK_CORRIDORS.reduce((accumulator, corridor) => {
    accumulator[corridor.id] = Object.freeze(
      corridor.stationIds.map((id) => TRUNK_STATIONS_BY_ID[id]).filter(Boolean),
    );
    return accumulator;
  }, Object.create(null))
);

/** Estaciones donde se puede embarcar: operativas y con acceso desde la calle. */
export const TRUNK_BOARDABLE_STATIONS = Object.freeze(
  TRUNK_STATIONS.filter((station) => station.isOperating && station.access.fromStreet > 0)
);

export function getTrunkStationById(stationId) {
  return TRUNK_STATIONS_BY_ID[stationId] ?? null;
}

export function getTrunkCorridorById(corridorId) {
  return TRUNK_CORRIDORS_BY_ID[corridorId] ?? null;
}

export function getTrunkCorridorStations(corridorId) {
  return TRUNK_STATIONS_BY_CORRIDOR[corridorId] ?? [];
}
