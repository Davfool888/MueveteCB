import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { COLORS, MATERIAL } from "../lib/palette";
import { mat, MAT } from "../lib/materials";
import {
  VEHICLES,
  PARKING,
  ROUTE_LOOP,
  ROUTE_CIRCUIT,
  parkingSlots
} from "../lib/layout";
import { curveFromPairs } from "../lib/geometry";
import { SoftBox, Puff, SoftCylinder } from "./primitives";
export function Vehicles() {
  const routes = useMemo(() => {
    const loop = curveFromPairs(ROUTE_LOOP, true);
    const circuit = curveFromPairs(ROUTE_CIRCUIT, false);
    return {
      loop: { curve: loop, length: loop.getLength(), closed: true },
      circuit: { curve: circuit, length: circuit.getLength(), closed: false }
    };
  }, []);
  const slots = useMemo(() => parkingSlots(), []);
  return <group name="Vehicles">
      {VEHICLES.map(
    (spec, i) => spec.moving ? <MovingVehicle
      key={`veh-${i}`}
      spec={spec}
      route={routes[spec.route ?? "loop"]}
    /> : <ParkedVehicle key={`veh-${i}`} spec={spec} position={slots[spec.slot ?? 0]} />
  )}
    </group>;
}
function MovingVehicle({ spec, route }) {
  const ref = useRef(null);
  const state = useRef({ t: spec.t ?? 0, dir: spec.dir ?? 1 });
  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    const s = state.current;
    const speed = spec.speed ?? 1;
    const step = speed * Math.min(delta, 0.05) / route.length;
    s.t += s.dir * step;
    if (route.closed) {
      if (s.t > 1) s.t -= 1;
      if (s.t < 0) s.t += 1;
    } else if (s.t >= 1) {
      s.t = 1;
      s.dir = -1;
    } else if (s.t <= 0) {
      s.t = 0;
      s.dir = 1;
    }
    const t = Math.min(1, Math.max(0, s.t));
    const p = route.curve.getPointAt(t);
    const tan = route.curve.getTangentAt(t);
    g.position.set(p.x, 0.05, p.z);
    g.rotation.y = Math.atan2(tan.x * s.dir, tan.z * s.dir);
  });
  return <group ref={ref} scale={spec.scale ?? 1}>
      <Vehicle spec={spec} />
    </group>;
}
function ParkedVehicle({
  spec,
  position
}) {
  const [x, z] = position ?? [0, 0];
  return <group position={[x, 0.05, z]} rotation={[0, PARKING.rotationY, 0]} scale={spec.scale ?? 1}>
      <Vehicle spec={spec} />
    </group>;
}
function Vehicle({ spec }) {
  if (spec.kind === "bus") return <Bus color={spec.color} accent={spec.trim} />;
  return <Camper color={spec.color} trim={spec.trim} />;
}
function Wheel({ position, radius = 0.15 }) {
  return <group position={position}>
      <SoftCylinder
    radiusTop={radius}
    radiusBottom={radius}
    height={0.1}
    segments={16}
    material={MAT.tire()}
    rotation={[0, 0, Math.PI / 2]}
  />
      <SoftCylinder
    radiusTop={radius * 0.5}
    radiusBottom={radius * 0.5}
    height={0.115}
    segments={12}
    material={MAT.hub()}
    rotation={[0, 0, Math.PI / 2]}
    castShadow={false}
  />
    </group>;
}
function WheelSet({ axles, radius }) {
  return <>
      {axles.map((p, i) => <Wheel key={i} position={p} radius={radius} />)}
    </>;
}
function Bus({ color, accent }) {
  const L = 1.55;
  const W = 0.68;
  const H = 0.56;
  const body = mat(color, MATERIAL.vehicle);
  const roof = accent ? mat(accent, MATERIAL.vehicle) : MAT.busWhite();
  const glass = MAT.glass();
  const axles = [
    [W / 2 - 0.03, 0.15, L / 2 - 0.3],
    [-(W / 2 - 0.03), 0.15, L / 2 - 0.3],
    [W / 2 - 0.03, 0.15, -L / 2 + 0.36],
    [-(W / 2 - 0.03), 0.15, -L / 2 + 0.36]
  ];
  return <group>
      {/* Carroceria hinchada */}
      <SoftBox size={[W, H, L]} radius={0.2} material={body} position={[0, 0.36, 0]} />
      {/* Techo */}
      <SoftBox
    size={[W * 0.94, 0.14, L * 0.96]}
    radius={0.07}
    material={roof}
    position={[0, 0.36 + H / 2 + 0.02, 0]}
  />
      {/* Cintura inferior */}
      <SoftBox
    size={[W + 0.02, 0.12, L * 0.97]}
    radius={0.055}
    material={MAT.busWhite()}
    position={[0, 0.19, 0]}
  />

      {/* Parabrisas y luneta */}
      <SoftBox
    size={[W * 0.8, 0.28, 0.06]}
    radius={0.03}
    material={glass}
    position={[0, 0.5, L / 2 - 0.02]}
    castShadow={false}
  />
      <SoftBox
    size={[W * 0.78, 0.24, 0.06]}
    radius={0.03}
    material={glass}
    position={[0, 0.5, -L / 2 + 0.02]}
    castShadow={false}
  />
      {/* Ventanillas laterales */}
      {[-1, 1].map(
    (s) => [0.26, -0.32].map((z) => <SoftBox
      key={`${s}-${z}`}
      size={[0.06, 0.22, 0.38]}
      radius={0.028}
      material={glass}
      position={[s * W / 2 - s * 0.02, 0.5, z]}
      castShadow={false}
    />)
  )}

      {/* Faros */}
      {[-1, 1].map((s) => <Puff
    key={s}
    radius={0.055}
    material={MAT.lamp()}
    position={[s * W / 3, 0.26, L / 2 - 0.01]}
    castShadow={false}
  />)}

      <WheelSet axles={axles} radius={0.15} />
    </group>;
}
function Camper({ color, trim }) {
  const L = 1.5;
  const W = 0.66;
  const body = mat(color, MATERIAL.vehicle);
  const top = trim ? mat(trim, MATERIAL.vehicle) : body;
  const glass = MAT.glassDark();
  const chrome = MAT.chrome();
  const tireM = MAT.tire();
  const axles = [
    [W / 2 - 0.02, 0.145, L / 2 - 0.3],
    [-(W / 2 - 0.02), 0.145, L / 2 - 0.3],
    [W / 2 - 0.02, 0.145, -L / 2 + 0.3],
    [-(W / 2 - 0.02), 0.145, -L / 2 + 0.3]
  ];
  return <group>
      {/* Chasis / bajos */}
      <SoftBox
    size={[W * 0.94, 0.2, L * 0.98]}
    radius={0.07}
    material={tireM}
    position={[0, 0.2, 0]}
  />

      {/* Carroceria baja + linea de faldones */}
      <SoftBox size={[W, 0.3, L]} radius={0.11} material={body} position={[0, 0.33, 0]} />
      {/* Capo frontal, un punto mas estrecho */}
      <SoftBox
    size={[W * 0.92, 0.14, 0.34]}
    radius={0.06}
    material={body}
    position={[0, 0.3, L / 2 - 0.14]}
  />

      {/* Cabineta: mas estrecha, retrasada */}
      <SoftBox
    size={[W * 0.94, 0.3, 0.78]}
    radius={0.1}
    material={body}
    position={[0, 0.6, -0.16]}
  />

      {/* Parabrisas inclinado */}
      <SoftBox
    size={[W * 0.78, 0.26, 0.06]}
    radius={0.03}
    material={glass}
    position={[0, 0.62, 0.22]}
    rotation={[-0.3, 0, 0]}
    castShadow={false}
  />
      {/* Ventanillas laterales */}
      {[-1, 1].map((s) => <SoftBox
    key={s}
    size={[0.06, 0.2, 0.6]}
    radius={0.028}
    material={glass}
    position={[s * W * 0.94 / 2 - s * 0.02, 0.63, -0.18]}
    castShadow={false}
  />)}
      {/* Luneta trasera */}
      <SoftBox
    size={[W * 0.7, 0.2, 0.06]}
    radius={0.028}
    material={glass}
    position={[0, 0.62, -0.55]}
    castShadow={false}
  />

      {/* Techo de la cabineta */}
      <SoftBox
    size={[W * 0.96, 0.09, 0.84]}
    radius={0.045}
    material={top}
    position={[0, 0.78, -0.16]}
  />

      {/* Parrilla frontal con lamas */}
      <SoftBox
    size={[W * 0.62, 0.2, 0.06]}
    radius={0.03}
    material={chrome}
    position={[0, 0.3, L / 2 - 0.02]}
  />
      {[-1.5, -0.5, 0.5, 1.5].map((k) => <SoftBox
    key={k}
    size={[0.035, 0.17, 0.03]}
    radius={0.014}
    material={tireM}
    position={[k * 0.1, 0.3, L / 2 + 0.01]}
    castShadow={false}
  />)}

      {/* Faros redondos */}
      {[-1, 1].map((s) => <Puff
    key={s}
    radius={0.06}
    material={MAT.lamp()}
    position={[s * W * 0.32, 0.33, L / 2 - 5e-3]}
    castShadow={false}
  />)}
      {/* Pilotos traseros */}
      {[-1, 1].map((s) => <Puff
    key={`r-${s}`}
    radius={0.04}
    material={mat(COLORS.personRed, { roughness: 0.6 })}
    position={[s * W * 0.3, 0.33, -L / 2 + 5e-3]}
    castShadow={false}
  />)}

      {/* Parachoques */}
      <SoftBox
    size={[W + 0.04, 0.09, 0.07]}
    radius={0.035}
    material={chrome}
    position={[0, 0.2, L / 2 + 0.01]}
  />
      <SoftBox
    size={[W + 0.04, 0.09, 0.07]}
    radius={0.035}
    material={chrome}
    position={[0, 0.2, -L / 2 - 0.01]}
  />

      {/* Baca: dos largueros + travesaños */}
      {[-1, 1].map((s) => <SoftBox
    key={`rail-${s}`}
    size={[0.045, 0.045, 0.9]}
    radius={0.02}
    material={chrome}
    position={[s * W * 0.3, 0.85, -0.16]}
  />)}
      {[-0.42, 0.02, 0.42].map((z) => <SoftBox
    key={`bar-${z}`}
    size={[W * 0.68, 0.04, 0.05]}
    radius={0.018}
    material={chrome}
    position={[0, 0.85, -0.16 + z]}
  />)}
      {/* Bidon y caja de tooling sobre la baca */}
      <SoftBox
    size={[0.16, 0.16, 0.16]}
    radius={0.05}
    material={top}
    position={[-W * 0.22, 0.94, -0.4]}
  />
      <SoftBox
    size={[0.24, 0.14, 0.34]}
    radius={0.05}
    material={mat(COLORS.crate, MATERIAL.soft)}
    position={[W * 0.2, 0.93, 0.02]}
  />

      {/* Escalera lateral */}
      {[-1, 1].map((s) => <SoftBox
    key={`lad-${s}`}
    size={[0.03, 0.42, 0.03]}
    radius={0.014}
    material={chrome}
    position={[s * (W / 2 + 0.015), 0.44, -L / 2 + 0.16]}
    castShadow={false}
  />)}
      {[0.3, 0.42, 0.54].map((y) => <SoftBox
    key={`rung-${y}`}
    size={[0.05, 0.028, 0.028]}
    radius={0.012}
    material={chrome}
    position={[0, y, -L / 2 + 0.16]}
    castShadow={false}
  />)}

      {/* Rueda de repuesto en la puerta trasera */}
      <SoftCylinder
    radiusTop={0.14}
    radiusBottom={0.14}
    height={0.08}
    segments={16}
    material={tireM}
    position={[W * 0.22, 0.42, -L / 2 - 0.05]}
    rotation={[0, 0, Math.PI / 2]}
  />

      {/* Snorkel */}
      <SoftCylinder
    radiusTop={0.022}
    radiusBottom={0.022}
    height={0.34}
    material={chrome}
    position={[-W * 0.38, 0.66, 0.24]}
    castShadow={false}
  />

      <WheelSet axles={axles} radius={0.145} />
    </group>;
}
