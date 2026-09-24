import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function Login() {
  return (
    <div className="page-shell">
      <Header
        showRegisterLink={true}
        customActions={
          <Link
            to="/"
            className="button button-ghost button-small"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 16, height: 16 }}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Volver al inicio</span>
          </Link>
        }
      />

      <main className="register-main">
        <section className="register-section" aria-labelledby="login-title">
          <div className="register-heading">
            <span className="section-kicker">Acceso a la plataforma</span>
            <h1 id="login-title">Iniciar sesión</h1>
            <p>Ingresa tus credenciales para acceder a tus rutas guardadas y reportes.</p>
          </div>

          <div className="register-placeholder-card">
            <div className="register-placeholder-badge">Próxima etapa</div>
            <h3>Autenticación y acceso</h3>
            <p>
              El módulo de inicio de sesión se conectará en la siguiente fase de desarrollo.
            </p>
            <div className="register-placeholder-actions">
              <Link to="/registro" className="button button-primary">
                ¿No tienes cuenta? Regístrate aquí
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
