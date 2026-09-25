import { buildFallbackAgentResponse, limitSafeAnswer } from './fallbackAgent.js';
import { callGeminiApi, DEFAULT_GEMINI_MODEL } from './geminiAgent.js';

export const DEFAULT_CLAUDE_MODEL = 'claude-3-5-haiku-20241022';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

const SYSTEM_PROMPT = `Eres Eco, el asistente inteligente de movilidad de Ciudad Bolívar (Bogotá, Colombia).

Tu misión es brindar orientación clara, empática y realista sobre cómo moverse por las veredas y barrios de la localidad:
- Explica de forma práctica y cercana: qué paradero o van tomar, qué ruta del SITP o cabina de TransMiCable abordar, los tiempos estimados y la tarifa.
- Datos oficiales verificados para 2026: TransMiCable tiene 4 estaciones (Tunal, Juan Pablo II, Manitas y Mirador del Paraíso); la tarifa integrada de TransMiCable y buses SITP es $3.550 COP con una ventana de 125 minutos para hacer transbordo sin pagar doble pasaje.
- Rutas veredales (camperos y vans hacia Quiba, Mochuelo, Pasquilla, etc.): tarifa típica estimada de $2.500 COP, tiempos aproximados de montaña.
- Si hay un reporte activo de la comunidad (bloqueo o trancón) en la zona, advierte de forma preventiva.
- No uses jerga técnica incomprensible ni promesas absolutas ("garantizado al 100%").
- Devuelve únicamente un objeto JSON válido con este formato: {"answerText":"..."}.`;

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
    steps: (route.steps || []).map((step) => ({
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
  const geminiApiKey =
    options.geminiApiKey ||
    (typeof process !== 'undefined'
      ? process.env?.GEMINI_API_KEY || process.env?.VITE_GEMINI_API_KEY
      : undefined);
  const geminiModel =
    options.geminiModel ||
    (typeof process !== 'undefined' ? process.env?.GEMINI_MODEL : undefined) ||
    DEFAULT_GEMINI_MODEL;

  const fallback = buildFallbackAgentResponse(input, {
    fallbackReason: !apiKey && !geminiApiKey ? 'missing_api_key' : undefined,
  });

  if ((!apiKey && !geminiApiKey) || !fallback.route || typeof fetchImpl !== 'function') {
    return fallback;
  }

  const promptContent = JSON.stringify({
    message: sanitizeMessage(input.message),
    priority: input.priority || 'fastest',
    routeContext: routeContextForPrompt(fallback.route),
    warnings: fallback.warnings,
    usedReportIds: fallback.usedReportIds,
  });

  let claudeError = null;
  const startedAt = Date.now();

  // 1. Intentar Claude si hay apiKey proporcionada
  if (apiKey) {
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs || 8000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

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
              content: promptContent,
            },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let errorJson = null;
        try {
          errorJson = JSON.parse(errorBody);
        } catch {}
        const errMsg = errorJson?.error?.message || errorBody;
        const error = new Error(`Claude API ${response.status}: ${errMsg.slice(0, 200)}`);
        if (/credit balance is too low/i.test(errMsg)) {
          error.fallbackReason = 'insufficient_credits';
        } else if (/invalid_api_key|authentication_error/i.test(errMsg)) {
          error.fallbackReason = 'invalid_api_key';
        } else if (/not_found_error|model/i.test(errMsg)) {
          error.fallbackReason = 'invalid_model';
        }
        throw error;
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
    } catch (err) {
      claudeError = err;
    } finally {
      clearTimeout(timeout);
    }
  }

  // 2. Si Claude falla (por ejemplo por saldo) o no tiene clave, intentar con Gemini como respaldo
  if (geminiApiKey) {
    try {
      const geminiResult = await callGeminiApi({
        apiKey: geminiApiKey,
        model: geminiModel,
        systemPrompt: SYSTEM_PROMPT,
        userContent: promptContent,
        fetchImpl,
        timeoutMs: options.timeoutMs || 8000,
      });

      const honestAnswer = /demostr/i.test(geminiResult.answerText)
        ? geminiResult.answerText
        : `${geminiResult.answerText} Es una ruta de demostración.`;

      return {
        ...fallback,
        answerText: limitSafeAnswer(honestAnswer),
        meta: {
          ...fallback.meta,
          source: 'gemini',
          model: geminiResult.model || geminiModel,
          latencyMs: Date.now() - startedAt,
          fallbackFromClaude: Boolean(claudeError),
          claudeErrorReason: claudeError?.fallbackReason || (claudeError ? 'claude_unavailable' : undefined),
        },
      };
    } catch {
      // Si Gemini también falla, caemos de forma segura al fallback local
    }
  }

  // 3. Fallback local determinista si ambos proveedores fallan
  const fallbackReason =
    claudeError?.fallbackReason ||
    (claudeError?.name === 'AbortError' ? 'timeout' : claudeError ? 'provider_unavailable' : 'missing_api_key');

  return buildFallbackAgentResponse(input, {
    fallbackReason,
    errorDetails: claudeError?.message,
  });
}
