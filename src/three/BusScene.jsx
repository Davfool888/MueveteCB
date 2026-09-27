import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';

import { MainScene } from './scene/MainScene';
import { CAMERA } from './lib/layout';

/**
 * Escena 3D decorativa del Home.
 *
 * Es una pieza de ambientacion, no una vista de datos. No recibe props ni
 * reacciona al estado del planificador: la informacion de rutas vive en el mapa
 * de Leaflet y en el resumen de la interfaz. Mantenerla independiente es lo que
 * permite que la escena no se vuelva a renderizar cada vez que alguien escribe
 * una direccion.
 *
 * Monta un `Canvas` de react-three-fiber con camara ortografica. El encuadre no
 * lo ajusta el usuario: es una maqueta que se mira.
 */
export default function BusScene() {
  return (
    <Canvas
      shadows="variance"
      dpr={[1, 1.5]}
      orthographic
      camera={{
        position: CAMERA.position,
        zoom: 40,
        near: -200,
        far: 400,
      }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.NeutralToneMapping,
        toneMappingExposure: 1.04,
      }}
    >
      <MainScene />
    </Canvas>
  );
}
