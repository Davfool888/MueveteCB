import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { hasLocationCoordinates } from '../../utils/locationRoute';
import {
  BOGOTA_BOUNDS,
  CABLE_PATH,
  CIUDAD_BOLIVAR_BOUNDS,
  CIUDAD_BOLIVAR_CENTER,
  CIUDAD_BOLIVAR_POLYGON,
  REPORT_LOCATIONS,
  REPORT_TYPE_LABELS,
  ROUTES,
  TRANSMICABLE_STATIONS,
} from '../../data/routes';

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

  if (plan.mode === 'veredal' && plan.veredalRoute) {
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

    route.stops.forEach((stop) => addContextStop(groups.veredal, stop));

    if ((plan.continuationPath || []).length > 1) {
      L.polyline(plan.continuationPath, {
        color: '#3478b8',
        weight: 4,
        opacity: 0.9,
        dashArray: '4 7',
        lineCap: 'round',
        className: 'leaflet-continuation-line',
      })
        .bindTooltip('Continuación hacia el transporte urbano · geometría existente', { sticky: true })
        .addTo(groups.sitp);
    }
    return;
  }

  if (plan.showCable) {
    L.polyline(CABLE_PATH, {
      color: '#d89b18',
      weight: 5,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
    })
      .bindTooltip('🚡 TransMiCable · referencia de la estación seleccionada', { sticky: true })
      .addTo(groups.cable);

    TRANSMICABLE_STATIONS.forEach((station) => {
      const marker = L.marker(station.coordinates, {
        icon: createIcon('cable', '🚡'),
        keyboard: true,
        title: station.name,
      });
      marker.bindPopup(createStopPopup({ ...station, source: 'transmilenio_2026' })).addTo(groups.cable);
    });
  }

  (plan.contextStops || []).forEach((stop) => addContextStop(groups.sitp, stop));
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
        maxBounds: CIUDAD_BOLIVAR_BOUNDS,
        maxBoundsViscosity: 0.95,
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
      ['boundary', 'route', 'cable', 'sitp', 'informal', 'veredal', 'reports'].forEach((name) => {
        groups[name] = L.layerGroup().addTo(map);
      });
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
    const usesRoadRoute = activeRoute?.isRoadRoute === true;
    const contextualRoute =
      !isVeredalPlan && !usesRoadRoute && transportPlan?.routePath && !activeRoute
        ? {
            id: transportPlan.mode,
            title: transportPlan.modeLabel,
            mapPath: transportPlan.routePath,
            duration: 'Tiempo por validar',
            costFormatted: 'Costo por validar',
          }
        : null;
    const route = usesRoadRoute
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

    if (destinationPoint) {
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
    const fitPath = usesRoadRoute
      ? route.mapPath
      : isVeredalPlan
        ? transportPlan?.fitPath || endpointPoints
        : hasRoute
          ? route.mapPath
          : endpointPoints;

    if (fitPath.length === 0) {
      map.setMaxBounds(CIUDAD_BOLIVAR_BOUNDS);
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
        map.setView(fitPath[0], Math.max(map.getZoom(), 14), { animate });
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
    if (!map) return;

    const contextualLayers = new Set();
    if (activeRoute || (transportPlan && transportPlan.status !== 'idle')) contextualLayers.add('route');
    if (transportPlan?.mode === 'veredal') contextualLayers.add('veredal');
    if (transportPlan?.mode === 'sitp' || transportPlan?.continuationPath?.length) contextualLayers.add('sitp');
    if (transportPlan?.showCable || transportPlan?.mode === 'cable') contextualLayers.add('cable');

    ['boundary', 'route', 'cable', 'sitp', 'informal', 'veredal', 'reports'].forEach((name) => {
      const group = groups[name];
      if (!group) return;
      const shouldShow = Boolean(layers[name] || contextualLayers.has(name));
      if (shouldShow && !map.hasLayer(group)) group.addTo(map);
      if (!shouldShow && map.hasLayer(group)) group.removeFrom(map);
    });
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

  const mapDescription = activeRoute?.isRoadRoute
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
