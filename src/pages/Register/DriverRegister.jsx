import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import StepIndicator from '../../components/register/StepIndicator';

const DRIVER_STEPS = [
  { title: 'Medio de transporte' },
  { title: 'Datos personales' },
  { title: 'Datos del vehículo' },
  { title: 'Datos del servicio' },
  { title: 'Ruta habitual' },
  { title: 'Confirmación' },
];

export default function DriverRegister() {
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
        <section className="register-section" aria-labelledby="driver-reg-title">
          <div className="register-heading">
            <span className="section-kicker">Paso a paso · Conductor</span>
            <h1 id="driver-reg-title">Registro de Conductor</h1>
            <p>Registra tu vehículo y servicio para integrar tu ruta a la red de Ciudad Bolívar.</p>
          </div>

          {/* Indicador de pasos preparado para las siguientes etapas */}
          <div style={{ maxWidth: '820px', margin: '0 auto 32px' }}>
            <StepIndicator steps={DRIVER_STEPS} currentStep={1} />
          </div>

          <div className="register-placeholder-card">
            <div className="register-placeholder-badge">Próxima etapa</div>
            <h3>Paso 1: Selección de medio de transporte</h3>
            <p>
              El flujo de 6 pasos para conductor (medio de transporte, información personal, datos del
              vehículo, datos del servicio, ruta habitual y confirmación con verificación)
              se construirá progresivamente en las siguientes etapas.
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
