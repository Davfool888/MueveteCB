import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { COLORS } from '../../lib/palette'
import { MAT } from '../../lib/materials'
import {
  LOOP_ROAD,
  LEFT_ROAD,
  RIGHT_ROAD,
  ROAD_WIDTH,
  ROAD_BOUNDS,
  ISLAND,
  PLAZA,
  LAYER,
} from '../../lib/layout'
import {
  curveFromPairs,
  ribbonGeometry,
  dashInstances,
  blobSlab,
  roundedSlabTop,
  type DashInstance,
} from '../../lib/geometry'

/**
 * Red de calles: geometria real generada a partir de curvas.
 * Gris lavanda muy claro con linea central blanca, como en la referencia.
 * Todas las cintas se recortan contra el borde de la plataforma.
 */
export function Roads() {
  const loop = useMemo(() => curveFromPairs(LOOP_ROAD, true), [])
  const left = useMemo(() => curveFromPairs(LEFT_ROAD, false), [])
  const right = useMemo(() => curveFromPairs(RIGHT_ROAD, false), [])

  const curbs = useMemo(
    () => ({
      loop: ribbonGeometry(loop, { width: ROAD_WIDTH + 0.66, segments: 220, y: LAYER.curb, closed: true }),
      left: ribbonGeometry(left, { width: ROAD_WIDTH + 0.66, segments: 90, y: LAYER.curb, bounds: ROAD_BOUNDS }),
      right: ribbonGeometry(right, {
        width: ROAD_WIDTH + 0.66,
        segments: 90,
        y: LAYER.curb,
        bounds: ROAD_BOUNDS,
      }),
    }),
    [loop, left, right],
  )

  const roads = useMemo(
    () => ({
      loop: ribbonGeometry(loop, { width: ROAD_WIDTH, segments: 220, y: LAYER.road, closed: true }),
      left: ribbonGeometry(left, { width: ROAD_WIDTH, segments: 90, y: LAYER.road, bounds: ROAD_BOUNDS }),
      right: ribbonGeometry(right, { width: ROAD_WIDTH, segments: 90, y: LAYER.road, bounds: ROAD_BOUNDS }),
    }),
    [loop, left, right],
  )

  const islandGeo = useMemo(
    () => blobSlab(ISLAND.rx, ISLAND.rz, 1.3, LAYER.island.thickness, 0.1),
    [],
  )
  const plazaGeo = useMemo(
    () => roundedSlabTop(PLAZA.width, PLAZA.depth, PLAZA.radius, PLAZA.y, 0.05),
    [],
  )

  const dashes = useMemo<DashInstance[]>(
    () => [
      ...dashInstances(loop, { dash: 0.5, gap: 0.5, y: LAYER.dash, closed: true }),
      ...dashInstances(left, { dash: 0.5, gap: 0.5, y: LAYER.dash, bounds: ROAD_BOUNDS }),
      ...dashInstances(right, { dash: 0.5, gap: 0.5, y: LAYER.dash, bounds: ROAD_BOUNDS }),
    ],
    [loop, left, right],
  )

  return (
    <group name="Roads">
      <mesh geometry={curbs.loop} material={MAT.curb()} receiveShadow />
      <mesh geometry={curbs.left} material={MAT.curb()} receiveShadow />
      <mesh geometry={curbs.right} material={MAT.curb()} receiveShadow />

      <mesh geometry={roads.loop} material={MAT.road()} receiveShadow />
      <mesh geometry={roads.left} material={MAT.road()} receiveShadow />
      <mesh geometry={roads.right} material={MAT.road()} receiveShadow />

      <CenterDashes instances={dashes} />

      {/* Isla central: parque */}
      <mesh geometry={islandGeo} position={[ISLAND.x, ISLAND.y, ISLAND.z]} receiveShadow>
        <meshStandardMaterial color={COLORS.grassLight} roughness={0.95} metalness={0} />
      </mesh>

      {/* Plaza peatonal bajo los edificios */}
      <mesh geometry={plazaGeo} position={[PLAZA.x, 0, PLAZA.z]} receiveShadow>
        <meshStandardMaterial color={COLORS.path} roughness={0.95} metalness={0} />
      </mesh>
    </group>
  )
}

/** Linea discontinua central, instanciada. */
function CenterDashes({ instances }: { instances: DashInstance[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const pos = new THREE.Vector3()
    const scl = new THREE.Vector3(0.11, 0.02, 0.5)
    const axis = new THREE.Vector3(0, 1, 0)
    instances.forEach((d, i) => {
      q.setFromAxisAngle(axis, d.rotationY)
      pos.set(d.position[0], d.position[1], d.position[2])
      m.compose(pos, q, scl)
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [instances])

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, instances.length]}
      castShadow={false}
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={COLORS.roadLine} roughness={0.7} metalness={0} />
    </instancedMesh>
  )
}
