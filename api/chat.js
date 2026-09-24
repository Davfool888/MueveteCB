import { createChatResponse, DEFAULT_CLAUDE_MODEL } from '../src/core/claudeAgent.js';

export const config = { maxDuration: 10 };

function parseRequestBody(request) {
  if (request.body && typeof request.body === 'object' && !Array.isArray(request.body)) {
    return request.body;
  }

  if (typeof request.body === 'string' && request.body.trim()) {
    try {
      const parsed = JSON.parse(request.body);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return null;
    }
  }

  return {};
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (payload?.requestId) response.setHeader('X-Request-Id', payload.requestId);
  return response.json(payload);
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return sendJson(response, 405, { error: 'method_not_allowed' });
  }

  const body = parseRequestBody(request);
  if (!body) {
    return sendJson(response, 400, { error: 'invalid_json' });
  }

  const message = String(body.message || '').trim().slice(0, 1000);
  if (!message) {
    return sendJson(response, 400, { error: 'message_required' });
  }

  const activeReports = Array.isArray(body.activeReports) ? body.activeReports.slice(0, 12) : [];
  const channel = body.channel === 'whatsapp' ? 'whatsapp' : 'web';

  try {
    const result = await createChatResponse(
      {
        message,
        origin: typeof body.origin === 'string' ? body.origin.slice(0, 120) : undefined,
        destination:
          typeof body.destination === 'string' ? body.destination.slice(0, 120) : undefined,
        deadline: typeof body.deadline === 'string' ? body.deadline.slice(0, 5) : undefined,
        priority: ['fastest', 'cheapest', 'accessible'].includes(body.priority)
          ? body.priority
          : undefined,
        channel,
        activeReports,
      },
      {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL || DEFAULT_CLAUDE_MODEL,
      }
    );

    return sendJson(response, 200, result);
  } catch {
    return sendJson(response, 500, {
      error: 'agent_unavailable',
      message: 'No se pudo preparar la respuesta en este momento.',
    });
  }
}
