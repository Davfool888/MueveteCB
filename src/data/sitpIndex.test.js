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

test('el extracto conserva metadatos del origen oficial', () => {
  assert.match(SITP_ROUTE_METADATA.sourceUrl, /Consulta_Planificacion_SITP/);
  assert.equal(SITP_ROUTE_METADATA.license, 'CC BY 4.0');
  assert.equal(SITP_ROUTE_METADATA.locality.code, 19);
  assert.equal(SITP_ROUTE_METADATA.locality.name, 'Ciudad Bolívar');
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
  assert.equal(sitp618.originLocality.name, 'Ciudad Bolívar');
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
    assert.equal(stop.locality.code, 19);
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

test('las paradas están en Ciudad Bolívar y traen datos de dirección legibles', () => {
  assert.ok(SITP_STOPS.length > 500);
  for (const stop of SITP_STOPS) {
    assert.equal(stop.locality.code, 19);
    assert.ok(stop.name && stop.name.length > 0);
    assert.ok(stop.latitude > 4 && stop.latitude < 5);
  }
});

test('los identificadores de paradero son únicos', () => {
  assert.equal(Object.keys(SITP_STOPS_BY_ID).length, SITP_STOPS.length);
});

test('expone paraderos que el proyecto ya usa como puntos de referencia', () => {
  const names = SITP_STOPS.map((stop) => stop.name).join(' | ');
  assert.match(names, /Mochuelo/);
  assert.match(names, /Quiba/);
  assert.match(names, /Meissen/);
});
