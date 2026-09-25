const DEFAULT_TIMEOUT_MS = 15000;
const LOCAL_API_OPT_IN =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_CHAT_API === 'true';

function isPlainLocalDevServer() {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1'].includes(window.location.hostname) && !LOCAL_API_OPT_IN;
}

export class ChatApiError extends Error {
  constructor(message, status = 0, code = 'network_error') {
    super(message);
    this.name = 'ChatApiError';
    this.status = status;
    this.code = code;
  }
}

export async function requestChat(input, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new ChatApiError('Fetch no está disponible.', 0, 'fetch_unavailable');
  }
  if (!options.fetchImpl && isPlainLocalDevServer()) {
    throw new ChatApiError('La API se probará en Vercel; se usará el fallback local.', 0, 'local_fallback');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || DEFAULT_TIMEOUT_MS);
  const externalSignal = options.signal;

  function forwardAbort() {
    controller.abort(externalSignal?.reason);
  }

  if (externalSignal?.aborted) forwardAbort();
  else externalSignal?.addEventListener('abort', forwardAbort, { once: true });

  try {
    const response = await fetchImpl('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: String(input.message || '').trim().slice(0, 1000),
        origin: input.origin,
        destination: input.destination,
        originLocation: input.originLocation,
        destinationLocation: input.destinationLocation,
        deadline: input.deadline,
        priority: input.priority,
        channel: 'web',
        locale: 'es-CO',
        activeReports: Array.isArray(input.activeReports) ? input.activeReports.slice(0, 12) : [],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      let code = 'api_error';
      try {
        const body = await response.json();
        code = body.error || code;
      } catch {
        // Keep the generic code when the server did not return JSON.
      }
      throw new ChatApiError('La API de Eco no está disponible.', response.status, code);
    }

    const data = await response.json();
    if (typeof data.answerText !== 'string' || !data.answerText.trim()) {
      throw new ChatApiError('La respuesta de Eco no tiene texto.', response.status, 'invalid_response');
    }

    return data;
  } catch (error) {
    if (error instanceof ChatApiError) throw error;
    if (error?.name === 'AbortError') {
      throw new ChatApiError('La solicitud de Eco tardó demasiado.', 0, 'timeout');
    }
    throw new ChatApiError('No se pudo conectar con Eco.', 0, 'network_error');
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener?.('abort', forwardAbort);
  }
}
