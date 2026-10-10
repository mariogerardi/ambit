import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { geoContains } from "d3-geo";
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import { reconcileRegionalDisplay } from "../scripts/regional-display.mjs";
import {
  catalogRegions,
  exploreBoundaries,
  isCanonicalRegion,
} from "../src/geography/regions";
import { sphericalGeometry } from "../src/geography/sphericalGeometry.mjs";
import { validateRegions } from "../src/geography/loadLayer";
import {
  boundaryAltitude,
  boundaryResolution,
  createGlobeRegionPreparer,
  prepareGlobeRegions,
} from "../src/globe/geometry";
import type { RegionFeature } from "../src/geography/types";

const read = (name: string) =>
  validateRegions(
    JSON.parse(readFileSync(`public/geography/${name}.v1.json`, "utf8")),
  );
const world = read("world"),
  states = read("usa-adm1"),
  counties = read("ny-adm2");
const square = (a: number, b: number, c: number, d: number) => [
  [a, b],
  [c, b],
  [c, d],
  [a, d],
  [a, b],
];
const fixture = (id: string, coordinates: number[][][]): RegionFeature => ({
  id,
  name: id,
  sourceId: "test",
  level: "ADM1",
  parentId: "wurl:parent",
  focus: { lat: 1, lng: 1 },
  geometry: { type: "Polygon", coordinates },
});

describe("continuous subdivision display", () => {
  it("shows Michigan's two peninsulas and all five Great Lakes without changing water-border answers", async () => {
    const canada = read("can-adm1");
    const displayed = prepareGlobeRegions(
      exploreBoundaries(world, [states, canada]),
    );
    const michigan = states.find((r) => r.id === "wurl:USA-MI")!;
    expect(isCanonicalRegion(michigan)).toBe(true);
    const shape = sphericalGeometry(michigan.displayGeometry!);
    expect(geoContains(shape, [-87.4, 46.5])).toBe(true); // Upper Peninsula
    expect(geoContains(shape, [-84.5, 43.5])).toBe(true); // Lower Peninsula
    for (const point of [
      [-87, 44],
      [-88, 47.5],
      [-82.5, 44.5],
      [-81, 42.2],
      [-77.8, 43.6],
    ] as [number, number][]) {
      expect(
        displayed.some((r) => geoContains(r.geometry, point)),
        `lake at ${point}`,
      ).toBe(false);
    }
    // All canonical answer identities and geometry fingerprints are unchanged.
    expect(
      catalogRegions([...states, ...canada]).every(isCanonicalRegion),
    ).toBe(true);
    // Check the actual cap triangles, not just polygon containment.
    vi.stubGlobal("window", {});
    let Conic;
    try {
      Conic = (await import("three-conic-polygon-geometry")).default;
    } finally {
      vi.unstubAllGlobals();
    }
    const rendered = displayed.find((r) => r.id === michigan.id)!;
    const parts =
      rendered.geometry.type === "Polygon"
        ? [rendered.geometry.coordinates]
        : rendered.geometry.coordinates;
    const material = new MeshBasicMaterial({ side: DoubleSide });
    const meshes = parts.map(
      (part) =>
        new Mesh(
          new Conic(
            part,
            0,
            1 + boundaryAltitude(rendered),
            false,
            true,
            false,
            boundaryResolution(rendered),
          ),
          material,
        ),
    );
    for (const [lng, lat, land] of [
      [-87.4, 46.5, true],
      [-84.5, 43.5, true],
      [-87, 44, false],
      [-84.7, 45.9, false],
    ] as const) {
      const phi = (lat * Math.PI) / 180,
        theta = (lng * Math.PI) / 180;
      const direction = new Vector3(
        Math.cos(phi) * Math.sin(theta),
        Math.sin(phi),
        Math.cos(phi) * Math.cos(theta),
      );
      const ray = new Raycaster(
        direction.clone().multiplyScalar(2),
        direction.clone().negate(),
      );
      expect(
        ray.intersectObjects(meshes).length > 0,
        `Michigan at ${lng}, ${lat}`,
      ).toBe(land);
    }
    meshes.forEach((mesh) => mesh.geometry.dispose());
    material.dispose();
  });
  it("clips exterior land and real holes without changing canonical answer geometry", async () => {
    const parent = fixture("wurl:parent", [
      square(0, 0, 4, 4),
      square(1, 1, 2, 2).reverse(),
    ]);
    const child = fixture("wurl:child", [square(-1, -1, 5, 5)]);
    const before = JSON.stringify(child);
    const [display] = await reconcileRegionalDisplay(parent, [child]);
    expect(JSON.stringify(child)).toBe(before);
    expect(display.geometry).toBe(child.geometry);
    expect(display.id).toBe(child.id);
    const shape = sphericalGeometry(display.displayGeometry!);
    expect(geoContains(shape, [0.5, 0.5])).toBe(true);
    expect(geoContains(shape, [-0.5, 0.5])).toBe(false);
    expect(geoContains(shape, [1.5, 1.5])).toBe(false);
  });
  it("keeps unavailable island footprints in the catalog without inventing visible land", async () => {
    const parent = fixture("wurl:parent", [square(0, 0, 1, 1)]);
    const child = fixture("wurl:island", [square(3, 3, 4, 4)]);
    const [display] = await reconcileRegionalDisplay(parent, [child]);
    expect(display.displayGeometry).toBeNull();
    expect(display.geometry).toBe(child.geometry);
    expect(prepareGlobeRegions([display])).toEqual([]);
    expect(exploreBoundaries([parent], [[display]])).toEqual([parent]);
  });
  it("divides long missing strips among adjacent regions and uses those same shapes for selection", async () => {
    const parent = fixture("wurl:parent", [square(0, 0, 4, 4)]);
    parent.level = "ADM0";
    const children = [
      fixture("wurl:left", [square(0.15, 0.2, 2, 3.8)]),
      fixture("wurl:right", [square(2, 0.2, 3.85, 3.8)]),
    ];
    const before = JSON.stringify(children);
    const display = await reconcileRegionalDisplay(parent, children);
    const owners = (point: [number, number]) =>
      display.filter(
        (r) =>
          r.displayGeometry &&
          geoContains(sphericalGeometry(r.displayGeometry), point),
      );
    for (const [point, id] of [
      [[0.02, 0.1], "wurl:left"],
      [[3.98, 0.1], "wurl:right"],
      [[1.6, 3.95], "wurl:left"],
      [[2.4, 3.95], "wurl:right"],
    ] as const)
      expect(owners([...point]).map((r) => r.id)).toEqual([id]);
    for (let x = 0.1; x < 4; x += 0.3)
      for (let y = 0.1; y < 4; y += 0.3) expect(owners([x, y])).toHaveLength(1);
    expect(JSON.stringify(children)).toBe(before);
    const complete = exploreBoundaries([parent], [display]);
    expect(complete[0].displayCovered).toBe(true);
    expect(prepareGlobeRegions(complete).map((r) => r.id)).toEqual([
      "wurl:left",
      "wurl:right",
    ]);
    const partial = exploreBoundaries([parent], [[display[0]]]);
    expect(partial[0].displayCovered).toBe(false);
    expect(prepareGlobeRegions(partial).some((r) => r.id === parent.id)).toBe(
      true,
    );
    expect(exploreBoundaries([parent], [display])[0]).toBe(complete[0]);
  });
  it("retains continuous country and nested parent coverage with stable render identities", () => {
    const before = JSON.stringify(world);
    const prepare = createGlobeRegionPreparer();
    const original = prepare(world);
    const branch = exploreBoundaries(world, [states, counties]);
    const repeated = exploreBoundaries(world, [states, counties]);
    for (const id of ["wurl:USA", "wurl:USA-NY"]) {
      const base = branch.find((r) => r.id === id)!;
      expect(base.displayBase).toBe(true);
      expect(repeated.find((r) => r.id === id)).toBe(base);
    }
    expect(branch.find((r) => r.id === "wurl:USA")!.geometry).toBe(
      world.find((r) => r.id === "wurl:USA")!.geometry,
    );
    const rendered = prepare(branch),
      again = prepare(repeated);
    for (let i = 0; i < rendered.length; i++)
      expect(again[i]).toBe(rendered[i]);
    expect(prepare(world)).toBe(original);
    expect(JSON.stringify(world)).toBe(before);
    expect(branch.find((r) => r.id === "wurl:CAN")).toBe(
      world.find((r) => r.id === "wurl:CAN"),
    );
  });
  it.each([
    ["AZE", [44.775, 39.7]],
    ["ITA", [15.725, 37.95]],
  ] as const)(
    "makes the reported %s edge strip part of a clickable subdivision cap",
    async (code, coordinates) => {
      const children = read(`${code.toLowerCase()}-adm1`);
      const country = world.find((r) => r.id === `wurl:${code}`)!;
      const point: [number, number] = [...coordinates];
      expect(geoContains(sphericalGeometry(country.geometry), point)).toBe(
        true,
      );
      expect(
        children.some((r) => geoContains(sphericalGeometry(r.geometry), point)),
      ).toBe(false);
      const branch = exploreBoundaries(world, [children]);
      expect(branch.find((r) => r.id === country.id)?.displayCovered).toBe(
        true,
      );
      const inputs = prepareGlobeRegions(branch);
      expect(inputs.some((r) => r.id === country.id)).toBe(false);
      const owners = inputs.filter(
        (r) => r.parentId === country.id && geoContains(r.geometry, point),
      );
      expect(owners).toHaveLength(1);
      const rendered = owners[0];
      vi.stubGlobal("window", {});
      let Conic;
      try {
        Conic = (await import("three-conic-polygon-geometry")).default;
      } finally {
        vi.unstubAllGlobals();
      }
      const parts =
        rendered.geometry.type === "Polygon"
          ? [rendered.geometry.coordinates]
          : rendered.geometry.coordinates;
      const material = new MeshBasicMaterial({ side: DoubleSide });
      const meshes = parts.map(
        (part) =>
          new Mesh(
            new Conic(
              part,
              0,
              1 + boundaryAltitude(rendered),
              false,
              true,
              false,
              boundaryResolution(rendered),
            ),
            material,
          ),
      );
      const lat = (point[1] * Math.PI) / 180,
        lng = (point[0] * Math.PI) / 180;
      const direction = new Vector3(
        Math.cos(lat) * Math.sin(lng),
        Math.sin(lat),
        Math.cos(lat) * Math.cos(lng),
      );
      const ray = new Raycaster(
        direction.clone().multiplyScalar(2),
        direction.clone().negate(),
      );
      expect(ray.intersectObjects(meshes).length).toBeGreaterThan(0);
      meshes.forEach((mesh) => mesh.geometry.dispose());
      material.dispose();
      expect(children.every(isCanonicalRegion)).toBe(true);
    },
  );
  it("keeps regional triangles above parent caps even between vertices", () => {
    for (const region of [states[0], counties[0]]) {
      const half = (boundaryResolution(region) * Math.SQRT2 * Math.PI) / 360;
      const minimumRadius = (1 + boundaryAltitude(region)) * Math.cos(half);
      const parent = region.level === "ADM1" ? world[0] : states[0];
      expect(minimumRadius).toBeGreaterThan(1 + boundaryAltitude(parent));
    }
  });
  it("rejects malformed display shapes in local assets", () => {
    expect(() =>
      validateRegions([
        {
          ...states[0],
          displayGeometry: { type: "Point", coordinates: [0, 0] },
        },
      ]),
    ).toThrow();
  });
});
