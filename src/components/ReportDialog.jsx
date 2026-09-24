import React, { useRef, useEffect, useState } from 'react';

export default function ReportDialog({ isOpen, onClose, onSubmit }) {
  const dialogRef = useRef(null);
  const [reportType, setReportType] = useState('bloqueo');
  const [location, setLocation] = useState('alpes');
  const [note, setNote] = useState('');

  // Open/close native dialog
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else {
      if (typeof dialog.close === 'function' && dialog.open) dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [isOpen]);

  // Close on backdrop click
  function handleDialogClick(e) {
    if (e.target === dialogRef.current) onClose();
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ type: reportType, location, note, source: 'form' });
    setReportType('bloqueo');
    setLocation('alpes');
    setNote('');
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="report-dialog"
      id="report-dialog"
      aria-labelledby="report-title"
      onClick={handleDialogClick}
    >
      <form onSubmit={handleSubmit}>
        <header className="dialog-header">
          <div>
            <span className="section-kicker">Reporte ciudadano en vivo</span>
            <h2 id="report-title">¿Qué está pasando en la vía?</h2>
            <p>Tu aviso ayuda al agente de IA a recalcular la ruta de otros vecinos en tiempo real.</p>
          </div>
          <button
            className="icon-button dialog-close"
            type="button"
            onClick={onClose}
            aria-label="Cerrar formulario"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18"/>
            </svg>
          </button>
        </header>

        <fieldset className="report-types" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
          <legend>Tipo de novedad</legend>
          <label>
            <input
              type="radio"
              name="reportType"
              value="bloqueo"
              checked={reportType === 'bloqueo'}
              onChange={() => setReportType('bloqueo')}
            />
            <span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3 2.5 20h19L12 3Z"/>
                <path d="M12 9v5M12 17h.01"/>
              </svg>
              <strong>Bloqueo</strong>
              <small>Vía cerrada</small>
            </span>
          </label>

          <label>
            <input
              type="radio"
              name="reportType"
              value="demora"
              checked={reportType === 'demora'}
              onChange={() => setReportType('demora')}
            />
            <span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9"/>
                <path d="M12 7v6l4 2"/>
              </svg>
              <strong>Demora</strong>
              <small>Trancón fuerte</small>
            </span>
          </label>

          <label>
            <input
              type="radio"
              name="reportType"
              value="cambio"
              checked={reportType === 'cambio'}
              onChange={() => setReportType('cambio')}
            />
            <span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h13M14 4l3 3-3 3M20 17H7M10 14l-3 3 3 3"/>
              </svg>
              <strong>Cambio</strong>
              <small>Desvío de ruta</small>
            </span>
          </label>

          <label>
            <input
              type="radio"
              name="reportType"
              value="clima"
              checked={reportType === 'clima'}
              onChange={() => setReportType('clima')}
            />
            <span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>
                <path d="m8 19-2 3M12 19l-2 3M16 19l-2 3"/>
              </svg>
              <strong>Clima / Lluvia</strong>
              <small>Trocha resbalosa</small>
            </span>
          </label>
        </fieldset>

        <label className="field dialog-field">
          <span>Lugar afectado en Ciudad Bolívar</span>
          <span className="input-wrap">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/>
              <circle cx="12" cy="10" r="2.5"/>
            </svg>
            <select
              name="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="alpes">Vía Alpes – Quiba</option>
              <option value="rosario">Sector Villa del Rosario / Paraíso</option>
              <option value="meissen">Av. Boyacá con Meissen</option>
              <option value="torres">Cruce Sector Las Torres</option>
              <option value="tunal">Portal Tunal (Entrada peatonal)</option>
            </select>
          </span>
        </label>

        <label className="field dialog-field">
          <span>
            Detalle del reporte <small>(opcional)</small>
          </span>
          <textarea
            name="note"
            maxLength={140}
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej: Hay árboles caídos o los camperos están subiendo solo hasta la curva..."
          />
        </label>

        <label className="privacy-check">
          <input type="checkbox" name="anonymous" defaultChecked/>
          <span>Mostrar como "Vecino/a de Ciudad Bolívar" (Sin pedir datos personales)</span>
        </label>

        <div className="dialog-actions">
          <button className="button button-ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="button button-primary" type="submit">
            Publicar reporte y recalcular ruta
          </button>
        </div>
        <p className="dialog-local-note">En esta demo, el reporte se procesa inmediatamente y reorienta el agente de movilidad.</p>
      </form>
    </dialog>
  );
}
