import { useMemo } from 'react'
import { COLORS } from '../../lib/palette'

/**
 * Iluminacion de estudio muy difusa.
 *
 * Sin contrastes duros: la referencia apenas tiene sombras marcadas y todo
 * se resuelve con una luz envolvente suave mas oclusión ambiental. Por eso
 * la direccional es de intensidad baja y la hemiferica hace casi todo el
 * trabajo, con la sombra proyectada muy difuminada.
 */
export function Lighting() {
  const shadowCamera = useMemo(
    () => ({ left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 170 }),
    [],
  )

  return (
    <group name="Lighting">
      {/* Luz envolvente: cielo claro / rebote verde del suelo */}
      <hemisphereLight args={[COLORS.white, COLORS.lightBounce, 1.35]} />
      <ambientLight intensity={0.55} color={COLORS.lightAmbient} />

      {/* Luz principal muy suave, desde arriba y algo lateral */}
      <directionalLight
        castShadow
        color={COLORS.lightKey}
        intensity={1.05}
        position={[26, 58, 20]}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0008}
        shadow-normalBias={0.045}
        shadow-radius={5}
        shadow-blurSamples={12}
        shadow-camera-near={shadowCamera.near}
        shadow-camera-far={shadowCamera.far}
        shadow-camera-left={shadowCamera.left}
        shadow-camera-right={shadowCamera.right}
        shadow-camera-top={shadowCamera.top}
        shadow-camera-bottom={shadowCamera.bottom}
      />

      {/* Relleno frio desde el lado opuesto, sin sombras */}
      <directionalLight color={COLORS.lightFill} intensity={0.42} position={[-38, 22, -30]} />
      {/* Rebote inferior, evita negros en las caras inferiores */}
      <directionalLight color={COLORS.lightBounce} intensity={0.3} position={[4, -26, 16]} />
    </group>
  )
}
