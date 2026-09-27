import { COLORS } from './palette'

/**
 * Composicion de la maqueta, en coordenadas locales de la plataforma.
 *
 * Ejes (plataforma local, centro en el origen):
 *   +X  -> hacia la derecha-abajo en pantalla  (frente-derecha)
 *   +Z  -> hacia la izquierda-abajo en pantalla (frente-izquierda)
 *   -X  -> fondo-izquierda   |   -Z -> fondo-derecha
 *
 * La camara ortografica mira desde (+X, +Y, +Z) hacia el origen.
 */

/**
 * Losa hinchada: esquinas muy redondeadas y bisel generoso en todos los
 * cantos, para que toda la pieza lea como plastico moldeado.
 */
export const PLATFORM = {
  width: 24,
  depth: 15.5,
  radius: 3.2,
  thickness: 1.05,
  bevel: 0.36,
} as const

export const GROUND_Y = -(PLATFORM.thickness + 0.02)

/**
 * Alturas de las capas de la superficie (Y), de abajo arriba, para evitar
 * z-fighting y que la calzada quede siempre por encima.
 */
export const LAYER = {
  grass: { base: 0.004, thickness: 0.02 },
  parking: { base: 0.004, thickness: 0.022 },
  island: { base: 0.004, thickness: 0.028 },
  plaza: 0.05,
  curb: 0.034,
  road: 0.048,
  dash: 0.056,
  mark: 0.06,
} as const

/* ------------------------------------------------------------------ *
 * Red de calles
 *
 * `LOOP` es un anillo cerrado alrededor de la isla. `WEST` y `EAST` son
 * ramales que lo conectan con los bordes de la plataforma. Las tres se
 * usan tanto como red visible como trajectories de los vehiculos.
 * ------------------------------------------------------------------ */

export const LOOP_ROAD: Array<[number, number]> = [
  [-5.5, 0.4],
  [-4.1, -2.3],
  [-0.5, -3.1],
  [3.1, -2.6],
  [5.3, -0.5],
  [5.1, 1.6],
  [2.8, 2.9],
  [-0.5, 3.0],
  [-3.7, 2.3],
]

export const LEFT_ROAD: Array<[number, number]> = [
  [-5.5, 0.4],
  [-8.0, -0.7],
  [-10.4, -1.6],
  [-12.4, -2.4],
]

export const RIGHT_ROAD: Array<[number, number]> = [
  [5.3, -0.5],
  [8.0, 0.3],
  [10.4, 1.5],
  [12.4, 2.6],
]

export const ROAD_WIDTH = 1.7

/** Limite de la calzada: interior de la plataforma. */
export const ROAD_BOUNDS = {
  halfX: PLATFORM.width / 2 - 0.2,
  halfZ: PLATFORM.depth / 2 - 0.2,
  radius: PLATFORM.radius,
} as const

/* ------------------------------------------------------------------ *
 * Rutas de circulacion
 * ------------------------------------------------------------------ */

/** Anillo del parque: circuito cerrado. */
export const ROUTE_LOOP = LOOP_ROAD

/**
 * Ruta larga: borde izquierdo -> anillo completo -> borde derecho.
 * Es una polilinea abierta: los vehiculos la recorren de ida y vuelta.
 */
export const ROUTE_CIRCUIT: Array<[number, number]> = [
  ...LEFT_ROAD,
  ...LOOP_ROAD,
  ...RIGHT_ROAD,
]

export type RouteName = 'loop' | 'circuit'

/* ------------------------------------------------------------------ *
 * Zonas
 * ------------------------------------------------------------------ */

/** Plaza peatonal bajo los edificios (lado del teleférico). */
export const PLAZA = {
  x: -6.9,
  z: -4.0,
  width: 7.4,
  depth: 4.6,
  radius: 1.3,
  y: LAYER.plaza,
} as const

/** Isla central: parque denso dentro del anillo. */
export const ISLAND = {
  x: -0.1,
  z: -0.05,
  rx: 4.5,
  rz: 2.2,
  y: LAYER.island.base,
} as const

/**
 * Aparcamiento de camperos: losa gris clara con una rejilla de plazas.
 * Las plazas se derivan de este rectangulo, asi que mover el aparcamiento
 * recoloca tambien las lineas y los vehiculos aparcados.
 */
export const PARKING = {
  x: 7.2,
  z: 5.2,
  width: 6.6,
  depth: 3.4,
  radius: 0.8,
  thickness: LAYER.parking.thickness,
  y: LAYER.parking.base,
  /** Plazas: 3 columnas x 2 filas. */
  cols: 3,
  rows: 2,
  /** Orientacion de los vehiculos aparcados. */
  rotationY: Math.PI / 2,
} as const

/**
 * Centros de las plazas de aparcamiento, en orden de fila.
 * Cada plaza mide (width/cols) x (depth/rows).
 */
export function parkingSlots(): Array<[number, number]> {
  const { x, z, width, depth, cols, rows } = PARKING
  const bw = width / cols
  const bd = depth / rows
  const out: Array<[number, number]> = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push([x - width / 2 + (c + 0.5) * bw, z - depth / 2 + (r + 0.5) * bd])
    }
  }
  return out
}

/** Lineas blancas de la rejilla de plazas. */
export function parkingMarks(): Array<{ position: [number, number, number]; size: [number, number] }> {
  const { x, z, width, depth, cols, rows } = PARKING
  const bw = width / cols
  const bd = depth / rows
  const t = 0.06
  const out: Array<{ position: [number, number, number]; size: [number, number] }> = []

  // Separadores horizontales (uno por limite de fila).
  for (let r = 0; r <= rows; r++) {
    out.push({ position: [x, 0, z - depth / 2 + r * bd], size: [width, t] })
  }
  // Separadores verticales.
  for (let c = 0; c <= cols; c++) {
    out.push({ position: [x - width / 2 + c * bw, 0, z], size: [t, depth] })
  }
  return out
}

/** Parches de cesped muy sutiles ( apenas un tono sobre la losa ). */
export const GRASS_PATCHES: Array<{ position: [number, number, number]; rx: number; rz: number; seed: number }> = [
  { position: [-7.2, 0, 2.4], rx: 3.2, rz: 1.4, seed: 0.7 },
  { position: [-1.2, 0, 5.2], rx: 4.4, rz: 1.2, seed: 1.9 },
  { position: [8.6, 0, -3.8], rx: 2.8, rz: 1.5, seed: 3.1 },
  { position: [2.8, 0, -6.0], rx: 2.8, rz: 1.0, seed: 4.4 },
  { position: [-7.8, 0, 6.0], rx: 2.2, rz: 0.9, seed: 5.2 },
  { position: [3.0, 0, 6.6], rx: 2.6, rz: 0.9, seed: 6.3 },
]

/** Setos que ordenan el jardin. */
export const HEDGES: Array<{ position: [number, number, number]; length: number; rotationY: number }> = [
  { position: [6.2, 0, -5.6], length: 2.6, rotationY: 0 },
  { position: [10.0, 0, -1.6], length: 2.0, rotationY: Math.PI / 2 },
  { position: [6.8, 0, -1.0], length: 1.8, rotationY: 0 },
  { position: [2.6, 0, -6.6], length: 2.2, rotationY: 0 },
  { position: [-4.0, 0, 6.6], length: 1.8, rotationY: 0 },
  { position: [2.2, 0, 7.0], length: 1.6, rotationY: 0 },
]

/** Quiosco de jardin. */
export const GAZEBO = {
  position: [8.2, 0, -3.9] as [number, number, number],
  radius: 0.9,
  height: 1.1,
}

/* ------------------------------------------------------------------ *
 * Edificios — volumes hinchados, colores pastel
 * ------------------------------------------------------------------ */

export type BuildingSpec = {
  position: [number, number, number]
  rotationY: number
  width: number
  depth: number
  height: number
  /** Tipo de cubierta hinchada. */
  roof: 'pillow' | 'dome' | 'flat'
  wall: string
  roofColor: string
  awning: boolean
  windows: { rows: number; cols: number }
}

export const BUILDINGS: BuildingSpec[] = [
  {
    position: [-8.6, PLAZA.y, -4.6],
    rotationY: 0.08,
    width: 2.5,
    depth: 1.8,
    height: 1.05,
    roof: 'pillow',
    wall: COLORS.buildingMint,
    roofColor: COLORS.roof,
    awning: true,
    windows: { rows: 1, cols: 3 },
  },
  {
    position: [-6.2, PLAZA.y, -5.4],
    rotationY: -0.12,
    width: 1.9,
    depth: 1.6,
    height: 1.3,
    roof: 'pillow',
    wall: COLORS.buildingPeach,
    roofColor: COLORS.roofDeep,
    awning: false,
    windows: { rows: 2, cols: 2 },
  },
  {
    position: [-10.0, PLAZA.y, -2.9],
    rotationY: 0.5,
    width: 1.9,
    depth: 1.6,
    height: 0.78,
    roof: 'dome',
    wall: COLORS.buildingSky,
    roofColor: COLORS.buildingMint,
    awning: true,
    windows: { rows: 1, cols: 2 },
  },
  {
    position: [-4.3, PLAZA.y, -3.0],
    rotationY: 0.26,
    width: 1.2,
    depth: 1.1,
    height: 0.68,
    roof: 'dome',
    wall: COLORS.buildingLavender,
    roofColor: COLORS.roof,
    awning: false,
    windows: { rows: 1, cols: 1 },
  },
  {
    position: [-10.4, PLAZA.y, -5.6],
    rotationY: -0.22,
    width: 1.7,
    depth: 1.5,
    height: 0.88,
    roof: 'pillow',
    wall: COLORS.buildingButter,
    roofColor: COLORS.roof,
    awning: false,
    windows: { rows: 1, cols: 2 },
  },
  {
    position: [-4.6, 0, -6.8],
    rotationY: 0.32,
    width: 1.7,
    depth: 1.5,
    height: 0.88,
    roof: 'dome',
    wall: COLORS.buildingMint,
    roofColor: COLORS.roofDark,
    awning: false,
    windows: { rows: 1, cols: 2 },
  },
  {
    position: [-7.8, 0, -6.9],
    rotationY: -0.18,
    width: 1.4,
    depth: 1.3,
    height: 0.72,
    roof: 'dome',
    wall: COLORS.buildingLavender,
    roofColor: COLORS.buildingSky,
    awning: false,
    windows: { rows: 1, cols: 1 },
  },
]

/** Puestos de mercado con toldo a rayas. */
export const STALLS: Array<{
  position: [number, number, number]
  rotationY: number
  color: string
  width: number
}> = [
  { position: [-8.4, 0, -2.3], rotationY: 0.16, color: COLORS.personRed, width: 0.95 },
  { position: [-7.0, 0, -2.0], rotationY: 0.08, color: COLORS.buildingSky, width: 0.85 },
  { position: [-5.6, 0, -2.2], rotationY: 0.24, color: COLORS.buildingButter, width: 0.95 },
  { position: [-4.3, 0, -2.5], rotationY: 0.32, color: COLORS.buildingLavender, width: 0.8 },
]

/** Farolas. */
export const LAMPS: Array<[number, number, number]> = [
  [-4.6, 0, -1.1],
  [-1.0, 0, -3.6],
  [4.0, 0, -3.2],
  [5.4, 0, 2.0],
  [-5.6, 0, 4.0],
  [-10.2, 0, -0.9],
  [11.4, 0, 2.4],
]

/* ------------------------------------------------------------------ *
 * Teleférico (TransMiCable)
 * ------------------------------------------------------------------ */

export const CABLE_SAG = 0.3

export const CABLE_TOWERS = [
  { position: [-11.2, 0, -1.2] as [number, number, number], height: 2.5 },
  { position: [-8.6, 0, -3.1] as [number, number, number], height: 3.3 },
  { position: [-6.0, 0, -5.0] as [number, number, number], height: 3.4 },
  { position: [-3.4, 0, -6.8] as [number, number, number], height: 3.1 },
  { position: [-0.8, 0, -8.4] as [number, number, number], height: 2.4 },
]

export const STATION = {
  position: [-10.4, 0, -0.2] as [number, number, number],
  rotationY: 0.3,
  width: 2.7,
  depth: 1.7,
  height: 1.1,
}

/** Cabinas colgadas: t = posicion a lo largo del cable. */
export const CABINS = [0.12, 0.3, 0.48, 0.66, 0.84]
export const CABIN_COLORS = [
  COLORS.cabinLilac,
  COLORS.cabinPeach,
  COLORS.cabinMint,
  COLORS.cabinButter,
  COLORS.cabinLilac,
]

/* ------------------------------------------------------------------ *
 * Vehiculos
 * ------------------------------------------------------------------ */

export type VehicleSpec = {
  kind: 'bus' | 'camper'
  /**
   * Vehiculos en movimiento: circulan por una ruta siguiendo la calzada.
   * Los que no lo llevan se quedan quietos en una plaza de aparcamiento.
   */
  moving?: boolean
  route?: RouteName
  /** Posicion inicial en la ruta (0..1, en distancia de arco). */
  t?: number
  /** Sentido de la marcha en las rutas abiertas. */
  dir?: 1 | -1
  /** Velocidad en unidades de mundo por segundo. */
  speed?: number
  /** Plaza de aparcamiento (indice de `parkingSlots()`). */
  slot?: number
  color: string
  /** Variante de carrocería del camper. */
  trim?: string
  scale?: number
}

export const VEHICLES: VehicleSpec[] = [
  /* --- Buses: 2 en circulation por la ruta larga, 2 por el anillo --- */
  {
    kind: 'bus',
    moving: true,
    route: 'circuit',
    t: 0.08,
    dir: 1,
    speed: 1.15,
    color: COLORS.busWhite,
    trim: COLORS.busPink,
  },
  {
    kind: 'bus',
    moving: true,
    route: 'circuit',
    t: 0.62,
    dir: -1,
    speed: 1.0,
    color: COLORS.busBlue,
  },
  {
    kind: 'bus',
    moving: true,
    route: 'loop',
    t: 0.15,
    dir: 1,
    speed: 1.25,
    color: COLORS.busWhite,
    trim: COLORS.busButter,
  },
  {
    kind: 'bus',
    moving: true,
    route: 'loop',
    t: 0.7,
    dir: 1,
    speed: 1.1,
    color: COLORS.busButter,
  },

  /* --- Camperos en circulation --- */
  {
    kind: 'camper',
    moving: true,
    route: 'circuit',
    t: 0.3,
    dir: 1,
    speed: 0.9,
    color: COLORS.jeepOlive,
    trim: COLORS.jeepCream,
  },
  {
    kind: 'camper',
    moving: true,
    route: 'circuit',
    t: 0.78,
    dir: -1,
    speed: 0.95,
    color: COLORS.jeepRust,
    trim: COLORS.jeepCream,
  },
  {
    kind: 'camper',
    moving: true,
    route: 'loop',
    t: 0.42,
    dir: 1,
    speed: 1.0,
    color: COLORS.jeepSage,
    trim: COLORS.jeepGreen,
  },

  /* --- Camperos aparcados y quietos (la mitad de la flota) --- */
  { kind: 'camper', slot: 0, color: COLORS.jeepOlive, trim: COLORS.jeepCream },
  { kind: 'camper', slot: 1, color: COLORS.jeepSage },
  { kind: 'camper', slot: 2, color: COLORS.jeepRust, trim: COLORS.jeepCream },
  { kind: 'camper', slot: 3, color: COLORS.jeepCream, trim: COLORS.jeepOlive },
  { kind: 'camper', slot: 4, color: COLORS.jeepGreen },
  { kind: 'camper', slot: 5, color: COLORS.jeepSage, trim: COLORS.jeepOlive },
]

/* ------------------------------------------------------------------ *
 * Vegetacion
 * ------------------------------------------------------------------ */

export type TreeSpec = {
  position: [number, number, number]
  scale: number
  hue: 0 | 1 | 2
  shape: 'round' | 'cone'
}

export const TREES: TreeSpec[] = [
  // Isla central
  { position: [-2.2, 0, -0.4], scale: 0.95, hue: 0, shape: 'round' },
  { position: [-1.1, 0, 0.6], scale: 0.78, hue: 1, shape: 'round' },
  { position: [0.3, 0, -0.3], scale: 1.05, hue: 0, shape: 'round' },
  { position: [1.7, 0, 0.8], scale: 0.85, hue: 1, shape: 'round' },
  { position: [-0.2, 0, 1.6], scale: 0.7, hue: 2, shape: 'round' },
  { position: [2.8, 0, -0.6], scale: 0.9, hue: 0, shape: 'round' },
  { position: [-3.2, 0, 1.3], scale: 0.66, hue: 1, shape: 'round' },
  { position: [1.8, 0, -1.5], scale: 0.62, hue: 2, shape: 'round' },
  { position: [-1.6, 0, 1.3], scale: 0.58, hue: 0, shape: 'round' },
  { position: [2.4, 0, 1.5], scale: 0.54, hue: 1, shape: 'round' },
  // Alrededor de la plaza / teleférico
  { position: [-6.0, 0, -1.7], scale: 1.0, hue: 0, shape: 'round' },
  { position: [-8.8, 0, -5.8], scale: 0.85, hue: 1, shape: 'round' },
  { position: [-2.4, 0, -4.2], scale: 0.74, hue: 2, shape: 'round' },
  { position: [-10.6, 0, -5.4], scale: 0.95, hue: 0, shape: 'round' },
  { position: [-1.0, 0, -6.4], scale: 0.8, hue: 1, shape: 'round' },
  // Jardin derecho
  { position: [5.8, 0, -3.0], scale: 0.88, hue: 0, shape: 'round' },
  { position: [6.8, 0, -5.2], scale: 0.74, hue: 2, shape: 'round' },
  { position: [9.8, 0, -5.0], scale: 0.9, hue: 1, shape: 'round' },
  { position: [10.4, 0, -3.0], scale: 0.66, hue: 0, shape: 'round' },
  { position: [5.6, 0, -6.4], scale: 0.8, hue: 1, shape: 'round' },
  { position: [9.2, 0, -6.4], scale: 0.62, hue: 2, shape: 'round' },
  { position: [4.0, 0, -4.6], scale: 0.84, hue: 0, shape: 'round' },
  // Borde delantero
  { position: [-9.6, 0, 4.8], scale: 0.9, hue: 0, shape: 'round' },
  { position: [-1.4, 0, 6.0], scale: 0.68, hue: 1, shape: 'round' },
  { position: [-6.6, 0, 5.2], scale: 0.76, hue: 2, shape: 'round' },
  { position: [2.8, 0, 6.2], scale: 0.82, hue: 0, shape: 'round' },
  { position: [-10.8, 0, 0.8], scale: 0.64, hue: 1, shape: 'round' },
  { position: [0.4, 0, -1.2], scale: 0.58, hue: 1, shape: 'round' },
  { position: [-7.4, 0, 1.2], scale: 0.58, hue: 2, shape: 'round' },
  { position: [11.2, 0, 0.8], scale: 0.84, hue: 1, shape: 'round' },
]

/** Arbustos: muy abundantes,son el volumen principal del parque. */
export const BUSHES: Array<[number, number, number]> = [
  // Isla
  [-2.6, 0, 0.9],
  [-1.8, 0, -1.1],
  [0.7, 0, 1.0],
  [2.2, 0, -1.2],
  [-3.0, 0, -0.8],
  [1.2, 0, 1.5],
  [-0.6, 0, -1.5],
  [2.9, 0, 0.4],
  [-2.0, 0, 1.5],
  [0.9, 0, -1.7],
  [-3.3, 0, 0.3],
  [1.9, 0, 0.1],
  [-0.2, 0, 0.4],
  [3.2, 0, 1.3],
  [-1.5, 0, -0.2],
  // Plaza y teleférico
  [-6.6, 0, -4.6],
  [-3.0, 0, -5.2],
  [-9.4, 0, -1.8],
  [-2.0, 0, -6.6],
  [-8.0, 0, -2.6],
  [-5.0, 0, -2.0],
  // Jardin derecho
  [6.0, 0, -2.4],
  [7.6, 0, -4.4],
  [9.4, 0, -2.2],
  [5.2, 0, -5.0],
  [8.4, 0, -5.8],
  [10.6, 0, -4.2],
  [6.6, 0, -6.2],
  [4.6, 0, -3.4],
  [9.0, 0, -1.4],
  // Borde delantero
  [-8.4, 0, 2.8],
  [-5.0, 0, 6.2],
  [-0.4, 0, 6.4],
  [2.0, 0, 6.8],
  [-10.6, 0, 2.4],
  [1.2, 0, 6.6],
  [-7.0, 0, 4.4],
  [4.4, 0, 2.2],
  [11.4, 0, 4.8],
  [2.6, 0, 5.0],
]

/** Rocas organicas, a menudo con musgo. */
export const ROCKS: Array<{ position: [number, number, number]; scale: number; moss: boolean }> = [
  { position: [-2.7, 0, 1.0], scale: 0.16, moss: true },
  { position: [2.7, 0, 0.2], scale: 0.13, moss: false },
  { position: [-0.8, 0, -1.5], scale: 0.11, moss: true },
  { position: [3.2, 0, 1.9], scale: 0.15, moss: false },
  { position: [-4.8, 0, 3.2], scale: 0.14, moss: true },
  { position: [6.6, 0, 2.6], scale: 0.12, moss: false },
  { position: [-9.8, 0, 1.7], scale: 0.15, moss: true },
  { position: [8.4, 0, 3.2], scale: 0.13, moss: false },
  { position: [-4.2, 0, -6.2], scale: 0.14, moss: true },
  { position: [2.0, 0, 4.6], scale: 0.12, moss: false },
  { position: [-8.8, 0, 4.0], scale: 0.16, moss: true },
  { position: [2.4, 0, 6.9], scale: 0.13, moss: false },
  { position: [1.2, 0, 1.7], scale: 0.1, moss: true },
  { position: [-1.8, 0, 1.9], scale: 0.11, moss: false },
  { position: [7.2, 0, -1.6], scale: 0.12, moss: true },
  { position: [-11.0, 0, -3.6], scale: 0.14, moss: true },
]

/** Briznas de cesped. */
export const GRASS_TUFTS: Array<[number, number, number]> = [
  [-4.2, 0, 4.0],
  [-2.0, 0, 6.4],
  [0.8, 0, 4.4],
  [3.4, 0, 5.4],
  [11.8, 0, 6.8],
  [-8.0, 0, 3.0],
  [-9.8, 0, 2.4],
  [-5.8, 0, 6.4],
  [1.8, 0, -6.4],
  [-1.4, 0, -4.8],
  [4.0, 0, -3.2],
  [-4.6, 0, -0.4],
  [11.4, 0, 6.4],
  [11.0, 0, 3.2],
  [-10.6, 0, 6.0],
  [6.4, 0, -6.2],
  [6.8, 0, -3.8],
  [9.8, 0, -4.4],
  [5.4, 0, -3.2],
  [2.2, 0, -6.6],
  [-9.2, 0, 0.6],
  [4.2, 0, 7.0],
]

/* ------------------------------------------------------------------ *
 * Isla central: parque
 * ------------------------------------------------------------------ */

/** Estanque irregular. */
export const POND = {
  position: [1.9, 0, 1.3] as [number, number, number],
  rx: 1.35,
  rz: 0.85,
}

/** Champiñones: uno grande protagonista y varios pequeños. */
export const MUSHROOMS: Array<{
  position: [number, number, number]
  scale: number
  cap: string
}> = [
  { position: [0.7, 0, 1.0], scale: 1.0, cap: COLORS.mushroomCap },
  { position: [-0.7, 0, 1.7], scale: 0.5, cap: COLORS.mushroomCap },
  { position: [2.9, 0, 1.9], scale: 0.42, cap: COLORS.buildingButter },
  { position: [-2.9, 0, 1.9], scale: 0.38, cap: COLORS.buildingLavender },
  { position: [3.4, 0, 0.4], scale: 0.34, cap: COLORS.mushroomCap },
]

/** Kiosco. */
export const KIOSK = {
  position: [-1.5, 0, -0.9] as [number, number, number],
  rotationY: 0.5,
}

/** Bancos de la isla y la plaza. */
export const BENCHES: Array<[number, number, number, number]> = [
  [-3.6, 0, -2.5, 0.5],
  [1.0, 0, 2.4, 1.9],
  [-2.4, 0, 2.1, 0.2],
  [-6.0, 0, -2.2, 2.4],
  [4.4, 0, 1.0, 0.9],
  [3.6, 0, -2.6, -0.4],
]

/** Casetas de color junto a la estacion. */
export const HUTS: Array<{ position: [number, number, number]; color: string; rotationY: number }> = [
  { position: [-1.6, 0, -5.8], color: COLORS.hutPurple, rotationY: -0.3 },
  { position: [-0.4, 0, -6.2], color: COLORS.hutBlue, rotationY: -0.18 },
]

/* ------------------------------------------------------------------ *
 * Personas
 * ------------------------------------------------------------------ */

export const PEOPLE: Array<{
  position: [number, number, number]
  color: string
  rotationY: number
  scale: number
}> = [
  { position: [-8.8, 0, -2.4], color: COLORS.personRed, rotationY: 0.4, scale: 1 },
  { position: [-8.1, 0, -2.0], color: COLORS.personBlue, rotationY: 1.2, scale: 0.95 },
  { position: [-7.0, 0, -2.2], color: COLORS.personYellow, rotationY: 2.1, scale: 1.05 },
  { position: [-10.2, 0, -1.4], color: COLORS.personPurple, rotationY: 0.9, scale: 0.9 },
  { position: [-5.6, 0, -1.8], color: COLORS.personGreen, rotationY: 2.7, scale: 1 },
  { position: [-4.4, 0, -2.9], color: COLORS.personRust, rotationY: 0.2, scale: 0.92 },
  { position: [-10.8, 0, 0.8], color: COLORS.personBlue, rotationY: 1.7, scale: 1 },
  { position: [-4.2, 0, 4.2], color: COLORS.personRed, rotationY: 2.4, scale: 0.95 },
  { position: [2.8, 0, 3.6], color: COLORS.personYellow, rotationY: 0.6, scale: 1 },
  { position: [8.8, 0, 1.0], color: COLORS.personPurple, rotationY: 1.1, scale: 0.92 },
  { position: [5.6, 0, 0.1], color: COLORS.personGreen, rotationY: 2.9, scale: 1.05 },
  { position: [-0.8, 0, 4.0], color: COLORS.personBlue, rotationY: 1.4, scale: 0.9 },
  { position: [-7.4, 0, -1.3], color: COLORS.personYellow, rotationY: 0.6, scale: 1 },
  { position: [-6.3, 0, -1.0], color: COLORS.personRed, rotationY: 2.2, scale: 0.88 },
  { position: [-4.0, 0, -1.2], color: COLORS.personGreen, rotationY: 1.5, scale: 1.02 },
  { position: [-3.0, 0, -1.6], color: COLORS.personPurple, rotationY: 0.3, scale: 0.93 },
  { position: [-9.6, 0, -4.0], color: COLORS.personBlue, rotationY: 2.7, scale: 0.96 },
  { position: [-8.8, 0, -4.5], color: COLORS.personRust, rotationY: 1.1, scale: 1.04 },
  { position: [-0.5, 0, -1.7], color: COLORS.personRed, rotationY: 0.8, scale: 0.92 },
  { position: [2.1, 0, 0.1], color: COLORS.personBlue, rotationY: 2.3, scale: 0.98 },
  { position: [-2.0, 0, 2.0], color: COLORS.personYellow, rotationY: 1.9, scale: 0.9 },
  { position: [1.0, 0, 2.4], color: COLORS.personGreen, rotationY: 0.3, scale: 1 },
  { position: [6.2, 0, 3.0], color: COLORS.personPurple, rotationY: 2.0, scale: 0.94 },
  { position: [11.8, 0, 6.6], color: COLORS.personRed, rotationY: 0.7, scale: 1.02 },
  { position: [2.6, 0, 4.0], color: COLORS.personBlue, rotationY: 1.6, scale: 0.9 },
  { position: [-6.4, 0, 3.2], color: COLORS.personGreen, rotationY: 2.5, scale: 0.96 },
  { position: [-2.8, 0, 3.8], color: COLORS.personYellow, rotationY: 1.3, scale: 1 },
  { position: [1.8, 0, 4.4], color: COLORS.personRust, rotationY: 0.4, scale: 0.92 },
  { position: [4.8, 0, -1.8], color: COLORS.personPurple, rotationY: 2.2, scale: 0.98 },
  { position: [7.0, 0, -2.4], color: COLORS.personRed, rotationY: 1.8, scale: 0.96 },
]

/* ------------------------------------------------------------------ *
 * Texto integrado en la maqueta
 * ------------------------------------------------------------------ */

export const TERRITORY_TEXT = {
  line1: 'Tu camino,',
  line2: 'sin adivinar.',
  /** Ancho objetivo de la linea mas larga, en unidades de mundo. */
  width: 12.6,
  /** La linea 1 va levemente mas pequena para que ambas casen casi igual. */
  line1Scale: 0.96,
  /** Separacion entre lineas. */
  lineGap: 0.28,
  x: -3.4,
  z: 5.7,
  rotationY: 0,
  y: LAYER.grass.base + LAYER.grass.thickness - 0.01,
  font: '/fonts/baloo2.typeface.json',
  /** Bisel generoso: letras hinchadas. */
  bevelSize: 0.05,
  depth: 0.2,
} as const

/* ------------------------------------------------------------------ *
 * Elementos ambientales
 *
 * Las posiciones se eligieron proyectandolas a pantalla con la camara
 * actual, para que las nubes encuadren la maqueta sin taparla.
 * ------------------------------------------------------------------ */

export const CLOUDS: Array<{
  position: [number, number, number]
  scale: number
  detail: number
  drift: number
}> = [
  { position: [-19.0, 3.2, 2.4], scale: 1.7, detail: 7, drift: 0.05 },
  { position: [2.4, 4.0, -18.8], scale: 1.5, detail: 7, drift: 0.042 },
  { position: [-2.1, 1.0, 19.1], scale: 1.25, detail: 6, drift: 0.058 },
  { position: [19.3, 1.2, -1.9], scale: 1.35, detail: 6, drift: 0.046 },
  { position: [-7.0, 6.0, -15.5], scale: 0.85, detail: 5, drift: 0.07 },
]

/* ------------------------------------------------------------------ *
 * Camara
 * ------------------------------------------------------------------ */

export const CAMERA = {
  position: [30, 28, 30] as [number, number, number],
  target: [0, 0.4, 0] as [number, number, number],
  /** Fraccion del viewport que ocupa el contenido. */
  fill: 0.95,
  /** Margen de la caja de encuadre alrededor de la plataforma. */
  margin: 1.2,
}

/** Caja que debe quedar dentro del encuadre. */
export const FRAME_BOX = {
  min: [
    -(PLATFORM.width / 2 + CAMERA.margin),
    GROUND_Y,
    -(PLATFORM.depth / 2 + CAMERA.margin),
  ] as [number, number, number],
  max: [
    PLATFORM.width / 2 + CAMERA.margin,
    2.2,
    PLATFORM.depth / 2 + CAMERA.margin,
  ] as [number, number, number],
}
