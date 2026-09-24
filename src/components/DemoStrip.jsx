import React from 'react';

export default function DemoStrip({ onRunDemo }) {
  return (
    <section className="demo-strip" aria-label="Demostración rápida">
      <div className="demo-strip-copy">
        <span className="live-label">
          <span aria-hidden="true"></span>
          Caso de demostración
        </span>
        <p>
          <strong>Laura:</strong> "Estoy en Mochuelo Alto y necesito llegar al Portal Tunal antes de las 7".
        </p>
      </div>
      <button className="text-button" type="button" onClick={onRunDemo}>
        Repetir caso
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 12a8 8 0 1 1-2.34-5.66L20 8.68"/>
          <path d="M20 4v4.68h-4.68"/>
        </svg>
      </button>
    </section>
  );
}
