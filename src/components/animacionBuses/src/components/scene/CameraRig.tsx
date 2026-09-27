import { useLayoutEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CAMERA, FRAME_BOX } from '../../lib/layout'

const UP = new THREE.Vector3(0, 1, 0)

/**
 * Camara ortografica fija, tipo maqueta / isometrica.
 *
 * - vista elevada (~33 grados), leve rotacion horizontal, perspectiva muy plana
 * - el usuario no puede rotarla ni moverla: la composicion es fija
 * - el encuadre (posicion y zoom) se calcula de forma pura a partir del
 *   viewport, de modo que la maqueta siempre llena el encuadre
 *
 * Se configura sobre la camara por defecto de R3F en lugar de crear una
 * segunda camara con `makeDefault`: el `EffectComposer` de postprocessing
 * construye su `RenderPass` con la camara activa durante el primer render, y
 * un intercambio posterior dejaria el compositor apuntando a la camara
 * antigua (escena en negro).
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera
  const size = useThree((s) => s.size)

  /** Encuadre calculado de forma pura: no depende de la camara. */
  const framing = useMemo(() => {
    const eye = new THREE.Vector3(...CAMERA.position)
    const target = new THREE.Vector3(...CAMERA.target)

    // Base ortonormal de la camara.
    const forward = target.clone().sub(eye).normalize()
    const right = new THREE.Vector3().crossVectors(forward, UP).normalize()
    const up = new THREE.Vector3().crossVectors(right, forward)

    const min = new THREE.Vector3(...FRAME_BOX.min)
    const max = new THREE.Vector3(...FRAME_BOX.max)
    const v = new THREE.Vector3()

    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    let minZ = Infinity
    let maxZ = -Infinity

    for (let i = 0; i < 8; i++) {
      v.set(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z).sub(eye)
      const cx = v.dot(right)
      const cy = v.dot(up)
      const cz = v.dot(forward)
      minX = Math.min(minX, cx)
      maxX = Math.max(maxX, cx)
      minY = Math.min(minY, cy)
      maxY = Math.max(maxY, cy)
      minZ = Math.min(minZ, cz)
      maxZ = Math.max(maxZ, cz)
    }

    const spanX = Math.max(0.001, maxX - minX)
    // Margen vertical extra para compensar la profundidad (nubes, teleférico).
    const spanY = Math.max(0.001, maxY - minY) + (maxZ - minZ) * 0.1

    // Con frustum = tamaño del canvas, el mundo visible es size / zoom.
    const zoom = Math.min(size.width / spanX, size.height / spanY) * CAMERA.fill

    // Reencuadre: desplazar la camara para centrar el contenido.
    const position = eye
      .clone()
      .addScaledVector(right, (minX + maxX) / 2)
      .addScaledVector(up, (minY + maxY) / 2)

    return { position, zoom: zoom > 0 ? zoom : 1 }
  }, [size.width, size.height])

  useLayoutEffect(() => {
    /*
     * Configuracion imperativa de la camara por defecto: R3F expone la
     * instancia y escribir en ella es justamente el proposito de este
     * componente (una camara fija, sin controles de usuario).
     */
    camera.position.copy(framing.position)
    // eslint-disable-next-line react-hooks/immutability
    camera.zoom = framing.zoom
    camera.near = -220
    camera.far = 420
    camera.updateProjectionMatrix()
  }, [camera, framing])

  return null
}
