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
      if (question.mode === "map-single")
        it(`${question.id} keeps a country pick editable and resumes a pending selection without grading it`, () => {
          expect(question.commitment).toBe("submit");
          const id = solutionIds(question, context)[0];
          const pending = gameReducer(
            start,
            { type: "select", id },
            journey,
            context,
          );
          expect(pending.phase).toBe("playing");
          expect(pending.answers).toEqual([]);
          expect(view(pending).states[id]).toBe("selected");
          const removed = gameReducer(
            pending,
            { type: "select", id },
            journey,
            context,
          );
          expect(removed.selectedIds).toEqual([]);
          const resumed = { ...start, selectedIds: [id] };
          expect(resumed.answers).toEqual([]);
          const committed = gameReducer(
            resumed,
            { type: "submit" },
            journey,
            context,
          );
          expect(committed.phase).toBe("feedback");
          expect(committed.answers.at(-1)?.correct).toBe(true);
        });
      if (question.mode === "merged-region-single")
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
        it(`${question.id} preserves authored search scope without disclosing the pin answer`, () => {
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
          for (const id of ids)
            expect([
              "selected",
              "correct",
              "answer",
              "incorrect",
              "hinted",
            ]).not.toContain(scene.states[id]);
          const background = regions.find(
            (r) =>
              !(question.contextIds ?? []).includes(r.id) &&
              !(question.candidateRegionIds ?? []).includes(r.id),
          )!;
          expect(scene.states[background.id]).toBe(
            question.map?.background === "open-search"
              ? "surface"
              : question.map?.neutralRegions
                ? "default"
                : "disabled",
          );
        });
    }
    it(`${journey.id} mutes unvisited recap land while preserving supplied context`, () => {
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
          (journey.completion?.contextIds?.includes(region.id)
            ? ["hinted", "incorrect"]
            : ["visited", "incorrect", "disabled"]
          ).includes(scene.states[region.id]),
        ),
      ).toBe(true);
    });
  }
});
