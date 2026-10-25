import { sharedBoundary } from "../src/minigames/sharedBoundary";
import { compositeRegion } from "../src/game/compositeRegions";
import { sphericalGeometry } from "../src/geography/sphericalGeometry.mjs";
import { readFileSync } from "node:fs";
import { geoArea, geoDistance } from "d3-geo";
import { expect, it } from "vitest";
import type { RegionFeature } from "../src/geography/types";
import { createQuestionContext } from "../src/game/questionPreparation";
import { journeyWorld } from "../src/app/journeyWorld";
import {
  missingBorderPairs,
  missingBorderAnchor,
  missingBorderFocus,
  missingBorderJourney,
  missingBordersBase,
  missingBorderCandidateContinent,
  inMissingBorderSearch,
} from "../src/minigames/missingBorders";
import {
  startNeighborRun,
  neighborReducer,
  neighborGame,
  neighborDeck,
} from "../src/minigames/sharedNeighbors";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const base = createQuestionContext(regions, [], missingBordersBase);
const pairs = missingBorderPairs(regions);

it("generates a stable pool of real land borders, including overseas components", () => {
  expect(pairs.length).toBeGreaterThan(200);
  expect(new Set(pairs.map((p) => p.id)).size).toBe(pairs.length);
  for (const pair of pairs)
    expect(base.graph.get(pair.countries[0])?.has(pair.countries[1])).toBe(
      true,
    );
  const franceBrazil = pairs.find((p) => p.id === "wurl:BRA|wurl:FRA")!;
  const anchor = missingBorderAnchor(franceBrazil, regions);
  expect(anchor.lat).toBeGreaterThan(0);
  expect(anchor.lat).toBeLessThan(6);
  expect(anchor.lng).toBeLessThan(-45);
  expect(missingBorderPairs([...regions].reverse())).toEqual(pairs);
  const deck = neighborDeck(pairs, 123, 0);
  expect(new Set(deck.map((p) => p.id)).size).toBe(pairs.length);
});

it("prepares and dissolves every pair, with selectable distractors and no answer-only emphasis", () => {
  for (const pair of pairs) {
    const journey = missingBorderJourney(pair, base, regions, 123);
    expect(journey.rounds[0].feedbackOverlays?.length, pair.id).toBeGreaterThan(
      0,
    );
    const context = createQuestionContext(regions, [], journey, base);
    const run = startNeighborRun(pairs);
    const play = journeyWorld(
      regions,
      journey,
      neighborGame(run, journey),
      context,
    );
    expect(play.regions.some((r) => r.id === pair.answer)).toBe(true);
    for (const id of pair.countries)
      expect(play.regions.some((r) => r.id === id)).toBe(false);
    expect(play.regionNames).toBe("none");
    expect(play.showBorders).toBe(true);
    expect(play.selectableRegionIds!.length).toBeGreaterThan(2);
    const other = play.selectableRegionIds!.find((id) => id !== pair.answer)!;
    expect(play.states[pair.answer]).toBe(play.states[other]);
    const graded = neighborReducer(
      run,
      { type: "select", id: pair.answer },
      journey,
      context,
      pairs.length,
    );
    expect(graded).toMatchObject({ answered: 1, correct: 1, result: true });
    const reveal = journeyWorld(
      regions,
      journey,
      neighborGame(graded, journey),
      context,
    );
    expect(reveal.regions.some((r) => r.id === pair.answer)).toBe(false);
    for (const id of pair.countries) expect(reveal.states[id]).toBe("correct");
  }
});

it.each([0, 123, 456])(
  "keeps every boundary off-center and visible with regional distractors (seed %i)",
  (seed) => {
    const rad = Math.PI / 180;
    for (const pair of pairs) {
      const focus = missingBorderFocus(pair, regions, seed);
      const anchor = missingBorderAnchor(pair, regions);
      const distance =
        geoDistance([focus.lng, focus.lat], [anchor.lng, anchor.lat]) / rad;
      expect(distance).toBeGreaterThanOrEqual(12 - 1e-6);
      expect(distance).toBeLessThanOrEqual(24 + 1e-6);
      expect(focus.altitude).toBe(1.25);
      const distractors = regions.filter(
        (r) =>
          !pair.countries.includes(r.id) &&
          geoDistance([focus.lng, focus.lat], [r.focus.lng, r.focus.lat]) <
            42 * rad,
      );
      expect(distractors.length, pair.id).toBeGreaterThanOrEqual(6);
    }
  },
);

it("varies regional framing reproducibly between saved seeds", () => {
  expect(missingBorderFocus(pairs[0], regions, 123)).toEqual(
    missingBorderFocus(pairs[0], regions, 123),
  );
  expect(missingBorderFocus(pairs[0], regions, 456)).not.toEqual(
    missingBorderFocus(pairs[0], regions, 123),
  );
});

it("frames selectable regional land instead of the offshore search-circle center without changing eligibility", () => {
  const pair = pairs.find((p) => p.id === "wurl:GHA|wurl:TGO")!;
  const search = missingBorderFocus(pair, regions, 123);
  const q = missingBorderJourney(pair, base, regions, 123, false).rounds[0];
  const candidates = regions.filter(
    (r) =>
      !pair.countries.includes(r.id) &&
      missingBorderCandidateContinent(r) === "AF" &&
      inMissingBorderSearch(r.focus, search, false),
  );
  expect(q.selection).toEqual({
    type: "ids",
    ids: [...candidates.map((r) => r.id), pair.answer],
  });
  expect(search.lng).toBeLessThan(0);
  expect(q.focus.lng).toBeGreaterThan(0);
  expect(q.focus.lat).toBeGreaterThan(0);
  expect(
    missingBorderJourney(pair, base, regions, 123, false).rounds[0].focus,
  ).toEqual(q.focus);
  for (const region of [
    ...candidates,
    ...regions.filter((r) => pair.countries.includes(r.id)),
  ]) {
    const geometry = region.displayGeometry ?? region.geometry;
    const polygons =
      geometry.type === "Polygon"
        ? [geometry.coordinates]
        : geometry.coordinates;
    for (const [lng, lat] of polygons.flatMap((polygon) => polygon[0])) {
      if (!inMissingBorderSearch({ lng, lat }, search, false)) continue;
      const angle = geoDistance([q.focus.lng, q.focus.lat], [lng, lat]);
      expect(Math.cos(angle)).toBeGreaterThan(1 / (1 + q.focus.altitude!));
      const projectedAngle = Math.atan2(
        Math.sin(angle),
        1 + q.focus.altitude! - Math.cos(angle),
      );
      expect((projectedAngle * 180) / Math.PI).toBeLessThan(22);
    }
  }
});

it("rejects hidden member IDs, grades a pick immediately, locks reveals, and ends at three strikes", () => {
  const pair = pairs.find((p) => p.id === "wurl:ESP|wurl:PRT")!;
  const journey = missingBorderJourney(pair, base, regions, 123);
  const context = createQuestionContext(regions, [], journey, base);
  let run = startNeighborRun(pairs);
  for (const action of [
    { type: "select", id: pair.countries[0] },
    { type: "select", id: "unknown" },
    { type: "pin", lat: 0, lng: 0 },
    { type: "submit" },
  ] as const)
    expect(neighborReducer(run, action, journey, context, pairs.length)).toBe(
      run,
    );
  for (let i = 1; i <= 3; i++) {
    run = neighborReducer(
      run,
      { type: "select", id: "wurl:FRA" },
      journey,
      context,
      pairs.length,
    );
    expect(run).toMatchObject({ answered: i, correct: 0, result: false });
    expect(
      neighborReducer(
        run,
        { type: "select", id: pair.answer },
        journey,
        context,
        pairs.length,
      ),
    ).toBe(run);
    if (i < 3) {
      run = neighborReducer(
        run,
        { type: "next" },
        journey,
        context,
        pairs.length,
      );
      expect(run.selectedId).toBeUndefined();
    }
  }
  expect(run.ended).toBe("strikes");
});

it.each([
  ["FRA", "ITA"],
  ["LAO", "KHM"],
])(
  "matches detailed neighboring borders for the merged %s/%s display while preserving grading geometry",
  (a, b) => {
    const pair = pairs.find(
      (p) =>
        p.countries.includes(`wurl:${a}`) && p.countries.includes(`wurl:${b}`),
    )!;
    const q = missingBorderJourney(pair, base, regions, 123).rounds[0];
    const merged = compositeRegion(regions, q);
    const members = pair.countries.map(
      (id) => regions.find((r) => r.id === id)!,
    );
    const edges = (geometry: RegionFeature["geometry"]) => {
      const parts =
        geometry.type === "Polygon"
          ? [geometry.coordinates]
          : geometry.coordinates;
      return parts.flatMap((part) =>
        part.flatMap((ring) =>
          ring
            .slice(1)
            .map((point, i) =>
              [point.join(","), ring[i].join(",")].sort().join("|"),
            ),
        ),
      );
    };
    const expected = new Set<string>();
    for (const member of members)
      for (const edge of edges(member.displayGeometry!)) {
        if (expected.has(edge)) expected.delete(edge);
        else expected.add(edge);
      }
    expect(merged.displayGeometry).toBeDefined();
    expect(new Set(edges(merged.displayGeometry!))).toEqual(expected);
    expect(geoArea(sphericalGeometry(merged.displayGeometry!))).toBeCloseTo(
      members.reduce(
        (sum, r) => sum + geoArea(sphericalGeometry(r.displayGeometry!)),
        0,
      ),
      10,
    );
    expect(geoArea(sphericalGeometry(merged.geometry))).toBeCloseTo(
      members.reduce(
        (sum, r) => sum + geoArea(sphericalGeometry(r.geometry)),
        0,
      ),
      10,
    );
  },
);

it.each([
  ["FRA", "ITA"],
  ["LAO", "KHM"],
  ["BRA", "FRA"],
])("traces only real detailed shared edges for %s/%s on reveal", (a, b) => {
  const members = [a, b].map(
    (id) => regions.find((r) => r.id === `wurl:${id}`)!,
  );
  const key = (a: number[], b: number[]) =>
    [a.join(","), b.join(",")].sort().join("|");
  const edges = (r: RegionFeature) => {
    const g = r.displayGeometry ?? r.geometry;
    const polygons = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    return new Set(
      polygons.flatMap((p) =>
        p.flatMap((ring) => ring.slice(1).map((p, i) => key(ring[i], p))),
      ),
    );
  };
  const aEdges = edges(members[0]),
    bEdges = edges(members[1]);
  const traced = sharedBoundary(members[0], members[1]);
  expect(traced.length).toBeGreaterThan(0);
  expect(
    new Set(
      traced.flatMap((path) => path.slice(1).map((p, i) => key(path[i], p))),
    ),
  ).toEqual(new Set([...aEdges].filter((e) => bEdges.has(e))));
  const pair = pairs.find(
    (p) =>
      p.countries.includes(members[0].id) &&
      p.countries.includes(members[1].id),
  )!;
  const q = missingBorderJourney(pair, base, regions, 123).rounds[0];
  expect(q.overlays).toBeUndefined();
  expect(q.feedbackOverlays?.length).toBe(traced.length);
  expect(
    q.feedbackOverlays?.every(
      (o) => o.type === "path" && o.reveal?.durationMs === 1100,
    ),
  ).toBe(true);
});

it("centers a continent consistently across seeds without pointing at the erased boundary", () => {
  const pair = pairs.find((p) => p.id === "wurl:ESP|wurl:PRT")!;
  const focus = missingBorderJourney(pair, base, regions, 123).rounds[0].focus;
  expect(focus).toEqual({ lat: 50, lng: 20, altitude: 1.05 });
  expect(
    missingBorderJourney(pair, base, regions, 456).rounds[0].focus,
  ).toEqual(focus);
});
