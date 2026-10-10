import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { RegionFeature } from "../src/geography/types";
import { THIRD_JOURNEY } from "../src/game/thirdJourney";
import { COUNTRY_FACTS } from "../src/game/journey";
import {
  createQuestionContext,
  canSubmit,
  isCorrect,
  solutionIds,
} from "../src/game/questions";
import type { Action, GameState } from "../src/game/state";
import { gameReducer, initialGame, journeyScore } from "../src/game/state";
import {
  highlightedPartId,
  journeyVisitedStates,
  questionMapPresentation,
  questionPlaces,
  questionRegions,
  questionVisualStates,
} from "../src/game/presentation";
import { geoContains } from "d3-geo";
import { sphericalGeometry } from "../src/geography/sphericalGeometry.mjs";
import { SECOND_JOURNEY } from "../src/game/secondJourney";

const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(world, COUNTRY_FACTS, THIRD_JOURNEY);
const reduce = (state: GameState, ...actions: Action[]) =>
  actions.reduce((s, a) => gameReducer(s, a, THIRD_JOURNEY, context), state);
const response = (
  selectedIds: string[] = [],
  text = "",
  ordered: string[] = [],
) => ({ selectedIds, text, ordered });
const playing = (roundIndex: number): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex,
});

describe("Asia journey and local facts", () => {
  it("identifies Tajikistan from complete five-country language profiles, without treating minority languages as national languages", () => {
    expect(solutionIds(THIRD_JOURNEY.rounds[0], context)).toEqual(["wurl:TJK"]);
    expect(
      reduce(playing(0), { type: "select", id: "wurl:UZB" }).answers[0].correct,
    ).toBe(false);
    expect(
      reduce(playing(0), { type: "select", id: "wurl:TJK" }).answers[0].correct,
    ).toBe(true);
  });
  it("computes three geographic crossings and preserves a blind wrong-answer map", () => {
    const q = THIRD_JOURNEY.rounds[1];
    expect(solutionIds(q, context)).toEqual([
      "wurl:TJK",
      "wurl:AFG",
      "wurl:IRN",
      "wurl:ARM",
    ]);
    expect(isCorrect(q, context, response([], "3"))).toBe(true);
    const wrong = reduce(
      playing(1),
      { type: "text", value: "2" },
      { type: "submit" },
    );
    expect(questionMapPresentation(q, wrong.phase, false).borders).toBe(false);
    expect(questionVisualStates(q, context, wrong)["wurl:AFG"]).toBe(
      "disabled",
    );
    expect(questionMapPresentation(q, "feedback", true).borders).toBe(true);
  });
  it("counts all five Caspian shores and reveals their geography only on submission", () => {
    const q = THIRD_JOURNEY.rounds[2];
    expect(solutionIds(q, context).sort()).toEqual(
      ["wurl:AZE", "wurl:IRN", "wurl:KAZ", "wurl:RUS", "wurl:TKM"].sort(),
    );
    expect(isCorrect(q, context, response([], "5"))).toBe(true);
    expect(isCorrect(q, context, response([], "4"))).toBe(false);
    expect(questionMapPresentation(q, "playing")).toEqual({
      borders: false,
      hover: false,
      muteOthers: true,
    });
    expect(
      Object.values(questionVisualStates(q, context, playing(2))).every(
        (s) => s === "disabled",
      ),
    ).toBe(true);
    expect(questionMapPresentation(q, "feedback", false).borders).toBe(true);
  });
  it("highlights only Nakhchivan and leaves the owner's main territory neutral without changing country identity", () => {
    const q = THIRD_JOURNEY.rounds[3],
      render = questionRegions(world, q, "playing");
    const fragment = render.find(
      (r) => r.id === highlightedPartId("wurl:AZE"),
    )!;
    const main = render.find((r) => r.id === "wurl:AZE")!;
    expect(fragment.parentId).toBe("wurl:AZE");
    expect(
      geoContains(sphericalGeometry(fragment.geometry), [45.41, 39.21]),
    ).toBe(true);
    expect(
      geoContains(sphericalGeometry(fragment.geometry), [49.88, 40.39]),
    ).toBe(false);
    expect(geoContains(sphericalGeometry(main.geometry), [45.41, 39.21])).toBe(
      false,
    );
    expect(geoContains(sphericalGeometry(main.geometry), [49.88, 40.39])).toBe(
      true,
    );
    const states = questionVisualStates(q, context, playing(3));
    expect(states[fragment.id]).toBe("hinted");
    expect(states["wurl:AZE"]).toBe("disabled");
    expect(Object.values(states).filter((s) => s !== "disabled")).toEqual([
      "hinted",
    ]);
    const game = reduce(
      playing(3),
      { type: "select", id: "wurl:AZE" },
      { type: "submit" },
    );
    expect(game.answers[0].correct).toBe(true);
    expect(questionRegions(world, q, "feedback")).toBe(world);
    expect(questionVisualStates(q, context, game)["wurl:AZE"]).toBe("correct");
  });
  it("validates capitals in order, accepts spelling aliases, rejects countries and missing or reordered stops", () => {
    const q = THIRD_JOURNEY.rounds[4],
      capitals = ["Baku", "Moscow", "Astana", "Tashkent", "Dushanbe"];
    expect(isCorrect(q, context, response([], "", capitals))).toBe(true);
    expect(
      isCorrect(
        q,
        context,
        response([], "", [
          "baku",
          " Moskva ",
          "Astana",
          "Tashkent",
          "Dushanbe",
        ]),
      ),
    ).toBe(true);
    expect(
      isCorrect(
        q,
        context,
        response([], "", ["Baku", "Astana", "Moscow", "Tashkent", "Dushanbe"]),
      ),
    ).toBe(false);
    expect(
      isCorrect(
        q,
        context,
        response([], "", [
          "Azerbaijan",
          "Russia",
          "Kazakhstan",
          "Uzbekistan",
          "Tajikistan",
        ]),
      ),
    ).toBe(false);
    expect(canSubmit(q, context, response([], "", capitals.slice(0, 4)))).toBe(
      false,
    );
    expect(questionPlaces(q, context, "playing")).toEqual([]);
    expect(questionPlaces(q, context, "feedback").map((c) => c.name)).toEqual(
      capitals,
    );
  });
  it("finishes all five rounds with 5/5 and includes their geography in the recap", () => {
    let game = reduce(
      initialGame,
      { type: "start" },
      { type: "select", id: "wurl:TJK" },
      { type: "next" },
      { type: "text", value: "3" },
      { type: "submit" },
      { type: "next" },
      { type: "text", value: "5" },
      { type: "submit" },
      { type: "next" },
      { type: "select", id: "wurl:AZE" },
      { type: "submit" },
      { type: "next" },
    );
    ["Baku", "Moscow", "Astana", "Tashkent", "Dushanbe"].forEach(
      (value, index) =>
        (game = reduce(game, { type: "ordered", index, value })),
    );
    game = reduce(game, { type: "submit" }, { type: "next" });
    expect(game.phase).toBe("finished");
    expect(journeyScore(game)).toBe(5);
    const states = journeyVisitedStates(THIRD_JOURNEY, context, game.answers);
    for (const id of [
      "TJK",
      "AFG",
      "IRN",
      "ARM",
      "AZE",
      "KAZ",
      "RUS",
      "TKM",
      "UZB",
    ])
      expect(states[`wurl:${id}`]).toBe("visited");
    expect(Object.keys(states).every((id) => context.members.has(id))).toBe(
      true,
    );
  });
  it("enforces the six-choice authoring cap instead of silently discarding options", () => {
    const q = SECOND_JOURNEY.rounds[1];
    expect(q.choices).toHaveLength(6);
    const invalid = {
      ...q,
      choices: [...q.choices!, { id: "language:jpn", label: "Japanese" }],
    };
    expect(() =>
      createQuestionContext(world, COUNTRY_FACTS, {
        ...SECOND_JOURNEY,
        rounds: [invalid],
      }),
    ).toThrow("at most six");
  });
});
