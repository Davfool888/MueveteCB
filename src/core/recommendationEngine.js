import { VERIFIED_FACTS } from '../data/mobilitySources.js';
import {
  DEMO_DATA_WARNING,
  ROUTE_DATA_VERSION,
  getCandidateRoutes,
  getRouteAlternatives,
  getRouteById,
} from './routeCatalog.js';

const REPORT_TYPE_MAP = Object.freeze({
  bloqueo: 'block',
  block: 'block',
  demora: 'delay',
  delay: 'delay',
  cambio: 'route_change',
  route_change: 'route_change',
  clima: 'other',
  otro: 'other',
  other: 'other',
});

const REPORT_LOCATION_BY_LABEL = [
  { id: 'alpes', aliases: ['alpes', 'quiba'] },
  { id: 'paraiso', aliases: ['paraiso', 'mirador', 'villa del rosario'] },
  { id: 'meissen', aliases: ['meissen', 'boyaca'] },
  { id: 'torres', aliases: ['las torres', 'torres'] },
  { id: 'tunal', aliases: ['tunal', 'portal'] },
];
const REPORT_LOCATION_IDS = new Set(REPORT_LOCATION_BY_LABEL.map((location) => location.id));

const REPORT_IMPACT_BY_ROUTE = Object.freeze({
  main: new Set(['alpes', 'paraiso', 'tunal']),
  alternate: new Set(['torres', 'tunal']),
  quiba: new Set(['alpes', 'paraiso', 'tunal']),
  economic: new Set(['meissen', 'tunal']),
  accessible: new Set(['tunal']),
});

const MAX_REPORT_AGE_MS = 3 * 60 * 60 * 1000;
const INACTIVE_STATUSES = new Set(['rejected', 'expired']);

function normalizeReportType(type) {
  return REPORT_TYPE_MAP[String(type || 'other').toLowerCase()] || 'other';
}

export function normalizeReportLocationId(report) {
  if (typeof report?.locationId === 'string' && REPORT_LOCATION_IDS.has(report.locationId)) {
    return report.locationId;
  }
  if (typeof report?.location === 'string' && REPORT_LOCATION_IDS.has(report.location)) {
    return report.location;
  }

  const candidate = report?.location?.id || report?.location?.label || report?.place || '';
  const normalized = String(candidate)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return (
    REPORT_LOCATION_BY_LABEL.find((location) =>
      location.aliases.some((alias) => normalized.includes(alias))
    )?.id || 'alpes'
  );
}

function parseDate(value) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

export function normalizeReport(report) {
  const createdAtMs = parseDate(report?.createdAt || report?.created_at);
  const expiresAtMs = parseDate(report?.expiresAt || report?.expires_at);
  const inferredExpiresAt = createdAtMs === null ? null : createdAtMs + MAX_REPORT_AGE_MS;

  return {
    id: String(report?.id || `report-${createdAtMs || Date.now()}`),
    type: normalizeReportType(report?.type),
    locationId: normalizeReportLocationId(report),
    note: String(report?.note || report?.comment || '').slice(0, 140),
    status: String(report?.status || 'reported').toLowerCase(),
    createdAt: createdAtMs === null ? null : new Date(createdAtMs).toISOString(),
    expiresAt:
      expiresAtMs === null && inferredExpiresAt === null
        ? null
        : new Date(expiresAtMs ?? inferredExpiresAt).toISOString(),
  };
}

export function isReportActive(report, now = new Date()) {
  const normalized = normalizeReport(report);
  if (INACTIVE_STATUSES.has(normalized.status)) return false;

  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);
  const expiresAtMs = parseDate(normalized.expiresAt);
  const createdAtMs = parseDate(normalized.createdAt);

  if (expiresAtMs !== null && expiresAtMs <= nowMs) return false;
  if (!expiresAtMs && createdAtMs !== null && nowMs - createdAtMs > MAX_REPORT_AGE_MS) {
    return false;
  }

  return true;
}

function parseDeadlineMinutes(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

function reportWarning(report) {
  const labels = {
    alpes: 'la vía Alpes–Quiba',
    paraiso: 'el enlace de Mirador del Paraíso',
    meissen: 'el corredor de Meissen',
    torres: 'el cruce de Las Torres',
    tunal: 'el Portal Tunal',
  };
  const typeLabels = {
    block: 'un bloqueo',
    route_change: 'un cambio de ruta',
    delay: 'una demora',
    other: 'una novedad',
  };

  return `Hay ${typeLabels[report.type]} reportado en ${labels[report.locationId] || 'la zona'}.`;
}

function routeForIntent(intent) {
  const candidates = getCandidateRoutes({
    originId: intent.originId,
    destinationId: intent.destinationId,
    priority: intent.priority || 'fastest',
  });
  return candidates[0] || null;
}

function reportAffectsRoute(route, report) {
  return REPORT_IMPACT_BY_ROUTE[route.id]?.has(report.locationId) || false;
}

function applyReportsToRoute({ selectedRoute, reports, now }) {
  let route = selectedRoute;
  const warnings = [];
  const usedReportIds = [];
  let changedByReport = false;

  reports
    .slice(0, 12)
    .map(normalizeReport)
    .filter((report) => isReportActive(report, now))
    .forEach((report) => {
      usedReportIds.push(report.id);
      warnings.push(reportWarning(report));

      const isBlocking = report.type === 'block' || report.type === 'route_change';
      if (!isBlocking || !reportAffectsRoute(route, report)) return;

      if (report.locationId === 'tunal') {
        warnings.push(
          'No encontré una alternativa verificable que evite el Portal Tunal; confirma el estado antes de salir.'
        );
        return;
      }

      if (route.id === 'main' && ['alpes', 'paraiso'].includes(report.locationId)) {
        route = getRouteById('alternate');
        changedByReport = true;
        warnings.push('La alternativa evita el tramo veredal reportado, pero sus condiciones siguen siendo estimadas.');
        return;
      }

      warnings.push('No encontré otra ruta verificable en el catálogo actual que evite este tramo.');
    });

  return { route, warnings, usedReportIds, changedByReport };
}

function clarificationResult(intent) {
  const messages = {
    origin: 'Dime desde qué vereda o sector estás para buscar una ruta.',
    destination: '¿A qué punto de Ciudad Bolívar necesitas llegar?',
    deadline: '¿A qué hora necesitas llegar?',
  };

  return {
    status: 'needs_clarification',
    route: null,
    alternatives: [],
    warnings: [DEMO_DATA_WARNING],
    usedReportIds: [],
    selectionReason: 'Falta un dato obligatorio.',
    clarificationQuestion: messages[intent.clarificationField] || messages.origin,
  };
}

export function selectRoute({ intent, reports = [], now = new Date() }) {
  if (intent.type === 'greeting') {
    return {
      status: 'greeting',
      route: null,
      alternatives: [],
      warnings: [],
      usedReportIds: [],
      selectionReason: 'Saludo sin necesidad de ruta.',
      clarificationQuestion: null,
    };
  }

  if (intent.type === 'knowledge') {
    return {
      status: 'knowledge',
      route: null,
      alternatives: [],
      warnings: ['Los horarios de operación pueden cambiar; confirma el día del viaje.'],
      usedReportIds: [],
      knowledge: {
        transMiCableStations: VERIFIED_FACTS.transMiCableStations,
        sitpFareCop: VERIFIED_FACTS.sitpFareCop,
        transferWindowMinutes: VERIFIED_FACTS.transferWindowMinutes,
        dataCheckedAt: '2026-09-24',
      },
      selectionReason: 'Respuesta basada en datos oficiales verificados.',
      clarificationQuestion: null,
    };
  }

  if (intent.type === 'report') {
    return {
      status: 'report_detected',
      route: null,
      alternatives: [],
      warnings: [DEMO_DATA_WARNING],
      usedReportIds: [],
      selectionReason: 'La persona intends reportar una novedad.',
      clarificationQuestion: null,
    };
  }

  if (intent.type !== 'route') return clarificationResult(intent);

  const baseRoute = routeForIntent(intent);
  if (!baseRoute) {
    return {
      status: 'no_route',
      route: null,
      alternatives: [],
      warnings: [DEMO_DATA_WARNING],
      usedReportIds: [],
      selectionReason: 'No existe una ruta verificable para ese par y prioridad en el catálogo disponible.',
      clarificationQuestion: 'Por ahora solo tengo rutas de demostración hacia el Portal Tunal para los orígenes cargados.',
    };
  }

  const reportDecision = applyReportsToRoute({ selectedRoute: baseRoute, reports, now });
  const selectedRoute = reportDecision.route || baseRoute;
  const warnings = [
    DEMO_DATA_WARNING,
    ...baseRoute.warnings.filter((warning) => warning !== DEMO_DATA_WARNING),
    ...reportDecision.warnings,
  ];
  const deadlineMinutes = parseDeadlineMinutes(intent.arrivalBy);
  const bufferMinutes = deadlineMinutes === null ? null : deadlineMinutes - selectedRoute.arrivalMinutes;
  if (bufferMinutes !== null && bufferMinutes < 0) {
    warnings.push('Con esta ruta estimada no llegas antes de la hora indicada.');
  }

  const route = {
    ...selectedRoute,
    bufferMinutes,
    dataVersion: ROUTE_DATA_VERSION,
  };

  return {
    status: bufferMinutes !== null && bufferMinutes < 0 ? 'stale_data' : 'ok',
    route,
    alternatives: getRouteAlternatives(route.id),
    warnings: [...new Set(warnings)],
    usedReportIds: reportDecision.usedReportIds,
    selectionReason: reportDecision.changedByReport
      ? 'La alternativa evita un tramo informal afectado por un reporte activo.'
      : `Ruta ${baseRoute.priority} disponible dentro del catálogo demostrativo.`,
    clarificationQuestion: null,
  };
}

export function resolveRouteIdForReports({ preferredRouteId, reports = [], now = new Date() }) {
  const preferredRoute = getRouteById(preferredRouteId) || getRouteById('main');
  const decision = applyReportsToRoute({ selectedRoute: preferredRoute, reports, now });

  if (preferredRoute.id === 'alternate') {
    const activeMainBlockers = reports
      .map(normalizeReport)
      .filter(
        (report) =>
          isReportActive(report, now) &&
          ['block', 'route_change'].includes(report.type) &&
          ['alpes', 'paraiso'].includes(report.locationId)
      );
    if (activeMainBlockers.length === 0) return 'main';
  }

  return decision.route?.id || preferredRoute.id;
}
