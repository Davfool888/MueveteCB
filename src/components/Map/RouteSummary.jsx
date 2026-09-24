import React from 'react';

const STEP_COLORS = {
  informal: 'step-informal',
  cable: 'step-cable',
  sitp: 'step-sitp',
  walk: 'step-walk',
};

export default function RouteSummary({ activeRoute, margin, isAlert, onSelectRoute }) {
  if (!activeRoute) return null;

  return (
    <article
      className={`route-summary${isAlert ? ' has-alert' : ''}`}
      id="route-summary"
      aria-live="polite"
    >
      {/* Route Mode Switcher tabs */}
      <div className="route-mode-switcher" style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`mode-pill ${activeRoute.id === 'main' ? 'is-active' : ''}`}
          onClick={() => onSelectRoute && onSelectRoute('main')}
          style={{
            fontSize: '0.82rem',
            padding: '5px 12px',
            borderRadius: '20px',
            border: '1.5px solid var(--green-700)',
            background: activeRoute.id === 'main' ? 'var(--green-700)' : 'transparent',
            color: activeRoute.id === 'main' ? '#fff' : 'var(--green-950)',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.18s ease',
          }}
        >
          ⚡ Más Rápida (Cable + Veredal)
        </button>
        <button
          type="button"
          className={`mode-pill ${activeRoute.id === 'economic' ? 'is-active' : ''}`}
          onClick={() => onSelectRoute && onSelectRoute('economic')}
          style={{
            fontSize: '0.82rem',
            padding: '5px 12px',
            borderRadius: '20px',
            border: '1.5px solid var(--blue)',
            background: activeRoute.id === 'economic' ? 'var(--blue)' : 'transparent',
            color: activeRoute.id === 'economic' ? '#fff' : 'var(--blue)',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.18s ease',
          }}
        >
          💰 Más económica ($3.550*)
        </button>
        <button
          type="button"
          className={`mode-pill ${activeRoute.id === 'accessible' ? 'is-active' : ''}`}
          onClick={() => onSelectRoute && onSelectRoute('accessible')}
          style={{
            fontSize: '0.82rem',
            padding: '5px 12px',
            borderRadius: '20px',
            border: '1.5px solid var(--yellow)',
            background: activeRoute.id === 'accessible' ? 'var(--yellow)' : 'transparent',
            color: activeRoute.id === 'accessible' ? '#fff' : '#8c6004',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.18s ease',
          }}
        >
          ♿ Ruta formal PMR*
        </button>
      </div>

      <header className="summary-header">
        <div>
          <span className="section-kicker">Recomendación Multimodal</span>
          <h2 id="summary-title" style={{ fontSize: '1.25rem', marginTop: '2px' }}>{activeRoute.title}</h2>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {activeRoute.qualityBadge && (
            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', background: 'var(--green-100)', color: 'var(--green-900)' }}>
              {activeRoute.qualityBadge}
            </span>
          )}
          <span className="best-badge" id="route-badge">
            {isAlert ? '⚠️ Ruta ajustada' : activeRoute.modeLabel || 'Mejor opción'}
          </span>
        </div>
      </header>

      {/* Main Stats: Times + Cost ($ COP) + Margin */}
      <div className="trip-stats" aria-label="Resumen del viaje" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))' }}>
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
          <span>Costo Total</span>
          <strong id="trip-cost" style={{ color: 'var(--green-800)' }}>
            {activeRoute.costFormatted || '$6.050*'}
          </strong>
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

      {/* Payment methods alert box */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--surface-soft)',
          padding: '8px 12px',
          borderRadius: '10px',
          margin: '10px 0 14px',
          fontSize: '0.82rem',
          borderLeft: '4px solid var(--green-600)',
        }}
      >
        <span>
          <strong>Pago:</strong> {activeRoute.paymentMethod || 'Efectivo + TuLlave'}
        </span>
        <span style={{ color: 'var(--ink-soft)', fontSize: '0.78rem' }}>
          {activeRoute.costBreakdown || 'Desglose multimodal'}
        </span>
      </div>

      {/* Step by step segments with segment costs */}
      <ol className="route-steps" id="route-steps">
        {activeRoute.segments.map((seg, i) => (
          <li key={i} style={{ display: 'grid', gridTemplateColumns: '32px 1fr auto', alignItems: 'center', gap: '10px' }}>
            <span className={`step-icon ${STEP_COLORS[seg.type] || 'step-walk'}`}>{i + 1}</span>
            <div>
              <strong>{seg.title}</strong>
              <span style={{ display: 'block', fontSize: '0.84rem', color: 'var(--ink-soft)' }}>{seg.detail}</span>
            </div>
            {seg.cost && (
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: seg.cost.includes('$0') ? 'var(--surface-soft)' : '#fdf3d9',
                  color: seg.cost.includes('$0') ? 'var(--ink-soft)' : '#9a6c0b',
                  whiteSpace: 'nowrap',
                }}
              >
                {seg.cost}
              </span>
            )}
          </li>
        ))}
      </ol>

      {/* Confidence + Accessibility & Quality Insights */}
      <div className="route-insight" style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
        <div
          className="confidence-ring"
          id="confidence-ring"
          style={{ '--score': activeRoute.confidence }}
        >
          <span id="confidence-score">{activeRoute.confidence}%</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <strong id="confidence-label">{activeRoute.confidenceLabel}</strong>
            {activeRoute.accessibilityLabel && (
              <span
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  color: 'var(--green-900)',
                  background: 'var(--green-100)',
                  padding: '2px 8px',
                  borderRadius: '8px',
                }}
              >
                ♿ {activeRoute.accessibilityLabel}
              </span>
            )}
          </div>
          <p id="route-reason" style={{ margin: '4px 0 0', fontSize: '0.86rem', color: 'var(--ink-soft)' }}>
            {activeRoute.reason}
          </p>
        </div>
      </div>
      <p className="map-note" style={{ marginTop: '12px' }}>
        * La tarifa formal de $3.550 corresponde a 2026. Los tramos informales y las rutas combinadas siguen en validación.
      </p>
    </article>
  );
}
