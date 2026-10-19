import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { JOURNEYS } from "../src/game/journeys";
import {
  createQuestionContext,
  canSelect,
  solutionIds,
} from "../src/game/questionPreparation";
import { COUNTRY_FACTS } from "../src/game/countryFacts";
import { initialGame, gameReducer } from "../src/game/state";
import { journeyWorld } from "../src/app/journeyWorld";
import { validateQuestionContract } from "../src/game/questionBuilder";
import type { GameState, Action } from "../src/game/state";
import type { RegionFeature } from "../src/geography/types";
import { regionBorderVisible } from "../src/globe/outlines";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const question = (id: string) => {
  const journey = JOURNEYS.find((journey) =>
    journey.rounds.some((q) => q.id === id),
  )!;
  const roundIndex = journey.rounds.findIndex((q) => q.id === id);
  const q = journey.rounds[roundIndex];
  const context = createQuestionContext(regions, COUNTRY_FACTS, journey);
  const start: GameState = { ...initialGame, phase: "playing", roundIndex };
  const reduce = (...actions: Action[]) =>
    actions.reduce(
      (game, action) => gameReducer(game, action, journey, context),
      start,
    );
  const scene = (game = start) => journeyWorld(regions, journey, game, context);
  return { journey, q, context, start, reduce, scene };
};

describe("Journey visual grammar", () => {
  it("shows country-selection borders without making references eligible", () => {
    const { scene, q, context } = question("exceptions-bolivia-coast");
    expect(canSelect(q, context, "wurl:BOL")).toBe(false);
    const view = scene();
    for (const id of ["wurl:CHL", "wurl:PER", "wurl:BOL", "wurl:BRA"])
      expect(regionBorderVisible(context.targets.get(id)!, view)).toBe(true);
  });
  it("uses the same open search surface for both flag recall questions", () => {
    for (const id of ["canada-maple-flag-v1", "pacific-rising-sun"]) {
      const { scene } = question(id);
      expect(scene().states["wurl:JPN"]).toBe("surface");
      expect(scene().states["wurl:CAN"]).toBe("surface");
    }
  });
  it("keeps a reference inspectable but ineligible, including old pending selections", () => {
    const { q, context, start, reduce, scene } = question(
      "exceptions-bolivia-coast",
    );
    expect(canSelect(q, context, "wurl:BOL")).toBe(false);
    expect(scene().selectableRegionIds).not.toContain("wurl:BOL");
    expect(reduce({ type: "select", id: "wurl:BOL" })).toEqual(start);
    expect(
      scene({ ...start, selectedIds: ["wurl:BOL"] }).states["wurl:BOL"],
    ).toBe("hinted");
  });
  it("shows typed candidate areas separately from references without adding globe input", () => {
    const { q, scene } = question("canada-three-territories-v2");
    expect(q.candidateRegionIds).toBeDefined();
    expect(q.contextIds ?? []).toEqual([]);
    for (const id of q.candidateRegionIds!)
      expect(scene().states[id]).toBe("selectable");
    expect(scene().selectableRegionIds).toEqual([]);
    expect(() =>
      validateQuestionContract({
        ...q,
        scenes: undefined,
        contextIds: [q.candidateRegionIds![0]],
      }),
    ).toThrow("distinct from reference");
  });
  it("uses names and area fills for Samoa and American Samoa, without city dots", () => {
    const { scene } = question("same-hour-q4");
    expect(scene().states["wurl:WSM"]).toBe("hinted");
    expect(scene().states["wurl:ASM"]).toBe("hinted");
    expect(
      scene()
        .places.filter((p) => /^(Samoa|American Samoa)$/.test(p.name))
        .every((p) => p.markerHidden),
    ).toBe(true);
  });
  it("retains matching slot identity after grading", () => {
    const { q, context, scene, start } = question(
      "unexpected-south-africa-capitals",
    );
    const ordered = solutionIds(q, context);
    const pending = scene({ ...start, ordered }).places;
    const feedback = scene({
      ...start,
      phase: "feedback",
      ordered,
      answers: [{ ...initialGame, roundId: q.id, correct: true, ordered }],
    }).places;
    for (const id of ordered) {
      expect(feedback.find((p) => p.id === id)?.markerBadge).toBe(
        pending.find((p) => p.id === id)?.markerBadge,
      );
      expect(feedback.find((p) => p.id === id)?.visualState).toBe("correct");
    }
  });
  it("shares one status symbol across a clue fragment and its owner", () => {
    const { reduce, scene } = question("island-owner-bioko");
    const result = scene(reduce({ type: "select", id: "wurl:GNQ" }));
    expect(result.states["clue-part:wurl:GNQ"]).toBe("correct");
    expect(result.states["wurl:GNQ"]).toBe("correct");
    expect(
      result.places.filter((p) => p.markerRole === "annotation"),
    ).toHaveLength(1);
    expect(
      result.places.find((p) => p.markerRole === "annotation")
        ?.annotationRadius,
    ).toBeGreaterThan(0);
  });
  it("explains a crossing count with areas and text rather than invented travel or graded area symbols", () => {
    const { reduce, scene } = question("california-missouri-crossings-v2");
    const result = scene(
      reduce({ type: "text", value: "4" }, { type: "submit" }),
    );
    expect(result.routes).toEqual([]);
    expect(result.places.filter((p) => p.markerRole === "annotation")).toEqual(
      [],
    );
    expect(result.states["wurl:USA-NM"]).toBe("hinted");
  });
  it("promotes containing geography as reference when a city is revealed and retains the city in a generic recap", () => {
    const { reduce, scene } = question("canada-ottawa-v1");
    const answered = reduce(
      { type: "text", value: "Ottawa" },
      { type: "submit" },
    );
    expect(scene(answered).states["wurl:CAN"]).toBe("hinted");
    const recap = scene({ ...answered, phase: "finished" });
    expect(recap.places.find((p) => p.name === "Ottawa")).toMatchObject({
      visualState: "visited",
      kind: "city",
      markerSize: 24,
    });
  });
  it("uses explanatory locations and water labels without pretending they were submitted point answers", () => {
    const reason = question("andes-chimborazo-v2");
    const mountain = reason
      .scene(
        reason.reduce(
          { type: "select", id: "earth:equatorial-bulge" },
          { type: "submit" },
        ),
      )
      .places.find((p) => p.name === "Chimborazo");
    expect(mountain).toMatchObject({
      displayRole: "explanation",
      visualState: "hinted",
      answerTarget: false,
    });
    const ocean = question("canada-arctic-shore-v1");
    expect(
      ocean
        .scene(
          ocean.reduce(
            { type: "select", id: "ocean:arctic" },
            { type: "submit" },
          ),
        )
        .places.find((p) => p.name === "Arctic Ocean"),
    ).toMatchObject({ markerHidden: true, displayRole: "explanation" });
  });
});
