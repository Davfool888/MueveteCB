import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MAT } from '../../lib/materials'
import { CLOUDS } from '../../lib/layout'

/**
 * Nubes: bolas de algodón.
 *
 * Cada nube es un cumulo de globos muy suaves y ligeramente solapados, con
 * un lobulo inferior mas plano. Nada de formas geometricas apiladas: la
 * silueta tiene que ser organica.
 */
export function Clouds() {
  return (
    <group name="Clouds">
      {CLOUDS.map((cloud, i) => (
        <Cloud
          key={`cloud-${i}`}
          position={cloud.position}
          scale={cloud.scale}
          detail={cloud.detail}
          drift={cloud.drift}
          seed={i}
        />
      ))}
    </group>
  )
}

type Blob = {
  position: [number, number, number]
  radius: number
  squash: [number, number, number]
}

/**
 * Perfil organico determinista: una masa base con lobulos alrededor,
 * mas unsub cono superior para la "towering" tipica de las nubes de toy.
 */
function cloudBlobs(detail: number, seed: number): Blob[] {
  const rand = mulberry(seed * 977 + 13)
  const blobs: Blob[] = [
    { position: [0, 0, 0], radius: 1.0, squash: [1.4, 0.85, 1.0] },
  ]

  const sides = Math.max(5, detail)
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 + rand() * 0.5
    const spread = 0.8 + rand() * 0.45
    const r = 0.52 + rand() * 0.3
    blobs.push({
      position: [Math.cos(a) * spread, (rand() - 0.42) * 0.34, Math.sin(a) * spread * 0.55],
      radius: r,
      squash: [1, 0.92 + rand() * 0.16, 1],
    })
  }

  // Remate superior
  blobs.push({
    position: [(rand() - 0.5) * 0.5, 0.46 + rand() * 0.16, (rand() - 0.5) * 0.3],
    radius: 0.6,
    squash: [1, 1.05, 1],
  })
  blobs.push({
    position: [(rand() - 0.5) * 0.4, 0.78 + rand() * 0.12, (rand() - 0.5) * 0.2],
    radius: 0.4,
    squash: [1, 1, 1],
  })

  // Base plana
  blobs.push({
    position: [(rand() - 0.5) * 1.3, -0.36, (rand() - 0.5) * 0.4],
    radius: 0.5,
    squash: [1.25, 0.6, 1],
  })
  return blobs
}

function Cloud({
  position,
  scale,
  detail,
  drift,
  seed,
}: {
  position: [number, number, number]
  scale: number
  detail: number
  drift: number
  seed: number
}) {
  const ref = useRef<THREE.Group>(null)
  const blobs = useMemo(() => cloudBlobs(detail, seed), [detail, seed])
  const white = MAT.cloud()
  const shade = MAT.cloudShade()
  const base = useMemo(
    () => new Float32Array([position[0], position[1], position[2]]),
    [position],
  )

  useFrame(({ clock }) => {
    const g = ref.current
    if (!g) return
    // Deriva vertical / lateral extremadamente lenta.
    const t = clock.elapsedTime * drift
    g.position.set(
      base[0] + Math.sin(t * 0.7) * 0.45,
      base[1] + Math.sin(t) * 0.2,
      base[2] + Math.cos(t * 0.55) * 0.26,
    )
  })

  return (
    <group ref={ref} position={position} scale={scale}>
      {blobs.map((b, i) => (
        <mesh
          key={i}
          position={b.position}
          scale={b.squash}
          material={i % 4 === 3 ? shade : white}
          castShadow={false}
          receiveShadow={false}
        >
          <sphereGeometry args={[b.radius, 20, 14]} />
        </mesh>
      ))}
    </group>
  )
}

/** PRNG determinista y pequeño. */
function mulberry(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
