import React from 'react';

export default function Hero({ origin, destination, deadline, onOriginChange, onDestinationChange, onDeadlineChange, onSubmit }) {
  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(origin, destination, deadline);
  }

  return (
    <section className="hero" aria-labelledby="hero-title">
      {/* Left copy */}
      <div className="hero-copy">
        <span className="eyebrow">
          <span className="eyebrow-icon" aria-hidden="true">✦</span>
          Movilidad conectada de barrio
        </span>
        <h1 id="hero-title">
          Tu camino,<br/>
          <em>sin adivinar.</em>
        </h1>
        <p className="hero-lead">
          Un solo lugar para comparar veredales, TransMiCable y SITP — y tener en cuenta lo que la comunidad reporta en este momento.
        </p>

        <div className="hero-proof" aria-label="Beneficios del prototipo">
          <div className="proof-item">
            <strong>3 capas</strong>
            <span>en un mapa claro</span>
          </div>
          <div className="proof-item">
            <strong>1 pregunta</strong>
            <span>respuesta en lenguaje sencillo</span>
          </div>
          <div className="proof-item">
            <strong>0 registros</strong>
            <span>para probar la demo</span>
          </div>
        </div>

        <p className="demo-disclaimer">
          <span aria-hidden="true">ⓘ</span> Prototipo con datos demostrativos. No usar como información operativa.
        </p>
      </div>

      {/* Planner card */}
      <form className="planner-card" onSubmit={handleSubmit}>
        <div className="planner-heading">
          <div>
            <span className="section-kicker">Planifica tu salida</span>
            <h2>¿A dónde vas?</h2>
          </div>
          <span className="step-badge">3 pasos</span>
        </div>

        <div className="form-fields">
          <label className="field">
            <span>Estoy en</span>
            <span className="input-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="7"/>
                <circle cx="12" cy="12" r="2"/>
              </svg>
              <input
                id="origin"
                name="origin"
                list="places"
                value={origin}
                onChange={(e) => onOriginChange(e.target.value)}
                autoComplete="off"
                required
              />
            </span>
          </label>

          <label className="field">
            <span>Quiero llegar a</span>
            <span className="input-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/>
                <circle cx="12" cy="10" r="2.5"/>
              </svg>
              <input
                id="destination"
                name="destination"
                list="places"
                value={destination}
                onChange={(e) => onDestinationChange(e.target.value)}
                autoComplete="off"
                required
              />
            </span>
          </label>

          <label className="field field-time">
            <span>Llegar antes de</span>
            <span className="input-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="8"/>
                <path d="M12 7v5l3 2"/>
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
          <option value="Mochuelo Alto"/>
          <option value="Quiba"/>
          <option value="La Candelaria"/>
          <option value="Portal Tunal"/>
        </datalist>

        <button className="button button-primary button-full" type="submit">
          Ver mi mejor ruta
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </button>
        <p className="form-hint">La respuesta combina rutas, esperas estimadas y reportes recientes.</p>
      </form>
    </section>
  );
}
