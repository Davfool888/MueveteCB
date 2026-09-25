import { GTFS_ANCHOR_STOPS, GTFS_CB_SNAPSHOT } from '../data/gtfsIndex.js';
import { TRANSMICABLE_STATIONS } from '../data/routes.js';
import { VEREDAL_ROUTES } from '../data/veredalRoutes.js';
import { hasLocationCoordinates } from '../utils/locationRoute.js';

const DEFAULT_TRANSPORT_OPTIONS = Object.freeze({
  sitpCoverageRadiusKm: 0.6,
  veredalSearchRadiusKm: 4.5,
  maxContextStops: 6,
});

const GTFS_STOPS = (GTFS_CB_SNAPSHOT?.stops || []).filter(
  (stop) =>
    Number.isFinite(Number(stop?.latitude)) &&
    Number.isFinite(Number(stop?.longitude)),
);

const GTFS_ROUTES_BY_STOP = (() => {
  const index = new Map();

  (GTFS_CB_SNAPSHOT?.routes || []).forEach((route) => {
    (route.matchedStops || []).forEach((stop) => {
      if (!stop?.id) return;
      const routes = index.get(stop.id) || [];
      routes.push({
        id: route.id,
        shortName: route.shortName,
        longName: route.longName,
        color: route.color,
      });
      index.set(stop.id, routes);
    });
  });

  return index;
})();

const GTFS_SERVICE_STOPS = GTFS_STOPS.filter(
  (stop) => getRoutesForStop(stop.id).length > 0,
);

const INTEGRATION_CANDIDATES = [
  ...GTFS_ANCHOR_STOPS.map((stop) => ({
    id: stop.key,
    name: stop.label,
    coordinates: stop.coordinates,
    source: 'gtfs_20260818',
  })),
  ...TRANSMICABLE_STATIONS.map((station) => ({
    id: station.id,
    name: station.name,
    coordinates: station.coordinates,
    source: 'transmilenio_2026',
  })),
].filter(
  (candidate, index, candidates) =>
    candidates.findIndex(
      (other) =>
        other.id === candidate.id ||
        (other.coordinates[0] === candidate.coordinates[0] &&
          other.coordinates[1] === candidate.coordinates[1]),
    ) === index,
);

function readRadius(name, fallback) {
  const value = Number(import.meta.env?.[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const TRANSPORT_ROUTING_OPTIONS = Object.freeze({
  ...DEFAULT_TRANSPORT_OPTIONS,
  sitpCoverageRadiusKm: readRadius(
    'VITE_SITP_COVERAGE_RADIUS_KM',
    DEFAULT_TRANSPORT_OPTIONS.sitpCoverageRadiusKm,
  ),
  veredalSearchRadiusKm: readRadius(
    'VITE_VEREDAL_SEARCH_RADIUS_KM',
    DEFAULT_TRANSPORT_OPTIONS.veredalSearchRadiusKm,
  ),
});

function toPoint(value) {
  if (Array.isArray(value) && value.length >= 2) {
    return [Number(value[0]), Number(value[1])];
  }

  if (Array.isArray(value?.coordinates) && value.coordinates.length >= 2) {
    return [Number(value.coordinates[0]), Number(value.coordinates[1])];
  }

  if (hasLocationCoordinates(value)) {
    return [Number(value.latitude), Number(value.longitude)];
  }

  return null;
}

function validPoint(point) {
  return (
    Array.isArray(point) &&
    point.length >= 2 &&
    Number.isFinite(point[0]) &&
    Number.isFinite(point[1])
  );
}

export function haversineKm(pointA, pointB) {
  if (!validPoint(pointA) || !validPoint(pointB)) return Infinity;

  const earthRadiusKm = 6371;
  const latitudeA = (pointA[0] * Math.PI) / 180;
  const latitudeB = (pointB[0] * Math.PI) / 180;
  const deltaLatitude = ((pointB[0] - pointA[0]) * Math.PI) / 180;
  const deltaLongitude = ((pointB[1] - pointA[1]) * Math.PI) / 180;

  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitudeA) *
      Math.cos(latitudeB) *
      Math.sin(deltaLongitude / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function getRoutesForStop(stopId) {
  return GTFS_ROUTES_BY_STOP.get(String(stopId)) || [];
}

export function getNearestGtfsStop(point, options = {}) {
  const pointValue = toPoint(point);
  if (!pointValue) return null;

  let nearest = null;

  GTFS_SERVICE_STOPS.forEach((stop) => {
    const distanceKm = haversineKm(pointValue, [stop.latitude, stop.longitude]);
    if (!nearest || distanceKm < nearest.distanceKm) {
      nearest = {
        id: stop.id,
        name: stop.name,
        coordinates: [stop.latitude, stop.longitude],
        wheelchairBoarding: stop.wheelchairBoarding,
        routes: getRoutesForStop(stop.id),
        distanceKm,
        source: 'gtfs_20260818',
      };
    }
  });

  if (!nearest) return null;
  if (
    Number.isFinite(options.maxDistanceKm) &&
    nearest.distanceKm > options.maxDistanceKm
  ) {
    return null;
  }

  return nearest;
}

export function getNearbySitpStops(point, options = {}) {
  const pointValue = toPoint(point);
  if (!pointValue) return [];

  const radiusKm = options.radiusKm || TRANSPORT_ROUTING_OPTIONS.sitpCoverageRadiusKm;
  const maxStops = options.maxStops || TRANSPORT_ROUTING_OPTIONS.maxContextStops;

  return GTFS_SERVICE_STOPS.map((stop) => ({
    id: stop.id,
    name: stop.name,
    coordinates: [stop.latitude, stop.longitude],
    wheelchairBoarding: stop.wheelchairBoarding,
    routes: getRoutesForStop(stop.id),
    source: 'gtfs_20260818',
    distanceKm: haversineKm(pointValue, [stop.latitude, stop.longitude]),
  }))
    .filter((stop) => stop.distanceKm <= radiusKm)
    .sort((left, right) => left.distanceKm - right.distanceKm)
    .slice(0, maxStops);
}

export function getNearestIntegrationPoint(point) {
  const pointValue = toPoint(point);
  if (!pointValue) return null;

  let nearest = null;

  INTEGRATION_CANDIDATES.forEach((candidate) => {
    const distanceKm = haversineKm(pointValue, candidate.coordinates);
    if (!nearest || distanceKm < nearest.distanceKm) {
      nearest = {
        ...candidate,
        distanceKm,
      };
    }
  });

  return nearest;
}

export function getNearestVeredalRoute(point, options = {}) {
  const pointValue = toPoint(point);
  if (!pointValue) return null;

  const radiusKm =
    options.radiusKm || TRANSPORT_ROUTING_OPTIONS.veredalSearchRadiusKm;
  let nearest = null;

  VEREDAL_ROUTES.forEach((route) => {
    const distanceKm = haversineKm(pointValue, route.origin.coordinates);
    if (distanceKm > radiusKm) return;

    if (!nearest || distanceKm < nearest.distanceKm) {
      nearest = {
        route,
        distanceKm,
      };
    }
  });

  return nearest;
}

function getRouteModes(activeRoute) {
  return new Set(
    (activeRoute?.segments || [])
      .map((segment) => segment.type)
      .filter(Boolean),
  );
}

function nearestPathIndex(path, point) {
  if (!validPoint(point) || !Array.isArray(path) || path.length === 0) return -1;

  let nearestIndex = 0;
  let nearestDistance = Infinity;

  path.forEach((candidate, index) => {
    const distance = haversineKm(point, candidate);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  return nearestIndex;
}

function buildContinuationPath({ activeRoute, veredalRoute, integration, destination }) {
  if (!validPoint(integration) || !validPoint(destination)) return [];

  const activePath = activeRoute?.mapPath;
  if (Array.isArray(activePath) && activePath.length > 1) {
    const integrationIndex = nearestPathIndex(activePath, integration);
    const pathFromIntegration = activePath.slice(integrationIndex);
    if (pathFromIntegration.length > 1) return pathFromIntegration;
  }

  const fallbackPath = veredalRoute?.continuation;
  if (Array.isArray(fallbackPath) && fallbackPath.length > 1) {
    const routeDestination = toPoint(veredalRoute.destination);
    const reachesRequestedDestination =
      !routeDestination || haversineKm(routeDestination, destination) <= 0.8;
    if (reachesRequestedDestination) return fallbackPath;
  }

  return [];
}

function uniqueStops(...groups) {
  const seen = new Set();
  const result = [];

  groups.flat().forEach((stop) => {
    if (!stop) return;
    const key = `${stop.id}:${stop.coordinates?.[0]}:${stop.coordinates?.[1]}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(stop);
  });

  return result.slice(0, TRANSPORT_ROUTING_OPTIONS.maxContextStops);
}

function makeBasePlan({
  status,
  mode,
  origin,
  destination,
  originStop,
  destinationStop,
  nearestIntegration,
  veredalRoute,
  availableModes,
  activeRoute,
  contextStops,
  reason,
}) {
  const isVeredal = mode === 'veredal' && Boolean(veredalRoute);
  const routeModes = getRouteModes(activeRoute);
  const routePath = !isVeredal && Array.isArray(activeRoute?.mapPath)
    ? activeRoute.mapPath
    : null;
  const continuationPath = isVeredal
    ? buildContinuationPath({
        activeRoute,
        veredalRoute,
        integration: veredalRoute.integration.coordinates,
        destination,
      })
    : [];
  const vanPath = isVeredal ? veredalRoute.route : [];
  const fitPath = isVeredal
    ? [...vanPath, ...continuationPath.slice(1)]
    : routePath || [];

  return {
    status,
    mode,
    modeLabel: isVeredal ? 'Van veredal' : mode === 'sitp' ? 'SITP' : 'TransMiCable',
    origin,
    destination,
    originStop,
    destinationStop,
    nearestIntegration,
    veredalRoute: isVeredal ? veredalRoute : null,
    availableModes,
    activeRoute: !isVeredal ? activeRoute : null,
    routePath,
    continuationPath,
    fitPath,
    contextStops: contextStops || [],
    showCable: routeModes.has('cable'),
    simulated: isVeredal,
    source: isVeredal ? 'simulated_veredal_fixture' : 'existing_transport_fixture',
    sourceNote: isVeredal
      ? 'Ruta veredal aproximada de prototipo; no es un servicio oficial verificado.'
      : 'La geometría visible conserva el fixture existente; validar con la fuente oficial.',
    reason,
  };
}

export function getTransportPlan({
  originLocation = null,
  destinationLocation = null,
  activeRoute = null,
  selectedMode = 'auto',
  options = {},
} = {}) {
  const routingOptions = {
    ...TRANSPORT_ROUTING_OPTIONS,
    ...options,
  };
  const origin = toPoint(originLocation);
  const destination = toPoint(destinationLocation);
  const originStop = origin
    ? getNearestGtfsStop(origin, {
        maxDistanceKm: routingOptions.sitpCoverageRadiusKm,
      })
    : null;
  const destinationStop = destination
    ? getNearestGtfsStop(destination, {
        maxDistanceKm: routingOptions.sitpCoverageRadiusKm,
      })
    : null;
  const nearbyStops = origin
    ? getNearbySitpStops(origin, {
        radiusKm: routingOptions.sitpCoverageRadiusKm,
        maxStops: routingOptions.maxContextStops,
      })
    : [];
  const nearestVeredal = origin
    ? getNearestVeredalRoute(origin, {
        radiusKm: routingOptions.veredalSearchRadiusKm,
      })
    : null;
  const veredalMatch = nearestVeredal;
  const availableModes = [];

  if (originStop) availableModes.push('sitp');
  if (veredalMatch) {
    availableModes.push('veredal');
  }
  if (getRouteModes(activeRoute).has('cable')) availableModes.push('cable');

  if (!origin) {
    return makeBasePlan({
      status: destination ? 'destination-selected' : 'idle',
      mode: 'none',
      origin,
      destination,
      originStop,
      destinationStop,
      nearestIntegration: null,
      veredalRoute: null,
      availableModes,
      activeRoute,
      contextStops: [],
      reason: 'Selecciona un origen para encontrar transporte cercano.',
    });
  }

  const hasSitpCoverage = Boolean(originStop);
  const isRuralOrigin = !hasSitpCoverage || originStop.distanceKm > routingOptions.sitpCoverageRadiusKm;
  const routeModes = getRouteModes(activeRoute);
  const hasActiveSitp = routeModes.has('sitp');
  const hasActiveCable = routeModes.has('cable');
  const canUseSitp = Boolean(originStop || hasActiveSitp);
  const canUseVeredal = Boolean(veredalMatch);
  const canUseCable = hasActiveCable;
  const prefersVeredal = selectedMode === 'veredal' || (selectedMode === 'auto' && isRuralOrigin);

  if (prefersVeredal && canUseVeredal) {
    return makeBasePlan({
      status: 'veredal-route',
      mode: 'veredal',
      origin,
      destination,
      originStop,
      destinationStop,
      nearestIntegration: getNearestIntegrationPoint(origin),
      veredalRoute: veredalMatch.route,
      availableModes,
      activeRoute,
      contextStops: veredalMatch.route.stops,
      reason: 'El origen queda fuera de la cobertura SITP cercana; se propone una van veredal y su integración.',
    });
  }

  if (selectedMode === 'cable' && canUseCable) {
    return makeBasePlan({
      status: 'route-selected',
      mode: 'cable',
      origin,
      destination,
      originStop,
      destinationStop,
      nearestIntegration: getNearestIntegrationPoint(origin),
      veredalRoute: null,
      availableModes,
      activeRoute,
      contextStops: [],
      reason: 'Se selecciona el tramo formal de TransMiCable relacionado con la ruta activa.',
    });
  }

  if (selectedMode === 'sitp' && canUseSitp) {
    return makeBasePlan({
      status: 'route-selected',
      mode: 'sitp',
      origin,
      destination,
      originStop,
      destinationStop,
      nearestIntegration: getNearestIntegrationPoint(origin),
      veredalRoute: null,
      availableModes,
      activeRoute,
      contextStops: uniqueStops(nearbyStops, destinationStop),
      reason: 'Se mantiene el corredor SITP y se muestran únicamente sus paradas relacionadas.',
    });
  }

  if (hasActiveCable && !hasActiveSitp) {
    return makeBasePlan({
      status: 'route-selected',
      mode: 'cable',
      origin,
      destination,
      originStop,
      destinationStop,
      nearestIntegration: getNearestIntegrationPoint(origin),
      veredalRoute: null,
      availableModes,
      activeRoute,
      contextStops: [],
      reason: 'Se mantiene el tramo formal de TransMiCable y sus estaciones relacionadas.',
    });
  }

  if (canUseSitp) {
    return makeBasePlan({
      status: destination ? 'route-selected' : 'origin-selected',
      mode: 'sitp',
      origin,
      destination,
      originStop,
      destinationStop,
      nearestIntegration: getNearestIntegrationPoint(origin),
      veredalRoute: null,
      availableModes,
      activeRoute,
      contextStops: uniqueStops(nearbyStops, destinationStop),
      reason: destination
        ? 'El origen tiene una parada SITP cercana; se muestran solo las paradas relevantes.'
        : 'El origen tiene cobertura SITP cercana; selecciona un destino para completar el trayecto.',
    });
  }

  if (canUseVeredal && selectedMode === 'auto') {
    return makeBasePlan({
      status: 'origin-selected',
      mode: 'veredal',
      origin,
      destination,
      originStop,
      destinationStop,
      nearestIntegration: getNearestIntegrationPoint(origin),
      veredalRoute: veredalMatch.route,
      availableModes,
      activeRoute,
      contextStops: veredalMatch.route.stops,
      reason: 'Hay una van veredal disponible cerca del origen; completa el destino para conectar el segundo tramo.',
    });
  }

  return makeBasePlan({
    status: destination ? 'destination-selected' : 'origin-selected',
    mode: 'none',
    origin,
    destination,
    originStop,
    destinationStop,
    nearestIntegration: getNearestIntegrationPoint(origin),
    veredalRoute: null,
    availableModes,
    activeRoute,
    contextStops: [],
    reason: 'No hay cobertura veredal o SITP confirmada para este punto.',
  });
}
