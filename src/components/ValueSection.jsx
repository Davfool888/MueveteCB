import React from 'react';

export default function ValueSection() {
  return (
    <section className="value-section" aria-labelledby="value-title">
      <div className="value-heading">
        <span className="section-kicker">La idea que lo cambia</span>
        <h2 id="value-title">La comunidad también es una fuente de movilidad.</h2>
        <p>El prototipo cierra el círculo: pregunta → compara → muestra → recibe reportes → recalcula.</p>
      </div>
      <div className="value-grid">
        <article>
          <span>01</span>
          <h3>Pregunta normal</h3>
          <p>La persona dice dónde está y a dónde va, sin aprender códigos ni menús.</p>
        </article>
        <article>
          <span>02</span>
          <h3>Respuesta explicada</h3>
          <p>Cada tramo incluye modo, espera aproximada, duración y qué hacer al llegar.</p>
        </article>
        <article>
          <span>03</span>
          <h3>Cambio visible</h3>
          <p>Un reporte se convierte en un marcador y en una nueva recomendación, con menos demora.</p>
        </article>
      </div>
    </section>
  );
}
