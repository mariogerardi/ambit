import { describe, expect, it, vi } from "vitest";
import {
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Texture,
  TextureLoader,
  Vector3,
} from "three";
import { MapOverlays, overlayPositions } from "../src/globe/overlays";
import type { MapOverlay } from "../src/geography/types";

describe("decorative map overlays", () => {
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
