import { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CAMERA, FRAME_BOX } from "../lib/layout";
const UP = new THREE.Vector3(0, 1, 0);
export function CameraRig() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const framing = useMemo(() => {
    const eye = new THREE.Vector3(...CAMERA.position);
    const target = new THREE.Vector3(...CAMERA.target);
    const forward = target.clone().sub(eye).normalize();
    const right = new THREE.Vector3().crossVectors(forward, UP).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward);
    const min = new THREE.Vector3(...FRAME_BOX.min);
    const max = new THREE.Vector3(...FRAME_BOX.max);
    const v = new THREE.Vector3();
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < 8; i++) {
      v.set(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z).sub(eye);
      const cx = v.dot(right);
      const cy = v.dot(up);
      const cz = v.dot(forward);
      minX = Math.min(minX, cx);
      maxX = Math.max(maxX, cx);
      minY = Math.min(minY, cy);
      maxY = Math.max(maxY, cy);
      minZ = Math.min(minZ, cz);
      maxZ = Math.max(maxZ, cz);
    }
    const spanX = Math.max(1e-3, maxX - minX);
    const spanY = Math.max(1e-3, maxY - minY) + (maxZ - minZ) * 0.1;
    const zoom = Math.min(size.width / spanX, size.height / spanY) * CAMERA.fill;
    const position = eye.clone().addScaledVector(right, (minX + maxX) / 2).addScaledVector(up, (minY + maxY) / 2);
    return { position, zoom: zoom > 0 ? zoom : 1 };
  }, [size.width, size.height]);
  useLayoutEffect(() => {
    camera.position.copy(framing.position);
    camera.zoom = framing.zoom;
    camera.near = -220;
    camera.far = 420;
    camera.updateProjectionMatrix();
  }, [camera, framing]);
  return null;
}
