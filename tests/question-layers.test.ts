import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import type {
  CountryFact,
  Journey,
  Response,
} from "../src/game/questionContracts";
import {
  createQuestionContext,
  solutionIds,
} from "../src/game/questionPreparation";
import { canSubmit, isCorrect } from "../src/game/questionEvaluation";
import type { RegionFeature } from "../src/geography/types";
import { JOURNEY } from "./fixtures/engine/journey";
import { EIGHTH_JOURNEY } from "./fixtures/engine/eighthJourney";
import { MECHANIC_RECIPES } from "../src/game/recipes";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const response: Response = { selectedIds: [], ordered: [], text: "" };

it("rejects raw invalid contracts during preparation before geography or grading", () => {
  const pin = MECHANIC_RECIPES.find((q) => q.mode === "pin")!;
  for (const patch of [
    { count: 2 },
    { commitment: "immediate" as const },
    { selection: { type: "members" as const } },
    { rule: { type: "manual-number" as const, value: 1 } },
  ])
    expect(() =>
      createQuestionContext(regions, [], {
        ...JOURNEY,
        rounds: [{ ...pin, ...patch }],
      }),
    ).toThrow("Invalid question contract");
});

it("reuses canonical topology without leaking prepared answers between contexts", () => {
  const question = {
    ...JOURNEY.rounds[0],
    rule: { type: "country-fact" as const, field: "fixture", value: "match" },
  };
  const journey: Journey = { ...JOURNEY, rounds: [question] };
  const fact = (countryId: string): CountryFact => ({
    countryId,
    field: "fixture",
    value: "match",
    source: question.source,
  });
  const first = createQuestionContext(regions, [fact("wurl:NAM")], journey);
  const second = createQuestionContext(
    regions,
    [fact("wurl:BWA")],
    journey,
    first,
  );
  expect(second.graph).toBe(first.graph);
  expect(solutionIds(question, first)).toEqual(["wurl:NAM"]);
  expect(solutionIds(question, second)).toEqual(["wurl:BWA"]);
  const prepared = first.solutions.get(question);
  const pick = { ...response, selectedIds: ["wurl:NAM"] };
  expect(canSubmit(question, first, pick)).toBe(true);
  expect(isCorrect(question, first, pick)).toBe(true);
  expect(isCorrect(question, second, pick)).toBe(false);
  expect(first.solutions.get(question)).toBe(prepared);
  expect(solutionIds(question, first)).toEqual(["wurl:NAM"]);
});

it("grades pin containment against prepared canonical geometry even when its render footprint differs", () => {
  const question = {
    ...EIGHTH_JOURNEY.rounds[2],
    importedRegions: EIGHTH_JOURNEY.rounds[2].importedRegions!.map((r) => ({
      ...r,
      displayGeometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      },
    })),
  };
  const journey = { ...EIGHTH_JOURNEY, rounds: [question] };
  const context = createQuestionContext(regions, [], journey);
  const inside = { ...response, pin: { lat: 34.8, lng: -105 } };
  expect(canSubmit(question, context, inside)).toBe(true);
  expect(isCorrect(question, context, inside)).toBe(true);
  expect(
    isCorrect(question, context, { ...response, pin: { lat: 0.5, lng: 0.5 } }),
  ).toBe(false);
  expect(
    isCorrect(question, context, { ...response, pin: { lat: NaN, lng: 0 } }),
  ).toBe(false);
});
