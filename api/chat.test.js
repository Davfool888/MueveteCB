import test from 'node:test';
import assert from 'node:assert/strict';
import handler from './chat.js';

function createResponse() {
  return {
    headers: {},
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test('POST /api/chat responde con fallback estructurado', async () => {
  const previousGeminiKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const response = createResponse();
    await handler(
      {
        method: 'POST',
        body: {
          message: 'Estoy en Mochuelo Alto y necesito llegar al Portal Tunal antes de las 7',
          origin: 'Mochuelo Alto',
          destination: 'Portal Tunal',
          deadline: '07:00',
          activeReports: [],
        },
      },
      response
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.route.id, 'main');
    assert.equal(response.body.meta.source, 'deterministic-fallback');
    assert.equal(response.headers['cache-control'], 'no-store, max-age=0');
    assert.equal(response.headers['x-request-id'], response.body.requestId);
  } finally {
    if (previousGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousGeminiKey;
  }
});

test('rechaza métodos distintos de POST', async () => {
  const response = createResponse();
  await handler({ method: 'GET' }, response);

  assert.equal(response.statusCode, 405);
  assert.equal(response.body.error, 'method_not_allowed');
  assert.equal(response.headers.allow, 'POST');
});

test('rechaza cuerpo JSON inválido', async () => {
  const response = createResponse();
  await handler({ method: 'POST', body: '{' }, response);

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.error, 'invalid_json');
});
