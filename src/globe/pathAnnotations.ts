import { geoDistance, geoInterpolate } from "d3-geo";
import {
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector3,
} from "three";
import type { PerspectiveCamera, Group } from "three";

const point = ([lng, lat]: number[], radius = 1.005) => {
  const a = (lat * Math.PI) / 180,
    b = (lng * Math.PI) / 180;
  return new Vector3(
    Math.cos(a) * Math.sin(b),
    Math.sin(a),
    Math.cos(a) * Math.cos(b),
  ).multiplyScalar(radius);
};

/** A screen-sized tip is anchored at exactly the line's surface endpoint. */
export function pathArrowhead(
  coordinates: number[][],
  color: string,
  opacity: number,
) {
  if (coordinates.length < 2) return;
  const end = coordinates.at(-1)!;
  const previous = coordinates.at(-2)!;
  if (geoDistance(previous as [number, number], end as [number, number]) < 1e-8)
    return;
  const arrow = new Mesh(
    new BufferGeometry().setFromPoints([point(end), point(end), point(end)]),
    new MeshBasicMaterial({
      color,
      opacity,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: DoubleSide,
    }),
  );
  arrow.name = "path-arrowhead";
  arrow.userData.tip = point(end);
  arrow.userData.previous = point(previous);
  arrow.visible = false;
  arrow.frustumCulled = false;
  arrow.renderOrder = 5;
  arrow.raycast = () => {};
  return arrow;
}

function facesCamera(anchor: Vector3, group: Group, camera: PerspectiveCamera) {
  const center = group.getWorldPosition(new Vector3());
  const cameraPosition = camera.getWorldPosition(new Vector3());
  return anchor.clone().sub(center).dot(cameraPosition.sub(anchor)) > 0;
}

/** Project the final segment so zoom and grazing angles cannot enlarge or lift the tip. */
export function viewPathArrowhead(
  arrow: Mesh,
  group: Group,
  camera: PerspectiveCamera,
  width: number,
  height: number,
) {
  group.updateWorldMatrix(true, true);
  const anchor = (arrow.userData.tip as Vector3)
    .clone()
    .applyMatrix4(group.matrixWorld);
  const tip = anchor.clone().project(camera);
  const previous = (arrow.userData.previous as Vector3)
    .clone()
    .applyMatrix4(group.matrixWorld)
    .project(camera);
  const dx = ((tip.x - previous.x) * width) / 2,
    dy = ((tip.y - previous.y) * height) / 2;
  const distance = Math.hypot(dx, dy);
  arrow.visible =
    distance > 0.01 &&
    facesCamera(anchor, group, camera) &&
    tip.z > -1 &&
    tip.z < 1 &&
    Math.abs(tip.x) < 1 - 16 / width &&
    Math.abs(tip.y) < 1 - 16 / height;
  if (!arrow.visible) return;
  const x = dx / distance,
    y = dy / distance;
  const inverse = group.matrixWorld.clone().invert();
  const vertices = [
    [0, 0],
    [-7 * x - 2.5 * y, -7 * y + 2.5 * x],
    [-7 * x + 2.5 * y, -7 * y - 2.5 * x],
  ];
  const positions = arrow.geometry.getAttribute("position");
  vertices.forEach(([offsetX, offsetY], i) => {
    const vertex = new Vector3(
      tip.x + (offsetX * 2) / width,
      tip.y + (offsetY * 2) / height,
      tip.z,
    )
      .unproject(camera)
      .applyMatrix4(inverse);
    positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
  });
  positions.needsUpdate = true;
}

export function pathLabel(
  coordinates: number[][],
  text: string,
  color: string,
) {
  if (coordinates.length < 2 || !text.trim()) return;
  const middle = Math.max(1, Math.floor(coordinates.length / 2));
  const a = coordinates[middle - 1] as [number, number],
    b = coordinates[middle] as [number, number];
  const anchor = point(geoInterpolate(a, b)(0.5));
  const tangent = point(b)
    .sub(point(a))
    .projectOnPlane(anchor.clone().normalize())
    .normalize();
  const canvas = document.createElement("canvas"),
    context = canvas.getContext("2d");
  if (!context) return;
  const font = '500 32px "Manrope", sans-serif';
  context.font = font;
  canvas.width = Math.ceil(context.measureText(text).width) + 16;
  canvas.height = 48;
  context.font = font;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.lineWidth = 6;
  context.strokeStyle = "#071217";
  context.strokeText(text, canvas.width / 2, 24);
  context.fillStyle = "#ffffff";
  context.fillText(text, canvas.width / 2, 24);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const label = new Sprite(
    new SpriteMaterial({
      map: texture,
      color,
      transparent: true,
      depthWrite: false,
      // Visibility is controlled at the anchor, never by slicing the text quad into land.
      depthTest: false,
    }),
  );
  label.name = "path-label";
  label.position.copy(anchor);
  label.center.set(0.5, -0.2);
  label.visible = false;
  label.renderOrder = 6;
  label.raycast = () => {};
  label.userData.aspect = canvas.width / canvas.height;
  label.userData.tangent = tangent;
  label.userData.start = point(coordinates[0]);
  label.userData.end = point(coordinates.at(-1)!);
  return label;
}

/** Keep text upright and aligned with the projected path as the globe rotates. */
export function viewPathLabel(
  label: Sprite,
  group: Group,
  camera: PerspectiveCamera,
  width: number,
  height: number,
) {
  group.updateWorldMatrix(true, true);
  const anchor = label.getWorldPosition(new Vector3());
  const front = facesCamera(anchor, group, camera);
  const projected = anchor.clone().project(camera);
  const project = (p: Vector3) =>
    p.clone().applyMatrix4(group.matrixWorld).project(camera);
  const start = project(label.userData.start),
    end = project(label.userData.end);
  const span = Math.hypot(
    ((end.x - start.x) * width) / 2,
    ((end.y - start.y) * height) / 2,
  );
  label.visible =
    front &&
    projected.z > -1 &&
    projected.z < 1 &&
    Math.abs(projected.x) < 0.98 &&
    Math.abs(projected.y) < 0.98 &&
    span > 35;
  if (!label.visible) return;
  const next = project(
    label.position.clone().addScaledVector(label.userData.tangent, 0.01),
  );
  let rotation = Math.atan2(
    (next.y - projected.y) * height,
    (next.x - projected.x) * width,
  );
  if (rotation > Math.PI / 2) rotation -= Math.PI;
  if (rotation < -Math.PI / 2) rotation += Math.PI;
  label.material.rotation = rotation;
  const eye = anchor.clone().applyMatrix4(camera.matrixWorldInverse);
  const pixel =
    (-eye.z * 2 * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(1, height);
  const scale = group.getWorldScale(new Vector3());
  label.scale.set(
    (14 * pixel * label.userData.aspect) / scale.x,
    (14 * pixel) / scale.y,
    1,
  );
}
