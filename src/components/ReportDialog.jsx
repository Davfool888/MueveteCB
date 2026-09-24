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
            <span className="section-kicker">Reporte ciudadano</span>
            <h2 id="report-title">¿Qué está pasando?</h2>
            <p>Tu aviso ayuda a recalcular la ruta de otros vecinos.</p>
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

        <fieldset className="report-types">
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
              <small>La vía está cerrada</small>
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
              <small>Está avanzando lento</small>
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
              <small>Cambió el recorrido</small>
            </span>
          </label>
        </fieldset>

        <label className="field dialog-field">
          <span>Lugar afectado</span>
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
              <option value="rosario">Sector Villa del Rosario</option>
              <option value="tunal">Portal Tunal</option>
            </select>
          </span>
        </label>

        <label className="field dialog-field">
          <span>
            Comentario <small>(opcional)</small>
          </span>
          <textarea
            name="note"
            maxLength={140}
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Por ejemplo: hay varias personas esperando el colectivo…"
          />
        </label>

        <label className="privacy-check">
          <input type="checkbox" name="anonymous" defaultChecked/>
          <span>Mostrar como "Vecino/a de Ciudad Bolívar"</span>
        </label>

        <div className="dialog-actions">
          <button className="button button-ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="button button-primary" type="submit">
            Enviar y recalcular
          </button>
        </div>
        <p className="dialog-local-note">En esta demo, el reporte se guarda únicamente en este navegador.</p>
      </form>
    </dialog>
  );
}
