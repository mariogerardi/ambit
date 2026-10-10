// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Group,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  Sprite,
  Vector3,
} from "three";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { GlobeFidget, FIDGETS } from "../src/globe/fidget";
import ConicPolygonGeometry from "three-conic-polygon-geometry";
let callbacks: Map<number, FrameRequestCallback>, id: number;
const tick = (time: number) => {
  const pending = [...callbacks.values()];
  callbacks.clear();
  pending.forEach((cb) => cb(time));
};
beforeEach(() => {
  callbacks = new Map();
  id = 0;
  vi.spyOn(performance, "now").mockReturnValue(0);
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
function scene() {
  const group = new Group();
  const geometry = new SphereGeometry(100, 16, 8);
  const earth = new Mesh(geometry, new MeshBasicMaterial());
  const border = new LineSegments2(
    new LineSegmentsGeometry().setPositions([20, 98, 0, 30, 95, 0]),
  );
  const label = new Sprite();
  label.position.set(25, 80, 55);
  group.add(earth, border, label);
  return { group, earth, border, label, geometry };
}
describe("temporary globe effects", () => {
  it("reports natural completion after restoring geometry, but cancellation does not resume playback", () => {
    const { group, earth, geometry } = scene();
    const effect = new GlobeFidget();
    const completed = vi.fn(() => expect(earth.geometry).toBe(geometry));
    effect.play(group, 100, false, "cube", undefined, completed);
    tick(1700);
    expect(completed).toHaveBeenCalledOnce();
    effect.play(group, 100, false, "twist", undefined, completed);
    effect.cancel();
    tick(1700);
    expect(completed).toHaveBeenCalledOnce();
  });
  for (const effect of FIDGETS)
    it(`${effect} restores cached geometry, labels and culling after the effect`, () => {
      const { group, earth, border, label, geometry } = scene();
      const effectController = new GlobeFidget();
      const original = Array.from(geometry.getAttribute("position").array);
      const borderGeometry = border.geometry,
        position = label.position.clone();
      const originalMarker = new Vector3().fromBufferAttribute(
        borderGeometry.getAttribute("instanceStart"),
        0,
      );
      effectController.play(group, 100, false, effect);
      expect(earth.geometry).not.toBe(geometry);
      tick(750);
      expect(
        Array.from(earth.geometry.getAttribute("position").array),
      ).not.toEqual(original);
      expect(Array.from(geometry.getAttribute("position").array)).toEqual(
        original,
      );
      expect(label.position.equals(position)).toBe(false);
      expect(
        new Vector3()
          .fromBufferAttribute(border.geometry.getAttribute("instanceStart"), 0)
          .equals(originalMarker),
      ).toBe(false);
      tick(1700);
      expect(earth.geometry).toBe(geometry);
      expect(border.geometry).toBe(borderGeometry);
      expect(earth.frustumCulled).toBe(true);
      expect(label.position).toEqual(position);
      expect(callbacks.size).toBe(0);
    });
  it("cancels cleanly and replaces a repeated click without retaining a deformed snapshot", () => {
    const { group, earth, geometry } = scene();
    const fidget = new GlobeFidget();
    fidget.play(group, 100, false, "split");
    tick(700);
    const dispose = vi.spyOn(earth.geometry, "dispose");
    fidget.play(group, 100, false, "cube");
    expect(dispose).toHaveBeenCalledOnce();
    fidget.cancel();
    expect(earth.geometry).toBe(geometry);
    expect(callbacks.size).toBe(0);
  });
  it("disables effects for reduced motion and never repeats the previous random effect", () => {
    const { group, earth, geometry } = scene();
    const fidget = new GlobeFidget();
    expect(fidget.play(group, 100, true)).toBeUndefined();
    expect(earth.geometry).toBe(geometry);
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(fidget.play(group, 100)).toBe("squeeze");
    expect(fidget.play(group, 100)).toBe("split");
    fidget.cancel();
  });
  it("leaves non-geographic scene objects and displaced layers alone", () => {
    const { group, earth, geometry } = scene();
    const fidget = new GlobeFidget();
    const background = new Mesh(
      new SphereGeometry(500),
      new MeshBasicMaterial(),
    );
    group.add(background);
    const original = background.geometry;
    fidget.play(group, 100, false, "split");
    expect(background.geometry).toBe(original);
    const replacement = new SphereGeometry(100);
    earth.geometry = replacement;
    fidget.cancel();
    expect(earth.geometry).toBe(replacement);
    expect(Array.from(geometry.getAttribute("position").array)).not.toEqual([]);
  });
});
it("clips the split's connecting faces and restores original materials and renderer settings", () => {
  const { group, earth } = scene();
  const fidget = new GlobeFidget();
  const material = earth.material,
    renderer = { localClippingEnabled: false };
  fidget.play(group, 100, false, "split", renderer);
  tick(750);
  expect(renderer.localClippingEnabled).toBe(true);
  expect(earth.material).not.toBe(material);
  expect(earth.material.clipIntersection).toBe(true);
  expect(earth.material.clippingPlanes?.map((p) => p.constant)).toEqual([
    -17.82, -17.82,
  ]);
  fidget.cancel();
  expect(earth.material).toBe(material);
  expect(renderer.localClippingEnabled).toBe(false);
});
it("copies library geometry without calling subclass constructors that require source GeoJSON", () => {
  class SourceGeometry extends SphereGeometry {
    constructor(required?: { radius: number }) {
      if (!required) throw Error("Source geometry requires a definition");
      super(required.radius, 8, 4);
    }
  }
  const original = new SourceGeometry({ radius: 100 });
  const mesh = new Mesh(original, new MeshBasicMaterial());
  const group = new Group().add(mesh),
    fidget = new GlobeFidget();
  expect(() => fidget.play(group, 100, false, "cube")).not.toThrow();
  tick(750);
  expect(mesh.geometry).not.toBe(original);
  fidget.cancel();
  expect(mesh.geometry).toBe(original);
});
it("keeps the polygon identity that color updates use, throughout a cube deformation", () => {
  const original = new ConicPolygonGeometry(
    [
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
        [0, 0],
      ],
    ],
    0,
    100.15,
    false,
    true,
    false,
    3,
  );
  const mesh = new Mesh(original, new MeshBasicMaterial());
  const fidget = new GlobeFidget();
  fidget.play(new Group().add(mesh), 100, false, "cube");
  expect(fidget.active).toBe(true);
  const temporary = mesh.geometry;
  tick(750);
  // This is the library's geometry identity check during cap color refreshes.
  const parameters = (temporary as ConicPolygonGeometry).parameters;
  expect(parameters).toBe(original.parameters);
  expect(parameters.polygonGeoJson).toBe(original.parameters.polygonGeoJson);
  mesh.material.color.set("#ffdd78");
  tick(900);
  expect(mesh.geometry).toBe(temporary);
  expect(Array.from(temporary.getAttribute("position").array)).not.toEqual(
    Array.from(original.getAttribute("position").array),
  );
  tick(1700);
  expect(fidget.active).toBe(false);
  expect(mesh.geometry).toBe(original);
});
