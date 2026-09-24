import React from 'react';

/**
 * Tarjeta de selección de perfil para el registro en Muévete CB.
 * Soporta título, descripción, elemento visual/icono, texto de acción y evento onClick.
 */
export default function RegisterCard({
  title,
  description,
  icon,
  actionLabel,
  onClick,
  badge,
  className = '',
}) {
  return (
    <article
      className={`register-card ${className}`}
      tabIndex={0}
      role="region"
      aria-label={`Opción de registro: ${title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick && onClick();
        }
      }}
    >
      <div className="register-card-header">
        <div className="register-card-icon" aria-hidden="true">
          {icon}
        </div>
        {badge && <span className="register-card-badge">{badge}</span>}
      </div>

      <div className="register-card-body">
        <h3 className="register-card-title">{title}</h3>
        <p className="register-card-description">{description}</p>
      </div>

      <div className="register-card-footer">
        <button
          type="button"
          className="button button-primary register-card-button"
          onClick={onClick}
          aria-label={actionLabel}
        >
          <span>{actionLabel}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="register-button-arrow">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </article>
  );
}
