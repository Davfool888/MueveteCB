import React from 'react';

/**
 * Resumen del viaje que describe exactamente dónde abordar cada modo.
 *
 * Este componente ya no pinta los `segments` de `ROUTES[id]`: esos son fixtures
 * de demostración que describían una ruta que el mapa no estaba dibujando. Todo
 * lo que se muestra aquí viene de `itinerary`, que se construye a partir del
 * plan que sí se está pintando (`services/itineraryBuilder.js`).
 */

const STEP_COLORS = {
  walk: 'step-walk',
  road: 'step-walk',
  sitp: 'step-sitp',
  trunk: 'step-sitp',
  veredal: 'step-informal',
  cable: 'step-cable',
};

const KIND_META = {
  trunk: { icon: '🚍', label: 'Troncal' },
  sitp: { icon: '🚌', label: 'SITP' },
  veredal: { icon: '🚐', label: 'Van veredal' },
};

const SOURCE_META = {
  trunk_stations_2026: { label: 'Inventario de estaciones · Transmilenio', verified: true },
  trunk_corridors_2026: { label: 'Trazado troncal · Transmilenio', verified: true },
  planner_estimate: { label: 'Estimación del planificador', verified: false },
};

function BoardingCell({ label, empty = '—' }) {
  if (!label) return <span className="boarding-empty">{empty}</span>;
  return <span className="boarding-name">{label}</span>;
}

function ItineraryBody({ itinerary }) {
  return (
    <>
      <header className="summary-header">
        <div>
          <span className="section-kicker">
            {itinerary.kicker ??
              (itinerary.kind === 'official-sitp' || itinerary.kind === 'official-trunk'
                ? 'Alternativa oficial'
                : 'Itinerario calculado')}
          </span>
          <h2 id="summary-title" style={{ fontSize: '1.25rem', marginTop: '2px' }}>
            {itinerary.title}
          </h2>
          {itinerary.subtitle && <p className="itinerary-subtitle">{itinerary.subtitle}</p>}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          {itinerary.kind !== 'planner' && <span className="best-badge official-badge">Datos oficiales</span>}
          <span
            className={`best-badge${itinerary.badgeTone === 'alert' ? ' has-alert' : ''}`}
            id="route-badge"
          >
            {itinerary.badge}
          </span>
        </div>
      </header>

      <div
        className="trip-stats"
        aria-label="Resumen del viaje"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(84px, 1fr))' }}
      >
        {itinerary.stats.map((stat) => (
          <div key={stat.id ?? stat.label}>
            <span>{stat.label}</span>
            <strong id={stat.id}>{stat.value}</strong>
          </div>
        ))}
      </div>

      <dl className="official-facts">
        {itinerary.facts.map((fact) => (
          <div key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>

      {itinerary.reason && (
        <p className="official-why">
          <strong>Por qué esta:</strong> {itinerary.reason}
        </p>
      )}

      <h3 className="itinerary-subtitle-heading">Dónde abordar y dónde bajarse</h3>
      <ol className="route-steps itinerary-steps" id="route-steps">
        {itinerary.steps.map((step) => (
          <li key={step.order} className={step.pending ? 'is-pending' : ''}>
            <span className={`step-icon ${STEP_COLORS[step.mode] || 'step-walk'}`}>{step.order}</span>
            <div className="itinerary-step-body">
              <div className="itinerary-step-head">
                <strong>{step.title}</strong>
                <span className={`mode-tag mode-tag-${step.mode}`}>
                  <span aria-hidden="true">{step.icon}</span> {step.modeLabel}
                </span>
              </div>
              <dl className="itinerary-boarding">
                <div>
                  <dt>Abordas en</dt>
                  <dd>
                    <BoardingCell label={step.boardAt} />
                  </dd>
                </div>
                <div>
                  <dt>Bajas en</dt>
                  <dd>
                    <BoardingCell label={step.alightAt} />
                  </dd>
                </div>
              </dl>
              {step.detail && <span className="itinerary-step-detail">{step.detail}</span>}
              <span className={`itinerary-step-source${step.verified ? ' is-verified' : ''}`}>
                {step.verified ? '✓ ' : '~ '}
                {step.sourceLabel}
              </span>
            </div>
            <div className="itinerary-step-tail">
              {step.durationLabel && <span className="itinerary-duration">{step.durationLabel}</span>}
              {step.costFormatted && <span className="itinerary-cost">{step.costFormatted}</span>}
            </div>
          </li>
        ))}
      </ol>

      {itinerary.warnings.length > 0 && (
        <details className="official-caveats" open={itinerary.badgeTone === 'alert'}>
          <summary>Qué no podemos afirmar con estos datos</summary>
          <ul>
            {itinerary.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </details>
      )}

      <p className="map-note" style={{ marginTop: '12px' }}>
        {itinerary.disclaimer}
      </p>
    </>
  );
}

export default function RouteSummary({
  activeRoute,
  margin,
  isAlert,
  alternatives = [],
  activeAlternativeId = null,
  itinerary = null,
  onSelectRoute,
  onSelectAlternative,
}) {
  if (!itinerary && !activeRoute && alternatives.length === 0) return null;

  // El tipo de itinerario es la única fuente de verdad de qué se está mostrando,
  // así la pestaña activa no puede desincronizarse del contenido.
  const showOfficial = itinerary?.kind === 'official-sitp' || itinerary?.kind === 'official-trunk';

  return (
    <article
      className={`route-summary${isAlert ? ' has-alert' : ''}`}
      id="route-summary"
      aria-live="polite"
    >
      <div className="route-mode-switcher">
        {[
          { id: 'main', label: '⚡ Más Rápida (Cable + Veredal)', color: 'var(--green-700)' },
          { id: 'economic', label: '💰 Más económica ($3.550*)', color: 'var(--blue)' },
          { id: 'accessible', label: '♿ Ruta formal PMR*', color: 'var(--yellow)' },
        ].map((option) => {
          const isActive = !showOfficial && activeRoute?.id === option.id;
          return (
            <button
              key={option.id}
              type="button"
              className={`mode-pill${isActive ? ' is-active' : ''}`}
              onClick={() => onSelectRoute && onSelectRoute(option.id)}
              aria-pressed={isActive ? 'true' : 'false'}
              style={{
                fontSize: '0.82rem',
                padding: '5px 12px',
                borderRadius: '20px',
                border: `1.5px solid ${option.color}`,
                background: isActive ? option.color : 'transparent',
                color: isActive ? '#fff' : option.id === 'accessible' ? '#8c6004' : option.color,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
            >
              {option.label}
            </button>
          );
        })}

        {alternatives.length > 0 && (
          <span className="mode-pill-separator" aria-hidden="true">
            Alternativas oficiales
          </span>
        )}

        {alternatives.map((alternative) => {
          const isActive = activeAlternativeId === alternative.id;
          return (
            <button
              key={alternative.id}
              type="button"
              className={`mode-pill mode-pill-official${isActive ? ' is-active' : ''}`}
              onClick={() => onSelectAlternative && onSelectAlternative(alternative.id)}
              aria-pressed={isActive ? 'true' : 'false'}
              title={alternative.matchReason ?? undefined}
              style={{
                fontSize: '0.82rem',
                padding: '5px 12px',
                borderRadius: '20px',
                border: '1.5px solid #1d5c86',
                background: isActive ? '#1d5c86' : 'transparent',
                color: isActive ? '#fff' : '#1d5c86',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
            >
              {KIND_META[alternative.kind]?.icon} {KIND_META[alternative.kind]?.label} {alternative.routeCode}
            </button>
          );
        })}
      </div>

      {itinerary ? (
        <ItineraryBody itinerary={itinerary} />
      ) : (
        <p className="map-note">
          Todavía no hay una ruta calculada. Elige origen y destino para ver dónde abordar.
        </p>
      )}
    </article>
  );
}
