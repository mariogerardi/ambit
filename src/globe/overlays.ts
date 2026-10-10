import { geoCircle } from "d3-geo";
import { Group, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from "three";
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
export function overlayPositions(overlay: MapOverlay) {
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
  else
    for (let i = 0; i <= 360; i++)
      coordinates.push([overlay.longitude, -90 + i / 2]);
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
  const line = new LineSegments2(
    new LineSegmentsGeometry().setPositions(overlayPositions(overlay)),
    new LineMaterial({
      color: "#efd18f",
      linewidth: 1.8,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      alphaToCoverage: true,
    }),
  );
  line.renderOrder = 4;
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
