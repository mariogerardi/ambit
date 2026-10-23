import { it, expect, vi } from "vitest";
import {
  Mesh,
  MeshBasicMaterial,
  Texture,
  TextureLoader,
  Raycaster,
  Vector3,
} from "three";
import {
  patchGeometry,
  cellsGeometry,
} from "../src/globe/constructionOverlays";
import { MapOverlays } from "../src/globe/overlays";
import { CONSTRUCTION_RECIPES } from "../src/game/constructionRecipes";
it("keeps spherical image patches and scoring cells above the globe, with north-up UVs", () => {
  const geometry = patchGeometry([-18, 10, 38, 38]),
    p = geometry.getAttribute("position"),
    uv = geometry.getAttribute("uv");
  expect(uv.getY(0)).toBe(1);
  expect(uv.getY(uv.count - 1)).toBe(0);
  for (let i = 0; i < p.count; i++)
    expect(new Vector3().fromBufferAttribute(p, i).length()).toBeCloseTo(
      1.004,
      6,
    );
  const q = CONSTRUCTION_RECIPES.find((q) => q.id === "recipe:geo-brush")!;
  if (!("grid" in q.rule)) throw Error();
  const cells = cellsGeometry(q.rule.grid, [12, 13]);
  expect(cells.getAttribute("position").count).toBe(12);
  geometry.dispose();
  cells.dispose();
});
it("loads decorative imagery, disables picking and disposes textures on removal", () => {
  const texture = new Texture();
  let onLoad: ((t: Texture) => void) | undefined;
  const loader = vi
    .spyOn(TextureLoader.prototype, "load")
    .mockImplementation((_url, ready) => {
      onLoad = ready;
      return texture;
    });
  const dispose = vi.spyOn(texture, "dispose"),
    layers = new MapOverlays();
  try {
    layers.update(
      {
        id: "overlay",
        kind: "map-overlays",
        overlays: [
          {
            id: "image",
            type: "raster-patch",
            assetUrl: "/image.jpg",
            bounds: [-10, -10, 10, 10],
            opacity: 1,
          },
        ],
      },
      100,
    );
    const mesh = layers.group.children[0].children[0] as Mesh;
    expect(mesh.visible).toBe(false);
    onLoad?.(texture);
    expect(mesh.visible).toBe(true);
    expect((mesh.material as MeshBasicMaterial).map).toBe(texture);
    const intersections: [] = [];
    mesh.raycast(
      new Raycaster(new Vector3(0, 0, 200), new Vector3(0, 0, -1)),
      intersections,
    );
    expect(intersections).toEqual([]);
    layers.dispose();
    expect(dispose).toHaveBeenCalledOnce();
    onLoad?.(texture);
    expect(dispose).toHaveBeenCalledTimes(2);
  } finally {
    layers.dispose();
    loader.mockRestore();
  }
});

it("clips prominent brush cells with a geographic alpha mask and releases it", () => {
  const texture = new Texture();
  let ready: ((t: Texture) => void) | undefined;
  const load = vi
    .spyOn(TextureLoader.prototype, "load")
    .mockImplementation((_url, onLoad) => {
      ready = onLoad;
      return texture;
    });
  const layers = new MapOverlays(),
    dispose = vi.spyOn(texture, "dispose");
  try {
    layers.update(
      {
        id: "brush",
        kind: "map-overlays",
        overlays: [
          {
            id: "paint",
            type: "cells",
            grid: {
              west: 0,
              east: 2,
              south: 0,
              north: 2,
              columns: 2,
              rows: 2,
              equalArea: false,
            },
            indices: [0],
            visualState: "incorrect",
            prominent: true,
            opacity: 0.72,
            mask: { assetUrl: "/mask.png", bounds: [0, 0, 2, 2] },
          },
        ],
      },
      100,
    );
    const mesh = layers.group.children[0].children[0] as Mesh,
      material = mesh.material as MeshBasicMaterial;
    expect(mesh.visible).toBe(false);
    ready?.(texture);
    expect(mesh.visible).toBe(true);
    expect(material.alphaMap).toBe(texture);
    expect(material.alphaTest).toBe(0.5);
    expect(mesh.geometry.getAttribute("uv").getX(0)).toBeCloseTo(0);
    expect(mesh.geometry.getAttribute("uv").getY(0)).toBeCloseTo(0);
    expect(material.opacity).toBe(0.72);
    expect(material.color.getHSL({ h: 0, s: 0, l: 0 }).s).toBeGreaterThan(0.9);
    layers.dispose();
    expect(dispose).toHaveBeenCalledOnce();
  } finally {
    layers.dispose();
    load.mockRestore();
  }
});

it("retains the loaded mask and visible mesh while a paint stroke grows", () => {
  const texture = new Texture();
  let ready: ((t: Texture) => void) | undefined;
  const load = vi
    .spyOn(TextureLoader.prototype, "load")
    .mockImplementation((_url, onLoad) => {
      ready = onLoad;
      return texture;
    });
  const layers = new MapOverlays(),
    dispose = vi.spyOn(texture, "dispose");
  const paint = {
    id: "paint",
    type: "cells" as const,
    grid: {
      west: 0,
      east: 2,
      south: 0,
      north: 2,
      columns: 2,
      rows: 2,
      equalArea: false,
    },
    indices: [0],
    visualState: "selected" as const,
    mask: {
      assetUrl: "/mask.png",
      bounds: [0, 0, 2, 2] as [number, number, number, number],
    },
  };
  try {
    layers.update(
      { id: "brush", kind: "map-overlays", overlays: [paint] },
      100,
    );
    const group = layers.group.children[0],
      mesh = group.children[0] as Mesh;
    ready?.(texture);
    expect(mesh.visible).toBe(true);
    const old = mesh.geometry,
      oldDispose = vi.spyOn(old, "dispose");
    layers.update(
      {
        id: "brush",
        kind: "map-overlays",
        overlays: [{ ...paint, indices: [0, 1, 2] }],
      },
      100,
    );
    expect(layers.group.children[0]).toBe(group);
    expect(group.children[0]).toBe(mesh);
    expect(mesh.visible).toBe(true);
    expect(mesh.geometry.getAttribute("position").count).toBe(18);
    expect(oldDispose).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledOnce();
    expect(dispose).not.toHaveBeenCalled();
    layers.dispose();
    expect(dispose).toHaveBeenCalledOnce();
  } finally {
    layers.dispose();
    load.mockRestore();
  }
});

it("keeps explanatory region shading above satellite imagery", () => {
  const load = vi
    .spyOn(TextureLoader.prototype, "load")
    .mockImplementation(() => new Texture());
  const layers = new MapOverlays();
  try {
    const image = {
      id: "relief",
      type: "raster-patch" as const,
      bounds: [66, 6, 99, 38] as [number, number, number, number],
      assetUrl: "/relief.webp",
      opacity: 1,
    };
    layers.update(
      {
        id: "map",
        kind: "map-overlays",
        overlays: [
          image,
          {
            ...image,
            id: "regions",
            foreground: true,
            assetUrl: "/regions.png",
            opacity: 0.55,
          },
        ],
      },
      100,
    );
    const [base, shading] = layers.group.children.map(
      (g) => g.children[0] as Mesh,
    );
    expect(shading.renderOrder).toBeGreaterThan(base.renderOrder);
    const position = (mesh: Mesh) =>
      new Vector3()
        .fromBufferAttribute(mesh.geometry.getAttribute("position"), 0)
        .length();
    expect(position(shading)).toBeGreaterThan(position(base));
  } finally {
    layers.dispose();
    load.mockRestore();
  }
});
