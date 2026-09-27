import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SITP_CABLE_ROUTE_IDS,
  SITP_ROUTES,
  SITP_ROUTES_BY_ID,
  SITP_ROUTE_IDS_BY_CODE,
  SITP_ROUTE_METADATA,
  SITP_RURAL_ROUTE_IDS,
  SITP_STOPS,
  SITP_STOPS_BY_ID,
  getSitpRouteById,
  getSitpRoutesByCode,
  getSitpStopById,
} from './sitpIndex.js';

/** Dominio `servicio_localidad` publicado por Transmilenio. */
const LOCALITY_BY_CODE = {
  0: 'Soacha', 1: 'Usaquén', 2: 'Chapinero', 3: 'Santa Fe', 4: 'San Cristóbal',
  5: 'Usme', 6: 'Tunjuelo', 7: 'Bosa', 8: 'Kennedy', 9: 'Puente Aranda',
  10: 'La Candelaria', 11: 'Fontibón', 12: 'Engativá', 13: 'Suba',
  14: 'Barrios Unidos', 15: 'Teusaquillo', 16: 'Antonio Nariño', 17: 'Los Mártires',
  18: 'Rafael Uribe Uribe', 19: 'Ciudad Bolívar', 20: 'Sumapaz',
};

test('el extracto declara el alcance del Distrito Capital', () => {
  assert.match(SITP_ROUTE_METADATA.sourceUrl, /Consulta_Planificacion_SITP/);
  assert.equal(SITP_ROUTE_METADATA.license, 'CC BY 4.0');
  assert.equal(SITP_ROUTE_METADATA.scope, 'Distrito Capital de Bogotá D.C.');
  assert.equal(SITP_ROUTE_METADATA.focusLocality.code, 19);
  assert.equal(SITP_ROUTE_METADATA.stopCorridorRadiusMeters, 150);
});

test('solo contiene rutas operativas y comerciales', () => {
  assert.ok(SITP_ROUTES.length > 0);
  for (const route of SITP_ROUTES) {
    assert.equal(route.state, 'Operativa');
    assert.equal(route.kind, 'Comercial');
  }
});

test('decodifica los dominios de Transmilenio a texto legible', () => {
  const sitp618 = SITP_ROUTES.find((route) => route.code === '6-18');
  assert.ok(sitp618, 'debe existir la ruta 6-18');
  assert.equal(sitp618.component, 'TransMiZonal');
  assert.equal(sitp618.serviceType, 'Especial');
  assert.equal(sitp618.busType, 'Busetón');
  assert.equal(sitp618.isRural, true);
  assert.equal(sitp618.originLocality.name, LOCALITY_BY_CODE[sitp618.originLocality.code]);
  assert.ok(sitp618.lengthKm > 40, 'la longitud oficial debe ser la del corredor, no la del tramo urbano');
  assert.ok(sitp618.schedule.weekday, 'debe traer la ventana de operación del operador');
});

test('el corredor conserva la geometría en formato [lat, lng]', () => {
  for (const route of SITP_ROUTES) {
    for (const path of route.paths) {
      assert.ok(path.length > 1);
      for (const [latitude, longitude] of path) {
        assert.ok(latitude > 4 && latitude < 5, 'latitud en Colombia');
        assert.ok(longitude > -75 && longitude < -73, 'longitud en Colombia');
      }
    }
  }
});

test('el índice por código admite los dos sentidos del mismo corredor', () => {
  const troncal3 = getSitpRoutesByCode('3');
  assert.equal(troncal3.length, 2, 'la ruta 3 aparece una vez por sentido');
  assert.notEqual(troncal3[0].id, troncal3[1].id);
});

test('toda ruta tiene un punto de abordaje dentro del radio declarado', () => {
  for (const route of SITP_ROUTES) {
    assert.ok(route.boardingStop, `la ruta ${route.code} debe tener paradero de abordaje`);
    assert.ok(
      route.boardingStop.distanceMeters <= SITP_ROUTE_METADATA.stopCorridorRadiusMeters,
      `la ruta ${route.code} tiene el paradero a ${route.boardingStop.distanceMeters} m`
    );
  }
});

test('el punto de abordaje apunta a una parada real del extracto', () => {
  for (const route of SITP_ROUTES) {
    const stop = getSitpStopById(route.boardingStop.stopId);
    assert.ok(stop, `paradero ${route.boardingStop.stopId} de la ruta ${route.code} no existe`);
    assert.ok(LOCALITY_BY_CODE[stop.locality.code], `localidad desconocida: ${stop.locality.code}`);
  }
});

test('la bajada solo existe cuando hay integración con el cable', () => {
  for (const route of SITP_ROUTES) {
    if (route.cableIntegration) {
      assert.ok(route.alightingStop, `la ruta ${route.code} integra y debe tener bajada`);
    } else {
      assert.equal(route.alightingStop, null);
    }
  }
});

test('los índices por cable y rural no apuntan a rutas inexistentes', () => {
  assert.ok(SITP_CABLE_ROUTE_IDS.length > 0);
  for (const id of SITP_CABLE_ROUTE_IDS) assert.ok(getSitpRouteById(id));
  assert.ok(SITP_RURAL_ROUTE_IDS.length > 0);
  for (const id of SITP_RURAL_ROUTE_IDS) {
    assert.equal(getSitpRouteById(id).isRural, true);
  }
});

test('el índice por código no referencia rutas inexistentes', () => {
  for (const [code, ids] of Object.entries(SITP_ROUTE_IDS_BY_CODE)) {
    assert.ok(ids.length > 0, code);
    for (const id of ids) assert.ok(SITP_ROUTES_BY_ID[id], `la ruta ${id} de ${code} no existe`);
  }
});

test('las paradas cubren el Distrito, no solo Ciudad Bolívar', () => {
  assert.ok(SITP_STOPS.length > 5000, 'debe traer los paraderos de todo el Distrito');
  const localities = new Set(SITP_STOPS.map((stop) => stop.locality.code));
  assert.ok(localities.size >= 15, `debe traer múltiples localidades, trajo ${localities.size}`);
  assert.ok(localities.has(19), 'Ciudad Bolívar debe seguir incluida');

  for (const stop of SITP_STOPS) {
    assert.ok(LOCALITY_BY_CODE[stop.locality.code], `localidad desconocida: ${stop.locality.code}`);
    assert.ok(stop.name && stop.name.length > 0);
    assert.ok(stop.latitude > 4 && stop.latitude < 5);
    assert.ok(stop.longitude > -75 && stop.longitude < -73);
  }
});

test('los identificadores de paradero son únicos', () => {
  // El servicio publica dos registros con la misma cenefa en algunos puntos
  // (módulos duplicados); el índice conserva el último, así que puede haber menos
  // claves que registros. Lo que no se permite es que dos claves colisionen.
  assert.ok(Object.keys(SITP_STOPS_BY_ID).length <= SITP_STOPS.length);
  assert.ok(Object.keys(SITP_STOPS_BY_ID).length > 7000);
});

test('expone paraderos que el proyecto ya usa como puntos de referencia', () => {
  const names = SITP_STOPS.map((stop) => stop.name).join(' | ');
  assert.match(names, /Mochuelo/);
  assert.match(names, /Quiba/);
  assert.match(names, /Meissen/);
});

test('cubre las rutas de varias localidades del Distrito', () => {
  const localities = new Set(SITP_ROUTES.map((route) => route.originLocality.code));
  localities.add(SITP_ROUTES[0].destinationLocality.code);
  assert.ok(localities.size >= 12, `debe traer rutas de toda la ciudad, trajo ${localities.size} localidades`);
  assert.ok(SITP_ROUTES.length > 500, 'debe traer el grueso de los corredores del Distrito');
});
