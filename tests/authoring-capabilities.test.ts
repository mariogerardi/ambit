import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MECHANICS } from "../src/game/mechanics";
import { MECHANIC_RECIPES, PRESENTATION_RECIPES } from "../src/game/recipes";
import { JOURNEYS } from "../src/game/journeys";
import {
  authoringCapabilities,
  recipeJourney,
} from "../src/game/authoringCapabilities";
import { reviewQuestionCopy } from "../src/game/authoringReview";
import { auditJourney } from "../src/game/journeyAudit";
import { createQuestionContext } from "../src/game/questionPreparation";
import {
  captureReview,
  restoreReview,
  reviewState,
} from "../src/app/journeyReview";
import { journeyPoints } from "../src/game/points";
import { compileQuestionScenes } from "../src/game/scenes";
import type { RegionFeature } from "../src/geography/types";
const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const recipes = [...MECHANIC_RECIPES, ...PRESENTATION_RECIPES];
const capabilities = authoringCapabilities(JOURNEYS, recipes, regions);

describe("live authoring evidence", () => {
  it("inherits the network return policy while preserving explicit endpoint choices", () => {
    const recipe = recipes.find((q) => q.id === "recipe:multilingual-network")!;
    expect(recipe.scenes?.reveal?.returnToSelection).toBeUndefined();
    expect(recipe.feedbackReturnToSelection).toBe(true);
    const inherited = { ...recipe, feedbackReturnToSelection: undefined };
    for (const [endpoint, expected] of [
      [{ returnToSelection: false }, false],
      [{ orbit: true }, undefined],
    ] as const) {
      const question = compileQuestionScenes({
        ...inherited,
        scenes: {
          ...recipe.scenes,
          reveal: { ...recipe.scenes?.reveal, ...endpoint },
        },
      });
      expect(question.feedbackReturnToSelection).toBe(expected);
      expect(question.rule).toEqual(recipe.rule);
    }
  });
  it("distinguishes experience policies and actual Journey completion within the same mode and rule", () => {
    const recipe = recipes.find((q) => q.id === "recipe:multilingual-network")!;
    const sandbox = recipeJourney(recipe);
    const [entry] = authoringCapabilities(
      [
        {
          ...sandbox,
          id: "different-endpoints",
          rounds: [{ ...recipe, feedbackReturnToSelection: false }],
          completion: { ...sandbox.completion!, orbit: true },
        },
      ],
      [recipe],
      regions,
    );
    expect(entry.experience.answer).toContain("accepted alternatives");
    expect(entry.experience.disclosure).toContain("hover names false");
    expect(entry.experience.playCamera).toContain("shared random continental");
    expect(entry.experience.revealCamera).toContain("actual selection");
    expect(entry.examples[0].policyDifferences).toEqual([
      "revealCamera",
      "completion",
    ]);
    expect(entry.examples[0].experience.completion).toContain(
      "then world rotation",
    );
  });
  it("covers the actual registry with auditable recipes and keeps internal modes distinct", () => {
    expect(new Set(recipes.map((q) => q.id)).size).toBe(recipes.length);
    for (const [mode, mechanic] of Object.entries(MECHANICS)) {
      const entries = capabilities.filter((entry) => entry.mode === mode);
      expect(entries.length, mode).toBeGreaterThan(0);
      for (const entry of entries) {
        expect(entry.evidence.errors, entry.id).toEqual([]);
        expect(entry.allowedRules).toEqual(mechanic.rules);
        expect(entry.evidence.stages).toContain("play");
        expect(entry.evidence.stages).toContain("reveal:correct");
        expect(entry.preview).toContain("?recipe=");
        if (!mechanic.visible)
          expect(entry.availability).toMatch(/product decision/);
      }
    }
  });
  it("reports broken recipes as requiring repair instead of advertising reuse", () => {
    const pin = recipes.find((q) => q.id === "recipe:pin")!;
    const [entry] = authoringCapabilities(
      [],
      [{ ...pin, source: { ...pin.source, url: "invalid" } }],
      regions,
    );
    expect(entry.availability).toBe("needs repair");
    expect(entry.evidence.errors).not.toEqual([]);
  });
  it.each(["pin", "map-multiple", "populated-country-order"])(
    "exercises %s through actual input, help, reveals, save restoration and completion",
    async (name) => {
      const question = recipes.find((q) => q.id === `recipe:${name}`)!;
      const journey = recipeJourney(question);
      const context = createQuestionContext(regions, [], journey);
      for (const stage of [
        "play",
        "hint",
        "assist",
        "correct",
        "missed",
        "completion",
        "completion-mixed",
      ] as const) {
        const game = await reviewState(journey, context, 0, stage, 17);
        expect(restoreReview(journey, captureReview(journey, game))).toEqual(
          game,
        );
        if (stage === "correct") expect(game.answers[0].correct).toBe(true);
        if (stage === "missed") expect(game.answers[0].correct).toBe(false);
        if (stage.startsWith("completion")) expect(game.phase).toBe("finished");
      }
      if (name !== "populated-country-order") {
        const game = await reviewState(journey, context, 0, "partial", 17);
        expect(journeyPoints(game)).toBe(name === "pin" ? 2 : 1);
        expect(restoreReview(journey, captureReview(journey, game))).toEqual(
          game,
        );
      } else
        await expect(
          reviewState(journey, context, 0, "partial"),
        ).rejects.toThrow(/No partial/);
    },
  );
  it("flags answer-only headings/reveals and repeated clues without turning editorial advice into an audit failure", () => {
    const pin = recipes.find((q) => q.id === "recipe:pin")!;
    const bad = {
      ...pin,
      correctFeedback: "Canberra.",
      explanation: "It was Canberra.",
    };
    const context = createQuestionContext(regions, [], recipeJourney(bad));
    expect(reviewQuestionCopy(bad, context).warnings.join(" ")).toMatch(
      /answer-heading.*answer-only-reveal/,
    );
    expect(auditJourney(recipeJourney(bad), regions).errors).toEqual([]);
    const repeated = {
      ...pin,
      leadIn:
        "Canberra lies inland between Sydney and Melbourne in southeastern Australia, surrounded by hills and open countryside.",
      explanation:
        "Canberra lies inland between Sydney and Melbourne in southeastern Australia, surrounded by hills and open countryside.",
    };
    expect(reviewQuestionCopy(repeated, context).warnings.join(" ")).toMatch(
      /repeated-clue/,
    );
    expect(reviewQuestionCopy(pin, context).warnings).not.toContainEqual(
      expect.stringContaining("answer-heading"),
    );
  });
});
