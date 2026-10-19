import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { geoInterpolate } from "d3-geo";
import type { RegionFeature } from "../src/geography/types";
import { boundaryAltitude, prepareGlobeRegions } from "../src/globe/geometry";
import {
  boundaryOutlinePositions,
  outlineColor,
  outlineEmphasis,
  outlineResolution,
  surfaceRoutePositions,
} from "../src/globe/outlines";
import { LIMA, WINDHOEK } from "./fixtures/engine/journey";

const regions = prepareGlobeRegions(
  ["world", "usa-adm1", "ny-adm2"].flatMap(
    (name) =>
      JSON.parse(
        readFileSync(`public/geography/${name}.v1.json`, "utf8"),
      ) as RegionFeature[],
  ),
);
describe("independent boundary outlines", () => {
  it("uses the same quiet outline for clues and references independently of hover", () => {
    const clue = outlineEmphasis("clue");
    expect(clue).toEqual(outlineEmphasis("hinted"));
    expect(clue.width).toBe(outlineEmphasis("selectable").width);
    expect(clue.order).toBeGreaterThan(outlineEmphasis("disabled").order);
    expect(clue.lift).toBeGreaterThan(0);
    expect(outlineEmphasis("clue", true)).toEqual(clue);
  });
  it("raises reference outlines above ordinary geography without changing selection priority", () => {
    const reference = outlineEmphasis("hinted");
    expect(reference.order).toBeGreaterThan(outlineEmphasis("disabled").order);
    expect(reference.order).toBeLessThan(outlineEmphasis("selected").order);
    expect(reference.lift).toBeGreaterThan(0);
    expect(reference.lift).toBeLessThan(0.0005);
  });
  it("draws committed selections above neighboring and hovered outlines", () => {
    const ordinary = outlineEmphasis("selectable"),
      hover = outlineEmphasis("selectable", true);
    for (const state of [
      "selected",
      "answer",
      "correct",
      "incorrect",
    ] as const) {
      const active = outlineEmphasis(state);
      expect(active.order).toBeGreaterThan(hover.order);
      expect(active.width).toBeGreaterThan(ordinary.width);
      expect(active.lift).toBe(0);
    }
    expect(outlineEmphasis("selected", true)).toEqual(
      outlineEmphasis("selected"),
    );
    expect(ordinary.lift).toBe(0);
    expect(hover.width).toBeGreaterThan(ordinary.width);
    expect(outlineEmphasis("hinted", true)).toEqual(outlineEmphasis("hinted"));
  });
  it("keeps lowered country reference segments above state and county caps", () => {
    const country = regions.find((r) => r.id === "wurl:USA")!;
    const subdivisions = regions.filter((r) =>
      ["ADM1", "ADM2"].includes(r.level),
    );
    expect(subdivisions.length).toBeGreaterThan(0);
    const capRadius = Math.max(
      ...subdivisions.map((r) => 1 + boundaryAltitude(r)),
    );
    const positions = boundaryOutlinePositions(country);
    const scale = 1 + outlineEmphasis("hinted").lift;
    for (let i = 0; i < positions.length; i += 6) {
      const midpoint = Math.hypot(
        (positions[i] + positions[i + 3]) / 2,
        (positions[i + 1] + positions[i + 4]) / 2,
        (positions[i + 2] + positions[i + 5]) / 2,
      );
      expect(midpoint * scale).toBeGreaterThan(capRadius);
    }
  });
  it("keeps every straight segment above the highest possible land surface, including its midpoint", () => {
    for (const region of regions) {
      const positions = boundaryOutlinePositions(region);
      expect(positions.length % 6).toBe(0);
      for (let i = 0; i < positions.length; i += 6) {
        const a = positions.slice(i, i + 3),
          b = positions.slice(i + 3, i + 6);
        expect(Math.hypot(...a)).toBeLessThan(
          1 + boundaryAltitude(region) + 0.00003,
        );
        const middle = Math.hypot(
          (a[0] + b[0]) / 2,
          (a[1] + b[1]) / 2,
          (a[2] + b[2]) / 2,
        );
        expect(middle, region.id).toBeGreaterThan(1 + boundaryAltitude(region));
        const angle = Math.acos(
          Math.min(
            1,
            (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) /
              (Math.hypot(...a) * Math.hypot(...b)),
          ),
        );
        expect(angle).toBeLessThanOrEqual(
          (outlineResolution * Math.PI) / 180 + 0.000001,
        );
      }
    }
  });
  it("preserves source coordinates and reuses buffers during hover and answer updates", () => {
    const region = regions.find((r) => r.id === "wurl:NAM")!;
    const before = JSON.stringify(region.geometry);
    const positions = boundaryOutlinePositions(region);
    expect(boundaryOutlinePositions(region)).toBe(positions);
    expect(JSON.stringify(region.geometry)).toBe(before);
  });
  it("retains outline opacity without passing unsupported rgba colors to Three", () => {
    expect(outlineColor("rgba(37,62,60,0.52)")).toEqual({
      color: "rgb(37,62,60)",
      opacity: 0.52,
    });
    expect(outlineColor("#ffefbd")).toEqual({ color: "#ffefbd", opacity: 1 });
  });
  it("renders the same spherical route used for quiz answers, above the country caps", () => {
    const route = { id: "test:homeward", from: LIMA, to: WINDHOEK };
    const positions = surfaceRoutePositions(route);
    const interpolate = geoInterpolate(
      [LIMA.lng, LIMA.lat],
      [WINDHOEK.lng, WINDHOEK.lat],
    );
    const steps = positions.length / 6;
    for (let i = 0; i < steps; i++) {
      const a = positions.slice(i * 6, i * 6 + 3);
      const b = positions.slice(i * 6 + 3, i * 6 + 6);
      for (const [point, t] of [
        [a, i / steps],
        [b, (i + 1) / steps],
      ] as const) {
        const radius = Math.hypot(...point);
        const [lng, lat] = interpolate(t);
        expect((Math.atan2(point[0], point[2]) * 180) / Math.PI).toBeCloseTo(
          lng,
          4,
        );
        expect((Math.asin(point[1] / radius) * 180) / Math.PI).toBeCloseTo(
          lat,
          4,
        );
      }
      expect(
        Math.hypot((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2),
      ).toBeGreaterThan(1.0015);
    }
    expect(surfaceRoutePositions(route)).toBe(positions);
  });
});
