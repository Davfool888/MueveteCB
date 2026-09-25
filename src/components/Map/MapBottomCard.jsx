import React from 'react';

export default function MapBottomCard({ activeRoute, transportPlan, isAlert }) {
  const isVeredal = transportPlan?.mode === 'veredal';
  const isSitp = transportPlan?.mode === 'sitp';
  const isCable = transportPlan?.mode === 'cable';

  let title = 'Mapa de movilidad';
  let message = 'Selecciona un origen y un destino para comparar trayectos.';

  if (isVeredal) {
    title = '🚐 Van veredal';
    message = `${transportPlan.veredalRoute?.integration?.name || 'Punto de integración'} · geometría simulada, validar con la comunidad`;
  } else if (isSitp) {
    title = '🚌 Ruta SITP';
    message = activeRoute
      ? `${activeRoute.duration} · paradas relevantes del corredor seleccionado`
      : 'Se muestran únicamente las paradas SITP cercanas.';
  } else if (isCable) {
    title = '🚡 TransMiCable';
    message = 'Se muestra el tramo formal relacionado con la selección.';
  } else if (activeRoute) {
    title = isAlert ? 'Ruta recalculada' : 'Mejor opción trazada';
    message = isAlert
      ? 'Evita el bloqueo reportado por la vía Alpes–Quiba.'
      : `${activeRoute.duration} · incluye transbordo`;
  }

  return (
    <div
      className={`map-bottom-card${isAlert ? ' is-alert' : ''}${isVeredal ? ' is-veredal' : ''}`}
      id="map-bottom-card"
      aria-live="polite"
    >
      <span className="map-bottom-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M12 21s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      </span>
      <div>
        <strong id="map-message-title">{title}</strong>
        <p id="map-message">{message}</p>
      </div>
    </div>
  );
}
