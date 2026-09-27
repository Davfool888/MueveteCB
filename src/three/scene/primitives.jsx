import { roundedBoxGeometry } from '../lib/geometry';

/**
 * Primitivas "softpop".
 *
 * Todas las formas duras de la maqueta pasan por aqui. El radio de
 * redondeo es generoso a proposito: el objetivo es que todo lea como
 * plastico o gomaespoma moldeado, no como cajas.
 *
 * `SoftBox` se resolvia con el componente `RoundedBox` de @react-three/drei.
 * Se sustituye por `roundedBoxGeometry`, que hace lo mismo con
 * `ExtrudeGeometry` y ademas cachea la geometria. Tres razones:
 *
 *   1. `drei` arrastra un arbol de dependencias grande para tres componentes.
 *      En toda la escena solo se usaban `RoundedBox`, `Line` y `useFont`.
 *   2. La geometria cacheada se reutiliza entre buses, edificios y utileria.
 *      Sin cache, cada caja se reconstruye en cada render.
 *   3. `RoundedBox` crea su propia geometria por instancia; con unas 350
 *      piezas eso son 350 buffers que no se comparten.
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
}) {
  // El radio se recorta al 48% de la menor dimension para que la geometria
  // nunca se rompa.
  const r = Math.max(0.005, Math.min(radius, Math.min(...size) * 0.48));
  return (
    <mesh
      geometry={roundedBoxGeometry(size[0], size[1], size[2], r, smoothness)}
      material={material}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    />
  );
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
  );
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
  );
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
  );
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
  );
}

/** Cupula hinchada (mitad de esfera). */
export function SoftDome({
  radius = 0.5,
  material,
  position,
  scale,
  castShadow = true,
  receiveShadow = true,
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
  );
}
