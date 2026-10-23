import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { geoContains } from "d3-geo";
import {
  INDIA_DATA,
  SHAPE_OF_INDIA_JOURNEY as journey,
} from "../src/game/shapeOfIndiaJourney";
import { JOURNEYS, journeyPath } from "../src/game/journeys";
import { createQuestionContext } from "../src/game/questionPreparation";
import {
  gameReducer,
  initialGame,
  journeyScore,
  type Action,
  type GameState,
} from "../src/game/state";
import {
  constructionReady,
  cutSide,
  evaluateConstruction,
  gridPoint,
  paintedCells,
} from "../src/game/construction";
import { constructionAuditSample } from "../src/game/constructionAudit";
import {
  recalledIds,
  recallMistakes,
  mergeCountryRecall,
} from "../src/game/countryRecall";
import { answerPoints, journeyPoints } from "../src/game/points";
import { validGame } from "../src/app/dailyProgress";
import { dailySaveCodec } from "../src/app/progressSaves";
import { withAssistanceLocks } from "../src/game/guidance";
import { journeyWorld } from "../src/app/journeyWorld";
import { sphericalGeometry } from "../src/geography/sphericalGeometry.mjs";
import type { RegionFeature } from "../src/geography/types";
import type { Construction } from "../src/game/constructionTypes";

const regions: RegionFeature[] = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
);
const context = createQuestionContext(regions, [], journey);
const question = (suffix: string) =>
  journey.rounds.find((q) => q.id === `india-${suffix}`)!;
function session(suffix: string) {
  let game: GameState = {
    ...initialGame,
    phase: "playing",
    roundIndex: journey.rounds.findIndex((q) => q.id === `india-${suffix}`),
  };
  return {
    get game() {
      return game;
    },
    dispatch(a: Action) {
      game = gameReducer(game, a, journey, context);
      return game;
    },
    enter(text: string) {
      this.dispatch({ type: "text", value: text });
      return this.dispatch({ type: "recall-country" });
    },
  };
}
const borderNames = [
  "Pakistan",
  "China",
  "Nepal",
  "Bhutan",
  "Bangladesh",
  "Myanmar",
];

describe("The Shape of India", () => {
  it("ships a matching data audit and conserves the clipped population and land", () => {
    const audit = JSON.parse(
      readFileSync(
        "public/journeys/the-shape-of-india/data-audit.json",
        "utf8",
      ),
    );
    const hash = (path: string) =>
      createHash("sha256").update(readFileSync(path)).digest("hex");
    expect(hash("src/game/data/india-journey.v1.json")).toBe(
      audit.outputSHA256,
    );
    expect(hash("public/geography/world.v1.json")).toBe(
      audit.inputs["world.v1.json"],
    );
    expect(hash("src/geography/data/cities.v1.json")).toBe(
      audit.inputs["cities.v1.json"],
    );
    expect(
      Math.abs(audit.aggregatedPopulation / audit.retainedPopulation - 1),
    ).toBeLessThan(1e-7);
    expect(Math.abs(audit.gridAreaKm2 / audit.countryAreaKm2 - 1)).toBeLessThan(
      1e-7,
    );
    expect(audit.cutValidation.maximumErrorPercentagePoints).toBeLessThan(1);
  });
  it("registers the approved five tasks with independent stable identities", () => {
    expect(JOURNEYS.find((j) => j.id === journey.id)).toBe(journey);
    expect(journeyPath(journey.id)).toBe("/journey/the-shape-of-india");
    expect(journey.rounds.map((q) => q.mode)).toEqual([
      "geo-brush",
      "geo-multipin",
      "country-recall",
      "geo-circle",
      "geo-cut",
    ]);
    const q = question("03-name-the-neighbors");
    if (q.rule.type !== "country-set-recall") throw Error();
    expect(
      [...context.graph.get("wurl:IND")!]
        .filter((id) => context.members.has(id))
        .sort(),
    ).toEqual([...q.rule.ids].sort());
  });

  it("renders smooth land-clipped paint without disclosing the target mask before reveal", () => {
    const s = session("01-paint-the-country");
    s.dispatch({
      type: "construction",
      value: {
        version: 1,
        kind: "brush",
        strokes: [
          { points: [{ lat: 8.5, lng: 77.6 }], radiusKm: 100, erase: false },
        ],
      },
    });
    const play = journeyWorld(regions, journey, s.game, context);
    const paint = play.overlays!.find((o) => o.type === "paint")!;
    expect(paint.type).toBe("paint");
    if (paint.type !== "paint") throw Error();
    expect(paint.targetMask).toBeUndefined();
    expect(paint.mask).toEqual(INDIA_DATA.landMask);
    s.dispatch({ type: "submit" });
    const reveal = journeyWorld(regions, journey, s.game, context);
    expect(
      reveal
        .overlays!.filter((o) => o.type === "paint")
        .map((o) => o.type === "paint" && o.coverage),
    ).toEqual(["missed", "inside", "outside"]);
    for (const o of reveal.overlays!.filter((o) => o.type === "paint"))
      expect(o.type === "paint" && o.targetMask).toEqual(INDIA_DATA.indiaMask);
  });
  it("reserves satellite imagery for the landscape question", () => {
    const landscape = journeyWorld(
      regions,
      journey,
      session("02-three-landscapes").game,
      context,
    );
    const images = landscape.overlays!.filter((o) => o.type === "raster-patch");
    expect(images).toHaveLength(1);
    expect(images[0].type === "raster-patch" && images[0].assetUrl).toContain(
      "india-relief.webp",
    );
    const cities = journeyWorld(
      regions,
      journey,
      session("04-golden-triangle").game,
      context,
    );
    expect((cities.overlays ?? []).some((o) => o.type === "raster-patch")).toBe(
      false,
    );
  });
  it("gives broad painting references without revealing the Golden Triangle cities", () => {
    const s = session("01-paint-the-country");
    expect(journeyWorld(regions, journey, s.game, context).places).toHaveLength(
      0,
    );
    s.dispatch({ type: "request-hint" });
    s.dispatch({ type: "request-assist" });
    const references = journeyWorld(regions, journey, s.game, context).places;
    expect(references.map((p) => p.name)).toEqual([
      "Amritsar",
      "Mumbai",
      "Kolkata",
      "Guwahati",
      "Kanyakumari",
    ]);
    expect(references.every((p) => p.parentId === "wurl:IND")).toBe(true);
    expect(
      references.some((p) =>
        INDIA_DATA.cities.some((city) => city.name === p.name),
      ),
    ).toBe(false);
  });
  it("keeps the completion overview focused on India and the three cities, with round review available", () => {
    const s = session("03-name-the-neighbors");
    s.enter("China");
    s.enter("Sri Lanka");
    s.dispatch({ type: "submit" });
    const game: GameState = { ...s.game, phase: "finished", roundIndex: 4 };
    const before = structuredClone(game.answers);
    const world = journeyWorld(regions, journey, game, context);
    expect(
      Object.entries(world.states)
        .filter(([, state]) => state === "visited")
        .map(([id]) => id)
        .sort(),
    ).toEqual(["wurl:IND", "wurl:NE-KAS"].sort());
    for (const id of ["wurl:CHN", "wurl:PAK", "wurl:LKA"])
      expect(world.states[id]).toBe("disabled");
    expect(world.regions.some((r) => r.id.startsWith("india-zone:"))).toBe(
      false,
    );
    expect(world.places.map((p) => p.name).sort()).toEqual(
      ["Delhi", "Jaipur", "Agra"].sort(),
    );
    expect((world.overlays ?? []).length).toBe(0);
    const review = journeyWorld(
      regions,
      journey,
      game,
      context,
      journey.rounds.findIndex((q) => q.id === "india-03-name-the-neighbors"),
    );
    expect(review.states["wurl:LKA"]).toBe("incorrect");
    expect(review.states["wurl:CHN"]).toBe("visited");
    const cities = session("04-golden-triangle");
    cities.dispatch({
      type: "construction",
      value: { version: 1, kind: "circle", center: INDIA_DATA.circleExample },
    });
    cities.dispatch({ type: "submit" });
    const withoutReview = journeyWorld(
      regions,
      {
        ...journey,
        completion: { ...journey.completion!, constructionResults: false },
      },
      { ...game, answers: [...game.answers, ...cities.game.answers] },
      context,
    );
    expect(withoutReview.overlays ?? []).toHaveLength(0);
    expect(withoutReview.places.map((p) => p.name).sort()).toEqual(
      ["Delhi", "Jaipur", "Agra"].sort(),
    );
    expect(game.answers).toEqual(before);
  });
  it("allows an attainable top-tier painting, but not painting all South Asia", () => {
    const q = question("01-paint-the-country");
    const ideal = constructionAuditSample(q, true)!;
    expect(
      evaluateConstruction(q, { ...initialGame, construction: ideal })?.tier,
    ).toBe(0);
    if (ideal.kind !== "brush") throw Error();
    const peninsula = {
      ...ideal,
      strokes: ideal.strokes.filter((s) => s.points.every((p) => p.lat < 22)),
    };
    expect(
      evaluateConstruction(q, { ...initialGame, construction: peninsula })
        ?.tier,
    ).not.toBe(0);
    const everything: Construction = {
      version: 1,
      kind: "brush",
      strokes: Array.from({ length: 21 }, (_, i) => ({
        points: [
          { lat: 2 + i * 2, lng: 60 },
          { lat: 2 + i * 2, lng: 104 },
        ],
        radiusKm: 180,
        erase: false,
      })),
    };
    expect(
      evaluateConstruction(q, { ...initialGame, construction: everything })
        ?.tier,
    ).toBeNull();
    // Tiny offshore components and disputed Kashmir are deliberately not punitive cells.
    const cells = INDIA_DATA.paint.cells.map(([i]) =>
      gridPoint(INDIA_DATA.paint, i),
    );
    expect(
      cells.some((p) => p.lat > 33 && p.lat < 35 && p.lng > 74 && p.lng < 76),
    ).toBe(false);
    expect(
      cells.some((p) => p.lat > 10 && p.lat < 13 && p.lng > 92 && p.lng < 93),
    ).toBe(false);
    const world = journeyWorld(
      regions,
      journey,
      session("01-paint-the-country").game,
      context,
    );
    expect(world.showBorders).toBe(false);
    expect(world.states["wurl:IND"]).not.toBe("hinted");
    expect(world.overlays?.some((o) => o.id === "india:relief")).toBe(true);
    expect(paintedCells(INDIA_DATA.paint, everything).size).toBeGreaterThan(0);
  });

  it("grades broad landscape zones independently by pin label and preserves misses", () => {
    const s = session("02-three-landscapes"),
      q = question("02-three-landscapes");
    const pins = Object.fromEntries(
      INDIA_DATA.zones.map((z) => [z.id, z.example]),
    );
    s.dispatch({
      type: "construction",
      value: { version: 1, kind: "pins", pins },
    });
    expect(constructionReady(q, s.game)).toBe(true);
    const pending = journeyWorld(regions, journey, s.game, context);
    expect(pending.places.filter((p) => p.sourceId === "player")).toHaveLength(
      3,
    );
    expect(pending.regions.some((r) => r.id.startsWith("india-zone:"))).toBe(
      false,
    );
    s.dispatch({ type: "pin-slot", id: "himalayas" });
    s.dispatch({ type: "drop-labeled-pin", lat: 28, lng: 84 }); // Nepal, outside the Indian teaching zone.
    s.dispatch({ type: "submit" });
    expect(s.game.answers[0].points).toBe(2);
    const reveal = journeyWorld(regions, journey, s.game, context);
    expect(
      reveal.places.find((p) => p.id.endsWith(":pin:himalayas"))?.visualState,
    ).toBe("incorrect");
    expect(
      pending.overlays?.some((o) => o.id === "india:landscape-regions"),
    ).toBe(false);
    expect(
      reveal.overlays?.find((o) => o.id === "india:landscape-regions"),
    ).toMatchObject({ type: "raster-patch", foreground: true });
    expect(
      reveal.places
        .filter((p) => p.id.startsWith("india-zone-label:"))
        .map((p) => p.name),
    ).toEqual(INDIA_DATA.zones.map((z) => z.label));
    expect(reveal.places.filter((p) => p.sourceId === "player")).toHaveLength(
      3,
    );
    const swapped = { ...pins, himalayas: pins.thar, thar: pins.himalayas };
    expect(
      evaluateConstruction(q, {
        ...initialGame,
        construction: { version: 1, kind: "pins", pins: swapped },
      })?.metrics[0].value,
    ).toBe(1);
    const incomplete = { ...pins };
    delete incomplete.plain;
    expect(
      constructionReady(q, {
        ...initialGame,
        construction: { version: 1, kind: "pins", pins: incomplete },
      }),
    ).toBe(false);
  });

  it.each([
    ["himalayas", { lat: 31.5, lng: 77.5 }],
    ["himalayas", { lat: 27.6, lng: 88.5 }],
    ["thar", { lat: 27, lng: 70.9 }],
    ["thar", { lat: 28, lng: 72 }],
    ["plain", { lat: 26.8, lng: 81 }],
    ["plain", { lat: 25.5, lng: 85.2 }],
  ] as const)(
    "accepts geographically separated valid locations in %s",
    (id, point) => {
      const zone = INDIA_DATA.zones.find((z) => z.id === id)!;
      expect(
        geoContains(sphericalGeometry(zone.geometry), [point.lng, point.lat]),
      ).toBe(true);
    },
  );

  it("gives Delhi as an anchor, adds Jaipur on assist, and keeps Agra hidden", () => {
    const s = session("04-golden-triangle"),
      q = question("04-golden-triangle");
    const ids = INDIA_DATA.cities.map((p) => p.id);
    for (const action of [
      undefined,
      { type: "request-hint" },
      { type: "request-assist" },
    ] as (Action | undefined)[]) {
      if (action) s.dispatch(action);
      const visible = journeyWorld(
        regions,
        journey,
        s.game,
        context,
      ).places.filter((p) => ids.includes(p.id));
      expect(visible.map((p) => p.name)).toEqual(
        s.game.help?.[q.id] === "assisted" ? ["Delhi", "Jaipur"] : ["Delhi"],
      );
    }
    s.dispatch({
      type: "construction",
      value: { version: 1, kind: "circle", center: INDIA_DATA.circleExample },
    });
    s.dispatch({ type: "submit" });
    expect(s.game.answers[0].points).toBe(1);
    const reveal = journeyWorld(regions, journey, s.game, context);
    expect(reveal.places.filter((p) => ids.includes(p.id))).toHaveLength(3);
    expect(
      reveal.overlays?.find((o) => o.id === "india:golden-triangle"),
    ).toMatchObject({
      type: "path",
      visualState: "corridor",
      foreground: true,
      opacity: 1,
    });
    for (const offset of [-0.1, 0, 0.1])
      expect(
        evaluateConstruction(q, {
          ...initialGame,
          construction: {
            version: 1,
            kind: "circle",
            center: {
              ...INDIA_DATA.circleExample,
              lat: INDIA_DATA.circleExample.lat + offset,
            },
          },
        })?.tier,
      ).toBe(0);
    const jaipur = INDIA_DATA.cities.find((p) => p.name === "Jaipur")!;
    expect(
      evaluateConstruction(q, {
        ...initialGame,
        construction: { version: 1, kind: "circle", center: jaipur },
      })?.metrics[0].value,
    ).toBe(1);
  });

  it("shows density before editing and balances population in distinct orientations", () => {
    const q = question("05-half-the-population"),
      s = session("05-half-the-population");
    const world = journeyWorld(regions, journey, s.game, context);
    expect(
      world.overlays?.some((o) => o.id === "india:population-density"),
    ).toBe(true);
    expect(world.overlays?.some((o) => o.id.includes("side-"))).toBe(false);
    expect(q.rasterLegend?.label).toContain("People per km²");
    for (const example of INDIA_DATA.balancedExamples) {
      const construction: Construction = {
        version: 1,
        kind: "cut",
        points: example.points,
      };
      const result = evaluateConstruction(q, { ...initialGame, construction })!;
      expect(result.tier).toBe(0);
      expect(result.metrics[0].value + result.metrics[1].value).toBeCloseTo(
        100,
        8,
      );
      expect(result.metrics[2].value + result.metrics[3].value).toBeCloseTo(
        100,
        8,
      );
      expect(
        Math.abs(result.metrics[0].value - example.sourcePopulation),
      ).toBeLessThan(0.5);
    }
    s.dispatch({
      type: "construction",
      value: {
        version: 1,
        kind: "cut",
        points: INDIA_DATA.balancedExamples[0].points,
      },
    });
    s.dispatch({ type: "submit" });
    const feedback = journeyWorld(regions, journey, s.game, context);
    const labels = feedback.places.filter(
      (p) => p.id.includes(":side-") && p.id.endsWith(":label"),
    );
    expect(labels).toHaveLength(2);
    for (const [i, letter] of ["A", "B"].entries()) {
      const label = labels.find((p) => p.name.startsWith(letter + " ·"))!;
      expect(label.name).toContain(
        s.game.constructionResult!.metrics[i].value.toFixed(1) + "% of people",
      );
      expect(cutSide(INDIA_DATA.balancedExamples[0].points, label)).toBe(
        i === 0,
      );
      expect(
        geoContains(sphericalGeometry(INDIA_DATA.indiaGeometry), [
          label.lng,
          label.lat,
        ]),
      ).toBe(true);
    }
    s.dispatch({ type: "next" });
    const finished = journeyWorld(regions, journey, s.game, context);
    expect(
      (finished.overlays ?? []).some(
        (o) => o.type === "raster-patch" || o.id.startsWith("construction:"),
      ),
    ).toBe(false);
    expect(finished.places.some((p) => p.id.includes(":side-"))).toBe(false);
    expect(journey.completion?.initialConstructionRoundId).toBeUndefined();
    const broken: Construction = {
      version: 1,
      kind: "cut",
      points: [
        { lat: 20, lng: 80 },
        { lat: 21, lng: 81 },
      ],
    };
    expect(constructionReady(q, { ...initialGame, construction: broken })).toBe(
      false,
    );
  });
});

describe("progressive country recall", () => {
  it("deduplicates aliases and wrong countries, while exempting Afghanistan and spelling", () => {
    const s = session("03-name-the-neighbors");
    for (const value of [
      "Afghanistan",
      "Islamic Republic of Afghanistan",
      "Afghanistan",
      "Chinaa",
      "",
      "not a country",
    ])
      s.enter(value);
    expect(recallMistakes(s.game.recall)).toEqual([]);
    expect(recalledIds(s.game.recall)).toEqual([]);
    s.enter("Burma");
    s.enter("Myanmar");
    expect(recalledIds(s.game.recall)).toEqual(["wurl:MMR"]);
    s.enter("Sri Lanka");
    s.enter("sri-lanka");
    expect(recallMistakes(s.game.recall)).toEqual(["wurl:LKA"]);
    expect(s.game.phase).toBe("playing");
    expect(
      gameReducer(s.game, { type: "clear" }, journey, context).recall,
    ).toEqual(s.game.recall);
  });

  it.each([
    [0, 3],
    [1, 2],
    [2, 1],
  ] as const)(
    "finishes all six with %i mistakes for %i points",
    (mistakes, points) => {
      const s = session("03-name-the-neighbors");
      ["Sri Lanka", "Maldives"]
        .slice(0, mistakes)
        .forEach((name) => s.enter(name));
      borderNames.forEach((name) => s.enter(name));
      expect(s.game.phase).toBe("feedback");
      expect(s.game.answers[0].correct).toBe(true);
      expect(s.game.answers[0].points).toBe(points);
      expect(validGame(s.game, journey)).toBe(true);
    },
  );

  it.each([
    [0, 0],
    [1, 1],
    [3, 1],
    [4, 2],
    [5, 2],
  ] as const)(
    "voluntary finish with %i names preserves %i partial points separately from correctness",
    (count, points) => {
      const s = session("03-name-the-neighbors");
      borderNames.slice(0, count).forEach((name) => s.enter(name));
      s.dispatch({ type: "submit" });
      expect(journeyScore(s.game)).toBe(0);
      expect(journeyPoints(s.game)).toBe(points);
      expect(answerPoints(s.game.answers[0])).toBe(points);
      expect(validGame(s.game, journey)).toBe(true);
    },
  );

  it("ends immediately at the third distinct wrong country without losing earlier successes", () => {
    const s = session("03-name-the-neighbors");
    borderNames.slice(0, 5).forEach((name) => s.enter(name));
    ["Sri Lanka", "Maldives", "Thailand"].forEach((name) => s.enter(name));
    expect(s.game.phase).toBe("feedback");
    expect(s.game.recall?.ended).toBe("third-wrong");
    expect(recalledIds(s.game.recall)).toHaveLength(5);
    expect(s.game.answers[0].points).toBe(0);
    expect(s.enter("Myanmar").answers).toHaveLength(1);
  });

  it("supplies one missing answer, caps with min, and restores the immutable help", () => {
    const s = session("03-name-the-neighbors"),
      q = question("03-name-the-neighbors");
    s.enter("Bhutan");
    s.dispatch({ type: "request-hint" });
    s.dispatch({ type: "request-assist" });
    expect(s.game.recall?.assistedId).toBe("wurl:PAK");
    expect(recalledIds(s.game.recall)).toHaveLength(2);
    const restored = withAssistanceLocks(q, { ...s.game, recall: undefined });
    expect(recalledIds(restored.recall)).toHaveLength(1);
    borderNames
      .filter((name) => name !== "Bhutan" && name !== "Pakistan")
      .forEach((name) => s.enter(name));
    expect(s.game.answers[0].points).toBe(1);
    expect(recalledIds(s.game.answers[0].recall)).toHaveLength(6);
  });

  it("round-trips pending history and partial receipts through the existing save codec", () => {
    const s = session("03-name-the-neighbors");
    s.enter("China");
    s.enter("Sri Lanka");
    s.enter("Afghanistan");
    const codec = dailySaveCodec([journey]);
    const save = {
      version: 1 as const,
      attempts: {
        "2026-10-23": {
          date: "2026-10-23",
          journeyId: journey.id,
          scheduleVersion: 1,
          game: s.game,
        },
      },
    };
    expect(codec.valid(save)).toBe(true);
    const restored = codec.decode(
      JSON.parse(JSON.stringify(codec.encode(save))),
    );
    expect(restored.attempts["2026-10-23"].game.recall).toEqual(s.game.recall);
    s.dispatch({ type: "submit" });
    const updated = {
      ...save,
      attempts: {
        "2026-10-23": { ...save.attempts["2026-10-23"], game: s.game },
      },
    };
    expect(codec.valid(updated)).toBe(true);
    const noSnapshot = { ...s.game.answers[0] };
    delete noSnapshot.points;
    delete noSnapshot.pointsVersion;
    expect(answerPoints(noSnapshot)).toBe(0);
    expect(
      journeyPoints(
        codec.decode(codec.encode(updated)).attempts["2026-10-23"].game,
      ),
    ).toBe(1);
  });
  it("merges irreversible guesses from stale tabs and ends a combined third mistake", () => {
    const a = session("03-name-the-neighbors"),
      b = session("03-name-the-neighbors");
    a.enter("China");
    a.enter("Sri Lanka");
    b.enter("Bhutan");
    b.enter("Maldives");
    b.enter("Thailand");
    const merged = mergeCountryRecall(a.game.recall, b.game.recall)!;
    expect(recalledIds(merged).sort()).toEqual(["wurl:BTN", "wurl:CHN"]);
    expect(recallMistakes(merged)).toHaveLength(3);
    expect(merged.ended).toBe("third-wrong");
    const ended = gameReducer(
      { ...a.game, recall: merged },
      { type: "submit" },
      journey,
      context,
    );
    expect(ended.phase).toBe("feedback");
    expect(ended.answers[0].points).toBe(0);
  });
});
