import React from 'react';
import LeafletMap from './LeafletMap';
import FallbackMap from './FallbackMap';
import LayerToolbar from './LayerToolbar';
import MapBottomCard from './MapBottomCard';

export default function MapPanel({
  activeRouteId,
  activeRoute,
  reports,
  layers,
  mapConnected,
  onToggleLayer,
  onShareRoute,
  onMapConnectionChange,
}) {
  const isAlert = activeRoute?.id === 'alternate';

  return (
    <article className="map-card" aria-labelledby="map-title">
      <header className="panel-header map-header">
        <div>
          <span className="section-kicker">Lectura rápida</span>
          <h2 id="map-title">Mapa de la comunidad</h2>
        </div>
        <div className="map-actions">
          <span className={`map-state${mapConnected ? '' : ' is-offline'}`}>
            <span aria-hidden="true"></span>
            <span id="map-connection">{mapConnected ? 'Mapa en vivo' : 'Vista sin conexión'}</span>
          </span>
          <button
            className="icon-button"
            id="share-route"
            type="button"
            aria-label="Compartir ruta"
            title="Compartir ruta"
            onClick={onShareRoute}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="18" cy="5" r="2.5"/>
              <circle cx="6" cy="12" r="2.5"/>
              <circle cx="18" cy="19" r="2.5"/>
              <path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"/>
            </svg>
          </button>
        </div>
      </header>

      <LayerToolbar
        layers={layers}
        reportCount={reports.length}
        onToggle={onToggleLayer}
      />

      <div className={`map-wrap${mapConnected ? ' is-online' : ' is-schematic'}`} id="map-wrap">
        <FallbackMap activeRoute={activeRoute} isOnline={mapConnected} />
        <LeafletMap
          activeRouteId={activeRouteId}
          reports={reports}
          layers={layers}
          onConnectionChange={onMapConnectionChange}
        />
        <MapBottomCard activeRoute={activeRoute} isAlert={isAlert} />
      </div>

      <div className="map-note">
        <span>Base: OpenStreetMap + corte GTFS 18-08-2026.</span>
        <span>Los trayectos veredales y sus tiempos siguen en validación.</span>
      </div>
    </article>
  );
}
