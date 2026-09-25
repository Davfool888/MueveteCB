import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RoadRoutingError,
  getRoadRouteKey,
  getShortestRoadRoute,
} from './roadRouting.js';

const originLocation = { latitude: 4.548, longitude: -74.119 };
const destinationLocation = { latitude: 4.581, longitude: -74.104 };

function jsonResponse(payload, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    async json() {
      return payload;
    },
  };
}

test('calcula la alternativa vial más corta y convierte GeoJSON a [lat, lon]', async () => {
  let requestedUrl = '';
  const result = await getShortestRoadRoute({
    originLocation,
    destinationLocation,
    baseUrl: 'https://router.example/',
    fetchImpl: async (url) => {
      requestedUrl = url;
      return jsonResponse({
        code: 'Ok',
        routes: [
          {
            distance: 7268,
            duration: 876.3,
            geometry: {
              coordinates: [
                [-74.1206, 4.5483],
                [-74.118, 4.56],
                [-74.104, 4.581],
              ],
            },
          },
          {
            distance: 6825,
            duration: 949,
            geometry: {
              coordinates: [
                [-74.1206, 4.5483],
                [-74.116, 4.565],
                [-74.104, 4.581],
              ],
            },
          },
        ],
      });
    },
  });

  assert.match(requestedUrl, /\/route\/v1\/driving\//);
  assert.match(requestedUrl, /alternatives=true/);
  assert.equal(result.distanceMeters, 6825);
  assert.equal(result.durationSeconds, 949);
  assert.equal(result.alternativesConsidered, 2);
  assert.equal(result.source, 'osrm');
  assert.equal(result.mapPath[0][0], originLocation.latitude);
  assert.equal(result.mapPath[0][1], originLocation.longitude);
  assert.equal(result.mapPath.at(-1)[0], destinationLocation.latitude);
  assert.equal(result.mapPath.at(-1)[1], destinationLocation.longitude);
  assert.ok(result.mapPath.some((point) => point[0] === 4.565 && point[1] === -74.116));
});

test('usa una clave estable para no repetir la misma ruta', () => {
  assert.equal(
    getRoadRouteKey(originLocation, destinationLocation),
    '4.54800,-74.11900>4.58100,-74.10400',
  );
  assert.equal(getRoadRouteKey(originLocation, { latitude: null, longitude: null }), null);
});

test('rechaza ubicaciones incompletas antes de llamar al proveedor', async () => {
  await assert.rejects(
    getShortestRoadRoute({
      originLocation,
      destinationLocation: { label: 'Sin coordenadas' },
      fetchImpl: async () => {
        throw new Error('no debe llamarse');
      },
    }),
    (error) => error instanceof RoadRoutingError && error.code === 'invalid_locations',
  );
});

test('informa cuando el proveedor no encuentra una carretera', async () => {
  await assert.rejects(
    getShortestRoadRoute({
      originLocation,
      destinationLocation,
      fetchImpl: async () => jsonResponse({ code: 'NoRoute', routes: [] }),
    }),
    (error) => error instanceof RoadRoutingError && error.code === 'no_route',
  );
});

test('corta la consulta cuando el proveedor supera el timeout', async () => {
  await assert.rejects(
    getShortestRoadRoute({
      originLocation,
      destinationLocation,
      timeoutMs: 5,
      fetchImpl: async (_url, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener(
            'abort',
            () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
            { once: true },
          );
        }),
    }),
    (error) => error instanceof RoadRoutingError && error.code === 'timeout',
  );
});

test('convierte errores HTTP del proveedor en un error controlado', async () => {
  await assert.rejects(
    getShortestRoadRoute({
      originLocation,
      destinationLocation,
      fetchImpl: async () => jsonResponse({ error: 'unavailable' }, { ok: false, status: 503 }),
    }),
    (error) => error instanceof RoadRoutingError && error.code === 'provider_error' && error.status === 503,
  );
});
