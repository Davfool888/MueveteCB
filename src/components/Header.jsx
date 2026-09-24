import React from 'react';
import { Link } from 'react-router-dom';

export default function Header({
  onOpenReport,
  onOpenWhatsApp,
  customActions,
  showRegisterLink = true,
}) {
  return (
    <header className="topbar">
      {/* Brand / Logo */}
      <Link className="brand" to="/" aria-label="Muevete CB, inicio">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 44 44" role="img" aria-hidden="true">
            <path d="M11 29c0-8 5-11 11-11 5 0 8-3 8-7" />
            <circle cx="11" cy="31" r="4" />
            <circle cx="32" cy="10" r="4" />
            <path d="M19 31h9" />
          </svg>
        </span>
        <span className="brand-copy">
          <strong>Muevete CB</strong>
          <small>Localidad 19 · Ciudad Bolívar</small>
        </span>
      </Link>

      {/* Actions */}
      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {customActions ? (
          customActions
        ) : (
          <>
            {onOpenWhatsApp && (
              <button
                className="button button-ghost button-small"
                type="button"
                onClick={onOpenWhatsApp}
                style={{
                  borderColor: '#25d366',
                  color: '#075e54',
                  backgroundColor: '#eefaf1',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                }}
                title="Consultar por canal accesible WhatsApp"
              >
                <span style={{ fontSize: '1rem' }}>💬</span>
                <span>Canal WhatsApp</span>
              </button>
            )}

            {onOpenReport && (
              <button
                className="button button-ghost button-small"
                type="button"
                onClick={onOpenReport}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>Reportar novedad</span>
              </button>
            )}

            {showRegisterLink && (
              <Link
                to="/registro"
                className="button button-primary button-small"
                style={{ textDecoration: 'none' }}
                title="Crear cuenta en Muévete CB"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 16, height: 16 }}>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>Registrarse</span>
              </Link>
            )}
          </>
        )}
      </div>
    </header>
  );
}
