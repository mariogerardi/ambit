import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MECHANICS, mechanicFor } from "../src/game/mechanics";
import { compileQuestionScenes } from "../src/game/scenes";
import { auditJourney } from "../src/game/journeyAudit";
import { JOURNEYS } from "../src/game/journeys";
import { ELEVENTH_JOURNEY } from "../src/game/eleventhJourney";
import { SUN_FLAGS_JOURNEY } from "../src/game/sunFlagsJourney";
import { createQuestionContext } from "../src/game/questions";
import { defineQuestion } from "../src/game/questionBuilder";
import { COUNTRY_FACTS } from "../src/game/countryFacts";
import { ANSWER_TYPES } from "../src/game/questionTypes";
import { journeyWorld } from "../src/app/journeyWorld";
import { initialGame } from "../src/game/state";
import { MECHANIC_RECIPES } from "../src/game/recipes";
import { isCorrect } from "../src/game/questions";
import type { GameState } from "../src/game/state";
import type { RegionFeature } from "../src/geography/types";
const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];

describe("Journey engine authoring boundaries", () => {
  it("provides a complete, gradable recipe with help and reveal for every registered mode", () => {
    expect(MECHANIC_RECIPES.map((q) => q.mode).sort()).toEqual(
      Object.keys(MECHANICS).sort(),
    );
    const responses = {
      pin: { pin: { lat: -35.28346, lng: 149.12807 } },
      "city-single": { selectedIds: ["place:2172517"] },
      "city-multiple": {
        selectedIds: ["place:964137", "place:3369157", "place:1018725"],
      },
      "map-single": { selectedIds: ["wurl:CAN"] },
      "map-multiple": { selectedIds: ["wurl:CAN", "wurl:MEX"] },
      number: { text: "3" },
      text: { text: "Ottawa" },
      "typed-regions": { ordered: ["Canada", "Mexico"] },
      "ordered-countries": { ordered: ["Canada", "United States", "Mexico"] },
      "ordered-capitals": {
        ordered: ["Ottawa", "Washington, D.C.", "Mexico City"],
      },
      "choice-single": { selectedIds: ["canada"] },
      "choice-multiple": { selectedIds: ["ottawa", "canberra"] },
      "choice-order": { ordered: ["wurl:CAN", "wurl:USA", "wurl:MEX"] },
      "choice-match": {
        ordered: ["place:964137", "place:3369157", "place:1018725"],
      },
      "land-path": { selectedIds: ["wurl:CAN", "wurl:USA", "wurl:MEX"] },
    };
    const recipes = {
      id: "recipes",
      title: "Recipes",
      description: "Examples",
      rounds: MECHANIC_RECIPES,
    };
    const context = createQuestionContext(world, COUNTRY_FACTS, recipes);
    for (const question of MECHANIC_RECIPES) {
      expect(question.guidance?.hint).toBeTruthy();
      expect(question.guidance?.assist).toBeTruthy();
      expect(
        isCorrect(question, context, {
          ...initialGame,
          ...responses[question.mode],
        }),
      ).toBe(true);
      expect(
        auditJourney({ ...recipes, rounds: [question] }, world).errors,
      ).toEqual([]);
    }
    const ordered = MECHANIC_RECIPES.find(
      (q) => q.mode === "ordered-countries",
    )!;
    expect(
      isCorrect(ordered, context, {
        ...initialGame,
        ordered: ["Mexico", "United States", "Canada"],
      }),
    ).toBe(false);
    expect(
      isCorrect(ordered, context, {
        ...initialGame,
        ordered: ["Canada", "Canada", "Mexico"],
      }),
    ).toBe(false);
  });
  it("registers every authored mode and exposes only supported playground types", () => {
    for (const journey of JOURNEYS)
      for (const question of journey.rounds) {
        expect(question.scenes).toBeDefined();
        const definition = mechanicFor(question);
        expect(definition.rules).toContain(question.rule.type);
        expect(typeof definition.canSubmit).toBe("function");
        expect(ANSWER_TYPES[question.mode]).toBe(definition.label);
      }
    expect(Object.keys(ANSWER_TYPES).sort()).toEqual(
      Object.entries(MECHANICS)
        .filter(([, definition]) => definition.visible)
        .map(([mode]) => mode)
        .sort(),
    );
    expect(ANSWER_TYPES["land-path"]).toBeUndefined();
  });
  it("compiles scene overrides without mutating presets or changing legacy records", () => {
    const legacy = { ...ELEVENTH_JOURNEY.rounds[0], scenes: undefined };
    expect(compileQuestionScenes(legacy)).toBe(legacy);
    const before = JSON.stringify(legacy);
    const compiled = compileQuestionScenes({
      ...legacy,
      scenes: {
        play: { contextIds: [], places: [] },
        assist: { places: [] },
        reveal: { contextIds: [], answerIds: [], places: [], borders: false },
      },
    });
    expect(compiled.contextIds).toEqual([]);
    expect(compiled.feedbackHintIds).toEqual([]);
    expect(compiled.feedbackContextIds).toEqual([]);
    expect(compiled.guidance!.assist!.places).toEqual([]);
    expect(compiled.map!.feedbackBorders).toBe(false);
    expect(JSON.stringify(legacy)).toBe(before);
    const { focus: _focus, ...withoutFocus } = legacy;
    const authored = defineQuestion({
      ...withoutFocus,
      mode: "text",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",
      rule: { type: "capital-name", countryId: "wurl:TUR" },
      inputLabel: "Capital",
      scenes: { play: { focus: { lat: 39, lng: 34, altitude: 0.8 } } },
    });
    expect(authored.focus).toEqual({ lat: 39, lng: 34, altitude: 0.8 });
    expect(() =>
      compileQuestionScenes({
        ...legacy,
        guidance: undefined,
        scenes: { assist: { places: [] } },
      }),
    ).toThrow("authored assist copy");
  });
  it("preserves effective scenes for every current Journey through the scene compiler", () => {
    let base;
    for (const journey of JOURNEYS) {
      const flattened = {
        ...journey,
        rounds: journey.rounds.map((question) => ({
          ...question,
          scenes: undefined,
        })),
      };
      const context = createQuestionContext(
        world,
        COUNTRY_FACTS,
        journey,
        base,
      );
      base = context;
      const other = createQuestionContext(
        world,
        COUNTRY_FACTS,
        flattened,
        context,
      );
      for (const [roundIndex, question] of journey.rounds.entries())
        for (const stage of [
          "play",
          "hint",
          "assist",
          "reveal:correct",
          "reveal:miss",
        ] as const) {
          const game: GameState = {
            ...initialGame,
            roundIndex,
            phase: stage.startsWith("reveal") ? "feedback" : "playing",
            help:
              stage === "hint" || stage === "assist"
                ? { [question.id]: stage === "hint" ? "hinted" : "assisted" }
                : undefined,
            answers: stage.startsWith("reveal")
              ? [
                  {
                    ...initialGame,
                    roundId: question.id,
                    correct: stage === "reveal:correct",
                  },
                ]
              : [],
          };
          const a = journeyWorld(world, journey, game, context),
            b = journeyWorld(world, flattened, game, other);
          for (const key of [
            "focus",
            "places",
            "states",
            "showBorders",
            "borderRegionIds",
            "overlays",
            "physicalFeatures",
            "regionInteraction",
            "regionNames",
          ] as const)
            expect(a[key]).toEqual(b[key]);
        }
    }
  });
  it("audits local scenes, source metadata, assets and missing/duplicate disclosure", () => {
    const report = auditJourney(ELEVENTH_JOURNEY, world);
    expect(report.errors).toEqual([]);
    expect(
      report.questions[0].states
        .find((state) => state.stage === "assist")!
        .places.map((place) => place.marker),
    ).toEqual(["circle", "circle", "circle"]);
    const malformed = {
      ...ELEVENTH_JOURNEY,
      rounds: [
        {
          ...ELEVENTH_JOURNEY.rounds[0],
          source: { name: "", url: "bad", reviewedOn: "bad" },
          focus: { lat: 100, lng: 0 },
          places: [
            ELEVENTH_JOURNEY.rounds[2].places![0],
            ELEVENTH_JOURNEY.rounds[2].places![0],
          ],
        },
      ],
    };
    const errors = auditJourney(malformed, world).errors.join(" ");
    expect(errors).toContain("source metadata");
    expect(errors).toContain("Invalid camera");
    expect(errors).toContain("Duplicate visible places");
    expect(
      auditJourney(SUN_FLAGS_JOURNEY, world, () => false).errors.some((error) =>
        error.includes("Missing local asset"),
      ),
    ).toBe(true);
    const city = ELEVENTH_JOURNEY.rounds[3];
    const target = {
      ...ELEVENTH_JOURNEY.rounds[0].feedbackPlaces![0],
      id: "place:3469058",
    };
    const leaked = {
      ...ELEVENTH_JOURNEY,
      rounds: [{ ...city, places: [target] }],
    };
    // Candidate generation suppresses names by contract, even if a raw place carried one.
    expect(auditJourney(leaked, world).errors).toEqual([]);
  });
});
