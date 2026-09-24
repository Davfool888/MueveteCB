import React from 'react';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="brand footer-brand">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 44 44">
            <path d="M11 29c0-8 5-11 11-11 5 0 8-3 8-7"/>
            <circle cx="11" cy="31" r="4"/>
            <circle cx="32" cy="10" r="4"/>
            <path d="M19 31h9"/>
          </svg>
        </span>
        <span className="brand-copy">
          <strong>Muevete CB</strong>
          <small>Prototipo de demostración</small>
        </span>
      </div>
      <p>Creado para moverte con menos dudas, más contexto y participación comunitaria.</p>
      <p className="footer-legal">Datos de mapa © colaboradores de OpenStreetMap (ODbL).</p>
    </footer>
  );
}
