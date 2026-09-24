import { ROUTES } from '../data/routes.js';
import { DATA_BOUNDARIES, DATA_CHECKED_AT, MOBILITY_SOURCES, VERIFIED_FACTS } from '../data/mobilitySources.js';

export const ROUTE_DATA_VERSION = 'demo-2026-09-24-v2';
export const DEMO_DATA_WARNING =
  'Ruta, geografía y horarios demostrativos; confirmar con David, la comunidad y los operadores antes de un uso operativo.';

export const PLACE_DEFINITIONS = Object.freeze([
  {
    id: 'mochuelo_alto',
    label: 'Mochuelo Alto',
    aliases: ['mochuelo alto', 'mochuelo'],
  },
  {
    id: 'mochuelo_bajo',
    label: 'Mochuelo Bajo',
    aliases: ['mochuelo bajo'],
  },
  {
    id: 'quiba',
    label: 'Quiba',
    aliases: ['quiba alta', 'quiba bajo', 'quiba'],
  },
  {
    id: 'portal_tunal',
    label: 'Portal Tunal',
    aliases: ['portal del tunal', 'portal tunal', 'el tunal', 'tunal'],
  },
  {
    id: 'mirador_paraiso',
    label: 'Mirador del Paraíso',
    aliases: ['mirador del paraiso', 'estacion mirador del paraiso', 'paraiso'],
  },
  {
    id: 'manitas',
    label: 'Estación Manitas',
    aliases: ['estacion manitas', 'manitas'],
  },
  {
    id: 'juan_pablo_ii',
    label: 'Estación Juan Pablo II',
    aliases: ['estacion juan pablo ii', 'juan pablo ii', 'san pablo'],
  },
  {
    id: 'hospital_meissen',
    label: 'Hospital Meissen',
    aliases: ['hospital meissen', 'hospital de meissen', 'meissen'],
  },
  {
    id: 'sierra_morena',
    label: 'Sierra Morena',
    aliases: ['sierra morena'],
  },
  {
    id: 'las_torres',
    label: 'Sector Las Torres',
    aliases: ['sector las torres', 'las torres'],
  },
  {
    id: 'bella_flor',
    label: 'Bella Flor',
    aliases: ['bella flor'],
  },
  {
    id: 'la_candelaria',
    label: 'La Candelaria',
    aliases: ['la candelaria', 'candelaria'],
  },
]);

const ROUTE_ORIGIN_ID_BY_ROUTE = Object.freeze({
  main: 'mochuelo_alto',
  alternate: 'mochuelo_alto',
  quiba: 'quiba',
  economic: 'mochuelo_bajo',
  accessible: 'mirador_paraiso',
});

const ROUTE_PRIORITY_BY_ID = Object.freeze({
  main: 'fastest',
  alternate: 'fastest',
  quiba: 'fastest',
  economic: 'cheapest',
  accessible: 'accessible',
});

const ALTERNATIVES_BY_ROUTE = Object.freeze({
  main: Object.freeze(['alternate']),
  alternate: Object.freeze(['main']),
  quiba: Object.freeze([]),
  economic: Object.freeze([]),
  accessible: Object.freeze([]),
});

const ROUTE_MODE_BY_TYPE = Object.freeze({
  cable: 'transmicable',
  informal: 'informal',
  sitp: 'sitp',
  walk: 'walk',
});

function parseDurationMinutes(value) {
  const match = String(value || '').match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : null;
}

export function parseClockToMinutes(value) {
  const match = String(value || '').match(/(\d{1,2}):(\d{2})\s*(a\.\s*m\.|p\.\s*m\.)?/i);
  if (!match) return null;

  let hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  const isPm = Boolean(match[3] && match[3].toLowerCase().startsWith('p'));

  if (isPm && hour < 12) hour += 12;
  if (!isPm && hour === 12) hour = 0;

  return hour * 60 + minute;
}

function toGeoJsonCoordinates(mapPath) {
  return mapPath.map(([lat, lng]) => [lng, lat]);
}

function normalizeRoute(route) {
  const hasInformalSegment = route.segments.some((segment) => segment.type === 'informal');
  const warnings = [DEMO_DATA_WARNING];
  if (hasInformalSegment) {
    warnings.push('El tramo veredal, su frecuencia y su tarifa son estimaciones del fixture; confírmalas con la comunidad.');
  }

  return {
    id: route.id,
    originId: ROUTE_ORIGIN_ID_BY_ROUTE[route.id] || 'mochuelo_alto',
    destinationId: 'portal_tunal',
    priority: ROUTE_PRIORITY_BY_ID[route.id] || 'fastest',
    origin: route.origin,
    destination: route.destination,
    title: route.title,
    departureTime: route.departureClock.replace(/\s+/g, ' '),
    arrivalTime: route.arrivalClock.replace(/\s+/g, ' '),
    arrivalMinutes: route.arrivalMinutes,
    durationMinutes: parseDurationMinutes(route.duration),
    confidence: Number((route.confidence / 100).toFixed(2)),
    confidenceLabel: route.confidenceLabel,
    totalCostCop: route.totalCost,
    costFormatted: route.costFormatted,
    costBreakdown: route.costBreakdown,
    paymentMethod: route.paymentMethod,
    accessibilityLabel: route.accessibilityLabel,
    reason: route.reason,
    geometry: {
      type: 'LineString',
      coordinates: toGeoJsonCoordinates(route.mapPath),
    },
    steps: route.segments.map((segment, index) => ({
      order: index + 1,
      mode: ROUTE_MODE_BY_TYPE[segment.type] || segment.type,
      instruction: segment.title,
      detail: segment.detail,
      durationMinutes: parseDurationMinutes(segment.time),
      estimatedCostCop: segment.cost === '$0 COP' || segment.cost === '$0 (acuerdo)' ? 0 : null,
      source: segment.source || (segment.type === 'informal' ? 'demo_community_fixture' : 'demo_route_fixture'),
      verifiedAt:
        segment.source === 'gtfs_20260818' || segment.source === 'transmilenio_2026'
          ? DATA_CHECKED_AT
          : null,
    })),
    alternatives: ALTERNATIVES_BY_ROUTE[route.id] || [],
    source: 'eco_cb_demo_fixture',
    sourceUrl: null,
    officialSources: {
      transMiCable: MOBILITY_SOURCES.transMiCableStations.url,
      fares: MOBILITY_SOURCES.fares.url,
      gtfs: MOBILITY_SOURCES.gtfs.url,
    },
    verifiedFacts: VERIFIED_FACTS,
    dataAsOf: DATA_CHECKED_AT,
    dataVersion: ROUTE_DATA_VERSION,
    dataStatus: 'demo',
    warnings,
  };
}

export const ROUTE_CATALOG = Object.freeze(
  Object.freeze(Object.values(ROUTES).map(normalizeRoute))
);

export const ROUTES_BY_ID = Object.freeze(
  Object.fromEntries(ROUTE_CATALOG.map((route) => [route.id, route]))
);

export function getRouteById(routeId) {
  return ROUTES_BY_ID[routeId] || null;
}

export function getPlaceDefinition(placeId) {
  return PLACE_DEFINITIONS.find((place) => place.id === placeId) || null;
}

export function resolvePlaceId(value) {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  if (!normalized) return null;

  const exactMatch = PLACE_DEFINITIONS.find((place) =>
    place.aliases.includes(normalized)
  );
  if (exactMatch) return exactMatch.id;

  return (
    [...PLACE_DEFINITIONS]
      .flatMap((place) =>
        place.aliases
          .filter((alias) => normalized.includes(alias))
          .map((alias) => ({ place, alias }))
      )
      .sort((left, right) => right.alias.length - left.alias.length)[0]?.place.id || null
  );
}

export function getRouteAlternatives(routeId) {
  const route = getRouteById(routeId);
  if (!route) return [];
  return route.alternatives.map(getRouteById).filter(Boolean);
}

export function getCandidateRoutes({ originId, destinationId, priority = 'fastest' }) {
  const candidates = ROUTE_CATALOG.filter(
    (route) => route.originId === originId && route.destinationId === destinationId
  );
  const preferred = candidates.find((route) => route.priority === priority);
  if (preferred) return [preferred, ...candidates.filter((route) => route !== preferred)];
  return priority === 'fastest' ? candidates : [];
}

export { DATA_BOUNDARIES };
