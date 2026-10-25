import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { geoContains, geoDistance, geoInterpolate } from "d3-geo";
import { sphericalGeometry } from "../src/geography/sphericalGeometry.mjs";
import type { RegionFeature } from "../src/geography/types";
import {
  borderRunPairs,
  landTopology,
} from "../src/minigames/borderRunTopology";
import { borderRunPath } from "../src/minigames/borderRunPath";
import { borderRunJourney, extraGameBase } from "../src/minigames/extraGames";
import { createQuestionContext } from "../src/game/questionPreparation";
const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const topology = landTopology(world),
  pairs = borderRunPairs(topology);
const find = (a: string, b: string) =>
  pairs.find(
    (p) =>
      p.countries.includes(`wurl:${a}`) && p.countries.includes(`wurl:${b}`),
  )!;
it("cannot turn disconnected possessions or archipelagos into land bridges", () => {
  for (const [a, b] of [
    ["SVK", "TLS"],
    ["MMR", "IDN"],
    ["SUR", "PRT"],
    ["BRA", "DEU"],
    ["PNG", "THA"],
  ])
    expect(find(a, b), `${a}/${b}`).toBeUndefined();
  expect(find("MMR", "MYS")).toBeDefined();
  const guyana = find("GUY", "FRA");
  expect(guyana).toBeDefined();
  expect(
    guyana.components.find((c) => c.countryId === "wurl:FRA")!.region.geometry
      .type,
  ).toBe("Polygon");
});
function pointIsLand(pair: (typeof pairs)[number], point: [number, number]) {
  return pair.components.some((c) =>
    geoContains(sphericalGeometry(c.region.geometry), point),
  );
}
it("routes through land and real borders without excursions to country centroids", () => {
  for (const [a, b] of [
    ["JOR", "VNM"],
    ["PRY", "SLV"],
    ["SVK", "PRT"],
    ["GUY", "FRA"],
  ]) {
    const pair = find(a, b);
    expect(pair, `${a}/${b}`).toBeDefined();
    const path = borderRunPath(pair);
    expect(path.length).toBeGreaterThan(3);
    const interior = path
      .slice(1)
      .map((p, i) => geoInterpolate(path[i], p)(0.5));
    const outside = interior.filter((p) => !pointIsLand(pair, p));
    // Geodesic shared-edge midpoints can differ from planar triangulation by
    // tiny rounding distances. No off-land segment may be longer than 1 km.
    for (let i = 0; i < interior.length; i++)
      if (!pointIsLand(pair, interior[i]))
        expect(
          geoDistance(path[i], path[i + 1]) * 6371.0088,
          `${a}/${b}: ${interior[i]}`,
        ).toBeLessThan(1);
    expect(outside.length).toBeLessThan(interior.length / 20 + 1);
    for (let i = 1; i < pair.components.length; i++) {
      const portals = pair.components[i - 1].neighbors.get(
        pair.components[i].key,
      )!;
      expect(
        path.some((p) => portals.some((q) => geoDistance(p, q.point) < 1e-8)),
      ).toBe(true);
    }
  }
});
it("frames the physical endpoint components, then the full revealed corridor", () => {
  const base = createQuestionContext(world, [], extraGameBase("border-run"));
  for (const pair of [
    find("JOR", "VNM"),
    find("GUY", "FRA"),
    find("PRY", "SLV"),
  ]) {
    const q = borderRunJourney(pair, base).rounds[0];
    expect(q.focus.altitude).toBeLessThan(3.1);
    expect(q.feedbackFocus).toBeDefined();
    expect(q.map!.borders).toBe(false);
    expect(q.map!.feedbackBorders).toBe(true);
    expect(q.explanation).toMatch(/^The shortest possible route was /);
    expect(q.explanation).not.toContain("crossings.");
    if (pair.countries.includes("wurl:FRA"))
      expect(q.focus.lng).toBeLessThan(-40);
    expect(borderRunJourney(pair, base, true).rounds[0].map!.borders).toBe(
      true,
    );
  }
});
const region = (id: string, rings: number[][][]): RegionFeature => ({
  id: `wurl:${id}`,
  name: id,
  level: "ADM0",
  sourceId: "test",
  focus: { lat: 2, lng: 2 },
  geometry: { type: "Polygon", coordinates: rings },
});
it("bends around concave coastlines instead of drawing through the sea", () => {
  const shapes = [
    region("FRA", [
      [
        [0, 0],
        [4, 0],
        [4, 1],
        [1, 1],
        [1, 4],
        [0, 4],
        [0, 1],
        [0, 0],
      ],
    ]),
    region("ESP", [
      [
        [-1, 0],
        [0, 0],
        [0, 1],
        [-1, 1],
        [-1, 0],
      ],
    ]),
    region("DEU", [
      [
        [0, 4],
        [1, 4],
        [1, 5],
        [0, 5],
        [0, 4],
      ],
    ]),
  ];
  const pair = borderRunPairs(landTopology(shapes))[0],
    path = borderRunPath(pair);
  expect(path.length).toBeGreaterThan(8);
  for (let i = 1; i < path.length; i++)
    expect(pointIsLand(pair, geoInterpolate(path[i - 1], path[i])(0.5))).toBe(
      true,
    );
});
it("routes around a polygon hole rather than crossing it", () => {
  const shapes = [
    region("FRA", [
      [
        [0, 0],
        [6, 0],
        [6, 6],
        [0, 6],
        [0, 0],
      ],
      [
        [2, 2],
        [2, 4],
        [4, 4],
        [4, 2],
        [2, 2],
      ],
    ]),
    region("ESP", [
      [
        [-1, 0],
        [0, 0],
        [0, 6],
        [-1, 6],
        [-1, 0],
      ],
    ]),
    region("DEU", [
      [
        [6, 0],
        [7, 0],
        [7, 6],
        [6, 6],
        [6, 0],
      ],
    ]),
  ];
  const pair = borderRunPairs(landTopology(shapes))[0],
    path = borderRunPath(pair);
  for (let i = 1; i < path.length; i++)
    expect(pointIsLand(pair, geoInterpolate(path[i - 1], path[i])(0.5))).toBe(
      true,
    );
});
