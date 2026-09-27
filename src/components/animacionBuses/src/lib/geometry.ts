import * as THREE from 'three'

/* ------------------------------------------------------------------ *
 * Formas 2D -> 3D
 * ------------------------------------------------------------------ */

/** Rectangulo con esquinas redondeadas como THREE.Shape (para extrude). */
export function roundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const w = width / 2
  const h = height / 2
  const r = Math.min(radius, w, h)
  const s = new THREE.Shape()
  s.moveTo(-w + r, -h)
  s.lineTo(w - r, -h)
  s.quadraticCurveTo(w, -h, w, -h + r)
  s.lineTo(w, h - r)
  s.quadraticCurveTo(w, h, w - r, h)
  s.lineTo(-w + r, h)
  s.quadraticCurveTo(-w, h, -w, h - r)
  s.lineTo(-w, -h + r)
  s.quadraticCurveTo(-w, -h, -w + r, -h)
  return s
}

/** Elipse irregular (blob organico) como THREE.Shape. */
export function blobShape(rx: number, rz: number, seed = 1, wobble = 0.12, steps = 48): THREE.Shape {
  const s = new THREE.Shape()
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2
    const k = 1 + Math.sin(a * 3 + seed) * wobble * 0.6 + Math.sin(a * 5 - seed * 1.7) * wobble * 0.4
    const x = Math.cos(a) * rx * k
    const y = Math.sin(a) * rz * k
    if (i === 0) s.moveTo(x, y)
    else s.lineTo(x, y)
  }
  s.closePath()
  return s
}

/**
 * Slab horizontal (rectangulo redondeado extruido hacia arriba) con bevel.
 * Devuelve la geometria con la cara superior en `y = 0`.
 */
export function roundedSlab(
  width: number,
  depth: number,
  radius: number,
  thickness: number,
  bevel = 0.06,
): THREE.BufferGeometry {
  const bevelSize = Math.min(bevel, thickness * 0.4, radius * 0.45)
  const shape = roundedRectShape(width - bevelSize * 2, depth - bevelSize * 2, Math.max(0.01, radius - bevelSize))
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, thickness - bevelSize * 2),
    bevelEnabled: bevelSize > 0,
    bevelThickness: bevelSize,
    bevelSize,
    bevelSegments: 3,
    curveSegments: 14,
  })
  geo.rotateX(-Math.PI / 2)
  geo.computeBoundingBox()
  // dejar la cara superior exactamente en y = 0
  geo.translate(0, -(geo.boundingBox?.max.y ?? 0), 0)
  geo.computeVertexNormals()
  return geo
}

/**
 * Losa rectangular con esquinas redondeadas cuya cara superior queda en
 * `topY`. Se usa para plazas y aceras a media altura.
 */
export function roundedSlabTop(
  width: number,
  depth: number,
  radius: number,
  topY: number,
  bevel = 0.05,
): THREE.BufferGeometry {
  const shape = roundedRectShape(width - bevel * 2, depth - bevel * 2, Math.max(0.01, radius - bevel))
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, topY - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel * 0.4,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 12,
  })
  geo.rotateX(-Math.PI / 2)
  geo.computeBoundingBox()
  geo.translate(0, topY - (geo.boundingBox?.max.y ?? 0), 0)
  geo.computeVertexNormals()
  return geo
}

/** Slab organico (blob) horizontal, usado para zonas de tierra y cesped. */
export function blobSlab(
  rx: number,
  rz: number,
  seed: number,
  thickness: number,
  wobble = 0.12,
): THREE.BufferGeometry {
  const shape = blobShape(rx, rz, seed, wobble)
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.5,
    bevelSize: Math.min(rx, rz) * 0.03,
    bevelSegments: 2,
    curveSegments: 6,
  })
  geo.rotateX(-Math.PI / 2)
  geo.computeBoundingBox()
  geo.translate(0, -(geo.boundingBox?.max.y ?? 0), 0)
  geo.computeVertexNormals()
  return geo
}

/* ------------------------------------------------------------------ *
 * Calles
 * ------------------------------------------------------------------ */

/** Crea una curva Catmull-Rom a partir de pares [x, z]. */
export function curveFromPairs(pairs: Array<[number, number]>, closed = false, tension = 0.5) {
  const pts = pairs.map(([x, z]) => new THREE.Vector3(x, 0, z))
  const curve = new THREE.CatmullRomCurve3(pts, closed, 'catmullrom', tension)
  return curve
}

export type RibbonOptions = {
  width: number
  segments?: number
  y?: number
  closed?: boolean
  /** Limita la calzada al interior de la plataforma. */
  bounds?: RoundedBounds
}

/** Rectangulo redondeado en el plano XZ, usado como limite. */
export type RoundedBounds = {
  halfX: number
  halfZ: number
  radius: number
}

/**
 * Proyecta un punto (x, z) sobre el borde de un rectangulo redondeado.
 * Si ya esta dentro, no lo mueve.
 */
export function clampToRoundedRect(x: number, z: number, b: RoundedBounds): [number, number] {
  const ax = Math.max(0, b.halfX - b.radius)
  const az = Math.max(0, b.halfZ - b.radius)
  const cx = Math.min(ax, Math.max(-ax, x))
  const cz = Math.min(az, Math.max(-az, z))
  const dx = x - cx
  const dz = z - cz
  const d = Math.hypot(dx, dz)
  if (d <= b.radius) return [x, z]
  const s = b.radius / (d || 1)
  return [cx + dx * s, cz + dz * s]
}

/**
 * Geometria de cinta (calle) a lo largo de una curva, plana en el eje Y.
 * El punto central se recorta contra `bounds` para que la calzada nunca
 * sobresalga de la plataforma, conservando el ancho de la via.
 * Los normales se fuerzan hacia +Y para evitar problemas de winding.
 */
export function ribbonGeometry(curve: THREE.Curve<THREE.Vector3>, opts: RibbonOptions): THREE.BufferGeometry {
  const { width, segments = 160, y = 0, closed = false, bounds } = opts
  const half = width / 2
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  const push = (t: number) => {
    const p = curve.getPointAt(t)
    const tan = curve.getTangentAt(t)
    const nx = -tan.z
    const nz = tan.x
    const l = Math.hypot(nx, nz) || 1

    // Centro de la via recortado contra la plataforma.
    const [cx, cz] = bounds
      ? clampToRoundedRect(p.x, p.z, bounds)
      : [p.x, p.z]

    const ox = (nx / l) * half
    const oz = (nz / l) * half
    positions.push(cx + ox, y, cz + oz)
    positions.push(cx - ox, y, cz - oz)
    normals.push(0, 1, 0, 0, 1, 0)
    uvs.push(0, t * 24, 1, t * 24)
  }

  for (let i = 0; i <= segments; i++) push(i / segments)
  if (closed) push(0)

  const ringCount = closed ? segments + 1 : segments
  for (let i = 0; i < ringCount; i++) {
    const a = i * 2
    const b = a + 1
    const c = a + 2
    const d = a + 3
    indices.push(a, c, b, b, c, d)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  return geo
}

export type DashInstance = {
  position: [number, number, number]
  rotationY: number
}

/** Instancias de la linea discontinua central a lo largo de una curva. */
export function dashInstances(
  curve: THREE.Curve<THREE.Vector3>,
  opts: { dash?: number; gap?: number; y?: number; closed?: boolean; bounds?: RoundedBounds } = {},
): DashInstance[] {
  const { dash = 0.62, gap = 0.5, y = 0, closed = false, bounds } = opts
  const total = curve.getLength()
  const out: DashInstance[] = []
  const step = dash + gap
  const count = Math.floor(total / step)
  for (let i = 0; i <= count; i++) {
    const d = i * step
    if (!closed && d > total - 0.05) break
    const t = d / total
    const p = curve.getPointAt(THREE.MathUtils.clamp(t, 0, 1))
    const tan = curve.getTangentAt(THREE.MathUtils.clamp(t, 0, 1))
    const [cx, cz] = bounds ? clampToRoundedRect(p.x, p.z, bounds) : [p.x, p.z]
    out.push({
      position: [cx, y, cz],
      rotationY: Math.atan2(tan.x, tan.z),
    })
  }
  return out
}

/** Punto + direccion sobre una curva, para colocar vehiculos alineados. */
export function pointOnCurve(
  curve: THREE.Curve<THREE.Vector3>,
  t: number,
): { position: [number, number, number]; rotationY: number } {
  const c = THREE.MathUtils.clamp(t, 0, 1)
  const p = curve.getPointAt(c)
  const tan = curve.getTangentAt(c)
  return { position: [p.x, 0, p.z], rotationY: Math.atan2(tan.x, tan.z) }
}

/* ------------------------------------------------------------------ *
 * Formas auxiliar
 * ------------------------------------------------------------------ */

/** Cono de 4 lados -> tejado a dos aguas / hipital simplificado. */
export function pyramidRoof(width: number, depth: number, height: number): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(0.5, height, 4, 1)
  geo.rotateY(Math.PI / 4)
  geo.scale(width * Math.SQRT1_2 * 1.02, 1, depth * Math.SQRT1_2 * 1.02)
  return geo
}
