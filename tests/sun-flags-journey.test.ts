import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SUN_FLAGS_JOURNEY } from "../src/game/sunFlagsJourney";
import { JOURNEYS } from "../src/game/journeys";
import { JOURNEY_INDEX } from "../src/game/journeyRegistry";
import { ACTIVE_JOURNEY_IDS } from "../src/game/journeyRotation";
import { COUNTRY_FACTS } from "../src/game/countryFacts";
import { createQuestionContext, isCorrect } from "../src/game/questions";
import { gameReducer, initialGame, journeyScore } from "../src/game/state";
import type { Response } from "../src/game/questions";
import type { Action, GameState } from "../src/game/state";
import type { RegionFeature } from "../src/geography/types";
const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(world, COUNTRY_FACTS, SUN_FLAGS_JOURNEY);

describe("Chasing the sun", () => {
  it("plays five distinct stops with history, observation, symbolism and geographic placement", () => {
    const answers: Action[][] = [
      [{ type: "select", id: "month:may" }, { type: "submit" }],
      [{ type: "text", value: "16" }, { type: "submit" }],
      [{ type: "select", id: "rays:grain" }, { type: "submit" }],
      [{ type: "drop-pin", lat: 35.68, lng: 139.69 }, { type: "submit" }],
      [{ type: "select", id: "dawn:freedom" }, { type: "submit" }],
    ];
    let game: GameState = { ...initialGame, phase: "playing" };
    for (const [index, question] of SUN_FLAGS_JOURNEY.rounds.entries()) {
      expect(question.explanation.length).toBeLessThan(230);
      expect(question.leadIn).toBeTruthy();
      expect(question.choices?.length ?? 0).toBeLessThanOrEqual(6);
      expect(existsSync(`public${question.image!.src}`)).toBe(true);
      for (const action of answers[index])
        game = gameReducer(game, action, SUN_FLAGS_JOURNEY, context);
      expect(game.phase, question.id).toBe("feedback");
      expect(game.answers.at(-1)?.correct, question.id).toBe(true);
      game = gameReducer(game, { type: "next" }, SUN_FLAGS_JOURNEY, context);
    }
    expect(game.phase).toBe("finished");
    expect(journeyScore(game)).toBe(5);
  });
  it("rejects alternate ray counts, symbols, and mainland pins", () => {
    for (const [index, response] of [
      [0, { selectedIds: ["month:july"] }],
      [1, { text: "32" }],
      [2, { selectedIds: ["rays:feathers"] }],
      [3, { pin: { lat: 39.9, lng: 116.4 } }],
      [4, { selectedIds: ["dawn:equator"] }],
    ] as [number, Partial<Response>][])
      expect(
        isCorrect(SUN_FLAGS_JOURNEY.rounds[index], context, {
          ...initialGame,
          ...response,
        }),
      ).toBe(false);
    expect(SUN_FLAGS_JOURNEY.rounds[3].map).toMatchObject({
      borders: false,
      hover: false,
      revealOnAnswer: true,
    });
  });
  it("is publishable in Admin without changing existing dates in the automatic rotation", () => {
    expect(JOURNEYS).toContain(SUN_FLAGS_JOURNEY);
    expect(
      JOURNEY_INDEX.find((entry) => entry.id === SUN_FLAGS_JOURNEY.id)?.path,
    ).toBe("/journey/chasing-the-sun");
    expect(ACTIVE_JOURNEY_IDS).not.toContain(SUN_FLAGS_JOURNEY.id);
  });
});
