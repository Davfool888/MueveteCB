import React from 'react';

const PROMPTS = [
  { label: '⚡ Mochuelo → Tunal', text: 'Estoy en Mochuelo Alto y necesito llegar al Portal Tunal antes de las 7' },
  { label: '💰 Solo tengo $3.000', text: '¿Cuál es la ruta más barata? Solo tengo 3000 pesos.' },
  { label: '♿ Voy con silla de ruedas', text: 'Voy con una persona en silla de ruedas, ¿cuál es la ruta 100% accesible?' },
  { label: '🚨 Reportar bloqueo en Alpes', text: 'REPORTE bloqueo en la vía Alpes Quiba por derrumbe' },
  { label: '🚡 Info TransMiCable', text: '¿Cuáles son los horarios y estaciones del TransMiCable?' },
];

export default function QuickPrompts({ onPrompt }) {
  return (
    <div className="quick-prompts" aria-label="Preguntas sugeridas" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
      {PROMPTS.map((p) => (
        <button
          key={p.label}
          type="button"
          onClick={() => onPrompt(p.text)}
          style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', padding: '4px 10px' }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
