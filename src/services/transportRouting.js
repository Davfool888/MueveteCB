import { GTFS_ANCHOR_STOPS, GTFS_CB_SNAPSHOT } from '../data/gtfsIndex.js';
import { CABLE_PATH, TRANSMICABLE_STATIONS } from '../data/routes.js';
import { VEREDAL_ROUTES } from '../data/veredalRoutes.js';
import { hasLocationCoordinates } from '../utils/locationRoute.js';
import { getRoadRouteKey } from './roadRouting.js';

const DEFAULT_TRANSPORT_OPTIONS = Object.freeze({
  sitpCoverageRadiusKm: 0.6,
  veredalSearchRadiusKm: 1.0,
  cableSearchRadiusKm: 0.7,
  maxContextStops: 6,
  // A location at the station/paradero itself does not need an OSRM access
  // request. This is deliberately small: the access leg is still shown when
  // a person is a few metres away from the known boarding point.
  coincidenceRadiusKm: 0.01,
  cablePreferenceTieKm: 0.15,
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

function getRoutesForStop(stopId) {
  return GTFS_ROUTES_BY_STOP.get(String(stopId)) || [];
}

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
  cableSearchRadiusKm: readRadius(
    'VITE_CABLE_SEARCH_RADIUS_KM',
    DEFAULT_TRANSPORT_OPTIONS.cableSearchRadiusKm,
  ),
  coincidenceRadiusKm: readRadius(
    'VITE_TRANSPORT_COINCIDENCE_RADIUS_KM',
    DEFAULT_TRANSPORT_OPTIONS.coincidenceRadiusKm,
  ),
});

function toPoint(value) {
  if (Array.isArray(value) && value.length >= 2) {
    const point = [Number(value[0]), Number(value[1])];
    return validPoint(point) ? point : null;
  }

  if (Array.isArray(value?.coordinates) && value.coordinates.length >= 2) {
    const point = [Number(value.coordinates[0]), Number(value.coordinates[1])];
    return validPoint(point) ? point : null;
  }

  if (hasLocationCoordinates(value)) {
    const point = [Number(value.latitude), Number(value.longitude)];
    return validPoint(point) ? point : null;
  }

  return null;
}

function validPoint(point) {
  return (
    Array.isArray(point) &&
    point.length >= 2 &&
    Number.isFinite(point[0]) &&
    Number.isFinite(point[1]) &&
    point[0] >= -90 &&
    point[0] <= 90 &&
    point[1] >= -180 &&
    point[1] <= 180
  );
}

function copyPoint(point) {
  const value = toPoint(point);
  return value ? [value[0], value[1]] : null;
}

function pointKey(point) {
  const value = toPoint(point);
  return value ? `${value[0].toFixed(7)},${value[1].toFixed(7)}` : '';
}

function labelFor(value, fallback = '') {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return value?.label || value?.name || fallback;
}

function makeLocation(point, label = '', extra = {}) {
  const value = toPoint(point);
  if (!value) return null;
  return {
    latitude: value[0],
    longitude: value[1],
    label: String(label || ''),
    ...extra,
  };
}

function makeRequestLocation(point, label = '') {
  const location = makeLocation(point, label);
  if (!location) return null;
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    label: location.label,
  };
}

function normalizePath(path) {
  if (!Array.isArray(path)) return [];
  return path.map((point) => copyPoint(point)).filter(Boolean);
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
  const boundedHaversine = Math.min(1, Math.max(0, haversine));

  return (
    earthRadiusKm *
    2 *
    Math.atan2(Math.sqrt(boundedHaversine), Math.sqrt(1 - boundedHaversine))
  );
}

function samePoint(left, right, toleranceKm = 0.00001) {
  if (!validPoint(left) || !validPoint(right)) return false;
  return haversineKm(left, right) <= toleranceKm;
}

export function joinPaths(...paths) {
  const result = [];
  const append = (candidate) => {
    if (validPoint(candidate)) {
      const point = copyPoint(candidate);
      if (!point) return;
      if (result.length > 0 && samePoint(result[result.length - 1], point)) return;
      result.push(point);
      return;
    }
    if (Array.isArray(candidate)) candidate.forEach(append);
  };

  paths.forEach(append);
  return result;
}

function pathDistanceKm(path) {
  const points = normalizePath(path);
  let distance = 0;
  for (let index = 1; index < points.length; index += 1) {
    distance += haversineKm(points[index - 1], points[index]);
  }
  return distance;
}

function interpolatePoint(start, end, amount) {
  return [
    Number(start[0]) + (Number(end[0]) - Number(start[0])) * amount,
    Number(start[1]) + (Number(end[1]) - Number(start[1])) * amount,
  ];
}

function projectForNearest(point, referenceLatitude) {
  // A local equirectangular projection is sufficient at the scale of Ciudad
  // Bolívar and, unlike comparing vertices, gives a real nearest point on a
  // segment. The longitude correction prevents the common east/west bias.
  const scale = Math.max(0.1, Math.cos((referenceLatitude * Math.PI) / 180));
  return [point[1] * scale, point[0]];
}

function unprojectForNearest(point, referenceLatitude) {
  const scale = Math.max(0.1, Math.cos((referenceLatitude * Math.PI) / 180));
  return [point[1], point[0] / scale];
}

/**
 * Return the closest geographic point on a [lat, lon] polyline.
 *
 * The returned object intentionally exposes both `point` and `coordinates` as
 * aliases. Existing map consumers generally use arrays, while callers that
 * need metadata can use segmentIndex/pointIndex/t/distanceKm.
 */
export function getNearestPointOnPolyline(point, polyline, options = {}) {
  // Accept the reverse argument order as a small convenience for consumers
  // that naturally think "path, point".
  let query = point;
  let path = polyline;
  if (Array.isArray(point) && point.length > 0 && Array.isArray(point[0]) && validPoint(path)) {
    query = path;
    path = point;
  }

  const queryPoint = toPoint(query);
  const points = normalizePath(path);
  if (!queryPoint || points.length === 0) return null;

  let best = null;
  const consider = (candidate, segmentIndex, amount) => {
    const candidatePoint = copyPoint(candidate);
    if (!candidatePoint) return;
    const distanceKm = haversineKm(queryPoint, candidatePoint);
    if (
      !best ||
      distanceKm < best.distanceKm - 1e-12 ||
      (Math.abs(distanceKm - best.distanceKm) <= 1e-12 && amount < best.t)
    ) {
      const t = Math.max(0, Math.min(1, amount));
      const pointIndex =
        t <= 1e-12
          ? segmentIndex
          : t >= 1 - 1e-12
            ? segmentIndex + 1
            : segmentIndex;
      best = {
        point: candidatePoint,
        coordinates: copyPoint(candidatePoint),
        distanceKm,
        distance: distanceKm,
        segmentIndex,
        pointIndex,
        pathIndex: pointIndex,
        t,
        amount,
      };
    }
  };

  if (points.length === 1) {
    consider(points[0], 0, 0);
  } else {
    const reference = projectForNearest(queryPoint, queryPoint[0]);
    for (let index = 0; index < points.length - 1; index += 1) {
      const start = projectForNearest(points[index], queryPoint[0]);
      const end = projectForNearest(points[index + 1], queryPoint[0]);
      const deltaX = end[0] - start[0];
      const deltaY = end[1] - start[1];
      const lengthSquared = deltaX * deltaX + deltaY * deltaY;
      const amount =
        lengthSquared === 0
          ? 0
          : Math.max(
              0,
              Math.min(
                1,
                ((reference[0] - start[0]) * deltaX +
                  (reference[1] - start[1]) * deltaY) /
                  lengthSquared,
              ),
            );
      const projected = [
        start[0] + deltaX * amount,
        start[1] + deltaY * amount,
      ];
      consider(unprojectForNearest(projected, queryPoint[0]), index, amount);
    }
  }

  if (!best) return null;
  const maxDistanceKm = Number(
    options.maxDistanceKm ?? options.radiusKm ?? options.withinKm,
  );
  if (Number.isFinite(maxDistanceKm) && best.distanceKm > maxDistanceKm) return null;
  return best;
}

export function getNearestGtfsStop(point, options = {}) {
  const pointValue = toPoint(point);
  if (!pointValue) return null;

  let nearest = null;

  GTFS_SERVICE_STOPS.forEach((stop) => {
    const coordinates = [Number(stop.latitude), Number(stop.longitude)];
    const distanceKm = haversineKm(pointValue, coordinates);
    if (!nearest || distanceKm < nearest.distanceKm) {
      nearest = {
        id: stop.id,
        name: stop.name,
        coordinates,
        wheelchairBoarding: stop.wheelchairBoarding,
        routes: getRoutesForStop(stop.id),
        distanceKm,
        source: 'gtfs_20260818',
      };
    }
  });

  if (!nearest) return null;
  const maxDistanceKm = Number(options.maxDistanceKm ?? options.radiusKm);
  if (Number.isFinite(maxDistanceKm) && nearest.distanceKm > maxDistanceKm) {
    return null;
  }

  return nearest;
}

export function getNearbySitpStops(point, options = {}) {
  const pointValue = toPoint(point);
  if (!pointValue) return [];

  const radiusKm = Number(
    options.radiusKm ?? TRANSPORT_ROUTING_OPTIONS.sitpCoverageRadiusKm,
  );
  const maxStops = Number(options.maxStops ?? TRANSPORT_ROUTING_OPTIONS.maxContextStops);

  return GTFS_SERVICE_STOPS.map((stop) => ({
    id: stop.id,
    name: stop.name,
    coordinates: [Number(stop.latitude), Number(stop.longitude)],
    wheelchairBoarding: stop.wheelchairBoarding,
    routes: getRoutesForStop(stop.id),
    source: 'gtfs_20260818',
    distanceKm: haversineKm(pointValue, [stop.latitude, stop.longitude]),
  }))
    .filter((stop) => stop.distanceKm <= radiusKm)
    .sort((left, right) => left.distanceKm - right.distanceKm)
    .slice(0, Number.isFinite(maxStops) && maxStops > 0 ? maxStops : undefined);
}

function buildIntegrationCandidates() {
  return INTEGRATION_CANDIDATES;
}

export function getNearestIntegrationPoint(point, options = {}) {
  const pointValue = toPoint(point);
  if (!pointValue) return null;

  let nearest = null;
  buildIntegrationCandidates().forEach((candidate) => {
    const distanceKm = haversineKm(pointValue, candidate.coordinates);
    if (!nearest || distanceKm < nearest.distanceKm) {
      nearest = {
        ...candidate,
        coordinates: copyPoint(candidate.coordinates),
        distanceKm,
      };
    }
  });

  if (!nearest) return null;
  const maxDistanceKm = Number(options.maxDistanceKm ?? options.radiusKm);
  if (Number.isFinite(maxDistanceKm) && nearest.distanceKm > maxDistanceKm) {
    return null;
  }
  return nearest;
}

function stationPoint(station) {
  return toPoint(station?.coordinates || station);
}

function stationWithDistance(station, point) {
  const coordinates = stationPoint(station);
  if (!coordinates) return null;
  return {
    ...station,
    id: station.id,
    name: station.name,
    coordinates,
    distanceKm: haversineKm(point, coordinates),
    source: 'transmilenio_2026',
    stationId: station.id,
  };
}

export function getNearestTransmicableStation(point, options = {}) {
  const pointValue = toPoint(point);
  if (!pointValue) return null;
  const radiusKm = Number(
    options.radiusKm ??
      options.cableSearchRadiusKm ??
      options.transmicableRadiusKm ??
      options.stationRadiusKm ??
      options.cableStationRadiusKm ??
      options.transmicableStationRadiusKm ??
      TRANSPORT_ROUTING_OPTIONS.cableSearchRadiusKm,
  );

  let nearest = null;
  TRANSMICABLE_STATIONS.forEach((station) => {
    const candidate = stationWithDistance(station, pointValue);
    if (!candidate) return;
    if (candidate.distanceKm > radiusKm) return;
    if (!nearest || candidate.distanceKm < nearest.distanceKm) {
      nearest = candidate;
    }
  });
  return nearest;
}

function stationIndex(station) {
  const knownStation = stationByIdOrPoint(station);
  if (!knownStation) return -1;
  return CABLE_PATH.findIndex((point) =>
    samePoint(point, knownStation.coordinates, 0.02),
  );
}

function stationByIdOrPoint(station) {
  const stationId = station?.stationId || station?.id;
  if (stationId) {
    const byId = TRANSMICABLE_STATIONS.find(
      (candidate) => candidate.id === stationId || candidate.id === String(stationId),
    );
    if (byId) return byId;
  }
  const point = stationPoint(station);
  if (!point) return null;
  return (
    TRANSMICABLE_STATIONS.find((candidate) => samePoint(candidate.coordinates, point, 0.05)) ||
    null
  );
}

/**
 * Extract a continuous segment from the known TransMiCable reference path.
 * The reference path is never used to infer a boarding station; callers must
 * provide known station objects/ids.
 */
export function getCablePathBetweenStations(fromStation, toStation) {
  const fromIndex = stationIndex(fromStation);
  const toIndex = stationIndex(toStation);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return [];

  const path = CABLE_PATH.slice(
    Math.min(fromIndex, toIndex),
    Math.max(fromIndex, toIndex) + 1,
  );
  const ordered = fromIndex <= toIndex ? path : path.slice().reverse();
  const fromPoint = stationPoint(fromStation);
  const toPointValue = stationPoint(toStation);
  if (!fromPoint || !toPointValue) return [];

  const result = ordered.map((point) => copyPoint(point));
  result[0] = copyPoint(fromPoint);
  result[result.length - 1] = copyPoint(toPointValue);
  return joinPaths(result);
}

function getCableExitStation(destination, options = {}) {
  const destinationPoint = toPoint(destination);
  if (!destinationPoint) return null;
  const stations = TRANSMICABLE_STATIONS.map((station) => stationWithDistance(station, destinationPoint));
  stations.sort((left, right) => left.distanceKm - right.distanceKm);
  const nearest = stations[0] || null;
  if (!nearest) return null;
  return {
    ...nearest,
    atDestination:
      nearest.distanceKm <=
      Number(options.coincidenceRadiusKm ?? TRANSPORT_ROUTING_OPTIONS.coincidenceRadiusKm),
  };
}

function routePath(route) {
  return normalizePath(route?.route || route?.path || route?.geometry?.path);
}

function routeIntegrationPoint(route) {
  return toPoint(route?.integration?.coordinates || route?.integration);
}

function routeStops(route) {
  const stops = Array.isArray(route?.stops) ? route.stops : [];
  return stops
    .map((stop) => ({
      ...stop,
      coordinates: copyPoint(stop?.coordinates || stop),
    }))
    .filter((stop) => stop.coordinates);
}

function stopPrecedesIntegration(route, stop) {
  const stops = routeStops(route);
  const stopIndex = stops.findIndex((candidate) => candidate === stop || candidate.id === stop.id);
  const integrationIndex = stops.findIndex(
    (candidate) => candidate.kind === 'integration' || candidate.type === 'integration',
  );
  if (stopIndex >= 0 && integrationIndex >= 0) return stopIndex < integrationIndex;

  const path = routePath(route);
  const stopProjection = getNearestPointOnPolyline(stop.coordinates, path);
  const integrationProjection = getNearestPointOnPolyline(routeIntegrationPoint(route), path);
  if (!stopProjection || !integrationProjection) return false;
  return stopProjection.pathIndex < integrationProjection.pathIndex;
}

function pathFromParadero(route, paradero) {
  const path = routePath(route);
  if (path.length < 2 || !paradero?.coordinates) return [];

  const projection = getNearestPointOnPolyline(paradero.coordinates, path);
  if (!projection) return [];
  const stopPoint = copyPoint(paradero.coordinates);
  const pieces = [stopPoint];
  if (projection.point && !samePoint(stopPoint, projection.point)) {
    pieces.push(copyPoint(projection.point));
  }

  const startIndex = projection.t >= 1 - 1e-12
    ? projection.pointIndex
    : projection.t <= 1e-12
      ? projection.pointIndex
      : projection.pointIndex + 1;
  for (let index = Math.max(0, startIndex); index < path.length; index += 1) {
    pieces.push(path[index]);
  }

  const integrationPoint = routeIntegrationPoint(route);
  if (integrationPoint) pieces.push(integrationPoint);
  return joinPaths(pieces);
}

function stopKindRank(stop) {
  if (stop?.kind === 'pickup' || stop?.type === 'pickup') return 0;
  if (stop?.kind === 'transfer' || stop?.type === 'transfer') return 1;
  return 2;
}

function veredalRadius(options = {}) {
  return Number(
    options.radiusKm ??
      options.veredalRadiusKm ??
      options.veredalParaderoRadiusKm ??
      options.paraderoRadiusKm ??
      options.paraderoSearchRadiusKm ??
      options.pickupRadiusKm ??
      options.veredalSearchRadiusKm ??
      TRANSPORT_ROUTING_OPTIONS.veredalSearchRadiusKm,
  );
}

function compareVeredalCandidates(left, right) {
  const distanceDelta = left.boardingDistanceKm - right.boardingDistanceKm;
  if (Math.abs(distanceDelta) > 1e-9) return distanceDelta;
  const kindDelta = stopKindRank(left.paradero) - stopKindRank(right.paradero);
  if (kindDelta !== 0) return kindDelta;
  const corridorDelta = left.routeDistanceKm - right.routeDistanceKm;
  if (Math.abs(corridorDelta) > 1e-9) return corridorDelta;
  return String(left.route.id).localeCompare(String(right.route.id));
}

export function getVeredalRouteCandidates(point, options = {}) {
  const pointValue = toPoint(point);
  if (!pointValue) return [];
  const radiusKm = veredalRadius(options);
  const candidates = [];

  VEREDAL_ROUTES.forEach((route) => {
    const path = routePath(route);
    if (path.length < 2) return;
    const corridor = getNearestPointOnPolyline(pointValue, path);
    const integrationPoint = routeIntegrationPoint(route);
    if (!corridor || !integrationPoint) return;

    routeStops(route).forEach((stop) => {
      if (stop.kind === 'integration' || stop.type === 'integration') return;
      if (!stopPrecedesIntegration(route, stop)) return;
      const boardingDistanceKm = haversineKm(pointValue, stop.coordinates);
      if (!Number.isFinite(boardingDistanceKm) || boardingDistanceKm > radiusKm) return;

      const firstPath = pathFromParadero(route, stop);
      if (firstPath.length < 2) return;
      candidates.push({
        id: route.id,
        mode: 'veredal',
        type: 'veredal',
        route,
        veredalRoute: route,
        paradero: stop,
        pickup: stop,
        pickupStop: stop,
        boardingPoint: copyPoint(stop.coordinates),
        boardingDistanceKm,
        distanceKm: boardingDistanceKm,
        routeDistanceKm: corridor.distanceKm,
        nearestPoint: corridor,
        path: firstPath,
        integration: route.integration,
        source: 'simulated_veredal_fixture',
        dataStatus: 'simulated',
        simulated: true,
        available: true,
      });
    });
  });

  return candidates.sort(compareVeredalCandidates);
}

export function getNearestVeredalRoute(point, options = {}) {
  return getVeredalRouteCandidates(point, options)[0] || null;
}

function getRouteModes(activeRoute) {
  const modes = new Set(
    (activeRoute?.segments || [])
      .map((segment) => segment?.type)
      .filter(Boolean),
  );
  if (activeRoute?.mode && !modes.has(activeRoute.mode)) modes.add(activeRoute.mode);
  return modes;
}

function uniqueStops(...groups) {
  const seen = new Set();
  const result = [];
  groups.flat(Infinity).forEach((stop) => {
    if (!stop) return;
    const coordinates = toPoint(stop?.coordinates || stop);
    if (!coordinates) return;
    const key = `${stop.id || stop.name || ''}:${pointKey(coordinates)}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push({
      ...stop,
      coordinates,
    });
  });
  return result.slice(0, TRANSPORT_ROUTING_OPTIONS.maxContextStops);
}

function getCableRadius(options) {
  return Number(
    options.radiusKm ??
      options.cableRadiusKm ??
      options.transmicableRadiusKm ??
      options.stationRadiusKm ??
      options.cableStationRadiusKm ??
      options.transmicableStationRadiusKm ??
      options.cableSearchRadiusKm ??
      TRANSPORT_ROUTING_OPTIONS.cableSearchRadiusKm,
  );
}

function getCoincidenceRadius(options = {}) {
  return Number(
    options.coincidenceRadiusKm ??
      options.stationArrivalRadiusKm ??
      TRANSPORT_ROUTING_OPTIONS.coincidenceRadiusKm,
  );
}

function buildCableCandidate(origin, destination, options = {}) {
  const station = getNearestTransmicableStation(origin, {
    ...options,
    radiusKm: getCableRadius(options),
  });
  if (!station) return null;

  const exitStation = destination
    ? getCableExitStation(destination, {
        ...options,
        coincidenceRadiusKm: getCoincidenceRadius(options),
      })
    : null;
  const path = exitStation
    ? getCablePathBetweenStations(station, exitStation)
    : [];

  return {
    id: `cable-${station.id}`,
    mode: 'cable',
    type: 'cable',
    station,
    boardingStation: station,
    boardingPoint: copyPoint(station.coordinates),
    boardingDistanceKm: station.distanceKm,
    distanceKm: station.distanceKm,
    exitStation,
    exitPoint: exitStation ? copyPoint(exitStation.coordinates) : null,
    exitDistanceKm: exitStation?.distanceKm ?? null,
    destinationAtStation: Boolean(exitStation?.atDestination),
    path,
    source: 'transmilenio_2026',
    dataStatus: 'verified',
    simulated: false,
    available: true,
  };
}

function buildSitpCandidate(originStop) {
  if (!originStop) return null;
  return {
    id: `sitp-${originStop.id}`,
    mode: 'sitp',
    type: 'sitp',
    stop: originStop,
    originStop,
    boardingPoint: copyPoint(originStop.coordinates),
    boardingDistanceKm: originStop.distanceKm,
    distanceKm: originStop.distanceKm,
    source: 'gtfs_20260818',
    dataStatus: 'snapshot-no-shapes',
    coverageOnly: true,
    simulated: false,
    available: true,
  };
}

function getBoardingLabel(candidate) {
  if (candidate.mode === 'cable') return candidate.boardingStation?.name || 'Estación TransMiCable';
  if (candidate.mode === 'veredal') return candidate.paradero?.name || 'Paradero veredal';
  return candidate.stop?.name || 'Paradero SITP';
}

function getBoardingPoint(candidate) {
  return candidate.boardingPoint || candidate.stop?.coordinates || null;
}

function getBoardingSource(candidate) {
  return candidate.source || 'transport_snapshot';
}

function makeTransferRequest({ fromPoint, toPoint: targetPoint, fromLabel, toLabel, role }) {
  const fromLocation = makeRequestLocation(fromPoint, fromLabel);
  const toLocation = makeRequestLocation(targetPoint, toLabel);
  if (!fromLocation || !toLocation) return null;
  const requestKey = getRoadRouteKey(fromLocation, toLocation);
  if (!requestKey) return null;
  return {
    requestKey,
    role,
    fromLocation,
    toLocation,
    fromPoint: copyPoint(fromPoint),
    toPoint: copyPoint(targetPoint),
  };
}

function roadResultPath(result) {
  if (!result || typeof result !== 'object') return [];
  const directPaths = [result.mapPath, result.path, result.routePath];
  for (const path of directPaths) {
    const normalized = normalizePath(path);
    if (normalized.length >= 2) return normalized;
  }

  const coordinates = result.geometry?.coordinates;
  if (Array.isArray(coordinates)) {
    const normalized = coordinates
      .map((coordinate) => {
        if (!Array.isArray(coordinate) || coordinate.length < 2) return null;
        const longitude = Number(coordinate[0]);
        const latitude = Number(coordinate[1]);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
        return [latitude, longitude];
      })
      .filter(Boolean);
    if (normalized.length >= 2) return normalized;
  }

  if (Array.isArray(result.geometry?.segments)) {
    return joinPaths(
      ...result.geometry.segments.map((segment) => {
        if (Array.isArray(segment)) return segment;
        return segment?.coordinates || segment?.mapPath || [];
      }),
    );
  }
  return [];
}

function resolveTransferRequest(request, transferRoutes) {
  if (!request || !transferRoutes || typeof transferRoutes !== 'object') {
    return { status: 'pending', path: [], result: null };
  }
  if (!Object.prototype.hasOwnProperty.call(transferRoutes, request.requestKey)) {
    return { status: 'pending', path: [], result: null };
  }

  const result = transferRoutes[request.requestKey];
  // A result carrying its own key must agree with the map key. This prevents
  // a stale Home response from being applied to a different leg.
  if (result?.requestKey && result.requestKey !== request.requestKey) {
    return { status: 'pending', path: [], result: null };
  }
  const path = roadResultPath(result);
  if (path.length < 2) return { status: 'pending', path: [], result };
  const orientedPath =
    samePoint(path[0], request.toPoint, 0.01) &&
    samePoint(path[path.length - 1], request.fromPoint, 0.01)
      ? path.slice().reverse()
      : path;
  return { status: 'ready', path: orientedPath, result };
}

function addOrderedLeg(legs, leg) {
  const orderedLeg = { order: legs.length + 1, ...leg };
  legs.push(orderedLeg);
  return orderedLeg;
}

function buildApproach({
  origin,
  originLocation,
  candidate,
  legs,
  routingRequests,
  transferRoutes,
  options,
}) {
  const boardingPoint = getBoardingPoint(candidate);
  const boardingLabel = getBoardingLabel(candidate);
  const fromLabel = labelFor(originLocation, 'Origen');
  const toLabel = boardingLabel;
  const fromLocation = makeLocation(origin, fromLabel);
  const toLocation = makeLocation(boardingPoint, toLabel);
  const base = {
    mode: 'walk',
    modeLabel:
      candidate.mode === 'veredal'
        ? 'Van veredal'
        : candidate.mode === 'cable'
          ? 'TransMiCable'
          : 'SITP',
    from: fromLocation,
    to: toLocation,
    distanceKm:
      origin && boardingPoint ? haversineKm(origin, boardingPoint) : null,
    path: [],
    requestKey: null,
    status: 'unavailable',
    source: 'osrm',
    dataStatus: 'unavailable',
  };

  if (!origin || !boardingPoint) return { access: base, request: null, leg: null };
  if (samePoint(origin, boardingPoint, getCoincidenceRadius(options))) {
    return {
      access: {
        ...base,
        status: 'not-required',
        dataStatus: 'not-required',
        source: 'known-boarding-point',
      },
      request: null,
      leg: null,
    };
  }

  const request = makeTransferRequest({
    fromPoint: origin,
    toPoint: boardingPoint,
    fromLabel,
    toLabel,
    role: 'approach',
  });
  if (!request) return { access: base, request: null, leg: null };

  routingRequests.push({
    requestKey: request.requestKey,
    role: request.role,
    fromLocation: request.fromLocation,
    toLocation: request.toLocation,
  });
  const resolved = resolveTransferRequest(request, transferRoutes);
  const leg = addOrderedLeg(legs, {
    role: 'access',
    mode: 'walk',
    label: `Caminata a ${toLabel}`,
    from: fromLocation,
    to: toLocation,
    path: resolved.path,
    status: resolved.status,
    source: resolved.status === 'ready' ? 'osrm' : 'osrm_requested',
    dataStatus: resolved.status === 'ready' ? 'verified' : 'pending',
    simulated: false,
  });
  return {
    access: {
      ...base,
      path: resolved.path,
      requestKey: request.requestKey,
      status: resolved.status,
      source: leg.source,
      dataStatus: leg.dataStatus,
    },
    request,
    leg,
  };
}

function buildOnwardRoad({
  fromPoint,
  toPoint: destinationPoint,
  fromLabel,
  destinationLocation,
  legs,
  routingRequests,
  transferRoutes,
  options,
}) {
  if (!fromPoint || !destinationPoint) return null;
  if (samePoint(fromPoint, destinationPoint, getCoincidenceRadius(options))) return null;

  const toLabel = labelFor(destinationLocation, 'Destino');
  const request = makeTransferRequest({
    fromPoint,
    toPoint: destinationPoint,
    fromLabel,
    toLabel,
    role: 'onward',
  });
  if (!request) return null;
  routingRequests.push({
    requestKey: request.requestKey,
    role: request.role,
    fromLocation: request.fromLocation,
    toLocation: request.toLocation,
  });
  const resolved = resolveTransferRequest(request, transferRoutes);
  return addOrderedLeg(legs, {
    role: 'onward',
    mode: 'road',
    label: `Conexión vial a ${toLabel}`,
    from: makeLocation(fromPoint, fromLabel),
    to: makeLocation(destinationPoint, toLabel),
    path: resolved.path,
    status: resolved.status,
    source: resolved.status === 'ready' ? 'osrm' : 'osrm_requested',
    dataStatus: resolved.status === 'ready' ? 'verified' : 'pending',
    simulated: false,
  });
}

function makeCableLeg({ fromStation, toStation, path, role, label }) {
  if (!path || path.length < 2 || !fromStation || !toStation) return null;
  return {
    role,
    mode: 'cable',
    label: label || `TransMiCable · ${fromStation.name} → ${toStation.name}`,
    from: makeLocation(fromStation.coordinates, fromStation.name),
    to: makeLocation(toStation.coordinates, toStation.name),
    path: normalizePath(path),
    status: 'ready',
    source: 'transmilenio_2026',
    dataStatus: 'verified',
    simulated: false,
  };
}

function makeVanLeg({ candidate }) {
  if (!candidate?.path || candidate.path.length < 2) return null;
  const fromLabel = candidate.paradero?.name || 'Paradero veredal';
  const integration = candidate.integration;
  const toLabel = integration?.name || 'Integración';
  return {
    role: 'first',
    mode: 'veredal',
    label: `Van veredal · ${fromLabel} → ${toLabel}`,
    from: makeLocation(candidate.boardingPoint, fromLabel),
    to: makeLocation(integration?.coordinates || integration, toLabel),
    path: normalizePath(candidate.path),
    status: 'ready',
    source: 'simulated_veredal_fixture',
    dataStatus: 'simulated',
    simulated: true,
  };
}

function buildCableLegs({
  candidate,
  origin,
  originLocation,
  destination,
  destinationLocation,
  transferRoutes,
  options,
}) {
  const legs = [];
  const routingRequests = [];
  const access = buildApproach({
    origin,
    originLocation,
    candidate,
    legs,
    routingRequests,
    transferRoutes,
    options,
  });

  const cablePath = candidate.path || [];
  let cableLeg = null;
  if (cablePath.length >= 2) {
    cableLeg = makeCableLeg({
      fromStation: candidate.boardingStation,
      toStation: candidate.exitStation,
      path: cablePath,
      role: 'first',
    });
    if (cableLeg) addOrderedLeg(legs, cableLeg);
  }

  let onwardRoad = null;
  if (destination && candidate.exitStation) {
    onwardRoad = buildOnwardRoad({
      fromPoint: candidate.exitStation.coordinates,
      toPoint: destination,
      fromLabel: candidate.exitStation.name,
      destinationLocation,
      legs,
      routingRequests,
      transferRoutes,
      options,
    });
  }

  const continuationPath = onwardRoad?.path?.length
    ? onwardRoad.path
    : [];
  return {
    legs,
    routingRequests,
    access: access.access,
    cableLeg,
    onwardRoad,
    routePath: cablePath,
    continuationPath,
    integration: candidate.exitStation || candidate.boardingStation || null,
    firstPath: cablePath,
  };
}

function buildVanLegs({
  candidate,
  origin,
  originLocation,
  destination,
  destinationLocation,
  transferRoutes,
  options,
}) {
  const legs = [];
  const routingRequests = [];
  const access = buildApproach({
    origin,
    originLocation,
    candidate,
    legs,
    routingRequests,
    transferRoutes,
    options,
  });
  const vanLeg = makeVanLeg({ candidate });
  if (vanLeg) addOrderedLeg(legs, vanLeg);

  const integration = candidate.integration;
  const integrationPoint = toPoint(integration?.coordinates || integration);
  const integrationStation = stationByIdOrPoint(integration);
  let cableLeg = null;
  let onwardRoad = null;
  let cablePath = [];

  if (destination && integrationPoint) {
    const exitStation = integrationStation
      ? getCableExitStation(destination, {
          ...options,
          coincidenceRadiusKm: getCoincidenceRadius(options),
        })
      : null;
    if (integrationStation && exitStation) {
      cablePath = getCablePathBetweenStations(integrationStation, exitStation);
      if (cablePath.length >= 2) {
        cableLeg = makeCableLeg({
          fromStation: integrationStation,
          toStation: exitStation,
          path: cablePath,
          role: 'onward',
        });
        if (cableLeg) addOrderedLeg(legs, cableLeg);
      }
      if (!exitStation.atDestination) {
        onwardRoad = buildOnwardRoad({
          fromPoint: exitStation.coordinates,
          toPoint: destination,
          fromLabel: exitStation.name,
          destinationLocation,
          legs,
          routingRequests,
          transferRoutes,
          options,
        });
      }
    } else {
      // A non-cable integration is still allowed to use a verified road
      // handoff; no straight placeholder is drawn while OSRM is pending.
      onwardRoad = buildOnwardRoad({
        fromPoint: integrationPoint,
        toPoint: destination,
        fromLabel: integration?.name || 'Integración',
        destinationLocation,
        legs,
        routingRequests,
        transferRoutes,
        options,
      });
    }
  }

  const continuationPieces = [];
  if (cableLeg?.path?.length) continuationPieces.push(cableLeg.path);
  if (onwardRoad?.path?.length) continuationPieces.push(onwardRoad.path);
  const continuationPath = continuationPieces.length
    ? joinPaths(...continuationPieces)
    : integrationPoint && (!destination || !integrationStation)
      ? [copyPoint(integrationPoint)]
      : integrationPoint
        ? [copyPoint(integrationPoint)]
        : [];

  return {
    legs,
    routingRequests,
    access: access.access,
    cableLeg,
    onwardRoad,
    routePath: candidate.path || [],
    continuationPath,
    integration: integrationStation
      ? { ...integration, stationId: integrationStation.id, kind: 'cable_station' }
      : integration,
    firstPath: candidate.path || [],
  };
}

function buildSitpLegs({
  candidate,
  origin,
  originLocation,
  destination,
  destinationLocation,
  transferRoutes,
  options,
}) {
  const legs = [];
  const routingRequests = [];
  const access = buildApproach({
    origin,
    originLocation,
    candidate,
    legs,
    routingRequests,
    transferRoutes,
    options,
  });

  // The GTFS snapshot deliberately contributes a boarding/coverage fact, not
  // an invented itinerary. In particular, matchedStops is not treated as a
  // sequence and no straight A-B line is manufactured here.
  if (destination) {
    addOrderedLeg(legs, {
      role: 'first',
      mode: 'sitp',
      label: 'Cobertura SITP · snapshot sin itineraria ni shapes',
      from: makeLocation(candidate.stop.coordinates, candidate.stop.name),
      to: makeLocation(destination, labelFor(destinationLocation, 'Destino')),
      path: [],
      status: 'coverage-only',
      source: 'gtfs_20260818',
      dataStatus: 'snapshot-no-shapes',
      simulated: false,
    });
  }

  return {
    legs,
    routingRequests,
    access: access.access,
    cableLeg: null,
    onwardRoad: null,
    routePath: [],
    continuationPath: [],
    integration: null,
    firstPath: [],
  };
}

function getPrice({ mode, legs }) {
  const hasVan = mode === 'veredal' || legs.some((leg) => leg.mode === 'veredal');
  const hasCable = mode === 'cable' || legs.some((leg) => leg.mode === 'cable');
  const hasSitp = mode === 'sitp' || legs.some((leg) => leg.mode === 'sitp');
  const freeModes = [...new Set(
    legs
      .map((leg) => leg.mode)
      .filter((legMode) => legMode === 'walk' || legMode === 'road'),
  )];
  const freeComponents = freeModes.map((legMode) => ({
    mode: legMode,
    label: legMode === 'walk' ? 'Caminata' : 'Conexión vial',
    knownCop: 0,
    estimateCop: 0,
    amountCop: 0,
    formatted: '$0',
    status: 'known',
  }));

  if (hasVan && (hasCable || hasSitp)) {
    return {
      currency: 'COP',
      knownCop: 3550,
      estimateCop: 6050,
      formatted: '$3.550 + van por confirmar',
      status: 'partial',
      components: [
        ...freeComponents,
        {
          mode: 'veredal',
          label: 'Van veredal',
          knownCop: 0,
          estimateCop: 2500,
          amountCop: 2500,
          formatted: 'van por confirmar',
          status: 'pending',
        },
        {
          mode: hasCable ? 'cable' : 'sitp',
          label: hasCable ? 'TransMiCable' : 'SITP',
          knownCop: 3550,
          estimateCop: 3550,
          amountCop: 3550,
          formatted: '$3.550',
          status: 'known',
        },
      ],
    };
  }

  if (hasVan) {
    return {
      currency: 'COP',
      knownCop: 0,
      estimateCop: 2500,
      formatted: 'Van por confirmar',
      status: 'partial',
      components: [
        ...freeComponents,
        {
          mode: 'veredal',
          label: 'Van veredal',
          knownCop: 0,
          estimateCop: 2500,
          amountCop: 2500,
          formatted: 'van por confirmar',
          status: 'pending',
        },
      ],
    };
  }

  if (hasCable || hasSitp) {
    const formalMode = hasCable ? 'cable' : 'sitp';
    return {
      currency: 'COP',
      knownCop: 3550,
      estimateCop: 3550,
      formatted: '$3.550 COP',
      status: 'known',
      components: [
        ...freeComponents,
        {
          mode: formalMode,
          label: formalMode === 'cable' ? 'TransMiCable' : 'SITP',
          knownCop: 3550,
          estimateCop: 3550,
          amountCop: 3550,
          formatted: '$3.550',
          status: 'known',
        },
      ],
    };
  }

  return {
    currency: 'COP',
    knownCop: 0,
    estimateCop: 0,
    formatted: '$0',
    status: 'known',
    components: freeComponents,
  };
}

function isCompletePlan({ destination, legs }) {
  if (!destination) return false;
  return legs.every((leg) => leg.status === 'ready' || leg.status === 'not-required');
}

function getModeLabel(mode, hasCable, hasSitp) {
  if (mode === 'veredal') {
    return hasCable ? 'Van veredal + TransMiCable' : 'Van veredal';
  }
  if (mode === 'cable') return 'TransMiCable';
  if (mode === 'sitp') return hasSitp ? 'SITP (cobertura GTFS)' : 'SITP';
  return 'Sin transporte confirmado';
}

function getSourceFor(mode) {
  if (mode === 'veredal') return 'simulated_veredal_fixture';
  if (mode === 'cable') return 'transmilenio_2026';
  if (mode === 'sitp') return 'gtfs_20260818';
  return 'transport_plan_snapshot';
}

function getSourceNoteFor(mode, candidate, hasCable) {
  if (mode === 'veredal') {
    return candidate?.route?.sourceNote ||
      'Recorrido veredal de demostración; no es un servicio oficial verificado.';
  }
  if (mode === 'cable') {
    return 'TransMiCable referencia de estaciones y geometría del fixture; verifica operación y condiciones actuales.';
  }
  if (mode === 'sitp') {
    return 'El snapshot GTFS confirma cobertura de paradas, pero no incluye itineraria ni shapes de rutas.';
  }
  return 'No se encontró un candidato de transporte confirmado para este origen.';
}

function buildFinalPlan({
  status,
  requestedMode,
  mode,
  origin,
  destination,
  originLocation,
  destinationLocation,
  originStop,
  destinationStop,
  nearestIntegration,
  integration,
  availableModes,
  activeRoute,
  candidate,
  candidates,
  contextStops,
  access,
  legs,
  routingRequests,
  routePath,
  continuationPath,
  firstPath,
  showCable,
  reason,
  options,
}) {
  const fitPath = joinPaths(...legs.map((leg) => leg.path || []));
  const complete = isCompletePlan({ destination, legs });
  const modes = [];
  legs.forEach((leg) => {
    if (leg.mode && !modes.includes(leg.mode)) modes.push(leg.mode);
  });
  if (mode && mode !== 'none' && !modes.includes(mode)) modes.push(mode);
  const geometrySegments = legs.map((leg) => ({
    order: leg.order,
    role: leg.role,
    mode: leg.mode,
    from: leg.from,
    to: leg.to,
    path: normalizePath(leg.path),
    status: leg.status,
    source: leg.source,
    dataStatus: leg.dataStatus,
    simulated: Boolean(leg.simulated),
  }));
  const selectionStatus =
    mode === 'none'
      ? requestedMode === 'auto'
        ? 'no-candidate'
        : 'unavailable'
      : 'selected';
  const selection = {
    requestedMode,
    selectedMode: requestedMode,
    mode,
    status: selectionStatus,
    available: availableModes.includes(mode),
    reason,
    candidateId: candidate?.id || null,
    boardingDistanceKm: candidate?.boardingDistanceKm ?? null,
    requiresTransferRoutes: routingRequests.length > 0,
    complete,
  };

  return {
    schemaVersion: 'transport-plan.v2',
    status,
    mode,
    origin,
    destination,
    originStop,
    destinationStop,
    nearestIntegration,
    modeLabel: getModeLabel(mode, showCable, mode === 'sitp'),
    selectedMode: requestedMode,
    availableModes,
    modesUsed: modes,
    showCable: Boolean(showCable),
    access: access || {
      status: 'unavailable',
      mode: 'walk',
      modeLabel: 'Transporte cercano',
      from: makeLocation(origin, labelFor(originLocation, 'Origen')),
      to: null,
      path: [],
      requestKey: null,
      source: 'transport_plan_snapshot',
      dataStatus: 'unavailable',
    },
    integration: integration || null,
    candidates,
    legs,
    routingRequests,
    geometry: {
      segments: geometrySegments,
      fitPath,
      complete,
    },
    price: getPrice({ mode, legs }),
    contextStops: contextStops || [],
    veredalRoute: mode === 'veredal' ? candidate?.route || null : null,
    // Keep the existing consumer field. It is metadata only: none of the
    // plan geometry below reads activeRoute.mapPath as an A-B transit leg.
    activeRoute: activeRoute || null,
    routePath: normalizePath(routePath),
    continuationPath: normalizePath(continuationPath),
    fitPath,
    simulated: mode === 'veredal',
    source: getSourceFor(mode),
    sourceNote: getSourceNoteFor(mode, candidate, showCable),
    reason,
    selection,
  };
}

function chooseCandidate({ requestedMode, cableCandidate, veredalCandidate, sitpCandidate, options }) {
  if (requestedMode === 'cable') {
    return cableCandidate || null;
  }
  if (requestedMode === 'veredal') return veredalCandidate || null;
  if (requestedMode === 'sitp') return sitpCandidate || null;
  if (requestedMode !== 'auto') return null;

  if (cableCandidate && veredalCandidate) {
    const distanceDifference = Math.abs(
      cableCandidate.boardingDistanceKm - veredalCandidate.boardingDistanceKm,
    );
    const tieRadius = Number(
      options.cablePreferenceTieKm ?? TRANSPORT_ROUTING_OPTIONS.cablePreferenceTieKm,
    );
    if (distanceDifference <= tieRadius) return cableCandidate;
    return cableCandidate.boardingDistanceKm < veredalCandidate.boardingDistanceKm
      ? cableCandidate
      : veredalCandidate;
  }
  return cableCandidate || veredalCandidate || sitpCandidate || null;
}

function getContextStops({ mode, candidate, nearbyStops, destinationStop, options }) {
  const limit = Number(options.maxContextStops ?? TRANSPORT_ROUTING_OPTIONS.maxContextStops);
  let stops = [];
  if (mode === 'veredal' && candidate?.route?.stops) {
    stops = candidate.route.stops;
  } else if (mode === 'cable' && candidate) {
    stops = [
      ...nearbyStops,
      candidate.boardingStation
        ? { ...candidate.boardingStation, kind: 'integration', source: 'transmilenio_2026' }
        : null,
      candidate.exitStation
        ? { ...candidate.exitStation, kind: 'integration', source: 'transmilenio_2026' }
        : null,
    ];
  } else {
    stops = [...nearbyStops, destinationStop];
  }
  return uniqueStops(stops).slice(0, Number.isFinite(limit) && limit > 0 ? limit : undefined);
}

function getReason({ mode, candidate, destination, complete, sitpSnapshot = false }) {
  if (mode === 'cable' && candidate) {
    const exit = candidate.exitStation?.name || 'la estación de salida';
    let reason = `Se aborda TransMiCable en ${candidate.boardingStation.name} y se continúa hacia ${exit}.`;
    if (destination && !complete) reason += ' La conexión OSRM queda pendiente.';
    if (!destination) reason += ' Selecciona un destino para resolver la conexión.';
    return reason;
  }
  if (mode === 'veredal' && candidate) {
    let reason = `Se propone una van veredal desde ${candidate.paradero.name} hasta ${candidate.integration?.name || 'la integración'}.`;
    if (candidate.path?.length) reason += ' El primer tramo usa la geometría veredal del fixture.';
    if (destination && !complete) reason += ' La conexión OSRM queda pendiente.';
    if (!destination) reason += ' Selecciona un destino para completar el segundo tramo.';
    return reason;
  }
  if (mode === 'sitp') {
    return sitpSnapshot
      ? 'La parada GTFS cubre el origen; el snapshot no tiene itineraria ni shapes, por lo que no se dibuja una secuencia SITP.'
      : 'Se muestra la cobertura SITP del origen.';
  }
  if (mode === 'none') {
    return 'No hay una estación TransMiCable, un paradero veredal conocido ni una parada GTFS dentro del radio configurado.';
  }
  return 'Se construyó un plan de transporte multimodal.';
}

export function getTransportPlan({
  originLocation = null,
  destinationLocation = null,
  activeRoute = null,
  selectedMode = 'auto',
  transferRoutes = {},
  options = {},
} = {}) {
  const requestedMode =
    typeof selectedMode === 'string' && selectedMode.trim()
      ? selectedMode.trim().toLowerCase()
      : 'auto';
  const routingOptions = {
    ...TRANSPORT_ROUTING_OPTIONS,
    ...(options && typeof options === 'object' ? options : {}),
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

  const cableCandidate = origin
    ? buildCableCandidate(origin, destination, routingOptions)
    : null;
  const veredalCandidate = origin
    ? getNearestVeredalRoute(origin, routingOptions)
    : null;
  const sitpCandidate = origin ? buildSitpCandidate(originStop) : null;
  const candidates = [cableCandidate, veredalCandidate, sitpCandidate]
    .filter(Boolean)
    .sort((left, right) => {
      const primaryDifference = left.boardingDistanceKm - right.boardingDistanceKm;
      if (Math.abs(primaryDifference) > 1e-9) return primaryDifference;
      const priority = { cable: 0, veredal: 1, sitp: 2 };
      return (priority[left.mode] ?? 9) - (priority[right.mode] ?? 9);
    });
  const availableModes = [];
  if (sitpCandidate) availableModes.push('sitp');
  if (veredalCandidate) availableModes.push('veredal');
  if (cableCandidate) availableModes.push('cable');

  const nearestIntegration = origin ? getNearestIntegrationPoint(origin) : null;
  if (!origin) {
    return buildFinalPlan({
      status: destination ? 'destination-selected' : 'idle',
      requestedMode,
      mode: 'none',
      origin,
      destination,
      originLocation,
      destinationLocation,
      originStop,
      destinationStop,
      nearestIntegration: null,
      integration: null,
      availableModes,
      activeRoute,
      candidate: null,
      candidates,
      contextStops: [],
      access: null,
      legs: [],
      routingRequests: [],
      routePath: [],
      continuationPath: [],
      firstPath: [],
      showCable: false,
      reason: 'Selecciona un origen para encontrar transporte cercano.',
      options: routingOptions,
    });
  }

  const candidate = chooseCandidate({
    requestedMode,
    cableCandidate,
    veredalCandidate,
    sitpCandidate,
    options: routingOptions,
  });
  const mode = candidate?.mode || 'none';
  const isExplicitUnavailable = requestedMode !== 'auto' && !candidate;
  const status = isExplicitUnavailable
    ? 'mode-unavailable'
    : mode === 'none'
      ? destination
        ? 'destination-selected'
        : 'origin-selected'
      : destination
        ? mode === 'veredal'
          ? 'veredal-route'
          : 'route-selected'
        : 'origin-selected';

  let built = null;
  if (candidate?.mode === 'cable') {
    built = buildCableLegs({
      candidate,
      origin,
      originLocation,
      destination,
      destinationLocation,
      transferRoutes,
      options: routingOptions,
    });
  } else if (candidate?.mode === 'veredal') {
    built = buildVanLegs({
      candidate,
      origin,
      originLocation,
      destination,
      destinationLocation,
      transferRoutes,
      options: routingOptions,
    });
  } else if (candidate?.mode === 'sitp') {
    built = buildSitpLegs({
      candidate,
      origin,
      originLocation,
      destination,
      destinationLocation,
      transferRoutes,
      options: routingOptions,
    });
  } else {
    built = {
      legs: [],
      routingRequests: [],
      access: {
        status: 'unavailable',
        mode: 'walk',
        modeLabel: 'Transporte cercano',
        from: makeLocation(origin, labelFor(originLocation, 'Origen')),
        to: null,
        distanceKm: null,
        path: [],
        requestKey: null,
        source: 'transport_plan_snapshot',
        dataStatus: 'unavailable',
      },
      cableLeg: null,
      onwardRoad: null,
      routePath: [],
      continuationPath: [],
      integration: null,
      firstPath: [],
    };
  }

  const contextStops = getContextStops({
    mode,
    candidate,
    nearbyStops,
    destinationStop,
    options: routingOptions,
  });
  const showCable = Boolean(
    mode === 'cable' || built.legs.some((leg) => leg.mode === 'cable'),
  );
  const preliminaryReason = isExplicitUnavailable
    ? `El modo ${requestedMode} no está disponible cerca del origen; no se aplica un fallback silencioso.`
    : getReason({
        mode,
        candidate,
        destination,
        complete: isCompletePlan({ destination, legs: built.legs }),
        sitpSnapshot: mode === 'sitp',
      });

  return buildFinalPlan({
    status,
    requestedMode,
    mode,
    origin,
    destination,
    originLocation,
    destinationLocation,
    originStop,
    destinationStop,
    nearestIntegration:
      mode === 'veredal'
        ? candidate?.integration || nearestIntegration
        : mode === 'cable'
          ? built.integration || nearestIntegration
          : nearestIntegration,
    integration: built.integration,
    availableModes,
    activeRoute,
    candidate,
    candidates,
    contextStops,
    access: built.access,
    legs: built.legs,
    routingRequests: built.routingRequests,
    routePath: built.routePath,
    continuationPath: built.continuationPath,
    firstPath: built.firstPath,
    showCable,
    reason: preliminaryReason,
    options: routingOptions,
  });
}
