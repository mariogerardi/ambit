import { THIRD_JOURNEY } from "./fixtures/engine/thirdJourney";
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { geoArea, geoBounds } from "d3-geo";
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import { sphericalGeometry } from "../src/geography/sphericalGeometry.mjs";
import type { RegionFeature } from "../src/geography/types";
import {
  prepareGlobeRegions,
  createGlobeRegionPreparer,
  boundaryAltitude,
  boundaryResolution,
} from "../src/globe/geometry";
import { questionRegions } from "../src/game/presentation";
import { QUESTION_CATALOG } from "../src/game/questionCatalog";
const read = (name: string) =>
  JSON.parse(
    readFileSync(`public/geography/${name}.v1.json`, "utf8"),
  ) as RegionFeature[];
const world = read("world"),
  states = read("usa-adm1"),
  counties = read("ny-adm2");
describe("actual spherical renderer inputs", () => {
  it("preserves renderer identities across question and feedback transitions, including borderless rounds", () => {
    const prepare = createGlobeRegionPreparer();
    const first = prepare(world);
    first.forEach((r, i) => Object.assign(r, { __id: `mesh:${i}` }));
    for (const q of QUESTION_CATALOG.filter(
      (q) =>
        !q.highlightParts?.length &&
        !q.importedRegions?.length &&
        !Object.keys(q.displayGeometries ?? {}).length,
    ))
      for (const phase of ["playing", "feedback", "finished"] as const) {
        const input = questionRegions(world, q, phase);
        expect(input).toBe(world);
        expect(prepare(input)).toBe(first);
      }
    const nextArray = prepare([...world]);
    for (let i = 0; i < first.length; i++) expect(nextArray[i]).toBe(first[i]);
    expect((nextArray[0] as RegionFeature & { __id: string }).__id).toBe(
      "mesh:0",
    );
    expect(world.every((r) => !("__id" in r))).toBe(true);
    // Each renderer still gets independent library bookkeeping bindings.
    expect(createGlobeRegionPreparer()(world)[0]).not.toBe(first[0]);
  });
  it("changes only the owning country's render objects for an exclave and restores cached originals", () => {
    const q = THIRD_JOURNEY.rounds.find((q) => q.id === "nakhchivan-owner")!;
    const prepare = createGlobeRegionPreparer(),
      baseline = prepare(world);
    const input = questionRegions(world, q, "playing");
    expect(questionRegions(world, q, "playing")).toBe(input);
    const clue = prepare(input),
      byId = new Map(clue.map((r) => [r.id, r]));
    for (const r of baseline)
      if (r.id !== "wurl:AZE") expect(byId.get(r.id)).toBe(r);
    expect(byId.get("wurl:AZE")).not.toBe(
      baseline.find((r) => r.id === "wurl:AZE"),
    );
    expect(prepare(questionRegions(world, q, "feedback"))).toBe(baseline);
    expect(prepare(questionRegions(world, q, "playing"))).toBe(clue);
  });
  it("fills the Zambia border triangle previously omitted by the cap triangulator", async () => {
    // This dependency chooses its Three implementation from window at import.
    vi.stubGlobal("window", {});
    let Conic;
    try {
      Conic = (await import("three-conic-polygon-geometry")).default;
    } finally {
      vi.unstubAllGlobals();
    }
    const source = world.find((r) => r.id === "wurl:ZMB")!;
    const normalized = sphericalGeometry(source.geometry);
    const rendered = prepareGlobeRegions([source])[0].geometry;
    const phi = (-13.2 * Math.PI) / 180,
      theta = (23.2 * Math.PI) / 180;
    const direction = new Vector3(
      Math.cos(phi) * Math.sin(theta),
      Math.sin(phi),
      Math.cos(phi) * Math.cos(theta),
    );
    const ray = new Raycaster(
      direction.clone().multiplyScalar(3),
      direction.clone().negate(),
    );
    const hit = (geometry: RegionFeature["geometry"]) => {
      const parts =
        geometry.type === "Polygon"
          ? [geometry.coordinates]
          : geometry.coordinates;
      const material = new MeshBasicMaterial({ side: DoubleSide });
      const meshes = parts.map(
        (part) =>
          new Mesh(
            new Conic(
              part,
              0,
              1 + boundaryAltitude(source),
              false,
              true,
              false,
              boundaryResolution(source),
            ),
            material,
          ),
      );
      const intersects = ray.intersectObjects(meshes).length > 0;
      meshes.forEach((mesh) => mesh.geometry.dispose());
      material.dispose();
      return intersects;
    };
    expect(hit(normalized)).toBe(false);
    expect(hit(rendered)).toBe(true);
    expect(geoArea(rendered)).toBeCloseTo(geoArea(normalized), 10);
  });
  it("renders Ethiopia as its own footprint instead of the rest of Earth", () => {
    const source = world.find((r) => r.id === "wurl:ETH")!,
      render = prepareGlobeRegions([source])[0];
    expect(geoBounds(source.geometry)).toEqual([
      [-180, -90],
      [180, 90],
    ]);
    const [[west, south], [east, north]] = geoBounds(render.geometry);
    expect(west).toBeGreaterThan(30);
    expect(east).toBeLessThan(50);
    expect(south).toBeGreaterThan(0);
    expect(north).toBeLessThan(20);
    expect(geoArea(render.geometry)).toBeLessThan(0.1);
  });
  it("normalizes every individual map part across all three levels", () => {
    for (const region of prepareGlobeRegions([
      ...world,
      ...states,
      ...counties,
    ])) {
      const parts =
        region.geometry.type === "Polygon"
          ? [region.geometry.coordinates]
          : region.geometry.coordinates;
      for (const coordinates of parts)
        expect(
          geoArea({ type: "Polygon", coordinates }),
          region.id,
        ).toBeLessThan(2 * Math.PI);
    }
  });
  it("keeps coordinate identity stable across renderer updates and isolates renderer metadata", () => {
    const source = world.find((r) => r.id === "wurl:ETH")!,
      before = JSON.stringify(source);
    const first = prepareGlobeRegions([source])[0],
      second = prepareGlobeRegions([source])[0];
    expect(first.geometry).toBe(second.geometry);
    expect(first.geometry.coordinates[0]).toBe(second.geometry.coordinates[0]);
    expect(first).not.toBe(source);
    expect(first.geometry).not.toBe(source.geometry);
    Object.assign(first, { __id: "renderer-only" });
    expect(JSON.stringify(source)).toBe(before);
  });
  it("keeps tessellated caps above Earth at each zoom level", () => {
    for (const region of [world[0], states[0], counties[0]]) {
      // A curved triangle must clear its maximum chord sag, not just its vertices.
      const maximumHalfAngle =
        (((boundaryResolution(region) * Math.SQRT2) / 2) * Math.PI) / 180;
      expect(boundaryAltitude(region)).toBeGreaterThan(
        1 / Math.cos(maximumHalfAngle) - 1,
      );
    }
  });
});
