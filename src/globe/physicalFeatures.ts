import { Group, Mesh, MeshBasicMaterial, DoubleSide } from "three";
import ConicPolygonGeometry from "three-conic-polygon-geometry";
import type { PerspectiveCamera } from "three";
import { geoDistance, geoInterpolate } from "d3-geo";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import type { PhysicalFeature, PlaceFeature } from "../geography/types";
import { PlaceLabels } from "./placeLabels";
import type { LabelBox } from "./placeLabels";
export interface PhysicalLayer {
  id: string;
  kind: "physical-features";
  features: PhysicalFeature[];
}
export const isPhysicalLayer = (v: object): v is PhysicalLayer =>
  "kind" in v && v.kind === "physical-features";
// Clear county caps too, while remaining flush with the administrative surface.
export const physicalSurfaceAltitude = 0.0019;
export function physicalLinePositions(paths: number[][][], radius: number) {
  const positions: number[] = [];
  const point = ([lng, lat]: number[]) => {
    const a = (lat * Math.PI) / 180,
      b = (lng * Math.PI) / 180;
    return [
      Math.cos(a) * Math.sin(b) * radius,
      Math.sin(a) * radius,
      Math.cos(a) * Math.cos(b) * radius,
    ];
  };
  for (const path of paths)
    for (let i = 1; i < path.length; i++) {
      const from = path[i - 1] as [number, number],
        to = path[i] as [number, number];
      const steps = Math.max(
          1,
          Math.ceil(geoDistance(from, to) / ((0.25 * Math.PI) / 180)),
        ),
        interpolate = geoInterpolate(from, to);
      for (let j = 0; j < steps; j++)
        positions.push(
          ...point(interpolate(j / steps)),
          ...point(interpolate((j + 1) / steps)),
        );
    }
  return new Float32Array(positions);
}
/** Independent, reusable physical context. It never changes country answers or picking. */
export class PhysicalFeatures {
  readonly group = new Group();
  private labels = new PlaceLabels();
  private lines = new Map<string, { line: LineSegments2; rank: number }>();
  private activeLines = new Set<string>();
  private surfaces = new Map<PhysicalFeature, Group>();
  private data?: PhysicalFeature[];
  private radius = 100;
  private labelLevels: PlaceFeature[][] = [[], [], []];
  private labelLevel = -1;
  constructor() {
    this.group.add(this.labels.group);
  }
  refreshFont() {
    this.labels.refreshFont();
  }
  update(layer: PhysicalLayer, radius: number) {
    if (this.data === layer.features && this.radius === radius) return;
    this.data = layer.features;
    this.radius = radius;
    this.activeLines.clear();
    for (const { line } of this.lines.values()) line.visible = false;
    for (const surface of this.surfaces.values()) surface.visible = false;
    for (const feature of layer.features) {
      if (!feature.geometry) continue;
      let surface = this.surfaces.get(feature);
      if (!surface) {
        surface = new Group();
        const material = new MeshBasicMaterial({
          color: feature.color ?? "#d7b17d",
          opacity: feature.fillOpacity ?? 0.2,
          transparent: true,
          depthWrite: false,
          side: DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -2,
        });
        const polygons =
          feature.geometry.type === "Polygon"
            ? [feature.geometry.coordinates]
            : feature.geometry.coordinates;
        for (const polygon of polygons) {
          const mesh = new Mesh(
            new ConicPolygonGeometry(
              polygon,
              0,
              radius * (1 + physicalSurfaceAltitude),
              false,
              true,
              false,
              0.25,
            ),
            material,
          );
          mesh.raycast = () => {};
          mesh.renderOrder = 4;
          surface.add(mesh);
        }
        surface.raycast = () => {};
        this.surfaces.set(feature, surface);
        this.group.add(surface);
      }
      surface.visible = true;
    }
    const groups = [
      ...new Set(
        layer.features
          .filter((f) => f.paths?.length)
          .map((f) => `${f.rank}|${f.color ?? "#72b9d2"}`),
      ),
    ];
    // Batch river segments by importance: a few draw calls instead of hundreds.
    for (const group of groups) {
      const [rankText, color] = group.split("|");
      const rank = Number(rankText);
      const features = layer.features.filter(
        (f) =>
          f.rank === rank &&
          (f.color ?? "#72b9d2") === color &&
          f.paths?.length,
      );
      const key = features.map((f) => f.id).join("|");
      this.activeLines.add(key);
      let line = this.lines.get(key)?.line;
      if (!line) {
        line = new LineSegments2(
          new LineSegmentsGeometry().setPositions(
            physicalLinePositions(
              features.flatMap((f) => f.paths!),
              radius * (1 + physicalSurfaceAltitude),
            ),
          ),
          new LineMaterial({
            color,
            linewidth: 1.6,
            transparent: true,
            opacity: 0.85,
            depthTest: true,
            depthWrite: false,
            alphaToCoverage: true,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -2,
          }),
        );
        line.renderOrder = 5;
        line.raycast = () => {};
        this.lines.set(key, { line, rank });
        this.group.add(line);
      }
      line.visible = true;
    }
    this.labelLevels = [3, 5, Infinity].map((limit) =>
      layer.features
        .filter((f) => f.kind !== "river" || f.rank <= limit)
        .flatMap((f) =>
          (f.labelAnchors ?? [[f.lng, f.lat]]).map(([lng, lat], index) => ({
            ...f,
            id: `${f.id}:anchor:${index}`,
            lng,
            lat,
            name:
              f.kind === "river" && !/river/i.test(f.name)
                ? `${f.name} River`
                : f.name,
            sourceId: f.id,
            priority:
              (f.kind === "mountain" || f.kind === "landform"
                ? 1000
                : f.kind === "ocean"
                  ? 500
                  : 0) - f.rank,
          })),
        ),
    );
    this.labelLevel = -1;
    this.group.raycast = () => {};
  }
  labelBoxes(): readonly LabelBox[] {
    return this.labels.labelBoxes();
  }
  needsRefresh() {
    return this.labels.needsRefresh();
  }
  view(
    camera: PerspectiveCamera,
    width: number,
    height: number,
    reserved: readonly LabelBox[] = [],
  ) {
    const altitude = camera.position.length() / this.radius - 1;
    const level = altitude >= 1.2 ? 0 : altitude >= 0.4 ? 1 : 2;
    if (level !== this.labelLevel) {
      this.labelLevel = level;
      this.labels.update(
        {
          id: "physical:names",
          kind: "place-labels",
          places: this.labelLevels[level],
          visible: true,
          markers: false,
          contextual: true,
          density: "physical",
        },
        this.radius,
      );
    }
    this.labels.view(camera, width, height, reserved);
    for (const [key, { line, rank }] of this.lines)
      line.visible =
        this.activeLines.has(key) &&
        (altitude < 0.4 || rank <= (altitude < 1.2 ? 5 : 3));
    // Inactive cached lines stay hidden when changing toggles.
  }
  dispose() {
    this.labels.dispose();
    for (const { line } of this.lines.values()) {
      line.geometry.dispose();
      line.material.dispose();
    }
    this.lines.clear();
    for (const surface of this.surfaces.values()) {
      const materials = new Set<MeshBasicMaterial>();
      for (const object of surface.children) {
        const mesh = object as Mesh<ConicPolygonGeometry, MeshBasicMaterial>;
        mesh.geometry.dispose();
        materials.add(mesh.material);
      }
      for (const material of materials) material.dispose();
    }
    this.surfaces.clear();
    this.group.clear();
    this.data = undefined;
  }
}
