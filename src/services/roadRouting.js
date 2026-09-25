import { hasLocationCoordinates } from '../utils/locationRoute.js';

const DEFAULT_ROUTING_BASE_URL = 'https://router.project-osrm.org';
const DEFAULT_TIMEOUT_MS = 9000;

const configuredBaseUrl = import.meta.env?.VITE_ROUTING_API_URL;
const ROUTING_BASE_URL = String(configuredBaseUrl || DEFAULT_ROUTING_BASE_URL).replace(/\/+$/, '');

function readTimeout(value) {
  const timeout = Number(value);
  return Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS;
}

function getCoordinate(location) {
  if (!hasLocationCoordinates(location)) return null;

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return [latitude, longitude];
}

function getPointKey(point) {
  return `${Number(point[0]).toFixed(5)},${Number(point[1]).toFixed(5)}`;
}

function withExactEndpoints(path, origin, destination) {
  const points = Array.isArray(path) ? path : [];
  if (points.length === 0) return [origin, destination];

  const firstPointKey = getPointKey(points[0]);
  const lastPointKey = getPointKey(points[points.length - 1]);
  const originPoint = firstPointKey === getPointKey(origin) ? [] : [origin];
  const destinationPoint = lastPointKey === getPointKey(destination) ? [] : [destination];

  return [...originPoint, ...points, ...destinationPoint];
}

function parseRoute(route) {
  const coordinates = route?.geometry?.coordinates;
  if (!Array.isArray(coordinates)) return null;

  const mapPath = coordinates
    .map((coordinate) => {
      if (!Array.isArray(coordinate) || coordinate.length < 2) return null;
      const longitude = Number(coordinate[0]);
      const latitude = Number(coordinate[1]);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
      return [latitude, longitude];
    })
    .filter(Boolean);

  const distanceMeters = Number(route.distance);
  const durationSeconds = Number(route.duration);
  if (mapPath.length < 2 || !Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    return null;
  }

  return {
    mapPath,
    distanceMeters,
    durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
  };
}

export class RoadRoutingError extends Error {
  constructor(message, code = 'routing_error', status = 0) {
    super(message);
    this.name = 'RoadRoutingError';
    this.code = code;
    this.status = status;
  }
}

export function getRoadRouteKey(originLocation, destinationLocation) {
  const origin = getCoordinate(originLocation);
  const destination = getCoordinate(destinationLocation);
  if (!origin || !destination) return null;
  return `${getPointKey(origin)}>${getPointKey(destination)}`;
}

export async function getShortestRoadRoute({
  originLocation,
  destinationLocation,
  fetchImpl = globalThis.fetch,
  signal: externalSignal,
  timeoutMs = readTimeout(import.meta.env?.VITE_ROUTING_TIMEOUT_MS),
  baseUrl = ROUTING_BASE_URL,
} = {}) {
  const origin = getCoordinate(originLocation);
  const destination = getCoordinate(destinationLocation);

  if (!origin || !destination) {
    throw new RoadRoutingError(
      'Selecciona un origen y un destino con coordenadas válidas.',
      'invalid_locations',
    );
  }
  if (typeof fetchImpl !== 'function') {
    throw new RoadRoutingError('No hay un cliente de red disponible.', 'fetch_unavailable');
  }

  const normalizedBaseUrl = String(baseUrl).replace(/\/+$/, '');
  const coordinates = [origin, destination]
    .map(([latitude, longitude]) => `${longitude.toFixed(6)},${latitude.toFixed(6)}`)
    .join(';');
  const url =
    `${normalizedBaseUrl}/route/v1/driving/${coordinates}` +
    '?alternatives=true&overview=full&geometries=geojson&steps=false';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), readTimeout(timeoutMs));
  const forwardAbort = () => controller.abort(externalSignal?.reason);

  if (externalSignal?.aborted) forwardAbort();
  else externalSignal?.addEventListener?.('abort', forwardAbort, { once: true });

  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (response?.ok === false) {
      throw new RoadRoutingError(
        'El servicio vial no pudo calcular la ruta.',
        'provider_error',
        response.status,
      );
    }

    const data = await response.json();
    const candidates = Array.isArray(data?.routes) ? data.routes : [];
    const parsedRoutes = candidates
      .map(parseRoute)
      .filter(Boolean)
      .sort((left, right) => left.distanceMeters - right.distanceMeters);
    const shortest = parsedRoutes[0];

    if (!shortest) {
      throw new RoadRoutingError(
        'No existe una ruta vial entre estos dos puntos.',
        data?.code === 'NoRoute' ? 'no_route' : 'invalid_response',
      );
    }

    return {
      requestKey: getRoadRouteKey(originLocation, destinationLocation),
      mapPath: withExactEndpoints(shortest.mapPath, origin, destination),
      distanceMeters: Math.round(shortest.distanceMeters),
      durationSeconds:
        shortest.durationSeconds === null ? null : Math.round(shortest.durationSeconds),
      alternativesConsidered: parsedRoutes.length,
      source: 'osrm',
      sourceLabel: 'OSRM · OpenStreetMap',
      isRoadRoute: true,
    };
  } catch (error) {
    if (error instanceof RoadRoutingError) throw error;
    if (error?.name === 'AbortError' || controller.signal.aborted) {
      throw new RoadRoutingError(
        externalSignal?.aborted ? 'La búsqueda de ruta fue cancelada.' : 'La ruta vial tardó demasiado.',
        externalSignal?.aborted ? 'aborted' : 'timeout',
      );
    }
    throw new RoadRoutingError('No se pudo conectar con el servicio vial.', 'network_error');
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener?.('abort', forwardAbort);
  }
}
