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

export function buildFallbackAgentResponse(input = {}, options = {}) {
  const requestId = options.requestId || createRequestId();
  const now = options.now ? new Date(options.now) : new Date();
  const intent = extractIntent(input);
  const decision = selectRoute({ intent, reports: input.activeReports || [], now });

  let answerText;
  if (decision.status === 'greeting') {
    answerText = 'Hola, soy Eco. Dime desde dónde sales, a dónde vas y a qué hora necesitas llegar.';
  } else if (decision.status === 'knowledge') {
    answerText = `TransMiCable tiene 4 estaciones: ${decision.knowledge.transMiCableStations.join(', ')}. La tarifa unificada del SITP para 2026 es $${decision.knowledge.sitpFareCop.toLocaleString('es-CO')}; el transbordo integrado tiene una ventana de ${decision.knowledge.transferWindowMinutes} minutos.`;
  } else if (decision.status === 'report_detected') {
    answerText =
      'Para registrar una novedad, usa el botón “Reportar novedad” o escribe el mensaje con lugar y tipo de novedad.';
  } else if (decision.status === 'needs_clarification' || decision.status === 'no_route') {
    answerText = decision.clarificationQuestion;
  } else if (decision.route) {
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
    answerText = 'No pude calcular una ruta con los datos disponibles. Intenta de nuevo.';
  }

  return {
    requestId,
    status: decision.status,
    answerText: limitSafeAnswer(answerText),
    intent:
      decision.status === 'greeting'
        ? 'greeting'
        : decision.status === 'knowledge'
          ? 'mobility_knowledge'
          : 'route_planning',
    needsClarification:
      decision.status === 'needs_clarification' || decision.status === 'no_route',
    clarificationQuestion: decision.clarificationQuestion,
    route: decision.route,
    knowledge: decision.knowledge || null,
    alternatives: decision.alternatives,
    warnings: decision.warnings,
    usedReportIds: decision.usedReportIds,
    selectionReason: decision.selectionReason,
    disclaimer: 'Demostración; no usar para decisiones operativas.',
    meta: {
      source: 'deterministic-fallback',
      model: null,
      dataVersion: ROUTE_DATA_VERSION,
      dataStatus: 'demo',
      generatedAt: now.toISOString(),
      ...(options.fallbackReason ? { fallbackReason: options.fallbackReason } : {}),
    },
  };
}
