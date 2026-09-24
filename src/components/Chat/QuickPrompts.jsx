import React from 'react';

const PROMPTS = [
  { label: '⚡ Mochuelo → Tunal', text: 'Estoy en Mochuelo Alto y necesito llegar al Portal Tunal antes de las 7' },
  { label: '💰 Opción económica', text: 'Estoy en Mochuelo Bajo y necesito llegar al Portal Tunal antes de las 7. Priorizo una ruta económica.' },
  { label: '♿ Ruta formal PMR', text: 'Estoy en Mirador del Paraíso y necesito llegar al Portal Tunal antes de las 7. Priorizo accesibilidad y quiero verificar las condiciones PMR.' },
  { label: '🚨 Reportar bloqueo en Alpes', text: 'REPORTE bloqueo en la vía Alpes Quiba por derrumbe' },
  { label: '🚡 Info TransMiCable', text: '¿Cuáles son las estaciones, la tarifa y la ventana de transbordo de TransMiCable?' },
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
