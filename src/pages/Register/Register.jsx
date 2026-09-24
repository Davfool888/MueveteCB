import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import RegisterCard from '../../components/register/RegisterCard';

export default function Register() {
  const navigate = useNavigate();

  function handleSelectPassenger() {
    navigate('/registro/pasajero');
  }

  function handleSelectDriver() {
    navigate('/registro/conductor');
  }

  return (
    <div className="page-shell">
      <a className="skip-link" href="#contenido-registro">
        Saltar al contenido principal
      </a>

      {/* Header reutilizado con la misma identidad visual de Muévete CB */}
      <Header
        showRegisterLink={false}
        customActions={
          <Link
            to="/"
            className="button button-ghost button-small"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="Regresar a la página principal"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 16, height: 16 }}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Volver al inicio</span>
          </Link>
        }
      />

      <main id="contenido-registro" className="register-main">
        <section className="register-section" aria-labelledby="register-title">
          {/* Cabecera del flujo */}
          <div className="register-heading">
            <span className="section-kicker">
              <span className="register-kicker-dot" aria-hidden="true" />
              Módulo de registro
            </span>
            <h1 id="register-title">Crea tu cuenta</h1>
            <p>Selecciona cómo quieres utilizar Muévete CB.</p>
          </div>

          {/* Tarjetas de selección de perfil */}
          <div className="register-cards-grid">
            {/* Tarjeta Pasajero */}
            <RegisterCard
              title="Pasajero"
              description="Encuentra rutas, consulta tiempos y recibe recomendaciones para tus desplazamientos."
              badge="Movilidad diaria"
              icon={
                <svg viewBox="0 0 48 48" role="img" aria-hidden="true" className="register-card-svg">
                  {/* Commuter / Passenger transit iconography */}
                  <circle cx="24" cy="12" r="6" />
                  <path d="M14 42v-8a8 8 0 0 1 8-8h4a8 8 0 0 1 8 8v8" />
                  <path d="M10 24h4M34 24h4" />
                  <path d="M19 32h10" />
                  <circle cx="38" cy="14" r="2.5" />
                  <path d="M38 16.5v4" />
                </svg>
              }
              actionLabel="Registrarme como pasajero"
              onClick={handleSelectPassenger}
            />

            {/* Tarjeta Conductor */}
            <RegisterCard
              title="Conductor"
              description="Registra tu vehículo y servicio para ayudar a construir una red de movilidad multimodal."
              badge="Red comunitaria"
              icon={
                <svg viewBox="0 0 48 48" role="img" aria-hidden="true" className="register-card-svg">
                  {/* Transport vehicle / driver iconography */}
                  <rect x="8" y="14" width="32" height="20" rx="4" />
                  <line x1="8" y1="24" x2="40" y2="24" />
                  <circle cx="16" cy="36" r="4" />
                  <circle cx="32" cy="36" r="4" />
                  <line x1="20" y1="36" x2="28" y2="36" />
                  <path d="M14 14l3-6h14l3 6" />
                  <circle cx="24" cy="19" r="1.5" />
                </svg>
              }
              actionLabel="Registrarme como conductor"
              onClick={handleSelectDriver}
            />
          </div>

          {/* Enlace para usuarios registrados */}
          <div className="register-login-prompt">
            <span>¿Ya tienes una cuenta?</span>{' '}
            <Link to="/login" className="register-login-link">
              Iniciar sesión
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
