import React, { useState } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import Header from '../../components/Header';

import Footer from '../../components/Footer';

import StepIndicator from '../../components/register/StepIndicator';

import { PASSENGER_TRANSPORT_OPTIONS } from '../../data/transportOptions';

const STEPS = [
  { title: 'Datos personales' },
  { title: 'Preferencias' },
  { title: 'Confirmación' },
];

const LOCALIDADES = [
  'Ciudad Bolívar',
  'Usme',
  'Bosa',
  'Kennedy',
  'Tunjuelito',
  'Rafael Uribe Uribe',
  'San Cristóbal',
  'Otra',
];

const INITIAL_FORM = {
  nombre: '',
  apellido: '',
  correo: '',
  telefono: '',
  contrasena: '',
  confirmar: '',
  localidad: '',
  barrio: '',
  transportes: [],
};

export default function PassengerRegister() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '', submit: '' }));
  }

  function toggleTransporte(id) {
    setForm((prev) => {
      const already = prev.transportes.includes(id);

      return {
        ...prev,
        transportes: already
          ? prev.transportes.filter((t) => t !== id)
          : [...prev.transportes, id],
      };
    });

    setErrors((prev) => ({ ...prev, transportes: '' }));
  }

  function validateStep1() {
    const errs = {};

    if (!form.nombre.trim()) {
      errs.nombre = 'El nombre es requerido.';
    }

    if (!form.apellido.trim()) {
      errs.apellido = 'El apellido es requerido.';
    }

    if (!form.correo.trim() || !/\S+@\S+\.\S+/.test(form.correo)) {
      errs.correo = 'Ingresa un correo válido.';
    }

    if (
      !form.telefono.trim() ||
      !/^\d{7,12}$/.test(form.telefono.replace(/\s/g, ''))
    ) {
      errs.telefono = 'Ingresa un teléfono válido (7–12 dígitos).';
    }

    if (form.contrasena.length < 6) {
      errs.contrasena =
        'La contraseña debe tener al menos 6 caracteres.';
    }

    if (form.contrasena !== form.confirmar) {
      errs.confirmar = 'Las contraseñas no coinciden.';
    }

    return errs;
  }

  function validateStep2() {
    const errs = {};

    if (!form.localidad) {
      errs.localidad = 'Selecciona una localidad.';
    }

    if (form.transportes.length === 0) {
      errs.transportes =
        'Selecciona al menos un medio de transporte.';
    }

    return errs;
  }

  function handleNext() {
    const errs = step === 1 ? validateStep1() : validateStep2();

    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setStep((s) => s + 1);

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  function handleBack() {
    setStep((s) => s - 1);

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setErrors((prev) => ({
      ...prev,
      submit: '',
    }));

    try {
      const response = await fetch(
        'http://localhost:3001/api/passengers',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nombre: form.nombre,
            apellido: form.apellido,
            correo: form.correo,
            telefono: form.telefono,
            contrasena: form.contrasena,
            localidad: form.localidad,
            barrio: form.barrio,
            transportes: form.transportes,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'No se pudo registrar el pasajero'
        );
      }

      console.log('Pasajero registrado:', data);

      setSubmitted(true);
    } catch (error) {
      console.error('Error en el registro:', error);

      setErrors({
        submit: error.message,
      });
    }
  }

  if (submitted) {
    return (
      <div className="page-shell">
        <Header
          showRegisterLink={false}
          customActions={<BackToSelectButton />}
        />

        <main className="register-main">
          <div className="reg-success-card">
            <div className="reg-success-icon" aria-hidden="true">
              ✅
            </div>

            <h1>¡Registro completado!</h1>

            <p>
              Bienvenido/a,{' '}
              <strong>
                {form.nombre} {form.apellido}
              </strong>
              .
              <br />
              Tu cuenta de <strong>Pasajero</strong> ha sido creada
              correctamente.
            </p>

            <Link
              to="/"
              className="button button-primary"
              style={{
                textDecoration: 'none',
                marginTop: '8px',
              }}
            >
              Ir a la plataforma
            </Link>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <a
        className="skip-link"
        href="#reg-passenger-content"
      >
        Saltar al contenido principal
      </a>

      <Header
        showRegisterLink={false}
        customActions={<BackToSelectButton />}
      />

      <main
        id="reg-passenger-content"
        className="register-main"
        style={{ alignItems: 'flex-start' }}
      >
        <div className="reg-form-shell">

          {/* cabecera */}

          <div className="reg-form-head">
            <span className="section-kicker">
              Registro · Pasajero
            </span>

            <h1>
              {step === 1 && 'Datos personales'}
              {step === 2 && 'Preferencias de movilidad'}
              {step === 3 && 'Confirma tu registro'}
            </h1>

            <div style={{ marginTop: '18px' }}>
              <StepIndicator
                steps={STEPS}
                currentStep={step}
              />
            </div>
          </div>

          {/* paso 1 */}

          {step === 1 && (
            <form
              className="reg-form"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                handleNext();
              }}
            >
              <div className="reg-field-row">
                <FormField
                  id="nombre"
                  label="Nombre"
                  value={form.nombre}
                  onChange={(v) => set('nombre', v)}
                  error={errors.nombre}
                  placeholder="Ej. María"
                  required
                />

                <FormField
                  id="apellido"
                  label="Apellido"
                  value={form.apellido}
                  onChange={(v) => set('apellido', v)}
                  error={errors.apellido}
                  placeholder="Ej. Vargas"
                  required
                />
              </div>

              <FormField
                id="correo"
                label="Correo electrónico"
                type="email"
                value={form.correo}
                onChange={(v) => set('correo', v)}
                error={errors.correo}
                placeholder="tucorreo@email.com"
                required
              />

              <FormField
                id="telefono"
                label="Número de teléfono"
                type="tel"
                value={form.telefono}
                onChange={(v) => set('telefono', v)}
                error={errors.telefono}
                placeholder="Ej. 3001234567"
                hint="Solo números, sin espacios ni guiones."
                required
              />

              <FormField
                id="contrasena"
                label="Contraseña"
                type="password"
                value={form.contrasena}
                onChange={(v) => set('contrasena', v)}
                error={errors.contrasena}
                placeholder="Mínimo 6 caracteres"
                required
              />

              <FormField
                id="confirmar"
                label="Confirmar contraseña"
                type="password"
                value={form.confirmar}
                onChange={(v) => set('confirmar', v)}
                error={errors.confirmar}
                placeholder="Repite tu contraseña"
                required
              />

              <div className="reg-form-actions">
                <Link
                  to="/registro"
                  className="button button-ghost"
                >
                  Cancelar
                </Link>

                <button
                  type="submit"
                  className="button button-primary"
                >
                  Continuar

                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </div>
            </form>
          )}

          {/* paso 2 */}

          {step === 2 && (
            <form
              className="reg-form"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                handleNext();
              }}
            >
              <div className="reg-field-col">
                <label
                  className="reg-label"
                  htmlFor="localidad"
                >
                  Localidad{' '}
                  <span className="reg-required">
                    *
                  </span>
                </label>

                <div className="input-wrap">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                    <circle
                      cx="12"
                      cy="10"
                      r="2.5"
                    />
                  </svg>

                  <select
                    id="localidad"
                    value={form.localidad}
                    onChange={(e) =>
                      set('localidad', e.target.value)
                    }
                    aria-invalid={!!errors.localidad}
                  >
                    <option value="">
                      Selecciona tu localidad
                    </option>

                    {LOCALIDADES.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>

                {errors.localidad && (
                  <span className="reg-error">
                    {errors.localidad}
                  </span>
                )}
              </div>

              <FormField
                id="barrio"
                label="Barrio o sector"
                value={form.barrio}
                onChange={(v) => set('barrio', v)}
                placeholder="Ej. Lucero Bajo, Candelaria la Nueva"
                hint="Opcional — te ayuda a personalizar tus rutas."
              />

              <div className="reg-field-col">
                <span className="reg-label">
                  Medios de transporte que usas{' '}
                  <span className="reg-required">
                    *
                  </span>
                </span>

                <div className="transport-selector-grid">
                  {PASSENGER_TRANSPORT_OPTIONS.map((opt) => {
                    const active =
                      form.transportes.includes(opt.id);

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`transport-option-pill${
                          active ? ' is-selected' : ''
                        }`}
                        onClick={() =>
                          toggleTransporte(opt.id)
                        }
                        aria-pressed={active}
                        title={opt.description}
                      >
                        <span
                          className="transport-option-icon"
                          aria-hidden="true"
                        >
                          {opt.icon}
                        </span>

                        <span className="transport-option-label">
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {errors.transportes && (
                  <span className="reg-error">
                    {errors.transportes}
                  </span>
                )}
              </div>

              <div className="reg-form-actions">
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={handleBack}
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>

                  Atrás
                </button>

                <button
                  type="submit"
                  className="button button-primary"
                >
                  Continuar

                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </div>
            </form>
          )}

          {/* paso 3 — confirmación */}

          {step === 3 && (
            <form
              className="reg-form"
              onSubmit={handleSubmit}
            >
              <div className="reg-summary">
                <h3 className="reg-summary-title">
                  Revisa tu información
                </h3>

                <SummaryRow
                  label="Nombre completo"
                  value={`${form.nombre} ${form.apellido}`}
                />

                <SummaryRow
                  label="Correo"
                  value={form.correo}
                />

                <SummaryRow
                  label="Teléfono"
                  value={form.telefono}
                />

                <SummaryRow
                  label="Localidad"
                  value={form.localidad || '—'}
                />

                <SummaryRow
                  label="Barrio / sector"
                  value={form.barrio || '—'}
                />

                <SummaryRow
                  label="Transportes"
                  value={
                    form.transportes.length
                      ? PASSENGER_TRANSPORT_OPTIONS
                          .filter((o) =>
                            form.transportes.includes(o.id)
                          )
                          .map((o) => o.label)
                          .join(', ')
                      : '—'
                  }
                />

                <div className="reg-summary-note">
                  <span aria-hidden="true">
                    🔒
                  </span>{' '}
                  Tu contraseña está cifrada y nunca se
                  mostrará en este resumen.
                </div>

                {errors.submit && (
                  <div
                    className="reg-error"
                    role="alert"
                    style={{ marginTop: '12px' }}
                  >
                    {errors.submit}
                  </div>
                )}
              </div>

              <div className="reg-form-actions">
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={handleBack}
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>

                  Editar
                </button>

                <button
                  type="submit"
                  className="button button-primary"
                >
                  Confirmar registro

                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ── sub-componentes locales ────────────────────────────────────────────────

function BackToSelectButton() {
  return (
    <Link
      to="/registro"
      className="button button-ghost button-small"
      style={{
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        style={{
          width: 16,
          height: 16,
        }}
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>

      <span>Cambiar perfil</span>
    </Link>
  );
}

function FormField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  hint,
  required,
}) {
  return (
    <div className="reg-field-col">
      <label
        className="reg-label"
        htmlFor={id}
      >
        {label}

        {required && (
          <span
            className="reg-required"
            aria-hidden="true"
          >
            {' '}
            *
          </span>
        )}
      </label>

      <div className="input-wrap">
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
          placeholder={placeholder}
          required={required}
          aria-invalid={!!error}
          aria-describedby={
            error
              ? `${id}-err`
              : hint
                ? `${id}-hint`
                : undefined
          }
          autoComplete={
            type === 'password'
              ? 'new-password'
              : type === 'email'
                ? 'email'
                : 'off'
          }
          style={{ paddingLeft: '14px' }}
        />
      </div>

      {hint && !error && (
        <span
          id={`${id}-hint`}
          className="form-hint"
        >
          {hint}
        </span>
      )}

      {error && (
        <span
          id={`${id}-err`}
          className="reg-error"
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="reg-summary-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}