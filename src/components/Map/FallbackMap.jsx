import React from 'react';
import { BOGOTA_BOUNDS, CIUDAD_BOLIVAR_BOUNDS } from '../../data/routes';

function hasCoordinates(location) {
  return (
    location &&
    location.latitude !== null &&
    location.longitude !== null &&
    Number.isFinite(Number(location.latitude)) &&
    Number.isFinite(Number(location.longitude))
  );
}

function projectCoordinate([latitude, longitude], bounds) {
  const [southWest, northEast] = bounds;
  const [minLatitude, minLongitude] = southWest;
  const [maxLatitude, maxLongitude] = northEast;
  const x = ((Number(longitude) - minLongitude) / (maxLongitude - minLongitude)) * 900;
  const y = ((maxLatitude - Number(latitude)) / (maxLatitude - minLatitude)) * 560;

  return [
    Math.max(42, Math.min(858, x)),
    Math.max(34, Math.min(516, y)),
  ];
}

function formatLabel(value, fallback) {
  const label = String(value || fallback || '').trim();
  if (label.length <= 25) return label;
  return `${label.slice(0, 22)}...`;
}

function isOutsideLocality([latitude, longitude]) {
  return (
    latitude < CIUDAD_BOLIVAR_BOUNDS[0][0] ||
    latitude > CIUDAD_BOLIVAR_BOUNDS[1][0] ||
    longitude < CIUDAD_BOLIVAR_BOUNDS[0][1] ||
    longitude > CIUDAD_BOLIVAR_BOUNDS[1][1]
  );
}

function pathThroughPoints(points) {
  if (points.length < 2) return '';
  if (points.length === 2) {
    const [start, end] = points;
    const middleX = (start[0] + end[0]) / 2;
    const middleY = (start[1] + end[1]) / 2 - Math.min(65, Math.abs(end[0] - start[0]) * 0.18);
    return `M${start[0]} ${start[1]} Q${middleX} ${middleY} ${end[0]} ${end[1]}`;
  }

  return points.reduce((path, point, index) => {
    if (index === 0) return `M${point[0]} ${point[1]}`;
    const previous = points[index - 1];
    const middleX = (previous[0] + point[0]) / 2;
    const middleY = (previous[1] + point[1]) / 2;
    return `${path} Q${middleX} ${middleY} ${point[0]} ${point[1]}`;
  }, '');
}

export default function FallbackMap({
  activeRoute,
  transportPlan,
  originLocation,
  destinationLocation,
}) {
  const isVeredal = transportPlan?.mode === 'veredal';
  const isSitp = transportPlan?.mode === 'sitp';
  const isCable = transportPlan?.mode === 'cable';
  const staticOrigin = [75, 485];
  const staticDestination = [765, 105];
  const hasBogotaPoint = [originLocation, destinationLocation].some(
    (location) => hasCoordinates(location) && isOutsideLocality([location.latitude, location.longitude]),
  );
  const mapBounds = hasBogotaPoint ? BOGOTA_BOUNDS : CIUDAD_BOLIVAR_BOUNDS;
  const origin = hasCoordinates(originLocation)
    ? projectCoordinate([originLocation.latitude, originLocation.longitude], mapBounds)
    : staticOrigin;
  const destination = hasCoordinates(destinationLocation)
    ? projectCoordinate([destinationLocation.latitude, destinationLocation.longitude], mapBounds)
    : staticDestination;
  const integration = isVeredal && transportPlan.veredalRoute?.integration
    ? projectCoordinate(transportPlan.veredalRoute.integration.coordinates, mapBounds)
    : null;
  const routePoints = isVeredal && transportPlan.veredalRoute?.route
    ? transportPlan.veredalRoute.route.map((point) => projectCoordinate(point, mapBounds))
    : (transportPlan?.routePath || []).map((point) => projectCoordinate(point, mapBounds));
  const showRoute = Boolean(activeRoute || isVeredal || (isSitp && routePoints.length > 1) || isCable);
  const pathD = showRoute ? pathThroughPoints(routePoints) : '';
  const pathStroke = isVeredal ? '#ef765f' : isSitp ? '#3478b8' : isCable ? '#d89b18' : '#087f68';
  const originLabel = formatLabel(
    originLocation?.label || activeRoute?.origin,
    'Mochuelo Alto',
  );
  const destinationLabel = formatLabel(
    destinationLocation?.label || activeRoute?.destination,
    'Portal Tunal',
  );
  const showOriginMarker = Boolean(activeRoute || hasCoordinates(originLocation));
  const showDestinationMarker = Boolean(activeRoute || hasCoordinates(destinationLocation));

  return (
    <div className="fallback-map" id="fallback-map" aria-hidden="true">
      <svg viewBox="0 0 900 560" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="map-grid" width="44" height="44" patternUnits="userSpaceOnUse">
            <path d="M44 0H0V44" fill="none" stroke="currentColor" strokeOpacity=".08" />
          </pattern>
          <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="5" stdDeviation="5" floodOpacity=".16" />
          </filter>
        </defs>
        <rect width="900" height="560" fill="#e9eee8" />
        <rect width="900" height="560" fill="url(#map-grid)" />
        <g fill="none" stroke="#cbd8cf" strokeWidth="16" strokeLinecap="round" opacity=".8">
          <path d="M-30 80C160 160 246 98 391 175s229 78 541 5" />
          <path d="M-10 476c171-94 281-46 383-143s239-74 551-1" />
          <path d="M250-20c8 132 71 210 45 329s33 188 10 280" />
          <path d="M680-30c-18 132-83 213-63 338s58 180 26 282" />
        </g>
        <g fill="none" stroke="#fff" strokeWidth="4" opacity=".95">
          <path d="M-20 303C161 205 250 305 407 256s287-41 523-106" />
          <path d="M84-20c54 159 176 214 192 359s-46 171-47 241" />
        </g>
        <path
          id="fallback-route"
          d={pathD}
          fill="none"
          stroke={pathStroke}
          strokeWidth={isVeredal ? 7 : 12}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={isVeredal ? '10 9' : undefined}
          filter="url(#soft-shadow)"
        />
        <g fontFamily="Segoe UI, sans-serif" fontSize="15" fontWeight="700" fill="#173d35">
          {showOriginMarker && (
            <g transform={`translate(${origin[0]} ${origin[1]})`}>
              <circle r="15" fill={originLocation?.source === 'gps' ? '#3478b8' : '#173d35'} stroke="#fff" strokeWidth="5" />
              <text x="0" y="5" fill="#fff" textAnchor="middle" fontSize="13">A</text>
              <text x="24" y="5">{originLabel}</text>
            </g>
          )}
          {showDestinationMarker && (
            <g transform={`translate(${destination[0]} ${destination[1]})`}>
              <circle r="15" fill="#087f68" stroke="#fff" strokeWidth="5" />
              <text x="0" y="5" fill="#fff" textAnchor="middle" fontSize="13">B</text>
              <text x="-20" y="-23" textAnchor="end">{destinationLabel}</text>
            </g>
          )}
          {integration && (
            <g transform={`translate(${integration[0]} ${integration[1]})`}>
              <circle r="13" fill="#d89b18" stroke="#fff" strokeWidth="4" />
              <text x="0" y="5" fill="#fff" textAnchor="middle" fontSize="12">🚉</text>
              <text x="20" y="-18">Integración</text>
            </g>
          )}
          {isVeredal && (
            <text x={origin[0] + 22} y={origin[1] - 22} fill="#a84335">🚐 Van veredal · simulada</text>
          )}
          {!showRoute && (
            <text x="50" y="525" fill="#516564" fontSize="13">Selecciona una ruta para mostrar su geometría</text>
          )}
        </g>
      </svg>
      <span className="fallback-label">Vista esquemática sin conexión</span>
    </div>
  );
}
