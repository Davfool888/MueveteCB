import React from 'react';

export default function Header({ onOpenReport }) {
  return (
    <header className="topbar">
      {/* Brand / Logo */}
      <a className="brand" href="#contenido" aria-label="Muevete CB, inicio">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 44 44" role="img" aria-hidden="true">
            <path d="M11 29c0-8 5-11 11-11 5 0 8-3 8-7"/>
            <circle cx="11" cy="31" r="4"/>
            <circle cx="32" cy="10" r="4"/>
            <path d="M19 31h9"/>
          </svg>
        </span>
        <span className="brand-copy">
          <strong>Muevete</strong>
          <small>Ciudad Bolívar</small>
        </span>
      </a>

      {/* Actions */}
      <div className="topbar-actions">
        <span className="mode-pill">
          <span className="status-dot" aria-hidden="true"></span>
          Demo funcional
        </span>
        <button
          className="button button-ghost button-small"
          type="button"
          onClick={onOpenReport}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Reportar novedad
        </button>
      </div>
    </header>
  );
}
