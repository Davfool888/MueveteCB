import { CABLE_PATH, INFORMAL_PATHS } from './routes.js';

function joinPaths(...paths) {
  const points = paths.flat();
  return points.filter((point, index) => {
    const previous = points[index - 1];
    if (!previous) return true;
    return point[0] !== previous[0] || point[1] !== previous[1];
  });
}

function createStop(id, name, coordinates, kind = 'pickup') {
  return {
    id,
    name,
    coordinates,
    kind,
    source: 'simulated_veredal_fixture',
  };
}

const mochueloIntegration = {
  id: 'mirador_paraiso',
  name: 'Mirador del Paraíso',
  coordinates: [4.55009985, -74.1588974],
  stationId: 'paraiso',
  kind: 'cable_station',
  type: 'integration',
  source: 'existing_transport_fixture',
};

const quibaIntegration = {
  id: 'manitas',
  name: 'Estación Manitas',
  coordinates: [4.55028009, -74.15049744],
  stationId: 'manitas',
  kind: 'cable_station',
  type: 'integration',
  source: 'existing_transport_fixture',
};

const sierraIntegration = {
  id: 'manitas',
  name: 'Estación Manitas',
  coordinates: [4.55028009, -74.15049744],
  stationId: 'manitas',
  kind: 'cable_station',
  type: 'integration',
  source: 'existing_transport_fixture',
};

const mochueloToParaiso = INFORMAL_PATHS[0].coordinates;
const quibaToManitas = INFORMAL_PATHS[1].coordinates;
const sierraToManitas = [
  ...INFORMAL_PATHS[3].coordinates.slice(0, -1),
  [4.565, -74.164],
  [4.559, -74.157],
  INFORMAL_PATHS[3].coordinates.at(-1),
];

// CABLE_PATH is ordered from Portal Tunal to Mirador del Paraíso. Quiba and
// Sierra already arrive at Manitas, so their continuation must leave from
// Manitas toward the useful exit instead of starting at the other terminal.
const manitasToPortalTunal = CABLE_PATH.slice(0, 3).reverse();

export const VEREDAL_ROUTES = [
  {
    id: 'van-veredal-mochuelo-01',
    type: 'veredal',
    name: 'Van veredal Mochuelo–Quiba–Paraíso',
    origin: {
      id: 'mochuelo_alto',
      name: 'Mochuelo Alto',
      coordinates: [4.4883574, -74.148341],
    },
    destination: {
      id: 'portal_tunal',
      name: 'Portal Tunal',
      coordinates: [4.56917, -74.13968],
    },
    integration: mochueloIntegration,
    stops: [
      createStop('mochuelo-pickup', 'Mochuelo Alto · toma', mochueloToParaiso[0]),
      createStop('quiba-pickup', 'Quiba Bajo · trasbordo', [4.54274724, -74.17018404], 'transfer'),
      createStop('paraiso-transfer', 'Mirador del Paraíso · integración', mochueloIntegration.coordinates, 'integration'),
    ],
    route: mochueloToParaiso,
    continuation: CABLE_PATH.slice().reverse(),
    simulated: true,
    geometrySource: 'handcrafted_veredal_fixture',
    sourceNote: 'Recorrido aproximado de prototipo; no representa un servicio oficial verificado.',
  },
  {
    id: 'van-veredal-quiba-01',
    type: 'veredal',
    name: 'Van veredal Quiba–Manitas',
    origin: {
      id: 'quiba_bajo',
      name: 'Quiba Bajo',
      coordinates: [4.54274724, -74.17018404],
    },
    destination: {
      id: 'portal_tunal',
      name: 'Portal Tunal',
      coordinates: [4.56917, -74.13968],
    },
    integration: quibaIntegration,
    stops: [
      createStop('quiba-pickup', 'Quiba Bajo · toma', quibaToManitas[0]),
      createStop('bella-flor-stop', 'Bella Flor · punto intermedio', [4.546, -74.1508], 'intermediate'),
      createStop('manitas-transfer', 'Estación Manitas · integración', quibaIntegration.coordinates, 'integration'),
    ],
    route: quibaToManitas,
    continuation: manitasToPortalTunal,
    simulated: true,
    geometrySource: 'handcrafted_veredal_fixture',
    sourceNote: 'Recorrido aproximado de prototipo; validar con operadores y comunidad.',
  },
  {
    id: 'van-veredal-sierra-01',
    type: 'veredal',
    name: 'Van veredal Sierra Morena–Manitas',
    origin: {
      id: 'sierra_morena',
      name: 'Sierra Morena',
      coordinates: [4.5680, -74.1680],
    },
    destination: {
      id: 'portal_tunal',
      name: 'Portal Tunal',
      coordinates: [4.56917, -74.13968],
    },
    integration: sierraIntegration,
    stops: [
      createStop('sierra-pickup', 'Sierra Morena · toma', sierraToManitas[0]),
      createStop('sierra-intermediate', 'Sector alto · punto intermedio', [4.561, -74.1600], 'intermediate'),
      createStop('manitas-transfer', 'Estación Manitas · integración', sierraIntegration.coordinates, 'integration'),
    ],
    route: sierraToManitas,
    continuation: manitasToPortalTunal,
    simulated: true,
    geometrySource: 'handcrafted_veredal_fixture',
    sourceNote: 'Recorrido aproximado de prototipo; no es una ruta oficial confirmada.',
  },
];

export const VEREDAL_ROUTES_BY_ID = Object.freeze(
  Object.fromEntries(VEREDAL_ROUTES.map((route) => [route.id, route])),
);
