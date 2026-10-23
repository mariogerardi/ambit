// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import { Mesh, ShaderMaterial, Texture, TextureLoader } from "three";
import type { MapOverlay } from "../src/geography/types";
import { MapOverlays } from "../src/globe/overlays";
import { drawPaint } from "../src/globe/paintOverlay";

const overlay: Extract<MapOverlay, { type: "paint" }> = {
  id: "paint",
  type: "paint",
  bounds: [60, 2, 104, 42],
  mask: { assetUrl: "/land.png", bounds: [60, 2, 104, 42] },
  targetMask: { assetUrl: "/india.png", bounds: [66, 6, 99, 38] },
  strokes: [{ radiusKm: 100, erase: false, points: [{ lng: 77, lat: 10 }] }],
  coverage: "inside",
  visualState: "correct",
  opacity: 0.72,
};
function context() {
  const paths: number[][][] = [];
  const operations: string[] = [];
  const ctx = {
    canvas: { width: 2048, height: 1862 },
    globalCompositeOperation: "source-over",
    fillStyle: "",
    clearRect: vi.fn(),
    beginPath: () => paths.push([]),
    moveTo: (x: number, y: number) => paths.at(-1)!.push([x, y]),
    lineTo: (x: number, y: number) => paths.at(-1)!.push([x, y]),
    closePath: vi.fn(),
    fill: () => operations.push(ctx.globalCompositeOperation),
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, paths, operations };
}
it("draws round geographic disks and honors erase order, extension and undo", () => {
  const { ctx, paths, operations } = context();
  drawPaint(ctx, overlay);
  const disk = paths[0],
    xs = disk.map((p) => p[0]),
    ys = disk.map((p) => p[1]);
  expect(disk.length).toBeGreaterThan(60);
  expect(
    ((Math.max(...xs) + Math.min(...xs)) / 2 / ctx.canvas.width) * 44 + 60,
  ).toBeCloseTo(77, 2);
  expect(
    42 - ((Math.max(...ys) + Math.min(...ys)) / 2 / ctx.canvas.height) * 40,
  ).toBeCloseTo(10, 2);
  // Around 200 km across, rather than snapped to evaluation cell boundaries.
  expect(
    ((Math.max(...ys) - Math.min(...ys)) / ctx.canvas.height) * 40 * 111.2,
  ).toBeCloseTo(200, 0);
  const erase = { radiusKm: 30, erase: true, points: [{ lng: 77, lat: 10 }] };
  const erased = { ...overlay, strokes: [...overlay.strokes, erase] };
  drawPaint(ctx, erased, overlay.strokes);
  expect(operations.at(-1)).toBe("destination-out");
  expect(ctx.clearRect).not.toHaveBeenCalled();
  const extended = {
    ...erased,
    strokes: [
      overlay.strokes[0],
      { ...erase, points: [...erase.points, { lng: 77.2, lat: 10.1 }] },
    ],
  };
  drawPaint(ctx, extended, erased.strokes);
  expect(ctx.clearRect).not.toHaveBeenCalled();
  drawPaint(ctx, overlay, extended.strokes);
  expect(ctx.clearRect).toHaveBeenCalledOnce();
  expect(operations.at(-1)).toBe("source-over");
});
it("retains loaded land masks while painting, maps the target crop correctly, and disposes all textures", () => {
  const { ctx } = context();
  const canvas = vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockReturnValue(ctx);
  const textures: Texture[] = [],
    ready: (() => void)[] = [];
  const loader = vi
    .spyOn(TextureLoader.prototype, "load")
    .mockImplementation((_url, onLoad) => {
      const texture = new Texture();
      vi.spyOn(texture, "dispose");
      textures.push(texture);
      ready.push(() => onLoad?.(texture));
      return texture;
    });
  const layers = new MapOverlays();
  try {
    layers.update(
      { id: "test", kind: "map-overlays", overlays: [overlay] },
      100,
    );
    const mesh = layers.group.children[0].children[0] as Mesh;
    const material = mesh.material as ShaderMaterial;
    expect(mesh.visible).toBe(false);
    ready[0]();
    expect(mesh.visible).toBe(false);
    ready[1]();
    expect(mesh.visible).toBe(true);
    expect(material.uniforms.landUV.value.toArray()).toEqual([0, 0, 1, 1]);
    expect(material.uniforms.targetUV.value.x).toBeCloseTo(-6 / 33);
    expect(material.uniforms.targetUV.value.w).toBeCloseTo(40 / 32);
    const paint = material.uniforms.paint.value as Texture;
    const disposePaint = vi.spyOn(paint, "dispose");
    const next = {
      ...overlay,
      strokes: [
        ...overlay.strokes,
        { radiusKm: 70, erase: true, points: [{ lat: 10, lng: 77 }] },
      ],
    };
    layers.update({ id: "test", kind: "map-overlays", overlays: [next] }, 100);
    expect(layers.group.children[0].children[0]).toBe(mesh);
    expect(mesh.visible).toBe(true);
    expect(loader).toHaveBeenCalledTimes(2);
    layers.dispose();
    expect(disposePaint).toHaveBeenCalledOnce();
    for (const texture of textures)
      expect(texture.dispose).toHaveBeenCalledOnce();
  } finally {
    layers.dispose();
    canvas.mockRestore();
    loader.mockRestore();
  }
});
