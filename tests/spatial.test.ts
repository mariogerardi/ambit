import { describe, expect, it } from "vitest";
import { geoDistance } from "d3-geo";
import type { RegionFeature, MapOverlay } from "../src/geography/types";
import {
  EARTH_KM,
  inCircle,
  countryWithinCircle,
  longitudeDelta,
} from "../src/game/spatial";
import { overlayPositions } from "../src/globe/overlays";

function region(coordinates: number[][][][]): RegionFeature {
  return {
    id: "island",
    name: "island",
    level: "ADM0",
    sourceId: "test",
    focus: { lat: 0, lng: 0 },
    geometry: { type: "MultiPolygon", coordinates },
  };
}
const square = (lng: number) => [
  [lng - 1, -1],
  [lng + 1, -1],
  [lng + 1, 1],
  [lng - 1, 1],
  [lng - 1, -1],
];

describe("spherical circle and coordinate rules", () => {
  it("includes the boundary and measures across the antimeridian", () => {
    const circle = {
      center: { lat: 0, lng: 179 },
      radiusKm: ((2 * Math.PI) / 180) * EARTH_KM,
    };
    expect(inCircle({ lat: 0, lng: -179 }, circle)).toBe(true);
    expect(inCircle({ lat: 0, lng: -178.99 }, circle)).toBe(false);
    expect(longitudeDelta(-179, 179)).toBe(2);
    expect(longitudeDelta(179, -179)).toBe(-2);
    expect(longitudeDelta(180, 0)).toBe(-180);
  });
  it("checks every island rather than the focus or largest polygon", () => {
    const circle = { center: { lat: 0, lng: 0 }, radiusKm: 1000 };
    expect(countryWithinCircle(region([[square(0)]]), circle)).toBe(true);
    expect(
      countryWithinCircle(region([[square(0)], [square(40)]]), circle),
    ).toBe(false);
    expect(
      countryWithinCircle(region([[square(179)]]), {
        center: { lat: 0, lng: -179 },
        radiusKm: 1000,
      }),
    ).toBe(true);
  });
  it("rejects an edge whose vertices fit but whose great-circle interior escapes a large disk", () => {
    const coordinates = [
      [150, 20],
      [-150, 20],
      [-150, 30],
      [150, 30],
      [150, 20],
    ];
    const circle = {
      center: { lat: 0, lng: 0 },
      radiusKm: ((150 * Math.PI) / 180) * EARTH_KM,
    };
    expect(
      coordinates.every(([lng, lat]) => inCircle({ lng, lat }, circle)),
    ).toBe(true);
    expect(countryWithinCircle(region([[coordinates]]), circle)).toBe(false);
  });
  it("anchors rendered rings to the same geodesic radius used for answers", () => {
    for (const center of [
      { lat: 36.81897, lng: 10.16579 },
      { lat: 85, lng: 179 },
    ]) {
      const overlay: MapOverlay = {
        id: "circle",
        type: "circle",
        center,
        radiusKm: 1500,
      };
      const positions = overlayPositions(overlay);
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i],
          y = positions[i + 1],
          z = positions[i + 2];
        const lat = (Math.asin(y / Math.hypot(x, y, z)) * 180) / Math.PI;
        const lng = (Math.atan2(x, z) * 180) / Math.PI;
        expect(
          Math.abs(
            geoDistance([lng, lat], [center.lng, center.lat]) * EARTH_KM - 1500,
          ),
        ).toBeLessThan(0.001);
        expect(Math.hypot(x, y, z)).toBeCloseTo(1.005, 6);
      }
    }
  });
});
