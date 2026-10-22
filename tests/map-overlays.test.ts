import { describe, expect, it, vi } from "vitest";
import {
  Mesh,
  PerspectiveCamera,
  Group,
  MeshBasicMaterial,
  Raycaster,
  ShaderMaterial,
  Texture,
  TextureLoader,
  Vector3,
} from "three";
import { MAP_ANNOTATION_ALTITUDE } from "../src/globe/surface";
import { pinBandColor } from "../src/theme/playColors";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { MapOverlays, overlayPositions } from "../src/globe/overlays";
import type { MapOverlay } from "../src/geography/types";

describe("decorative map overlays", () => {
  it("aligns kilometer-scale construction rings and fills with the shore surface", () => {
    const circle: MapOverlay = {
      id: "local-circle",
      type: "circle",
      active: true,
      shade: true,
      center: { lat: 42.3, lng: -70.94 },
      radiusKm: 4,
    };
    const points = overlayPositions(circle);
    expect(
      overlayPositions({ ...circle, active: false, visualState: "answer" }),
    ).toEqual(points);
    for (let i = 0; i < points.length; i += 3)
      expect(Math.hypot(points[i], points[i + 1], points[i + 2])).toBeCloseTo(
        1 + MAP_ANNOTATION_ALTITUDE,
        6,
      );
    const overlays = new MapOverlays();
    const group = overlays.get(circle, 100);
    const disk = group.children.find(
      (c) => c instanceof Mesh && !(c instanceof LineSegments2),
    ) as Mesh;
    const positions = disk.geometry.getAttribute("position");
    expect(positions.count).toBeLessThan(200);
    for (let i = 0; i < positions.count; i++)
      expect(
        Math.hypot(positions.getX(i), positions.getY(i), positions.getZ(i)),
      ).toBeCloseTo(1 + MAP_ANNOTATION_ALTITUDE, 6);
    expect((disk.material as ShaderMaterial).fragmentShader).not.toContain(
      "threshold",
    );
    overlays.dispose();
  });
  it("previews the brush's geographic radius without rebuilding on hover, and clears it on exit", () => {
    const overlays = new MapOverlays();
    overlays.previewBrush({ lat: 25, lng: 15 }, 160);
    const brush = overlays.group.children[0] as Group;
    const line = brush.children[0] as LineSegments2;
    const geometry = line.geometry;
    const dispose = vi.spyOn(geometry, "dispose");
    const north = new Vector3(0, 1, 0).applyQuaternion(brush.quaternion);
    const edge = new Vector3()
      .fromBufferAttribute(geometry.getAttribute("instanceStart"), 0)
      .normalize()
      .applyQuaternion(brush.quaternion);
    expect(north.angleTo(edge) * 6371).toBeCloseTo(160, 2);
    overlays.previewBrush({ lat: 30, lng: -10 }, 160);
    expect(overlays.group.children[0]).toBe(brush);
    expect(line.geometry).toBe(geometry);
    expect(dispose).not.toHaveBeenCalled();
    overlays.update({ id: "map", kind: "map-overlays", overlays: [] }, 100);
    expect(overlays.group.visible).toBe(true);
    overlays.previewBrush({ lat: 30, lng: -10 }, 240);
    expect(dispose).toHaveBeenCalledOnce();
    expect(overlays.group.children).toHaveLength(1);
    overlays.previewBrush();
    expect(overlays.group.visible).toBe(false);
    expect(overlays.group.children[0].visible).toBe(false);
    overlays.dispose();
    expect(overlays.group.children).toHaveLength(0);
  });

  it("keeps the same attached guide when answer changes supply fresh overlay records", () => {
    const overlays = new MapOverlays();
    const scene = new Group();
    scene.add(overlays.group);
    const guide: MapOverlay = { id: "equator", type: "parallel", latitude: 0 };
    const layer = {
      id: "overlays",
      kind: "map-overlays" as const,
      overlays: [guide],
    };
    overlays.update(layer, 100);
    const lineGroup = overlays.group.children[0];
    const line = lineGroup.children[0] as LineSegments2;
    const dispose = vi.spyOn(line.geometry, "dispose");
    overlays.update({ ...layer, overlays: [{ ...guide }] }, 100);
    expect(scene.children).toEqual([overlays.group]);
    expect(overlays.group.children).toEqual([lineGroup]);
    expect(lineGroup.parent).toBe(overlays.group);
    expect(dispose).not.toHaveBeenCalled();
    overlays.dispose();
  });

  it("detaches replaced accuracy rings and removes all geometry on Journey exit", () => {
    const overlays = new MapOverlays();
    const circle: MapOverlay = {
      id: "accuracy",
      type: "circle",
      center: { lat: 0, lng: 0 },
      radiusKm: 150,
      accuracyBand: { index: 0, count: 3 },
    };
    const layer = {
      id: "overlays",
      kind: "map-overlays" as const,
      overlays: [circle],
    };
    overlays.update(layer, 100);
    const old = overlays.group.children[0];
    const oldDispose = vi.spyOn(
      (old.children[0] as LineSegments2).geometry,
      "dispose",
    );
    overlays.update({ ...layer, overlays: [{ ...circle, active: true }] }, 100);
    expect(old.parent).toBeNull();
    expect(oldDispose).toHaveBeenCalledOnce();
    expect(overlays.group.children).toHaveLength(1);
    const active = overlays.group.children[0];
    const activeDispose = vi.spyOn(
      (active.children[0] as LineSegments2).geometry,
      "dispose",
    );
    overlays.update({ ...layer, overlays: [] }, 100);
    expect(active.parent).toBeNull();
    expect(activeDispose).toHaveBeenCalledOnce();
    expect(overlays.group.children).toEqual([]);
    expect(overlays.group.visible).toBe(false);
    overlays.dispose();
    expect(activeDispose).toHaveBeenCalledOnce();
  });

  it("emphasizes an achieved accuracy ring and recolors cached line and disk together when the theme changes", () => {
    const overlays = new MapOverlays();
    const source: MapOverlay = {
      id: "accuracy",
      type: "circle",
      center: { lat: 0, lng: 179 },
      radiusKm: 150,
      shade: true,
      accuracyBand: { index: 0, count: 3 },
      active: true,
    };
    const group = overlays.get(source, 100);
    const line = group.children.find(
      (child) => child instanceof LineSegments2,
    ) as LineSegments2;
    const disk = group.children.find(
      (child) =>
        child instanceof Mesh &&
        !(child instanceof LineSegments2) &&
        child.material instanceof ShaderMaterial,
    ) as Mesh;
    expect((line.material as LineMaterial).linewidth).toBe(3);
    overlays.setPalette("paper");
    expect((line.material as LineMaterial).color.getHexString()).toBe(
      pinBandColor(0, 3, "paper").slice(1),
    );
    const shader = disk.material as ShaderMaterial;
    expect(shader.uniforms.bandColor.value.getHexString()).toBe(
      pinBandColor(0, 3, "paper").slice(1),
    );
    expect(shader.fragmentShader).toContain("colorspace_fragment");
    expect(overlays.get(source, 100, "paper")).toBe(group);
    overlays.dispose();
  });

  it("aligns an equirectangular texture with globe coordinates, caches it and releases GPU resources", () => {
    const texture = new Texture();
    let loaded!: (texture: Texture) => void;
    const load = vi
      .spyOn(TextureLoader.prototype, "load")
      .mockImplementation((_url, callback) => {
        loaded = callback!;
        return texture;
      });
    const overlays = new MapOverlays();
    const source: MapOverlay = {
      id: "map",
      type: "texture",
      assetUrl: "/map.png",
      opacity: 0.2,
    };
    try {
      const group = overlays.get(source, 100);
      expect(overlays.get(source, 120)).toBe(group);
      Object.assign(source, { __rendererObject: group });
      expect(overlays.get({ ...source }, 120)).toBe(group);
      expect(group.scale.x).toBe(120);
      expect(load).toHaveBeenCalledTimes(1);
      const mesh = group.children[0] as Mesh;
      expect(mesh.visible).toBe(false);
      loaded(texture);
      expect(mesh.visible).toBe(true);
      const material = mesh.material as MeshBasicMaterial;
      expect(material.map).toBe(texture);
      expect(material.opacity).toBe(0.2);
      expect(material.depthWrite).toBe(false);
      const positions = mesh.geometry.getAttribute("position");
      const uv = mesh.geometry.getAttribute("uv");
      for (const [u, v, expected] of [
        [0, 0.5, [0, 0, -1.003]], // −180°
        [0.25, 0.5, [-1.003, 0, 0]], // −90°
        [0.5, 0.5, [0, 0, 1.003]], // Greenwich
        [0.75, 0.5, [1.003, 0, 0]], // +90°
        [0.5, 1, [0, 1.003, 0]], // north at image top
      ] as const) {
        const vertex = Array.from({ length: uv.count }, (_, i) => i).find(
          (i) =>
            (v === 1 || Math.abs(uv.getX(i) - u) < 0.00001) &&
            Math.abs(uv.getY(i) - v) < 0.00001,
        )!;
        expect(vertex).toBeDefined();
        const actual = [
          positions.getX(vertex),
          positions.getY(vertex),
          positions.getZ(vertex),
        ];
        actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i], 5));
      }
      group.updateMatrixWorld(true);
      const ray = new Raycaster(new Vector3(0, 0, 300), new Vector3(0, 0, -1));
      expect(ray.intersectObjects([group], true)).toEqual([]);
      const geometryDispose = vi.spyOn(mesh.geometry, "dispose");
      const materialDispose = vi.spyOn(material, "dispose");
      const textureDispose = vi.spyOn(texture, "dispose");
      overlays.dispose();
      expect(geometryDispose).toHaveBeenCalledTimes(1);
      expect(materialDispose).toHaveBeenCalledTimes(1);
      expect(textureDispose).toHaveBeenCalledTimes(1);
    } finally {
      overlays.dispose();
      load.mockRestore();
    }
  });

  it("does not revive a texture overlay when an image finishes loading after disposal", () => {
    const texture = new Texture();
    let loaded!: (texture: Texture) => void;
    const load = vi
      .spyOn(TextureLoader.prototype, "load")
      .mockImplementation((_url, callback) => {
        loaded = callback!;
        return texture;
      });
    try {
      const overlays = new MapOverlays();
      const group = overlays.get(
        { id: "map", type: "texture", assetUrl: "/map.png", opacity: 0.2 },
        100,
      );
      overlays.dispose();
      loaded(texture);
      expect(group.children[0].visible).toBe(false);
    } finally {
      load.mockRestore();
    }
  });

  it("keeps geographic guide segments on the sphere across the antimeridian", () => {
    const positions = overlayPositions({
      id: "date-line",
      type: "path",
      coordinates: [
        [179, -14],
        [-179, -14],
      ],
      dashed: true,
    });
    expect(positions.length).toBeGreaterThan(6);
    for (let i = 0; i < positions.length; i += 3) {
      expect(
        Math.hypot(positions[i], positions[i + 1], positions[i + 2]),
      ).toBeCloseTo(1.005, 6);
      expect(
        Math.abs((Math.atan2(positions[i], positions[i + 2]) * 180) / Math.PI),
      ).toBeGreaterThan(178.9);
    }
  });
});

it("fades corridor context with camera altitude without rebuilding geometry or intercepting pins", () => {
  const overlays = new MapOverlays();
  const path: MapOverlay = {
    id: "corridor",
    type: "path",
    visualState: "corridor",
    coordinates: [
      [80, 40],
      [90, 40],
    ],
    opacity: 0.28,
    opacityByAltitude: { near: 0.55, far: 1.85, opacity: 0.75 },
  };
  overlays.update({ id: "map", kind: "map-overlays", overlays: [path] }, 100);
  const group = overlays.group.children[0],
    line = group.children[0] as LineSegments2;
  const geometry = line.geometry;
  expect(line.material.linewidth).toBe(3);
  expect(line.material.dashed).toBe(false);
  expect(line.material.color.getHexString()).toBe("ffd34e");
  const camera = new PerspectiveCamera();
  for (const [altitude, expected] of [
    [0.3, 0.28],
    [0.55, 0.28],
    [1.2, 0.515],
    [1.85, 0.75],
    [3, 0.75],
  ]) {
    camera.position.set(0, 0, 100 * (1 + altitude));
    camera.updateMatrixWorld();
    overlays.view(camera, 800, 600);
    expect(line.material.opacity).toBeCloseTo(expected, 6);
    expect(line.geometry).toBe(geometry);
  }
  expect(new Raycaster().intersectObject(group, true)).toEqual([]);
  overlays.setPalette("paper");
  expect(line.material.color.getHexString()).toBe("a36708");
  overlays.dispose();
});
