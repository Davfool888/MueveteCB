import { buildFallbackAgentResponse, limitSafeAnswer } from './fallbackAgent.js';

export const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-5';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

const SYSTEM_PROMPT = `Eres Eco, asistente de movilidad de Ciudad Bolívar para una demostración en español de Colombia.

Reglas estrictas:
- Interpreta la intención y redacta una respuesta breve, clara y coherente para una persona de vereda.
- routeContext es la única fuente de verdad. No inventes rutas, estaciones, coordenadas, horarios, precios, fuentes, frecuencias ni tiempos.
- Los datos del recorrido tienen dataStatus "demo". No los presentes como operación verificada.
- Solo estos datos formales están verificados para 2026: TransMiCable tiene Tunal, Juan Pablo II, Manitas y Mirador del Paraíso; el pasaje unificado es $3.550 y la ventana de transbordo es de 125 minutos.
- Los tramos veredales siguen estimados. No afirmes seguridad, accesibilidad completa, frecuencia ni tarifa informal como hechos.
- Si hay un bloqueo en Portal Tunal, no inventes una salida alternativa.
- Menciona como máximo cuatro pasos, el tiempo y el costo cuando estén en routeContext.
- No uses jerga técnica ni una frase como "ruta segura" o "garantizada".
- Devuelve únicamente JSON válido con esta forma: {"answerText":"..."}.`;

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
    steps: route.steps.map((step) => ({
      order: step.order,
      mode: step.mode,
      instruction: step.instruction,
      durationMinutes: step.durationMinutes,
    })),
    warnings: route.warnings,
  };
}

function parseClaudePayload(payload) {
  const text = Array.isArray(payload?.content)
    ? payload.content.filter((block) => block.type === 'text').map((block) => block.text).join('\n')
    : '';
  if (!text.trim()) throw new Error('Claude returned no text content');

  const jsonCandidate = text.match(/\{[\s\S]*\}/)?.[0] || text;
  const parsed = JSON.parse(jsonCandidate);
  const answerText = typeof parsed.answerText === 'string' ? parsed.answerText.trim() : '';
  if (!answerText) throw new Error('Claude returned an empty answerText');

  const safeAnswer = limitSafeAnswer(answerText);
  if (/villa del rosario|100% accesible|garantizad[ao]|cero escaleras|sin baches/i.test(safeAnswer)) {
    throw new Error('Claude answer contains an unsupported claim');
  }
  return safeAnswer;
}

export async function createChatResponse(input, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const model = options.model || DEFAULT_CLAUDE_MODEL;
  const apiKey = options.apiKey;
  const fallback = buildFallbackAgentResponse(input, {
    fallbackReason: !apiKey ? 'missing_api_key' : undefined,
  });

  if (!apiKey || !fallback.route || typeof fetchImpl !== 'function') return fallback;

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || 8000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetchImpl(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: JSON.stringify({
              message: sanitizeMessage(input.message),
              priority: input.priority || 'fastest',
              routeContext: routeContextForPrompt(fallback.route),
              warnings: fallback.warnings,
              usedReportIds: fallback.usedReportIds,
            }),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Claude API ${response.status}: ${errorBody.slice(0, 200)}`);
    }

    const payload = await response.json();
    const answerText = parseClaudePayload(payload);
    const honestAnswer = /demostr/i.test(answerText)
      ? answerText
      : `${answerText} Es una ruta de demostración.`;

    return {
      ...fallback,
      answerText: limitSafeAnswer(honestAnswer),
      meta: {
        ...fallback.meta,
        source: 'claude',
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
