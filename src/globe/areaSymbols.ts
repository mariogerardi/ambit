import { Vector3 } from "three";
import type { PerspectiveCamera } from "three";

/** Fit inside the projected interior disk, including foreshortening near the limb. */
export function areaSymbolSize(
  position: Vector3,
  clearance: number,
  camera: PerspectiveCamera,
  width: number,
  height: number,
  maximum = 30,
) {
  const center = position.clone().normalize();
  const horizontal = new Vector3()
    .crossVectors(
      center,
      Math.abs(center.y) > 0.95 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0),
    )
    .normalize();
  const vertical = new Vector3().crossVectors(center, horizontal).normalize();
  const projected = position.clone().project(camera);
  let radius = Infinity;
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const edge = center
      .clone()
      .multiplyScalar(Math.cos(clearance))
      .addScaledVector(horizontal, Math.sin(clearance) * Math.cos(angle))
      .addScaledVector(vertical, Math.sin(clearance) * Math.sin(angle))
      .multiplyScalar(position.length())
      .project(camera);
    radius = Math.min(
      radius,
      Math.hypot(
        ((edge.x - projected.x) * width) / 2,
        ((edge.y - projected.y) * height) / 2,
      ),
    );
  }
  const size = Math.min(maximum, radius * 1.4);
  // A minimum-size clamp would spill onto neighboring land. Color remains visible.
  return Number.isFinite(size) && size >= 10 ? size : 0;
}
