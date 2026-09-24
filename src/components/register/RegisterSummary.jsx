import React from 'react';

/**
 * Resumen de datos de registro previo a la confirmación final.
 */
export default function RegisterSummary({
  title = 'Resumen de registro',
  items = [],
  statusBadge,
}) {
  return (
    <div className="register-summary-card">
      <div className="register-summary-header">
        <h4>{title}</h4>
        {statusBadge && <span className="register-summary-status">{statusBadge}</span>}
      </div>
      <dl className="register-summary-list">
        {items.map((item, idx) => (
          <div key={idx} className="register-summary-row">
            <dt>{item.label}</dt>
            <dd>{item.value || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
