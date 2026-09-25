import test from 'node:test';
import assert from 'node:assert/strict';
import { createChatResponse, DEFAULT_CLAUDE_MODEL } from './claudeAgent.js';

const INPUT = {
  message: 'Estoy en Mochuelo Alto y necesito llegar al Portal Tunal antes de las 7',
  origin: 'Mochuelo Alto',
  destination: 'Portal Tunal',
  deadline: '07:00',
  activeReports: [],
};

test('sin clave de Anthropic devuelve el mismo contrato con fallback', async () => {
  const response = await createChatResponse(INPUT, { apiKey: '' });

  assert.equal(response.meta.source, 'deterministic-fallback');
  assert.equal(response.meta.fallbackReason, 'missing_api_key');
  assert.equal(response.route.id, 'main');
  assert.ok(response.answerText.includes('demostración'));
});

test('usa la salida JSON de Claude sin cambiar la ruta seleccionada', async () => {
  let requestBody;
  const fakeFetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        model: DEFAULT_CLAUDE_MODEL,
        content: [
          {
            type: 'text',
            text: '```json\n{"answerText":"Toma el colectivo, transborda y llega por el cable. Tiempos estimados."}\n```',
          },
        ],
      }),
    };
  };

  const response = await createChatResponse(INPUT, {
    apiKey: 'test-secret',
    fetchImpl: fakeFetch,
  });

  assert.equal(requestBody.model, DEFAULT_CLAUDE_MODEL);
  assert.equal(requestBody.messages[0].role, 'user');
  assert.equal(requestBody.messages[0].content.includes('routeContext'), true);
  assert.equal(requestBody.messages[0].content.includes('costFormatted'), false);
  assert.equal(requestBody.messages[0].content.includes('cost'), true);
  assert.equal(response.meta.source, 'claude');
  assert.equal(response.route.id, 'main');
  assert.ok(response.answerText.endsWith('Es una ruta de demostración.'));
});

test('cae de forma segura si Claude falla', async () => {
  const response = await createChatResponse(INPUT, {
    apiKey: 'test-secret',
    fetchImpl: async () => {
      throw new Error('network unavailable');
    },
  });

  assert.equal(response.meta.source, 'deterministic-fallback');
  assert.equal(response.meta.fallbackReason, 'provider_unavailable');
  assert.equal(response.route.id, 'main');
});

test('cae de forma segura si Claude devuelve JSON inválido', async () => {
  const response = await createChatResponse(INPUT, {
    apiKey: 'test-secret',
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'texto sin objeto JSON' }] }),
    }),
  });

  assert.equal(response.meta.source, 'deterministic-fallback');
  assert.equal(response.route.id, 'main');
});

test('rechaza una afirmación de Claude incompatible con los datos', async () => {
  const response = await createChatResponse(INPUT, {
    apiKey: 'test-secret',
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        content: [
          {
            type: 'text',
            text: '{"answerText":"Esta ruta es 100% accesible y pasa por Villa del Rosario."}',
          },
        ],
      }),
    }),
  });

  assert.equal(response.meta.source, 'deterministic-fallback');
  assert.equal(response.meta.fallbackReason, 'provider_unavailable');
  assert.equal(response.route.id, 'main');
});

test('usa Gemini como respaldo si Claude falla', async () => {
  const fakeFetch = async (url) => {
    if (url.includes('api.anthropic.com')) {
      return {
        ok: false,
        status: 400,
        text: async () => '{"type":"error","error":{"message":"Your credit balance is too low"}}',
      };
    }

    if (url.includes('generativelanguage.googleapis.com')) {
      return {
        ok: true,
        json: async () => ({
          model: 'gemini-3.5-flash-lite',
          status: 'completed',
          output_text: '{"answerText":"Ruta por TransMiCable calculada con Gemini."}',
        }),
      };
    }

    throw new Error(`Unexpected URL: ${url}`);
  };

  const response = await createChatResponse(INPUT, {
    apiKey: 'claude-key-without-balance',
    geminiApiKey: 'valid-gemini-key',
    fetchImpl: fakeFetch,
  });

  assert.equal(response.meta.source, 'gemini');
  assert.equal(response.meta.fallbackFromClaude, true);
  assert.equal(response.meta.claudeErrorReason, 'insufficient_credits');
  assert.ok(response.answerText.includes('Gemini'));
});

test('usa Gemini directamente si no hay clave de Claude', async () => {
  const fakeFetch = async (url) => {
    if (url.includes('generativelanguage.googleapis.com')) {
      return {
        ok: true,
        json: async () => ({
          model: 'gemini-3.5-flash-lite',
          status: 'completed',
          output_text: '{"answerText":"Respuesta directa de Gemini."}',
        }),
      };
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  const response = await createChatResponse(INPUT, {
    apiKey: '',
    geminiApiKey: 'valid-gemini-key',
    fetchImpl: fakeFetch,
  });

  assert.equal(response.meta.source, 'gemini');
  assert.equal(response.meta.fallbackFromClaude, false);
});

