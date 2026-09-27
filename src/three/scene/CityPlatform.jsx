import { useMemo } from "react";
import * as THREE from "three";
import { COLORS, MATERIAL } from "../lib/palette";
import { MAT } from "../lib/materials";
import {
  PLATFORM,
  GRASS_PATCHES,
  PARKING,
  LAYER,
  parkingMarks
} from "../lib/layout";
import { roundedSlab, blobSlab, roundedSlabTop } from "../lib/geometry";
export function CityPlatform() {
  const slab = useMemo(
    () => roundedSlab(
      PLATFORM.width,
      PLATFORM.depth,
      PLATFORM.radius,
      PLATFORM.thickness,
      PLATFORM.bevel
    ),
    []
  );
  const parking = useMemo(
    () => roundedSlabTop(PARKING.width, PARKING.depth, PARKING.radius, LAYER.parking.thickness, 0.03),
    []
  );
  const patchGeos = useMemo(
    () => GRASS_PATCHES.map((p) => blobSlab(p.rx, p.rz, p.seed, LAYER.grass.thickness, 0.18)),
    []
  );
  const marks = useMemo(() => parkingMarks(), []);
  const platformMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: COLORS.platformTop, ...MATERIAL.platform }),
    []
  );
  const grassMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: COLORS.grass, ...MATERIAL.soft }),
    []
  );
  return <group name="CityPlatform">
      <mesh geometry={slab} material={platformMat} castShadow receiveShadow />

      {/* Parches de cesped: apenas un tono por encima de la losa. */}
      {patchGeos.map((geo, i) => <mesh
    key={`grass-${i}`}
    geometry={geo}
    material={grassMat}
    position={[
      GRASS_PATCHES[i].position[0],
      LAYER.grass.base,
      GRASS_PATCHES[i].position[2]
    ]}
    receiveShadow
  />)}

      {/* Aparcamiento de camperos */}
      <mesh
    geometry={parking}
    material={MAT.parking()}
    position={[PARKING.x, PARKING.y, PARKING.z]}
    receiveShadow
  />
      {marks.map((m, i) => <mesh
    key={`mark-${i}`}
    material={MAT.parkingLine()}
    position={[m.position[0], LAYER.mark, m.position[2]]}
    rotation={[-Math.PI / 2, 0, 0]}
  >
          <planeGeometry args={[m.size[0], m.size[1]]} />
        </mesh>)}
    </group>;
}
