import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Primitivas "softpop".
 *
 * Todas las formas dursas de la maqueta pasan por aqui. El radio de
 * redondeo es generoso a proposito: el objetivo es que todo lea como
 * plastico o gomaespoma moldeado, no como cajas.
 */

type SoftBoxProps = {
  size: [number, number, number]
  radius?: number
  material: THREE.Material
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
  castShadow?: boolean
  receiveShadow?: boolean
  /**
   * Segmentos del redondeo. 2 basta para volumenes pequeños y mantiene
   * bajo el numero de vertices; sube a 3-4 solo en las piezas grandes.
   */
  smoothness?: number
}

/**
 * Caja muy redondeada. `radius` se recorta al 48% de la menor dimension
 * para que la geometria nunca se rompa.
 */
export function SoftBox({
  size,
  radius = 0.14,
  material,
  position,
  rotation,
  scale,
  castShadow = true,
  receiveShadow = true,
  smoothness = 2,
}: SoftBoxProps) {
  const r = Math.max(0.005, Math.min(radius, Math.min(...size) * 0.48))
  return (
    <RoundedBox
      args={size}
      radius={r}
      smoothness={smoothness}
      material={material}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    />
  )
}

/** Esfera suave (nunca facetada: sin flatShading). */
export function Puff({
  radius = 0.2,
  material,
  position,
  rotation,
  scale,
  castShadow = true,
  receiveShadow = true,
}: {
  radius?: number
  material: THREE.Material
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
  castShadow?: boolean
  receiveShadow?: boolean
}) {
  return (
    <mesh
      material={material}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      <sphereGeometry args={[radius, 16, 12]} />
    </mesh>
  )
}

/** Capsula suave (torres, postes, personas). */
export function SoftCapsule({
  radius = 0.1,
  length = 0.3,
  material,
  position,
  rotation,
  castShadow = true,
  receiveShadow = true,
}: {
  radius?: number
  length?: number
  material: THREE.Material
  position?: [number, number, number]
  rotation?: [number, number, number]
  castShadow?: boolean
  receiveShadow?: boolean
}) {
  return (
    <mesh
      material={material}
      position={position}
      rotation={rotation}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      <capsuleGeometry args={[radius, length, 4, 12]} />
    </mesh>
  )
}

/** Cilindro con las tapas redondeadas (ruedas, barras). */
export function SoftCylinder({
  radiusTop = 0.1,
  radiusBottom = 0.1,
  height = 0.4,
  segments = 14,
  material,
  position,
  rotation,
  castShadow = true,
  receiveShadow = true,
}: {
  radiusTop?: number
  radiusBottom?: number
  height?: number
  segments?: number
  material: THREE.Material
  position?: [number, number, number]
  rotation?: [number, number, number]
  castShadow?: boolean
  receiveShadow?: boolean
}) {
  return (
    <mesh
      material={material}
      position={position}
      rotation={rotation}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      <cylinderGeometry args={[radiusTop, radiusBottom, height, segments]} />
    </mesh>
  )
}

/**
 * Muro / cubierta hinchada: una caja muy redondeada en vertical, que es la
 * silueta tipica de los edificios de la referencia.
 */
export function PillowRoof({
  width,
  depth,
  height,
  material,
  position,
  rotation,
  castShadow = true,
  receiveShadow = true,
}: {
  width: number
  depth: number
  height: number
  material: THREE.Material
  position?: [number, number, number]
  rotation?: [number, number, number]
  castShadow?: boolean
  receiveShadow?: boolean
}) {
  return (
    <SoftBox
      size={[width, height, depth]}
      radius={Math.min(width, depth, height) * 0.48}
      smoothness={4}
      material={material}
      position={position}
      rotation={rotation}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    />
  )
}

/** Cúpula hinchada (mitad de esfera). */
export function SoftDome({
  radius = 0.5,
  material,
  position,
  scale,
  castShadow = true,
  receiveShadow = true,
}: {
  radius?: number
  material: THREE.Material
  position?: [number, number, number]
  scale?: number | [number, number, number]
  castShadow?: boolean
  receiveShadow?: boolean
}) {
  return (
    <mesh
      material={material}
      position={position}
      scale={scale}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      <sphereGeometry args={[radius, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
    </mesh>
  )
}
