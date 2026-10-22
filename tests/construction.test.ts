import { readFileSync } from "node:fs";
import { describe, it, expect, vi } from "vitest";
import { mechanicFor } from "../src/game/mechanics";
import { geoDistance } from "d3-geo";
import { DRAWING_SAHARA_JOURNEY as journey } from "../src/game/drawingSaharaJourney";
import { CONSTRUCTION_RECIPES } from "../src/game/constructionRecipes";
import { constructionAuditSample } from "../src/game/constructionAudit";
import {
  constructionReady,
  evaluateConstruction,
  gridPoint,
  paintedCells,
  simplePolygon,
  segmentDistance,
  snapToBoundary,
  validConstruction,
  validConstructionResult,
} from "../src/game/construction";
import {
  editConstruction,
  undoConstruction,
} from "../src/game/constructionEditing";
import { constructionScene } from "../src/game/constructionScene";
import { initialGame, gameReducer, type GameState } from "../src/game/state";
import { submittedPoints, journeyPoints } from "../src/game/points";
import { createQuestionContext } from "../src/game/questionPreparation";
import { validateQuestionContract } from "../src/game/questionBuilder";
import { journeyWorld } from "../src/app/journeyWorld";
import { validGame } from "../src/app/daily";
import type {
  Construction,
  ConstructionGrid,
} from "../src/game/constructionTypes";
import type { RegionFeature } from "../src/geography/types";
import data from "../src/game/data/sahara-construction.v1.json";
const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(regions, [], journey);
const response = (c?: Construction): GameState => ({
  ...initialGame,
  phase: "playing",
  construction: c,
});
const sample = (i: number, correct = true) =>
  constructionAuditSample(journey.rounds[i], correct)!;
const grade = (i: number, c: Construction) =>
  evaluateConstruction(journey.rounds[i], response(c))!;
const roundTrip = <T>(x: T): T => JSON.parse(JSON.stringify(x));

describe("spherical construction geometry", () => {
  it("uses geodesic distances across the date line and near poles", () => {
    expect(
      segmentDistance(
        { lat: 1, lng: 180 },
        { lat: 0, lng: 179 },
        { lat: 0, lng: -179 },
      ),
    ).toBeCloseTo(111.19508, 3);
    expect(
      segmentDistance(
        { lat: 90, lng: 0 },
        { lat: 80, lng: 0 },
        { lat: 80, lng: 180 },
      ),
    ).toBeLessThan(0.0001);
    expect(
      simplePolygon([
        { lat: 0, lng: 179 },
        { lat: 0, lng: -179 },
        { lat: 2, lng: -179 },
        { lat: 2, lng: 179 },
      ]),
    ).toBe(true);
    expect(
      simplePolygon([
        { lat: 0, lng: 0 },
        { lat: 2, lng: 2 },
        { lat: 0, lng: 2 },
        { lat: 2, lng: 0 },
      ]),
    ).toBe(false);
  });
  it("paints both sides of the date line, covers poles and erases in order", () => {
    const g: ConstructionGrid = {
      id: "globe",
      revision: "1",
      label: "fixture",
      sourceUrl: "https://example.com",
      west: -180,
      east: 180,
      south: -90,
      north: 90,
      columns: 360,
      rows: 180,
      equalArea: false,
      cells: [359 + 89 * 360, 89 * 360, 179 * 360, 179 * 360 + 180].map((i) => [
        i,
        1,
        1,
      ]),
    };
    const c: Construction = {
      version: 1,
      kind: "brush",
      strokes: [
        { points: [{ lat: 0, lng: 180 }], radiusKm: 200, erase: false },
      ],
    };
    expect([...paintedCells(g, c)]).toEqual(
      expect.arrayContaining([359 + 89 * 360, 89 * 360]),
    );
    c.strokes.push({ ...c.strokes[0], erase: true });
    expect(paintedCells(g, c).size).toBe(0);
    c.strokes = [
      { points: [{ lat: 90, lng: 0 }], radiusKm: 200, erase: false },
    ];
    expect(paintedCells(g, c).size).toBe(2);
    const regional = {
      ...g,
      west: 170,
      east: 190,
      south: -1,
      north: 1,
      columns: 20,
      rows: 2,
      cells: [[30, 1, 1]] as [number, number, number][],
    };
    expect(gridPoint(regional, 30).lng).toBe(-179.5);
    expect(
      paintedCells(regional, {
        version: 1,
        kind: "brush",
        strokes: [
          { points: [{ lat: 0.5, lng: -179.5 }], radiusKm: 90, erase: false },
        ],
      }).size,
    ).toBe(1);
    const p = gridPoint({ ...g, equalArea: true }, 0);
    expect(p.lat).toBeGreaterThan(-90);
    expect(p.lng).toBe(-179.5);
  });
  it("rejects corrupt and excessive saved geometry without throwing", () => {
    for (const c of [
      null,
      { version: 1, kind: "brush", strokes: [null] },
      { version: 1, kind: "circle", center: { lat: NaN, lng: 0 } },
      {
        version: 1,
        kind: "trace",
        points: Array(4097).fill({ lat: 0, lng: 0 }),
      },
    ])
      expect(validConstruction(c)).toBe(false);
    for (const r of [
      null,
      {
        version: 1,
        kind: "cut",
        sourceRevision: "v1",
        tier: 0,
        feedback: "ok",
        metrics: [],
      },
      { ...grade(4, sample(4)), metrics: [null, null, null, null] },
    ])
      expect(validConstructionResult(r)).toBe(false);
  });
});

describe("five independent constructed answer contracts", () => {
  it("accepts real source examples and genuine wrong submissions for all five modes", () => {
    for (let i = 0; i < 5; i++) {
      const q = journey.rounds[i],
        c = sample(i);
      expect(c, q.id).toBeDefined();
      expect(constructionReady(q, response(c))).toBe(true);
      expect(grade(i, c).tier, q.id).toBe(0);
      const wrong = sample(i, false);
      expect(wrong, q.id).toBeDefined();
      expect(grade(i, wrong).tier, q.id).toBeNull();
      expect(validConstructionResult(grade(i, c))).toBe(true);
    }
  });
  it("does not reward blank paint or indiscriminate painting", () => {
    const q = journey.rounds[0];
    if (q.rule.type !== "raster-overlap") throw Error();
    expect(
      constructionReady(
        q,
        response({ version: 1, kind: "brush", strokes: [] }),
      ),
    ).toBe(false);
    const strokes = Array.from({ length: 25 }, (_, i) => ({
      points: [
        { lat: 14 + i * 0.85, lng: -17 },
        { lat: 14 + i * 0.85, lng: 36 },
      ],
      radiusKm: 90,
      erase: false,
    }));
    const all = grade(0, { version: 1, kind: "brush", strokes });
    expect(all.metrics[0].value).toBeGreaterThan(95);
    expect(all.tier).toBeNull();
    const wrongRadius = roundTrip(sample(0));
    if (wrongRadius.kind === "brush") wrongRadius.strokes[0].radiusKm = 500;
    expect(constructionReady(q, response(wrongRadius))).toBe(false);
  });
  it("finds the canonical five-capital group with several different centers", () => {
    for (const center of [
      { lat: 25.75344, lng: 3.75944 },
      { lat: 25.8, lng: 3.8 },
      { lat: 25.7, lng: 3.7 },
    ]) {
      const r = grade(1, { version: 1, kind: "circle", center });
      expect(r.tier).toBe(0);
      expect(r.containedIds).toHaveLength(5);
      expect(r.containedIds).toEqual(
        expect.arrayContaining([
          "place:2538475",
          "place:2507480",
          "place:2464470",
          "place:2210247",
          "place:2440485",
        ]),
      );
    }
  });
  it("rejects a straight Nile shortcut, reversed route and excessive backtracking", () => {
    const q = journey.rounds[2];
    if (q.rule.type !== "line-following") throw Error();
    const p = q.rule.reference;
    for (const points of [
      [p[0], p.at(-1)!],
      [...p].reverse(),
      [...p, ...[...p].reverse(), ...p],
    ])
      expect(grade(2, { version: 1, kind: "trace", points }).tier).toBeNull();
    const approx = p.filter((_, i) => i % 8 === 0);
    approx.push(p.at(-1)!);
    expect(grade(2, { version: 1, kind: "trace", points: approx }).tier).toBe(
      0,
    );
  });
  it("counts residents and country-clipped land independently", () => {
    const r = grade(3, sample(3));
    expect(r.metrics[0].value).toBeGreaterThanOrEqual(75);
    expect(r.metrics[1].value).toBeLessThanOrEqual(20);
    const q = journey.rounds[3];
    expect(
      constructionReady(
        q,
        response({
          version: 1,
          kind: "polygon",
          points: [
            { lat: 34, lng: -9 },
            { lat: 38, lng: 12 },
            { lat: 34, lng: 12 },
            { lat: 38, lng: -9 },
          ],
        }),
      ),
    ).toBe(false);
    expect(
      constructionReady(
        q,
        response({
          version: 1,
          kind: "polygon",
          points: Array(9).fill({ lat: 0, lng: 0 }),
        }),
      ),
    ).toBe(false);
  });
  it("accepts two orientations without requiring unequal land, including reversed endpoints", () => {
    for (const e of data.balancedExamples) {
      const r = grade(4, { version: 1, kind: "cut", points: e.points });
      expect(r.tier).toBe(0);
      expect(
        Math.min(r.metrics[0].value, 100 - r.metrics[0].value),
      ).toBeCloseTo(Math.min(e.population, 100 - e.population), 5);
      expect(
        Math.min(r.metrics[2].value, 100 - r.metrics[2].value),
      ).toBeCloseTo(Math.min(e.area, 100 - e.area), 5);
      const reversed = grade(4, {
        version: 1,
        kind: "cut",
        points: [...e.points].reverse(),
      });
      expect(reversed.tier).toBe(0);
      expect(reversed.metrics[0].value + r.metrics[0].value).toBeCloseTo(
        100,
        8,
      );
    }
    expect(
      constructionReady(
        journey.rounds[4],
        response({
          version: 1,
          kind: "cut",
          points: [
            { lat: 28, lng: 2 },
            { lat: 30, lng: 4 },
          ],
        }),
      ),
    ).toBe(false);
  });
  it("rejects nonfinite authored bounds and thresholds", () => {
    for (const q of CONSTRUCTION_RECIPES) {
      const invalid = structuredClone(q);
      if ("grid" in invalid.rule) invalid.rule.grid.west = NaN;
      else if (invalid.rule.type === "point-coverage-max")
        invalid.rule.radiusKm = NaN;
      else if (invalid.rule.type === "island-coverage-max")
        invalid.rule.candidates[0].boundary[0].lat = NaN;
      else if (invalid.rule.type === "line-following")
        invalid.rule.tiers[0].coverage = NaN;
      expect(() => validateQuestionContract(invalid)).toThrow();
    }
  });
});

it("preserves shapes, help ceilings and frozen metrics through saves and completion", () => {
  let game: GameState = { ...initialGame, phase: "playing" };
  for (let i = 0; i < 5; i++) {
    const c = sample(i);
    const dispatch = (a: Parameters<typeof gameReducer>[1]) => {
      game = gameReducer(game, a, journey, context);
    };
    dispatch({ type: "construction", value: c });
    expect(validGame(roundTrip(game), journey)).toBe(true);
    if (i === 1) {
      dispatch({ type: "request-hint" });
      dispatch({ type: "request-assist" });
      expect(game.construction).toEqual(c);
    }
    dispatch({ type: "submit" });
    expect(game.answers.at(-1)?.points).toBe(i === 1 ? 1 : 3);
    const saved = roundTrip(game);
    expect(validGame(saved, journey)).toBe(true);
    expect(saved.answers.at(-1)?.construction).toEqual(c);
    expect(saved.answers.at(-1)?.constructionResult).toEqual(
      game.constructionResult,
    );
    const before = roundTrip(game.answers);
    dispatch({ type: "show-construction-example" });
    expect(game.answers).toEqual(before);
    dispatch({ type: "next" });
    if (i < 4) {
      expect(game.construction).toBeUndefined();
      expect(game.constructionResult).toBeUndefined();
      expect(game.showConstructionExample).toBe(false);
    }
  }
  expect(game.phase).toBe("finished");
  expect(journeyPoints(game)).toBe(13);
  for (let i = 0; i < 5; i++) {
    const w = journeyWorld(regions, journey, game, context, i),
      ids = (w.overlays ?? []).map((o) => o.id);
    expect(
      ids.some((id) => id.startsWith(`construction:${journey.rounds[i].id}:`)),
    ).toBe(true);
    expect(
      ids.some((id) =>
        journey.rounds.some(
          (q, j) => j !== i && id.startsWith(`construction:${q.id}:`),
        ),
      ),
    ).toBe(false);
  }
  const incomplete = structuredClone(game);
  delete incomplete.answers[0].constructionResult;
  expect(validGame(incomplete, journey)).toBe(false);
  const changed = structuredClone(game);
  changed.answers[4].constructionResult!.metrics = [];
  expect(validGame(changed, journey)).toBe(false);
  const q = journey.rounds[4],
    result = game.answers[4].constructionResult!;
  expect(
    submittedPoints(
      q,
      { ...response(sample(4)), constructionResult: result },
      true,
      "hinted",
    ),
  ).toBe(2);
});

it("evaluates one canonical outcome for grading, rewards and evidence, ignoring a supplied old grade", () => {
  const q = journey.rounds[1],
    single = { ...journey, rounds: [q] };
  const current = {
    ...response(sample(1)),
    constructionResult: { ...grade(1, sample(1)), tier: null },
  };
  const evaluate = vi.spyOn(mechanicFor(q), "outcome");
  try {
    const saved = gameReducer(
      current,
      { type: "submit" },
      single,
      createQuestionContext(regions, [], single),
    );
    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(saved.answers[0]).toMatchObject({
      correct: true,
      points: 3,
      constructionResult: { tier: 0 },
    });
    expect(saved.answers[0].constructionResult).toBe(saved.constructionResult);
  } finally {
    evaluate.mockRestore();
  }
});

it("shares edits between gesture and coordinate input; locks trace endpoints and snaps cuts", () => {
  const trace = journey.rounds[2];
  let c = editConstruction(trace, undefined, { lat: 26, lng: 32 }, true)!;
  expect(c.kind).toBe("trace");
  if (c.kind !== "trace") throw Error();
  const endpoints = [c.points[0], c.points.at(-1)];
  c = editConstruction(trace, c, { lat: 0, lng: 0 }, true, 0)!;
  expect(c.kind === "trace" && [c.points[0], c.points.at(-1)]).toEqual(
    endpoints,
  );
  expect(undoConstruction(c)?.kind).toBe("trace");
  const cut = journey.rounds[4];
  if (cut.rule.type !== "population-balance") throw Error();
  const p = { lat: 30, lng: 5 },
    snap = snapToBoundary(p, cut.rule.boundary),
    edited = editConstruction(cut, undefined, p, true)!;
  expect(edited.kind === "cut" && edited.points[0]).toEqual(snap);
  expect(geoDistance([p.lng, p.lat], [snap.lng, snap.lat])).toBeGreaterThan(
    0.01,
  );
});

it("withholds evaluation rasters and reference lines until submission; examples are optional", () => {
  for (let i = 0; i < 5; i++) {
    const q = journey.rounds[i],
      c = sample(i),
      pending = response(c),
      play = constructionScene(q, pending, false);
    expect(
      play.overlays.some(
        (o) =>
          o.id.endsWith(":river") ||
          o.id.endsWith(":dunes") ||
          o.id.endsWith(":example"),
      ),
    ).toBe(false);
    const submitted = { ...pending, constructionResult: grade(i, c) };
    const reveal = constructionScene(q, submitted, true);
    expect(reveal.overlays.some((o) => o.id.endsWith(":example"))).toBe(false);
    if (q.constructionExample)
      expect(
        constructionScene(q, submitted, true, false, true).overlays.some((o) =>
          o.id.endsWith(":example"),
        ),
      ).toBe(true);
  }
  const light = journeyWorld(
      regions,
      journey,
      { ...response(), roundIndex: 3 },
      context,
    ),
    cut = journeyWorld(
      regions,
      journey,
      { ...response(), roundIndex: 4 },
      context,
    );
  expect(light.overlays?.some((o) => o.id === "sahara:nightlights")).toBe(true);
  expect(light.overlays?.some((o) => o.id === "sahara:population")).toBe(false);
  expect(cut.overlays?.some((o) => o.type === "raster-patch")).toBe(false);
});

it("verifies the global circle maximum by independently enumerating spherical-cap vertices", () => {
  const q = journey.rounds[1];
  if (q.rule.type !== "point-coverage-max") throw Error();
  type V = [number, number, number];
  const dot = (a: V, b: V) => a.reduce((s, x, i) => s + x * b[i], 0),
    cross = (a: V, b: V): V => [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  const rad = Math.PI / 180,
    points = q.rule.candidates.map(
      (p) =>
        [
          Math.cos(p.lat * rad) * Math.cos(p.lng * rad),
          Math.cos(p.lat * rad) * Math.sin(p.lng * rad),
          Math.sin(p.lat * rad),
        ] as V,
    ),
    threshold = Math.cos(1400 / 6371.0088),
    centers = [...points];
  // A nonempty intersection of equal spherical caps either contains a source center
  // or has a vertex where two boundaries meet. Enumerate both signs at each pair.
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++) {
      const a = points[i],
        b = points[j],
        base = a.map((x, k) => (threshold * (x + b[k])) / (1 + dot(a, b))) as V,
        n = cross(a, b),
        n2 = dot(n, n),
        height2 = 1 - dot(base, base);
      if (height2 < 0 || n2 < 1e-12) continue;
      for (const sign of [-1, 1])
        centers.push(
          base.map((x, k) => x + sign * Math.sqrt(height2 / n2) * n[k]) as V,
        );
    }
  const maximum = Math.max(
    ...centers.map(
      (c) => points.filter((p) => dot(c, p) >= threshold - 1e-12).length,
    ),
  );
  expect(maximum).toBe(5);
  expect(q.rule.maximum).toBe(maximum);
});

it("preserves frozen evidence through the existing daily register codec", async () => {
  const { dailySaveCodec } = await import("../src/app/progressSaves");
  const codec = dailySaveCodec([journey]);
  const playing = { ...response(sample(0)), roundIndex: 0 };
  const game = gameReducer(playing, { type: "submit" }, journey, context);
  const save = {
    version: 1 as const,
    activeDate: "2026-10-20",
    attempts: {
      "2026-10-20": {
        date: "2026-10-20",
        journeyId: journey.id,
        scheduleVersion: 2,
        game,
        contentRevision: 1,
      },
    },
  };
  const restored = codec.decode(roundTrip(codec.encode(save)));
  expect(
    restored.attempts["2026-10-20"].game.answers[0].constructionResult,
  ).toEqual(game.answers[0].constructionResult);
  expect(restored.attempts["2026-10-20"].game.answers[0].construction).toEqual(
    game.answers[0].construction,
  );
});
