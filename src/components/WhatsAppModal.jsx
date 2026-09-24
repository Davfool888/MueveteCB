import React, { useState } from 'react';

export default function WhatsAppModal({ isOpen, onClose, activeRoute, origin, destination, deadline }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const sampleMessage = `Hola Eco, salgo de ${origin || 'Mochuelo Alto'} hacia ${destination || 'Portal Tunal'} para llegar antes de las ${deadline || '07:00'}. ¿Cuál es mi mejor ruta, cuánto me vale y si hay bloqueos?`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(sampleMessage)}`;

  function handleCopy() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(sampleMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wa-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(6, 47, 43, 0.65)',
        backdropFilter: 'blur(4px)',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#ffffff',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* WhatsApp Header */}
        <div
          style={{
            backgroundColor: '#075e54',
            color: '#ffffff',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: '#25d366',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
              }}
            >
              🚡
            </div>
            <div>
              <h3 id="wa-modal-title" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>
                Eco · ECO CB
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#bce7d9' }}>En línea · Asistente Comunitario</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar ventana"
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* WhatsApp Chat Body Simulator */}
        <div
          style={{
            backgroundColor: '#e5ddd5',
            backgroundImage: 'radial-gradient(#cfc3b7 1px, transparent 1px)',
            backgroundSize: '16px 16px',
            padding: '18px 14px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* User message */}
          <div
            style={{
              alignSelf: 'flex-end',
              backgroundColor: '#dcf8c6',
              padding: '10px 14px',
              borderRadius: '12px 0 12px 12px',
              maxWidth: '85%',
              fontSize: '0.88rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
              color: '#111827',
            }}
          >
            <p style={{ margin: 0 }}>{sampleMessage}</p>
            <span style={{ display: 'block', textAlign: 'right', fontSize: '0.7rem', color: '#6b7280', marginTop: '4px' }}>
              Ahora ✓✓
            </span>
          </div>

          {/* Bot reply */}
          <div
            style={{
              alignSelf: 'flex-start',
              backgroundColor: '#ffffff',
              padding: '12px 14px',
              borderRadius: '0 12px 12px 12px',
              maxWidth: '90%',
              fontSize: '0.88rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
              color: '#111827',
            }}
          >
            <strong style={{ display: 'block', color: '#075e54', marginBottom: '4px' }}>
              Eco, asistente de movilidad:
            </strong>
            <p style={{ margin: '0 0 6px' }}>
              ¡Hola vecina/vecino! Para tu trayecto a <strong>{destination || 'Portal Tunal'}</strong>:
            </p>
            <ul style={{ margin: '0 0 8px', paddingLeft: '18px', fontSize: '0.84rem' }}>
              <li>🚐 <strong>1. Tramo veredal:</strong> Salida estimada {activeRoute?.departureClock || '5:35 a. m.'} (tarifa por confirmar).</li>
              <li>🚡 <strong>2. TransMiCable:</strong> En Mirador del Paraíso ($3.550 COP TuLlave, tarifa 2026).</li>
            </ul>
            <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: '#087f68' }}>
              ⏱️ Duración: {activeRoute?.duration || '54 min'} | 💰 Costo estimado: {activeRoute?.costFormatted || '$6.050* COP'}.
            </p>
            <span style={{ display: 'block', textAlign: 'right', fontSize: '0.7rem', color: '#6b7280', marginTop: '4px' }}>
              Ahora
            </span>
          </div>

          <div
            style={{
              backgroundColor: '#fff9c4',
              border: '1px solid #fbc02d',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              color: '#7f6000',
              textAlign: 'center',
            }}
          >
            💡 <strong>Canal accesible de bajo umbral:</strong> Permite planear viajes sin consumir datos pesados ni descargar aplicaciones.
          </div>
        </div>

        {/* Modal Actions */}
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: '#ffffff',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              backgroundColor: '#25d366',
              color: '#ffffff',
              textDecoration: 'none',
              padding: '10px 16px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.92rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(37,211,102,0.3)',
            }}
          >
            <span>💬 Abrir WhatsApp con el mensaje</span>
          </a>
          <p style={{ margin: '2px 0 0', color: '#647572', fontSize: '0.7rem', textAlign: 'center' }}>
            Vista previa del canal. El webhook de Twilio se activa al configurar el número del Sandbox.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCopy}
              type="button"
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                background: '#f9fafb',
                color: '#374151',
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              {copied ? '✓ Copiado al portapapeles' : 'Copiar mensaje de consulta'}
            </button>
            <button
              onClick={onClose}
              type="button"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: '#e5e7eb',
                color: '#374151',
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
