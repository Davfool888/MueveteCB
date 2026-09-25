import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createChatResponse,
  DEFAULT_GEMINI_MODEL,
  GEMINI_INTERACTIONS_URL,
} from './geminiAgent.js';

const INPUT = {
  message: 'Estoy en Mochuelo Alto y necesito llegar al Portal Tunal antes de las 7',
  origin: 'Mochuelo Alto',
  destination: 'Portal Tunal',
  deadline: '07:00',
  activeReports: [],
};

function interactionResponse(answerText, overrides = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      id: 'interaction-test',
      model: DEFAULT_GEMINI_MODEL,
      status: 'completed',
      steps: [
        {
          type: 'model_output',
          content: [{ type: 'text', text: JSON.stringify({ answerText }) }],
        },
      ],
      ...overrides,
    }),
  };
}

test('sin clave de Gemini devuelve el contrato local con fallback', async () => {
  const response = await createChatResponse(INPUT, { apiKey: '' });

  assert.equal(response.meta.source, 'deterministic-fallback');
  assert.equal(response.meta.fallbackReason, 'missing_api_key');
  assert.equal(response.route.id, 'main');
  assert.ok(response.answerText.includes('demostración'));
});

test('usa Gemini Interactions sin cambiar la ruta seleccionada', async () => {
  let requestUrl;
  let requestOptions;
  const fakeFetch = async (url, options) => {
    requestUrl = url;
    requestOptions = options;
    return interactionResponse('Toma el colectivo, transborda y llega por el cable.');
  };

  const response = await createChatResponse(INPUT, {
    apiKey: 'test-secret',
    fetchImpl: fakeFetch,
  });
  const requestBody = JSON.parse(requestOptions.body);

  assert.equal(requestUrl, GEMINI_INTERACTIONS_URL);
  assert.equal(requestOptions.headers['x-goog-api-key'], 'test-secret');
  assert.equal(requestBody.model, DEFAULT_GEMINI_MODEL);
  assert.equal(requestBody.store, false);
  assert.equal(requestBody.system_instruction.includes('routeContext'), true);
  assert.equal(requestBody.response_format.mime_type, 'application/json');
  assert.equal(requestBody.input.includes('routeContext'), true);
  assert.equal(requestBody.input.includes('costFormatted'), false);
  assert.equal(requestBody.input.includes('formatted'), true);
  assert.equal(response.meta.source, 'gemini');
  assert.equal(response.route.id, 'main');
  assert.ok(response.answerText.endsWith('Es una ruta de demostración.'));
});

test('Gemini también puede responder un saludo sin una ruta', async () => {
  const response = await createChatResponse(
    { message: 'Hola, ¿cómo me可以帮助 a moverme?' },
    {
      apiKey: 'test-secret',
      fetchImpl: async () => interactionResponse('Hola. Cuéntame de dónde sales y a dónde necesitas llegar.'),
    },
  );

  assert.equal(response.meta.source, 'gemini');
  assert.equal(response.route, null);
  assert.match(response.answerText, /Cuéntame/);
});

test('cae de forma segura si Gemini falla por red', async () => {
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

test('cae de forma segura si Gemini devuelve JSON inválido', async () => {
  const response = await createChatResponse(INPUT, {
    apiKey: 'test-secret',
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        model: DEFAULT_GEMINI_MODEL,
        status: 'completed',
        steps: [{ type: 'model_output', content: [{ type: 'text', text: 'texto plano' }] }],
      }),
    }),
  });

  assert.equal(response.meta.source, 'deterministic-fallback');
  assert.equal(response.meta.fallbackReason, 'provider_unavailable');
  assert.equal(response.route.id, 'main');
});

test('rechaza afirmaciones y medidas no soportadas por Gemini', async () => {
  const unsupportedClaim = await createChatResponse(INPUT, {
    apiKey: 'test-secret',
    fetchImpl: async () => interactionResponse('Esta ruta es 100% accesible y no tarda 99 minutos.'),
  });
  const unsupportedMeasurement = await createChatResponse(INPUT, {
    apiKey: 'test-secret',
    fetchImpl: async () => interactionResponse('El viaje tarda 99 minutos.'),
  });

  assert.equal(unsupportedClaim.meta.source, 'deterministic-fallback');
  assert.equal(unsupportedMeasurement.meta.source, 'deterministic-fallback');
  assert.equal(unsupportedMeasurement.route.id, 'main');
});
