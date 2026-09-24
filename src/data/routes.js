// ─── Data constants for Muevete CB (Ciudad Bolívar) ─────────────────────────

/** Bounding box strictly restricting view/pan to Localidad 19 (Ciudad Bolívar) */
export const CIUDAD_BOLIVAR_BOUNDS = [
  [4.4150, -74.2250], // Suroeste (Mochuelo Alto / Pasquilla)
  [4.6100, -74.1150], // Noreste (Portal Tunal / Autopista Sur / Meissen)
];

export const CIUDAD_BOLIVAR_CENTER = [4.5360, -74.1530];

/** Approximate perimeter polygon of Localidad 19 (Ciudad Bolívar) */
export const CIUDAD_BOLIVAR_POLYGON = [
  [4.5980, -74.1380], // Autopista Sur / Perdomo
  [4.5820, -74.1280], // Meissen / Río Tunjuelo
  [4.569174, -74.1396997], // Portal Tunal
  [4.5550, -74.1300], // Borde San Carlos / Usme
  [4.5200, -74.1250], // Borde oriental Tunjuelo
  [4.4750, -74.1320], // Curva hacia Mochuelo
  [4.4280, -74.1420], // Límite rural Pasquilla
  [4.4250, -74.1800], // Suroccidente rural
  [4.4700, -74.1950], // Quiba Alta / límite Soacha
  [4.5200, -74.1920], // Borde Cazucá / Ciudad Bolívar
  [4.5500, -74.1750], // Sierra Morena / Cazucá
  [4.5750, -74.1680], // Ismael Perdomo occidental
  [4.5980, -74.1380], // Cierre
];

/** Trazado aéreo real del TransMiCable (Portal Tunal <-> Mirador del Paraíso) */
export const CABLE_PATH = [
  [4.569174, -74.1396997], // Portal Tunal
  [4.5689342, -74.1398416],
  [4.5671406, -74.1408636],
  [4.564179, -74.142572],
  [4.5626071, -74.1434787], // Juan Pablo II
  [4.5597225, -74.1451425],
  [4.5571596, -74.1466208],
  [4.5544391, -74.1481597], // Manitas
  [4.551891, -74.14962],
  [4.5500615, -74.1588534], // Mirador del Paraíso
];

/** 4 Estaciones de TransMiCable con detalles de accesibilidad */
export const TRANSMICABLE_STATIONS = [
  {
    id: 'tunal',
    name: 'Portal Tunal',
    coordinates: [4.569174, -74.1396997],
    tag: 'Estación Troncal',
    detail: 'Conexión directa con buses articulados y biarticulados de TransMilenio. 100% accesible.',
    elevators: true,
  },
  {
    id: 'juan-pablo',
    name: 'Juan Pablo II',
    coordinates: [4.5626071, -74.1434787],
    tag: 'Estación Intermedia',
    detail: 'Sector El Limonar y San Francisco. Ascensores y cicloparqueadero seguro.',
    elevators: true,
  },
  {
    id: 'manitas',
    name: 'Manitas',
    coordinates: [4.5544391, -74.1481597],
    tag: 'Estación Comunitaria',
    detail: 'Conexión con colegios y centros de salud de Manitas. Rampa y taquilla accesible.',
    elevators: true,
  },
  {
    id: 'paraiso',
    name: 'Mirador del Paraíso',
    coordinates: [4.5500615, -74.1588534],
    tag: 'Estación Cumbre',
    detail: 'Punto turístico, cultural y de conexión con camperos y colectivos a veredas.',
    elevators: true,
  },
];

export const ROUTES = {
  main: {
    id: 'main',
    mode: 'fastest',
    modeLabel: 'Más rápida ⚡',
    origin: 'Mochuelo Alto',
    destination: 'Portal Tunal',
    title: 'Mochuelo Alto → Portal Tunal (Vía Quiba + TransMiCable)',
    departureClock: '5:35 a. m.',
    arrivalClock: '6:29 a. m.',
    arrivalMinutes: 389,
    duration: '54 min',
    confidence: 88,
    confidenceLabel: 'Confianza alta',
    totalCost: 5450,
    costFormatted: '$5.450 COP',
    costBreakdown: '$2.500 Colectivo veredal + $2.950 TransMiCable',
    paymentMethod: 'Efectivo suelto + Tarjeta TuLlave',
    accessibilityScore: 75,
    accessibilityLabel: 'Media (colectivo con peldaño alto + cable 100% plano)',
    qualityBadge: 'Rápida y panorámica',
    reason: 'Cruza en campero veredal y enlaza en Mirador del Paraíso con TransMiCable directo, esquivando el colapso vial de la Av. Boyacá.',
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
      { type: 'informal', title: 'Campero veredal de Quiba', detail: 'Mochuelo Alto → Mirador del Paraíso · 25 min', time: '25 min', cost: '$2.500 COP' },
      { type: 'cable', title: 'Transbordo en Mirador del Paraíso', detail: 'Acceso y validación con tarjeta TuLlave · 5 min', time: '5 min', cost: 'Incluido' },
      { type: 'cable', title: 'TransMiCable Cabina Aérea', detail: 'Mirador del Paraíso → Portal Tunal · 14 min', time: '14 min', cost: '$2.950 COP' },
      { type: 'walk', title: 'Caminata accesible a plataforma', detail: 'Túnel techado Portal Tunal · 10 min', time: '10 min', cost: '$0 COP' },
    ],
  },
  alternate: {
    id: 'alternate',
    mode: 'safe',
    modeLabel: 'Ruta ajustada por bloqueo ⚠️',
    origin: 'Mochuelo Alto',
    destination: 'Portal Tunal',
    title: 'Alternativa por Las Torres (Desvío seguro)',
    departureClock: '5:38 a. m.',
    arrivalClock: '6:42 a. m.',
    arrivalMinutes: 402,
    duration: '64 min',
    confidence: 78,
    confidenceLabel: 'Confianza media',
    totalCost: 5450,
    costFormatted: '$5.450 COP',
    costBreakdown: '$2.500 Colectivo veredal + $2.950 TransMiCable',
    paymentMethod: 'Efectivo suelto + Tarjeta TuLlave',
    accessibilityScore: 65,
    accessibilityLabel: 'Media-Baja (vía secundaria con tramos de tierra)',
    qualityBadge: 'Desvío verificado',
    reason: 'Evita el bloqueo en la vía Alpes–Quiba utilizando el camino rural de Las Torres. Añade 10 minutos de trayecto pero garantiza llegada continua.',
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
      { type: 'informal', title: 'Campero veredal Las Torres', detail: 'Mochuelo Alto → Cruce Las Torres · 29 min', time: '29 min', cost: '$2.500 COP' },
      { type: 'walk', title: 'Caminata de enlace seguro', detail: 'Sendero veredal · 4 min', time: '4 min', cost: '$0 COP' },
      { type: 'informal', title: 'Colectivo alimentador local', detail: 'Las Torres → Mirador del Paraíso · 12 min', time: '12 min', cost: '$0 (acuerdo)' },
      { type: 'cable', title: 'TransMiCable Cabina Aérea', detail: 'Mirador del Paraíso → Portal Tunal · 14 min', time: '14 min', cost: '$2.950 COP' },
      { type: 'walk', title: 'Ingreso al Portal', detail: 'Rampa peatonal · 5 min', time: '5 min', cost: '$0 COP' },
    ],
  },
  economic: {
    id: 'economic',
    mode: 'cheapest',
    modeLabel: 'Más económica 💰',
    origin: 'Mochuelo Bajo',
    destination: 'Portal Tunal',
    title: 'Mochuelo Bajo → Portal Tunal (SITP Directo)',
    departureClock: '5:20 a. m.',
    arrivalClock: '6:28 a. m.',
    arrivalMinutes: 388,
    duration: '68 min',
    confidence: 84,
    confidenceLabel: 'Tarifa mínima garantizada',
    totalCost: 2950,
    costFormatted: '$2.950 COP',
    costBreakdown: '1 solo pasaje TuLlave ($2.950) con transbordo libre 110 min',
    paymentMethod: 'Solo Tarjeta TuLlave (Cero efectivo)',
    accessibilityScore: 92,
    accessibilityLabel: 'Alta (buses SITP padrón con rampa PMR)',
    qualityBadge: 'Ahorro máximo',
    reason: 'Ahorra $2.500 eliminando el colectivo informal. Requiere salir 15 min antes debido al tráfico matutino sobre la Av. Boyacá.',
    mapPath: [
      [4.5182, -74.1592], // Mochuelo Bajo
      [4.5298, -74.1684],
      [4.5382, -74.1718],
      [4.5446, -74.1654],
      [4.5500615, -74.1588534],
      [4.5570, -74.1500],
      [4.5620, -74.1430],
      [4.569174, -74.1396997],
    ],
    fallbackPath: 'M82 505C180 430 320 310 500 220 650 160 765 105',
    segments: [
      { type: 'walk', title: 'Caminata a paradero SITP', detail: 'Paradero Mochuelo Bajo · 8 min', time: '8 min', cost: '$0 COP' },
      { type: 'sitp', title: 'Bus SITP Ruta 6-18 / H610', detail: 'Mochuelo → Av. Boyacá → Portal Tunal · 54 min', time: '54 min', cost: '$2.950 COP' },
      { type: 'walk', title: 'Ingreso directo a troncal', detail: 'Plataforma 1 Portal Tunal · 6 min', time: '6 min', cost: '$0 COP' },
    ],
  },
  accessible: {
    id: 'accessible',
    mode: 'accessible',
    modeLabel: '100% Accesible ♿',
    origin: 'Mirador del Paraíso',
    destination: 'Portal Tunal',
    title: 'Mirador del Paraíso → Portal Tunal (Directo TransMiCable)',
    departureClock: '6:08 a. m.',
    arrivalClock: '6:27 a. m.',
    arrivalMinutes: 387,
    duration: '19 min',
    confidence: 97,
    confidenceLabel: 'Máxima certeza y confort',
    totalCost: 2950,
    costFormatted: '$2.950 COP',
    costBreakdown: 'Pasaje único TransMiCable ($2.950)',
    paymentMethod: 'Tarjeta TuLlave (con subsidio adulto mayor / SISBEN si aplica)',
    accessibilityScore: 100,
    accessibilityLabel: '100% Accesible (Ascensores, rampas, cabina a nivel de piso)',
    qualityBadge: 'Confort premium',
    reason: 'Ruta 100% apta para personas en silla de ruedas, coches de bebé o adultos mayores. Cero escaleras ni baches.',
    mapPath: [
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
    fallbackPath: 'M252 334C400 252 660 145 765 105',
    segments: [
      { type: 'cable', title: 'Ingreso Estación Mirador del Paraíso', detail: 'Ascensor disponible y torniquete ancho PMR · 3 min', time: '3 min', cost: '$2.950 COP' },
      { type: 'cable', title: 'Viaje en Cabina TransMiCable', detail: 'Vuelo directo sin interrupciones · 14 min', time: '14 min', cost: 'Incluido' },
      { type: 'walk', title: 'Salida nivelada en Portal Tunal', detail: 'Rampa hacia buses troncales · 2 min', time: '2 min', cost: '$0 COP' },
    ],
  },
  quiba: {
    id: 'quiba',
    mode: 'fastest',
    modeLabel: 'Ruta Veredal Quiba ⚡',
    origin: 'Quiba',
    destination: 'Portal Tunal',
    title: 'Quiba → Portal Tunal (Enlace Mirador)',
    departureClock: '6:05 a. m.',
    arrivalClock: '6:33 a. m.',
    arrivalMinutes: 393,
    duration: '28 min',
    confidence: 85,
    confidenceLabel: 'Confianza alta',
    totalCost: 5450,
    costFormatted: '$5.450 COP',
    costBreakdown: '$2.500 Colectivo + $2.950 TransMiCable',
    paymentMethod: 'Efectivo + TuLlave',
    accessibilityScore: 78,
    accessibilityLabel: 'Media-Alta',
    qualityBadge: 'Enlace veloz',
    reason: 'Enlaza con TransMiCable en Mirador del Paraíso y evita entrar por el trancón de Meissen.',
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
      { type: 'informal', title: 'Colectivo campero de Quiba', detail: 'Quiba Bajo → Mirador del Paraíso · 12 min', time: '12 min', cost: '$2.500 COP' },
      { type: 'cable', title: 'Transbordo en Mirador del Paraíso', detail: 'Validación en torniquete · 3 min', time: '3 min', cost: 'Incluido' },
      { type: 'cable', title: 'TransMiCable', detail: 'Directo al Portal Tunal · 13 min', time: '13 min', cost: '$2.950 COP' },
    ],
  },
};

export const INFORMAL_PATHS = [
  {
    name: 'Mochuelo Alto – Quiba – Mirador del Paraíso (Camperos)',
    cost: '$2.500 COP',
    frequency: 'Cada 10–15 min',
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
    name: 'Quiba Alta – Altos de Quiba – Bella Flor',
    cost: '$2.500 COP',
    frequency: 'Cada 12 min',
    coordinates: [
      [4.5336318, -74.1562843],
      [4.539, -74.1518],
      [4.546, -74.1508],
      [4.5544391, -74.1481597],
    ],
  },
  {
    name: 'Mochuelo Alto – Sector Las Torres (Camino alterno)',
    cost: '$2.500 COP',
    frequency: 'Bajo demanda',
    coordinates: [
      [4.4883574, -74.148341],
      [4.503, -74.1592],
      [4.518, -74.1645],
      [4.5298, -74.1684],
    ],
  },
  {
    name: 'Sierra Morena – Carros comunales a Estación Manitas',
    cost: '$2.000 COP',
    frequency: 'Cada 8 min',
    coordinates: [
      [4.5680, -74.1680],
      [4.5610, -74.1600],
      [4.5544391, -74.1481597],
    ],
  },
];

export const SITP_PATH = [
  [4.5182, -74.1592], // Mochuelo Bajo
  [4.525, -74.1832],
  [4.5316, -74.1781],
  [4.5382, -74.1718],
  [4.5446, -74.1654],
  [4.5500615, -74.1588534],
  [4.5620, -74.1430],
  [4.569174, -74.1396997], // Portal Tunal
];

export const POINTS_OF_INTEREST = [
  { name: 'Portal Tunal', detail: 'Terminal troncal TransMilenio y TransMiCable', coordinates: [4.569174, -74.1396997], label: 'T', type: 'cable' },
  { name: 'Mirador del Paraíso', detail: 'Estación cumbre TransMiCable y conexión veredal', coordinates: [4.5500615, -74.1588534], label: 'P', type: 'cable' },
  { name: 'Estación Manitas', detail: 'Estación intermedia con cicloparqueadero y colegios', coordinates: [4.5544391, -74.1481597], label: 'M', type: 'cable' },
  { name: 'Estación Juan Pablo II', detail: 'Acceso a San Francisco y Meissen', coordinates: [4.5626071, -74.1434787], label: 'J', type: 'cable' },
  { name: 'Quiba Bajo', detail: 'Paradero principal de camperos veredales', coordinates: [4.5336318, -74.1562843], label: 'Q', type: 'informal' },
  { name: 'Mochuelo Alto', detail: 'Cabecera veredal sur de Ciudad Bolívar', coordinates: [4.4883574, -74.148341], label: 'M', type: 'informal' },
  { name: 'Mochuelo Bajo', detail: 'Punto de empalme con rutas alimentadoras y SITP', coordinates: [4.5182, -74.1592], label: 'B', type: 'sitp' },
  { name: 'Hospital Meissen', detail: 'Centro hospitalario de referencia para la localidad', coordinates: [4.5620, -74.1340], label: 'H', type: 'health' },
  { name: 'Sierra Morena', detail: 'Sector alto occidental con carritos informales', coordinates: [4.5680, -74.1680], label: 'S', type: 'informal' },
];

export const REPORT_LOCATIONS = {
  alpes: { name: 'Vía Alpes – Quiba', coordinates: [4.5336318, -74.1562843] },
  rosario: { name: 'Sector Villa del Rosario / Paraíso', coordinates: [4.5500615, -74.1588534] },
  tunal: { name: 'Portal Tunal', coordinates: [4.569174, -74.1396997] },
  meissen: { name: 'Av. Boyacá con Meissen', coordinates: [4.5620, -74.1340] },
  torres: { name: 'Cruce Sector Las Torres', coordinates: [4.5298, -74.1684] },
};

export const REPORT_TYPE_LABELS = {
  bloqueo: 'Bloqueo o derrumbe',
  demora: 'Demora o trancón fuerte',
  cambio: 'Cambio de recorrido',
  clima: 'Afectación por lluvia/niebla',
};

export const STORAGE_KEY = 'muevete-cb-demo-reports-v2';
