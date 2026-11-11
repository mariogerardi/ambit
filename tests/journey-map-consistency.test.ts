import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { WHERE_IS_IT_OFFICIAL_JOURNEY } from "../src/game/whereIsItOfficialJourney";
import { NOT_FROM_HERE_JOURNEY } from "../src/game/notFromHereJourney";
import { HOW_AMERICA_ADDS_UP_JOURNEY } from "../src/game/howAmericaAddsUpJourney";
import { createQuestionContext } from "../src/game/questionPreparation";
import { gameReducer, initialGame, type GameState } from "../src/game/state";
import { journeyWorld } from "../src/app/journeyWorld";
import { auditVisualScene } from "../src/game/journeyVisualRules";
import type { Journey } from "../src/game/questionContracts";
import type { RegionFeature } from "../src/geography/types";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
function scenario(journey: Journey, index: number) {
  const context = createQuestionContext(regions, [], journey);
  const start: GameState = {
    ...initialGame,
    phase: "playing",
    roundIndex: index,
  };
  const select = (game: GameState, id: string) =>
    gameReducer(game, { type: "select", id }, journey, context);
  const answer = (...ids: string[]) =>
    gameReducer(
      ids.reduce(select, start),
      { type: "submit" },
      journey,
      context,
    );
  const view = (game: GameState) =>
    journeyWorld(regions, journey, game, context);
  return { context, start, select, answer, view };
}

describe("recent Journey globe roles", () => {
  it("rejects decorative network styling that overwrites an answer role", () => {
    const { context, answer, view } = scenario(WHERE_IS_IT_OFFICIAL_JOURNEY, 4);
    const game = answer("wurl:PRY");
    const world = view(game);
    const question = WHERE_IS_IT_OFFICIAL_JOURNEY.rounds[4];
    expect(auditVisualScene(question, context, game, world)).toEqual([]);
    const repainted = {
      ...world,
      states: { ...world.states, "wurl:BOL": "hinted" as const },
    };
    expect(auditVisualScene(question, context, game, repainted)).toContain(
      "[answer-role] Reveal changed answer to hinted: official-05-guarani / wurl:BOL",
    );
  });
  it.each([
    {
      journey: WHERE_IS_IT_OFFICIAL_JOURNEY,
      index: 4,
      correct: "wurl:PRY",
      wrong: "wurl:ARG",
    },
    {
      journey: NOT_FROM_HERE_JOURNEY,
      index: 0,
      correct: "wurl:CHN",
      wrong: "wurl:JPN",
    },
    {
      journey: HOW_AMERICA_ADDS_UP_JOURNEY,
      index: 1,
      correct: "wurl:USA-NY",
      wrong: "wurl:USA-CA",
    },
  ])(
    "preserves answer fills and symbols through reveal and recap in $journey.title",
    ({ journey, index, correct, wrong }) => {
      const { start, select, answer, view } = scenario(journey, index);
      const pending = view(select(start, wrong));
      expect(pending.states[wrong]).toBe("selected");
      const accepted = answer(correct);
      const acceptedMap = view(accepted);
      expect(acceptedMap.states[correct]).toBe("correct");
      expect(
        acceptedMap.places.find((p) => p.id === `response:${correct}`)
          ?.visualState,
      ).toBe("correct");
      const missed = answer(wrong);
      const missedMap = view(missed);
      expect(missedMap.states[wrong]).toBe("incorrect");
      expect(missedMap.states[correct]).toBe("answer");
      expect(
        missedMap.places.find((p) => p.id === `response:${correct}`)
          ?.visualState,
      ).toBe("answer");
      expect(
        missedMap.places.find((p) => p.id === `response:${wrong}`)?.visualState,
      ).toBe("incorrect");
      expect(view({ ...accepted, phase: "finished" }).states[correct]).toBe(
        "visited",
      );
      const recap = view({ ...missed, phase: "finished" });
      expect(recap.states[wrong]).toBe("incorrect");
      expect(recap.states[correct]).toBe("visited");
    },
  );

  it("distinguishes unchosen alternatives from omitted required countries", () => {
    const language = scenario(WHERE_IS_IT_OFFICIAL_JOURNEY, 4);
    const accepted = language.answer("wurl:PRY");
    const reveal = language.view(accepted);
    expect(reveal.states["wurl:BOL"]).toBe("answer");
    expect(
      reveal.places.find((p) => p.id === "response:wurl:BOL")?.visualState,
    ).toBe("answer");
    // A final recap retains the player's answer, without claiming the whole valid pool.
    expect(
      language.view({ ...accepted, phase: "finished" }).states["wurl:BOL"],
    ).toBe("disabled");
    const potatoes = scenario(NOT_FROM_HERE_JOURNEY, 1);
    const partial = potatoes.answer("wurl:PER", "wurl:CHL");
    const map = potatoes.view(partial);
    expect(map.states).toMatchObject({
      "wurl:PER": "correct",
      "wurl:BOL": "answer",
      "wurl:CHL": "incorrect",
    });
    expect(
      potatoes.view({ ...partial, phase: "finished" }).states,
    ).toMatchObject({
      "wurl:PER": "visited",
      "wurl:BOL": "visited",
      "wurl:CHL": "incorrect",
    });
  });

  it("never erases a mistake when the same country is later a correct answer", () => {
    const { answer, view } = scenario(WHERE_IS_IT_OFFICIAL_JOURNEY, 0);
    const wrong = answer("wurl:PRT");
    const portuguese = scenario(WHERE_IS_IT_OFFICIAL_JOURNEY, 1).answer(
      "wurl:PRT",
    );
    const recap = view({
      ...portuguese,
      phase: "finished",
      answers: [...wrong.answers, ...portuguese.answers],
    });
    expect(recap.states["wurl:PRT"]).toBe("incorrect");
    expect(recap.states["wurl:EGY"]).toBe("visited");
  });
});
