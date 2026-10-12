import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { JOURNEYS } from "../src/game/journeys";
import {
  defineQuestion,
  definePresentation,
  validateQuestionContract,
  validateJourneyContracts,
} from "../src/game/questionBuilder";
import type {
  QuestionContract,
  QuestionPresentation,
} from "../src/game/questionBuilder";
import { createQuestionContext } from "../src/game/questions";
import { journeyWorld } from "../src/app/journeyWorld";
import { initialGame } from "../src/game/state";
import { ANDES_JOURNEY } from "../src/game/andesJourney";
import type { RegionFeature } from "../src/geography/types";

describe("safe question authoring contracts", () => {
  it("validates every current Journey", () => {
    for (const journey of JOURNEYS)
      expect(() => validateJourneyContracts(journey)).not.toThrow();
  });
  it("rejects invalid in-place revisions and unrelated legacy receipt labels", () => {
    expect(() =>
      validateJourneyContracts({ ...ANDES_JOURNEY, saveRevision: 0 }),
    ).toThrow("Invalid Journey save revision");
    expect(() =>
      validateJourneyContracts({
        ...ANDES_JOURNEY,
        saveRevision: 2,
        legacyRoundLabels: { unknown: "Old answer" },
      }),
    ).toThrow("Invalid legacy receipt labels");
  });
  it("rejects mismatched grading, inherited selection, stale choices and invalid cardinality", () => {
    const question = ANDES_JOURNEY.rounds[0];
    for (const change of [
      { mode: "pin" as const },
      { selection: { type: "members" as const } },
      { count: 2 },
      { commitment: "immediate" as const },
      {
        mode: "text" as const,
        rule: { type: "manual-text" as const, answers: ["Bogotá"] },
        inputLabel: "City",
      },
    ])
      expect(() =>
        validateQuestionContract({ ...question, ...change }),
      ).toThrow("Invalid question contract");
    expect(() =>
      validateJourneyContracts({
        ...ANDES_JOURNEY,
        rounds: [question, question],
      }),
    ).toThrow("Duplicate question ID");
  });
  it("cannot disable polygon answers by turning off hover styling", () => {
    const regions = JSON.parse(
      readFileSync("public/geography/world.v1.json", "utf8"),
    ) as RegionFeature[];
    const round = {
      ...ANDES_JOURNEY.rounds[2],
      map: { ...ANDES_JOURNEY.rounds[2].map!, hoverFeedback: false },
      disclosure: {
        ...ANDES_JOURNEY.rounds[2].disclosure,
        hoverNames: false,
        committedNames: false,
      },
    };
    const journey = { ...ANDES_JOURNEY, rounds: [round] };
    const context = createQuestionContext(regions, [], journey);
    const world = journeyWorld(
      regions,
      journey,
      { ...initialGame, phase: "playing" },
      context,
    );
    expect(world.regionInteraction).toBe(true);
    expect(world.selectDisabled).toBe(true);
    expect(world.regionNames).toBe("none");
  });
  it("keeps answer contracts out of shared presentation defaults at compile time", () => {
    const preset: QuestionPresentation = {
      // @ts-expect-error A presentation preset cannot carry another round's grading rule.
      rule: { type: "country-ids", ids: ["wurl:CAN"] },
    };
    // @ts-expect-error Pin grading cannot be inherited by a multiple-choice question.
    const badRule: QuestionContract = {
      mode: "choice-single",
      rule: { type: "pin-inside", ids: ["wurl:CAN"] },
      count: 1,
      selection: { type: "none" },
      commitment: "submit",
      choices: [],
    };
    // @ts-expect-error A typed question cannot carry map selection behavior.
    const badSelection: QuestionContract = {
      mode: "text",
      rule: { type: "manual-text", answers: ["x"] },
      count: 1,
      selection: { type: "members" },
      commitment: "submit",
      inputLabel: "Answer",
    };
    // @ts-expect-error Whole questions cannot hide their interaction contract in shared defaults.
    const inherited = () => definePresentation({ ...ANDES_JOURNEY.rounds[0] });
    expect(inherited).toThrow("Shared presentation cannot inherit");
    expect(preset).toBeDefined();
    expect(badRule).toBeDefined();
    expect(badSelection).toBeDefined();
    expect(defineQuestion).toBeDefined();
  });
});
