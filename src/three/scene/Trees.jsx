import { MATERIAL } from "../lib/palette";
import { mat, MAT } from "../lib/materials";
import {
  TREES,
  BUSHES,
  ROCKS,
  GRASS_TUFTS,
  POND,
  MUSHROOMS,
  KIOSK,
  ISLAND,
  LAYER,
  HEDGES,
  GAZEBO
} from "../lib/layout";
import { Puff, SoftBox, SoftCylinder, SoftDome } from "./primitives";
export function Trees() {
  return <group name="Trees">
      {TREES.map((t, i) => <Tree key={`tree-${i}`} spec={t} />)}
      {BUSHES.map((p, i) => <Bush key={`bush-${i}`} position={p} index={i} />)}
      {ROCKS.map((r, i) => <Rock key={`rock-${i}`} {...r} index={i} />)}
      {GRASS_TUFTS.map((p, i) => <GrassTuft key={`tuft-${i}`} position={p} index={i} />)}
      {HEDGES.map((h, i) => <Hedge key={`hedge-${i}`} {...h} index={i} />)}

      <Pond />
      {MUSHROOMS.map((m, i) => <Mushroom key={`shroom-${i}`} {...m} />)}
      <Gazebo />
      <Kiosk />
    </group>;
}
const ISLAND_Y = ISLAND.y + LAYER.island.thickness;
const LEAF_MATS = [MAT.leaf(), MAT.leafLight(), MAT.leafDark()];
function Tree({ spec }) {
  const { position, scale, hue, shape } = spec;
  const leaf = LEAF_MATS[hue] ?? LEAF_MATS[0];
  const trunk = MAT.trunk();
  return <group position={position} scale={scale}>
      <SoftCylinder
    radiusTop={0.035}
    radiusBottom={0.055}
    height={0.3}
    material={trunk}
    position={[0, 0.15, 0]}
  />
      {shape === "round" ? <group>
          {/* Copa: globos fused que leen como una masa hinchada */}
          <Puff radius={0.23} material={leaf} position={[0, 0.5, 0]} />
          <Puff radius={0.15} material={leaf} position={[0.12, 0.4, 0.06]} />
          <Puff radius={0.14} material={leaf} position={[-0.1, 0.42, -0.07]} />
        </group> : <group>
          <SoftDome radius={0.22} material={leaf} position={[0, 0.34, 0]} scale={[1, 1.15, 1]} />
          <SoftDome radius={0.15} material={leaf} position={[0, 0.52, 0]} scale={[1, 1.1, 1]} />
        </group>}
    </group>;
}
function Bush({ position, index }) {
  const m = index % 3 === 0 ? MAT.leafLight() : index % 3 === 1 ? MAT.bush() : MAT.leafDark();
  return <group position={position}>
      <Puff radius={0.15} material={m} position={[0, 0.1, 0]} />
      <Puff radius={0.11} material={m} position={[0.13, 0.08, 0.05]} rotation={[0, index, 0]} />
      <Puff radius={0.1} material={m} position={[-0.1, 0.07, -0.06]} rotation={[0, index * 1.7, 0]} />
    </group>;
}
const ROCK_MATS = [MAT.rock(), MAT.rockAlt(), MAT.rockLight()];
function Rock({
  position,
  scale: radius,
  moss,
  index
}) {
  const m = ROCK_MATS[index % ROCK_MATS.length];
  return <group position={position} rotation={[0, index * 0.9, 0]}>
      <Puff
    radius={radius}
    material={m}
    position={[0, radius * 0.55, 0]}
    scale={[1, 0.66, 1.05]}
  />
      <Puff
    radius={radius * 0.6}
    material={m}
    position={[radius * 0.7, radius * 0.3, radius * 0.4]}
  />
      {moss && <Puff
    radius={radius * 0.85}
    material={MAT.moss()}
    position={[-radius * 0.15, radius * 0.9, -radius * 0.1]}
    scale={[1, 0.3, 0.9]}
    castShadow={false}
  />}
    </group>;
}
function GrassTuft({ position, index }) {
  const m = index % 2 === 0 ? MAT.grassLight() : MAT.leafDark();
  return <group position={position} rotation={[0, index * 1.3, 0]}>
      {[-0.05, 0, 0.05].map((x, k) => <SoftCylinder
    key={k}
    radiusTop={6e-3}
    radiusBottom={0.022}
    height={0.12 + k * 0.02}
    segments={6}
    material={m}
    position={[x, 0.06, k * 0.02]}
    rotation={[0, 0, x * 2]}
    castShadow={false}
  />)}
    </group>;
}
function Hedge({
  position,
  length,
  rotationY,
  index
}) {
  const m = index % 2 === 0 ? MAT.bush() : MAT.leafDark();
  const count = Math.max(3, Math.round(length / 0.3));
  return <group position={position} rotation={[0, rotationY, 0]}>
      {Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : i / (count - 1) - 0.5;
    return <Puff
      key={i}
      radius={0.19}
      material={m}
      position={[t * length, 0.11, 0]}
      scale={[1, 0.88, 1]}
      receiveShadow
    />;
  })}
    </group>;
}
function Pond() {
  const water = MAT.water();
  const rim = MAT.stone();
  return <group position={[POND.position[0], ISLAND_Y, POND.position[2]]}>
      {/* Borde */}
      <mesh position={[0, 0.015, 0]} scale={[POND.rx * 1.14, 0.09, POND.rz * 1.2]} material={rim}>
        <sphereGeometry args={[1, 20, 8]} />
      </mesh>
      {/* Lamina de agua */}
      <mesh position={[0, 0.05, 0]} scale={[POND.rx, 0.06, POND.rz]} material={water}>
        <sphereGeometry args={[1, 20, 8]} />
      </mesh>
    </group>;
}
function Mushroom({
  position,
  scale,
  cap
}) {
  const capMat = mat(cap, MATERIAL.soft);
  const stemMat = MAT.mushroomStem();
  const dotMat = MAT.mushroomDot();
  return <group position={[position[0], ISLAND_Y, position[2]]} scale={scale}>
      <SoftCylinder
    radiusTop={0.085}
    radiusBottom={0.11}
    height={0.26}
    material={stemMat}
    position={[0, 0.13, 0]}
  />
      <SoftDome
    radius={0.23}
    material={capMat}
    position={[0, 0.26, 0]}
    scale={[1, 0.78, 1]}
  />
      {[
    [0.1, 0.4, 0.06],
    [-0.09, 0.42, -0.05],
    [0, 0.45, -0.1],
    [0.13, 0.36, -0.09]
  ].map((p, i) => <Puff
    key={i}
    radius={0.03}
    material={dotMat}
    position={p}
    scale={[1, 0.55, 1]}
    castShadow={false}
  />)}
      <SoftBox
    size={[0.07, 0.07, 0.04]}
    radius={0.02}
    material={MAT.glassDark()}
    position={[0, 0.14, 0.09]}
    castShadow={false}
  />
    </group>;
}
function Kiosk() {
  return <group
    position={[KIOSK.position[0], ISLAND_Y, KIOSK.position[2]]}
    rotation={[0, KIOSK.rotationY, 0]}
  >
      <SoftBox
    size={[0.48, 0.42, 0.38]}
    radius={0.13}
    material={MAT.kioskBody()}
    position={[0, 0.21, 0]}
  />
      <PillowRoofSmall position={[0, 0.48, 0]} material={MAT.kioskRoof()} />
      <SoftBox
    size={[0.3, 0.2, 0.05]}
    radius={0.025}
    material={MAT.glassDark()}
    position={[0, 0.23, 0.19]}
    castShadow={false}
  />
    </group>;
}
function PillowRoofSmall({
  position,
  material
}) {
  return <SoftBox
    size={[0.58, 0.1, 0.48]}
    radius={0.048}
    material={material}
    position={position}
  />;
}
function Gazebo() {
  const { position, radius, height } = GAZEBO;
  const roof = MAT.roofDark();
  const floor = MAT.stone();
  return <group position={position}>
      <SoftCylinder
    radiusTop={radius}
    radiusBottom={radius + 0.05}
    height={0.1}
    material={floor}
    position={[0, 0.05, 0]}
    receiveShadow
  />
      {Array.from({ length: 6 }, (_, i) => {
    const a = i / 6 * Math.PI * 2;
    return <SoftCylinder
      key={i}
      radiusTop={0.035}
      radiusBottom={0.04}
      height={height}
      segments={8}
      material={MAT.kioskBody()}
      position={[Math.cos(a) * radius * 0.78, height / 2, Math.sin(a) * radius * 0.78]}
    />;
  })}
      <SoftDome
    radius={radius + 0.14}
    material={roof}
    position={[0, height + 0.06, 0]}
    scale={[1, 0.6, 1]}
  />
      <Puff radius={0.06} material={roof} position={[0, height + 0.32, 0]} />
    </group>;
}
