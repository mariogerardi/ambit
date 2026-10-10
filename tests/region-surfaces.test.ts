// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Mesh, Raycaster, Vector3 } from "three";
import { RegionSurfaces } from "../src/globe/regionSurfaces";
import { prepareGlobeRegions } from "../src/globe/geometry";
import type { RegionFeature } from "../src/geography/types";

let callbacks: Map<number, FrameRequestCallback>, id: number;
const tick = () => {
  const pending = [...callbacks.values()];
  callbacks.clear();
  pending.forEach((cb) => cb(0));
};
beforeEach(() => {
  callbacks = new Map();
  id = 0;
  let time = 0;
  vi.spyOn(performance, "now").mockImplementation(() => (time += 6));
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    callbacks.set(++id, cb);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (key: number) => callbacks.delete(key));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const region = (id = "test:first") =>
  prepareGlobeRegions([
    {
      id,
      name: id,
      level: "ADM1",
      sourceId: "test",
      focus: { lat: 1, lng: 1 },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [2, 0],
            [2, 2],
            [0, 2],
            [0, 0],
          ],
        ],
      },
    } as RegionFeature,
  ])[0];

it("yields between regional meshes and prioritizes visible regions over warming", () => {
  const layer = new RegionSurfaces();
  layer.warm([region(), region("test:second")]);
  const target = region("test:visible"),
    group = layer.get(target, 100);
  layer.update(target, "#ffdd78");
  expect(group.children).toHaveLength(0);
  tick();
  expect(group.children).toHaveLength(1);
  expect(callbacks.size).toBe(1);
  const mesh = group.children[0] as Mesh;
  expect(mesh.material).toMatchObject({ color: expect.anything() });
  group.updateMatrixWorld(true);
  const direction = new Vector3(0.01745, 0.01745, 0.9997).normalize();
  const ray = new Raycaster(
    direction.clone().multiplyScalar(200),
    direction.clone().negate(),
  );
  expect(ray.intersectObject(group, true).length).toBeGreaterThan(0);
  while (callbacks.size) tick();
  layer.dispose();
});
it("reuses triangulated buffers after detaching and reattaching a region", () => {
  const layer = new RegionSurfaces(),
    target = region();
  layer.warm([target]);
  tick();
  const group = layer.get(target, 100),
    mesh = group.children[0] as Mesh;
  const geometry = mesh.geometry;
  // ThreeDigest frees GPU resources on route changes, but keeps CPU arrays.
  geometry.dispose();
  const restored = layer.get(target, 100);
  expect(restored).toBe(group);
  expect((restored.children[0] as Mesh).geometry).toBe(geometry);
  expect(callbacks.size).toBe(0);
  layer.dispose();
});
it("does not attach undeformed surfaces during Fidget and cancels queued work on disposal", () => {
  let paused = true;
  const layer = new RegionSurfaces(() => paused),
    target = region();
  const group = layer.get(target, 100);
  tick();
  expect(group.children).toHaveLength(0);
  paused = false;
  tick();
  expect(group.children).toHaveLength(1);
  layer.warm([region("test:pending")]);
  layer.dispose();
  expect(callbacks.size).toBe(0);
});
