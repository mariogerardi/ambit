import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { geoContains, geoDistance } from "d3-geo";
import { renderToStaticMarkup } from "react-dom/server";
import {
  WITHIN_REACH_JOURNEY as journey,
  WITHIN_REACH_SITES as sites,
} from "../src/game/withinReachJourney";
import {
  JOURNEY_INDEX,
  journeyPath,
  loadJourney,
} from "../src/game/journeyRegistry";
import { recoverDaily } from "../src/app/dailyProgress";
import { createQuestionContext } from "../src/game/questionPreparation";
import { evaluateConstruction } from "../src/game/construction";
import { constructionScene } from "../src/game/constructionScene";
import { CONSTRUCTION_RECIPES } from "../src/game/constructionRecipes";
import { initialGame, gameReducer, type GameState } from "../src/game/state";
import { journeyWorld } from "../src/app/journeyWorld";
import { sphericalGeometry } from "../src/geography/sphericalGeometry.mjs";
import { QuestionAccuracy } from "../src/game/QuestionSupport";
import { dailySaveCodec } from "../src/app/progressSaves";
import type { RegionFeature } from "../src/geography/types";
import type { Question } from "../src/game/questionContracts";
const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(regions, [], journey);
const playing = (index: number): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex: index,
});
const response = (center: { lat: number; lng: number }): GameState => ({
  ...playing(0),
  construction: { version: 1, kind: "circle", center },
});
const enclosed = (
  site: (typeof sites)[number],
  center: { lat: number; lng: number },
) =>
  site.islands
    .filter((i) =>
      i.boundary.every(
        (p) =>
          geoDistance([center.lng, center.lat], [p.lng, p.lat]) * 6371.0088 <=
          site.radiusKm + 1e-6,
      ),
    )
    .map((i) => i.id);

describe("Within Reach whole-island edition", () => {
  it("registers a separate whole-island edition and replaces Stockholm with Scilly", async () => {
    expect(journey.id).toBe("within-reach-v2");
    expect(journey.supersedes).toBe("within-reach-v1");
    expect(JOURNEY_INDEX.some((j) => j.id === "within-reach-v1")).toBe(false);
    expect(journeyPath(journey.id)).toBe("/journey/within-reach");
    expect(await loadJourney(journey.id)).toBe(journey);
    expect(
      JOURNEY_INDEX.find((j) => j.id === journey.id)?.rounds.map((q) => q.id),
    ).toEqual(journey.rounds.map((q) => q.id));
    expect(sites.map((s) => s.id)).toEqual([
      "boston",
      "scilly",
      "singapore",
      "hauraki",
      "cyclades",
    ]);
    for (const site of sites)
      expect(site.islands.length).toBeGreaterThanOrEqual(20);
    expect(
      sites.find((s) => s.id === "boston")!.islands.map((i) => i.name),
    ).toEqual(
      expect.arrayContaining([
        "Long Island",
        "Rainsford Island",
        "Great Brewster Island",
        "Thompson Island",
        "Raccoon Island",
        "Sheep Island",
      ]),
    );
    expect(
      sites.find((s) => s.id === "scilly")!.islands.map((i) => i.name),
    ).toEqual(
      expect.arrayContaining([
        "Tresco",
        "St Mary's",
        "St Martin's",
        "Bryher",
        "St Agnes",
      ]),
    );
  });
  it("uses concrete coast and island copy throughout play, help, reveals and completion", () => {
    const copy = [
      journey.description,
      journey.completion?.caption,
      journey.completion?.mapCaption,
      ...journey.rounds.flatMap((q) => [
        q.label,
        q.topic,
        q.leadIn,
        q.prompt,
        q.instruction,
        q.guidance?.hint,
        q.guidance?.assist?.text,
        q.explanation,
        q.qualification,
        ...(q.rule.type === "island-coverage-max"
          ? q.rule.tiers.map((t) => t.feedback)
          : []),
      ]),
    ].join(" ");
    expect(copy).not.toMatch(
      /neighbou?rhood|between (?:their )?doors|marked landings|it reaches|belonging can be/i,
    );
    expect(journey.rounds[0].prompt).toBe(
      "How many of these islands can fit inside a single circle?",
    );
  });
  it("archives marker-edition attempts intact instead of regrading them as whole islands", () => {
    const game = {
      ...playing(2),
      construction: {
        version: 1 as const,
        kind: "circle" as const,
        center: sites[0].initial,
      },
    };
    const old = {
      date: "2026-10-22",
      journeyId: "within-reach-v1",
      scheduleVersion: 2,
      runId: "old-markers",
      game,
    };
    const recovered = recoverDaily(
      { version: 1, activeDate: old.date, attempts: { [old.date]: old } },
      JOURNEY_INDEX,
    )!;
    expect(recovered.attempts[old.date]).toBeUndefined();
    expect(
      recovered.archivedAttempts?.[`${old.date}/${old.journeyId}`],
    ).toEqual(old);
  });
  it("keeps the Singapore field north of the neighboring Indonesian islands", () => {
    const singapore = sites.find((s) => s.id === "singapore")!;
    expect(singapore.islands.map((i) => i.name)).toEqual(
      expect.arrayContaining([
        "Pulau Satumu",
        "Pulau Biola",
        "St John’s & Lazarus",
      ]),
    );
    expect(
      singapore.islands.some((i) => i.focus.lng > 103.84 && i.focus.lat < 1.19),
    ).toBe(false);
    expect(
      geoContains(
        sphericalGeometry(singapore.backgroundGeometry),
        [103.8991, 1.16088],
      ),
    ).toBe(false);
  });
  it.each(sites)(
    "$id grades every canonical shore and has forgiving, attainable scoring bands",
    (site) => {
      const q = journey.rounds.find((q) => q.id === `within-reach:${site.id}`)!;
      expect(q.rule.type).toBe("island-coverage-max");
      if (q.rule.type !== "island-coverage-max") throw Error();
      expect(q.rule.tiers.map((t) => t.count)).toEqual([
        site.benchmark.maximum,
        site.benchmark.maximum - 2,
        site.benchmark.maximum - 5,
      ]);
      for (const [tier, sample] of site.benchmark.samples.entries()) {
        const result = evaluateConstruction(q, response(sample.center))!;
        expect(result.tier).toBe(tier);
        expect(result.containedIds).toEqual(enclosed(site, sample.center));
        expect(result.containedIds).toHaveLength(sample.count);
        expect(result.metrics[0]).toEqual({
          label: "Whole islands enclosed",
          value: sample.count,
          unit: `of ${site.islands.length}`,
        });
        expect(result.sourceRevision).toBe(site.sourceRevision);
        expect(sample.clearanceKm).toBeGreaterThan(0.04);
        expect(
          evaluateConstruction(
            q,
            response({
              lat: sample.center.lat + 0.0001,
              lng: sample.center.lng - 0.0001,
            }),
          )?.tier,
        ).toBe(tier);
      }
      expect(evaluateConstruction(q, response(site.initial))?.tier).toBeNull();
      expect(
        evaluateConstruction(
          q,
          response({
            lat: -site.focus.lat,
            lng:
              site.focus.lng > 0 ? site.focus.lng - 180 : site.focus.lng + 180,
          }),
        )?.containedIds,
      ).toEqual([]);
    },
  );
  it.each(journey.rounds)(
    "$id awards exact-best / one–two fewer / three–five fewer, then no points",
    (q) => {
      if (q.rule.type !== "island-coverage-max") throw Error();
      const maximum = q.rule.maximum;
      const candidates = Array.from({ length: maximum }, (_, i) => ({
        id: `island-${i}`,
        name: `Island ${i}`,
        focus: { lat: 0, lng: i * 0.001 },
        boundary: [
          { lat: -0.00001, lng: i * 0.001 - 0.00001 },
          { lat: 0.00001, lng: i * 0.001 - 0.00001 },
          { lat: 0.00001, lng: i * 0.001 + 0.00001 },
          { lat: -0.00001, lng: i * 0.001 + 0.00001 },
        ],
      }));
      const synthetic = { ...q, rule: { ...q.rule, radiusKm: 5, candidates } };
      for (const [missed, tier] of [0, 1, 1, 2, 2, 2, null].entries()) {
        const center = {
          lat: 0,
          lng:
            (maximum - missed) * 0.001 -
            0.0005 -
            ((5 / 6371.0088) * 180) / Math.PI,
        };
        const result = evaluateConstruction(synthetic, response(center))!;
        expect(result.containedIds).toHaveLength(maximum - missed);
        expect(result.tier).toBe(tier);
      }
    },
  );
  it("does not count an island whose label is inside but whose far shore is outside", () => {
    const recipe = CONSTRUCTION_RECIPES.find(
      (q) => q.id === "recipe:geo-circle-islands",
    )!;
    if (recipe.rule.type !== "island-coverage-max") throw Error();
    const small = recipe.rule.candidates;
    const long = {
      id: "long-island",
      name: "Long island",
      focus: { lat: 0, lng: 0 },
      boundary: [
        { lat: 0, lng: -3 },
        { lat: 0, lng: 3 },
        { lat: 0.2, lng: 0 },
      ],
    };
    const q = {
      ...recipe,
      rule: { ...recipe.rule, candidates: [long, ...small] },
    } as Question;
    const result = evaluateConstruction(q, response({ lat: 0, lng: 0 }))!;
    expect(result.containedIds).not.toContain(long.id);
    expect(result.containedIds).toHaveLength(3);
    // A deliberately misleading render footprint has no influence on grading.
    expect(
      evaluateConstruction(
        {
          ...q,
          displayGeometries: {
            "long-island": {
              type: "Polygon",
              coordinates: [
                [
                  [0, 0],
                  [0.01, 0],
                  [0.01, 0.01],
                  [0, 0],
                ],
              ],
            },
          },
        } as Question,
        response({ lat: 0, lng: 0 }),
      ),
    ).toEqual(result);
  });
  it("uses island labels without markers or a center pin, and leaves the circle editable", () => {
    for (const [index, site] of sites.entries()) {
      const q = journey.rounds[index];
      const game = { ...playing(index), ...response(site.initial) };
      const scene = constructionScene(q, game, false);
      expect(scene.places.length).toBeGreaterThanOrEqual(7);
      expect(scene.places.length).toBeLessThanOrEqual(10);
      expect(
        scene.places.every(
          (p) =>
            p.surfaceAligned && (p.labelScale ?? 1) < 1 && !p.labelFlexible,
        ),
      ).toBe(true);
      expect(
        scene.places.every((p) => p.markerHidden && p.kind === "other"),
      ).toBe(true);
      expect(
        scene.places.every((p) => site.islands.some((i) => i.name === p.name)),
      ).toBe(true);
      expect(q.clueLocators).toHaveLength(site.islands.length);
      expect(q.clueLocators?.every((c) => c.pulseOnly)).toBe(true);
      expect(scene.overlays.some((o) => o.type === "circle" && o.active)).toBe(
        true,
      );
      const accuracy = renderToStaticMarkup(<QuestionAccuracy question={q} />);
      expect(accuracy).toContain("entire islands");
      expect(accuracy).not.toContain("marked");
    }
  });
  it.each(sites)(
    "$id assist outlines three members of a best fit without moving or grading the draft",
    (site) => {
      const index = sites.indexOf(site),
        q = journey.rounds[index];
      const game = { ...playing(index), construction: q.constructionExample };
      const before = evaluateConstruction(q, game);
      const assisted = { ...game, help: { [q.id]: "assisted" as const } };
      const world = journeyWorld(regions, journey, assisted, context);
      const highlighted = site.islands.filter((i) =>
        q.guidance?.assist?.regionIds?.includes(i.id),
      );
      expect(highlighted).toHaveLength(3);
      expect(
        highlighted.every((i) =>
          site.benchmark.samples[0].containedIds.includes(i.id),
        ),
      ).toBe(true);
      expect(
        world.places.filter((p) =>
          highlighted.some((i) => `${i.id}:label` === p.id),
        ),
      ).toHaveLength(3);
      expect(highlighted.every((i) => world.states[i.id] === "hinted")).toBe(
        true,
      );
      expect(
        world.overlays
          ?.filter(
            (o) =>
              o.type === "path" &&
              o.surfaceAligned &&
              o.id.startsWith("assist:"),
          )
          .map((o) => o.id),
      ).toEqual(
        expect.arrayContaining(highlighted.map((i) => `assist:${i.id}:0`)),
      );
      expect(evaluateConstruction(q, assisted)).toEqual(before);
      expect(assisted.construction).toBe(game.construction);
    },
  );
  it("retains reached detailed shores during Next without loading future detailed islands or their labels", () => {
    const first = journeyWorld(regions, journey, playing(0), context);
    const next = journeyWorld(regions, journey, playing(1), context);
    const boston = sites.find((s) => s.id === "boston")!,
      scilly = sites.find((s) => s.id === "scilly")!,
      future = sites.find((s) => s.id === "singapore")!;
    expect(
      next.regions.find((r) => r.id === boston.parentId)?.displayGeometry,
    ).toBe(
      first.regions.find((r) => r.id === boston.parentId)?.displayGeometry,
    );
    for (const island of boston.islands)
      expect(next.regions.find((r) => r.id === island.id)).toBe(island);
    for (const island of scilly.islands)
      expect(next.regions.find((r) => r.id === island.id)).toBe(island);
    expect(
      next.regions.some((r) => future.islands.some((i) => i.id === r.id)),
    ).toBe(false);
    expect(
      next.places.every(
        (p) => !boston.islands.some((i) => p.id === `${i.id}:label`),
      ),
    ).toBe(true);
    expect(
      next.regions.find((r) => r.id === future.parentId)?.displayGeometry,
    ).not.toBe(future.backgroundGeometry);
  });
  it("keeps highlighted islands separate from their backing and preserves canonical country identity", () => {
    for (const [index, site] of sites.entries()) {
      const scene = journeyWorld(regions, journey, playing(index), context);
      const owner = scene.regions.find((r) => r.id === site.parentId)!;
      expect(owner.geometry).toBe(
        regions.find((r) => r.id === site.parentId)!.geometry,
      );
      expect(owner.displayGeometry).toBe(site.backgroundGeometry);
      for (const island of site.islands) {
        expect(scene.states[island.id]).toBe("hinted");
        expect(
          geoContains(sphericalGeometry(island.geometry), [
            island.focus.lng,
            island.focus.lat,
          ]),
        ).toBe(true);
        expect(
          geoContains(sphericalGeometry(site.backgroundGeometry), [
            island.focus.lng,
            island.focus.lat,
          ]),
        ).toBe(false);
      }
    }
  });
  it("freezes help-capped grades and restores submitted circles for each completion review", () => {
    let game: GameState = { ...initialGame, phase: "playing" };
    for (const index of journey.rounds.keys()) {
      game = gameReducer(
        game,
        {
          type: "construction",
          value: {
            version: 1,
            kind: "circle",
            center: sites[index].benchmark.samples[0].center,
          },
        },
        journey,
        context,
      );
      if (index === 1)
        game = gameReducer(game, { type: "request-hint" }, journey, context);
      if (index === 3) {
        game = gameReducer(game, { type: "request-hint" }, journey, context);
        game = gameReducer(game, { type: "request-assist" }, journey, context);
      }
      game = gameReducer(game, { type: "submit" }, journey, context);
      expect(game.phase).toBe("feedback");
      game = gameReducer(game, { type: "next" }, journey, context);
    }
    expect(game.phase).toBe("finished");
    expect(game.answers.map((a) => a.points)).toEqual([3, 2, 3, 1, 3]);
    const codec = dailySaveCodec(JOURNEY_INDEX);
    const saved = {
      version: 1 as const,
      activeDate: "2026-10-22",
      attempts: {
        "2026-10-22": {
          date: "2026-10-22",
          journeyId: journey.id,
          scheduleVersion: 2,
          runId: "whole-islands",
          startedAt: 1,
          game,
        },
      },
    };
    const stored = codec.decode(
      JSON.parse(JSON.stringify(codec.encode(saved))),
    );
    expect(stored.attempts["2026-10-22"].game.answers).toEqual(game.answers);
    for (const [index, q] of journey.rounds.entries()) {
      const scene = journeyWorld(regions, journey, game, context, index);
      expect(
        scene.overlays?.find((o) => o.id === `construction:${q.id}:circle`),
      ).toMatchObject({
        type: "circle",
        center: sites[index].benchmark.samples[0].center,
      });
    }
  });
});
