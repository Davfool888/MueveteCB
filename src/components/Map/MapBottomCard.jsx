import React from 'react';

const TRANSPORT_OPTIONS = [
  { id: 'auto', label: 'Automática', shortLabel: 'Auto', icon: '✨' },
  { id: 'sitp', label: 'SITP', shortLabel: 'SITP', icon: '🚌' },
  { id: 'veredal', label: 'Van veredal', shortLabel: 'Van', icon: '🚐' },
  { id: 'cable', label: 'TransMiCable', shortLabel: 'Cable', icon: '🚡' },
];

function formatRoadDistance(distanceMeters) {
  const distance = Number(distanceMeters);
  if (!Number.isFinite(distance) || distance <= 0) return 'Por calcular';
  if (distance < 1000) return `${Math.round(distance / 10) * 10} m`;
  return `${(distance / 1000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} km`;
}

function routeSupportsMode(activeRoute, mode) {
  if (!activeRoute || !mode || mode === 'none') return false;
  if (mode === 'veredal') {
    return activeRoute.segments?.some((segment) => segment.type === 'informal') || false;
  }
  return activeRoute.segments?.some((segment) => segment.type === mode) || false;
}

function getEstimatedPrice(activeRoute, selectedMode, planMode) {
  if (!activeRoute) return 'Por validar';
  if (selectedMode === 'sitp' || selectedMode === 'cable') return '$3.550 COP*';
  if (selectedMode === 'veredal') {
    if (!routeSupportsMode(activeRoute, 'veredal')) return 'Por validar';
    const stillNeedsCable = activeRoute.segments?.some((segment) => segment.type === 'cable');
    return stillNeedsCable ? activeRoute.costFormatted : '$2.500 COP*';
  }
  if (!routeSupportsMode(activeRoute, planMode)) return 'Por validar';
  return activeRoute.costFormatted || 'Por validar';
}

function getContextTitle({ isAlert, isVeredal, isSitp, isCable, roadRouteStatus }) {
  if (roadRouteStatus === 'loading') return 'Calculando ruta vial';
  if (roadRouteStatus === 'fallback') return 'Ruta vial no disponible';
  if (roadRouteStatus === 'ready') return isAlert ? 'Ruta ajustada por carretera' : 'Ruta vial lista';
  if (isVeredal) return '🚐 Van veredal';
  if (isSitp) return '🚌 Ruta SITP';
  if (isCable) return '🚡 TransMiCable';
  return 'Mapa de movilidad';
}

function getContextMessage({ roadRouteStatus, roadRouteMessage, isVeredal, isSitp, isCable, isAlert }) {
  if (roadRouteStatus === 'loading') {
    return roadRouteMessage || 'Consultando la red vial entre A y B...';
  }
  if (roadRouteStatus === 'fallback') {
    return `${roadRouteMessage || 'No fue posible consultar el servicio vial.'} No se dibuja una línea directa entre A y B.`;
  }
  if (roadRouteStatus === 'ready') {
    return 'Alternativa de menor distancia disponible en OpenStreetMap, calculada por OSRM.';
  }
  if (isVeredal) {
    return 'Van veredal disponible; su trazado comunitario sigue en validación.';
  }
  if (isSitp) {
    return 'Se muestran las paradas SITP relacionadas con el origen y el destino.';
  }
  if (isCable) {
    return 'Se muestra el tramo formal de TransMiCable relacionado con la selección.';
  }
  return isAlert
    ? 'Evita el bloqueo reportado por la vía Alpes–Quiba.'
    : 'Selecciona un origen y un destino para comparar trayectos.';
}

export default function MapBottomCard({
  activeRoute,
  transportPlan,
  roadRoute,
  roadRouteStatus = 'idle',
  roadRouteMessage = '',
  selectedTransportMode = 'auto',
  isAlert,
  onSelectTransportMode,
}) {
  const isVeredal = transportPlan?.mode === 'veredal';
  const isSitp = transportPlan?.mode === 'sitp';
  const isCable = transportPlan?.mode === 'cable';
  const availableModes = new Set(transportPlan?.availableModes || []);
  const showTransportChoices =
    roadRouteStatus !== 'idle' && Boolean(transportPlan?.origin) && availableModes.size > 0;
  const transportChoices = showTransportChoices
    ? TRANSPORT_OPTIONS.filter(
        (option) => option.id === 'auto' || availableModes.has(option.id),
      )
    : [];
  const title = getContextTitle({ isAlert, isVeredal, isSitp, isCable, roadRouteStatus });
  const message = getContextMessage({
    roadRouteStatus,
    roadRouteMessage,
    isVeredal,
    isSitp,
    isCable,
    isAlert,
  });
  const roadDistance = formatRoadDistance(
    roadRoute?.distanceMeters || activeRoute?.roadDistanceMeters,
  );
  const price = getEstimatedPrice(activeRoute, selectedTransportMode, transportPlan?.mode);

  return (
    <div
      className={`map-bottom-card${isAlert ? ' is-alert' : ''}${isVeredal ? ' is-veredal' : ''}${roadRouteStatus === 'loading' ? ' is-loading' : ''}${roadRouteStatus === 'fallback' ? ' is-fallback' : ''}`}
      id="map-bottom-card"
      aria-live="polite"
    >
      <div className="map-bottom-summary">
        <span className="map-bottom-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 21s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
        </span>
        <div className="map-bottom-copy">
          <div className="map-bottom-title-row">
            <strong id="map-message-title">{title}</strong>
            {roadRouteStatus === 'ready' && (
              <span className="map-routing-source">Más corta disponible</span>
            )}
          </div>
          <p id="map-message">{message}</p>
          <div className="map-bottom-metrics" aria-label="Distancia y precio del viaje">
            <span>
              <small>Distancia vial</small>
              <strong>{roadDistance}</strong>
            </span>
            <span>
              <small>Precio estimado</small>
              <strong>{price}</strong>
            </span>
          </div>
        </div>
      </div>

      {showTransportChoices && (
        <div className="map-transport-picker">
          <span>Elige tu transporte</span>
          <div role="group" aria-label="Transportes disponibles para el viaje">
            {transportChoices.map((option) => {
              const isActive = selectedTransportMode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`map-transport-option${isActive ? ' is-active' : ''}`}
                  aria-pressed={isActive}
                  onClick={() => onSelectTransportMode?.(option.id)}
                >
                  <span aria-hidden="true">{option.icon}</span>
                  <span className="map-transport-option-full">{option.label}</span>
                  <span className="map-transport-option-short">{option.shortLabel}</span>
                </button>
              );
            })}
          </div>
          <small>* Precio referencial del prototipo; confirma tarifas y disponibilidad antes de viajar.</small>
        </div>
      )}
    </div>
  );
}
