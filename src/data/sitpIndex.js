/**
 * Índice derivado del extracto oficial de servicios y paraderos del SITP.
 *
 * Los dos JSON llegan planos desde `scripts/build-sitp-snapshot.mjs`; aquí solo se
 * normalizan, se congelan y se precalculan los índices que necesita el motor.
 * No hay lógica dedecision: las consultas espaciales viven en
 * `src/services/sitpRoutesService.js`.
 */

import routesSnapshot from './sitp-routes-snapshot.json' with { type: 'json' };
import stopsSnapshot from './sitp-stops-snapshot.json' with { type: 'json' };

/** Cambia cuando se regenera el extracto; se propaga a la respuesta del agente. */
export const SITP_ROUTE_DATA_VERSION = 'sitp-snapshot-2026-09-26-v1';

/**
 * Límites que la interfaz debe mostrar. El extracto de rutas no incluye
 * `stop_times`, así que ninguna hora de salida de aquí es un despacho real.
 */
export const SITP_DATA_BOUNDARIES = Object.freeze([
  'Los trazados y paraderos provienen del servicio oficial del SITP de Transmilenio y cubren el Distrito Capital, no solo Ciudad Bolívar. El punto de abordaje es el paradero más cercano al trazado dentro de 150 m: es una inferencia geográfica, no una matriz oficial de paradas por ruta.',
  'Los horarios son ventanas de operación del operador, no despachos programados. No se puede afirmar una hora de llegada.',
  'El extracto no marca en qué extremo del corredor arranca el bus, así que el sentido se publica tal como lo declara el operador.',
  'El extracto no distingue paraderos de ida y de vuelta, ni módulos con el mismo nombre.',
  'Una ruta marcada como rural opera en horarios de menor frecuencia y con paradas más espaciadas; verifica con el operador.',
]);

const COMPONENT_LABELS = Object.freeze({
  Transmilenio: 'Transmilenio',
  TransMiZonal: 'TransMiZonal',
});

const SERVICE_LABELS = Object.freeze({
  Troncal: 'Troncal',
  Dual: 'Dual',
  Urbano: 'Urbano',
  Alimentación: 'Alimentación',
  Complementaria: 'Complementaria',
  Especial: 'Especial',
});

const BUS_LABELS = Object.freeze({
  Biarticulado: 'Biarticulado',
  Articulado: 'Articulado',
  'Padrón': 'Padrón',
  'Busetón': 'Busetón',
  Buseta: 'Buseta',
  'Articulado dual': 'Articulado dual',
});

function freezeRoute(route) {
  const label = [SERVICE_LABELS[route.serviceType] ?? route.serviceType, route.busType]
    .filter(Boolean)
    .join(' · ');

  return Object.freeze({
    id: route.id,
    code: route.code,
    objectId: route.objectId ?? null,
    name: route.name,
    origin: route.origin,
    destination: route.destination,
    /** Texto "Portal Tunal → San Carlos - Pasquilla" sin duplicar extremos idénticos. */
    corridorLabel:
      route.origin && route.destination && route.origin !== route.destination
        ? `${route.origin} → ${route.destination}`
        : route.name,
    component: COMPONENT_LABELS[route.component] ?? route.component,
    serviceType: SERVICE_LABELS[route.serviceType] ?? route.serviceType,
    busType: BUS_LABELS[route.busType] ?? route.busType,
    busTypeCode: route.busTypeCode ?? null,
    label,
    state: route.state,
    kind: route.kind,
    isRural: Boolean(route.isRural),
    ruralStatus: route.ruralStatus,
    operator: route.operator,
    implementedAt: route.implementedAt,
    daysLabel: route.daysLabel,
    scheduleType: route.scheduleType,
    schedule: Object.freeze({
      weekday: route.schedule.weekday ?? null,
      saturday: route.schedule.saturday ?? null,
      holiday: route.schedule.holiday ?? null,
    }),
    originLocality: Object.freeze({ ...route.originLocality }),
    destinationLocality: Object.freeze({ ...route.destinationLocality }),
    originZone: Object.freeze({ ...route.originZone }),
    destinationZone: Object.freeze({ ...route.destinationZone }),
    lengthKm: route.lengthKm ?? null,
    corridorFraction: route.corridorFraction ?? null,
    cableIntegration: route.cableIntegration
      ? Object.freeze({ ...route.cableIntegration })
      : null,
    boardingStop: route.boardingStop ? Object.freeze({ ...route.boardingStop }) : null,
    alightingStop: route.alightingStop ? Object.freeze({ ...route.alightingStop }) : null,
    paths: Object.freeze(route.paths.map((path) => Object.freeze(path.map((point) => Object.freeze(point))))),
  });
}

function freezeStop(stop) {
  return Object.freeze({
    id: stop.id,
    name: stop.name,
    street: stop.street,
    zone: Object.freeze({ ...stop.zone }),
    locality: Object.freeze({ ...stop.locality }),
    latitude: stop.coordinates[0],
    longitude: stop.coordinates[1],
  });
}

export const SITP_ROUTE_METADATA = Object.freeze({ ...routesSnapshot.metadata });
export const SITP_STOP_METADATA = Object.freeze({ ...stopsSnapshot.metadata });

export const SITP_STOPS = Object.freeze(stopsSnapshot.stops.map(freezeStop));

export const SITP_STOPS_BY_ID = Object.freeze(
  Object.fromEntries(SITP_STOPS.map((stop) => [stop.id, stop]))
);

export const SITP_ROUTES = Object.freeze(routesSnapshot.routes.map(freezeRoute));

export const SITP_ROUTES_BY_ID = Object.freeze(
  Object.fromEntries(SITP_ROUTES.map((route) => [route.id, route]))
);

/**
 * `cod_linea` se repite: la mayoría de corredores aparecen dos veces, uno por
 * sentido. Por eso el índice es una lista y no un objeto único.
 */
export const SITP_ROUTE_IDS_BY_CODE = Object.freeze(
  SITP_ROUTES.reduce((accumulator, route) => {
    const existing = accumulator[route.code];
    if (existing) existing.push(route.id);
    else accumulator[route.code] = [route.id];
    return accumulator;
  }, Object.create(null))
);

/** Rutas cuyo trazado llega a menos de 1 km de una estación TransMiCable. */
export const SITP_CABLE_ROUTE_IDS = Object.freeze(
  SITP_ROUTES.filter((route) => route.cableIntegration).map((route) => route.id)
);

/** Rutas rurales declaradas por el operador, útil para contraste con la van. */
export const SITP_RURAL_ROUTE_IDS = Object.freeze(
  SITP_ROUTES.filter((route) => route.isRural).map((route) => route.id)
);

export function getSitpRouteById(routeId) {
  return SITP_ROUTES_BY_ID[routeId] ?? null;
}

export function getSitpRoutesByCode(code) {
  const ids = SITP_ROUTE_IDS_BY_CODE[code];
  if (!ids) return [];
  return ids.map((id) => SITP_ROUTES_BY_ID[id]).filter(Boolean);
}

export function getSitpStopById(stopId) {
  return SITP_STOPS_BY_ID[stopId] ?? null;
}
