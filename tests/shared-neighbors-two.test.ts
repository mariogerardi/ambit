import { regionBorderVisible } from "../src/globe/outlines";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { RegionFeature } from "../src/geography/types";
import {
  SHARED_NEIGHBORS_TWO_JOURNEY,
  SHARED_NEIGHBOR_TWO_CLUES,
} from "../src/game/sharedNeighborsTwoJourney";
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
const journey = SHARED_NEIGHBORS_TWO_JOURNEY;
const context = createQuestionContext(world, [], journey);
const response = { selectedIds: [], text: "", ordered: [] };
const interiorPins: Record<string, { lat: number; lng: number }> = {
  "wurl:BRA": { lat: -10, lng: -55 },
  "wurl:ZMB": { lat: -14.5, lng: 28 },
  "wurl:SRB": { lat: 44, lng: 20.8 },
  "wurl:GIN": { lat: 10.5, lng: -10.5 },
  "wurl:THA": { lat: 16, lng: 101 },
};

describe("Shared Neighbors II", () => {
  it("registers five pin questions for Admin, daily rotation and practice", () => {
    expect(JOURNEYS).toContain(journey);
    expect(journey.rounds).toHaveLength(5);
    expect(journeyPath(journey.id)).toBe("/journey/shared-neighbors-two");
    expect(modeForPath(journeyPath(journey.id))).toBe("practice");
    expect(journey.rounds.every((q) => QUESTION_CATALOG.includes(q))).toBe(
      true,
    );
    expect(journey.rounds[4].prompt).toContain("Laos and Malaysia");
  });
  it.each(SHARED_NEIGHBOR_TWO_CLUES)(
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
      const clue = SHARED_NEIGHBOR_TWO_CLUES[roundIndex];
      const pin = interiorPins[clue.answer];
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
      ).toEqual([...clue.countries, clue.answer].sort());
      expect(revealed.places[0].visualState).toBe("correct");
    });
  });
  it("assists keep the answer footprint hidden and use reference cities outside it", () => {
    for (const [roundIndex, clue] of SHARED_NEIGHBOR_TWO_CLUES.entries()) {
      const question = journey.rounds[roundIndex];
      const game = { ...initialGame, phase: "playing" as const, roundIndex };
      const hinted = gameReducer(
        game,
        { type: "request-hint" },
        journey,
        context,
      );
      const assisted = gameReducer(
        hinted,
        { type: "request-assist" },
        journey,
        context,
      );
      const scene = journeyWorld(world, journey, assisted, context);
      expect(scene.showBorders).toBe(false);
      expect(scene.borderRegionIds).toEqual(clue.countries);
      expect(scene.states[clue.answer]).toBe("surface");
      expect(scene.places.length).toBeGreaterThan(0);
      expect(scene.places.every((p) => p.parentId !== clue.answer)).toBe(true);
      expect(
        isCorrect(question, context, {
          ...response,
          pin: interiorPins[clue.answer],
        }),
      ).toBe(true);
    }
  });
});
