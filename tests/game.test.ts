import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import type { RegionFeature } from "../src/geography/types";
import { JOURNEY, COUNTRY_FACTS } from "./fixtures/engine/journey";
import { gameReducer, initialGame, journeyScore } from "../src/game/state";
import {
  createQuestionContext,
  canSelect,
  canSubmit,
  committedNameVisible,
  countryIdForName,
  isCorrect,
  responseCount,
  selectableIds,
  solutionIds,
} from "../src/game/questions";
import type { GameState, Action } from "../src/game/state";
import type { Question, Response } from "../src/game/questions";
import {
  buildBorderGraph,
  greatCircleCountries,
  isMinimumLandPath,
  shortestLandPath,
} from "../src/game/reasoning";
import { playRegionStyle, themedRegionStyle } from "../src/globe/themes";
const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(world, COUNTRY_FACTS, JOURNEY);
const reduce = (state: GameState, ...actions: Action[]) =>
  actions.reduce(
    (state, action) => gameReducer(state, action, JOURNEY, context),
    state,
  );
const response = (
  selectedIds: string[] = [],
  text = "",
  ordered: string[] = [],
): Response => ({ selectedIds, text, ordered });
const playing = (roundIndex: number): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex,
});
describe("reviewed geographic reasoning", () => {
  it("exposes exactly six South African land neighbors and a reviewed Windhoek fact", () => {
    expect(selectableIds(JOURNEY.rounds[0], context).sort()).toEqual(
      [
        "wurl:BWA",
        "wurl:LSO",
        "wurl:MOZ",
        "wurl:NAM",
        "wurl:SWZ",
        "wurl:ZWE",
      ].sort(),
    );
    expect(solutionIds(JOURNEY.rounds[0], context)).toEqual(["wurl:NAM"]);
    expect(canSelect(JOURNEY.rounds[0], context, "wurl:ZAF")).toBe(false);
  });
  it("computes four border crossings and accepts both minimum country chains", () => {
    expect(
      shortestLandPath(context.graph, "wurl:NAM", "wurl:TCD"),
    ).toHaveLength(5);
    for (const middle of ["wurl:AGO", "wurl:ZMB"])
      expect(
        isMinimumLandPath(
          context.graph,
          ["wurl:NAM", middle, "wurl:COD", "wurl:CAF", "wurl:TCD"],
          "wurl:NAM",
          "wurl:TCD",
        ),
      ).toBe(true);
    expect(isCorrect(JOURNEY.rounds[1], context, response([], "4"))).toBe(true);
    expect(isCorrect(JOURNEY.rounds[1], context, response([], "3"))).toBe(
      false,
    );
  });
  it("rejects a point-only touch and a disconnected land route", () => {
    const region = (id: string, coords: number[][]): RegionFeature => ({
      id,
      name: id,
      level: "ADM0",
      sourceId: id,
      focus: { lat: 0, lng: 0 },
      geometry: { type: "Polygon", coordinates: [coords] },
    });
    const graph = buildBorderGraph([
      region("A", [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ]),
      region("B", [
        [1, 1],
        [2, 1],
        [2, 2],
        [1, 2],
        [1, 1],
      ]),
    ]);
    expect(shortestLandPath(graph, "A", "B")).toBeUndefined();
    expect(
      shortestLandPath(context.graph, "wurl:NAM", "wurl:FJI"),
    ).toBeUndefined();
  });
  it("uses all 193 UN members and exactly nine other four-letter answers", () => {
    expect(context.members.size).toBe(193);
    expect([...context.members].every((id) => context.names.has(id))).toBe(
      true,
    );
    expect(solutionIds(JOURNEY.rounds[2], context).sort()).toEqual(
      [
        "wurl:CUB",
        "wurl:FJI",
        "wurl:IRN",
        "wurl:IRQ",
        "wurl:LAO",
        "wurl:MLI",
        "wurl:OMN",
        "wurl:PER",
        "wurl:TGO",
      ].sort(),
    );
    for (const id of ["wurl:GUM", "wurl:NIU", "wurl:TCD", "wurl:VAT"])
      expect(canSelect(JOURNEY.rounds[2], context, id)).toBe(false);
  });
  it("accepts arbitrary three distinct four-letter countries instead of a fixed trio", () => {
    for (const ids of [
      ["wurl:CUB", "wurl:FJI", "wurl:IRN"],
      ["wurl:OMN", "wurl:MLI", "wurl:PER"],
    ])
      expect(isCorrect(JOURNEY.rounds[2], context, response(ids))).toBe(true);
    expect(
      isCorrect(
        JOURNEY.rounds[2],
        context,
        response(["wurl:PER", "wurl:PER", "wurl:MLI"]),
      ),
    ).toBe(false);
  });
  it("normalizes free text and requires the correct capital", () => {
    expect(
      isCorrect(JOURNEY.rounds[3], context, response([], "  lImA  ")),
    ).toBe(true);
    expect(isCorrect(JOURNEY.rounds[3], context, response([], "Peru"))).toBe(
      false,
    );
    expect(countryIdForName(context, "  bRaZiL ")).toBe("wurl:BRA");
    expect(countryIdForName(context, "DRC")).toBe("wurl:COD");
  });
  it("computes the exact great-circle itinerary, retaining the ocean interval", () => {
    const round = JOURNEY.rounds[4],
      intervals = context.routes.get(round.id)!;
    expect(intervals.map((interval) => interval.id)).toEqual([
      "wurl:PER",
      "wurl:BOL",
      "wurl:BRA",
      undefined,
      "wurl:NAM",
    ]);
    expect(intervals[0].from).toBe(0);
    expect(intervals.at(-1)!.to).toBe(1);
    expect(responseCount(round, context)).toBe(4);
    expect(
      isCorrect(
        round,
        context,
        response([], "", ["peru", "Bolivia", "BRAZIL", "Namibia"]),
      ),
    ).toBe(true);
    expect(
      isCorrect(
        round,
        context,
        response([], "", ["Peru", "Brazil", "Bolivia", "Namibia"]),
      ),
    ).toBe(false);
    expect(
      isCorrect(round, context, response([], "", ["Bolivia", "Brazil"])),
    ).toBe(false);
  });
  it("handles route reversal, antimeridian crossings and rejects ambiguous antipodes", () => {
    expect(
      greatCircleCountries(
        world,
        [17.0832, -22.5597],
        [-77.0428, -12.0464],
      ).flatMap((i) => (i.id ? [i.id] : [])),
    ).toEqual(["wurl:NAM", "wurl:BRA", "wurl:BOL", "wurl:PER"]);
    const region: RegionFeature = {
      id: "island",
      name: "island",
      level: "ADM0",
      sourceId: "test",
      focus: { lat: 0, lng: 180 },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [179, -1],
            [-179, -1],
            [-179, 1],
            [179, 1],
            [179, -1],
          ],
        ],
      },
    };
    expect(
      greatCircleCountries([region], [178, 0], [-178, 0]).map((i) => i.id),
    ).toEqual([undefined, "island", undefined]);
    expect(() => greatCircleCountries(world, [0, 0], [180, 0])).toThrow(
      "non-antipodal",
    );
  });
  it("keeps answer methods independent of knowledge rules", () => {
    const pathQuestion: Question = {
      ...JOURNEY.rounds[1],
      mode: "land-path",
      commitment: "submit",
      count: 5,
      selection: { type: "members" },
    };
    expect(
      isCorrect(
        pathQuestion,
        context,
        response(["wurl:NAM", "wurl:ZMB", "wurl:COD", "wurl:CAF", "wurl:TCD"]),
      ),
    ).toBe(true);
    expect(
      isCorrect(
        pathQuestion,
        context,
        response(["wurl:NAM", "wurl:BWA", "wurl:COD", "wurl:CAF", "wurl:TCD"]),
      ),
    ).toBe(false);
  });
});
describe("committed answers and failure policies", () => {
  it("commits a neighbor click immediately, locks feedback, and prevents duplicate scoring", () => {
    const game = reduce(
      initialGame,
      { type: "start" },
      { type: "select", id: "wurl:NAM" },
    );
    expect(game.phase).toBe("feedback");
    expect(journeyScore(game)).toBe(1);
    expect(
      reduce(game, { type: "select", id: "wurl:BWA" }, { type: "submit" }),
    ).toBe(game);
    expect(reduce(game, { type: "next" })).toMatchObject({
      phase: "playing",
      roundIndex: 1,
      selectedIds: [],
      text: "",
      ordered: [],
    });
  });
  it("cannot reveal a four-letter name by hovering or undoing a committed pick", () => {
    const round = JOURNEY.rounds[2];
    expect(committedNameVisible(round, [], "wurl:PER")).toBe(false);
    const game = reduce(playing(2), { type: "select", id: "wurl:PER" });
    expect(game.phase).toBe("playing");
    expect(game.selectedIds).toEqual(["wurl:PER"]);
    expect(committedNameVisible(round, game.selectedIds, "wurl:PER")).toBe(
      true,
    );
    expect(committedNameVisible(round, game.selectedIds, "wurl:BRA")).toBe(
      false,
    );
    expect(
      reduce(game, { type: "select", id: "wurl:PER" }, { type: "clear" }),
    ).toBe(game);
    expect(round.disclosure.namedChoices).toBe(false);
  });
  it("ends the journey immediately on a wrong pick, keeping partial successes", () => {
    const game = reduce(
      playing(2),
      { type: "select", id: "wurl:PER" },
      { type: "select", id: "wurl:MLI" },
      { type: "select", id: "wurl:FRA" },
    );
    expect(game.phase).toBe("failed");
    expect(game.answers.at(-1)!.correct).toBe(false);
    expect(game.selectedIds).toEqual(["wurl:PER", "wurl:MLI", "wurl:FRA"]);
    expect(
      reduce(
        game,
        { type: "next" },
        { type: "select", id: "wurl:IRN" },
        { type: "submit" },
      ),
    ).toBe(game);
  });
  it("ignores Chad and noneligible map units; typed guesses do not expose a named answer list", () => {
    const game = playing(2);
    expect(
      reduce(
        game,
        { type: "select", id: "wurl:TCD" },
        { type: "select", id: "wurl:GUM" },
      ),
    ).toBe(game);
    expect(
      reduce(game, { type: "text", value: "Laos" }, { type: "guess-country" })
        .selectedIds,
    ).toEqual(["wurl:LAO"]);
    const unknown = reduce(
      game,
      { type: "text", value: "xyz" },
      { type: "guess-country" },
    );
    expect(unknown.phase).toBe("playing");
    expect(unknown.inputError).toBeDefined();
  });
  it("requires complete written answers and does not treat blank input as zero", () => {
    expect(canSubmit(JOURNEY.rounds[1], context, response([], ""))).toBe(false);
    expect(canSubmit(JOURNEY.rounds[1], context, response([], "2.5"))).toBe(
      false,
    );
    expect(
      canSubmit(
        JOURNEY.rounds[4],
        context,
        response([], "", ["Peru", "Bolivia", "Brazil", ""]),
      ),
    ).toBe(false);
    expect(reduce(playing(4), { type: "submit" }).phase).toBe("playing");
  });
  it("completes the rewritten journey with 5/5 and resets all response types", () => {
    let game = reduce(
      initialGame,
      { type: "start" },
      { type: "select", id: "wurl:NAM" },
      { type: "next" },
      { type: "text", value: "4" },
      { type: "submit" },
      { type: "next" },
    );
    game = reduce(
      game,
      { type: "select", id: "wurl:CUB" },
      { type: "select", id: "wurl:IRQ" },
      { type: "select", id: "wurl:PER" },
      { type: "next" },
      { type: "text", value: "Lima" },
      { type: "submit" },
      { type: "next" },
    );
    for (const [index, value] of [
      "Peru",
      "Bolivia",
      "Brazil",
      "Namibia",
    ].entries())
      game = reduce(game, { type: "ordered", index, value });
    game = reduce(game, { type: "submit" }, { type: "next" });
    expect(game.phase).toBe("finished");
    expect(journeyScore(game)).toBe(5);
    expect(game.answers).toHaveLength(5);
    expect(reduce(game, { type: "start" })).toEqual({
      ...initialGame,
      phase: "playing",
    });
    expect(reduce(game, { type: "home" })).toEqual(initialGame);
  });
});
describe("decorative gameplay layers", () => {
  it("uses stable opaque country fills and preserves them on hover", () => {
    expect(playRegionStyle("wurl:NAM").fill).toMatch(/^#[\da-f]{6}$/);
    for (const state of [
      "selected",
      "visited",
      "correct",
      "incorrect",
    ] as const)
      expect(playRegionStyle("wurl:NAM", state, true).fill).toBe(
        playRegionStyle("wurl:NAM", state, false).fill,
      );
    expect(themedRegionStyle("natural", "wurl:NAM").fill).toContain("rgba");
    expect(themedRegionStyle("play", "wurl:NAM").fill).toMatch(/^#/);
  });
});
