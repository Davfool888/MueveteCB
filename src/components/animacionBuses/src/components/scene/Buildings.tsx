import { useMemo } from 'react'
import { MATERIAL } from '../../lib/palette'
import { mat, MAT } from '../../lib/materials'
import {
  BUILDINGS,
  HUTS,
  STALLS,
  LAMPS,
  BENCHES,
  type BuildingSpec,
} from '../../lib/layout'
import { SoftBox, SoftDome, PillowRoof, Puff, SoftCylinder } from './primitives'

/**
 * Edificios: volumenes hinchados en tonos pastel.
 *
 * Nada de aristas vivas: cuerpos con radio de redondeo generoso, cubiertas
 * tipo almohada o cupula, ventanas hundidas y toldos blandos.
 */
export function Buildings() {
  return (
    <group name="Buildings">
      {BUILDINGS.map((spec, i) => (
        <Building key={`bld-${i}`} spec={spec} />
      ))}
      {HUTS.map((hut, i) => (
        <Hut key={`hut-${i}`} {...hut} />
      ))}
      {STALLS.map((stall, i) => (
        <Stall key={`stall-${i}`} {...stall} />
      ))}
      {BENCHES.map(([x, , z, rot], i) => (
        <Bench key={`bench-${i}`} position={[x, 0, z]} rotationY={rot} />
      ))}
      {LAMPS.map((p, i) => (
        <Lamp key={`lamp-${i}`} position={p} />
      ))}
    </group>
  )
}

function Building({ spec }: { spec: BuildingSpec }) {
  const {
    position,
    rotationY,
    width,
    depth,
    height,
    roof,
    wall,
    roofColor,
    awning,
    windows,
  } = spec

  const wallMat = mat(wall, MATERIAL.building)
  const roofMat = mat(roofColor, MATERIAL.soft)
  const trimMat = MAT.trim()
  const glassMat = MAT.glassDark()
  const doorMat = MAT.trunk()
  const awningMat = MAT.awning()
  const stripeMat = MAT.awningStripe()

  /** Radios generosos: es lo que produce el aspecto "puffy". */
  const bodyRadius = Math.min(width, depth, height) * 0.34
  const roofH = roof === 'pillow' ? Math.min(width, depth) * 0.3 : 0

  /** Ventanas hundidas en las caras visibles. */
  const windowDefs = useMemo(() => {
    const out: Array<{ pos: [number, number, number]; size: [number, number, number] }> = []
    const wW = 0.26
    const wH = 0.24
    const frontZ = depth / 2 - 0.02
    const sideX = width / 2 - 0.02
    for (let r = 0; r < windows.rows; r++) {
      const y = 0.36 + r * (height * 0.4)
      for (let c = 0; c < windows.cols; c++) {
        const x = -width / 2 + ((c + 1) * width) / (windows.cols + 1)
        out.push({ pos: [x, y, frontZ], size: [wW, wH, 0.06] })
      }
      if (windows.cols > 1) {
        const z = -depth / 2 + ((r + 0.5) * depth) / Math.max(1, windows.rows)
        out.push({ pos: [sideX, y, z], size: [0.06, wH, wW] })
      }
    }
    return out
  }, [windows, width, depth, height])

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Cuerpo hinchado */}
      <SoftBox
        size={[width, height, depth]}
        radius={bodyRadius}
        material={wallMat}
        position={[0, height / 2, 0]}
        smoothness={4}
      />

      {/* Zocalo: banda inferior ligeramente mas oscura */}
      <SoftBox
        size={[width + 0.06, 0.16, depth + 0.06]}
        radius={0.07}
        material={trimMat}
        position={[0, 0.08, 0]}
      />

      {/* Cornisa suave */}
      <SoftBox
        size={[width + 0.08, 0.09, depth + 0.08]}
        radius={0.04}
        material={trimMat}
        position={[0, height + 0.02, 0]}
      />

      {/* Cubierta */}
      {roof === 'pillow' && (
        <PillowRoof
          width={width + 0.1}
          depth={depth + 0.1}
          height={roofH}
          material={roofMat}
          position={[0, height + 0.03 + roofH / 2, 0]}
        />
      )}
      {roof === 'dome' && (
        <SoftDome
          radius={Math.min(width, depth) * 0.62}
          material={roofMat}
          position={[0, height + 0.02, 0]}
          scale={[1, 0.72, 1]}
        />
      )}
      {roof === 'flat' && (
        <PillowRoof
          width={width + 0.12}
          depth={depth + 0.12}
          height={0.1}
          material={roofMat}
          position={[0, height + 0.06, 0]}
        />
      )}

      {/* Ventanas */}
      {windowDefs.map((w, i) => (
        <SoftBox
          key={`win-${i}`}
          size={w.size}
          radius={0.055}
          material={glassMat}
          position={w.pos}
          castShadow={false}
        />
      ))}

      {/* Puerta */}
      <SoftBox
        size={[0.3, 0.5, 0.07]}
        radius={0.09}
        material={doorMat}
        position={[0, 0.26, depth / 2 - 0.01]}
      />

      {/* Toldo blando, a dos aguas, con listas */}
      {awning && (
        <group position={[0, height * 0.5, depth / 2 + 0.24]}>
          <SoftBox
            size={[width * 0.8, 0.07, 0.56]}
            radius={0.03}
            material={awningMat}
            rotation={[-0.34, 0, 0]}
          />
          {[-1, 1].map((s) => (
            <SoftBox
              key={s}
              size={[width * 0.16, 0.08, 0.56]}
              radius={0.03}
              material={stripeMat}
              position={[s * width * 0.26, 0.01, 0]}
              rotation={[-0.34, 0, 0]}
            />
          ))}
        </group>
      )}
    </group>
  )
}

/** Caseta pastel. */
function Hut({
  position,
  color,
  rotationY,
}: {
  position: [number, number, number]
  color: string
  rotationY: number
}) {
  const bodyMat = mat(color, MATERIAL.building)
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <SoftBox
        size={[1.0, 0.8, 0.9]}
        radius={0.26}
        material={bodyMat}
        position={[0, 0.4, 0]}
        smoothness={4}
      />
      <PillowRoof
        width={1.1}
        depth={1.0}
        height={0.28}
        material={MAT.roof()}
        position={[0, 0.94, 0]}
      />
    </group>
  )
}

/** Puesto de mercado: mostrador, postes y toldo a listas. */
function Stall({
  position,
  rotationY,
  color,
  width,
}: {
  position: [number, number, number]
  rotationY: number
  color: string
  width: number
}) {
  const cloth = mat(color, MATERIAL.soft)
  const pole = MAT.cabinFrame()
  const counter = MAT.counter()

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <SoftBox
        size={[width, 0.4, 0.46]}
        radius={0.11}
        material={counter}
        position={[0, 0.2, 0]}
      />
      <SoftBox
        size={[width + 0.03, 0.13, 0.49]}
        radius={0.055}
        material={cloth}
        position={[0, 0.34, 0]}
      />
      {[-1, 1].map((s) => (
        <SoftCylinder
          key={s}
          radiusTop={0.022}
          radiusBottom={0.022}
          height={0.92}
          material={pole}
          position={[(s * (width + 0.1)) / 2, 0.46, 0.3]}
        />
      ))}
      <SoftBox
        size={[width + 0.24, 0.07, 0.78]}
        radius={0.03}
        material={cloth}
        position={[0, 0.92, 0.12]}
        rotation={[-0.28, 0, 0]}
      />
      {[-1, 1].map((s) => (
        <SoftBox
          key={`stripe-${s}`}
          size={[width * 0.2, 0.075, 0.78]}
          radius={0.03}
          material={MAT.awningStripe()}
          position={[s * width * 0.3, 0.932, 0.12]}
          rotation={[-0.28, 0, 0]}
        />
      ))}
      <SoftBox
        size={[0.2, 0.15, 0.2]}
        radius={0.05}
        material={MAT.crate()}
        position={[width * 0.2, 0.49, 0]}
      />
    </group>
  )
}

/** Farola de pasta. */
function Lamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <SoftCylinder
        radiusTop={0.07}
        radiusBottom={0.09}
        height={0.1}
        material={MAT.stoneDark()}
        position={[0, 0.05, 0]}
      />
      <SoftCylinder
        radiusTop={0.025}
        radiusBottom={0.035}
        height={0.78}
        material={MAT.cabinFrame()}
        position={[0, 0.44, 0]}
      />
      <Puff radius={0.07} material={MAT.lamp()} position={[0, 0.87, 0]} castShadow={false} />
      <Puff
        radius={0.05}
        material={MAT.cabinFrame()}
        position={[0, 0.95, 0]}
        scale={[1, 0.7, 1]}
        castShadow={false}
      />
    </group>
  )
}

/** Banco. */
function Bench({ position, rotationY }: { position: [number, number, number]; rotationY: number }) {
  const wood = MAT.trunk()
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <SoftBox size={[0.58, 0.07, 0.19]} radius={0.03} material={wood} position={[0, 0.18, 0]} />
      <SoftBox size={[0.58, 0.19, 0.06]} radius={0.028} material={wood} position={[0, 0.28, -0.08]} />
      {[-0.22, 0.22].map((x) => (
        <SoftBox
          key={x}
          size={[0.07, 0.18, 0.17]}
          radius={0.03}
          material={MAT.stoneDark()}
          position={[x, 0.09, 0]}
        />
      ))}
    </group>
  )
}
