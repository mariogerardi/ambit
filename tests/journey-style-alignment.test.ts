import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { JOURNEYS } from "../src/game/journeys";
import { COUNTRY_FACTS } from "../src/game/countryFacts";
import {
  createQuestionContext,
  solutionIds,
} from "../src/game/questionPreparation";
import { gameReducer, initialGame } from "../src/game/state";
import { journeyWorld } from "../src/app/journeyWorld";
import type { GameState } from "../src/game/state";
import type { RegionFeature } from "../src/geography/types";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
describe("shared Journey style contracts", () => {
  for (const journey of JOURNEYS) {
    const context = createQuestionContext(regions, COUNTRY_FACTS, journey);
    for (const [roundIndex, question] of journey.rounds.entries()) {
      const start: GameState = { ...initialGame, phase: "playing", roundIndex };
      const view = (game: GameState) =>
        journeyWorld(regions, journey, game, context);
      if (question.mode === "map-multiple")
        it(`${question.id} confirms its complete multi-country selection`, () => {
          expect(question.commitment).toBe("submit");
        });
      if (["map-single", "merged-region-single"].includes(question.mode))
        it(`${question.id} commits one country tap and safely resumes old drafts`, () => {
          expect(question.commitment).toBe("immediate");
          const id = solutionIds(question, context)[0];
          const committed = gameReducer(
            start,
            { type: "select", id },
            journey,
            context,
          );
          expect(committed.phase).toBe("feedback");
          expect(committed.answers.at(-1)?.correct).toBe(true);
          const legacy = { ...start, selectedIds: [id] };
          expect(view(legacy).states[id]).toBe("selected");
          expect(legacy.answers).toEqual([]);
          expect(
            gameReducer(legacy, { type: "select", id }, journey, context)
              .answers,
          ).toEqual(committed.answers);
        });
      if (question.mode === "pin")
        it(`${question.id} exposes an even pin surface without disclosing the answer`, () => {
          expect(question.commitment).toBe("submit");
          if (question.rule.type === "pin-distance") {
            expect(question.rule.tiers).toHaveLength(3);
            expect(question.rule.tiers!.at(-1)?.radiusKm).toBe(
              question.rule.radiusKm,
            );
          }
          const scene = view(start);
          expect(scene.selectableRegionIds).toEqual([]);
          expect(Object.values(scene.states)).not.toContain("selectable");
          const ids =
            question.rule.type === "pin-inside" ? question.rule.ids : [];
          for (const id of ids) expect(scene.states[id]).toBe("surface");
          expect(scene.states["wurl:AUS"]).not.toBe("disabled");
        });
    }
    it(`${journey.id} consistently mutes all unvisited recap land`, () => {
      const answers = journey.rounds.map((question) => ({
        ...initialGame,
        roundId: question.id,
        correct: true,
        selectedIds: solutionIds(question, context),
      }));
      const scene = journeyWorld(
        regions,
        journey,
        { ...initialGame, phase: "finished", answers },
        context,
      );
      expect(
        scene.regions.every((region) =>
          ["visited", "incorrect", "disabled"].includes(
            scene.states[region.id],
          ),
        ),
      ).toBe(true);
    });
  }
});
