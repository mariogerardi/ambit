// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PerspectiveCamera, Vector3 } from "three";
import { validateRegions } from "../src/geography/loadLayer";
import {
  SmallRegionLocators,
  prepareSmallRegion,
  projectSmallRegion,
} from "../src/globe/smallRegionLocators";
import { playColors } from "../src/theme/playColors";

const world = validateRegions(
  JSON.parse(readFileSync("public/geography/world.v1.json", "utf8")),
);
const maldives = world.find((r) => r.id === "wurl:MDV")!;
const camera = (distance = 300, reversed = false) => {
  const c = new PerspectiveCamera(50, 800 / 600, 0.01, 1200);
  c.position
    .copy(prepareSmallRegion(maldives).anchor)
    .multiplyScalar(reversed ? -distance : distance);
  c.lookAt(0, 0, 0);
  c.updateMatrixWorld();
  return c;
};
describe("small-country location and selection", () => {
  it("uses small, subdued rings at world zoom while retaining generous touch targets and emphasizing feedback", () => {
    const layer = new SmallRegionLocators();
    layer.update([maldives], { states: {} });
    layer.view(camera(600), 800, 600, 100);
    const group = layer.element.querySelector("g")!;
    const ring = group.querySelector("circle")!;
    const wideRadius = Number(ring.getAttribute("r"));
    expect(wideRadius).toBeLessThan(4);
    expect(Number(group.style.opacity)).toBeLessThan(0.7);
    expect(layer.pick(420, 300, 22)).toBe(maldives);
    layer.view(camera(150), 800, 600, 100);
    expect(Number(ring.getAttribute("r"))).toBeGreaterThan(wideRadius);
    expect(Number(ring.getAttribute("r"))).toBeLessThan(6);
    layer.update([maldives], {
      states: { [maldives.id]: "correct" },
      regionInteraction: false,
    });
    layer.view(camera(600), 800, 600, 100);
    expect(Number(ring.getAttribute("r"))).toBeGreaterThan(wideRadius);
    expect(Number(group.style.opacity)).toBeGreaterThan(0.8);
    expect(layer.pick(400, 300, 22)).toBeUndefined();
    layer.dispose();
  });
  it("does not add locators to broad countries just because they are compressed against the horizon", () => {
    const c = new PerspectiveCamera(50, 800 / 600, 0.01, 1200);
    c.position.set(0, 0, 300);
    c.lookAt(0, 0, 0);
    c.updateMatrixWorld();
    expect(
      projectSmallRegion(
        { anchor: new Vector3(Math.sqrt(1 - 0.34 ** 2), 0, 0.34), area: 0.01 },
        c,
        800,
        600,
        100,
      ),
    ).toBeUndefined();
  });
  it("finds sparse Maldives land from geometry, hides behind the globe, and hands back to the footprint at close zoom", () => {
    const prepared = prepareSmallRegion(maldives);
    const projected = projectSmallRegion(prepared, camera(), 800, 600, 100)!;
    expect(projected.x).toBeCloseTo(400);
    expect(projected.y).toBeCloseTo(300);
    expect(
      projectSmallRegion(prepared, camera(300, true), 800, 600, 100),
    ).toBeUndefined();
    expect(
      projectSmallRegion(prepared, camera(100.1), 800, 600, 100),
    ).toBeUndefined();
    expect(
      projectSmallRegion(
        prepareSmallRegion(world.find((r) => r.id === "wurl:IND")!),
        camera(),
        800,
        600,
        100,
      ),
    ).toBeUndefined();
  });
  it("provides anonymous location and touch-sized picking for eligible countries, independently of disabled fill", () => {
    const layer = new SmallRegionLocators();
    layer.update([maldives], {
      states: { [maldives.id]: "disabled" },
      selectableRegionIds: [maldives.id],
    });
    layer.view(camera(), 800, 600, 100);
    expect(layer.element.textContent).toBe("");
    expect(layer.pick(400, 300)).toBe(maldives);
    expect(layer.pick(420, 300)).toBeUndefined();
    expect(layer.pick(420, 300, 22)).toBe(maldives);
    layer.update([maldives], {
      states: { [maldives.id]: "selectable" },
      selectableRegionIds: [],
    });
    layer.view(camera(), 800, 600, 100);
    expect(layer.pick(400, 300, 22)).toBeUndefined();
    layer.dispose();
  });
  it("keeps revealed answers visible in semantic colors without accepting picks or changing geometry", () => {
    const layer = new SmallRegionLocators();
    const before = JSON.stringify(maldives.geometry);
    for (const state of ["answer", "correct", "incorrect"] as const) {
      layer.update([maldives], {
        states: { [maldives.id]: state },
        regionInteraction: false,
        palette: "ocean",
      });
      layer.view(camera(), 800, 600, 100);
      const group = layer.element.querySelector("g")!;
      expect(group.style.display).toBe("");
      const expected = document.createElement("span");
      expected.style.color = playColors("ocean")[state];
      expect(group.style.color).toBe(expected.style.color);
      expect(layer.pick(400, 300, 22)).toBeUndefined();
    }
    expect(JSON.stringify(maldives.geometry)).toBe(before);
    layer.dispose();
  });
  it("hides under panels, on the far side, during coordinate input and when inactive, and clears stale tap targets", () => {
    const layer = new SmallRegionLocators();
    layer.update([maldives], { states: {} });
    layer.view(camera(), 800, 600, 100, [
      { left: 390, right: 410, top: 290, bottom: 310 },
    ]);
    expect(layer.pick(400, 300)).toBeUndefined();
    layer.view(camera(300, true), 800, 600, 100);
    expect(layer.pick(400, 300)).toBeUndefined();
    for (const settings of [
      { onCoordinateTap: () => {} },
      { constructionInput: {} },
      { active: false },
    ]) {
      layer.update([maldives], { states: {}, ...settings });
      layer.view(camera(), 800, 600, 100);
      expect(layer.pick(400, 300)).toBeUndefined();
      expect(layer.element.childElementCount).toBe(0);
    }
    layer.dispose();
  });
});
