import test from 'node:test';
import assert from 'node:assert/strict';
import { requestChat } from './chatApi.js';

test('envía una solicitud acotada y devuelve la respuesta validada', async () => {
  let sentBody;
  const fakeFetch = async (_url, options) => {
    sentBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        answerText: 'Respuesta de Eco',
        route: { id: 'main' },
        meta: { source: 'claude' },
      }),
    };
  };

  const result = await requestChat(
    {
      message: 'Ruta al Tunal',
      origin: 'Mochuelo Alto',
      destination: 'Portal Tunal',
      deadline: '07:00',
      priority: 'fastest',
      activeReports: [{ id: 'r1' }],
    },
    { fetchImpl: fakeFetch }
  );

  assert.equal(sentBody.channel, 'web');
  assert.equal(sentBody.locale, 'es-CO');
  assert.equal(sentBody.priority, 'fastest');
  assert.equal(sentBody.activeReports.length, 1);
  assert.equal(result.answerText, 'Respuesta de Eco');
});

test('convierte una respuesta HTTP inválida en un error controlado', async () => {
  await assert.rejects(
    requestChat(
      { message: 'Hola' },
      {
        fetchImpl: async () => ({
          ok: false,
          status: 503,
          json: async () => ({ error: 'agent_unavailable' }),
        }),
      }
    ),
    (error) => error.code === 'agent_unavailable' && error.status === 503
  );
});
