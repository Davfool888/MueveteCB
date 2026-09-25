export function createEmptyLocation(label = '') {
  return {
    label,
    latitude: null,
    longitude: null,
    source: 'manual',
  };
}

function hasCoordinates(location) {
  return Boolean(
    location &&
    location.latitude !== null &&
    location.longitude !== null &&
    Number.isFinite(Number(location.latitude)) &&
    Number.isFinite(Number(location.longitude)),
  );
}

export function hasLocationCoordinates(location) {
  return hasCoordinates(location);
}

function coordinatePair(location) {
  return [Number(location.latitude), Number(location.longitude)];
}

function withDynamicEndpoints(route, originLocation, destinationLocation) {
  const basePath = Array.isArray(route?.mapPath) ? route.mapPath : [];
  const nextPath = basePath.map((point) => [point[0], point[1]]);
  const hasOrigin = hasCoordinates(originLocation);
  const hasDestination = hasCoordinates(destinationLocation);

  if (nextPath.length === 0 && hasOrigin && hasDestination) {
    return [coordinatePair(originLocation), coordinatePair(destinationLocation)];
  }

  if (hasOrigin && nextPath.length > 0) {
    nextPath[0] = coordinatePair(originLocation);
  }

  if (hasDestination && nextPath.length > 0) {
    nextPath[nextPath.length - 1] = coordinatePair(destinationLocation);
  }

  return nextPath;
}

export function buildLocationRoute({
  baseRoute,
  originLocation,
  destinationLocation,
  originText = '',
  destinationText = '',
}) {
  if (!baseRoute) return null;

  const originLabel = originLocation?.label || originText || baseRoute.origin;
  const destinationLabel =
    destinationLocation?.label || destinationText || baseRoute.destination;
  const mapPath = withDynamicEndpoints(baseRoute, originLocation, destinationLocation);
  const hasDynamicOrigin = hasCoordinates(originLocation);
  const hasDynamicDestination = hasCoordinates(destinationLocation);
  const hasLocationChange =
    hasDynamicOrigin || hasDynamicDestination || Boolean(originText || destinationText);

  return {
    ...baseRoute,
    origin: originLabel,
    destination: destinationLabel,
    title: hasLocationChange ? `${originLabel} → ${destinationLabel}` : baseRoute.title,
    mapPath,
    originSource: originLocation?.source || null,
    destinationSource: destinationLocation?.source || null,
    hasDynamicOrigin,
    hasDynamicDestination,
  };
}

export function getLocationKey(originLocation, destinationLocation, priority = '', deadline = '') {
  const origin = hasCoordinates(originLocation)
    ? `${Number(originLocation.latitude).toFixed(5)},${Number(originLocation.longitude).toFixed(5)}`
    : 'none';
  const destination = hasCoordinates(destinationLocation)
    ? `${Number(destinationLocation.latitude).toFixed(5)},${Number(destinationLocation.longitude).toFixed(5)}`
    : 'none';

  return `${origin}>${destination}>${priority}>${deadline}`;
}
