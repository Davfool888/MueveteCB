import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LOGIN_ERROR_MESSAGES = {
  'auth/invalid-email': 'Ingresa un correo electrónico válido.',
  'auth/user-not-found': 'El correo o la contraseña no son correctos.',
  'auth/wrong-password': 'El correo o la contraseña no son correctos.',
  'auth/invalid-credential': 'El correo o la contraseña no son correctos.',
  'auth/invalid-login-credentials': 'El correo o la contraseña no son correctos.',
  'auth/user-disabled': 'Esta cuenta no está disponible actualmente.',
  'auth/network-request-failed': 'No pudimos conectarnos. Revisa tu conexión e inténtalo nuevamente.',
  'auth/internal-error': 'No pudimos conectarnos. Revisa tu conexión e inténtalo nuevamente.',
  'auth/timeout': 'No pudimos conectarnos. Revisa tu conexión e inténtalo nuevamente.',
};

const CONFIGURATION_MESSAGE =
  'La autenticación todavía no está configurada. Agrega las variables VITE_FIREBASE_* para activar el acceso.';

const RESET_SUCCESS_MESSAGE =
  'Te enviamos un enlace para restablecer tu contraseña. Revisa tu correo.';
const RESET_ERROR_MESSAGE =
  'No pudimos enviar el correo de recuperación. Verifica el correo e inténtalo nuevamente.';

function getLoginErrorMessage(error) {
  if (error?.code === 'auth/not-configured') {
    return CONFIGURATION_MESSAGE;
  }

  return LOGIN_ERROR_MESSAGES[error?.code] || 'No pudimos iniciar sesión. Inténtalo nuevamente.';
}

function getResetErrorMessage(error) {
  if (error?.code === 'auth/not-configured') {
    return CONFIGURATION_MESSAGE;
  }

  return RESET_ERROR_MESSAGE;
}

function getRedirectPath(location) {
  const destination = location.state?.from;

  if (typeof destination === 'string' && destination.startsWith('/')) {
    return destination;
  }

  if (destination?.pathname) {
    return `${destination.pathname}${destination.search || ''}${destination.hash || ''}`;
  }

  // TODO: leer users/{uid}.tipo y enviar a /driver cuando ese espacio exista.
  return '/';
}

export default function Login() {
  const { login, resetPassword, isFirebaseConfigured, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  function validateForm() {
    const nextErrors = {};
    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setFieldErrors({});
      setFormError('Completa todos los campos.');
      return false;
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      nextErrors.email = 'Ingresa un correo electrónico válido.';
    }

    if (password.length < 6) {
      nextErrors.password = 'La contraseña debe tener al menos 6 caracteres.';
    }

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return false;
    }

    return true;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting || isResetting) {
      return;
    }

    setFormError('');
    setResetMessage('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(getRedirectPath(location), { replace: true });
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      setFormError(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordReset() {
    setFormError('');
    setResetMessage('');
    setFieldErrors({});

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setFieldErrors({ email: 'Ingresa tu correo electrónico para recuperar la contraseña.' });
      return;
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setFieldErrors({ email: 'Ingresa un correo electrónico válido.' });
      return;
    }

    setIsResetting(true);

    try {
      await resetPassword(normalizedEmail);
      setResetMessage(RESET_SUCCESS_MESSAGE);
    } catch (error) {
      console.error('Error al recuperar contraseña:', error);
      setFormError(getResetErrorMessage(error));
    } finally {
      setIsResetting(false);
    }
  }

  function handleEmailChange(event) {
    setEmail(event.target.value);
    setFieldErrors((current) => ({ ...current, email: '' }));
    setFormError('');
    setResetMessage('');
  }

  function handlePasswordChange(event) {
    setPassword(event.target.value);
    setFieldErrors((current) => ({ ...current, password: '' }));
    setFormError('');
  }

  return (
    <div className="page-shell">
      <a className="skip-link" href="#contenido-login">
        Saltar al contenido principal
      </a>

      <Header />

      <main id="contenido-login" className="register-main login-main">
        <section className="register-section login-section" aria-labelledby="login-title">
          <div className="register-heading login-heading">
            <span className="section-kicker">Acceso a Muévete CB</span>
            <h1 id="login-title">Bienvenido de nuevo</h1>
            <p>Inicia sesión para continuar usando MuéveteCB.</p>
          </div>

          <form
            className="login-card"
            noValidate
            onSubmit={handleSubmit}
            aria-busy={isSubmitting}
          >
            {!isFirebaseConfigured && (
              <p className="login-config-note" role="note">
                La autenticación se activará cuando se configuren las variables de Firebase del proyecto.
              </p>
            )}

            <div className="login-form-fields">
              <div className="login-field">
                <label className="login-label" htmlFor="login-email">
                  Correo electrónico <span className="reg-required" aria-hidden="true">*</span>
                </label>
                <span className="input-wrap login-input-wrap">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 6h16v12H4z" />
                    <path d="m4 7 8 6 8-6" />
                  </svg>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="Ingresa tu correo"
                    autoComplete="email"
                    spellCheck="false"
                    required
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
                  />
                </span>
                {fieldErrors.email && (
                  <span id="login-email-error" className="login-field-error" role="alert">
                    {fieldErrors.email}
                  </span>
                )}
              </div>

              <div className="login-field">
                <label className="login-label" htmlFor="login-password">
                  Contraseña <span className="reg-required" aria-hidden="true">*</span>
                </label>
                <span className="input-wrap login-input-wrap login-password-wrap">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="5" y="10" width="14" height="10" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={handlePasswordChange}
                    placeholder="Ingresa tu contraseña"
                    autoComplete="current-password"
                    minLength={6}
                    required
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                  />
                  <button
                    className="password-toggle"
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={showPassword}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                      <circle cx="12" cy="12" r="2.5" />
                      {showPassword && <path d="m4 4 16 16" />}
                    </svg>
                    <span>{showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}</span>
                  </button>
                </span>
                {fieldErrors.password && (
                  <span id="login-password-error" className="login-field-error" role="alert">
                    {fieldErrors.password}
                  </span>
                )}
              </div>
            </div>

            <div className="login-forgot-row">
              <button
                className="login-forgot-link"
                type="button"
                onClick={handlePasswordReset}
                disabled={isResetting || isSubmitting}
              >
                {isResetting ? 'Enviando enlace...' : '¿Olvidaste tu contraseña?'}
              </button>
            </div>

            {formError && (
              <p className="login-feedback login-feedback-error" role="alert">
                {formError}
              </p>
            )}

            {resetMessage && (
              <p className="login-feedback login-feedback-success" role="status">
                {resetMessage}
              </p>
            )}

            <button
              className="button button-primary button-full login-submit"
              type="submit"
              disabled={isSubmitting || isResetting || authLoading}
            >
              {isSubmitting
                ? 'Iniciando sesión...'
                : authLoading
                  ? 'Verificando sesión...'
                  : 'Iniciar sesión'}
              {!isSubmitting && !authLoading && (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              )}
            </button>

            <div className="login-secondary-actions">
              <p>
                ¿Todavía no tienes una cuenta?{' '}
                <Link to="/registro">Regístrate</Link>
              </p>
              <Link to="/" className="login-home-link">Volver al inicio</Link>
            </div>
          </form>
        </section>
      </main>

      <Footer />
    </div>
  );
}
