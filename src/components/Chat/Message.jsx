import React from 'react';
import { ROUTES } from '../../data/routes';

export default function Message({ msg, onScrollToMap }) {
  const { role, text, routeId } = msg;
  const route = routeId ? ROUTES[routeId] : null;

  return (
    <article className={`message message-${role}`}>
      {role === 'agent' && (
        <span className="message-avatar" aria-hidden="true">A</span>
      )}
      <div className="message-content">
        <p>{text}</p>

        {route && (
          <div className="message-route-card">
            <strong>{route.title} · {route.duration}</strong>
            <ol>
              {route.segments.slice(0, 4).map((seg, i) => (
                <li key={i}>{seg.title} ({seg.time})</li>
              ))}
            </ol>
            <button
              className="message-action"
              type="button"
              onClick={onScrollToMap}
            >
              Ver ruta en el mapa
            </button>
          </div>
        )}

        <span className="message-time">
          {role === 'agent' ? 'Eco · ahora' : 'Tú · ahora'}
        </span>
      </div>
    </article>
  );
}
