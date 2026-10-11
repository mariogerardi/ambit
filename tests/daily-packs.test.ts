import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { JOURNEYS, journeyPath } from "../src/game/journeys";
import { QUESTION_CATALOG } from "../src/game/questionCatalog";
import {
  createQuestionContext,
  canSelect,
  isCorrect,
  solutionIds,
  committedNameVisible,
} from "../src/game/questions";
import { initialGame, gameReducer } from "../src/game/state";
import type { Action, GameState } from "../src/game/state";
import type { Journey } from "../src/game/questions";
import type { RegionFeature } from "../src/geography/types";
import { journeyWorld } from "../src/app/journeyWorld";
import {
  emptyDaily,
  openDaily,
  setDailyPuzzle,
  validDaily,
  dailyJourney,
} from "../src/app/daily";
import {
  FIFTH_JOURNEY,
  CANADIAN_TERRITORIES,
  PROVINCES_SOUTH_OF_BOSTON,
  US_STATES,
  CANADA_BORDER_STATES,
  CARDINAL_STATES,
} from "./fixtures/engine/fifthJourney";
import { SIXTH_JOURNEY } from "./fixtures/engine/sixthJourney";
import {
  SEVENTH_JOURNEY,
  NEW_ENGLAND_STATES,
} from "./fixtures/engine/seventhJourney";
import { TWELFTH_JOURNEY } from "../src/game/twelfthJourney";
import { THIRTEENTH_JOURNEY } from "./fixtures/engine/thirteenthJourney";
import { ANSWER_PLACES } from "../src/game/answerTargets";
import { highlightedPartId } from "../src/game/presentation";
import {
  regionalChain,
  REGIONAL_LAYERS,
  isCanonicalRegion,
} from "../src/geography/regions";
const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const at = (roundIndex: number): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex,
});
const empty = { selectedIds: [], text: "", ordered: [] };
const context = (j: Journey) => createQuestionContext(world, [], j);
const play = (j: Journey, i: number, actions: Action[]) =>
  actions.reduce((s, a) => gameReducer(s, a, j, context(j)), at(i));

describe("daily packs after removing the editor", () => {
  for (const journey of [TWELFTH_JOURNEY]) {
    it(`${journey.id} retains five validated, locally playable questions and daily progress`, () => {
      expect(JOURNEYS).toContain(journey);
      expect(journeyPath(journey.id)).toMatch(/^\/journey\//);
      expect(journey.rounds).toHaveLength(5);
      const ctx = context(journey);
      for (const q of journey.rounds) {
        expect(QUESTION_CATALOG).toContain(q);
        expect(q.source.url).toMatch(/^https:/);
        expect((q.choices ?? []).length).toBeLessThanOrEqual(6);
        expect(() => solutionIds(q, ctx)).not.toThrow();
        for (const r of q.importedRegions ?? [])
          expect(isCanonicalRegion(r)).toBe(true);
        const before = journeyWorld(
          world,
          journey,
          at(journey.rounds.indexOf(q)),
          ctx,
        );
        if (q.disclosure.hoverNames === false)
          expect(before.regionNames).not.toBe("all");
      }
      const progress = openDaily(
        setDailyPuzzle(emptyDaily, "2026-10-07", journey.id),
        "2026-10-07",
      );
      expect(dailyJourney("2026-10-07", progress)).toBe(journey);
      expect(validDaily(JSON.parse(JSON.stringify(progress)))).toBe(true);
    });
  }
  it("retains typed subdivision answers, the five-state Canada pool and local route reasoning", () => {
    const j = FIFTH_JOURNEY,
      ctx = context(j);
    expect(US_STATES).toHaveLength(50);
    expect(PROVINCES_SOUTH_OF_BOSTON).toEqual(["wurl:CAN-ON"]);
    for (const [i, ids] of [
      [0, CANADIAN_TERRITORIES],
      [1, PROVINCES_SOUTH_OF_BOSTON],
      [2, CANADA_BORDER_STATES.slice(0, 5)],
    ] as const) {
      const q = j.rounds[i];
      expect(
        isCorrect(q, ctx, {
          ...empty,
          ordered: ids.map((id) => ctx.names.get(id)!),
        }),
      ).toBe(true);
      expect(ids.every((id) => !canSelect(q, ctx, id))).toBe(true);
      expect(journeyWorld(world, j, at(i), ctx).regionInteraction).toBe(false);
    }
    expect(solutionIds(j.rounds[3], ctx)[0]).toBe("wurl:USA-CA");
    expect(solutionIds(j.rounds[3], ctx).at(-1)).toBe("wurl:USA-MO");
    expect(solutionIds(j.rounds[4], ctx)).toEqual(CARDINAL_STATES);
  });
  it("answers all enclosed-territory questions and reveals only after committing", () => {
    const j = SIXTH_JOURNEY,
      ctx = context(j);
    const actions: Action[][] = [
      [{ type: "text", value: "Lesotho" }],
      [{ type: "select", id: "wurl:RUS-SPE" }],
      [{ type: "select", id: "wurl:BRN" }],
      [{ type: "ordered", index: 0, value: "NSW" }],
      [{ type: "text", value: "Russia" }],
    ];
    for (let i = 0; i < 5; i++) {
      const after = play(j, i, [...actions[i], { type: "submit" }]);
      expect(after.answers.at(-1)?.correct).toBe(true);
      expect(journeyWorld(world, j, after, ctx)).toBeDefined();
    }
    expect(journeyWorld(world, j, at(1), ctx).states["wurl:RUS-SPE"]).not.toBe(
      "hinted",
    );
    expect(
      journeyWorld(
        world,
        j,
        play(j, 1, [...actions[1], { type: "submit" }]),
        ctx,
      ).states["wurl:RUS-SPE"],
    ).toBe("correct");
    expect(REGIONAL_LAYERS.some((l) => l.parentId === "wurl:ATA")).toBe(false);
    expect(regionalChain("wurl:ATA-X01~")).toEqual([]);
  });
  it("allows state names in New England and hides Nuevo León until Mexico is answered", () => {
    const j = SEVENTH_JOURNEY,
      ctx = context(j);
    expect(j.rounds[2].count).toBe(6);
    for (const id of NEW_ENGLAND_STATES) {
      expect(canSelect(j.rounds[2], ctx, id)).toBe(true);
      expect(committedNameVisible(j.rounds[2], [id], id)).toBe(true);
    }
    const state = play(j, 2, [
      ...NEW_ENGLAND_STATES.map((id): Action => ({ type: "select", id })),
      { type: "submit" },
    ]);
    expect(state.answers[0].correct).toBe(true);
    const before = journeyWorld(world, j, at(4), ctx);
    expect(before.regions.some((r) => r.id === "wurl:MEX-NLE")).toBe(false);
    expect(canSelect(j.rounds[4], ctx, "wurl:MEX")).toBe(true);
    const after = play(j, 4, [
      { type: "select", id: "wurl:MEX" },
      { type: "submit" },
    ]);
    expect(after.answers[0].correct).toBe(true);
    expect(
      journeyWorld(world, j, after, ctx).regions.some(
        (r) => r.id === "wurl:MEX-NLE",
      ),
    ).toBe(true);
  });
  it("withholds French Guiana before feedback and keeps the exception answers unchanged", () => {
    const j = TWELFTH_JOURNEY,
      ctx = context(j);
    const before = journeyWorld(world, j, at(0), ctx);
    expect(before.regions.some((r) => r.id === "wurl:FRA-GF")).toBe(false);
    expect(before.states[highlightedPartId("wurl:FRA")]).toBe("hinted");
    const answers = [
      "wurl:BRA",
      "wurl:UZB",
      "wurl:KIR",
      "wurl:CHL",
      "wurl:AZE",
    ];
    answers.forEach((id, i) => {
      const state = play(j, i, [{ type: "select", id }, { type: "submit" }]);
      expect(state.answers.at(-1)?.correct).toBe(true);
    });
  });
  it("retains Zurich's distance tolerance, Zambia/Zimbabwe clues, Zanzibar fragment and Zaire selection", () => {
    const j = THIRTEENTH_JOURNEY,
      ctx = context(j),
      zurich = ANSWER_PLACES.get("place:2657896")!;
    expect(isCorrect(j.rounds[0], ctx, { ...empty, pin: zurich })).toBe(true);
    expect(
      isCorrect(j.rounds[0], ctx, {
        ...empty,
        pin: ANSWER_PLACES.get("place:2661552")!,
      }),
    ).toBe(false);
    expect(journeyWorld(world, j, at(0), ctx).places).toEqual([]);
    expect(journeyWorld(world, j, at(2), ctx).borderRegionIds).toEqual([
      "wurl:ZMB",
      "wurl:ZWE",
    ]);
    expect(
      journeyWorld(world, j, at(3), ctx).states[highlightedPartId("wurl:TZA")],
    ).toBe("hinted");
    expect(
      play(j, 1, [{ type: "text", value: "Zagreb" }, { type: "submit" }])
        .answers[0].correct,
    ).toBe(true);
    expect(
      play(j, 4, [{ type: "select", id: "wurl:COD" }, { type: "submit" }])
        .answers[0].correct,
    ).toBe(true);
  });
});
