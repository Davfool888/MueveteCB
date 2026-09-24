import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import StepIndicator from '../../components/register/StepIndicator';

const PASSENGER_STEPS = [
  { title: 'Datos personales' },
  { title: 'Preferencias de movilidad' },
  { title: 'Confirmación' },
];

export default function PassengerRegister() {
  return (
    <div className="page-shell">
      <Header
        showRegisterLink={false}
        customActions={
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
        }
      />

      <main className="register-main">
        <section className="register-section" aria-labelledby="passenger-reg-title">
          <div className="register-heading">
            <span className="section-kicker">Paso a paso · Pasajero</span>
            <h1 id="passenger-reg-title">Registro de Pasajero</h1>
            <p>Configura tu cuenta para recibir rutas inteligentes en Ciudad Bolívar.</p>
          </div>

          {/* Indicador de pasos preparado para las siguientes etapas */}
          <div style={{ maxWidth: '640px', margin: '0 auto 32px' }}>
            <StepIndicator steps={PASSENGER_STEPS} currentStep={1} />
          </div>

          <div className="register-placeholder-card">
            <div className="register-placeholder-badge">Próxima etapa</div>
            <h3>Paso 1: Información personal</h3>
            <p>
              El formulario para registro de datos personales y preferencias de movilidad
              se implementará en la siguiente fase según el flujo planificado.
            </p>
            <div className="register-placeholder-actions">
              <Link to="/registro" className="button button-ghost">
                Volver a selección de perfil
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
