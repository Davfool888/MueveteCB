// ─── Data constants for Muevete CB (Ciudad Bolívar) ─────────────────────────

/** Bounding box strictly restricting view/pan to Localidad 19 (Ciudad Bolívar) */
export const CIUDAD_BOLIVAR_BOUNDS = [
  [4.4150, -74.2250], // Suroeste (Mochuelo Alto / Pasquilla)
  [4.6100, -74.1150], // Noreste (Portal Tunal / Autopista Sur / Meissen)
];

export const CIUDAD_BOLIVAR_CENTER = [4.5360, -74.1530];

/** límites amplios para puntos seleccionados fuera de ciudad bolívar */
export const BOGOTA_BOUNDS = [
  [4.35, -74.35],
  [4.95, -73.90],
];

/** Approximate perimeter polygon of Localidad 19 (Ciudad Bolívar) */
export const CIUDAD_BOLIVAR_POLYGON = [
  [4.5980, -74.1380], // Autopista Sur / Perdomo
  [4.5820, -74.1280], // Meissen / Río Tunjuelo
  [4.56917, -74.13968], // Portal Tunal
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

/** Trazado de referencia entre las cuatro estaciones del GTFS 2026-08-18. */
export const CABLE_PATH = [
  [4.56917, -74.13968], // Portal Tunal
  [4.55578995, -74.1473999], // Juan Pablo II
  [4.55028009, -74.15049744], // Manitas
  [4.55009985, -74.1588974], // Mirador del Paraíso
];

/** 4 Estaciones de TransMiCable con detalles de accesibilidad */
export const TRANSMICABLE_STATIONS = [
  {
    id: 'tunal',
    name: 'Portal Tunal',
    coordinates: [4.56917, -74.13968],
    tag: 'Estación troncal',
    detail: 'Conexión con TransMilenio. El GTFS registra abordaje accesible; verifica las condiciones actuales con el operador.',
    wheelchairBoarding: 1,
  },
  {
    id: 'juan-pablo',
    name: 'Juan Pablo II',
    coordinates: [4.55578995, -74.1473999],
    tag: 'Estación intermedia',
    detail: 'Sector Juan Pablo II. El GTFS registra abordaje accesible; la condición actual debe confirmarse.',
    wheelchairBoarding: 1,
  },
  {
    id: 'manitas',
    name: 'Manitas',
    coordinates: [4.55028009, -74.15049744],
    tag: 'Estación intermedia',
    detail: 'Conexión con el sector de Manitas. El GTFS registra abordaje accesible.',
    wheelchairBoarding: 1,
  },
  {
    id: 'paraiso',
    name: 'Mirador del Paraíso',
    coordinates: [4.55009985, -74.1588974],
    tag: 'Estación terminal',
    detail: 'Terminal del TransMiCable de Ciudad Bolívar y enlace con servicios SITP.',
    wheelchairBoarding: 1,
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
    totalCost: 6050,
    costFormatted: '$6.050 COP',
    costBreakdown: '$2.500 Colectivo veredal + $3.550 TransMiCable',
    paymentMethod: 'Efectivo suelto + Tarjeta TuLlave',
    accessibilityScore: 75,
    accessibilityLabel: 'Media; verificar acceso del colectivo y tramo veredal',
    qualityBadge: 'Rápida y panorámica',
    reason: 'Cruza en campero veredal y enlaza en Mirador del Paraíso con TransMiCable directo; el trayecto exacto sigue en validación.',
    mapPath: [
      [4.4883574, -74.148341],
      [4.4941, -74.1512],
      [4.5051, -74.1525],
      [4.5182, -74.1592],
      [4.54274724, -74.17018404],
      [4.5397146, -74.1602603],
      ...CABLE_PATH.slice().reverse(),
    ],
    fallbackPath: 'M82 505C135 444 188 377 252 334C345 273 458 240 570 182C650 140 714 119 765 105',
    segments: [
      { type: 'informal', title: 'Campero veredal de Quiba', detail: 'Mochuelo Alto → Mirador del Paraíso · 25 min', time: '25 min', cost: '$2.500 COP' },
      { type: 'cable', source: 'transmilenio_2026', title: 'Transbordo en Mirador del Paraíso', detail: 'Acceso y validación con tarjeta TuLlave · 5 min', time: '5 min', cost: 'Incluido' },
      { type: 'cable', source: 'transmilenio_2026', title: 'TransMiCable Cabina Aérea', detail: 'Mirador del Paraíso → Portal Tunal · 14 min', time: '14 min', cost: '$3.550 COP' },
      { type: 'walk', title: 'Caminata a la plataforma', detail: 'Ingreso a Portal Tunal · 10 min estimadas', time: '10 min', cost: '$0 COP' },
    ],
  },
  alternate: {
    id: 'alternate',
    mode: 'safe',
    modeLabel: 'Ruta ajustada por bloqueo ⚠️',
    origin: 'Mochuelo Alto',
    destination: 'Portal Tunal',
    title: 'Alternativa por Las Torres (trayecto estimado)',
    departureClock: '5:38 a. m.',
    arrivalClock: '6:42 a. m.',
    arrivalMinutes: 402,
    duration: '64 min',
    confidence: 78,
    confidenceLabel: 'Confianza media',
    totalCost: 6050,
    costFormatted: '$6.050 COP',
    costBreakdown: '$2.500 Colectivo veredal + $3.550 TransMiCable',
    paymentMethod: 'Efectivo suelto + Tarjeta TuLlave',
    accessibilityScore: 65,
    accessibilityLabel: 'Media-Baja (vía secundaria con tramos de tierra)',
    qualityBadge: 'Desvío por validar',
    reason: 'Evita el bloqueo en la vía Alpes–Quiba utilizando el camino rural de Las Torres. Añade 10 minutos de trayecto pero ofrece una alternativa estimada.',
    mapPath: [
      [4.4883574, -74.148341],
      [4.4942, -74.1528],
      [4.506, -74.1592],
      [4.518, -74.1645],
      [4.5298, -74.1684],
      [4.5405, -74.1658],
      [4.5472, -74.1612],
      ...CABLE_PATH.slice().reverse(),
    ],
    fallbackPath: 'M82 505C132 450 185 398 252 370C350 329 446 298 533 238C630 185 700 139 765 105',
    segments: [
      { type: 'informal', title: 'Campero veredal Las Torres', detail: 'Mochuelo Alto → Cruce Las Torres · 29 min', time: '29 min', cost: '$2.500 COP' },
      { type: 'walk', title: 'Caminata de enlace', detail: 'Sendero veredal por validar · 4 min', time: '4 min', cost: '$0 COP' },
      { type: 'informal', title: 'Colectivo alimentador local', detail: 'Las Torres → Mirador del Paraíso · 12 min', time: '12 min', cost: '$0 (acuerdo)' },
      { type: 'cable', source: 'transmilenio_2026', title: 'TransMiCable Cabina Aérea', detail: 'Mirador del Paraíso → Portal Tunal · 14 min', time: '14 min', cost: '$3.550 COP' },
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
    confidenceLabel: 'Tarifa oficial 2026',
    totalCost: 3550,
    costFormatted: '$3.550 COP',
    costBreakdown: '1 solo pasaje TuLlave ($3.550) con transbordo integrado dentro de 125 min',
    paymentMethod: 'Solo Tarjeta TuLlave (Cero efectivo)',
    accessibilityScore: 92,
    accessibilityLabel: 'Por verificar en el bus y el acceso a la estación',
    qualityBadge: 'Ahorro máximo',
    reason: 'Ahorra $2.500 eliminando el colectivo informal. Requiere salir 15 min antes debido al tráfico matutino sobre la Av. Boyacá.',
    mapPath: [
      [4.5182, -74.1592], // Mochuelo Bajo
      [4.5298, -74.1684],
      [4.5382, -74.1718],
      [4.5446, -74.1654],
      [4.55009985, -74.1588974],
      [4.5570, -74.1500],
      [4.5620, -74.1430],
      [4.56917, -74.13968],
    ],
    fallbackPath: 'M82 505C180 430 320 310 500 220 650 160 765 105',
    segments: [
      { type: 'walk', title: 'Caminata a paradero SITP', detail: 'Paradero Mochuelo Bajo · 8 min', time: '8 min', cost: '$0 COP' },
      { type: 'sitp', source: 'gtfs_20260818', title: 'Bus SITP Ruta 6-18', detail: 'Mochuelo → Av. Boyacá → Portal Tunal · 54 min', time: '54 min', cost: '$3.550 COP' },
      { type: 'walk', title: 'Ingreso directo a troncal', detail: 'Plataforma 1 Portal Tunal · 6 min', time: '6 min', cost: '$0 COP' },
    ],
  },
  accessible: {
    id: 'accessible',
    mode: 'accessible',
    modeLabel: 'Ruta formal PMR por verificar ♿',
    origin: 'Mirador del Paraíso',
    destination: 'Portal Tunal',
    title: 'Mirador del Paraíso → Portal Tunal (Directo TransMiCable)',
    departureClock: '6:08 a. m.',
    arrivalClock: '6:27 a. m.',
    arrivalMinutes: 387,
    duration: '19 min',
    confidence: 97,
    confidenceLabel: 'Red formal; tiempo estimado',
    totalCost: 3550,
    costFormatted: '$3.550 COP',
    costBreakdown: 'Pasaje único TransMiCable ($3.550)',
    paymentMethod: 'Tarjeta TuLlave (con subsidio adulto mayor / SISBEN si aplica)',
    accessibilityScore: 80,
    accessibilityLabel: 'Ruta formal sin tramo veredal; accesibilidad PMR por confirmar',
    qualityBadge: 'Ruta sin tramo veredal',
    reason: 'Evita el tramo veredal y usa TransMiCable. La accesibilidad PMR y las condiciones de acceso deben verificarse antes de viajar.',
    mapPath: CABLE_PATH.slice().reverse(),
    fallbackPath: 'M252 334C400 252 660 145 765 105',
    segments: [
      { type: 'cable', source: 'transmilenio_2026', title: 'Ingreso Estación Mirador del Paraíso', detail: 'Ingreso a estación; condición PMR por confirmar · 3 min', time: '3 min', cost: '$3.550 COP' },
      { type: 'cable', source: 'transmilenio_2026', title: 'Viaje en Cabina TransMiCable', detail: 'Vuelo directo sin interrupciones · 14 min', time: '14 min', cost: 'Incluido' },
      { type: 'walk', title: 'Salida nivelada en Portal Tunal', detail: 'Rampa hacia buses troncales · 2 min', time: '2 min', cost: '$0 COP' },
    ],
  },
  quiba: {
    id: 'quiba',
    mode: 'fastest',
    modeLabel: 'Ruta SITP + TransMiCable ⚡',
    origin: 'Quiba',
    destination: 'Portal Tunal',
    title: 'Quiba → Portal Tunal (SITP 10-12 + TransMiCable)',
    departureClock: '6:05 a. m.',
    arrivalClock: '6:33 a. m.',
    arrivalMinutes: 393,
    duration: '28 min',
    confidence: 85,
    confidenceLabel: 'Ruta GTFS; tiempos de demostración',
    totalCost: 3550,
    costFormatted: '$3.550 COP',
    costBreakdown: 'Pasaje integrado SITP + TransMiCable ($3.550)',
    paymentMethod: 'Tarjeta TuLlave',
    accessibilityScore: 78,
    accessibilityLabel: 'Verificar acceso en paradero, transbordo y estación',
    qualityBadge: 'Conexión verificada en GTFS',
    reason: 'La ruta 10-12 aparece en el GTFS entre Quiba y Paraíso; el tiempo combinado sigue siendo una estimación de demostración.',
    mapPath: [
      [4.54274724, -74.17018404],
      [4.5397146, -74.1602603],
      ...CABLE_PATH.slice().reverse(),
    ],
    fallbackPath: 'M252 334C300 310 335 286 400 252C510 196 660 145 765 105',
    segments: [
      { type: 'sitp', source: 'gtfs_20260818', title: 'SITP ruta 10-12', detail: 'Quiba → Mirador del Paraíso · 12 min estimadas', time: '12 min', cost: '$3.550 COP' },
      { type: 'walk', title: 'Transbordo en Paraíso', detail: 'Conexión verificada en GTFS · 3 min', time: '3 min', cost: '$0 COP' },
      { type: 'cable', source: 'transmilenio_2026', title: 'TransMiCable', detail: 'Directo al Portal Tunal · 13 min estimadas', time: '13 min', cost: 'Incluido' },
    ],
  },
};

// geometría aproximada de veredales; no representa rutas oficiales verificadas
export const INFORMAL_PATHS = [
  {
    name: 'Mochuelo Alto – Quiba – Mirador del Paraíso (Camperos)',
    cost: 'Por confirmar',
    frequency: 'Frecuencia por validar',
    coordinates: [
      [4.4883574, -74.148341],
      [4.4941, -74.1512],
      [4.5051, -74.1525],
      [4.5182, -74.1592],
      [4.54274724, -74.17018404],
      [4.5397146, -74.1602603],
      [4.55009985, -74.1588974],
    ],
  },
  {
    name: 'Quiba Alta – Altos de Quiba – Bella Flor',
    cost: 'Por confirmar',
    frequency: 'Frecuencia por validar',
    coordinates: [
      [4.54274724, -74.17018404],
      [4.539, -74.1518],
      [4.546, -74.1508],
      [4.55028009, -74.15049744],
    ],
  },
  {
    name: 'Mochuelo Alto – Sector Las Torres (Camino alterno)',
    cost: 'Por confirmar',
    frequency: 'Frecuencia por validar',
    coordinates: [
      [4.4883574, -74.148341],
      [4.503, -74.1592],
      [4.518, -74.1645],
      [4.5298, -74.1684],
    ],
  },
  {
    name: 'Sierra Morena – Carros comunales a Estación Manitas',
    cost: 'Por confirmar',
    frequency: 'Frecuencia por validar',
    coordinates: [
      [4.5680, -74.1680],
      [4.5610, -74.1600],
      [4.55028009, -74.15049744],
    ],
  },
];

// corredor visual de referencia; el snapshot gtfs no incluye shapes de rutas
export const SITP_PATH = [
  [4.5182, -74.1592], // Mochuelo Bajo
  [4.525, -74.1832],
  [4.5316, -74.1781],
  [4.5382, -74.1718],
  [4.5446, -74.1654],
  [4.55009985, -74.1588974],
  [4.5620, -74.1430],
  [4.56917, -74.13968], // Portal Tunal
];

export const POINTS_OF_INTEREST = [
  { name: 'Portal Tunal', detail: 'Terminal troncal TransMilenio y TransMiCable', coordinates: [4.56917, -74.13968], label: 'T', type: 'cable' },
  { name: 'Mirador del Paraíso', detail: 'Estación cumbre TransMiCable y conexión veredal', coordinates: [4.55009985, -74.1588974], label: 'P', type: 'cable' },
  { name: 'Estación Manitas', detail: 'Estación intermedia con cicloparqueadero y colegios', coordinates: [4.55028009, -74.15049744], label: 'M', type: 'cable' },
  { name: 'Estación Juan Pablo II', detail: 'Acceso a San Francisco y Meissen', coordinates: [4.55578995, -74.1473999], label: 'J', type: 'cable' },
  { name: 'Quiba Bajo', detail: 'Paradero principal de camperos veredales', coordinates: [4.54274724, -74.17018404], label: 'Q', type: 'informal' },
  { name: 'Mochuelo Alto', detail: 'Cabecera veredal sur de Ciudad Bolívar', coordinates: [4.4883574, -74.148341], label: 'M', type: 'informal' },
  { name: 'Mochuelo Bajo', detail: 'Punto de empalme con rutas alimentadoras y SITP', coordinates: [4.5182, -74.1592], label: 'B', type: 'sitp' },
  { name: 'Hospital Meissen', detail: 'Centro hospitalario de referencia; punto visible en el GTFS 2026-08-18', coordinates: [4.55887398, -74.13872256], label: 'H', type: 'health' },
  { name: 'Sierra Morena', detail: 'Sector alto occidental con carritos informales', coordinates: [4.5680, -74.1680], label: 'S', type: 'informal' },
];

export const REPORT_LOCATIONS = {
  alpes: { name: 'Vía Alpes – Quiba', coordinates: [4.54274724, -74.17018404] },
  paraiso: { name: 'Mirador del Paraíso / enlace veredal', coordinates: [4.55009985, -74.1588974] },
  tunal: { name: 'Portal Tunal', coordinates: [4.56917, -74.13968] },
  meissen: { name: 'Av. Boyacá con Meissen', coordinates: [4.55887398, -74.13872256] },
  torres: { name: 'Cruce Sector Las Torres', coordinates: [4.5298, -74.1684] },
};

export const REPORT_TYPE_LABELS = {
  bloqueo: 'Bloqueo o derrumbe',
  demora: 'Demora o trancón fuerte',
  cambio: 'Cambio de recorrido',
  otro: 'Otra novedad',
};

export const STORAGE_KEY = 'muevete-cb-demo-reports-v2';
