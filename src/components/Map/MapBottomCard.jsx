import React from 'react';

export default function MapBottomCard({ activeRoute, isAlert }) {
  const title = isAlert ? 'Ruta recalculada' : 'Mejor opción trazada';
  const message = isAlert
    ? 'Evita el bloqueo reportado por la vía Alpes–Quiba.'
    : activeRoute
    ? `${activeRoute.duration} · incluye transbordo`
    : 'Haz tu pregunta para comparar trayectos.';

  return (
    <div className={`map-bottom-card${isAlert ? ' is-alert' : ''}`} id="map-bottom-card">
      <span className="map-bottom-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M12 21s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z"/>
          <circle cx="12" cy="9" r="2.5"/>
        </svg>
      </span>
      <div>
        <strong id="map-message-title">{title}</strong>
        <p id="map-message">{message}</p>
      </div>
    </div>
  );
}
