import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { geoContains } from "d3-geo";
import { interiorAnchor } from "../src/geography/interiorAnchor";
import { sphericalGeometry } from "../src/geography/sphericalGeometry.mjs";
import type { RegionFeature } from "../src/geography/types";

const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
describe("country response anchors", () => {
  it.each([
    "FRA",
    "JPN",
    "NOR",
    "IDN",
    "NZL",
    "USA",
    "RUS",
    "FJI",
    "CAN",
    "ATA",
    "MCO",
  ])("puts %s's symbol on land rather than at its camera focus", (code) => {
    const region = world.find((region) => region.id === `wurl:${code}`)!;
    const anchor = interiorAnchor(region);
    expect(
      geoContains(sphericalGeometry(region.geometry), [anchor.lng, anchor.lat]),
    ).toBe(true);
    expect(interiorAnchor(region)).toBe(anchor);
    if (code === "FRA") expect(anchor.lng).toBeGreaterThan(-5);
    if (code === "JPN") expect(anchor.lat).toBeLessThan(41.6); // main Honshu, not a tiny offshore island
  });

  it("avoids holes and uses the displayed footprint independently of camera focus", () => {
    const region: RegionFeature = {
      id: "donut",
      name: "Donut",
      level: "ADM0",
      sourceId: "test",
      focus: { lat: 0, lng: 0 },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [12, 0],
            [12, 12],
            [0, 12],
            [0, 0],
          ],
          [
            [4, 4],
            [4, 8],
            [8, 8],
            [8, 4],
            [4, 4],
          ],
        ],
      },
    };
    const point = interiorAnchor(region);
    expect(
      geoContains(sphericalGeometry(region.geometry), [point.lng, point.lat]),
    ).toBe(true);
    expect(
      point.lng < 4 || point.lng > 8 || point.lat < 4 || point.lat > 8,
    ).toBe(true);
    const displayGeometry: RegionFeature["geometry"] = {
      type: "Polygon",
      coordinates: [
        [
          [30, 0],
          [32, 0],
          [32, 2],
          [30, 2],
          [30, 0],
        ],
      ],
    };
    const displayed = interiorAnchor({ ...region, displayGeometry });
    expect(
      geoContains(sphericalGeometry(displayGeometry), [
        displayed.lng,
        displayed.lat,
      ]),
    ).toBe(true);
    expect(region.focus).toEqual({ lat: 0, lng: 0 });
  });
});
