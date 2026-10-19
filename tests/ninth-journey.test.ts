import { regionBorderVisible } from "../src/globe/outlines";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { RegionFeature } from "../src/geography/types";
import { NINTH_JOURNEY, SHARED_NEIGHBOR_CLUES } from "../src/game/ninthJourney";
import { JOURNEYS, journeyPath } from "../src/game/journeys";
import { QUESTION_CATALOG } from "../src/game/questionCatalog";
import { createQuestionContext, isCorrect } from "../src/game/questions";
import { CAPITALS } from "../src/game/quizData";
import { gameReducer, initialGame } from "../src/game/state";
import { journeyWorld } from "../src/app/journeyWorld";
import { modeForPath } from "../src/app/modes";

const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const journey = NINTH_JOURNEY;
const context = createQuestionContext(world, [], journey);
const response = { selectedIds: [], text: "", ordered: [] };

describe("shared-neighbor Journey", () => {
  it("registers five pin questions for Admin, daily rotation and practice", () => {
    expect(JOURNEYS).toContain(journey);
    expect(journey.rounds).toHaveLength(5);
    expect(journeyPath(journey.id)).toBe("/journey/shared-neighbors");
    expect(modeForPath(journeyPath(journey.id))).toBe("practice");
    expect(journey.rounds.every((q) => QUESTION_CATALOG.includes(q))).toBe(
      true,
    );
    expect(journey.rounds[4].prompt).toContain("Chile and Colombia");
  });
  it.each(SHARED_NEIGHBOR_CLUES)(
    "verifies the unique shared neighbor for $id against the local border graph",
    (clue) => {
      const [a, b] = clue.countries;
      const shared = [...context.graph.get(a)!].filter((id) =>
        context.graph.get(b)!.has(id),
      );
      expect(shared).toEqual([clue.answer]);
    },
  );
  it("accepts interior pins, rejects clues/ocean, and reveals only after submitting", () => {
    journey.rounds.forEach((question, roundIndex) => {
      const clue = SHARED_NEIGHBOR_CLUES[roundIndex];
      const pin = CAPITALS.find((c) => c.countryId === clue.answer)!;
      const game = { ...initialGame, phase: "playing" as const, roundIndex };
      const before = journeyWorld(world, journey, game, context);
      expect(before.showBorders).toBe(false);
      expect(before.regionInteraction).toBe(false);
      expect(before.regionNames).toBe("none");
      expect(before.places).toEqual([]);
      expect(before.focus).toEqual(clue.focus);
      expect(before.borderRegionIds).toEqual(clue.countries);
      expect(before.states[clue.countries[0]]).toBe("hinted");
      expect(before.states[clue.countries[1]]).toBe("hinted");
      expect(
        Object.entries(before.states)
          .filter(([, state]) => state !== "surface")
          .map(([id]) => id)
          .sort(),
      ).toEqual([...clue.countries].sort());
      expect(
        world
          .filter((r) => regionBorderVisible(r, before))
          .map((r) => r.id)
          .sort(),
      ).toEqual([...clue.countries].sort());
      expect(isCorrect(question, context, { ...response, pin })).toBe(true);
      expect(
        isCorrect(question, context, {
          ...response,
          pin: { lat: 0, lng: -140 },
        }),
      ).toBe(false);
      for (const id of clue.countries) {
        const wrong = CAPITALS.find((c) => c.countryId === id)!;
        expect(isCorrect(question, context, { ...response, pin: wrong })).toBe(
          false,
        );
      }
      const placed = gameReducer(
        game,
        { type: "drop-pin", lat: pin.lat, lng: pin.lng },
        journey,
        context,
      );
      expect(placed.phase).toBe("playing");
      expect(journeyWorld(world, journey, placed, context).showBorders).toBe(
        false,
      );
      const submitted = gameReducer(
        placed,
        { type: "submit" },
        journey,
        context,
      );
      expect(submitted.answers[0].correct).toBe(true);
      const revealed = journeyWorld(world, journey, submitted, context);
      expect(revealed.showBorders).toBe(true);
      expect(revealed.states[clue.answer]).toBe("correct");
      expect(revealed.states[clue.countries[0]]).toBe("hinted");
      expect(revealed.states[clue.countries[1]]).toBe("hinted");
      expect(
        world
          .filter((r) => regionBorderVisible(r, revealed))
          .map((r) => r.id)
          .sort(),
      ).toEqual([...clue.countries].sort());
      expect(revealed.places[0].visualState).toBe("correct");
    });
  });
  it("accepts Russia's distant mainland and Kaliningrad as anywhere inside the country", () => {
    const question = journey.rounds[2];
    for (const pin of [
      { lat: 55, lng: 83 },
      { lat: 54.71, lng: 20.5 },
    ])
      expect(isCorrect(question, context, { ...response, pin })).toBe(true);
  });
});
