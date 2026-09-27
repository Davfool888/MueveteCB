import * as THREE from "three";
import { COLORS, MATERIAL } from "./palette";
const cache = /* @__PURE__ */ new Map();
export function mat(color, params = {}) {
  const key = `${color}|${JSON.stringify(params)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const m = new THREE.MeshStandardMaterial({ color, ...params });
  cache.set(key, m);
  return m;
}
const SOFT = MATERIAL.soft;
export const MAT = {
  ground: () => mat(COLORS.ground, MATERIAL.ground),
  platform: () => mat(COLORS.platformTop, MATERIAL.platform),
  road: () => mat(COLORS.road, { ...SOFT, side: THREE.DoubleSide }),
  roadLine: () => mat(COLORS.roadLine, { roughness: 0.7, metalness: 0 }),
  curb: () => mat(COLORS.curb, { ...SOFT, side: THREE.DoubleSide }),
  parking: () => mat(COLORS.dirt, { ...SOFT }),
  parkingLine: () => mat(COLORS.white, { roughness: 0.7, metalness: 0 }),
  grass: () => mat(COLORS.grass, SOFT),
  grassLight: () => mat(COLORS.grassLight, SOFT),
  grassDeep: () => mat(COLORS.grassDeep, SOFT),
  leaf: () => mat(COLORS.leaf, SOFT),
  leafLight: () => mat(COLORS.leafLight, SOFT),
  leafDark: () => mat(COLORS.leafDark, SOFT),
  bush: () => mat(COLORS.bush, SOFT),
  moss: () => mat(COLORS.moss, SOFT),
  trunk: () => mat(COLORS.trunk, SOFT),
  cloud: () => mat(COLORS.cloud, { roughness: 1, metalness: 0 }),
  cloudShade: () => mat(COLORS.cloudShade, { roughness: 1, metalness: 0 }),
  /* Arquitectura */
  wall: () => mat(COLORS.wall, MATERIAL.building),
  wallAlt: () => mat(COLORS.wallAlt, MATERIAL.building),
  buildingMint: () => mat(COLORS.buildingMint, MATERIAL.building),
  buildingLavender: () => mat(COLORS.buildingLavender, MATERIAL.building),
  buildingPeach: () => mat(COLORS.buildingPeach, MATERIAL.building),
  buildingButter: () => mat(COLORS.buildingButter, MATERIAL.building),
  buildingSky: () => mat(COLORS.buildingSky, MATERIAL.building),
  roof: () => mat(COLORS.roof, SOFT),
  roofDark: () => mat(COLORS.roofDark, SOFT),
  awning: () => mat(COLORS.awning, SOFT),
  awningLight: () => mat(COLORS.awningLight, SOFT),
  awningStripe: () => mat(COLORS.awningStripe, { roughness: 0.75, metalness: 0 }),
  trim: () => mat(COLORS.creamDark, SOFT),
  /* Vidrios: suave y translucido, sin reflejos duros */
  glass: () => mat(COLORS.glass, { roughness: 0.4, metalness: 0, transparent: true, opacity: 0.7 }),
  glassDark: () => mat(COLORS.glassDark, { roughness: 0.45, metalness: 0, transparent: true, opacity: 0.8 }),
  /* Vehiculos */
  tire: () => mat(COLORS.tire, { roughness: 0.9, metalness: 0 }),
  hub: () => mat(COLORS.hub, { roughness: 0.65, metalness: 0.1 }),
  chrome: () => mat(COLORS.chrome, { roughness: 0.5, metalness: 0.25 }),
  busWhite: () => mat(COLORS.busWhite, MATERIAL.vehicle),
  /* Teleférico */
  steel: () => mat(COLORS.cableSteel, { roughness: 0.6, metalness: 0.2 }),
  tower: () => mat(COLORS.tower, { roughness: 0.7, metalness: 0.1 }),
  cabinShell: () => mat(COLORS.cabinShell, { roughness: 0.6, metalness: 0.04 }),
  cabinFrame: () => mat(COLORS.cabinFrame, { roughness: 0.6, metalness: 0.2 }),
  cabinLilac: () => mat(COLORS.cabinLilac, { roughness: 0.7, metalness: 0.02 }),
  cabinPeach: () => mat(COLORS.cabinPeach, { roughness: 0.7, metalness: 0.02 }),
  cabinMint: () => mat(COLORS.cabinMint, { roughness: 0.7, metalness: 0.02 }),
  cabinButter: () => mat(COLORS.cabinButter, { roughness: 0.7, metalness: 0.02 }),
  /* Utileria */
  stone: () => mat(COLORS.stone, SOFT),
  stoneDark: () => mat(COLORS.stoneDark, SOFT),
  rock: () => mat(COLORS.rock, { ...SOFT, roughness: 0.95 }),
  rockAlt: () => mat(COLORS.rockAlt, { ...SOFT, roughness: 0.95 }),
  rockLight: () => mat(COLORS.rockLight, { ...SOFT, roughness: 0.95 }),
  water: () => mat(COLORS.water, { roughness: 0.22, metalness: 0, transparent: true, opacity: 0.9 }),
  waterDeep: () => mat(COLORS.waterDeep, { roughness: 0.25, metalness: 0, transparent: true, opacity: 0.9 }),
  mushroomCap: () => mat(COLORS.mushroomCap, SOFT),
  mushroomStem: () => mat(COLORS.mushroomStem, SOFT),
  mushroomDot: () => mat(COLORS.mushroomDot, { roughness: 0.7, metalness: 0 }),
  kioskBody: () => mat(COLORS.kioskBody, SOFT),
  kioskRoof: () => mat(COLORS.kioskRoof, SOFT),
  path: () => mat(COLORS.path, SOFT),
  counter: () => mat(COLORS.counter, SOFT),
  crate: () => mat(COLORS.crate, SOFT),
  lamp: () => mat(COLORS.lamp, { roughness: 0.5, metalness: 0, emissive: COLORS.lampGlow, emissiveIntensity: 0.35 }),
  hutPurple: () => mat(COLORS.hutPurple, MATERIAL.building),
  hutBlue: () => mat(COLORS.hutBlue, MATERIAL.building),
  /* Personas */
  skin: () => mat(COLORS.skin, SOFT),
  trousers: () => mat(COLORS.trousers, SOFT)
};
