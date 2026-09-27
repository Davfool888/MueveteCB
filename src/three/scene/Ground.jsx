import { useMemo } from "react";
import * as THREE from "three";
import { COLORS, MATERIAL } from "../lib/palette";
import { GROUND_Y } from "../lib/layout";
export function Ground() {
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: COLORS.ground,
      roughness: MATERIAL.ground.roughness,
      metalness: MATERIAL.ground.metalness
    }),
    []
  );
  return <mesh
    name="Ground"
    rotation={[-Math.PI / 2, 0, 0]}
    position={[0, GROUND_Y, 0]}
    receiveShadow
    material={material}
  >
      <planeGeometry args={[400, 400, 1, 1]} />
    </mesh>;
}
