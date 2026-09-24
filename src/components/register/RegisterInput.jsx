import React from 'react';

/**
 * Campo de formulario reutilizable para el módulo de registro.
 * Mantiene el estilo y accesibilidad de los inputs de Muévete CB.
 */
export default function RegisterInput({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  icon,
  hint,
  autoComplete,
  ...props
}) {
  return (
    <label className="field register-field" htmlFor={id}>
      <span className="register-field-label">
        {label}
        {required && <span className="register-required" aria-hidden="true">*</span>}
      </span>
      <span className="input-wrap">
        {icon && (
          <span className="register-input-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...props}
        />
      </span>
      {hint && !error && <span id={`${id}-hint`} className="form-hint">{hint}</span>}
      {error && <span id={`${id}-error`} className="register-field-error" role="alert">{error}</span>}
    </label>
  );
}
