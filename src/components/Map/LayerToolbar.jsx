import React from 'react';

export default function LayerToolbar({
  layers,
  reportCount,
  transportPlan,
  sitpStatus = 'idle',
  sitpStopCount = 0,
  sitpRouteCount = 0,
  trunkStationCount = 0,
  visibleSitpRouteCount = null,
  isFiltered = false,
  onSelectTransportMode,
  onToggle,
}) {
  const availableModes = transportPlan?.availableModes || [];
  const hasSitp = availableModes.includes('sitp') || transportPlan?.mode === 'sitp';
  const hasVeredal = availableModes.includes('veredal') || transportPlan?.mode === 'veredal';
  const hasCable = transportPlan?.showCable || transportPlan?.mode === 'cable';
  const cableVisible = Boolean(layers.cable || hasCable);
  const routeVisible = Boolean(
    layers.route || transportPlan?.activeRoute || (transportPlan?.status && transportPlan.status !== 'idle'),
  );
  const officialLoading = sitpStatus === 'loading' || sitpStatus === 'idle';
  const officialFailed = sitpStatus === 'error';

  return (
    <div className="layer-toolbar" aria-label="Capas y modos del mapa">
      <button
        className={`layer-button${routeVisible ? ' is-active' : ''}`}
        type="button"
        data-layer="route"
        aria-pressed={routeVisible ? 'true' : 'false'}
        onClick={() => onToggle('route')}
      >
        <span className="legend-line legend-route" />
        Ruta
      </button>

      <button
        className={`layer-button${layers.boundary ? ' is-active' : ''}`}
        type="button"
        data-layer="boundary"
        aria-pressed={layers.boundary ? 'true' : 'false'}
        onClick={() => onToggle('boundary')}
      >
        <span className="legend-line legend-boundary" />
        Límite CB
      </button>

      <button
        className={`layer-button layer-official${layers.sitpRoutes ? ' is-active' : ''}`}
        type="button"
        data-layer="sitpRoutes"
        aria-pressed={layers.sitpRoutes ? 'true' : 'false'}
        disabled={officialFailed}
        onClick={() => onToggle('sitpRoutes')}
      >
        <span className="legend-line legend-sitp-official" />
        {officialFailed ? 'Rutas SITP no disponible' : officialLoading ? 'Rutas SITP…' : 'Rutas SITP'}
        {sitpRouteCount > 0 && (
          <span className="legend-count">
            {isFiltered ? `${visibleSitpRouteCount ?? 0}/${sitpRouteCount}` : sitpRouteCount}
          </span>
        )}
      </button>

      <button
        className={`layer-button layer-official${layers.sitpStops ? ' is-active' : ''}`}
        type="button"
        data-layer="sitpStops"
        aria-pressed={layers.sitpStops ? 'true' : 'false'}
        disabled={officialFailed}
        onClick={() => onToggle('sitpStops')}
      >
        <span className="legend-stop" />
        {officialFailed ? 'Paradas no disponibles' : officialLoading ? 'Paradas SITP…' : 'Paradas SITP'}
        {sitpStopCount > 0 && <span className="legend-count">{sitpStopCount}</span>}
      </button>

      {hasSitp && (
        <button
          className={`layer-button transport-choice${transportPlan?.mode === 'sitp' ? ' is-active' : ''}`}
          type="button"
          data-transport-mode="sitp"
          aria-pressed={transportPlan?.mode === 'sitp' ? 'true' : 'false'}
          onClick={() => onSelectTransportMode?.('sitp')}
        >
          <span className="legend-line legend-sitp" />
          SITP
        </button>
      )}

      {hasVeredal && (
        <button
          className={`layer-button transport-choice transport-veredal-choice${transportPlan?.mode === 'veredal' ? ' is-active' : ''}`}
          type="button"
          data-transport-mode="veredal"
          aria-pressed={transportPlan?.mode === 'veredal' ? 'true' : 'false'}
          onClick={() => onSelectTransportMode?.('veredal')}
        >
          <span className="legend-line legend-informal" />
          Van veredal
        </button>
      )}

      {hasCable && (
        <button
          className={`layer-button${cableVisible ? ' is-active' : ''}`}
          type="button"
          data-layer="cable"
          aria-pressed={cableVisible ? 'true' : 'false'}
          onClick={() => onToggle('cable')}
        >
          <span className="legend-line legend-cable" />
          TransMiCable
        </button>
      )}

      <button
        className={`layer-button layer-official${layers.trunkStations ? ' is-active' : ''}`}
        type="button"
        data-layer="trunkStations"
        aria-pressed={layers.trunkStations ? 'true' : 'false'}
        disabled={officialFailed}
        onClick={() => onToggle('trunkStations')}
      >
        <span className="legend-stop legend-stop-trunk" />
        {officialFailed ? 'Troncales no disponible' : officialLoading ? 'Estaciones…' : 'Estaciones troncales'}
        {trunkStationCount > 0 && <span className="legend-count">{trunkStationCount}</span>}
      </button>

      <button
        className={`layer-button${layers.reports ? ' is-active' : ''}`}
        type="button"
        data-layer="reports"
        aria-pressed={layers.reports ? 'true' : 'false'}
        onClick={() => onToggle('reports')}
      >
        <span className="legend-alert">{reportCount}</span>
        Alertas ({reportCount})
      </button>
    </div>
  );
}
