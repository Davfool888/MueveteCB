import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { hasLocationCoordinates } from '../../utils/locationRoute';
import {
  BOGOTA_BOUNDS,
  CIUDAD_BOLIVAR_BOUNDS,
  CIUDAD_BOLIVAR_CENTER,
  CIUDAD_BOLIVAR_POLYGON,
  REPORT_LOCATIONS,
  REPORT_TYPE_LABELS,
  ROUTES,
} from '../../data/routes';
import { CABLE_STATIONS } from '../../data/cableIndex';

function createIcon(kind, label) {
  return L.divIcon({
    className: `muevete-marker marker-${kind}`,
    html: `<span class="marker-core"><span>${label}</span></span>`,
    iconSize: [38, 42],
    iconAnchor: [19, 39],
    popupAnchor: [0, -36],
  });
}

function createRouteTooltip(route) {
  const tooltip = document.createElement('div');
  const title = document.createElement('strong');
  const detail = document.createElement('div');
  title.textContent = `📍 ${route.title}`;
  detail.textContent = route.isRoadRoute
    ? `🛣️ ${(Number(route.roadDistanceMeters || 0) / 1000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} km · ${route.routingSourceLabel || 'ruta vial'}`
    : `⏱️ ${route.duration || 'Tiempo por validar'} · 💰 ${route.costFormatted || 'Costo por validar'}`;
  tooltip.append(title, detail);
  return tooltip;
}

function createEndpointPopup(headingText, label) {
  const popup = document.createElement('div');
  const heading = document.createElement('strong');
  const value = document.createElement('p');
  heading.textContent = headingText;
  value.style.margin = '2px 0 0';
  value.textContent = label;
  popup.append(heading, value);
  return popup;
}

function createStopPopup(stop) {
  const popup = document.createElement('div');
  const title = document.createElement('strong');
  const detail = document.createElement('div');
  title.textContent = stop.name;
  detail.textContent = stop.source === 'simulated_veredal_fixture'
    ? 'Paradero veredal simulado para el prototipo'
    : stop.source === 'gtfs_20260818'
      ? 'Fuente: GTFS SITP · 18 de agosto de 2026'
      : 'Punto de integración relacionado con la selección';
  detail.style.cssText = 'font-size:0.75rem;color:#516564;margin-top:4px;';
  popup.append(title, detail);
  return popup;
}

function isIntegrationStop(stop) {
  return stop?.kind === 'integration' || stop?.type === 'integration';
}

/* -------------------------------------------------------------------------- */
/* Capa oficial del SITP                                                       */
/* -------------------------------------------------------------------------- */

/** Paleta por componente: la troncal pesa más que la zonal para no saturar el mapa. */
const SITP_ROUTE_STYLE = {
  Transmilenio: { color: '#8a3b1c', weight: 3.5, opacity: 0.85 },
  TransMiZonal: { color: '#2f6f9f', weight: 2, opacity: 0.7 },
};

const TRUNK_CORRIDOR_STYLE = { color: '#b3352a', weight: 3, opacity: 0.8 };

const STATION_MARKER_STYLE = {
  Portal: { color: '#7a1f16', fill: '#b3352a', radius: 7 },
  Intercambio: { color: '#7a1f16', fill: '#d4705f', radius: 6 },
  Intermedia: { color: '#7a4a20', fill: '#c98a3a', radius: 5 },
  Sencilla: { color: '#5a5f5e', fill: '#9aa3a1', radius: 4 },
};

function formatOfficialKm(value) {
  if (!Number.isFinite(value)) return 'sin dato';
  return `${value.toLocaleString('es-CO', { maximumFractionDigits: 1 })} km`;
}

function createSitpRoutePopup(route) {
  const popup = document.createElement('div');
  const title = document.createElement('strong');
  const corridor = document.createElement('div');
  const facts = document.createElement('div');
  const source = document.createElement('div');

  title.textContent = `🚌 Ruta ${route.code} · ${route.name}`;
  corridor.textContent = route.corridorLabel;
  facts.textContent = [
    route.serviceType,
    route.busType,
    route.isRural ? 'rural' : null,
    formatOfficialKm(route.lengthKm),
    route.operator,
  ]
    .filter(Boolean)
    .join(' · ');
  source.textContent = 'Trazado oficial · TRANSMILENIO S.A. (CC BY 4.0)';
  source.style.cssText = 'font-size:0.72rem;color:#6b7c7a;margin-top:6px;';

  corridor.style.cssText = 'font-size:0.82rem;margin-top:2px;';
  facts.style.cssText = 'font-size:0.78rem;color:#516564;margin-top:4px;';
  popup.append(title, corridor, facts, source);
  return popup;
}

function createSitpStopPopup(stop) {
  const popup = document.createElement('div');
  const title = document.createElement('strong');
  const street = document.createElement('div');
  const meta = document.createElement('div');
  const source = document.createElement('div');

  title.textContent = `🚏 ${stop.name}`;
  street.textContent = stop.street ?? '';
  meta.textContent = `Cenefa ${stop.id} · ${stop.locality?.name ?? 'Distrito'} · Zona ${stop.zone?.name ?? '—'}`;
  source.textContent = 'Paradero oficial · TRANSMILENIO S.A. (CC BY 4.0)';
  source.style.cssText = 'font-size:0.72rem;color:#6b7c7a;margin-top:6px;';

  street.style.cssText = 'font-size:0.82rem;margin-top:2px;';
  meta.style.cssText = 'font-size:0.76rem;color:#516564;margin-top:4px;';
  popup.append(title, street, meta, source);
  return popup;
}

/**
 * Umbral de zoom para dibujar los paraderos.
 *
 * Con 7.653 paraderos del Distrito, pintarlos todos de golpe satura el lienzo y
 * ralentiza el mapa sin aportar nada: a escala de ciudad los puntos se pisan. A
 * partir de este nivel el vecindario ya es legible.
 */
const STOPS_MIN_ZOOM = 13;

/**
 * Dibuja la capa oficial del SITP.
 *
 * `visibleRouteIds` en `null` significa "sin destino seleccionado": se pinta el
 * catálogo completo. Con destino, la capa se reduce a los corredores A → B.
 */
function drawSitpOfficialLayers(sitpData, groups, options = {}) {
  const { highlightRouteId = null, visibleRouteIds = null, zoom = 13 } = options;
  groups.sitpRoutes.clearLayers();
  groups.sitpStops.clearLayers();
  if (!sitpData) return;

  const allowed = Array.isArray(visibleRouteIds) ? new Set(visibleRouteIds) : null;
  const routes = (sitpData.routes ?? []).filter((route) => !allowed || allowed.has(route.id));

  for (const route of routes) {
    const base = SITP_ROUTE_STYLE[route.component] ?? SITP_ROUTE_STYLE.TransMiZonal;
    const highlighted = Boolean(highlightRouteId) && route.id === highlightRouteId;
    for (const path of route.paths) {
      L.polyline(path, {
        ...base,
        color: highlighted ? '#0a9b7d' : base.color,
        weight: highlighted ? base.weight + 2 : base.weight,
        opacity: highlighted ? 1 : base.opacity,
        dashArray: route.isRural ? '7 7' : undefined,
      })
        .bindPopup(createSitpRoutePopup(route))
        .addTo(groups.sitpRoutes);
    }
  }

  if (zoom < STOPS_MIN_ZOOM) return;

  for (const stop of sitpData.stops ?? []) {
    L.circleMarker([stop.latitude, stop.longitude], {
      radius: 3.5,
      color: '#1d5c86',
      weight: 1,
      fillColor: '#cfe6f5',
      fillOpacity: 0.95,
    })
      .bindPopup(createSitpStopPopup(stop))
      .addTo(groups.sitpStops);
  }
}

function createTrunkStationPopup(station) {
  const popup = document.createElement('div');
  const title = document.createElement('strong');
  const facts = document.createElement('div');
  const access = document.createElement('div');
  const source = document.createElement('div');

  title.textContent = `🚍 ${station.name} · ${station.type}`;
  facts.textContent = [
    station.corridorName,
    station.capacityLabel,
    station.location,
    station.isTemporarilyClosed ? station.stage : null,
  ]
    .filter(Boolean)
    .join(' · ');
  access.textContent = station.accessSummary.length
    ? `Accesos: ${station.accessSummary.join(', ')}`
    : 'Sin accesos registrados';
  source.textContent = 'Inventario oficial · TRANSMILENIO S.A. (CC BY 4.0)';
  source.style.cssText = 'font-size:0.72rem;color:#6b7c7a;margin-top:6px;';

  facts.style.cssText = 'font-size:0.78rem;color:#516564;margin-top:4px;';
  access.style.cssText = 'font-size:0.76rem;color:#516564;margin-top:2px;';
  popup.append(title, facts, access, source);
  return popup;
}

/**
 * Dibuja la red troncal: corredores más estaciones.
 *
 * El tipo de estación se codifica en el tamaño y el color del punto, de modo que
 * un portal se distinga de una estación sencilla sin abrir cada marcador.
 */
function drawTrunkLayers(sitpData, groups) {
  groups.trunkCorridors.clearLayers();
  groups.trunkStations.clearLayers();
  if (!sitpData) return;

  const corridorById = new Map((sitpData.trunkCorridors ?? []).map((corridor) => [corridor.id, corridor]));

  for (const corridor of sitpData.trunkCorridors ?? []) {
    for (const path of corridor.paths) {
      L.polyline(path, TRUNK_CORRIDOR_STYLE)
        .bindTooltip(
          `${corridor.name} · ${corridor.type} · ${corridor.stationIds.length} estaciones`,
          { sticky: true },
        )
        .addTo(groups.trunkCorridors);
    }
  }

  for (const station of sitpData.trunkStations ?? []) {
    const style = STATION_MARKER_STYLE[station.type] ?? STATION_MARKER_STYLE.Sencilla;
    const corridor = corridorById.get(station.corridorId);
    L.circleMarker([station.latitude, station.longitude], {
      radius: style.radius,
      color: station.isTemporarilyClosed ? '#6b6b6b' : style.color,
      weight: station.isTemporarilyClosed ? 1.5 : 2,
      dashArray: station.isTemporarilyClosed ? '3 3' : undefined,
      fillColor: station.isTemporarilyClosed ? '#bdbdbd' : style.fill,
      fillOpacity: 0.95,
    })
      .bindPopup(createTrunkStationPopup({ ...station, corridorName: corridor?.name ?? null }))
      .addTo(groups.trunkStations);
  }
}

function isVeredalStop(stop) {
  return stop?.source === 'simulated_veredal_fixture' || stop?.kind === 'transfer';
}

function addContextStop(group, stop) {
  if (!group || !stop?.coordinates) return;

  if (isVeredalStop(stop) || isIntegrationStop(stop)) {
    const marker = L.marker(stop.coordinates, {
      icon: createIcon(isIntegrationStop(stop) ? 'integration' : 'veredal', isIntegrationStop(stop) ? '🚉' : '🚐'),
      keyboard: true,
      title: stop.name,
    });
    marker.bindPopup(createStopPopup(stop)).addTo(group);
    return;
  }

  const marker = L.circleMarker(stop.coordinates, {
    radius: 5,
    color: '#174a7e',
    weight: 2,
    fillColor: '#ffffff',
    fillOpacity: 1,
    keyboard: true,
    title: stop.name,
  });
  marker.bindPopup(createStopPopup(stop)).addTo(group);
}

function drawTransportContext(plan, groups) {
  groups.cable.clearLayers();
  groups.sitp.clearLayers();
  groups.informal.clearLayers();
  groups.veredal.clearLayers();

  if (!plan || plan.status === 'idle') return;

  const legStyles = {
    walk: { color: '#647a75', weight: 4, dashArray: '2 7', group: 'route' },
    road: { color: '#3478b8', weight: 5, dashArray: '7 7', group: 'route' },
    sitp: { color: '#3478b8', weight: 6, dashArray: '10 6', group: 'sitp' },
    veredal: { color: '#ef765f', weight: 6, dashArray: '8 9', group: 'veredal' },
    cable: { color: '#d89b18', weight: 6, dashArray: null, group: 'cable' },
  };

  (plan.legs || []).forEach((leg) => {
    if (!Array.isArray(leg.path) || leg.path.length < 2) return;
    const style = legStyles[leg.mode] || legStyles.road;
    L.polyline(leg.path, {
      color: style.color,
      weight: style.weight,
      opacity: 0.96,
      dashArray: style.dashArray || undefined,
      lineCap: 'round',
      lineJoin: 'round',
      className: `leaflet-plan-leg leaflet-plan-leg-${leg.mode}`,
    })
      .bindTooltip(leg.label || `Tramo ${leg.order}`, { sticky: true })
      .addTo(groups[style.group]);
  });

  if (!plan.legs?.some((leg) => leg.mode === 'veredal') && plan.mode === 'veredal' && plan.veredalRoute) {
    const route = plan.veredalRoute;
    L.polyline(route.route, {
      color: '#ef765f',
      weight: 6,
      opacity: 0.95,
      dashArray: '8 9',
      lineCap: 'round',
      lineJoin: 'round',
      className: 'leaflet-veredal-line',
    })
      .bindTooltip(`🚐 ${route.name} · ruta simulada`, { sticky: true })
      .addTo(groups.veredal);
  }

  if (plan.showCable || plan.legs?.some((leg) => leg.mode === 'cable')) {
    CABLE_STATIONS.forEach((station) => {
      const marker = L.marker(station.coordinates, {
        icon: createIcon('cable', '🚡'),
        keyboard: true,
        title: `${station.name} · ${station.accessLabel}`,
      });
      marker.bindPopup(createStopPopup({ ...station, source: 'transmilenio_2026' })).addTo(groups.cable);
    });
  }

  if (plan.integration?.coordinates) {
    const marker = L.marker(plan.integration.coordinates, {
      icon: createIcon('integration', '🔄'),
      keyboard: true,
      title: `Transbordo: ${plan.integration.name}`,
      zIndexOffset: 650,
    });
    marker.bindPopup(createStopPopup({ ...plan.integration, source: plan.integration.source })).addTo(groups.route);
  }

  (plan.contextStops || []).forEach((stop) => {
    const duplicatesIntegration =
      plan.integration?.coordinates &&
      stop.coordinates?.[0] === plan.integration.coordinates[0] &&
      stop.coordinates?.[1] === plan.integration.coordinates[1];
    if (duplicatesIntegration) return;

    const targetGroup = stop.kind === 'integration' || stop.type === 'integration'
      ? groups.route
      : groups.sitp;
    addContextStop(targetGroup, stop);
  });

  if (!plan.legs?.length && Array.isArray(plan.routePath) && plan.routePath.length > 1) {
    L.polyline(plan.routePath, {
      color: '#3478b8',
      weight: 4,
      opacity: 0.9,
      dashArray: '4 7',
      className: 'leaflet-continuation-line',
    }).addTo(groups.sitp);
  }
}

function isOutsideLocality([latitude, longitude]) {
  return (
    latitude < CIUDAD_BOLIVAR_BOUNDS[0][0] ||
    latitude > CIUDAD_BOLIVAR_BOUNDS[1][0] ||
    longitude < CIUDAD_BOLIVAR_BOUNDS[0][1] ||
    longitude > CIUDAD_BOLIVAR_BOUNDS[1][1]
  );
}

export default function LeafletMap({
  activeRouteId,
  activeRoute,
  transportPlan,
  originLocation,
  destinationLocation,
  reports,
  layers,
  sitpData,
  visibleSitpRouteIds,
  highlightRouteId,
  onConnectionChange,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const layerGroupsRef = useRef({});
  const tileErrorsRef = useRef(0);
  const fitTimeoutRef = useRef(null);

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    try {
      const map = L.map(mapContainerRef.current, {
        center: CIUDAD_BOLIVAR_CENTER,
        zoom: 13,
        minZoom: 11,
        maxZoom: 18,
        maxBounds: BOGOTA_BOUNDS,
        maxBoundsViscosity: 0.35,
        zoomControl: false,
        attributionControl: true,
        preferCanvas: false,
      });
      mapRef.current = map;

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        crossOrigin: true,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | Muévete CB (Localidad 19)',
      });
      tileLayer.on('load', () => onConnectionChange(true));
      tileLayer.on('tileerror', () => {
        tileErrorsRef.current += 1;
        if (tileErrorsRef.current >= 2) onConnectionChange(false);
      });
      tileLayer.addTo(map);

      const groups = {};
      ['boundary', 'route', 'cable', 'sitp', 'informal', 'veredal', 'reports', 'sitpRoutes', 'sitpStops', 'trunkCorridors', 'trunkStations'].forEach(
        (name) => {
          groups[name] = L.layerGroup();
        }
      );
      layerGroupsRef.current = groups;

      L.polygon(CIUDAD_BOLIVAR_POLYGON, {
        color: '#075d50',
        weight: 3,
        opacity: 0.85,
        dashArray: '6 8',
        fillColor: '#0a9b7d',
        fillOpacity: 0.04,
      })
        .bindTooltip('📍 Localidad 19 · Ciudad Bolívar (Área delimitada)', { sticky: true })
        .addTo(groups.boundary);

      setTimeout(() => {
        if (mapRef.current === map && mapContainerRef.current?.isConnected) {
          map.invalidateSize();
        }
      }, 120);
    } catch (error) {
      console.error('No fue posible inicializar Leaflet', error);
      onConnectionChange(false);
    }

    return () => {
      if (fitTimeoutRef.current) window.clearTimeout(fitTimeoutRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const groups = layerGroupsRef.current;
    if (!map || !groups.route) return;

    groups.route.clearLayers();
    if (fitTimeoutRef.current) window.clearTimeout(fitTimeoutRef.current);

    const isVeredalPlan = transportPlan?.mode === 'veredal';
    const hasOriginCoord = hasLocationCoordinates(originLocation);
    const hasDestCoord = hasLocationCoordinates(destinationLocation);
    const isSingleEndpoint = (hasOriginCoord && !hasDestCoord) || (!hasOriginCoord && hasDestCoord);
    const usesRoadRoute = activeRoute?.isRoadRoute === true;
    const transportFitPath =
      transportPlan?.geometry?.fitPath || transportPlan?.fitPath || [];
    const hasTransportItinerary = transportFitPath.length >= 2;
    const contextualRoute =
      !isVeredalPlan &&
      !usesRoadRoute &&
      !hasTransportItinerary &&
      transportPlan?.routePath &&
      !activeRoute
        ? {
            id: transportPlan.mode,
            title: transportPlan.modeLabel,
            mapPath: transportPlan.routePath,
            duration: 'Tiempo por validar',
            costFormatted: 'Costo por validar',
          }
        : null;

    // Si solo hay un extremo (ej. ubicación actual sin destino), no mostramos una ruta desconectada
    const route = hasTransportItinerary || isSingleEndpoint
      ? null
      : usesRoadRoute
        ? activeRoute
        : isVeredalPlan
          ? null
          : activeRoute || contextualRoute || (activeRouteId ? ROUTES[activeRouteId] : null);
    const hasRoute = Boolean(route && Array.isArray(route.mapPath) && route.mapPath.length >= 2);
    const isAlternate = route?.id === 'alternate';
    const isEconomic = route?.id === 'economic';
    const isAccessible = route?.id === 'accessible';

    if (hasRoute) {
      const color = isAlternate
        ? '#d89b18'
        : isEconomic
        ? '#3478b8'
        : isAccessible
        ? '#0a9b7d'
        : '#087f68';

      L.polyline(route.mapPath, {
        color: '#ffffff',
        weight: 12,
        opacity: 0.94,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false,
        className: 'leaflet-route-halo',
      }).addTo(groups.route);

      L.polyline(route.mapPath, {
        color,
        weight: 7,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
        className: `leaflet-route-line${isAlternate ? ' route-alert' : ''}`,
      })
        .bindTooltip(createRouteTooltip(route), { sticky: true })
        .addTo(groups.route);
    }

    const originPoint = hasLocationCoordinates(originLocation)
      ? [Number(originLocation.latitude), Number(originLocation.longitude)]
      : hasRoute
        ? route.mapPath[0]
        : null;
    const destinationPoint = hasLocationCoordinates(destinationLocation)
      ? [Number(destinationLocation.latitude), Number(destinationLocation.longitude)]
      : hasRoute
        ? route.mapPath[route.mapPath.length - 1]
        : null;
    const originLabel = originLocation?.label || route?.origin || 'Punto A';
    const destinationLabel = destinationLocation?.label || route?.destination || 'Punto B';

    const originAccuracyM = Number(originLocation?.accuracy);
    if (originPoint && originLocation?.source === 'gps' && originAccuracyM > 0) {
      // Radio de precisión reportado por el GPS alrededor del punto A.
      L.circle(originPoint, {
        radius: originAccuracyM,
        color: '#2b7de9',
        weight: 1,
        fillColor: '#2b7de9',
        fillOpacity: 0.12,
        interactive: false,
      }).addTo(groups.route);
    }

    if (originPoint) {
      const originIcon = createIcon(originLocation?.source === 'gps' ? 'user' : 'route', 'A');
      L.marker(originPoint, {
        icon: originIcon,
        keyboard: true,
        title: `Origen: ${originLabel}`,
        zIndexOffset: 700,
      })
        .bindPopup(createEndpointPopup('Origen', originLabel))
        .addTo(groups.route);
    }

    if (destinationPoint && (hasDestCoord || hasRoute)) {
      L.marker(destinationPoint, {
        icon: createIcon('route', 'B'),
        keyboard: true,
        title: `Destino: ${destinationLabel}`,
        zIndexOffset: 700,
      })
        .bindPopup(createEndpointPopup('Destino', destinationLabel))
        .addTo(groups.route);
    }

    const endpointPoints = [originPoint, destinationPoint].filter(Boolean);
    const fitPath = isSingleEndpoint
      ? endpointPoints
      : hasTransportItinerary
        ? transportFitPath
        : usesRoadRoute
          ? route.mapPath
          : isVeredalPlan
            ? transportPlan?.fitPath || endpointPoints
            : hasRoute
              ? route.mapPath
              : endpointPoints;

    if (fitPath.length === 0) {
      map.setMaxBounds(BOGOTA_BOUNDS);
      return;
    }

    const hasPointOutsideLocality = fitPath.some(isOutsideLocality);
    map.setMaxBounds(hasPointOutsideLocality ? BOGOTA_BOUNDS : CIUDAD_BOLIVAR_BOUNDS);
    const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    fitTimeoutRef.current = window.setTimeout(() => {
      if (mapRef.current !== map || !map._mapPane || !mapContainerRef.current?.isConnected) return;

      if (fitPath.length >= 2) {
        map.fitBounds(L.latLngBounds(fitPath), {
          paddingTopLeft: [35, 30],
          paddingBottomRight: [35, 80],
          maxZoom: 14,
          animate,
        });
      } else {
        map.setView(fitPath[0], 15, { animate });
      }
    }, 60);
  }, [activeRoute, activeRouteId, destinationLocation, originLocation, transportPlan]);

  useEffect(() => {
    const map = mapRef.current;
    const groups = layerGroupsRef.current;
    if (!map || !groups.reports) return;

    groups.reports.clearLayers();
    reports.forEach((report) => {
      const locData = REPORT_LOCATIONS[report.location] || REPORT_LOCATIONS.alpes;
      const typeLabel = REPORT_TYPE_LABELS[report.type] || 'Novedad';
      const marker = L.marker(locData.coordinates, {
        icon: createIcon('report', '!'),
        keyboard: true,
        title: `${typeLabel}: ${locData.name}`,
        zIndexOffset: 800,
      });

      const popupEl = document.createElement('div');
      popupEl.style.minWidth = '200px';

      const tag = document.createElement('span');
      tag.style.cssText = 'display:inline-block; font-size:0.75rem; font-weight:700; color:#a84335; background:#ffe6e0; padding:2px 6px; border-radius:4px; margin-bottom:4px;';
      tag.textContent = typeLabel;

      const title = document.createElement('strong');
      title.style.cssText = 'display:block; font-size:0.95rem; color:#102a2b; margin-bottom:4px;';
      title.textContent = locData.name;

      const meta = document.createElement('div');
      meta.style.cssText = 'font-size:0.8rem; color:#516564; margin-bottom:6px;';
      meta.textContent = `Estado: ${report.status || 'reportado'} · se oculta al expirar`;

      popupEl.append(tag, title, meta);

      if (report.note) {
        const note = document.createElement('p');
        note.style.cssText = 'margin:0 0 6px; font-size:0.85rem; background:#f7f5ed; padding:6px; border-radius:6px;';
        note.textContent = report.note;
        popupEl.append(note);
      }

      if (['corroborated', 'verified'].includes(report.status)) {
        const corroborate = document.createElement('span');
        corroborate.style.cssText = 'display:inline-block; font-size:0.75rem; color:#087f68; font-weight:600;';
        corroborate.textContent = report.status === 'verified'
          ? '✓ Reporte verificado'
          : '✓ Reporte corroborado por la comunidad';
        popupEl.append(corroborate);
      }

      marker.bindPopup(popupEl).addTo(groups.reports);
    });
  }, [reports]);

  useEffect(() => {
    const groups = layerGroupsRef.current;
    if (!groups.route) return;
    drawTransportContext(transportPlan, groups);
  }, [transportPlan]);

  useEffect(() => {
    const map = mapRef.current;
    const groups = layerGroupsRef.current;
    if (!map) return undefined;

    const redraw = () => {
      const zoom = map.getZoom();
      if (!layers?.sitpRoutes && !layers?.sitpStops) {
        groups.sitpRoutes.clearLayers();
        groups.sitpStops.clearLayers();
        return;
      }
      drawSitpOfficialLayers(sitpData, groups, {
        highlightRouteId: highlightRouteId ?? null,
        visibleRouteIds: visibleSitpRouteIds,
        zoom,
      });
    };

    redraw();
    map.on('zoomend', redraw);
    return () => {
      map.off('zoomend', redraw);
    };
  }, [sitpData, layers?.sitpRoutes, layers?.sitpStops, highlightRouteId, visibleSitpRouteIds]);

  useEffect(() => {
    const groups = layerGroupsRef.current;
    if (!groups.trunkStations) return;
    if (!layers?.trunkStations) {
      groups.trunkCorridors.clearLayers();
      groups.trunkStations.clearLayers();
      return;
    }
    drawTrunkLayers(sitpData, groups);
  }, [sitpData, layers?.trunkStations]);

  useEffect(() => {
    const map = mapRef.current;
    const groups = layerGroupsRef.current;
    if (!map) return;

    const contextualLayers = new Set();
    if (activeRoute || (transportPlan && transportPlan.status !== 'idle')) contextualLayers.add('route');
    if (transportPlan?.mode === 'veredal') contextualLayers.add('veredal');
    if (transportPlan?.mode === 'sitp' || transportPlan?.continuationPath?.length) contextualLayers.add('sitp');
    if (transportPlan?.showCable || transportPlan?.mode === 'cable') contextualLayers.add('cable');

    ['boundary', 'route', 'cable', 'sitp', 'informal', 'veredal', 'reports', 'sitpRoutes', 'sitpStops', 'trunkCorridors', 'trunkStations'].forEach(
      (name) => {
        const group = groups[name];
        if (!group) return;
        const shouldShow = Boolean(layers[name] || contextualLayers.has(name));
        if (shouldShow && !map.hasLayer(group)) group.addTo(map);
        if (!shouldShow && map.hasLayer(group)) group.removeFrom(map);
      }
    );
  }, [activeRoute, layers, transportPlan]);

  useEffect(() => {
    function handleVisibility() {
      if (!document.hidden && mapRef.current) {
        setTimeout(() => mapRef.current?.invalidateSize(), 80);
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const mapDescription = transportPlan?.integration
    ? `ruta multimodal con conexión en ${transportPlan.integration.name}`
    : activeRoute?.isRoadRoute
      ? 'ruta vial más corta entre el origen y el destino'
      : transportPlan?.mode === 'veredal'
        ? 'ruta van veredal simulada con paraderos e integración'
        : transportPlan?.mode === 'sitp'
          ? 'ruta SITP y paraderos relacionados'
          : transportPlan?.mode === 'cable'
            ? 'tramo TransMiCable relacionado'
            : 'selecciona origen y destino';

  return (
    <div
      ref={mapContainerRef}
      id="map"
      aria-label={`Mapa interactivo de Ciudad Bolívar: ${mapDescription}; rutas formales, veredales y reportes`}
    />
  );
}
