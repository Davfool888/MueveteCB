import { Suspense } from 'react';
import { COLORS } from '../lib/palette';
import { CameraRig } from './CameraRig';
import { Lighting } from './Lighting';
import { Ground } from './Ground';
import { CityPlatform } from './CityPlatform';
import { Roads } from './Roads';
import { Buildings } from './Buildings';
import { Trees as Vegetation } from './Trees';
import { Vehicles } from './Vehicles';
import { CableCar } from './CableCar';
import { Clouds } from './Clouds';
import { People } from './People';
import { Effects } from './Effects';

/**
 * Raiz de la maqueta 3D.
 *
 * La escena contiene unicamente el diorama y sus elementos ambientales: ningun
 * panel, boton, input o texto de interfaz. Es decoracion del Home, no una vista
 * de datos: la informacion de rutas vive en el mapa de Leaflet y en el resumen
 * de la interfaz. Que no reciba estado del planificador es justo lo que evita que
 * la escena se vuelva a renderizar cada vez que alguien escribe una direccion.
 *
 * Antes aqui se montaba `TerritoryText`, que escribia "Tu camino, sin adivinar."
 * con tipografia 3D extruida. Se quito: son 90 KB de fuente (un `.typeface.json`
 * de 68 KB y un `.woff` de 21 KB) y `three-stdlib` entero para repetir un texto
 * que la pagina ya muestra en su `<h1>`, donde se lee mejor, escala con el
 * navegador y es accesible a un lector de pantalla.
 */
export function MainScene() {
  return (
    <>
      <color attach="background" args={[COLORS.background]} />
      <fog attach="fog" args={[COLORS.background, 90, 220]} />

      {/*
        El paneo baja la maqueta y la aparta a la derecha. Sin el, la losa queda
        centrada y se monta encima del titular, de la columna de datos y de la
        tarjeta del planificador. Los tres son contenido: el diorama es
        decoracion y no puede tapar lo que explica el producto.

        Los valores son fracciones del ancho y del alto visibles. La maqueta
        queda en la franja inferior y se deja cortar por el borde, que es lo que
        la hace leer como paisaje y no como recorte accidental.
      */}
      <CameraRig pan={[0.13, 0.15]} />
      <Lighting />

      <Suspense fallback={null}>
        {/* Entorno */}
        <Ground />
        <Clouds />

        {/* Ciudad */}
        <CityPlatform />
        <Roads />
        <Buildings />
        <Vegetation />
        <Vehicles />
        <CableCar />
        <People />
      </Suspense>

      <Effects />
    </>
  );
}
