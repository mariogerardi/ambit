import { DEFAULT_THEME } from "../theme/themes";
import { makePaintOverlay } from "./paintOverlay";
import { MAP_ANNOTATION_ALTITUDE } from "./surface";
import { patchGeometry, cellsGeometry } from "./constructionOverlays";
import { bearingSectorGeometry } from "./bearingSector";
import { geoCircle, geoDistance, geoInterpolate } from "d3-geo";
import {
  Group,
  DoubleSide,
  Color,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  Sprite,
  BufferGeometry,
  Float32BufferAttribute,
} from "three";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import type { PerspectiveCamera } from "three";
import {
  pathArrowhead,
  pathLabel,
  viewPathLabel,
  viewPathArrowhead,
  viewPathDashes,
} from "./pathAnnotations";
import type { GeoPoint } from "../game/geodesic";
import type { MapOverlay } from "../geography/types";
import type { ThemeId } from "../theme/themes";
import { pinBandColor, playColors } from "../theme/playColors";
import { EARTH_KM } from "../game/spatial";

export interface OverlayLayer {
  id: string;
  kind: "map-overlays";
  overlays: readonly MapOverlay[];
  palette?: ThemeId;
}
export const isOverlayLayer = (value: object): value is OverlayLayer =>
  "kind" in value && value.kind === "map-overlays";

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
  overlay: Exclude<
    MapOverlay,
    { type: "texture" | "bearing-sector" | "raster-patch" | "cells" | "paint" }
  >,
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
  // Local circles sit just above the shore shell, including over water.
  const radius =
    (overlay.type === "path" && overlay.surfaceAligned) ||
    (overlay.type === "circle" &&
      (overlay.accuracyBand || overlay.radiusKm <= 100))
      ? 1 + MAP_ANNOTATION_ALTITUDE
      : 1.005;
  for (let i = 1; i < coordinates.length; i++)
    positions.push(
      ...surfacePoint(...(coordinates[i - 1] as [number, number]), radius),
      ...surfacePoint(...(coordinates[i] as [number, number]), radius),
    );
  return new Float32Array(positions);
}
function cellsColor(
  overlay: Extract<MapOverlay, { type: "cells" }>,
  palette: ThemeId,
) {
  const color = new Color(playColors(palette)[overlay.visualState]);
  return overlay.prominent ? color.offsetHSL(0, 0.3, -0.04) : color;
}
export function makeMapOverlay(
  overlay: MapOverlay,
  globeRadius: number,
  palette: ThemeId = DEFAULT_THEME,
) {
  if (overlay.type === "paint")
    return makePaintOverlay(overlay, globeRadius, palette);
  const group = new Group();
  group.scale.setScalar(globeRadius);
  if (overlay.type === "raster-patch") {
    const material = new MeshBasicMaterial({
      transparent: true,
      opacity: overlay.opacity,
      depthWrite: false,
      side: DoubleSide,
    });
    const mesh = new Mesh(patchGeometry(overlay.bounds), material);
    mesh.visible = false;
    if (overlay.foreground)
      mesh.geometry.scale(1.006 / 1.004, 1.006 / 1.004, 1.006 / 1.004);
    mesh.renderOrder = overlay.foreground ? 3 : 2;
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
  if (overlay.type === "cells") {
    const mesh = new Mesh(
      cellsGeometry(overlay.grid, overlay.indices, overlay.mask?.bounds),
      new MeshBasicMaterial({
        color: cellsColor(overlay, palette),
        transparent: true,
        opacity: overlay.opacity ?? 0.38,
        depthWrite: false,
        side: DoubleSide,
      }),
    );
    if (overlay.mask) {
      const material = mesh.material;
      let disposed = false;
      mesh.visible = false;
      material.alphaTest = 0.5;
      const mask = new TextureLoader().load(overlay.mask.assetUrl, (loaded) => {
        if (disposed) {
          loaded.dispose();
          return;
        }
        mesh.visible = true;
      });
      material.alphaMap = mask;
      group.userData.dispose = () => {
        disposed = true;
      };
    }
    mesh.renderOrder = 5;
    mesh.raycast = () => {};
    group.add(mesh);
    group.raycast = () => {};
    return group;
  }
  if (overlay.type === "bearing-sector") {
    const mesh = new Mesh(
      bearingSectorGeometry(overlay),
      new MeshBasicMaterial({
        color: playColors(palette).hinted,
        opacity: 0.18,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: DoubleSide,
      }),
    );
    mesh.renderOrder = 3;
    mesh.raycast = () => {};
    group.add(mesh);
    group.raycast = () => {};
    return group;
  }
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
      color:
        (overlay.type === "circle" || overlay.type === "path") &&
        overlay.accuracyBand
          ? pinBandColor(
              overlay.accuracyBand.index,
              overlay.accuracyBand.count,
              palette,
            )
          : (overlay.type === "path" || overlay.type === "circle") &&
              overlay.visualState
            ? playColors(palette)[overlay.visualState]
            : playColors(palette).guide,
      linewidth:
        (overlay.type === "path" && overlay.visualState === "corridor") ||
        (overlay.type === "circle" && overlay.active)
          ? 3
          : 1.8,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      alphaToCoverage: true,
      opacity: overlay.type === "path" ? (overlay.opacity ?? 1) : 1,
      dashed: overlay.type === "path" && !!overlay.dashed,
      dashSize:
        overlay.type === "path" && overlay.dashed === "dotted" ? 1.5 : 4,
      gapSize: overlay.type === "path" && overlay.dashed === "dotted" ? 4.5 : 5,
    }),
  );
  line.renderOrder = overlay.type === "path" && overlay.foreground ? 6 : 4;
  if (overlay.type === "path" && overlay.dashed) line.computeLineDistances();
  line.raycast = () => {};
  group.add(line);
  if (overlay.type === "circle" && overlay.fadeInMs) {
    group.userData.fadeStarted = performance.now();
    group.userData.fading = true;
    line.material.opacity = 0;
  }
  if (overlay.type === "path" && overlay.reveal) {
    line.geometry.instanceCount = 0;
    group.userData.revealStarted = performance.now();
    group.userData.revealing = true;
  }
  if (overlay.type === "path") {
    const color = overlay.visualState
      ? playColors(palette)[overlay.visualState]
      : playColors(palette).guide;
    if (overlay.arrowhead) {
      const arrow = pathArrowhead(
        overlay.coordinates,
        color,
        overlay.opacity ?? 1,
      );
      if (arrow) group.add(arrow);
    }
    if (overlay.label) {
      const label = pathLabel(overlay.coordinates, overlay.label, color);
      if (label) group.add(label);
    }
  }
  if (overlay.type === "circle" && overlay.shade) {
    const construction = !overlay.accuracyBand && overlay.radiusKm <= 100;
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
        bandColor: {
          value: new Color(
            overlay.accuracyBand
              ? pinBandColor(
                  overlay.accuracyBand.index,
                  overlay.accuracyBand.count,
                  palette,
                )
              : overlay.visualState
                ? playColors(palette)[overlay.visualState]
                : playColors(palette).guide,
          ),
        },
        bandOpacity: { value: overlay.active ? 0.13 : 0.045 },
      },
      vertexShader:
        "varying vec3 surface; void main() { surface = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: construction
        ? "uniform vec3 bandColor; uniform float bandOpacity; void main() { gl_FragColor = vec4(bandColor, bandOpacity);\n#include <colorspace_fragment>\n}"
        : "varying vec3 surface; uniform vec3 center; uniform float threshold; uniform vec3 bandColor; uniform float bandOpacity; void main() { if(dot(normalize(surface), center) < threshold) discard; gl_FragColor = vec4(bandColor, bandOpacity);\n#include <colorspace_fragment>\n}",
      ...(construction ? { side: DoubleSide } : {}),
    });
    let geometry: BufferGeometry;
    if (construction) {
      // A small cap needs its own mesh. A coarse whole-sphere mesh can dip under
      // local land, and a cosine shader loses precision for kilometer-scale caps.
      const ring = geoCircle()
        .center([overlay.center.lng, overlay.center.lat])
        .radius(overlay.radiusKm / EARTH_KM / radians)
        .precision(2)().coordinates[0];
      const vertices = surfacePoint(
        overlay.center.lng,
        overlay.center.lat,
        1 + MAP_ANNOTATION_ALTITUDE,
      );
      for (const [lng, lat] of ring)
        vertices.push(...surfacePoint(lng, lat, 1 + MAP_ANNOTATION_ALTITUDE));
      const indices: number[] = [];
      for (let i = 1; i < ring.length; i++) indices.push(0, i, i + 1);
      geometry = new BufferGeometry();
      geometry.setAttribute(
        "position",
        new Float32BufferAttribute(vertices, 3),
      );
      geometry.setIndex(indices);
    } else geometry = new SphereGeometry(1.004, 128, 96);
    const disk = new Mesh(geometry, material);
    disk.renderOrder = 3;
    disk.raycast = () => {};
    group.add(disk);
  }
  group.raycast = () => {};
  return group;
}

/** Each mounted globe owns overlay resources and reuses them across flyovers. */
export class MapOverlays {
  /** Only this stable root is owned by the globe's custom-data mapper. */
  readonly group = new Group();
  private brush?: { group: Group; radiusKm: number };
  /** Transient hover feedback, independent of authored clues and saved answers. */
  previewBrush(
    center?: GeoPoint,
    radiusKm = 160,
    radius = 100,
    palette: ThemeId = DEFAULT_THEME,
  ) {
    if (!center) {
      if (this.brush) this.brush.group.visible = false;
      this.group.visible = this.objects.size > 0;
      return;
    }
    if (!this.brush || this.brush.radiusKm !== radiusKm) {
      if (this.brush) {
        this.brush.group.removeFromParent();
        this.disposeGroup(this.brush.group);
      }
      const group = makeMapOverlay(
        {
          id: "brush-preview",
          type: "circle",
          center: { lat: 90, lng: 0 },
          radiusKm,
          visualState: "selected",
          shade: true,
          active: true,
        },
        radius,
        palette,
      );
      this.brush = { group, radiusKm };
      this.group.add(group);
    }
    const group = this.brush.group;
    // Rotate reusable geometry instead of allocating a circle on every move.
    group.quaternion.setFromUnitVectors(
      new Vector3(0, 1, 0),
      new Vector3(...surfacePoint(center.lng, center.lat, 1)),
    );
    group.scale.setScalar(radius);
    group.visible = this.group.visible = true;
    this.colorBand(
      group,
      {
        id: "brush-preview",
        type: "circle",
        center,
        radiusKm,
        visualState: "selected",
      },
      palette,
    );
  }
  private objects = new Map<
    string,
    { signature: string; group: Group; overlay: MapOverlay }
  >();
  update(layer: OverlayLayer, radius: number) {
    const active = new Set(layer.overlays.map((overlay) => overlay.id));
    for (const [id, entry] of this.objects) {
      if (active.has(id)) continue;
      entry.group.removeFromParent();
      this.disposeGroup(entry.group);
      this.objects.delete(id);
    }
    for (const overlay of layer.overlays) {
      const group = this.get(overlay, radius, layer.palette);
      if (group.parent !== this.group) this.group.add(group);
    }
    this.group.visible = active.size > 0 || !!this.brush?.group.visible;
  }
  needsRefresh() {
    return [...this.objects.values()].some(
      ({ group }) => group.userData.revealing || group.userData.fading,
    );
  }
  view(camera: PerspectiveCamera, width: number, height: number) {
    for (const { group, overlay } of this.objects.values()) {
      if (overlay.type === "path" && overlay.dashed)
        for (const child of group.children)
          if (child instanceof LineSegments2)
            viewPathDashes(child, group, camera, width, height);
      if (
        overlay.type === "circle" &&
        overlay.fadeInMs &&
        group.userData.fading
      ) {
        const t = Math.min(
          1,
          (performance.now() - group.userData.fadeStarted) / overlay.fadeInMs,
        );
        for (const child of group.children)
          if (child instanceof LineSegments2)
            child.material.opacity = t * t * (3 - 2 * t);
        group.userData.fading = t < 1;
      }
      if (
        overlay.type === "path" &&
        overlay.reveal &&
        group.userData.revealing
      ) {
        const elapsed =
          performance.now() -
          group.userData.revealStarted -
          (overlay.reveal.delayMs ?? 0);
        const progress = Math.max(
          0,
          Math.min(1, elapsed / Math.max(1, overlay.reveal.durationMs)),
        );
        for (const child of group.children)
          if (child instanceof LineSegments2)
            child.geometry.instanceCount = Math.ceil(
              child.geometry.getAttribute("instanceStart").count * progress,
            );
        group.userData.revealing = progress < 1;
      }
      if (overlay.type === "path" && overlay.opacityByAltitude) {
        group.updateWorldMatrix(true, false);
        const radius = group.getWorldScale(new Vector3()).x;
        const altitude =
          camera
            .getWorldPosition(new Vector3())
            .distanceTo(group.getWorldPosition(new Vector3())) /
            radius -
          1;
        const ramp = overlay.opacityByAltitude;
        const t = Math.max(
          0,
          Math.min(1, (altitude - ramp.near) / (ramp.far - ramp.near)),
        );
        const opacity = (overlay.opacity ?? 1) * (1 - t) + ramp.opacity * t;
        for (const child of group.children) {
          if (child instanceof LineSegments2) child.material.opacity = opacity;
          else if (
            child instanceof Sprite ||
            (child instanceof Mesh &&
              child.material instanceof MeshBasicMaterial)
          )
            child.material.opacity = opacity;
        }
      }
      for (const child of group.children)
        if (child instanceof Sprite)
          viewPathLabel(child, group, camera, width, height);
        else if (child instanceof Mesh && child.name === "path-arrowhead")
          viewPathArrowhead(child, group, camera, width, height);
    }
  }
  setPalette(palette: ThemeId) {
    for (const { group, overlay } of this.objects.values())
      this.colorBand(group, overlay, palette);
  }
  private colorBand(group: Group, overlay: MapOverlay, palette: ThemeId) {
    const color =
      overlay.type === "paint"
        ? playColors(palette)[overlay.visualState]
        : overlay.type === "cells"
          ? cellsColor(overlay, palette)
          : overlay.type === "circle" && overlay.visualState
            ? playColors(palette)[overlay.visualState]
            : overlay.type === "bearing-sector"
              ? playColors(palette).hinted
              : overlay.type === "path"
                ? overlay.accuracyBand
                  ? pinBandColor(
                      overlay.accuracyBand.index,
                      overlay.accuracyBand.count,
                      palette,
                    )
                  : overlay.visualState
                    ? playColors(palette)[overlay.visualState]
                    : playColors(palette).guide
                : overlay.type === "circle" && overlay.accuracyBand
                  ? pinBandColor(
                      overlay.accuracyBand.index,
                      overlay.accuracyBand.count,
                      palette,
                    )
                  : overlay.type === "circle"
                    ? playColors(palette).guide
                    : undefined;
    if (!color) return;
    for (const child of group.children) {
      if (child instanceof Sprite) child.material.color.set(color);
      else if (
        child instanceof Mesh &&
        child.material instanceof MeshBasicMaterial
      )
        child.material.color.set(color);
      else if (child instanceof LineSegments2)
        (child.material as LineMaterial).color.set(color);
      else if (
        child instanceof Mesh &&
        child.material instanceof ShaderMaterial
      )
        child.material.uniforms.bandColor.value.set(color);
    }
  }
  get(overlay: MapOverlay, radius: number, palette: ThemeId = DEFAULT_THEME) {
    const signature = JSON.stringify(
      overlay.type === "paint"
        ? [
            overlay.type,
            overlay.bounds,
            overlay.mask,
            overlay.targetMask,
            overlay.coverage,
            overlay.opacity,
          ]
        : overlay.type === "raster-patch"
          ? [
              overlay.type,
              overlay.bounds,
              overlay.assetUrl,
              overlay.opacity,
              overlay.foreground,
            ]
          : overlay.type === "cells"
            ? [
                overlay.type,
                overlay.grid,
                overlay.indices,
                overlay.opacity,
                overlay.mask,
                overlay.prominent,
              ]
            : overlay.type === "bearing-sector"
              ? [
                  overlay.type,
                  overlay.center,
                  overlay.bearing,
                  overlay.halfWidthDegrees,
                  overlay.radiusKm,
                ]
              : overlay.type === "texture"
                ? [overlay.type, overlay.assetUrl, overlay.opacity]
                : overlay.type === "path"
                  ? [
                      overlay.type,
                      overlay.coordinates,
                      overlay.reveal,
                      overlay.foreground,
                      overlay.dashed,
                      overlay.accuracyBand,
                      overlay.opacity,
                      overlay.opacityByAltitude,
                      overlay.arrowhead,
                      overlay.label,
                    ]
                  : overlay.type === "circle"
                    ? [
                        overlay.type,
                        overlay.center,
                        overlay.radiusKm,
                        overlay.shade,
                        overlay.accuracyBand,
                        overlay.active,
                        overlay.fadeInMs,
                      ]
                    : overlay.type === "parallel"
                      ? [overlay.type, overlay.latitude]
                      : [overlay.type, overlay.longitude],
    );
    let entry = this.objects.get(overlay.id);
    // Growing paint changes geometry, not the mask or material. Keep the loaded
    // mesh visible instead of reloading its texture for every pointer sample.
    if (
      entry &&
      entry.signature !== signature &&
      overlay.type === "cells" &&
      entry.overlay.type === "cells" &&
      JSON.stringify([overlay.grid, overlay.mask]) ===
        JSON.stringify([entry.overlay.grid, entry.overlay.mask])
    ) {
      const mesh = entry.group.children[0] as Mesh<
        ReturnType<typeof cellsGeometry>,
        MeshBasicMaterial
      >;
      const previous = mesh.geometry;
      mesh.geometry = cellsGeometry(
        overlay.grid,
        overlay.indices,
        overlay.mask?.bounds,
      );
      previous.dispose();
      mesh.material.opacity = overlay.opacity ?? 0.38;
      entry.signature = signature;
    }
    if (!entry || entry.signature !== signature) {
      if (entry) {
        entry.group.removeFromParent();
        this.disposeGroup(entry.group);
      }
      entry = {
        signature,
        group: makeMapOverlay(overlay, radius, palette),
        overlay,
      };
      this.objects.set(overlay.id, entry);
    }
    if (overlay.type === "paint" && entry.overlay !== overlay)
      entry.group.userData.updatePaint(overlay);
    entry.overlay = overlay;
    this.colorBand(entry.group, overlay, palette);
    entry.group.scale.setScalar(radius);
    return entry.group;
  }
  private disposeGroup(group: Group) {
    group.userData.dispose?.();
    group.traverse((obj) => {
      if (obj instanceof Sprite) {
        obj.material.map?.dispose();
        obj.material.dispose();
        return;
      }
      if (!(obj instanceof Mesh)) return;
      obj.geometry.dispose();
      for (const material of Array.isArray(obj.material)
        ? obj.material
        : [obj.material]) {
        if (material instanceof MeshBasicMaterial) {
          material.map?.dispose();
          material.alphaMap?.dispose();
        }
        material.dispose();
      }
    });
  }
  dispose() {
    for (const { group } of this.objects.values()) this.disposeGroup(group);
    this.objects.clear();
    if (this.brush) this.disposeGroup(this.brush.group);
    this.brush = undefined;
    this.group.clear();
    this.group.visible = false;
  }
}
