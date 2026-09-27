import { useMemo } from 'react'
import { useFont } from '@react-three/drei'
import { TextGeometry } from 'three-stdlib'
import type { Font } from 'three-stdlib'
import * as THREE from 'three'
import { COLORS } from '../../lib/palette'
import { mat } from '../../lib/materials'
import { TERRITORY_TEXT } from '../../lib/layout'

/**
 * Texto integrado en la maqueta: "Tu camino, sin adivinar."
 *
 * Letras 3D extruidas y muy redondeadas, en verde pastel, tumbadas sobre la
 * plataforma. Es una pieza fisica del modelo, no un elemento HTML flotante.
 * Las dos lineas se centran midiendo la geometria real.
 */
export function TerritoryText() {
  const { line1, line2, width, line1Scale, lineGap, x, z, rotationY, y, font } =
    TERRITORY_TEXT
  const loaded = useFont(font)

  const lines = useMemo(() => {
    if (!loaded) return null
    const a = buildLine(line1, loaded)
    const b = buildLine(line2, loaded)
    // Escala base: la linea mas larga llega al ancho objetivo.
    const s2 = width / Math.max(a.width, b.width)
    const s1 = s2 * line1Scale
    // Bloque centrado verticalmente.
    const y1 = (b.height * s2 + lineGap) / 2
    const y2 = -((a.height * s1 + lineGap) / 2)
    return { a, b, s1, s2, y1, y2 }
  }, [loaded, line1, line2, width, line1Scale, lineGap])

  const frontMat = useMemo(
    () => mat(COLORS.text, { roughness: 0.72, metalness: 0 }),
    [],
  )
  const sideMat = useMemo(
    () => mat(COLORS.textSide, { roughness: 0.8, metalness: 0 }),
    [],
  )

  if (!lines) return null

  return (
    <group name="TerritoryText" position={[x, y, z]} rotation={[-Math.PI / 2, 0, rotationY]}>
      <mesh
        geometry={lines.a.geometry}
        material={[frontMat, sideMat]}
        position={[0, lines.y1, 0]}
        scale={lines.s1}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={lines.b.geometry}
        material={[frontMat, sideMat]}
        position={[0, lines.y2, 0]}
        scale={lines.s2}
        castShadow
        receiveShadow
      />
    </group>
  )
}

type Line = {
  geometry: THREE.BufferGeometry
  width: number
  height: number
}

/**
 * Geometria extruida de una linea a `size = 1`, centrada en X y con la
 * linea base en y = 0. El bisel es generoso para que las letras se lean
 * hinchadas.
 */
function buildLine(text: string, font: Font): Line {
  const geometry = new TextGeometry(text, {
    font,
    size: 1,
    height: 0.08,
    curveSegments: 6,
    bevelEnabled: true,
    bevelThickness: 0.022,
    bevelSize: 0.05,
    bevelOffset: 0,
    letterSpacing: -0.012,
  })
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox!
  const width = bb.max.x - bb.min.x
  const height = bb.max.y - bb.min.y
  geometry.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, 0)
  geometry.computeVertexNormals()
  return { geometry, width, height }
}
