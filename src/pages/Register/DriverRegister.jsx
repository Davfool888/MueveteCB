import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import StepIndicator from '../../components/register/StepIndicator';
import { DRIVER_TRANSPORT_OPTIONS } from '../../data/transportOptions';

const STEPS = [
  { title: 'Medio de transporte' },
  { title: 'Datos personales' },
  { title: 'Vehículo' },
  { title: 'Servicio' },
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

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const INITIAL_FORM = {
  // paso 1
  transporte: '',
  // paso 2
  nombre: '',
  apellido: '',
  documento: '',
  telefono: '',
  correo: '',
  contrasena: '',
  confirmar: '',
  // paso 3
  tipoVehiculo: '',
  placa: '',
  marca: '',
  modelo: '',
  anio: '',
  color: '',
  capacidad: '',
  estadoOperativo: 'activo',
  // paso 4
  localidad: '',
  sector: '',
  inicioRuta: '',
  destinoRuta: '',
  horaInicio: '',
  horaFin: '',
  dias: [],
};

export default function DriverRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function toggleDia(dia) {
    setForm((prev) => {
      const already = prev.dias.includes(dia);
      return { ...prev, dias: already ? prev.dias.filter((d) => d !== dia) : [...prev.dias, dia] };
    });
    setErrors((prev) => ({ ...prev, dias: '' }));
  }

  // validaciones por paso
  function validate() {
    const errs = {};
    if (step === 1) {
      if (!form.transporte) errs.transporte = 'Selecciona un medio de transporte.';
    }
    if (step === 2) {
      if (!form.nombre.trim()) errs.nombre = 'El nombre es requerido.';
      if (!form.apellido.trim()) errs.apellido = 'El apellido es requerido.';
      if (!form.documento.trim()) errs.documento = 'El número de documento es requerido.';
      if (!form.telefono.trim() || !/^\d{7,12}$/.test(form.telefono.replace(/\s/g, '')))
        errs.telefono = 'Ingresa un teléfono válido.';
      if (!form.correo.trim() || !/\S+@\S+\.\S+/.test(form.correo))
        errs.correo = 'Ingresa un correo válido.';
      if (form.contrasena.length < 6)
        errs.contrasena = 'La contraseña debe tener al menos 6 caracteres.';
      if (form.contrasena !== form.confirmar)
        errs.confirmar = 'Las contraseñas no coinciden.';
    }
    if (step === 3) {
      if (!form.tipoVehiculo.trim()) errs.tipoVehiculo = 'El tipo de vehículo es requerido.';
      if (!form.placa.trim()) errs.placa = 'La placa es requerida.';
      if (!form.marca.trim()) errs.marca = 'La marca es requerida.';
      if (!form.modelo.trim()) errs.modelo = 'El modelo es requerido.';
      if (!form.anio.trim() || !/^\d{4}$/.test(form.anio)) errs.anio = 'Ingresa un año válido (4 dígitos).';
    }
    if (step === 4) {
      if (!form.localidad) errs.localidad = 'La localidad es requerida.';
      if (!form.inicioRuta.trim()) errs.inicioRuta = 'El punto de inicio es requerido.';
      if (!form.destinoRuta.trim()) errs.destinoRuta = 'El destino es requerido.';
      if (!form.horaInicio) errs.horaInicio = 'La hora de inicio es requerida.';
      if (!form.horaFin) errs.horaFin = 'La hora de finalización es requerida.';
      if (form.dias.length === 0) errs.dias = 'Selecciona al menos un día de operación.';
    }
    return errs;
  }

  function handleNext() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleBack() {
    setStep((s) => s - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleSubmit(e) {
    e.preventDefault();
    // aquí iría la llamada al backend en fases posteriores
    setSubmitted(true);
  }

  const transporteLabel = DRIVER_TRANSPORT_OPTIONS.find((o) => o.id === form.transporte)?.label || '—';

  if (submitted) {
    return (
      <div className="page-shell">
        <Header showRegisterLink={false} customActions={<BackButton />} />
        <main className="register-main">
          <div className="reg-success-card">
            <div className="reg-success-icon" aria-hidden="true">🚦</div>
            <h1>¡Registro enviado!</h1>
            <p>
              Gracias, <strong>{form.nombre} {form.apellido}</strong>.<br />
              Tu perfil de <strong>Conductor · {transporteLabel}</strong> está{' '}
              <span className="reg-badge-pending">pendiente de verificación</span>.
            </p>
            <p className="reg-success-note">
              Nuestro equipo revisará tu información y te notificará al correo <strong>{form.correo}</strong>.
            </p>
            <Link to="/" className="button button-primary" style={{ textDecoration: 'none', marginTop: '8px' }}>
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
      <a className="skip-link" href="#reg-driver-content">Saltar al contenido principal</a>
      <Header showRegisterLink={false} customActions={<BackButton />} />

      <main id="reg-driver-content" className="register-main" style={{ alignItems: 'flex-start' }}>
        <div className="reg-form-shell">
          {/* cabecera */}
          <div className="reg-form-head">
            <span className="section-kicker">Registro · Conductor</span>
            <h1>
              {step === 1 && 'Medio de transporte'}
              {step === 2 && 'Datos personales'}
              {step === 3 && 'Datos del vehículo'}
              {step === 4 && 'Datos del servicio'}
              {step === 5 && 'Confirma tu registro'}
            </h1>
            <div style={{ marginTop: '18px' }}>
              <StepIndicator steps={STEPS} currentStep={step} />
            </div>
          </div>

          {/* ── paso 1: medio de transporte ── */}
          {step === 1 && (
            <form className="reg-form" noValidate onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
              <div className="reg-field-col">
                <span className="reg-label">
                  Selecciona tu medio de transporte <span className="reg-required">*</span>
                </span>
                <div className="driver-transport-grid">
                  {DRIVER_TRANSPORT_OPTIONS.map((opt) => {
                    const active = form.transporte === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`driver-transport-pill${active ? ' is-selected' : ''}`}
                        onClick={() => set('transporte', opt.id)}
                        aria-pressed={active}
                      >
                        <span className="driver-transport-icon" aria-hidden="true">{opt.icon}</span>
                        <span className="driver-transport-label">{opt.label}</span>
                        <span className="driver-transport-desc">{opt.description}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.transporte && <span className="reg-error">{errors.transporte}</span>}
                <p className="form-hint" style={{ marginTop: '14px' }}>
                  ⚠️ El mecanismo de validación variará según el operador del servicio seleccionado.
                </p>
              </div>

              <div className="reg-form-actions">
                <Link to="/registro" className="button button-ghost">Cancelar</Link>
                <button type="submit" className="button button-primary">
                  Continuar
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                </button>
              </div>
            </form>
          )}

          {/* ── paso 2: datos personales ── */}
          {step === 2 && (
            <form className="reg-form" noValidate onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
              <div className="reg-field-row">
                <FormField id="nombre" label="Nombre" value={form.nombre} onChange={(v) => set('nombre', v)} error={errors.nombre} placeholder="Ej. Carlos" required />
                <FormField id="apellido" label="Apellido" value={form.apellido} onChange={(v) => set('apellido', v)} error={errors.apellido} placeholder="Ej. Rodríguez" required />
              </div>
              <FormField id="documento" label="Número de documento" value={form.documento} onChange={(v) => set('documento', v)} error={errors.documento} placeholder="Ej. 1024856321" required />
              <FormField id="telefono" label="Teléfono" type="tel" value={form.telefono} onChange={(v) => set('telefono', v)} error={errors.telefono} placeholder="Ej. 3001234567" required />
              <FormField id="correo" label="Correo electrónico" type="email" value={form.correo} onChange={(v) => set('correo', v)} error={errors.correo} placeholder="tucorreo@email.com" required />
              <FormField id="contrasena" label="Contraseña" type="password" value={form.contrasena} onChange={(v) => set('contrasena', v)} error={errors.contrasena} placeholder="Mínimo 6 caracteres" required />
              <FormField id="confirmar" label="Confirmar contraseña" type="password" value={form.confirmar} onChange={(v) => set('confirmar', v)} error={errors.confirmar} placeholder="Repite tu contraseña" required />

              <div className="reg-form-actions">
                <button type="button" className="button button-ghost" onClick={handleBack}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                  Atrás
                </button>
                <button type="submit" className="button button-primary">
                  Continuar
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                </button>
              </div>
            </form>
          )}

          {/* ── paso 3: datos del vehículo ── */}
          {step === 3 && (
            <form className="reg-form" noValidate onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
              <div className="reg-field-row">
                <FormField id="tipoVehiculo" label="Tipo de vehículo" value={form.tipoVehiculo} onChange={(v) => set('tipoVehiculo', v)} error={errors.tipoVehiculo} placeholder="Ej. Campero, Minibus" required />
                <FormField id="placa" label="Placa" value={form.placa} onChange={(v) => set('placa', v.toUpperCase())} error={errors.placa} placeholder="Ej. ABC-123" required />
              </div>
              <div className="reg-field-row">
                <FormField id="marca" label="Marca" value={form.marca} onChange={(v) => set('marca', v)} error={errors.marca} placeholder="Ej. Chevrolet" required />
                <FormField id="modelo" label="Modelo" value={form.modelo} onChange={(v) => set('modelo', v)} error={errors.modelo} placeholder="Ej. N200" required />
              </div>
              <div className="reg-field-row">
                <FormField id="anio" label="Año" type="number" value={form.anio} onChange={(v) => set('anio', v)} error={errors.anio} placeholder="Ej. 2018" hint="Entre 1990 y el año actual." required />
                <FormField id="color" label="Color" value={form.color} onChange={(v) => set('color', v)} placeholder="Ej. Blanco" />
              </div>
              <div className="reg-field-row">
                <FormField id="capacidad" label="Capacidad de pasajeros" type="number" value={form.capacidad} onChange={(v) => set('capacidad', v)} placeholder="Ej. 8" hint="Aproximada." />
                <div className="reg-field-col">
                  <label className="reg-label" htmlFor="estadoOperativo">Estado operativo</label>
                  <div className="input-wrap">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v6l4 2" /></svg>
                    <select id="estadoOperativo" value={form.estadoOperativo} onChange={(e) => set('estadoOperativo', e.target.value)}>
                      <option value="activo">Activo</option>
                      <option value="mantenimiento">En mantenimiento</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="reg-form-actions">
                <button type="button" className="button button-ghost" onClick={handleBack}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                  Atrás
                </button>
                <button type="submit" className="button button-primary">
                  Continuar
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                </button>
              </div>
            </form>
          )}

          {/* ── paso 4: datos del servicio ── */}
          {step === 4 && (
            <form className="reg-form" noValidate onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
              <div className="reg-field-row">
                <div className="reg-field-col">
                  <label className="reg-label" htmlFor="localidad">
                    Localidad <span className="reg-required">*</span>
                  </label>
                  <div className="input-wrap">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>
                    <select id="localidad" value={form.localidad} onChange={(e) => set('localidad', e.target.value)} aria-invalid={!!errors.localidad}>
                      <option value="">Selecciona</option>
                      {LOCALIDADES.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  {errors.localidad && <span className="reg-error">{errors.localidad}</span>}
                </div>
                <FormField id="sector" label="Sector / barrio" value={form.sector} onChange={(v) => set('sector', v)} placeholder="Ej. Lucero Alto" />
              </div>
              <div className="reg-field-row">
                <FormField id="inicioRuta" label="Punto de inicio habitual" value={form.inicioRuta} onChange={(v) => set('inicioRuta', v)} error={errors.inicioRuta} placeholder="Ej. Mochuelo Alto" required />
                <FormField id="destinoRuta" label="Punto de destino habitual" value={form.destinoRuta} onChange={(v) => set('destinoRuta', v)} error={errors.destinoRuta} placeholder="Ej. Portal Tunal" required />
              </div>
              <div className="reg-field-row">
                <div className="reg-field-col">
                  <label className="reg-label" htmlFor="horaInicio">
                    Hora de inicio <span className="reg-required">*</span>
                  </label>
                  <div className="input-wrap">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></svg>
                    <input id="horaInicio" type="time" value={form.horaInicio} onChange={(e) => set('horaInicio', e.target.value)} aria-invalid={!!errors.horaInicio} style={{ paddingLeft: '43px' }} />
                  </div>
                  {errors.horaInicio && <span className="reg-error">{errors.horaInicio}</span>}
                </div>
                <div className="reg-field-col">
                  <label className="reg-label" htmlFor="horaFin">
                    Hora de finalización <span className="reg-required">*</span>
                  </label>
                  <div className="input-wrap">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></svg>
                    <input id="horaFin" type="time" value={form.horaFin} onChange={(e) => set('horaFin', e.target.value)} aria-invalid={!!errors.horaFin} style={{ paddingLeft: '43px' }} />
                  </div>
                  {errors.horaFin && <span className="reg-error">{errors.horaFin}</span>}
                </div>
              </div>

              <div className="reg-field-col">
                <span className="reg-label">
                  Días de operación <span className="reg-required">*</span>
                </span>
                <div className="dias-grid">
                  {DIAS.map((dia) => {
                    const active = form.dias.includes(dia);
                    return (
                      <button
                        key={dia}
                        type="button"
                        className={`dia-pill${active ? ' is-selected' : ''}`}
                        onClick={() => toggleDia(dia)}
                        aria-pressed={active}
                      >
                        {dia.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
                {errors.dias && <span className="reg-error">{errors.dias}</span>}
              </div>

              <div className="reg-form-actions">
                <button type="button" className="button button-ghost" onClick={handleBack}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                  Atrás
                </button>
                <button type="submit" className="button button-primary">
                  Continuar
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                </button>
              </div>
            </form>
          )}

          {/* ── paso 5: confirmación ── */}
          {step === 5 && (
            <form className="reg-form" onSubmit={handleSubmit}>
              <div className="reg-summary">
                <h3 className="reg-summary-title">Revisa tu información</h3>

                <div className="reg-summary-section">Medio de transporte</div>
                <SummaryRow label="Tipo" value={transporteLabel} />

                <div className="reg-summary-section">Datos personales</div>
                <SummaryRow label="Nombre completo" value={`${form.nombre} ${form.apellido}`} />
                <SummaryRow label="Documento" value={form.documento} />
                <SummaryRow label="Teléfono" value={form.telefono} />
                <SummaryRow label="Correo" value={form.correo} />

                <div className="reg-summary-section">Vehículo</div>
                <SummaryRow label="Tipo" value={form.tipoVehiculo} />
                <SummaryRow label="Placa" value={form.placa} />
                <SummaryRow label="Marca / Modelo" value={`${form.marca} ${form.modelo} (${form.anio})`} />
                <SummaryRow label="Color" value={form.color || '—'} />
                <SummaryRow label="Capacidad" value={form.capacidad ? `${form.capacidad} pasajeros` : '—'} />
                <SummaryRow label="Estado" value={form.estadoOperativo} />

                <div className="reg-summary-section">Servicio</div>
                <SummaryRow label="Localidad" value={form.localidad} />
                <SummaryRow label="Sector" value={form.sector || '—'} />
                <SummaryRow label="Inicio de ruta" value={form.inicioRuta} />
                <SummaryRow label="Destino de ruta" value={form.destinoRuta} />
                <SummaryRow label="Horario" value={`${form.horaInicio} – ${form.horaFin}`} />
                <SummaryRow label="Días" value={form.dias.join(', ') || '—'} />

                <div className="reg-summary-note">
                  <span aria-hidden="true">🔒</span> Tu contraseña está cifrada. <span aria-hidden="true">🕐</span> Tu perfil quedará <strong>pendiente de verificación</strong> hasta ser aprobado por el equipo de Muévete CB.
                </div>
              </div>

              <div className="reg-form-actions">
                <button type="button" className="button button-ghost" onClick={handleBack}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                  Editar
                </button>
                <button type="submit" className="button button-primary">
                  Enviar registro
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
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

function BackButton() {
  return (
    <Link
      to="/registro"
      className="button button-ghost button-small"
      style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 16, height: 16 }}>
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      <span>Cambiar perfil</span>
    </Link>
  );
}

function FormField({ id, label, type = 'text', value, onChange, error, placeholder, hint, required }) {
  return (
    <div className="reg-field-col">
      <label className="reg-label" htmlFor={id}>
        {label}
        {required && <span className="reg-required" aria-hidden="true"> *</span>}
      </label>
      <div className="input-wrap">
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
          autoComplete={type === 'password' ? 'new-password' : type === 'email' ? 'email' : 'off'}
          style={{ paddingLeft: '14px' }}
        />
      </div>
      {hint && !error && <span id={`${id}-hint`} className="form-hint">{hint}</span>}
      {error && <span id={`${id}-err`} className="reg-error" role="alert">{error}</span>}
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
