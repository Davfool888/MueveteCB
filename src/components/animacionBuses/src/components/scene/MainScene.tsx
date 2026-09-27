import { Suspense } from 'react'
import { COLORS } from '../../lib/palette'
import { CameraRig } from './CameraRig'
import { Lighting } from './Lighting'
import { Ground } from './Ground'
import { CityPlatform } from './CityPlatform'
import { Roads } from './Roads'
import { Buildings } from './Buildings'
import { Trees as Vegetation } from './Trees'
import { Vehicles } from './Vehicles'
import { CableCar } from './CableCar'
import { TerritoryText } from './TerritoryText'
import { Clouds } from './Clouds'
import { People } from './People'
import { Effects } from './Effects'

/**
 * Raiz de la maqueta 3D.
 * La escena contiene unicamente el diorama y sus elementos ambientales:
 * ningun panel, boton, input o texto de interfaz.
 */
export function MainScene() {
  return (
    <>
      <color attach="background" args={[COLORS.background]} />
      <fog attach="fog" args={[COLORS.background, 90, 220]} />

      <CameraRig />
      <Lighting />

      <Suspense fallback={null}>
        {/* Environment */}
        <Ground />
        <Clouds />

        {/* City */}
        <CityPlatform />
        <Roads />
        <Buildings />
        <Vegetation />
        <Vehicles />
        <CableCar />
        <People />
        <TerritoryText />
      </Suspense>

      <Effects />
    </>
  )
}
