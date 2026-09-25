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

function haversineDist([lat1, lon1], [lat2, lon2]) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findClosestPointIndex(path, targetPoint) {
  let closestIdx = -1;
  let minDist = Infinity;
  for (let i = 0; i < path.length; i++) {
    const d = haversineDist(path[i], targetPoint);
    if (d < minDist) {
      minDist = d;
      closestIdx = i;
    }
  }
  return { index: closestIdx, distanceKm: minDist };
}

function withDynamicEndpoints(route, originLocation, destinationLocation) {
  const basePath = Array.isArray(route?.mapPath) ? route.mapPath : [];
  const hasOrigin = hasCoordinates(originLocation);
  const hasDestination = hasCoordinates(destinationLocation);

  if (!hasOrigin && !hasDestination) {
    return basePath.map((p) => [p[0], p[1]]);
  }

  const originCoord = hasOrigin ? coordinatePair(originLocation) : null;
  const destCoord = hasDestination ? coordinatePair(destinationLocation) : null;

  if (basePath.length === 0) {
    if (originCoord && destCoord) return [originCoord, destCoord];
    if (originCoord) return [originCoord];
    if (destCoord) return [destCoord];
    return [];
  }

  // Si ambos puntos están definidos, verificamos si coinciden con el corredor de la ruta base
  if (hasOrigin && hasDestination) {
    const originMatch = findClosestPointIndex(basePath, originCoord);
    const destMatch = findClosestPointIndex(basePath, destCoord);

    // Si ambos puntos están a una distancia razonable (≤3 km) y en orden correcto
    if (originMatch.distanceKm <= 3.0 && destMatch.distanceKm <= 3.0 && originMatch.index < destMatch.index) {
      const sliced = basePath.slice(originMatch.index, destMatch.index + 1);
      return [originCoord, ...sliced, destCoord];
    }

    // Si los puntos están muy alejados del trazado base, no forzamos curvas de una ruta ajena
    if (originMatch.distanceKm > 4.0 || destMatch.distanceKm > 4.0) {
      return [originCoord, destCoord];
    }
  }

  const nextPath = basePath.map((point) => [point[0], point[1]]);
  if (hasOrigin) {
    const originMatch = findClosestPointIndex(basePath, originCoord);
    if (originMatch.distanceKm <= 1.5 && originMatch.index > 0) {
      return [originCoord, ...basePath.slice(originMatch.index)];
    }
    nextPath[0] = originCoord;
  }

  if (hasDestination) {
    const destMatch = findClosestPointIndex(basePath, destCoord);
    if (destMatch.distanceKm <= 1.5 && destMatch.index < basePath.length - 1) {
      return [...basePath.slice(0, destMatch.index + 1), destCoord];
    }
    nextPath[nextPath.length - 1] = destCoord;
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
