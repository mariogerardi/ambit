import { describe, expect, it } from "vitest";
import { MAP_ANNOTATION_ALTITUDE } from "../src/globe/surface";
import { canPickRegion, raisedSurfacePoint } from "../src/globe/interaction";
import { PerspectiveCamera, Vector3 } from "three";

it("keeps a local circle drag attached to its raised surface", () => {
  const camera = new PerspectiveCamera(50, 1, 0.001, 12);
  camera.position.set(0, 0, 1.008);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const point = new Vector3(
    0.0005,
    0,
    Math.sqrt((1 + MAP_ANNOTATION_ALTITUDE) ** 2 - 0.0005 ** 2),
  );
  const projected = point.clone().project(camera);
  const hit = raisedSurfacePoint(
    camera,
    (projected.x + 1) * 500,
    (1 - projected.y) * 500,
    1000,
    1000,
    1 + MAP_ANNOTATION_ALTITUDE,
  )!;
  expect(hit.distanceTo(point)).toBeLessThan(1e-10);
  const base = raisedSurfacePoint(
    camera,
    (projected.x + 1) * 500,
    (1 - projected.y) * 500,
    1000,
    1000,
    1,
  )!;
  expect(base.x).toBeGreaterThan(hit.x * 1.2);
});

describe("region answer affordances", () => {
  it("keeps context and revealed answers inspectable without making them selectable", () => {
    const settings = {
      regionInteraction: true,
      selectableRegionIds: [],
      states: { context: "hinted", solution: "answer" } as const,
    };
    expect(canPickRegion({ id: "context" }, settings)).toBe(false);
    expect(canPickRegion({ id: "solution" }, settings)).toBe(false);
  });

  it("uses eligibility independently of fill, including blind picks and eliminated candidates", () => {
    const settings = {
      regionInteraction: true,
      selectDisabled: true,
      selectableRegionIds: ["blind"],
      states: { blind: "disabled", eliminated: "selectable" } as const,
    };
    expect(canPickRegion({ id: "blind" }, settings)).toBe(true);
    expect(canPickRegion({ id: "eliminated" }, settings)).toBe(false);
    expect(canPickRegion({ id: "blind", displayBase: true }, settings)).toBe(
      false,
    );
    expect(
      canPickRegion({ id: "blind" }, { ...settings, regionInteraction: false }),
    ).toBe(false);
  });

  it("preserves ordinary Explore selection outside a Journey", () => {
    expect(canPickRegion({ id: "country" }, { states: {} })).toBe(true);
  });
});
