import * as THREE from "three";
export function roundedRectShape(width, height, radius) {
  const w = width / 2;
  const h = height / 2;
  const r = Math.min(radius, w, h);
  const s = new THREE.Shape();
  s.moveTo(-w + r, -h);
  s.lineTo(w - r, -h);
  s.quadraticCurveTo(w, -h, w, -h + r);
  s.lineTo(w, h - r);
  s.quadraticCurveTo(w, h, w - r, h);
  s.lineTo(-w + r, h);
  s.quadraticCurveTo(-w, h, -w, h - r);
  s.lineTo(-w, -h + r);
  s.quadraticCurveTo(-w, -h, -w + r, -h);
  return s;
}
export function blobShape(rx, rz, seed = 1, wobble = 0.12, steps = 48) {
  const s = new THREE.Shape();
  for (let i = 0; i <= steps; i++) {
    const a = i / steps * Math.PI * 2;
    const k = 1 + Math.sin(a * 3 + seed) * wobble * 0.6 + Math.sin(a * 5 - seed * 1.7) * wobble * 0.4;
    const x = Math.cos(a) * rx * k;
    const y = Math.sin(a) * rz * k;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}
export function roundedSlab(width, depth, radius, thickness, bevel = 0.06) {
  const bevelSize = Math.min(bevel, thickness * 0.4, radius * 0.45);
  const shape = roundedRectShape(width - bevelSize * 2, depth - bevelSize * 2, Math.max(0.01, radius - bevelSize));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(1e-3, thickness - bevelSize * 2),
    bevelEnabled: bevelSize > 0,
    bevelThickness: bevelSize,
    bevelSize,
    bevelSegments: 3,
    curveSegments: 14
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeBoundingBox();
  geo.translate(0, -(geo.boundingBox?.max.y ?? 0), 0);
  geo.computeVertexNormals();
  return geo;
}
export function roundedSlabTop(width, depth, radius, topY, bevel = 0.05) {
  const shape = roundedRectShape(width - bevel * 2, depth - bevel * 2, Math.max(0.01, radius - bevel));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, topY - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel * 0.4,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 12
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeBoundingBox();
  geo.translate(0, topY - (geo.boundingBox?.max.y ?? 0), 0);
  geo.computeVertexNormals();
  return geo;
}
export function blobSlab(rx, rz, seed, thickness, wobble = 0.12) {
  const shape = blobShape(rx, rz, seed, wobble);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.5,
    bevelSize: Math.min(rx, rz) * 0.03,
    bevelSegments: 2,
    curveSegments: 6
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeBoundingBox();
  geo.translate(0, -(geo.boundingBox?.max.y ?? 0), 0);
  geo.computeVertexNormals();
  return geo;
}
export function curveFromPairs(pairs, closed = false, tension = 0.5) {
  const pts = pairs.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(pts, closed, "catmullrom", tension);
  return curve;
}
export function clampToRoundedRect(x, z, b) {
  const ax = Math.max(0, b.halfX - b.radius);
  const az = Math.max(0, b.halfZ - b.radius);
  const cx = Math.min(ax, Math.max(-ax, x));
  const cz = Math.min(az, Math.max(-az, z));
  const dx = x - cx;
  const dz = z - cz;
  const d = Math.hypot(dx, dz);
  if (d <= b.radius) return [x, z];
  const s = b.radius / (d || 1);
  return [cx + dx * s, cz + dz * s];
}
export function ribbonGeometry(curve, opts) {
  const { width, segments = 160, y = 0, closed = false, bounds } = opts;
  const half = width / 2;
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const push = (t) => {
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    const nx = -tan.z;
    const nz = tan.x;
    const l = Math.hypot(nx, nz) || 1;
    const [cx, cz] = bounds ? clampToRoundedRect(p.x, p.z, bounds) : [p.x, p.z];
    const ox = nx / l * half;
    const oz = nz / l * half;
    positions.push(cx + ox, y, cz + oz);
    positions.push(cx - ox, y, cz - oz);
    normals.push(0, 1, 0, 0, 1, 0);
    uvs.push(0, t * 24, 1, t * 24);
  };
  for (let i = 0; i <= segments; i++) push(i / segments);
  if (closed) push(0);
  const ringCount = closed ? segments + 1 : segments;
  for (let i = 0; i < ringCount; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}
export function dashInstances(curve, opts = {}) {
  const { dash = 0.62, gap = 0.5, y = 0, closed = false, bounds } = opts;
  const total = curve.getLength();
  const out = [];
  const step = dash + gap;
  const count = Math.floor(total / step);
  for (let i = 0; i <= count; i++) {
    const d = i * step;
    if (!closed && d > total - 0.05) break;
    const t = d / total;
    const p = curve.getPointAt(THREE.MathUtils.clamp(t, 0, 1));
    const tan = curve.getTangentAt(THREE.MathUtils.clamp(t, 0, 1));
    const [cx, cz] = bounds ? clampToRoundedRect(p.x, p.z, bounds) : [p.x, p.z];
    out.push({
      position: [cx, y, cz],
      rotationY: Math.atan2(tan.x, tan.z)
    });
  }
  return out;
}
export function pointOnCurve(curve, t) {
  const c = THREE.MathUtils.clamp(t, 0, 1);
  const p = curve.getPointAt(c);
  const tan = curve.getTangentAt(c);
  return { position: [p.x, 0, p.z], rotationY: Math.atan2(tan.x, tan.z) };
}
export function pyramidRoof(width, depth, height) {
  const geo = new THREE.ConeGeometry(0.5, height, 4, 1);
  geo.rotateY(Math.PI / 4);
  geo.scale(width * Math.SQRT1_2 * 1.02, 1, depth * Math.SQRT1_2 * 1.02);
  return geo;
}


/* ------------------------------------------------------------------ *
 * Sustitutos de @react-three/drei
 * ------------------------------------------------------------------ */

const boxCache = new Map();

/**
 * Caja con los cantos muy redondeados, centrada en el origen.
 *
 * Reemplaza a `RoundedBox`. Se resuelve con `ExtrudeGeometry` sobre un
 * rectangulo de esquinas redondeadas: el bisel redondea las cuatro aristas del
 * frente y de la espalda, y el radio de la forma redondea las cuatro verticales.
 * Es la misma tecnica que ya usaba `roundedSlab` en esta escena, con la que
 * comparte lectura visual.
 *
 * Sin `drei` no arrastramos la mayor parte de su arbol de dependencias, y la
 * geometria se cachea: las cajas se reutilizan entre buses, edificios y
 * elementos de utileria en lugar de reconstruirse en cada render.
 *
 * @param {number} width  Ancho en X.
 * @param {number} height Alto en Y.
 * @param {number} depth  Fondo en Z.
 * @param {number} radius Radio de redondeo; se recorta para no romper la forma.
 * @param {number} smoothness Segmentos del bisel.
 * @returns {THREE.BufferGeometry}
 */
export function roundedBoxGeometry(width, height, depth, radius = 0.1, smoothness = 2) {
  const r = Math.max(0.001, Math.min(radius, Math.min(width, height, depth) * 0.48));
  const segments = Math.max(1, Math.round(smoothness));
  const key = [width, height, depth, r, segments].map((n) => Number(n).toFixed(4)).join('|');

  const hit = boxCache.get(key);
  if (hit) return hit;

  // El bisel consume `r` en cada lado: el perfil se recorta en esa medida y la
  // extraccion se ajusta para que el resultado mida exactamente el tamano pedido.
  const shape = roundedRectShape(
    Math.max(0.001, width - 2 * r),
    Math.max(0.001, height - 2 * r),
    Math.max(0.001, r),
  );
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, depth - 2 * r),
    bevelEnabled: true,
    bevelThickness: r,
    bevelSize: r,
    bevelOffset: 0,
    bevelSegments: segments,
    curveSegments: Math.max(4, segments * 2),
  });

  // El extrude crece desde z = 0 hacia +Z y el perfil esta centrado en XY:
  // se centra en Z para que la caja quede simetrica.
  geo.translate(0, 0, -(depth - 2 * r) / 2);
  geo.computeVertexNormals();

  boxCache.set(key, geo);
  return geo;
}
