import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { RegionFeature } from "../src/geography/types";
import type { Journey, Question } from "../src/game/questionContracts";
import {
  defineQuestion,
  definePresentation,
  validateQuestionContract,
} from "../src/game/questionBuilder";
import { createQuestionContext } from "../src/game/questionPreparation";
import { COUNTRY_FACTS, mapSource } from "../src/game/countryFacts";
import { initialGame, gameReducer } from "../src/game/state";
import { journeyWorld } from "../src/app/journeyWorld";
import {
  auditVisualExceptions,
  auditVisualScene,
} from "../src/game/journeyVisualRules";
import { JOURNEYS } from "../src/game/journeys";
import { regionBorderVisible } from "../src/globe/outlines";

const regions: RegionFeature[] = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
);
const base = {
  ...definePresentation({
    label: "Roles",
    topic: "role contract",
    instruction: "",
    failure: "feedback",
    source: mapSource,
    focus: { lat: 47, lng: 10, altitude: 1 },
    disclosure: {
      hoverNames: false,
      namedChoices: false,
      committedNames: false,
      previousVisits: false,
    },
    contextIds: ["wurl:AUT"],
    candidateRegionIds: ["wurl:FRA", "wurl:ITA"],
    map: { borders: true, hoverFeedback: false, muteOthers: true },
  }),
  title: "Roles",
  prompt: "Synthetic role contract",
  explanation: "Role matrix fixture.",
};
const questions: Question[] = [
  defineQuestion({
    ...base,
    id: "roles:map",
    mode: "map-single",
    commitment: "immediate",
    count: 1,
    selection: { type: "ids", ids: ["wurl:FRA", "wurl:ITA"] },
    rule: { type: "country-ids", ids: ["wurl:FRA"] },
  }),
  defineQuestion({
    ...base,
    id: "roles:choice",
    mode: "choice-single",
    commitment: "submit",
    count: 1,
    selection: { type: "none" },
    rule: { type: "choice-ids", ids: ["wurl:FRA"] },
    choices: [
      { id: "wurl:FRA", label: "France" },
      { id: "wurl:ITA", label: "Italy" },
    ],
  }),
  defineQuestion({
    ...base,
    id: "roles:typed",
    mode: "typed-regions",
    commitment: "submit",
    count: 1,
    selection: { type: "none" },
    inputLabel: "Country",
    rule: { type: "region-ids", ids: ["wurl:FRA"] },
  }),
  defineQuestion({
    ...base,
    id: "roles:number",
    mode: "number",
    commitment: "submit",
    count: 1,
    selection: { type: "none" },
    inputLabel: "Count",
    rule: { type: "manual-number", value: 2 },
  }),
  defineQuestion({
    ...base,
    id: "roles:pin",
    mode: "pin",
    commitment: "submit",
    count: 1,
    selection: { type: "none" },
    rule: { type: "pin-distance", targetId: "place:2172517", radiusKm: 150 },
  }),
];
function setup(q: Question) {
  const journey: Journey = {
    id: "roles",
    title: "Roles",
    description: "Test",
    rounds: [q],
  };
  const context = createQuestionContext(regions, COUNTRY_FACTS, journey);
  const game = { ...initialGame, phase: "playing" as const };
  return { context, game, view: journeyWorld(regions, journey, game, context) };
}

describe("shared role rules independently of authored questions", () => {
  it.each([questions[1], questions[2]])(
    "$mode keeps supplied area clues blue until a named answer is submitted",
    (baseQuestion) => {
      const q: Question = {
        ...baseQuestion,
        map: {
          ...baseQuestion.map!,
          candidateRole: "clue",
          selectionFeedback: "after-submit",
        },
      };
      const { context, game, view } = setup(q);
      const journey: Journey = {
        id: "clues",
        title: "Clues",
        description: "",
        rounds: [q],
      };
      const pending = gameReducer(
        game,
        q.mode === "typed-regions"
          ? { type: "ordered", index: 0, value: "France" }
          : { type: "select", id: "wurl:FRA" },
        journey,
        context,
      );
      const pendingView = journeyWorld(regions, journey, pending, context);
      expect(view.states).toMatchObject({
        "wurl:FRA": "clue",
        "wurl:ITA": "clue",
        "wurl:AUT": "hinted",
      });
      expect(pendingView.states).toEqual(view.states);
      expect(pendingView.selectableRegionIds).toEqual([]);
      expect(auditVisualScene(q, context, pending, pendingView)).toEqual([]);
      expect(
        auditVisualScene(q, context, pending, {
          ...pendingView,
          states: { ...pendingView.states, "wurl:FRA": "selectable" },
        }),
      ).toContain(`[clue-role] Naming clue changed role: ${q.id} / wurl:FRA`);
      const submitted = gameReducer(
        pending,
        { type: "submit" },
        journey,
        context,
      );
      expect(
        journeyWorld(regions, journey, submitted, context).states["wurl:FRA"],
      ).toBe("correct");
      expect(() =>
        validateQuestionContract({ ...questions[0], map: q.map }),
      ).toThrow("noninteractive geography");
    },
  );
  it.each(questions)(
    "$mode uses the same reference, candidate and background roles",
    (baseQuestion) => {
      const noninteractive = baseQuestion.selection.type === "none";
      const q: Question = noninteractive
        ? {
            ...baseQuestion,
            map: {
              ...baseQuestion.map!,
              candidateRole: "clue",
              selectionFeedback: "after-submit",
            },
          }
        : baseQuestion;
      const { context, game, view } = setup(q);
      // Expectations describe the design roles, rather than deriving them from renderer output.
      expect(view.states).toMatchObject({
        "wurl:AUT": "hinted",
        "wurl:FRA": noninteractive ? "clue" : "selectable",
        "wurl:ITA": noninteractive ? "clue" : "selectable",
        "wurl:DEU": "disabled",
      });
      expect(view.selectableRegionIds).not.toContain("wurl:AUT");
      expect(auditVisualScene(q, context, game, view)).toEqual([]);
      expect(
        auditVisualScene(q, context, game, {
          ...view,
          states: { ...view.states, "wurl:DEU": "surface" },
        }),
      ).toContain(
        `[background-role] Undeclared open search surface: ${q.id} / wurl:DEU`,
      );
      expect(
        auditVisualScene(q, context, game, {
          ...view,
          borderRegionIds: ["wurl:FRA", "wurl:ITA"],
        }),
      ).toContain(
        `[reference-role] Reference outline missing: ${q.id} / wurl:AUT`,
      );
      expect(
        auditVisualScene(q, context, game, {
          ...view,
          borderRegionIds: ["wurl:AUT", "wurl:FRA"],
        }),
      ).toContain(
        `[area-boundaries] Boundary missing without an authored exception: ${q.id} / wurl:ITA`,
      );
    },
  );
  it("detects misleading gold areas even when the author omitted a clue role", () => {
    const q = questions[1];
    const { context, game, view } = setup(q);
    expect(auditVisualScene(q, context, game, view)).toContain(
      `[clue-role] Noninteractive area uses selection styling: ${q.id} / wurl:FRA`,
    );
  });
  it("allows a deliberate borderless search without waiving reference boundaries or eligibility", () => {
    const q: Question = {
      ...questions[4],
      map: { ...questions[4].map!, background: "open-search", borders: false },
      candidateRegionIds: [],
      visualExceptions: {
        "open-search-background":
          "Locate an undisclosed target across the search field.",
        "hidden-boundaries": "Recall geography from coastlines.",
      },
    };
    const { context, game, view } = setup(q);
    expect(view.states["wurl:DEU"]).toBe("surface");
    expect(view.states["wurl:AUT"]).toBe("hinted");
    expect(auditVisualExceptions(q).errors).toEqual([]);
    expect(auditVisualScene(q, context, game, view)).toEqual([]);
    expect(
      auditVisualScene(q, context, game, { ...view, borderRegionIds: [] }),
    ).toContain(
      `[reference-role] Reference outline missing: ${q.id} / wurl:AUT`,
    );
    expect(
      auditVisualScene(q, context, game, {
        ...view,
        selectableRegionIds: ["wurl:AUT"],
      }),
    ).toContain(`[reference-role] Reference changed role: ${q.id} / wurl:AUT`);
  });
  it("requires reasons and rejects stale exceptions when an authored scene changes", () => {
    const q = JOURNEYS.find((j) => j.id === "shared-neighbors-v1")!.rounds[0];
    expect(auditVisualExceptions(q).accepted).toHaveLength(2);
    expect(
      auditVisualExceptions({ ...q, visualExceptions: {} }).errors,
    ).toContain(
      `[background-role] Authored reason required: ${q.id} / open-search-background`,
    );
    expect(
      auditVisualExceptions({
        ...q,
        visualExceptions: { "hidden-boundaries": " " },
      }).errors.join(" "),
    ).toContain("Invalid or stale");
    expect(
      auditVisualExceptions({
        ...q,
        map: { ...q.map!, background: "muted", borders: true },
      }).errors,
    ).toHaveLength(2);
  });
  it("restores an answer border even when play only outlined reference countries", () => {
    const journey = JOURNEYS.find((j) => j.id === "shared-neighbors-v1")!;
    const context = createQuestionContext(regions, COUNTRY_FACTS, journey);
    const q = journey.rounds[0];
    if (q.rule.type !== "pin-inside")
      throw Error("Expected pin-inside fixture");
    const view = journeyWorld(
      regions,
      journey,
      {
        ...initialGame,
        phase: "feedback",
        answers: [{ ...initialGame, roundId: q.id, correct: false }],
      },
      context,
    );
    const target = view.regions.find(
      (r) => r.id === (q.rule.type === "pin-inside" ? q.rule.ids[0] : ""),
    )!;
    expect(view.states[target.id]).toBe("answer");
    expect(regionBorderVisible(target, view)).toBe(true);
  });
});
