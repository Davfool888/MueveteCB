import { extractIntent } from './intentParser.js';
import { selectRoute } from './recommendationEngine.js';
import { ROUTE_DATA_VERSION } from './routeCatalog.js';

export function createRequestId() {
  if (globalThis.crypto?.randomUUID) return `req_${globalThis.crypto.randomUUID()}`;
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function limitSafeAnswer(value, maxLength = 450) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).replace(/\s+\S*$/, '')}…`;
}

import { getTransportPlan } from '../services/transportRouting.js';
import { POINTS_OF_INTEREST } from '../data/routes.js';
import { GTFS_ANCHOR_STOPS } from '../data/gtfsIndex.js';

function resolveLocationCandidate(loc, text) {
  if (loc && Number.isFinite(Number(loc.latitude)) && Number.isFinite(Number(loc.longitude))) {
    return {
      label: loc.label || text || 'Ubicación seleccionada',
      latitude: Number(loc.latitude),
      longitude: Number(loc.longitude),
      source: loc.source || 'manual',
    };
  }

  const query = String(text || loc?.label || '').toLowerCase().trim();
  if (!query) return null;

  for (const poi of POINTS_OF_INTEREST) {
    if (query.includes(poi.name.toLowerCase()) || poi.name.toLowerCase().includes(query)) {
      return {
        label: poi.name,
        latitude: poi.coordinates[0],
        longitude: poi.coordinates[1],
        source: 'poi',
      };
    }
  }

  for (const anchor of GTFS_ANCHOR_STOPS) {
    if (query.includes(anchor.label.toLowerCase()) || anchor.label.toLowerCase().includes(query)) {
      return {
        label: anchor.label,
        latitude: anchor.coordinates[0],
        longitude: anchor.coordinates[1],
        source: 'gtfs',
      };
    }
  }

  return null;
}

export function buildFallbackAgentResponse(input = {}, options = {}) {
  const requestId = options.requestId || createRequestId();
  const now = options.now ? new Date(options.now) : new Date();
  const intent = extractIntent(input);
  const decision = selectRoute({ intent, reports: input.activeReports || [], now });

  let answerText;
  let activeDecisionRoute = decision.route;
  let activeStatus = decision.status;

  if (decision.status === 'greeting') {
    answerText = 'Hola, soy Eco. Dime desde dónde sales, a dónde vas y a qué hora necesitas llegar.';
  } else if (decision.status === 'knowledge') {
    answerText = `TransMiCable tiene 4 estaciones: ${decision.knowledge.transMiCableStations.join(', ')}. La tarifa unificada del SITP para 2026 es $${decision.knowledge.sitpFareCop.toLocaleString('es-CO')}; el transbordo integrado tiene una ventana de ${decision.knowledge.transferWindowMinutes} minutos.`;
  } else if (decision.status === 'report_detected') {
    answerText =
      'Para registrar una novedad, usa el botón “Reportar novedad” o escribe el mensaje con lugar y tipo de novedad.';
  } else if (decision.route && (intent.originId === 'mochuelo_alto' || intent.originId === 'mochuelo_bajo' || intent.originId === 'quiba' || intent.originId === 'mirador_paraiso')) {
    const steps = decision.route.steps
      .slice(0, 4)
      .map((step, index) => `${index + 1}. ${step.instruction} (${step.durationMinutes} min).`)
      .join(' ');
    const lead =
      decision.route.id === 'alternate'
        ? 'Ajusté la ruta de demostración para evitar el tramo reportado.'
        : 'Encontré esta ruta de demostración.';
    const cost = decision.route.totalCostCop
      ? ` Costo estimado: ${decision.route.costFormatted}.`
      : '';
    answerText = `${lead} ${steps} Llegas aproximadamente a las ${decision.route.arrivalTime}; duración estimada: ${decision.route.durationMinutes} minutos.${cost}`;
  } else {
    // Si no es una de las 4 rutas demo rígidas, calculamos la ruta dinámicamente con la base de datos de transporte
    const originCandidate = resolveLocationCandidate(input.originLocation, input.origin);
    const destinationCandidate = resolveLocationCandidate(input.destinationLocation, input.destination);

    if (originCandidate && destinationCandidate) {
      const plan = getTransportPlan({
        originLocation: originCandidate,
        destinationLocation: destinationCandidate,
        selectedMode: input.priority === 'cheapest' ? 'sitp' : 'auto',
      });

      const dynamicSteps = [];
      let estDuration = 35;
      let costCop = 3550;
      let costFormatted = '$3.550 COP';

      if (plan.mode === 'veredal' && plan.veredalRoute) {
        const v = plan.veredalRoute;
        dynamicSteps.push({
          order: 1,
          mode: 'informal',
          instruction: `Toma la van veredal (${v.name}) en ${originCandidate.label} hacia ${v.integration?.name || 'punto de integración'}`,
          durationMinutes: 20,
        });
        dynamicSteps.push({
          order: 2,
          mode: 'cable',
          instruction: `Conecta hacia ${destinationCandidate.label} vía TransMiCable o ruta urbana integrada`,
          durationMinutes: 18,
        });
        estDuration = 45;
        costCop = 6050;
        costFormatted = '$6.050 COP';
      } else if (plan.originStop) {
        const stop = plan.originStop;
        const walkMin = Math.max(2, Math.round((stop.distanceKm || 0.2) * 14));
        const availableBuses = (stop.routes || []).slice(0, 3).map((r) => r.shortName).filter(Boolean).join(', ') || 'SITP';
        dynamicSteps.push({
          order: 1,
          mode: 'walk',
          instruction: `Camina hacia la parada ${stop.name} (${Math.round((stop.distanceKm || 0.2) * 1000)} m)`,
          durationMinutes: walkMin,
        });
        dynamicSteps.push({
          order: 2,
          mode: 'sitp',
          instruction: `Aborda el SITP (${availableBuses}) en dirección a ${destinationCandidate.label}`,
          durationMinutes: 24,
        });
        dynamicSteps.push({
          order: 3,
          mode: 'walk',
          instruction: `Llegada a ${destinationCandidate.label}. Transbordo integrado dentro de los 125 minutos`,
          durationMinutes: 4,
        });
        estDuration = walkMin + 28;
      } else {
        dynamicSteps.push({
          order: 1,
          mode: 'walk',
          instruction: `Desplázate desde ${originCandidate.label} hacia el corredor de transporte principal`,
          durationMinutes: 8,
        });
        dynamicSteps.push({
          order: 2,
          mode: 'sitp',
          instruction: `Toma el servicio integrado hacia ${destinationCandidate.label}`,
          durationMinutes: 25,
        });
        estDuration = 35;
      }

      const arrivalMinTotal = (now.getHours() * 60 + now.getMinutes() + estDuration) % (24 * 60);
      const arrH = String(Math.floor(arrivalMinTotal / 60)).padStart(2, '0');
      const arrM = String(arrivalMinTotal % 60).padStart(2, '0');
      const arrivalTime = `${arrH}:${arrM}`;

      activeDecisionRoute = {
        id: `dynamic_${Date.now()}`,
        title: `${originCandidate.label} → ${destinationCandidate.label}`,
        origin: originCandidate.label,
        destination: destinationCandidate.label,
        departureTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        arrivalTime,
        durationMinutes: estDuration,
        confidence: 85,
        totalCostCop: costCop,
        costFormatted,
        costBreakdown: costCop === 6050 ? '$2.500 Van veredal + $3.550 TransMiCable' : 'Tarifa unificada SITP $3.550',
        paymentMethod: costCop === 6050 ? 'Efectivo + TuLlave' : 'Tarjeta TuLlave',
        accessibilityLabel: 'Media; verificar paradero',
        reason: plan.reason || 'Ruta calculada a partir de los paraderos y corredores de Ciudad Bolívar.',
        dataStatus: 'realtime_estimate',
        dataVersion: ROUTE_DATA_VERSION,
        steps: dynamicSteps,
        warnings: decision.warnings || [],
      };
      activeStatus = 'ok';

      const stepsSummary = dynamicSteps.map((s, idx) => `${idx + 1}. ${s.instruction} (${s.durationMinutes} min).`).join(' ');
      let diagnosticNotice = '';
      if (options.fallbackReason === 'insufficient_credits') {
        diagnosticNotice = ' (Nota: tu clave de Anthropic está sin créditos en console.anthropic.com; Eco generó esta ruta con la base de datos de paraderos y rutas de Ciudad Bolívar).';
      }
      answerText = `Ruta calculada para ${originCandidate.label} → ${destinationCandidate.label}: ${stepsSummary} Duración estimada: ${estDuration} min. Costo: ${costFormatted}.${diagnosticNotice}`;
    } else if (decision.status === 'needs_clarification' || decision.status === 'no_route') {
      answerText = decision.clarificationQuestion;
    } else {
      answerText = 'Dime desde qué sector o vereda de Ciudad Bolívar sales y hacia dónde vas para calcularte la ruta.';
    }
  }

  return {
    requestId,
    status: activeStatus,
    answerText: limitSafeAnswer(answerText),
    intent:
      activeStatus === 'greeting'
        ? 'greeting'
        : activeStatus === 'knowledge'
          ? 'mobility_knowledge'
          : 'route_planning',
    needsClarification:
      activeStatus === 'needs_clarification' || activeStatus === 'no_route',
    clarificationQuestion: decision.clarificationQuestion,
    route: activeDecisionRoute,
    knowledge: decision.knowledge || null,
    alternatives: decision.alternatives,
    warnings: activeDecisionRoute?.warnings || decision.warnings,
    usedReportIds: decision.usedReportIds,
    selectionReason: activeDecisionRoute?.reason || decision.selectionReason,
    disclaimer: 'Demostración; no usar para decisiones operativas.',
    meta: {
      source: 'deterministic-fallback',
      model: null,
      dataVersion: ROUTE_DATA_VERSION,
      dataStatus: 'demo',
      generatedAt: now.toISOString(),
      ...(options.fallbackReason ? { fallbackReason: options.fallbackReason } : {}),
      ...(options.errorDetails ? { errorDetails: options.errorDetails } : {}),
    },
  };
}
