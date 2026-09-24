import React from 'react';

const LAYER_DEFS = [
  { key: 'route', label: 'Ruta', legendClass: 'legend-line legend-route' },
  { key: 'cable', label: 'TransMiCable 🚡', legendClass: 'legend-line legend-cable' },
  { key: 'sitp', label: 'SITP 🚌', legendClass: 'legend-line legend-sitp' },
  { key: 'informal', label: 'Veredales 🚐', legendClass: 'legend-line legend-informal' },
  { key: 'boundary', label: 'Límite CB 📍', legendClass: 'legend-line legend-route' },
];

export default function LayerToolbar({ layers, reportCount, onToggle }) {
  return (
    <div className="layer-toolbar" aria-label="Capas del mapa">
      {LAYER_DEFS.map(({ key, label, legendClass }) => (
        <button
          key={key}
          className={`layer-button${layers[key] ? ' is-active' : ''}`}
          type="button"
          data-layer={key}
          aria-pressed={layers[key] ? 'true' : 'false'}
          onClick={() => onToggle(key)}
        >
          <span className={legendClass}/>
          {label}
        </button>
      ))}
      {/* Reports layer */}
      <button
        className={`layer-button${layers.reports ? ' is-active' : ''}`}
        type="button"
        data-layer="reports"
        aria-pressed={layers.reports ? 'true' : 'false'}
        onClick={() => onToggle('reports')}
      >
        <span className="legend-alert">{reportCount}</span>
        Alertas ({reportCount})
      </button>
    </div>
  );
}
