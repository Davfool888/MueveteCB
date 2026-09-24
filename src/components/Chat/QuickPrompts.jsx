import React from 'react';

const PROMPTS = [
  { label: 'Ver ruta al Tunal', text: 'Estoy en Mochuelo Alto y necesito llegar al Portal Tunal antes de las 7' },
  { label: 'Reportar un bloqueo', text: 'REPORTE bloqueo en la vía Alpes Quiba' },
];

export default function QuickPrompts({ onPrompt }) {
  return (
    <div className="quick-prompts" aria-label="Preguntas sugeridas">
      {PROMPTS.map((p) => (
        <button key={p.label} type="button" onClick={() => onPrompt(p.text)}>
          {p.label}
        </button>
      ))}
    </div>
  );
}
