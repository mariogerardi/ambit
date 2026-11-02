import { Vector3 } from "three";
import type { PerspectiveCamera } from "three";

/** Reveal only after the geographic anchor clears the horizon, viewport and UI. */
export function geographicPointVisible(
  point: { lat: number; lng: number },
  camera: PerspectiveCamera,
  width: number,
  height: number,
  radius: number,
  reserved: readonly {
    left: number;
    right: number;
    top: number;
    bottom: number;
  }[] = [],
) {
  if (!width || !height) return false;
  const lat = (point.lat * Math.PI) / 180,
    lng = (point.lng * Math.PI) / 180;
  const anchor = new Vector3(
    Math.cos(lat) * Math.sin(lng),
    Math.sin(lat),
    Math.cos(lat) * Math.cos(lng),
  );
  if (
    anchor.dot(camera.position.clone().normalize()) <=
    radius / camera.position.length()
  )
    return false;
  const screen = anchor.multiplyScalar(radius * 1.002).project(camera);
  const x = ((screen.x + 1) * width) / 2,
    y = ((1 - screen.y) * height) / 2;
  return (
    screen.z >= -1 &&
    screen.z <= 1 &&
    x >= 12 &&
    x <= width - 12 &&
    y >= 12 &&
    y <= height - 12 &&
    !reserved.some(
      (box) =>
        x >= box.left && x <= box.right && y >= box.top && y <= box.bottom,
    )
  );
}
