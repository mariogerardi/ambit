import { playColors } from "../theme/playColors";
import type { ThemeId } from "../theme/themes";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
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
  palette?: ThemeId;
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
  private lines = new Map<
    string,
    { line: LineSegments2; rank: number; opacity: number; relief: boolean }
  >();
  private activeLines = new Set<string>();
  private surfaces = new Map<PhysicalFeature, Group>();
  private data?: PhysicalFeature[];
  private featureTokens = new WeakMap<PhysicalFeature, number>();
  private nextFeatureToken = 0;
  private radius = 100;
  private palette: ThemeId = "atlas";
  private labelLevels: PlaceFeature[][] = [[], [], []];
  private labelLevel = -1;
  constructor() {
    this.group.add(this.labels.group);
  }
  refreshFont() {
    this.labels.refreshFont();
  }
  update(layer: PhysicalLayer, radius: number) {
    const palette = layer.palette ?? "atlas";
    if (
      this.data === layer.features &&
      this.radius === radius &&
      this.palette === palette
    )
      return;
    this.palette = palette;
    this.data = layer.features;
    this.radius = radius;
    this.activeLines.clear();
    for (const { line } of this.lines.values()) line.visible = false;
    for (const surface of this.surfaces.values()) surface.visible = false;
    for (const feature of layer.features) {
      if (!feature.geometry && !feature.relief) continue;
      let surface = this.surfaces.get(feature);
      if (!surface) {
        surface = new Group();
        if (feature.relief) {
          // Two batched face meshes for the whole chain. Never fill its footprint.
          for (const [rings, color, opacity] of [
            [feature.relief.lightFaces ?? [], "#c1b79a", 1],
            [feature.relief.darkFaces ?? [], "#99896d", 1],
          ] as const) {
            if (!rings.length) continue;
            const pieces = rings.map(
              (ring) =>
                new ConicPolygonGeometry(
                  [ring],
                  0,
                  radius * (1 + physicalSurfaceAltitude),
                  false,
                  true,
                  false,
                  0.25,
                ),
            );
            const geometry = mergeGeometries(pieces)!;
            for (const piece of pieces) piece.dispose();
            const mesh = new Mesh(
              geometry,
              new MeshBasicMaterial({
                color,
                opacity,
                transparent: false,
                depthWrite: false,
                side: DoubleSide,
                polygonOffset: true,
                polygonOffsetFactor: -1,
                polygonOffsetUnits: -2,
              }),
            );
            mesh.raycast = () => {};
            mesh.renderOrder = 4;
            surface.add(mesh);
          }
        } else {
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
            feature.geometry!.type === "Polygon"
              ? [feature.geometry!.coordinates]
              : feature.geometry!.coordinates;
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
        }
        surface.raycast = () => {};
        this.surfaces.set(feature, surface);
        this.group.add(surface);
      }
      surface.visible = true;
    }
    // An authored variant may retain its ID while changing geometry (lake clearance).
    // Give immutable feature objects stable identities so cached ink cannot leak back.
    const ink = layer.features.flatMap((source): PhysicalFeature[] => {
      let token = this.featureTokens.get(source);
      if (token === undefined)
        this.featureTokens.set(source, (token = this.nextFeatureToken++));
      const feature = { ...source, id: `${source.id}@${token}` };
      if (feature.kind === "river" && feature.paths?.length) {
        const colors = playColors(palette);
        const width = Math.max(2, feature.lineWidth ?? 2) * 0.81;
        return [
          {
            ...feature,
            id: `${feature.id}:casing`,
            color: colors["river-casing"],
            lineWidth: width + 0.5,
            lineOpacity: 1,
          },
          { ...feature, color: colors.river, lineWidth: width, lineOpacity: 1 },
        ];
      }
      return feature.relief
        ? [
            {
              ...feature,
              id: `${feature.id}:ridges`,
              paths: feature.relief.ridges,
              color: "#594932",
              lineWidth: 1.45,
              lineOpacity: 0.92,
            },
            {
              ...feature,
              id: `${feature.id}:slopes`,
              paths: feature.relief.hachures,
              color: "#745a40",
              lineWidth: 1,
              lineOpacity: 0.78,
            },
            {
              ...feature,
              id: `${feature.id}:highlights`,
              paths: feature.relief.highlights,
              color: "#eedbc0",
              lineWidth: 1.45,
              lineOpacity: 0.86,
            },
          ]
        : [feature];
    });
    const groups = [
      ...new Set(
        ink
          .filter((f) => f.paths?.length)
          .map(
            (f) =>
              `${f.rank}|${f.color ?? "#72b9d2"}|${f.lineWidth ?? 1.6}|${f.lineOpacity ?? 0.85}`,
          ),
      ),
    ];
    // Batch river segments by importance: a few draw calls instead of hundreds.
    for (const group of groups) {
      const [rankText, color, widthText, opacityText] = group.split("|");
      const rank = Number(rankText);
      const features = ink.filter(
        (f) =>
          f.rank === rank &&
          (f.color ?? "#72b9d2") === color &&
          (f.lineWidth ?? 1.6) === Number(widthText) &&
          (f.lineOpacity ?? 0.85) === Number(opacityText) &&
          f.paths?.length,
      );
      const key = `${radius}|${group}|${features.map((f) => f.id).join("|")}`;
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
            linewidth: Number(widthText),
            transparent: true,
            opacity: Number(opacityText),
            depthTest: true,
            depthWrite: false,
            alphaToCoverage: true,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -2,
          }),
        );
        line.renderOrder = features.every(
          (f) => f.kind === "river" && !f.id.endsWith(":casing"),
        )
          ? 6
          : 5;
        line.raycast = () => {};
        this.lines.set(key, {
          line,
          rank,
          opacity: Number(opacityText),
          relief: features.some((f) => !!f.relief),
        });
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
          palette: this.palette,
        },
        this.radius,
      );
    }
    this.labels.view(camera, width, height, reserved);
    for (const [key, { line, rank, opacity, relief }] of this.lines) {
      if (relief)
        line.material.opacity =
          opacity * (altitude >= 1.2 ? 0.8 : altitude >= 0.4 ? 0.92 : 1);
      line.visible =
        this.activeLines.has(key) &&
        (altitude < 0.4 || rank <= (altitude < 1.2 ? 5 : 3));
    }
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
