import React from 'react';

export default function Hero({
  origin,
  destination,
  deadline,
  priorityMode,
  onOriginChange,
  onDestinationChange,
  onDeadlineChange,
  onPriorityModeChange,
  onSubmit,
}) {
  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(origin, destination, deadline, priorityMode);
  }

  return (
    <section className="hero" aria-labelledby="hero-title">
      {/* Left copy */}
      <div className="hero-copy">
        <span className="eyebrow">
          <span className="eyebrow-icon" aria-hidden="true">🚡</span>
          Movilidad Inteligente en Ciudad Bolívar
        </span>
        <h1 id="hero-title">
          Tu camino,<br />
          <em>sin adivinar.</em>
        </h1>
        <p className="hero-lead">
          Un solo asistente de IA para cruzar <strong>TransMiCable</strong>, <strong>SITP</strong> y <strong>camperos veredales</strong>, calculando tiempos, tarifas en pesos y sorteando novedades ciudadanas en tiempo real.
        </p>

        <div className="hero-proof" aria-label="Beneficios del prototipo">
          <div className="proof-item">
            <strong>$2.950 – $5.450</strong>
            <span>Tarifas transparentes</span>
          </div>
          <div className="proof-item">
            <strong>100% CB</strong>
            <span>Delimitado a la localidad</span>
          </div>
          <div className="proof-item">
            <strong>Agente IA</strong>
            <span>Respaldo online y offline</span>
          </div>
        </div>

        <p className="demo-disclaimer">
          <span aria-hidden="true">ⓘ</span> Prototipo funcional para el Reto Muévete CB · Cobertura Localidad 19.
        </p>
      </div>

      {/* Planner card */}
      <form className="planner-card" onSubmit={handleSubmit}>
        <div className="planner-heading">
          <div>
            <span className="section-kicker">Planifica tu desplazamiento</span>
            <h2>¿A dónde vas?</h2>
          </div>
          <span className="step-badge" style={{ background: '#eef4ef', color: '#075d50' }}>Multimodal</span>
        </div>

        {/* Priority selector */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-soft)', marginBottom: '6px' }}>
            Tu prioridad hoy:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            <button
              type="button"
              onClick={() => onPriorityModeChange && onPriorityModeChange('fastest')}
              style={{
                padding: '6px 4px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                border: priorityMode === 'fastest' ? '2px solid var(--green-700)' : '1px solid var(--line)',
                background: priorityMode === 'fastest' ? 'var(--green-100)' : 'var(--surface)',
                color: priorityMode === 'fastest' ? 'var(--green-950)' : 'var(--ink-soft)',
                cursor: 'pointer',
              }}
            >
              ⚡ Rápida
            </button>
            <button
              type="button"
              onClick={() => onPriorityModeChange && onPriorityModeChange('cheapest')}
              style={{
                padding: '6px 4px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                border: priorityMode === 'cheapest' ? '2px solid var(--blue)' : '1px solid var(--line)',
                background: priorityMode === 'cheapest' ? 'var(--blue-soft)' : 'var(--surface)',
                color: priorityMode === 'cheapest' ? 'var(--blue)' : 'var(--ink-soft)',
                cursor: 'pointer',
              }}
            >
              💰 Económica
            </button>
            <button
              type="button"
              onClick={() => onPriorityModeChange && onPriorityModeChange('accessible')}
              style={{
                padding: '6px 4px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                border: priorityMode === 'accessible' ? '2px solid var(--yellow)' : '1px solid var(--line)',
                background: priorityMode === 'accessible' ? 'var(--yellow-soft)' : 'var(--surface)',
                color: priorityMode === 'accessible' ? '#8c6004' : 'var(--ink-soft)',
                cursor: 'pointer',
              }}
            >
              ♿ Accesible
            </button>
          </div>
        </div>

        <div className="form-fields">
          <label className="field">
            <span>Estoy en</span>
            <span className="input-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="7" />
                <circle cx="12" cy="12" r="2" />
              </svg>
              <input
                id="origin"
                name="origin"
                list="places"
                value={origin}
                onChange={(e) => onOriginChange(e.target.value)}
                autoComplete="off"
                placeholder="Ej. Mochuelo Alto, Quiba, Manitas..."
                required
              />
            </span>
          </label>

          <label className="field">
            <span>Quiero llegar a</span>
            <span className="input-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              <input
                id="destination"
                name="destination"
                list="places"
                value={destination}
                onChange={(e) => onDestinationChange(e.target.value)}
                autoComplete="off"
                placeholder="Ej. Portal Tunal, Hospital Meissen..."
                required
              />
            </span>
          </label>

          <label className="field field-time">
            <span>Llegar antes de</span>
            <span className="input-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="8" />
                <path d="M12 7v5l3 2" />
              </svg>
              <input
                id="deadline"
                name="deadline"
                type="time"
                value={deadline}
                onChange={(e) => onDeadlineChange(e.target.value)}
                required
              />
            </span>
          </label>
        </div>

        <datalist id="places">
          <option value="Mochuelo Alto" />
          <option value="Mochuelo Bajo" />
          <option value="Quiba Alta" />
          <option value="Quiba Bajo" />
          <option value="Mirador del Paraíso (TransMiCable)" />
          <option value="Estación Manitas" />
          <option value="Estación Juan Pablo II" />
          <option value="Portal Tunal" />
          <option value="Hospital Meissen" />
          <option value="Sierra Morena" />
          <option value="Bella Flor" />
          <option value="Sector Las Torres" />
        </datalist>

        <button className="button button-primary button-full" type="submit" style={{ marginTop: '12px' }}>
          Calcular mejor ruta con IA
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
        <p className="form-hint">Cruza frecuencias de camperos, teleférico, SITP y alertas ciudadanas.</p>
      </form>
    </section>
  );
}
