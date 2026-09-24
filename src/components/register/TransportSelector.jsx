import React from 'react';

/**
 * Selector de modos de transporte reutilizable para registro de pasajeros y conductores.
 */
export default function TransportSelector({
  options = [],
  selected = [],
  onChange,
  multiSelect = false,
  label = 'Selecciona medio de transporte',
}) {
  function handleSelect(optionId) {
    if (!onChange) return;
    if (multiSelect) {
      if (selected.includes(optionId)) {
        onChange(selected.filter((id) => id !== optionId));
      } else {
        onChange([...selected, optionId]);
      }
    } else {
      onChange(optionId);
    }
  }

  function isSelected(optionId) {
    return multiSelect ? selected.includes(optionId) : selected === optionId;
  }

  return (
    <fieldset className="transport-selector-fieldset">
      {label && <legend className="transport-selector-legend">{label}</legend>}
      <div className="transport-selector-grid">
        {options.map((opt) => {
          const active = isSelected(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              className={`transport-option-pill ${active ? 'is-selected' : ''}`}
              onClick={() => handleSelect(opt.id)}
              aria-pressed={active}
            >
              <span className="transport-option-icon" aria-hidden="true">{opt.icon}</span>
              <span className="transport-option-label">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
