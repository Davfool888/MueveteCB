import React from 'react';

const STEP_COLORS = {
  informal: 'step-informal',
  cable: 'step-cable',
  sitp: 'step-sitp',
  walk: 'step-walk',
};

export default function RouteSummary({ activeRoute, margin, isAlert }) {
  if (!activeRoute) return null;

  return (
    <article
      className={`route-summary${isAlert ? ' has-alert' : ''}`}
      id="route-summary"
      aria-live="polite"
    >
      <header className="summary-header">
        <div>
          <span className="section-kicker">Recomendación</span>
          <h2 id="summary-title">{activeRoute.title}</h2>
        </div>
        <span className="best-badge" id="route-badge">
          {isAlert ? 'Ruta ajustada' : 'Mejor opción'}
        </span>
      </header>

      <div className="trip-stats" aria-label="Resumen del viaje">
        <div>
          <span>Salir</span>
          <strong id="departure-time">{activeRoute.departureClock}</strong>
        </div>
        <div>
          <span>Llegar</span>
          <strong id="arrival-time">{activeRoute.arrivalClock}</strong>
        </div>
        <div>
          <span>Duración</span>
          <strong id="trip-duration">{activeRoute.duration}</strong>
        </div>
        <div>
          <span>Margen</span>
          <strong
            id="trip-buffer"
            style={{ color: margin < 10 ? 'var(--coral-deep)' : undefined }}
          >
            {margin >= 0 ? `${margin} min` : 'Revisar'}
          </strong>
        </div>
      </div>

      <ol className="route-steps" id="route-steps">
        {activeRoute.segments.map((seg, i) => (
          <li key={i}>
            <span className={`step-icon ${STEP_COLORS[seg.type] || 'step-walk'}`}>{i + 1}</span>
            <div>
              <strong>{seg.title}</strong>
              <span>{seg.detail}</span>
            </div>
          </li>
        ))}
      </ol>

      <div className="route-insight">
        <div
          className="confidence-ring"
          id="confidence-ring"
          style={{ '--score': activeRoute.confidence }}
        >
          <span id="confidence-score">{activeRoute.confidence}%</span>
        </div>
        <div>
          <strong id="confidence-label">{activeRoute.confidenceLabel}</strong>
          <p id="route-reason">{activeRoute.reason}</p>
        </div>
      </div>
    </article>
  );
}
