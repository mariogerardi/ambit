import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { DRAWING_SAHARA_JOURNEY as journey } from "../src/game/drawingSaharaJourney";
import {
  automaticConstructionNavigation,
  currentConstruction,
  inConstructionArea,
  startsConstruction,
  dragConstructionCircle,
  clippedConstructionPaths,
} from "../src/game/constructionInteraction";
import { editConstruction } from "../src/game/constructionEditing";
import { constructionScene } from "../src/game/constructionScene";
import {
  constructionReady,
  evaluateConstruction,
} from "../src/game/construction";
import { initialGame, gameReducer, type GameState } from "../src/game/state";
import { createQuestionContext } from "../src/game/questionPreparation";
import { journeyWorld } from "../src/app/journeyWorld";
import type { RegionFeature } from "../src/geography/types";
const regions = JSON.parse(
    readFileSync("public/geography/world.v1.json", "utf8"),
  ) as RegionFeature[],
  context = createQuestionContext(regions, [], journey);
it("chooses drawing on the active land and globe motion on ocean or neighboring territory", () => {
  for (const [i, inside, outside] of [
    [0, { lat: 25, lng: 10 }, { lat: 37.5, lng: 3 }],
    [2, { lat: 28, lng: 30 }, { lat: 28, lng: 23 }],
    [3, { lat: 32, lng: 3 }, { lat: 35, lng: 10 }],
    [4, { lat: 32, lng: 3 }, { lat: 35, lng: 10 }],
  ] as const) {
    const q = journey.rounds[i];
    expect(automaticConstructionNavigation(q)).toBe(true);
    expect(startsConstruction(q, undefined, inside)).toBe(true);
    expect(startsConstruction(q, undefined, outside)).toBe(false);
    expect(editConstruction(q, undefined, outside, true)).toBeUndefined();
  }
  const africa = journey.rounds[0];
  expect(inConstructionArea(africa, { lat: 11, lng: 49 })).toBe(true);
  expect(inConstructionArea(africa, { lat: 9, lng: 20 })).toBe(false);
  expect(inConstructionArea(africa, { lat: 35, lng: 28 })).toBe(false);
});
it("starts with an editable circle, freezes it on submit and preserves an offset grab", () => {
  const q = journey.rounds[1],
    draft = currentConstruction(q, initialGame)!;
  expect(draft.kind).toBe("circle");
  if (draft.kind !== "circle") throw Error();
  expect(startsConstruction(q, draft, draft.center)).toBe(true);
  expect(startsConstruction(q, draft, { lat: 0, lng: -100 })).toBe(false);
  const c = {
    version: 1 as const,
    kind: "circle" as const,
    center: { lat: 0, lng: 0 },
  };
  expect(
    dragConstructionCircle(c, { lat: 0, lng: 5 }, { lat: 0, lng: 5 }),
  ).toBe(c);
  const dragged = dragConstructionCircle(
    c,
    { lat: 0, lng: 5 },
    { lat: 0, lng: 15 },
  );
  expect(dragged.kind === "circle" && dragged.center.lng).toBeCloseTo(10, 7);
  const state: GameState = { ...initialGame, phase: "playing", roundIndex: 1 };
  expect(constructionReady(q, state)).toBe(true);
  const submitted = gameReducer(state, { type: "submit" }, journey, context);
  expect(submitted.answers[0].construction).toEqual(draft);
  expect(submitted.answers[0].constructionResult).toBeDefined();
  expect(state.construction).toBeUndefined();
});
it("clips displayed polygon edges to Algeria and rejects coordinate edits outside it", () => {
  const q = journey.rounds[3],
    paths = clippedConstructionPaths(q, [
      { lat: 30, lng: -15 },
      { lat: 30, lng: 15 },
    ]);
  expect(paths.length).toBeGreaterThan(0);
  for (const p of paths.flatMap((p) => p.slice(1, -1)))
    expect(inConstructionArea(q, p)).toBe(true);
  const a = editConstruction(q, undefined, { lat: 30, lng: 3 }, true)!;
  expect(editConstruction(q, a, { lat: 35, lng: 10 }, true)).toBe(a);
});
it("makes brush paint prominent throughout its footprint and retains older narrow strokes", () => {
  const q = journey.rounds[0];
  if (q.rule.type !== "raster-overlap") throw Error();
  expect(q.rule.brushRadiusKm).toBe(160);
  const construction = {
    version: 1 as const,
    kind: "brush" as const,
    strokes: [{ points: [{ lat: 30, lng: 7 }], radiusKm: 90, erase: false }],
  };
  expect(constructionReady(q, { ...initialGame, construction })).toBe(true);
  const layers = constructionScene(
    q,
    { ...initialGame, construction },
    false,
  ).overlays;
  expect(
    layers.some((o) => o.type === "paint" && o.mask && o.opacity >= 0.65),
  ).toBe(true);
  const result = evaluateConstruction(q, { ...initialGame, construction });
  const reveal = constructionScene(
    q,
    { ...initialGame, construction, constructionResult: result },
    true,
  );
  for (const o of reveal.overlays.filter(
    (o) => o.type === "cells" && !o.id.endsWith(":submitted-paint"),
  ))
    expect(o.type === "cells" && o.opacity! >= 0.6).toBe(true);
});
it("keeps the traditional completion overview static until an explicit review selection", () => {
  const game: GameState = { ...initialGame, phase: "finished", roundIndex: 4 },
    overview = journeyWorld(regions, journey, game, context);
  expect(overview.overlays?.some((o) => o.id.startsWith("construction:"))).toBe(
    false,
  );
  expect(overview.overlays?.some((o) => o.id === "sahara:completed-nile")).toBe(
    true,
  );
  expect(journey.completion?.views).toHaveLength(3);
  expect(new Set(journey.completion?.views?.map((v) => v.altitude)).size).toBe(
    1,
  );
  const focus = journey.rounds[2].focus;
  expect(focus.altitude).toBeGreaterThan(0.5);
  expect(journey.rounds[2].constructionArea?.name).toBe("Egypt");
});

it("matches spherical footprint containment, including coastlines and neighboring land", async () => {
  const { geoContains } = await import("d3-geo"),
    { sphericalGeometry } = await import(
      "../src/geography/sphericalGeometry.mjs"
    );
  for (const q of [journey.rounds[0], journey.rounds[2], journey.rounds[3]]) {
    const geometry = sphericalGeometry(q.constructionArea!.geometry);
    for (let lat = 11.17; lat < 39; lat += 1.43)
      for (let lng = -18.13; lng < 52; lng += 2.37)
        expect(
          inConstructionArea(q, { lat, lng }),
          `${q.id}:${lat},${lng}`,
        ).toBe(geoContains(geometry, [lng, lat]));
  }
});

it("uses hand cursors outside the edit area and drawing cursors only on paintable land", async () => {
  const { constructionCursor } = await import(
      "../src/game/constructionInteraction"
    ),
    q = journey.rounds[0];
  expect(constructionCursor(q, undefined, { lat: 25, lng: 10 }, "draw")).toBe(
    "paint",
  );
  expect(constructionCursor(q, undefined, { lat: 25, lng: 10 }, "erase")).toBe(
    "erase",
  );
  expect(constructionCursor(q, undefined, { lat: 37.5, lng: 3 }, "draw")).toBe(
    "grab",
  );
  expect(constructionCursor(q, undefined, undefined, "draw", false, true)).toBe(
    "grabbing",
  );
});
it("keeps the southern photo edge on its latitude parallel", async () => {
  const { overlayPositions } = await import("../src/globe/overlays");
  const lines = journey.rounds[0].overlays!.filter((o) => o.type === "path");
  let n = 0;
  for (const o of lines) {
    if (o.type !== "path") continue;
    for (let i = 1; i < o.coordinates.length; i++) {
      const a = o.coordinates[i - 1],
        b = o.coordinates[i];
      if (Math.abs(a[1] - 10) > 1e-8 || Math.abs(b[1] - 10) > 1e-8) continue;
      n++;
      const p = overlayPositions({ ...o, coordinates: [a, b] });
      for (let j = 0; j < p.length; j += 3)
        expect(
          (Math.asin(p[j + 1] / Math.hypot(p[j], p[j + 1], p[j + 2])) * 180) /
            Math.PI,
        ).toBeCloseTo(10, 3);
    }
  }
  expect(n).toBeGreaterThan(100);
  expect(inConstructionArea(journey.rounds[0], { lat: 10.1, lng: 10 })).toBe(
    true,
  );
});
it("keeps adjustable brush sizes on each stroke and simplifies a trace without losing its bends", async () => {
  const { editConstruction, simplifyTrace } = await import(
    "../src/game/constructionEditing"
  );
  const q = journey.rounds[0];
  let c = editConstruction(
    q,
    undefined,
    { lat: 30, lng: 7 },
    true,
    undefined,
    false,
    80,
  )!;
  c = editConstruction(q, c, { lat: 30, lng: 8 }, true, undefined, false, 240)!;
  expect(c.kind === "brush" && c.strokes.map((s) => s.radiusKm)).toEqual([
    80, 240,
  ]);
  const trace = journey.rounds[2];
  if (trace.rule.type !== "line-following") throw Error();
  const original = {
      version: 1 as const,
      kind: "trace" as const,
      points: trace.rule.reference,
    },
    simple = simplifyTrace(original)!;
  expect(simple.kind === "trace" && simple.points.length).toBeLessThan(80);
  if (simple.kind !== "trace") throw Error();
  expect(simple.points[0]).toEqual(original.points[0]);
  expect(simple.points.at(-1)).toEqual(original.points.at(-1));
  expect(
    evaluateConstruction(trace, { ...initialGame, construction: simple })?.tier,
  ).toBe(0);
  const layers = constructionScene(
    trace,
    { ...initialGame, construction: original },
    false,
  );
  expect(
    layers.places.filter((p) => p.id.startsWith("construction-handle:")).length,
  ).toBeLessThanOrEqual(12);
});
it("shows a closed filled Q4 solution that meets the actual targets", () => {
  const q = journey.rounds[3],
    construction = q.constructionExample!,
    result = evaluateConstruction(q, { ...initialGame, construction })!;
  expect(result.tier).toBe(0);
  if (construction.kind !== "polygon") throw Error();
  expect(construction.points).toHaveLength(8);
  expect(construction.points.every((p) => inConstructionArea(q, p))).toBe(true);
  const scene = constructionScene(
    q,
    { ...initialGame, construction, constructionResult: result },
    true,
    false,
    true,
  );
  expect(
    scene.overlays.some(
      (o) =>
        o.id.endsWith(":example-fill") &&
        o.type === "cells" &&
        o.indices.length > 0,
    ),
  ).toBe(true);
  for (const o of scene.overlays.filter(
    (o) => o.id.includes(":example") && o.type === "path",
  ))
    if (o.type === "path")
      expect(o.coordinates[0]).toEqual(o.coordinates.at(-1));
});
