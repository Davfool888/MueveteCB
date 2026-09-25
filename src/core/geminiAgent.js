import { buildFallbackAgentResponse, limitSafeAnswer } from './fallbackAgent.js';

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';
export const GEMINI_INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1/interactions';

const SYSTEM_PROMPT = `Eres Eco, asistente de movilidad de Ciudad Bolívar para una demostración en español de Colombia.

Reglas estrictas:
- Responde de forma natural, breve y clara a saludos, preguntas generales y solicitudes de 이동.
- deterministicBaseline, routeContext y knowledgeContext son las únicas fuentes de verdad. No inventes rutas, estaciones, coordenadas, horarios, precios, fuentes, frecuencias, cierres ni tiempos.
- Los datos del recorrido tienen dataStatus "demo". No los presentes como operación verificada.
- Solo estos datos formales están verificados para 2026: TransMiCable tiene Tunal, Juan Pablo II, Manitas y Mirador del Paraíso; el pasaje unificado es $3.550 y la ventana de transbordo es de 125 minutos.
- Los tramos veredales siguen estimados. No afirmes seguridad, accesibilidad completa, frecuencia ni tarifa informal como hechos.
- Si routeContext es null, no afirmes que encontraste una ruta. Pide el dato que falta o explica que aún no está verificado.
- Si hay un bloqueo en Portal Tunal, no inventes una salida alternativa.
- Menciona como máximo cuatro pasos, el tiempo y el costo cuando estén en routeContext.
- No uses jerga técnica ni una frase como "ruta segura" o "garantizada".
- Devuelve únicamente JSON válido con esta forma: {"answerText":"..."}.`;

const VERIFIED_KNOWLEDGE = Object.freeze({
  transMiCableStations: ['Tunal', 'Juan Pablo II', 'Manitas', 'Mirador del Paraíso'],
  sitpFareCop: 3550,
  sitpFareFormatted: '$3.550 COP',
  transferWindowMinutes: 125,
  dataCheckedAt: '2026-09-24',
});

const RESPONSE_FORMAT = Object.freeze({
  type: 'text',
  mime_type: 'application/json',
  schema: {
    type: 'object',
    properties: {
      answerText: {
        type: 'string',
        description: 'Respuesta breve y segura de Eco en español de Colombia.',
      },
    },
    required: ['answerText'],
    additionalProperties: false,
  },
});

function sanitizeMessage(message) {
  return String(message || '')
    .replace(/\+?\d[\d\s-]{9,}\d/g, '[número oculto]')
    .trim()
    .slice(0, 1000);
}

function routeContextForPrompt(route) {
  if (!route) return null;
  return {
    id: route.id,
    title: route.title,
    departureTime: route.departureTime,
    arrivalTime: route.arrivalTime,
    durationMinutes: route.durationMinutes,
    confidence: route.confidence,
    cost: {
      totalCop: route.totalCostCop,
      formatted: route.costFormatted,
      breakdown: route.costBreakdown,
      paymentMethod: route.paymentMethod,
    },
    accessibilityLabel: route.accessibilityLabel,
    reason: route.reason,
    dataStatus: route.dataStatus,
    dataVersion: route.dataVersion,
    steps: route.steps.slice(0, 4).map((step) => ({
      order: step.order,
      mode: step.mode,
      instruction: step.instruction,
      durationMinutes: step.durationMinutes,
    })),
    warnings: route.warnings,
  };
}

function normalizeNumberToken(value) {
  return String(value || '').replace(/\D/g, '');
}

function includesOnlySupportedMeasurements(answer, context) {
  const route = context.routeContext;
  const knowledge = context.knowledgeContext;
  const allowedMoney = new Set(
    [
      route?.cost?.formatted,
      route?.cost?.breakdown,
      knowledge?.sitpFareFormatted,
      knowledge?.sitpFareCop,
    ]
      .filter(Boolean)
      .flatMap((value) => String(value).match(/\$\s?[\d.,]+/g) || [])
      .map((value) => normalizeNumberToken(value)),
  );
  const allowedDurations = new Set(
    [
      route?.durationMinutes,
      ...(route?.steps || []).map((step) => step.durationMinutes),
      knowledge?.transferWindowMinutes,
    ]
      .filter((value) => value !== null && value !== undefined)
      .map((value) => String(value).replace(',', '.')),
  );
  const allowedTimes = new Set(
    [route?.departureTime, route?.arrivalTime]
      .filter(Boolean)
      .flatMap((value) => String(value).match(/\d{1,2}:\d{2}/g) || []),
  );

  const moneyClaims = (answer.match(/\$\s?[\d.,]+/g) || []).map(normalizeNumberToken);
  if (moneyClaims.some((value) => !allowedMoney.has(value))) return false;

  const durationClaims = answer.match(/\d+(?:[.,]\d+)?\s*(?:min(?:utos?)?|h(?:oras?)?)\b/gi) || [];
  if (
    durationClaims.some((claim) => {
      const amount = claim.match(/^\d+(?:[.,]\d+)?/)?.[0]?.replace(',', '.');
      return !allowedDurations.has(amount);
    })
  ) {
    return false;
  }

  const timeClaims = answer.match(/\d{1,2}:\d{2}\b/g) || [];
  return timeClaims.every((claim) => allowedTimes.has(claim));
}

function extractInteractionText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text;
  }

  if (!Array.isArray(payload?.steps)) return '';
  return payload.steps
    .filter((step) => step?.type === 'model_output' && Array.isArray(step.content))
    .flatMap((step) => step.content)
    .filter((part) => part?.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n')
    .trim();
}

function parseGeminiPayload(payload, context) {
  if (payload?.status && payload.status !== 'completed') {
    throw new Error('Gemini interaction did not complete');
  }

  const text = extractInteractionText(payload);
  if (!text) throw new Error('Gemini returned no model output');

  const jsonCandidate = text.match(/\{[\s\S]*\}/)?.[0] || text;
  const parsed = JSON.parse(jsonCandidate);
  const answerText = typeof parsed.answerText === 'string' ? parsed.answerText.trim() : '';
  if (!answerText) throw new Error('Gemini returned an empty answerText');

  const safeAnswer = limitSafeAnswer(answerText);
  if (/villa del rosario|100% accesible|garantizad[ao]|cero escaleras|sin baches/i.test(safeAnswer)) {
    throw new Error('Gemini answer contains an unsupported claim');
  }
  if (!includesOnlySupportedMeasurements(safeAnswer, context)) {
    throw new Error('Gemini answer contains unsupported measurements');
  }
  return safeAnswer;
}

export async function createChatResponse(input, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const model = options.model || DEFAULT_GEMINI_MODEL;
  const apiKey = options.apiKey;
  const fallback = buildFallbackAgentResponse(input, {
    fallbackReason: !apiKey ? 'missing_api_key' : undefined,
  });

  if (!apiKey || typeof fetchImpl !== 'function') return fallback;

  const context = {
    message: sanitizeMessage(input.message),
    priority: input.priority || 'fastest',
    deterministicStatus: fallback.status,
    deterministicBaseline: fallback.answerText,
    routeContext: routeContextForPrompt(fallback.route),
    knowledgeContext: VERIFIED_KNOWLEDGE,
    warnings: fallback.warnings,
    usedReportIds: fallback.usedReportIds,
  };

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || 12000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetchImpl(GEMINI_INTERACTIONS_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        model,
        system_instruction: SYSTEM_PROMPT,
        input: JSON.stringify(context),
        store: false,
        generation_config: {
          max_output_tokens: 500,
          thinking_level: 'low',
        },
        response_format: RESPONSE_FORMAT,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Gemini API ${response.status}`);
    }

    const payload = await response.json();
    const answerText = parseGeminiPayload(payload, context);
    const shouldAddDemoDisclaimer = Boolean(fallback.route) && !/demostr/i.test(answerText);
    const demoDisclaimer = ' Es una ruta de demostración.';
    const honestAnswer = shouldAddDemoDisclaimer
      ? `${limitSafeAnswer(answerText, 450 - demoDisclaimer.length).replace(/[.!]+$/, '')}${demoDisclaimer}`
      : answerText;

    return {
      ...fallback,
      answerText: limitSafeAnswer(honestAnswer),
      meta: {
        ...fallback.meta,
        source: 'gemini',
        model: payload.model || model,
        latencyMs: Date.now() - startedAt,
      },
    };
  } catch {
    return buildFallbackAgentResponse(input, { fallbackReason: 'provider_unavailable' });
  } finally {
    clearTimeout(timeout);
  }
}
