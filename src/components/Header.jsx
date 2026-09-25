import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header({
  onOpenReport,
  onOpenWhatsApp,
  customActions,
  showRegisterLink = true,
  showAuthActions = true,
}) {
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('No se pudo cerrar la sesión:', error);
    } finally {
      setIsLoggingOut(false);
    }
  }

  const authActions = !showAuthActions
    ? null
    : authLoading
      ? <span className="auth-session-loading" role="status">Verificando sesión...</span>
      : isAuthenticated
        ? (
          <div className="auth-header-actions">
            <span className="auth-user-summary" title={user?.email || user?.displayName || 'Mi cuenta'}>
              <strong>Mi cuenta</strong>
              <small>{user?.email || user?.displayName || 'Sesión activa'}</small>
            </span>
            <button
              className="button button-ghost button-small auth-header-button"
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              aria-label="Cerrar sesión"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10 17l5-5-5-5M15 12H3" />
                <path d="M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" />
              </svg>
              <span>{isLoggingOut ? 'Cerrando...' : 'Cerrar sesión'}</span>
            </button>
          </div>
        )
        : (
          <Link
            to="/login"
            className="button button-ghost button-small auth-header-button"
            aria-label="Iniciar sesión"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" />
              <path d="M11 12h9m-3-3 3 3-3 3" />
            </svg>
            <span>Iniciar sesión</span>
          </Link>
        );
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
          <>
            {customActions}
            {authActions}
          </>
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

            {showRegisterLink && !isAuthenticated && (
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

            {authActions}
          </>
        )}
      </div>
    </header>
  );
}
