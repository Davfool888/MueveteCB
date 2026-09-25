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

/**
 * Tramos recortados de shapes.txt del GTFS 2026-08-18 (puntos cada ≥120 m).
 * 6-18 (route_id 11192): Ladrillera Los Mochuelos (52701) → Pq. El Tunal (52088).
 * La 6-18 es un circuito San Carlos ↔ Lagunitas; no entra al Portal Tunal.
 */
export const SITP_6_18_PATH = [
  [4.522476, -74.142611], [4.523472, -74.142071], [4.524491, -74.141608], [4.525578, -74.141123],
  [4.526846, -74.140572], [4.527995, -74.14064], [4.529029, -74.141175], [4.530365, -74.141857],
  [4.531504, -74.142245], [4.532655, -74.142271], [4.533707, -74.141832], [4.535093, -74.141249],
  [4.536031, -74.140603], [4.537325, -74.140073], [4.538876, -74.139216], [4.539793, -74.138628],
  [4.540775, -74.138008], [4.54189, -74.137954], [4.543057, -74.137997], [4.544103, -74.137629],
  [4.546163, -74.137613], [4.545739, -74.136616], [4.544684, -74.136038], [4.546106, -74.136347],
  [4.5472, -74.136802], [4.548279, -74.13681], [4.550381, -74.136312], [4.551691, -74.136302],
  [4.552733, -74.136645], [4.554067, -74.137122], [4.555528, -74.137622], [4.557696, -74.13835],
  [4.558863, -74.138754], [4.560046, -74.138996], [4.561134, -74.13886], [4.562558, -74.138657],
  [4.563663, -74.138523], [4.565009, -74.138311], [4.566346, -74.138092], [4.567597, -74.138033],
  [4.568864, -74.138277], [4.571535, -74.138938], [4.571881, -74.139015],
];

/** 10-12 (route_id 10510): Quiba (52607) → IED Paraíso Mirador (52601), a ~352 m de la estación del cable. */
export const SITP_10_12_PATH = [
  [4.542747, -74.17019], [4.543536, -74.169218], [4.544717, -74.169111], [4.545941, -74.168072],
  [4.546852, -74.167198], [4.54764, -74.166213], [4.548304, -74.165268], [4.549196, -74.164643],
  [4.549227, -74.163338], [4.548774, -74.161726], [4.548374, -74.160694], [4.549345, -74.160221],
  [4.5504, -74.15982], [4.551581, -74.159375], [4.552653, -74.159017], [4.553274, -74.158822],
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
    arrivalClock: '6:26 a. m.',
    arrivalMinutes: 386,
    duration: '51 min',
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
      { type: 'cable', title: 'Transbordo en Mirador del Paraíso', detail: 'Acceso y validación con tarjeta TuLlave · 5 min estimados', time: '5 min', cost: 'Incluido' },
      { type: 'cable', source: 'gtfs_20260818', title: 'TransMiCable Cabina Aérea', detail: 'Mirador del Paraíso → Portal Tunal · 11 min según el GTFS', time: '11 min', cost: '$3.550 COP' },
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
    arrivalClock: '6:39 a. m.',
    arrivalMinutes: 399,
    duration: '61 min',
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
      { type: 'cable', source: 'gtfs_20260818', title: 'TransMiCable Cabina Aérea', detail: 'Mirador del Paraíso → Portal Tunal · 11 min según el GTFS', time: '11 min', cost: '$3.550 COP' },
      { type: 'walk', title: 'Ingreso al Portal', detail: 'Rampa peatonal · 5 min', time: '5 min', cost: '$0 COP' },
    ],
  },
  economic: {
    id: 'economic',
    mode: 'cheapest',
    modeLabel: 'Más económica 💰',
    origin: 'Mochuelo Bajo',
    destination: 'Portal Tunal',
    title: 'Mochuelo Bajo → Portal Tunal (SITP 6-18 + caminata)',
    departureClock: '5:46 a. m.',
    arrivalClock: '6:17 a. m.',
    arrivalMinutes: 377,
    duration: '31 min',
    confidence: 84,
    confidenceLabel: 'Horario GTFS; caminata estimada',
    totalCost: 3550,
    costFormatted: '$3.550 COP',
    costBreakdown: '1 pasaje SITP ($3.550), sin transbordo',
    paymentMethod: 'Solo Tarjeta TuLlave (Cero efectivo)',
    accessibilityScore: 92,
    accessibilityLabel: 'Por verificar en el bus y en la caminata al Portal',
    qualityBadge: 'Ahorro máximo',
    reason: 'Usa un solo pasaje y evita el colectivo informal. La 6-18 no entra al Portal Tunal: te bajas en Pq. El Tunal y caminas unos 310 m. El GTFS solo programa tres salidas hábiles desde este paradero: 4:16, 5:06 y 5:46 a. m. No incluye el tiempo para llegar al paradero.',
    mapPath: [...SITP_6_18_PATH, [4.56917, -74.13968]],
    fallbackPath: 'M82 505C180 430 320 310 500 220 650 160 765 105',
    segments: [
      { type: 'sitp', source: 'gtfs_20260818', title: 'Bus SITP Ruta 6-18', detail: 'Ladrillera Los Mochuelos → Pq. El Tunal · 25 min según el GTFS (salida hábil 5:46 a. m.)', time: '25 min', cost: '$3.550 COP' },
      { type: 'walk', title: 'Caminata al Portal Tunal', detail: 'Desde Pq. El Tunal hasta Portal Tunal, unos 310 m en línea recta · 6 min estimados', time: '6 min', cost: '$0 COP' },
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
    arrivalClock: '6:24 a. m.',
    arrivalMinutes: 384,
    duration: '16 min',
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
      { type: 'cable', title: 'Ingreso Estación Mirador del Paraíso', detail: 'Ingreso a estación; condición PMR por confirmar · 3 min estimados', time: '3 min', cost: '$3.550 COP' },
      { type: 'cable', source: 'gtfs_20260818', title: 'Viaje en Cabina TransMiCable', detail: 'Mirador del Paraíso → Portal Tunal · 11 min según el GTFS', time: '11 min', cost: 'Incluido' },
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
    departureClock: '6:03 a. m.',
    arrivalClock: '6:31 a. m.',
    arrivalMinutes: 391,
    duration: '28 min',
    confidence: 85,
    confidenceLabel: 'Horarios GTFS; caminata estimada',
    totalCost: 3550,
    costFormatted: '$3.550 COP',
    costBreakdown: 'Pasaje integrado SITP + TransMiCable ($3.550)',
    paymentMethod: 'Tarjeta TuLlave',
    accessibilityScore: 78,
    accessibilityLabel: 'Verificar acceso en paradero, transbordo y estación',
    qualityBadge: 'Servicios del GTFS',
    reason: 'La 10-12 va de Quiba a IED Paraíso Mirador según el GTFS (salida hábil 6:03 a. m.). Ese paradero queda a unos 350 m de la estación del cable; la caminata es una estimación.',
    mapPath: [...SITP_10_12_PATH, ...CABLE_PATH.slice().reverse()],
    fallbackPath: 'M252 334C300 310 335 286 400 252C510 196 660 145 765 105',
    segments: [
      { type: 'sitp', source: 'gtfs_20260818', title: 'SITP ruta 10-12', detail: 'Quiba → IED Paraíso Mirador · 10 min según el GTFS', time: '10 min', cost: '$3.550 COP' },
      { type: 'walk', title: 'Caminata a la estación Mirador del Paraíso', detail: 'Unos 350 m en línea recta · 7 min estimados', time: '7 min', cost: '$0 COP' },
      { type: 'cable', source: 'gtfs_20260818', title: 'TransMiCable', detail: 'Mirador del Paraíso → Portal Tunal · 11 min según el GTFS', time: '11 min', cost: 'Incluido' },
    ],
  },
};

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

/** Tramos SITP dibujados desde shapes.txt del GTFS 2026-08-18 (solo los usados por el catálogo). */
export const SITP_GTFS_PATHS = [
  { name: 'SITP 6-18 · Ladrillera Los Mochuelos → Pq. El Tunal', coordinates: SITP_6_18_PATH },
  { name: 'SITP 10-12 · Quiba → IED Paraíso Mirador', coordinates: SITP_10_12_PATH },
];

export const POINTS_OF_INTEREST = [
  { name: 'Portal Tunal', detail: 'Terminal troncal TransMilenio y TransMiCable', coordinates: [4.56917, -74.13968], label: 'T', type: 'cable' },
  { name: 'Mirador del Paraíso', detail: 'Estación cumbre TransMiCable y conexión veredal', coordinates: [4.55009985, -74.1588974], label: 'P', type: 'cable' },
  { name: 'Estación Manitas', detail: 'Estación intermedia con cicloparqueadero y colegios', coordinates: [4.55028009, -74.15049744], label: 'M', type: 'cable' },
  { name: 'Estación Juan Pablo II', detail: 'Acceso a San Francisco y Meissen', coordinates: [4.55578995, -74.1473999], label: 'J', type: 'cable' },
  { name: 'Quiba Bajo', detail: 'Paradero principal de camperos veredales', coordinates: [4.54274724, -74.17018404], label: 'Q', type: 'informal' },
  { name: 'Mochuelo Alto', detail: 'Cabecera veredal sur de Ciudad Bolívar', coordinates: [4.4883574, -74.148341], label: 'M', type: 'informal' },
  { name: 'Ladrillera Los Mochuelos (Mochuelo Bajo)', detail: 'Paradero SITP de la ruta 6-18 según el GTFS 2026-08-18', coordinates: [4.52244966, -74.14258729], label: 'B', type: 'sitp' },
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
