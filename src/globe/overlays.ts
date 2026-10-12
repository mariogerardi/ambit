import { geoCircle, geoDistance, geoInterpolate } from "d3-geo";
import {
  Group,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
} from "three";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import type { MapOverlay } from "../geography/types";
import { EARTH_KM } from "../game/spatial";

const radians = Math.PI / 180;
function surfacePoint(lng: number, lat: number, radius = 1.005) {
  const phi = lat * radians,
    theta = lng * radians;
  return [
    radius * Math.cos(phi) * Math.sin(theta),
    radius * Math.sin(phi),
    radius * Math.cos(phi) * Math.cos(theta),
  ];
}
export function overlayPositions(
  overlay: Exclude<MapOverlay, { type: "texture" }>,
) {
  const coordinates: number[][] = [];
  if (overlay.type === "circle")
    coordinates.push(
      ...geoCircle()
        .center([overlay.center.lng, overlay.center.lat])
        .radius(overlay.radiusKm / EARTH_KM / radians)
        .precision(0.5)().coordinates[0],
    );
  else if (overlay.type === "parallel")
    for (let i = 0; i <= 720; i++)
      coordinates.push([-180 + i / 2, overlay.latitude]);
  else if (overlay.type === "meridian")
    for (let i = 0; i <= 360; i++)
      coordinates.push([overlay.longitude, -90 + i / 2]);
  else
    for (let i = 1; i < overlay.coordinates.length; i++) {
      const from = overlay.coordinates[i - 1] as [number, number];
      const to = overlay.coordinates[i] as [number, number];
      const steps = Math.max(
        1,
        Math.ceil(geoDistance(from, to) / radians / 0.5),
      );
      const interpolate = geoInterpolate(from, to);
      if (i === 1) coordinates.push(from);
      for (let step = 1; step <= steps; step++)
        coordinates.push(interpolate(step / steps));
    }
  const positions: number[] = [];
  for (let i = 1; i < coordinates.length; i++)
    positions.push(
      ...surfacePoint(...(coordinates[i - 1] as [number, number])),
      ...surfacePoint(...(coordinates[i] as [number, number])),
    );
  return new Float32Array(positions);
}
export function makeMapOverlay(overlay: MapOverlay, globeRadius: number) {
  const group = new Group();
  group.scale.setScalar(globeRadius);
  if (overlay.type === "texture") {
    // Match the globe's longitude convention; Three's default sphere starts at
    // −90°, while the texture's left edge is the −180° antimeridian.
    const geometry = new SphereGeometry(1.003, 192, 96);
    geometry.rotateY(-Math.PI / 2);
    const material = new MeshBasicMaterial({
      transparent: true,
      opacity: overlay.opacity,
      depthWrite: false,
    });
    const mesh = new Mesh(geometry, material);
    mesh.visible = false;
    mesh.renderOrder = 2;
    mesh.raycast = () => {};
    let disposed = false;
    group.userData.dispose = () => {
      disposed = true;
    };
    const texture = new TextureLoader().load(overlay.assetUrl, (loaded) => {
      if (disposed) {
        loaded.dispose();
        return;
      }
      mesh.visible = true;
    });
    texture.colorSpace = SRGBColorSpace;
    material.map = texture;
    group.add(mesh);
    group.raycast = () => {};
    return group;
  }
  const line = new LineSegments2(
    new LineSegmentsGeometry().setPositions(overlayPositions(overlay)),
    new LineMaterial({
      color: "#efd18f",
      linewidth: 1.8,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      alphaToCoverage: true,
      opacity: overlay.type === "path" ? (overlay.opacity ?? 1) : 1,
      dashed: overlay.type === "path" && !!overlay.dashed,
      dashSize: 0.008,
      gapSize: 0.005,
    }),
  );
  line.renderOrder = 4;
  if (overlay.type === "path" && overlay.dashed) line.computeLineDistances();
  line.raycast = () => {};
  group.add(line);
  if (overlay.type === "circle" && overlay.shade) {
    // Shade a geodesic disk in globe coordinates. The fragment test also works
    // at poles and across the antimeridian without a projected polygon seam.
    const material = new ShaderMaterial({
      transparent: true,
      depthTest: true,
      depthWrite: false,
      uniforms: {
        center: {
          value: new Vector3(
            ...surfacePoint(overlay.center.lng, overlay.center.lat, 1),
          ),
        },
        threshold: { value: Math.cos(overlay.radiusKm / EARTH_KM) },
      },
      vertexShader:
        "varying vec3 surface; void main() { surface = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader:
        "varying vec3 surface; uniform vec3 center; uniform float threshold; void main() { if(dot(normalize(surface), center) < threshold) discard; gl_FragColor = vec4(0.94, 0.78, 0.44, 0.16); }",
    });
    const disk = new Mesh(new SphereGeometry(1.004, 128, 96), material);
    disk.renderOrder = 3;
    disk.raycast = () => {};
    group.add(disk);
  }
  group.raycast = () => {};
  return group;
}

/** Each mounted globe owns overlay resources and reuses them across flyovers. */
export class MapOverlays {
  private objects = new Map<string, { signature: string; group: Group }>();
  get(overlay: MapOverlay, radius: number) {
    const signature = JSON.stringify(
      overlay.type === "texture"
        ? [overlay.type, overlay.assetUrl, overlay.opacity]
        : overlay.type === "path"
          ? [overlay.type, overlay.coordinates, overlay.dashed, overlay.opacity]
          : overlay.type === "circle"
            ? [overlay.type, overlay.center, overlay.radiusKm, overlay.shade]
            : overlay.type === "parallel"
              ? [overlay.type, overlay.latitude]
              : [overlay.type, overlay.longitude],
    );
    let entry = this.objects.get(overlay.id);
    if (!entry || entry.signature !== signature) {
      if (entry) this.disposeGroup(entry.group);
      entry = { signature, group: makeMapOverlay(overlay, radius) };
      this.objects.set(overlay.id, entry);
    }
    entry.group.scale.setScalar(radius);
    return entry.group;
  }
  private disposeGroup(group: Group) {
    group.userData.dispose?.();
    group.traverse((obj) => {
      if (!(obj instanceof Mesh)) return;
      obj.geometry.dispose();
      for (const material of Array.isArray(obj.material)
        ? obj.material
        : [obj.material]) {
        if (material instanceof MeshBasicMaterial) material.map?.dispose();
        material.dispose();
      }
    });
  }
  dispose() {
    for (const { group } of this.objects.values()) this.disposeGroup(group);
    this.objects.clear();
  }
}
