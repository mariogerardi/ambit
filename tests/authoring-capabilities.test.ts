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
  reviewOutcomes,
} from "../src/app/journeyReview";
import { journeyPoints } from "../src/game/points";
import { compileQuestionScenes } from "../src/game/scenes";
import { gameReducer } from "../src/game/state";
import { journeyWorld } from "../src/app/journeyWorld";
import { GLOBE_SYMBOLS } from "../src/globe/symbols";
import type { RegionFeature } from "../src/geography/types";
const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const recipes = [...MECHANIC_RECIPES, ...PRESENTATION_RECIPES];
const capabilities = authoringCapabilities(JOURNEYS, recipes, regions);

describe("live authoring evidence", () => {
  it("keeps plain city candidates anonymous until commitment and retains canonical results in completion", async () => {
    const question = recipes.find(
      (q) => q.id === "recipe:anonymous-city-selection",
    )!;
    const journey = recipeJourney(question);
    const context = createQuestionContext(regions, [], journey);
    const view = (game: Awaited<ReturnType<typeof reviewState>>) =>
      journeyWorld(regions, journey, game, context);
    const play = await reviewState(journey, context, 0, "play", 17);
    const pending = gameReducer(
      play,
      { type: "select", id: "place:2147714" },
      journey,
      context,
    );
    for (const game of [
      play,
      pending,
      await reviewState(journey, context, 0, "hint", 17),
      await reviewState(journey, context, 0, "assist", 17),
    ]) {
      const places = view(game).places;
      expect(places.length).toBeGreaterThanOrEqual(2);
      expect(
        places.every((p) => !p.name && !p.hoverName && p.labelHidden),
      ).toBe(true);
      expect(places.every((p) => p.markerBadge === undefined)).toBe(true);
      expect(new Set(places.map((p) => p.kind))).toEqual(new Set(["city"]));
      expect(new Set(places.map((p) => p.markerSize))).toEqual(
        new Set([GLOBE_SYMBOLS.candidate]),
      );
    }
    expect(
      view(await reviewState(journey, context, 0, "assist", 17)).places.map(
        (p) => p.id,
      ),
    ).toEqual(["place:2172517", "place:2147714"]);
    const missed = gameReducer(pending, { type: "submit" }, journey, context);
    const correct = await reviewState(journey, context, 0, "correct", 17);
    for (const game of [correct, missed]) {
      const places = view(game).places;
      expect(places.map((p) => p.name)).toEqual([
        "Canberra",
        "Sydney",
        "Melbourne",
      ]);
      expect(
        places.every((p) => !p.labelHidden && p.markerBadge === undefined),
      ).toBe(true);
      const finished = gameReducer(game, { type: "next" }, journey, context);
      expect(finished.phase).toBe("finished");
      const recap = view(finished);
      expect(new Set(recap.places.map((p) => p.id)).size).toBe(
        recap.places.length,
      );
      expect(
        recap.places.find((p) => p.id === "place:2172517")?.visualState,
      ).toBe("visited");
      if (!game.answers[0].correct)
        expect(
          recap.places.find((p) => p.id === "place:2147714")?.visualState,
        ).toBe("incorrect");
      expect(recap.states["wurl:AUS"]).toBe("hinted");
    }
  });
  it("rejects deprecated matching for new Journeys while keeping compatibility evidence", () => {
    const matching = recipes.find((q) => q.id === "recipe:choice-match")!;
    const entry = capabilities.find((item) => item.id === matching.id)!;
    expect(entry.availability).toBe("deprecated: do not use for new Journeys");
    expect(entry.deprecation?.replacement).toBe("city-multiple");
    expect(
      auditJourney(recipeJourney(matching), regions).errors.join(" "),
    ).toContain("Deprecated mechanic choice-match");
    expect(entry.evidence.errors).toEqual([]);
    expect(
      JOURNEYS.flatMap((journey) => journey.rounds).some(
        (q) => q.mode === "choice-match",
      ),
    ).toBe(false);
  });
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
        if (mechanic.deprecated)
          expect(entry.availability).toMatch(/deprecated: do not use/);
        else if (!mechanic.visible)
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
        if (
          stage === "missed" &&
          !reviewOutcomes(question).some((outcome) => outcome.stage === stage)
        ) {
          await expect(
            reviewState(journey, context, 0, stage, 17),
          ).rejects.toThrow(/fully missed example is unavailable/);
          continue;
        }
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
        ).rejects.toThrow(/outcome is unavailable/);
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
