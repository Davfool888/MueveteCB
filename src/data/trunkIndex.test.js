import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TRUNK_BOARDABLE_STATIONS,
  TRUNK_CORRIDORS,
  TRUNK_CORRIDORS_BY_ID,
  TRUNK_DATA_BOUNDARIES,
  TRUNK_METADATA,
  TRUNK_STATIONS,
  TRUNK_STATIONS_BY_CORRIDOR,
  TRUNK_STATIONS_BY_ID,
  getTrunkCorridorStations,
} from './trunkIndex.js';

test('el inventario troncal declara su fuente y licencia', () => {
  assert.equal(TRUNK_METADATA.license, 'CC BY 4.0');
  assert.match(TRUNK_METADATA.sourceUrl.stations, /FeatureServer\/2/);
  assert.match(TRUNK_METADATA.sourceUrl.corridors, /FeatureServer\/5/);
  assert.equal(TRUNK_METADATA.orphanStations, 0, 'ninguna estación puede quedar sin corredor');
});

test('decodifica el tipo de estación con el diccionario oficial', () => {
  const tunal = TRUNK_STATIONS_BY_ID['08000'];
  assert.ok(tunal, 'debe existir Portal Tunal');
  assert.equal(tunal.name, 'Portal Tunal');
  assert.equal(tunal.type, 'Portal');
  assert.equal(tunal.isPortal, true);
  assert.equal(tunal.isOperating, true);
  assert.equal(tunal.capacity.articulated, 88);
});

test('decodifica el tipo de corredor según el tránsito', () => {
  const t014 = TRUNK_CORRIDORS_BY_ID['TZ014'];
  assert.equal(t014.name, 'Caracas Sur');
  assert.equal(t014.type, 'Exclusivo');
  assert.equal(t014.isExclusive, true);
  assert.equal(t014.destination, 'Portal Tunal');
});

test('cada estación queda enlazada a su corredor por id_trazado', () => {
  for (const station of TRUNK_STATIONS) {
    assert.ok(TRUNK_CORRIDORS_BY_ID[station.corridorId], `corredor ${station.corridorId} no existe`);
    assert.ok(TRUNK_STATIONS_BY_CORRIDOR[station.corridorId].length > 0);
  }
});

test('el corredor TZ014 contiene Portal Tunal, Parque y Biblioteca', () => {
  const stations = getTrunkCorridorStations('TZ014').map((station) => station.name);
  assert.ok(stations.includes('Portal Tunal'));
  assert.ok(stations.includes('Parque'));
  assert.ok(stations.includes('Biblioteca'));
});

test('marca las estaciones con cierre temporal por obras', () => {
  const closed = TRUNK_STATIONS.filter((station) => station.isTemporarilyClosed);
  assert.ok(closed.length > 0, 'el extracto debe traer cierres temporales');
  for (const station of closed) {
    assert.equal(station.isOperating, false);
    assert.ok(/Cierre temporal/.test(station.stage));
  }
});

test('solo ofrece para abordar estaciones operativas con acceso desde la calle', () => {
  assert.ok(TRUNK_BOARDABLE_STATIONS.length > 0);
  for (const station of TRUNK_BOARDABLE_STATIONS) {
    assert.equal(station.isOperating, true);
    assert.equal(station.isTemporarilyClosed, false);
    assert.ok(station.access.fromStreet > 0, `${station.name} no tiene acceso desde la calle`);
  }
});

test('resume los accesos de la estación en texto legible', () => {
  const portalSur = TRUNK_STATIONS_BY_ID['07000'];
  assert.ok(portalSur.accessSummary.includes('acceso por puente'));
  assert.equal(portalSur.access.fromStreet, 0);
});

test('la geometría de los corredores está en formato [lat, lng]', () => {
  for (const corridor of TRUNK_CORRIDORS) {
    for (const path of corridor.paths) {
      assert.ok(path.length > 1);
      for (const [latitude, longitude] of path) {
        assert.ok(latitude > 4 && latitude < 5);
        assert.ok(longitude > -75 && longitude < -73);
      }
    }
  }
});

test('publica los límites de lo que el inventario no permite afirmar', () => {
  assert.ok(TRUNK_DATA_BOUNDARIES.some((boundary) => /despachos programados/.test(boundary)));
});
