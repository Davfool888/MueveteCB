import snapshot from './gtfs-ciudad-bolivar-snapshot.json' with { type: 'json' };

export const GTFS_CB_SNAPSHOT = snapshot;

function routesForStop(stopId) {
  return snapshot.routes
    .filter((route) => route.matchedStops.some((stop) => stop.id === stopId))
    .map((route) => ({
      id: route.id,
      shortName: route.shortName,
      longName: route.longName,
      color: route.color,
    }));
}

function findStop(stopId, fallbackPattern) {
  return (
    snapshot.stops.find((stop) => stop.id === stopId) ||
    snapshot.stops.find((stop) => fallbackPattern.test(stop.name))
  );
}

const ANCHOR_DEFINITIONS = [
  { key: 'mochuelo_bajo', stopId: '52701', pattern: /Br\. El Mochuelo|Mochuelo Bajo/i, label: 'El Mochuelo' },
  { key: 'quiba', stopId: '52607', pattern: /^Quiba$/i, label: 'Quiba' },
  { key: 'juan_pablo_ii', stopId: 'cable_jpablo', pattern: /^Juan Pablo II$/i, label: 'Juan Pablo II' },
  { key: 'manitas', stopId: 'cable_manitas', pattern: /^Manitas$/i, label: 'Manitas' },
  { key: 'mirador_paraiso', stopId: 'cable_paraiso', pattern: /Mirador del Para[ií]so/i, label: 'Mirador del Paraíso' },
  { key: 'portal_tunal', stopId: 'cable_tunal', pattern: /^(Cable )?Portal [Tt]unal$/i, label: 'Portal Tunal' },
  { key: 'hospital_meissen', stopId: '51811', pattern: /Hsp\. de Meissen/i, label: 'Hospital Meissen' },
];

export const GTFS_ANCHOR_STOPS = Object.freeze(
  ANCHOR_DEFINITIONS.map((definition) => {
    const stop = findStop(definition.stopId, definition.pattern);
    if (!stop) return null;
    return Object.freeze({
      key: definition.key,
      label: definition.label,
      id: stop.id,
      name: stop.name,
      coordinates: Object.freeze([stop.latitude, stop.longitude]),
      wheelchairBoarding: stop.wheelchairBoarding,
      routes: Object.freeze(routesForStop(stop.id)),
    });
  }).filter(Boolean)
);

export const GTFS_VERIFIED_ROUTE_IDS = new Set(snapshot.routes.map((route) => route.id));
export const GTFS_VERIFIED_SHORT_NAMES = new Set(
  snapshot.routes.map((route) => route.shortName).filter(Boolean)
);

export function hasGtfsRoute(shortName) {
  return GTFS_VERIFIED_SHORT_NAMES.has(shortName);
}
