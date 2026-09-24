import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import {
  CABLE_PATH,
  SITP_PATH,
  INFORMAL_PATHS,
  POINTS_OF_INTEREST,
  REPORT_LOCATIONS,
  REPORT_TYPE_LABELS,
  ROUTES,
} from '../../data/routes';

/** Create a themed divIcon for Leaflet markers */
function createIcon(kind, label) {
  return L.divIcon({
    className: `muevete-marker marker-${kind}`,
    html: `<span class="marker-core"><span>${label}</span></span>`,
    iconSize: [38, 42],
    iconAnchor: [19, 39],
    popupAnchor: [0, -36],
  });
}

export default function LeafletMap({ activeRouteId, reports, layers, onConnectionChange }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const layerGroupsRef = useRef({});
  const tileErrorsRef = useRef(0);

  // ── Initialise Leaflet map once ───────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    try {
      const map = L.map(mapContainerRef.current, {
        center: [4.535, -74.152],
        zoom: 12,
        minZoom: 10,
        maxZoom: 19,
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
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      });
      tileLayerRef.current = tileLayer;

      tileLayer.on('load', () => onConnectionChange(true));
      tileLayer.on('tileerror', () => {
        tileErrorsRef.current += 1;
        if (tileErrorsRef.current >= 2) onConnectionChange(false);
      });
      tileLayer.addTo(map);

      // Create layer groups
      const groups = {};
      ['route', 'cable', 'sitp', 'informal', 'reports'].forEach((name) => {
        groups[name] = L.layerGroup().addTo(map);
      });
      layerGroupsRef.current = groups;

      // Draw static base layers
      L.polyline(CABLE_PATH, { color: '#d89b18', weight: 5, opacity: 0.92, lineCap: 'round', lineJoin: 'round' })
        .bindTooltip('TransMiCable · trazado de referencia', { sticky: true })
        .addTo(groups.cable);

      L.polyline(SITP_PATH, { color: '#3478b8', weight: 5, opacity: 0.9, lineCap: 'round' })
        .bindTooltip('Eje SITP demostrativo', { sticky: true })
        .addTo(groups.sitp);

      INFORMAL_PATHS.forEach((path) => {
        L.polyline(path.coordinates, { color: '#ef765f', weight: 4, opacity: 0.9, dashArray: '8 9', lineCap: 'round' })
          .bindTooltip(path.name, { sticky: true })
          .addTo(groups.informal);
      });

      POINTS_OF_INTEREST.forEach((poi) => {
        L.marker(poi.coordinates, { icon: createIcon('poi', poi.label), keyboard: true, title: poi.name })
          .bindPopup(`<strong>${poi.name}</strong>${poi.detail}`)
          .addTo(groups.cable);
      });

      setTimeout(() => map.invalidateSize(), 120);
      onConnectionChange(true);
    } catch (err) {
      console.error('No fue posible inicializar Leaflet', err);
      onConnectionChange(false);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Redraw active route when activeRouteId changes ────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const groups = layerGroupsRef.current;
    if (!map || !groups.route) return;

    const route = ROUTES[activeRouteId];
    if (!route) return;

    groups.route.clearLayers();
    const isAlternate = route.id === 'alternate';
    const color = isAlternate ? '#d89b18' : '#087f68';

    // Halo + line
    L.polyline(route.mapPath, {
      color: '#ffffff', weight: 11, opacity: 0.92, lineCap: 'round', lineJoin: 'round',
      interactive: false, className: 'leaflet-route-halo',
    }).addTo(groups.route);

    L.polyline(route.mapPath, {
      color, weight: 7, opacity: 1, lineCap: 'round', lineJoin: 'round',
      className: `leaflet-route-line${isAlternate ? ' route-alert' : ''}`,
    }).bindTooltip(`${route.title} · ${route.duration}`, { sticky: true }).addTo(groups.route);

    // Origin / destination markers
    L.marker(route.mapPath[0], { icon: createIcon('route', 'A'), keyboard: true, title: `Origen: ${route.origin}`, zIndexOffset: 700 })
      .bindPopup(`<strong>Origen</strong>${route.origin}`)
      .addTo(groups.route);

    const dest = route.mapPath[route.mapPath.length - 1];
    L.marker(dest, { icon: createIcon('route', 'B'), keyboard: true, title: `Destino: ${route.destination}`, zIndexOffset: 700 })
      .bindPopup(`<strong>Destino</strong>${route.destination}`)
      .addTo(groups.route);

    // Fit bounds
    setTimeout(() => {
      map.fitBounds(L.latLngBounds(route.mapPath), {
        paddingTopLeft: [35, 30],
        paddingBottomRight: [35, 80],
        maxZoom: 14,
        animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      });
    }, 60);
  }, [activeRouteId]);

  // ── Redraw report markers when reports change ─────────────────────────────
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
        zIndexOffset: 600,
      });
      const popupEl = document.createElement('div');
      const t = document.createElement('strong');
      t.textContent = `${typeLabel} · ${locData.name}`;
      const d = document.createElement('div');
      d.textContent = 'Reportado por la comunidad · hace un momento';
      popupEl.append(t, d);
      if (report.note) {
        const n = document.createElement('p');
        n.textContent = report.note;
        popupEl.append(n);
      }
      marker.bindPopup(popupEl).addTo(groups.reports);
    });
  }, [reports]);

  // ── Toggle layer groups when layers prop changes ──────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const groups = layerGroupsRef.current;
    if (!map) return;
    Object.entries(layers).forEach(([name, isActive]) => {
      const group = groups[name];
      if (!group) return;
      if (isActive && !map.hasLayer(group)) group.addTo(map);
      else if (!isActive && map.hasLayer(group)) group.removeFrom(map);
    });
  }, [layers]);

  // Invalidate size when tab becomes visible again
  useEffect(() => {
    function handleVisibility() {
      if (!document.hidden && mapRef.current) {
        setTimeout(() => mapRef.current?.invalidateSize(), 80);
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  return (
    <div
      ref={mapContainerRef}
      id="map"
      aria-label="Mapa interactivo de rutas formales, informales y reportes"
    />
  );
}
