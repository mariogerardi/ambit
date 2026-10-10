import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import type {
  BoundaryLayerManifest,
  RegionFeature,
} from "../src/geography/types";
import {
  GeographyCatalog,
  childLayer,
  parentLayer,
} from "../src/geography/catalog";
import { validateRegions } from "../src/geography/loadLayer";
import {
  center,
  contains,
  sphericalGeometry,
  validateGeometry,
} from "../scripts/geometry.mjs";
import type { Polygon } from "geojson";
const read = (file: string) => JSON.parse(readFileSync(file, "utf8"));
const world = read("public/geography/world.v1.json") as RegionFeature[];
const states = read("public/geography/usa-adm1.v1.json") as RegionFeature[];
const counties = read("public/geography/ny-adm2.v1.json") as RegionFeature[];
const manifest = read(
  "public/geography/manifest.json",
) as BoundaryLayerManifest[];
const mapping = read("sources/catalog-mapping.json");
const catalog = new GeographyCatalog();
catalog.register([...world, ...states, ...counties]);
describe("shipped geography and identity", () => {
  it("preserves all source map units with unique canonical IDs", () => {
    expect(world).toHaveLength(242);
    expect(states).toHaveLength(56);
    expect(counties).toHaveLength(62);
    const all = [...world, ...states, ...counties];
    expect(new Set(all.map((r) => r.id)).size).toBe(all.length);
    all.forEach((region) => expect(region.id).toMatch(/^wurl:/));
  });
  it("maps New York and Queens source IDs to stable catalog IDs", () => {
    expect(mapping.states["66186276B43575054209436"].id).toBe("wurl:USA-NY");
    expect(mapping.counties["52423323B86897144494159"]).toMatchObject({
      id: "wurl:USA-NY-36081",
      fips: "36081",
      parentId: "wurl:USA-NY",
    });
    expect(catalog.hierarchy("wurl:USA-NY-36081").map((r) => r.name)).toEqual([
      "United States",
      "New York",
      "Queens County",
    ]);
  });
  it("keeps non-ISO Australian map units distinct from Australia", () => {
    const australian = Object.values(mapping.world) as {
      sovereign: string;
      id: string;
    }[];
    const ids = australian
      .filter((r) => r.sovereign === "Australia")
      .map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("wurl:AUS");
    expect(ids).toContain("wurl:NE-IOA");
  });
  it("maps every asset feature back to a documented source mapping", () => {
    for (const [features, table] of [
      [world, mapping.world],
      [states, mapping.states],
      [counties, mapping.counties],
    ] as const)
      for (const region of features)
        expect(table[region.sourceId].id).toBe(region.id);
  });
  it("contains Queens focus inside Queens and New York", () => {
    const queens = catalog.regions.get("wurl:USA-NY-36081")!,
      ny = catalog.regions.get("wurl:USA-NY")!;
    const p: [number, number] = [queens.focus.lng, queens.focus.lat];
    expect(contains(queens.geometry, p)).toBe(true);
    expect(contains(ny.geometry, p)).toBe(true);
  });
  it("contains every county representative point inside New York", () => {
    const ny = catalog.regions.get("wurl:USA-NY")!;
    counties.forEach((c) =>
      expect(contains(ny.geometry, center(c.geometry)), c.name).toBe(true),
    );
  });
  it("has valid closed WGS84 rings after topology simplification", () => {
    [...world, ...states, ...counties].forEach((r) =>
      expect(() => validateGeometry(r.geometry), r.name).not.toThrow(),
    );
    expect(world.some((r) => r.geometry.type === "MultiPolygon")).toBe(true);
  });
  it("supports manifest-driven drill-down and availability at every admin level", () => {
    expect(childLayer("wurl:USA", manifest)?.key).toBe("USA/ADM1");
    expect(childLayer("wurl:USA-NY", manifest)?.key).toBe("USA-NY/ADM2");
    expect(childLayer("wurl:ETH", manifest)?.key).toBe("ETH/ADM1");
    expect(childLayer("unknown", manifest)).toBeUndefined();
    expect(parentLayer("USA-NY/ADM2", manifest, catalog)).toBe("USA/ADM1");
    expect(parentLayer("USA/ADM1", manifest, catalog)).toBe("WORLD/ADM0");
  });
  it("does not loop indefinitely on malformed catalog hierarchy", () => {
    const c = new GeographyCatalog(),
      a = { ...world[0], id: "wurl:A", parentId: "wurl:B" },
      b = { ...world[1], id: "wurl:B", parentId: "wurl:A" };
    c.register([a, b]);
    expect(c.hierarchy("wurl:A")).toHaveLength(2);
  });
  it("validates runtime data without tying identity to array order", () => {
    expect(
      validateRegions([...world].reverse()).find((r) => r.id === "wurl:ETH")
        ?.name,
    ).toBe("Ethiopia");
    expect(() => validateRegions([world[0], world[0]])).toThrow();
    expect(() => validateRegions([{ ...world[0], id: "Ethiopia" }])).toThrow();
  });
});
describe("spherical geometry normalization", () => {
  it("uses a math copy and retains holes regardless of input winding", () => {
    const polygon: Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
        [
          [2, 2],
          [2, 4],
          [4, 4],
          [4, 2],
          [2, 2],
        ],
      ],
    };
    const original = JSON.stringify(polygon);
    expect(contains(polygon, [1, 1])).toBe(true);
    expect(contains(polygon, [3, 3])).toBe(false);
    expect(JSON.stringify(polygon)).toBe(original);
    expect(sphericalGeometry(polygon).coordinates[0]).toHaveLength(2);
    const reverse: Polygon = {
      ...polygon,
      coordinates: polygon.coordinates.map((r) => [...r].reverse()),
    };
    expect(contains(reverse, [1, 1])).toBe(true);
    expect(contains(reverse, [3, 3])).toBe(false);
  });
  it("centers an antimeridian polygon at the date line", () => {
    const polygon: Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [170, -10],
          [-170, -10],
          [-170, 10],
          [170, 10],
          [170, -10],
        ],
      ],
    };
    expect(Math.abs(center(polygon)[0])).toBeCloseTo(180, 4);
    expect(contains(polygon, [179, 0])).toBe(true);
    expect(contains(polygon, [0, 0])).toBe(false);
    expect(validateGeometry(polygon)).toBe(2);
  });
  it("rejects broken rings and coordinates", () => {
    expect(() =>
      validateGeometry({
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
          ],
        ],
      }),
    ).toThrow("Unclosed");
    expect(() =>
      validateGeometry({
        type: "Polygon",
        coordinates: [
          [
            [200, 0],
            [1, 0],
            [1, 1],
            [200, 0],
          ],
        ],
      }),
    ).toThrow("WGS84");
  });
});
