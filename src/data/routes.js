// ─── Data constants migrated from app.js ───────────────────────────────────

export const CABLE_PATH = [
  [4.5500615, -74.1588534],
  [4.551891, -74.14962],
  [4.5544391, -74.1481597],
  [4.5571596, -74.1466208],
  [4.5597225, -74.1451425],
  [4.5626071, -74.1434787],
  [4.564179, -74.142572],
  [4.5671406, -74.1408636],
  [4.5689342, -74.1398416],
  [4.569174, -74.1396997],
];

export const ROUTES = {
  main: {
    id: 'main',
    origin: 'Mochuelo Alto',
    destination: 'Portal Tunal',
    title: 'Mochuelo Alto → Portal Tunal',
    departureClock: '5:35 a. m.',
    arrivalClock: '6:29 a. m.',
    arrivalMinutes: 389,
    duration: '54 min',
    confidence: 86,
    confidenceLabel: 'Confianza media-alta',
    reason: 'Cruza una veredal y toma TransMiCable directo, evitando el trancón de la Boyacá.',
    mapPath: [
      [4.4883574, -74.148341],
      [4.4941, -74.1512],
      [4.5051, -74.1525],
      [4.5182, -74.1592],
      [4.5253, -74.1601],
      [4.5336318, -74.1562843],
      [4.5397146, -74.1602603],
      [4.5500615, -74.1588534],
      [4.551891, -74.14962],
      [4.5544391, -74.1481597],
      [4.5571596, -74.1466208],
      [4.5597225, -74.1451425],
      [4.5626071, -74.1434787],
      [4.564179, -74.142572],
      [4.5671406, -74.1408636],
      [4.5689342, -74.1398416],
      [4.569174, -74.1396997],
    ],
    fallbackPath: 'M82 505C135 444 188 377 252 334C345 273 458 240 570 182C650 140 714 119 765 105',
    segments: [
      { type: 'informal', title: 'Colectivo de Quiba', detail: 'Quiba → Villa del Rosario · 25 min', time: '25 min' },
      { type: 'cable', title: 'Transbordo en Villa del Rosario', detail: 'Espera estimada · 5 min', time: '5 min' },
      { type: 'cable', title: 'TransMiCable', detail: 'Villa del Rosario → Portal Tunal · 14 min', time: '14 min' },
      { type: 'walk', title: 'Camina al acceso', detail: 'Portal Tunal · 10 min', time: '10 min' },
    ],
  },
  alternate: {
    id: 'alternate',
    origin: 'Mochuelo Alto',
    destination: 'Portal Tunal',
    title: 'Alternativa por Las Torres',
    departureClock: '5:38 a. m.',
    arrivalClock: '6:42 a. m.',
    arrivalMinutes: 402,
    duration: '64 min',
    confidence: 76,
    confidenceLabel: 'Confianza media',
    reason: 'Evita el bloqueo de la vía Alpes–Quiba con un enlace veredal; suma 10 minutos.',
    mapPath: [
      [4.4883574, -74.148341],
      [4.4942, -74.1528],
      [4.506, -74.1592],
      [4.518, -74.1645],
      [4.5298, -74.1684],
      [4.5405, -74.1658],
      [4.5472, -74.1612],
      [4.5500615, -74.1588534],
      [4.551891, -74.14962],
      [4.5544391, -74.1481597],
      [4.5571596, -74.1466208],
      [4.5597225, -74.1451425],
      [4.5626071, -74.1434787],
      [4.564179, -74.142572],
      [4.5671406, -74.1408636],
      [4.5689342, -74.1398416],
      [4.569174, -74.1396997],
    ],
    fallbackPath: 'M82 505C132 450 185 398 252 370C350 329 446 298 533 238C630 185 700 139 765 105',
    segments: [
      { type: 'informal', title: 'Colectivo veredal', detail: 'Mochuelo Alto → Las Torres · 29 min', time: '29 min' },
      { type: 'walk', title: 'Camina al enlace', detail: 'Cruce señalizado · 4 min', time: '4 min' },
      { type: 'informal', title: 'Colectivo de enlace', detail: 'Las Torres → Villa del Rosario · 12 min', time: '12 min' },
      { type: 'cable', title: 'TransMiCable', detail: 'Villa del Rosario → Portal Tunal · 14 min', time: '14 min' },
      { type: 'walk', title: 'Camina al acceso', detail: 'Portal Tunal · 5 min', time: '5 min' },
    ],
  },
  quiba: {
    id: 'quiba',
    origin: 'Quiba',
    destination: 'Portal Tunal',
    title: 'Quiba → Portal Tunal',
    departureClock: '6:05 a. m.',
    arrivalClock: '6:33 a. m.',
    arrivalMinutes: 393,
    duration: '28 min',
    confidence: 83,
    confidenceLabel: 'Confianza media-alta',
    reason: 'Enlaza con TransMiCable en Villa del Rosario y evita sumar trayectos por el centro.',
    mapPath: [
      [4.5336318, -74.1562843],
      [4.5397146, -74.1602603],
      [4.5500615, -74.1588534],
      [4.551891, -74.14962],
      [4.5544391, -74.1481597],
      [4.5571596, -74.1466208],
      [4.5597225, -74.1451425],
      [4.5626071, -74.1434787],
      [4.564179, -74.142572],
      [4.5671406, -74.1408636],
      [4.5689342, -74.1398416],
      [4.569174, -74.1396997],
    ],
    fallbackPath: 'M252 334C300 310 335 286 400 252C510 196 660 145 765 105',
    segments: [
      { type: 'informal', title: 'Colectivo de Quiba', detail: 'Quiba → Villa del Rosario · 12 min', time: '12 min' },
      { type: 'cable', title: 'Transbordo corto', detail: 'Villa del Rosario · 3 min', time: '3 min' },
      { type: 'cable', title: 'TransMiCable', detail: 'Directo a Portal Tunal · 13 min', time: '13 min' },
    ],
  },
};

export const INFORMAL_PATHS = [
  {
    name: 'Mochuelo Alto – Quiba – Villa del Rosario',
    coordinates: [
      [4.4883574, -74.148341],
      [4.4941, -74.1512],
      [4.5051, -74.1525],
      [4.5182, -74.1592],
      [4.5336318, -74.1562843],
      [4.5397146, -74.1602603],
      [4.5500615, -74.1588534],
    ],
  },
  {
    name: 'Quiba – Altos de Quiba',
    coordinates: [
      [4.5336318, -74.1562843],
      [4.539, -74.1518],
      [4.546, -74.1508],
      [4.5544391, -74.1481597],
    ],
  },
  {
    name: 'Mochuelo Alto – sector Las Torres',
    coordinates: [
      [4.4883574, -74.148341],
      [4.503, -74.1592],
      [4.518, -74.1645],
      [4.5298, -74.1684],
    ],
  },
];

export const SITP_PATH = [
  [4.5500615, -74.1588534],
  [4.5446, -74.1654],
  [4.5382, -74.1718],
  [4.5316, -74.1781],
  [4.525, -74.1832],
];

export const POINTS_OF_INTEREST = [
  { name: 'Portal Tunal', detail: 'Terminal de TransMiCable y TransMilenio', coordinates: [4.569174, -74.1396997], label: 'T' },
  { name: 'Quiba', detail: 'Punto de enlace demostrativo', coordinates: [4.5336318, -74.1562843], label: 'Q' },
  { name: 'Mochuelo Alto', detail: 'Sector de origen de la demo', coordinates: [4.4883574, -74.148341], label: 'M' },
  { name: 'Plaza de mercado', detail: 'Referencia comunitaria demostrativa', coordinates: [4.5506, -74.151], label: 'P' },
];

export const REPORT_LOCATIONS = {
  alpes: { name: 'Vía Alpes – Quiba', coordinates: [4.5336318, -74.1562843] },
  rosario: { name: 'Sector Villa del Rosario', coordinates: [4.5500615, -74.1588534] },
  tunal: { name: 'Portal Tunal', coordinates: [4.569174, -74.1396997] },
};

export const REPORT_TYPE_LABELS = {
  bloqueo: 'Bloqueo',
  demora: 'Demora',
  cambio: 'Cambio de ruta',
};

export const STORAGE_KEY = 'muevete-cb-demo-reports-v1';
