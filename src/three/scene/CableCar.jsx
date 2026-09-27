import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLORS } from '../lib/palette';
import { mat, MAT } from '../lib/materials';
import { CABLE_TOWERS, STATION, CABINS, CABIN_COLORS, CABLE_SAG } from '../lib/layout';
import { roundedSlabTop } from '../lib/geometry';
import { SoftBox, SoftCylinder } from './primitives';

/**
 * Teleférico: estacion, torres, cable y cabinas.
 *
 * El cable se dibuja como tubo y no con el componente `Line` de
 * @react-three/drei. WebGL ignora `linewidth` en `LineBasicMaterial`, asi que
 * una linea normal se veria como un pelo de un pixel a cualquier distancia; el
 * tubo tiene grosor real en unidades de mundo, que es lo que hace falta para
 * que se lean los dos cables tendidos entre torres.
 */
export function CableCar() {
  const cablePoints = useMemo(() => buildCableCurve(), []);
  const cablePoints2 = useMemo(() => buildCableCurve(0.5), []);

  return (
    <group name="CableCar">
      <Station />
      {CABLE_TOWERS.map((tower, i) => (
        <Tower key={`tower-${i}`} position={tower.position} height={tower.height} />
      ))}

      <Cable points={cablePoints} radius={0.022} opacity={0.75} />
      <Cable points={cablePoints2} radius={0.016} opacity={0.55} />

      {CABINS.map((t, i) => (
        <Cabin
          key={`cabin-${i}`}
          t={t}
          index={i}
          curve={cablePoints}
          color={CABIN_COLORS[i % CABIN_COLORS.length]}
        />
      ))}
    </group>
  );
}

/** Un tramo de cable como tubo, reutilizando la geometria entre renders. */
function Cable({ points, radius, opacity }) {
  const geometry = useMemo(() => {
    if (points.length < 2) return null;
    const curve = new THREE.CatmullRomCurve3(
      points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    );
    return new THREE.TubeGeometry(curve, points.length * 2, radius, 6, false);
  }, [points, radius]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry} castShadow={false} receiveShadow={false}>
      <meshStandardMaterial
        color={COLORS.cableSteel}
        roughness={0.6}
        metalness={0.2}
        transparent
        opacity={opacity}
      />
    </mesh>
  );
}

function buildCableCurve(offset = 0) {
  const pts = [];
  for (let i = 0; i < CABLE_TOWERS.length - 1; i += 1) {
    const a = CABLE_TOWERS[i];
    const b = CABLE_TOWERS[i + 1];
    const steps = 10;
    for (let s = 0; s < steps; s += 1) {
      const t = s / steps;
      const x = a.position[0] + (b.position[0] - a.position[0]) * t;
      const z = a.position[2] + (b.position[2] - a.position[2]) * t;
      const y = a.height + (b.height - a.height) * t - Math.sin(t * Math.PI) * CABLE_SAG;
      pts.push([x + offset, y, z]);
    }
  }
  const last = CABLE_TOWERS[CABLE_TOWERS.length - 1];
  pts.push([last.position[0] + offset, last.height, last.position[2]]);
  return pts;
}

function cableLength(points) {
  let l = 0;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (let i = 1; i < points.length; i += 1) {
    a.set(...points[i - 1]);
    b.set(...points[i]);
    l += a.distanceTo(b);
  }
  return l;
}

function Tower({ position, height }) {
  const steel = MAT.tower();
  const roller = MAT.cabinFrame();
  return (
    <group position={position}>
      <SoftCylinder
        radiusTop={0.19}
        radiusBottom={0.24}
        height={0.1}
        material={MAT.stone()}
        position={[0, 0.05, 0]}
        receiveShadow
      />
      <SoftCylinder
        radiusTop={0.05}
        radiusBottom={0.09}
        height={height}
        segments={10}
        material={steel}
        position={[0, height / 2 + 0.05, 0]}
      />
      {/* Cruceta con roldanas */}
      <SoftBox
        size={[0.5, 0.07, 0.11]}
        radius={0.03}
        material={roller}
        position={[0, height + 0.11, 0]}
      />
      {[-0.19, 0.19].map((x) => (
        <SoftCylinder
          key={x}
          radiusTop={0.05}
          radiusBottom={0.05}
          height={0.06}
          segments={10}
          material={roller}
          position={[x, height + 0.16, 0]}
          castShadow={false}
        />
      ))}
    </group>
  );
}

function Station() {
  const { position, rotationY, width, depth, height } = STATION;
  const padGeo = useMemo(
    () => roundedSlabTop(width + 0.7, depth + 0.9, 0.5, 0.16, 0.05),
    [width, depth],
  );
  const shell = MAT.kioskBody();
  const steel = MAT.cabinFrame();
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={padGeo} material={MAT.curb()} receiveShadow castShadow />

      <SoftBox
        size={[width, height, depth]}
        radius={0.3}
        material={shell}
        position={[0, height / 2 + 0.16, 0]}
        smoothness={4}
      />
      <SoftBox
        size={[width + 0.06, 0.14, depth + 0.06]}
        radius={0.06}
        material={MAT.stone()}
        position={[0, 0.19, 0]}
      />
      <SoftBox
        size={[width + 0.14, 0.26, depth + 0.14]}
        radius={0.12}
        material={MAT.roof()}
        position={[0, height + 0.3, 0]}
      />

      {/* Vidrio de la estacion */}
      <SoftBox
        size={[width * 0.74, height * 0.34, 0.06]}
        radius={0.03}
        material={MAT.glass()}
        position={[0, height * 0.58 + 0.16, depth / 2 - 0.02]}
        castShadow={false}
      />
      {[-1, 1].map((s) => (
        <SoftBox
          key={s}
          size={[0.06, height * 0.3, depth * 0.56]}
          radius={0.028}
          material={MAT.glass()}
          position={[s * (width / 2) - s * 0.02, height * 0.58 + 0.16, 0]}
          castShadow={false}
        />
      ))}

      {/* Marquesina sobre el anden */}
      <SoftBox
        size={[width * 0.94, 0.08, 0.74]}
        radius={0.035}
        material={MAT.busWhite()}
        position={[0, height + 0.06, depth / 2 + 0.4]}
      />
      {[-1, 1].map((s) => (
        <SoftCylinder
          key={s}
          radiusTop={0.04}
          radiusBottom={0.04}
          height={height - 0.06}
          segments={8}
          material={steel}
          position={[s * (width * 0.38), height / 2 + 0.2, depth / 2 + 0.66]}
        />
      ))}
    </group>
  );
}

const HANG = 0.58;

function Cabin({ t, index, curve, color }) {
  const ref = useRef(null);
  const total = useMemo(() => cableLength(curve), [curve]);
  const frame = MAT.cabinFrame();
  const bodyMat = mat(color, { roughness: 0.72, metalness: 0.02 });
  const glass = mat(COLORS.glassCabin, {
    roughness: 0.4,
    metalness: 0,
    transparent: true,
    opacity: 0.65,
  });
  const start = useMemo(() => total * t, [total, t]);

  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    if (index !== 2) return;
    const travel = (clock.elapsedTime * 0.45) % (total * 2);
    const d = travel <= total ? travel : total * 2 - travel;
    const { point, tangent } = sampleCable(curve, d);
    g.position.set(point.x, point.y - HANG, point.z);
    g.rotation.y = Math.atan2(tangent.x, tangent.z);
  });

  const { point, tangent } = sampleCable(curve, start);
  return (
    <group
      ref={ref}
      position={[point.x, point.y - HANG, point.z]}
      rotation={[0, Math.atan2(tangent.x, tangent.z), 0]}
    >
      {/* Brazo de sujeccion */}
      <SoftBox size={[0.04, HANG, 0.04]} radius={0.018} material={frame} position={[0, HANG / 2 + 0.05, 0]} />
      <SoftCylinder
        radiusTop={0.055}
        radiusBottom={0.055}
        height={0.14}
        segments={10}
        material={frame}
        position={[0, HANG - 0.02, 0]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow={false}
      />

      {/* Cuerpo hinchado */}
      <SoftBox
        size={[0.4, 0.38, 0.48]}
        radius={0.16}
        material={bodyMat}
        smoothness={4}
      />
      {/* Cristal */}
      <SoftBox size={[0.32, 0.24, 0.05]} radius={0.024} material={glass} position={[0, 0.02, 0.22]} castShadow={false} />
      <SoftBox size={[0.32, 0.24, 0.05]} radius={0.024} material={glass} position={[0, 0.02, -0.22]} castShadow={false} />
      {[-1, 1].map((s) => (
        <SoftBox
          key={s}
          size={[0.05, 0.24, 0.4]}
          radius={0.024}
          material={glass}
          position={[s * 0.18, 0.02, 0]}
          castShadow={false}
        />
      ))}
      {/* Techo y base */}
      <SoftBox size={[0.44, 0.08, 0.52]} radius={0.038} material={frame} position={[0, 0.22, 0]} />
      <SoftBox size={[0.42, 0.09, 0.5]} radius={0.04} material={frame} position={[0, -0.16, 0]} />
    </group>
  );
}

function sampleCable(points, distance) {
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  let remaining = Math.max(0, distance);
  for (let i = 1; i < points.length; i += 1) {
    a.set(...points[i - 1]);
    b.set(...points[i]);
    const seg = a.distanceTo(b);
    if (remaining <= seg || i === points.length - 1) {
      const t = seg === 0 ? 0 : Math.min(1, remaining / seg);
      const point = a.clone().lerp(b, t);
      const tangent = b.clone().sub(a).normalize();
      return { point, tangent };
    }
    remaining -= seg;
  }
  return {
    point: new THREE.Vector3(...points[0]),
    tangent: new THREE.Vector3(0, 0, 1),
  };
}
