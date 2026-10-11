import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { DANUBE_JOURNEY } from "../src/game/danubeJourney";
import { COUNTRY_FACTS } from "../src/game/countryFacts";
import { createQuestionContext, isCorrect } from "../src/game/questions";
import { gameReducer, initialGame, journeyScore } from "../src/game/state";
import { JOURNEY_INDEX } from "../src/game/journeyRegistry";
import { ACTIVE_JOURNEY_IDS } from "../src/game/journeyRotation";
import type { Action, GameState } from "../src/game/state";
import type { RegionFeature } from "../src/geography/types";
const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(world, COUNTRY_FACTS, DANUBE_JOURNEY);
it("follows the river through five playable stops, from an underground detour to its delta", () => {
  const answers: Action[][] = [
    [{ type: "select", id: "river:rhine" }, { type: "submit" }],
    [{ type: "drop-pin", lat: 48.208, lng: 16.373 }, { type: "submit" }],
    [{ type: "text", value: "  bUDapest  " }, { type: "submit" }],
    [
      { type: "select", id: "wurl:SRB" },
      { type: "select", id: "wurl:ROU" },
      { type: "submit" },
    ],
    [{ type: "select", id: "sea:black" }, { type: "submit" }],
  ];
  let game: GameState = { ...initialGame, phase: "playing" };
  for (const [index, question] of DANUBE_JOURNEY.rounds.entries()) {
    expect(question.explanation.length).toBeLessThan(230);
    expect(question.leadIn).toBeTruthy();
    expect(question.choices?.length ?? 0).toBeLessThanOrEqual(6);
    for (const action of answers[index])
      game = gameReducer(game, action, DANUBE_JOURNEY, context);
    expect(game.phase, question.id).toBe("feedback");
    expect(game.answers.at(-1)?.correct, question.id).toBe(true);
    game = gameReducer(game, { type: "next" }, DANUBE_JOURNEY, context);
  }
  expect(game.phase).toBe("finished");
  expect(journeyScore(game)).toBe(5);
});
it("grades the city radius and the gorge’s exact border pair", () => {
  const pin = DANUBE_JOURNEY.rounds[1];
  expect(
    isCorrect(pin, context, { ...initialGame, pin: { lat: 48.5, lng: 16.4 } }),
  ).toBe(true);
  expect(
    isCorrect(pin, context, { ...initialGame, pin: { lat: 47.5, lng: 19 } }),
  ).toBe(false);
  const gorge = DANUBE_JOURNEY.rounds[3];
  expect(
    isCorrect(gorge, context, {
      ...initialGame,
      selectedIds: ["wurl:ROU", "wurl:BGR"],
    }),
  ).toBe(false);
  expect(
    isCorrect(gorge, context, { ...initialGame, selectedIds: ["wurl:ROU"] }),
  ).toBe(false);
  expect(DANUBE_JOURNEY.rounds[0].explanation).not.toContain("Black Sea");
  expect(
    JOURNEY_INDEX.find((journey) => journey.id === DANUBE_JOURNEY.id)?.path,
  ).toBe("/journey/down-the-danube");
  expect(ACTIVE_JOURNEY_IDS).not.toContain(DANUBE_JOURNEY.id);
});
