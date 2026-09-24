import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { GTFS_ANCHOR_STOPS } from '../../data/gtfsIndex';
import {
  CIUDAD_BOLIVAR_BOUNDS,
  CIUDAD_BOLIVAR_CENTER,
  CIUDAD_BOLIVAR_POLYGON,
  TRANSMICABLE_STATIONS,
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

  // ── Initialise Leaflet map strictly bounded to Ciudad Bolívar ──────────────
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
      tileLayerRef.current = tileLayer;

      tileLayer.on('load', () => onConnectionChange(true));
      tileLayer.on('tileerror', () => {
        tileErrorsRef.current += 1;
        if (tileErrorsRef.current >= 2) onConnectionChange(false);
      });
      tileLayer.addTo(map);

      // Create layer groups
      const groups = {};
      ['boundary', 'route', 'cable', 'sitp', 'informal', 'reports'].forEach((name) => {
        groups[name] = L.layerGroup().addTo(map);
      });
      layerGroupsRef.current = groups;

      // 1. Draw Ciudad Bolívar boundary (Localidad 19)
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

      // 2. TransMiCable aerial path
      L.polyline(CABLE_PATH, {
        color: '#d89b18',
        weight: 6,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      })
        .bindTooltip('🚡 TransMiCable (Portal Tunal ↔ Mirador del Paraíso) · $3.550 (2026)', { sticky: true })
        .addTo(groups.cable);

      // 3. TransMiCable Stations
      TRANSMICABLE_STATIONS.forEach((st) => {
        const marker = L.marker(st.coordinates, {
          icon: createIcon('cable', '🚡'),
          keyboard: true,
          title: st.name,
        });

        const popupContent = `
          <div style="min-width: 190px;">
            <span style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: #d89b18;">${st.tag}</span>
            <h4 style="margin: 2px 0 6px; font-size: 1.05rem; color: #062f2b;">${st.name}</h4>
            <p style="margin: 0 0 6px; font-size: 0.85rem; color: #516564;">${st.detail}</p>
            <div style="display: flex; gap: 6px; font-size: 0.78rem;">
              <span style="background: #eef4ef; padding: 2px 6px; border-radius: 6px; font-weight: 600; color: #075d50;">Fuente: TransMilenio</span>
              <span style="background: #fff3cf; padding: 2px 6px; border-radius: 6px; font-weight: 600; color: #9a6c0b;">$3.550 COP</span>
            </div>
          </div>
        `;
        marker.bindPopup(popupContent).addTo(groups.cable);
      });

      // 4. SITP Path
      L.polyline(SITP_PATH, {
        color: '#3478b8',
        weight: 5,
        opacity: 0.9,
        lineCap: 'round',
      })
        .bindTooltip('🚌 Corredor SITP de demostración · $3.550 (2026)', { sticky: true })
        .addTo(groups.sitp);

      // Official GTFS anchor stops. Geometry remains a separate fixture until David supplies route shapes.
      GTFS_ANCHOR_STOPS.forEach((stop) => {
        const marker = L.circleMarker(stop.coordinates, {
          radius: 5,
          color: '#174a7e',
          weight: 2,
          fillColor: '#ffffff',
          fillOpacity: 1,
          keyboard: true,
          title: `${stop.name} — GTFS 2026-08-18`,
        });
        const popup = document.createElement('div');
        popup.style.minWidth = '210px';
        const title = document.createElement('strong');
        title.textContent = stop.name;
        const source = document.createElement('div');
        source.textContent = 'Fuente: GTFS SITP · 18 de agosto de 2026';
        source.style.cssText = 'font-size:0.72rem;color:#516564;margin:3px 0 7px;';
        const routeTitle = document.createElement('div');
        routeTitle.textContent = 'Servicios que pasan por este punto:';
        routeTitle.style.cssText = 'font-size:0.78rem;font-weight:700;margin-bottom:4px;';
        const routeList = document.createElement('ul');
        routeList.style.cssText = 'margin:0;padding-left:18px;font-size:0.78rem;line-height:1.45;';
        stop.routes.slice(0, 10).forEach((route) => {
          const item = document.createElement('li');
          item.textContent = `${route.shortName || route.id} — ${route.longName || 'SITP'}`;
          routeList.append(item);
        });
        if (stop.routes.length > 10) {
          const more = document.createElement('li');
          more.textContent = `y ${stop.routes.length - 10} servicios más`;
          routeList.append(more);
        }
        popup.append(title, source, routeTitle, routeList);
        marker.bindPopup(popup).addTo(groups.sitp);
      });

      // 5. Informal and Veredales paths
      INFORMAL_PATHS.forEach((path) => {
        L.polyline(path.coordinates, {
          color: '#ef765f',
          weight: 4,
          opacity: 0.92,
          dashArray: '8 9',
          lineCap: 'round',
        })
          .bindTooltip(`🚐 ${path.name} · Tarifa aprox: ${path.cost} (${path.frequency})`, { sticky: true })
          .addTo(groups.informal);
      });

      // 6. Community Points of Interest
      POINTS_OF_INTEREST.forEach((poi) => {
        L.marker(poi.coordinates, {
          icon: createIcon('poi', poi.label),
          keyboard: true,
          title: poi.name,
        })
          .bindPopup(`<strong>${poi.name}</strong><div>${poi.detail}</div>`)
          .addTo(groups.boundary);
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

    const route = ROUTES[activeRouteId] || ROUTES.main;
    if (!route) return;

    groups.route.clearLayers();
    const isAlternate = route.id === 'alternate';
    const isEconomic = route.id === 'economic';
    const isAccessible = route.id === 'accessible';

    const color = isAlternate
      ? '#d89b18'
      : isEconomic
      ? '#3478b8'
      : isAccessible
      ? '#0a9b7d'
      : '#087f68';

    // Halo + main line
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
      .bindTooltip(`📍 ${route.title} · ⏱️ ${route.duration} · 💰 ${route.costFormatted}`, { sticky: true })
      .addTo(groups.route);

    // Origin marker
    L.marker(route.mapPath[0], {
      icon: createIcon('route', 'A'),
      keyboard: true,
      title: `Origen: ${route.origin}`,
      zIndexOffset: 700,
    })
      .bindPopup(`<strong>Origen</strong><p style="margin:2px 0 0">${route.origin}</p>`)
      .addTo(groups.route);

    // Destination marker
    const dest = route.mapPath[route.mapPath.length - 1];
    L.marker(dest, {
      icon: createIcon('route', 'B'),
      keyboard: true,
      title: `Destino: ${route.destination}`,
      zIndexOffset: 700,
    })
      .bindPopup(`<strong>Destino</strong><p style="margin:2px 0 0">${route.destination}</p>`)
      .addTo(groups.route);

    // Fit bounds smoothly within Ciudad Bolívar
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
      aria-label="Mapa interactivo de Ciudad Bolívar: rutas formales, informales, paraderos y reportes"
    />
  );
}
