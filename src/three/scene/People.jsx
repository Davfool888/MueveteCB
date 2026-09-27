import { mat, MAT } from "../lib/materials";
import { PEOPLE } from "../lib/layout";
import { SoftBox, Puff, SoftCylinder } from "./primitives";
const PEOPLE_SCALE = 1.45;
export function People() {
  return <group name="People">
      {PEOPLE.map((p, i) => <Person key={`person-${i}`} {...p} />)}
    </group>;
}
function Person({
  position,
  color,
  rotationY,
  scale
}) {
  const body = mat(color, { roughness: 0.75, metalness: 0 });
  const skin = MAT.skin();
  const legs = MAT.trousers();
  const hair = MAT.trunk();
  return <group position={position} rotation={[0, rotationY, 0]} scale={scale * PEOPLE_SCALE}>
      {/* Piernas */}
      {[-0.032, 0.032].map((x) => <SoftCylinder
    key={x}
    radiusTop={0.019}
    radiusBottom={0.021}
    height={0.085}
    segments={8}
    material={legs}
    position={[x, 0.043, 0]}
  />)}
      {/* Zapatos */}
      {[-0.032, 0.032].map((x) => <SoftBox
    key={`shoe-${x}`}
    size={[0.045, 0.022, 0.06]}
    radius={0.01}
    material={legs}
    position={[x, 0.011, 6e-3]}
    castShadow={false}
  />)}
      {/* Torso */}
      <SoftBox
    size={[0.082, 0.1, 0.05]}
    radius={0.024}
    material={body}
    position={[0, 0.135, 0]}
  />
      {/* Brazos */}
      {[-1, 1].map((s) => <SoftCylinder
    key={s}
    radiusTop={0.014}
    radiusBottom={0.015}
    height={0.08}
    segments={7}
    material={body}
    position={[s * 0.052, 0.13, 0]}
    rotation={[0, 0, s * 0.14]}
  />)}
      {/* Manos */}
      {[-1, 1].map((s) => <Puff
    key={`hand-${s}`}
    radius={0.014}
    material={skin}
    position={[s * 0.06, 0.088, 0]}
    castShadow={false}
  />)}
      {/* Cabeza */}
      <Puff radius={0.033} material={skin} position={[0, 0.205, 0]} scale={[1, 1.08, 0.95]} />
      {/* Pelo */}
      <Puff
    radius={0.034}
    material={hair}
    position={[0, 0.213, -4e-3]}
    scale={[1, 0.72, 0.96]}
    castShadow={false}
  />
    </group>;
}
