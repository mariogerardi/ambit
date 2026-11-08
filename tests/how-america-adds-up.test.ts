import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HOW_AMERICA_ADDS_UP_JOURNEY as journey } from "../src/game/howAmericaAddsUpJourney";
import { createQuestionContext } from "../src/game/questionPreparation";
import { isCorrect } from "../src/game/questionEvaluation";
import { questionVisualStates } from "../src/game/presentation";
import {
  evaluateConstruction,
  validConstructionResult,
} from "../src/game/construction";
import {
  editConstruction,
  undoConstruction,
} from "../src/game/constructionEditing";
import { constructionScene } from "../src/game/constructionScene";
import { ConstructionReview } from "../src/game/ConstructionAnswer";
import { EstimateReview } from "../src/game/EstimateReview";
import { EstimateSlider } from "../src/game/EstimateSlider";
import { initialGame } from "../src/game/state";
import { submittedPoints } from "../src/game/points";
import type { Construction } from "../src/game/constructionTypes";
import type { RegionFeature } from "../src/geography/types";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(regions, [], journey);
const response = { ...initialGame, selectedIds: [], text: "", ordered: [] };
const brush = (radiusKm: number, erase = false): Construction => ({
  version: 1,
  kind: "brush",
  strokes: [{ points: [{ lat: 40.7, lng: -74 }], radiusKm, erase }],
});

describe("How America Adds Up", () => {
  it("uses concise population-estimate labels and a rounded Census estimate", () => {
    const q = journey.rounds[0];
    if (q.rule.type !== "numeric-range") throw Error();
    const review = renderToStaticMarkup(
      createElement(EstimateReview, {
        question: q,
        response: { ...response, text: "342" },
      }),
    );
    expect(review).toContain("Census estimate: 341.8 million people");
    expect(review).not.toContain("pin-accuracy-bands");
    const slider = renderToStaticMarkup(
      createElement(EstimateSlider, {
        rule: q.rule,
        value: "342",
        onChange: () => {},
      }),
    );
    expect(slider).toContain("200M");
    expect(slider).toContain("450M");
  });
  it("accepts New York as the other island state and rejects other states", () => {
    const q = journey.rounds[1];
    expect(q.rule).toMatchObject({ type: "region-ids", ids: ["wurl:USA-NY"] });
    expect(
      isCorrect(q, context, { ...response, selectedIds: ["wurl:USA-NY"] }),
    ).toBe(true);
    for (const id of ["wurl:USA-HI", "wurl:USA-CA", "wurl:USA-FL"])
      expect(isCorrect(q, context, { ...response, selectedIds: [id] })).toBe(
        false,
      );
  });
  it("makes every state selectable in both state-picking questions", () => {
    for (const index of [1, 2]) {
      const q = journey.rounds[index];
      const states = questionVisualStates(q, context, {
        ...initialGame,
        phase: "playing",
        roundIndex: index,
      });
      expect(q.map?.candidates).toBe("highlighted");
      // Q2 (island-state) excludes Hawaii from the selectable pool; it shows as reference.
      // Q3 (sparse) has all 50 states selectable.
      const expectedSelectable = index === 1 ? 49 : 50;
      expect(
        Object.values(states).filter((state) => state === "selectable"),
      ).toHaveLength(expectedSelectable);
      if (index === 1) expect(states["wurl:USA-HI"]).toBe("hinted");
    }
  });
  it("accepts all five sparse states and rejects DC and other states", () => {
    const q = journey.rounds[2];
    for (const id of ["WY", "VT", "AK", "ND", "SD"])
      expect(
        isCorrect(q, context, { ...response, selectedIds: [`wurl:USA-${id}`] }),
      ).toBe(true);
    for (const id of ["DC", "DE", "RI", "MT"])
      expect(
        isCorrect(q, context, { ...response, selectedIds: [`wurl:USA-${id}`] }),
      ).toBe(false);
  });
  it("sums painted population once, honors erase/undo, and preserves measured results", () => {
    const q = journey.rounds[3];
    const results = [310, 250, 140, 60].map(
      (radius) =>
        evaluateConstruction(q, { ...response, construction: brush(radius) })!,
    );
    expect(results.map((x) => x.tier)).toEqual([0, 1, 2, null]);
    expect(results[0].metrics[0].value).toBeCloseTo(50087373.26441, 1);
    expect(results.every(validConstructionResult)).toBe(true);
    expect(
      submittedPoints(
        q,
        { ...response, construction: brush(310) },
        true,
        "assisted",
      ),
    ).toBe(1);
    const initial = brush(310);
    if (initial.kind !== "brush") throw Error();
    const doubled: Construction = {
      ...initial,
      strokes: [...initial.strokes, ...initial.strokes],
    };
    expect(
      evaluateConstruction(q, { ...response, construction: doubled })
        ?.metrics[0].value,
    ).toBe(results[0].metrics[0].value);
    const erased: Construction = {
      ...doubled,
      strokes: [...doubled.strokes, { ...initial.strokes[0], erase: true }],
    };
    expect(
      evaluateConstruction(q, { ...response, construction: erased })?.metrics[0]
        .value,
    ).toBe(0);
    expect(undoConstruction(erased)).toEqual(doubled);
    const outside = editConstruction(
      q,
      undefined,
      { lat: 60, lng: -150 },
      true,
    );
    expect(outside).toBeUndefined();
    const overlays = constructionScene(
      q,
      { ...response, construction: brush(260) },
      true,
    ).overlays;
    expect(
      overlays.every(
        (x) => !x.id.includes("missed") && !x.id.includes("overspray"),
      ),
    ).toBe(true);
    const exampleOverlays = constructionScene(
      q,
      { ...response, construction: brush(260) },
      true,
      false,
      true,
    ).overlays;
    expect(
      exampleOverlays.find(
        (overlay) =>
          overlay.type === "paint" && overlay.id.endsWith(":example"),
      ),
    ).toMatchObject({
      strokes:
        q.constructionExample?.kind === "brush"
          ? q.constructionExample.strokes
          : [],
      visualState: "answer",
    });
    const review = renderToStaticMarkup(
      createElement(ConstructionReview, {
        question: q,
        response: { ...response, constructionResult: results[0] },
      }),
    );
    expect(review).toContain("Population covered");
    expect(review).toContain("50.1 million people");
    expect(review).not.toContain("Difference from target");
    expect(review).not.toContain("Target");
    expect(results[0].sourceRevision).toBe(
      q.rule.type === "population-brush-target" ? q.rule.grid.revision : "",
    );
  });
  it("grades the mean center of population with tiered distance radii", () => {
    const q = journey.rounds[4];
    expect(q.mode).toBe("pin");
    if (q.rule.type !== "pin-distance") throw Error();
    expect(q.rule.targetId).toBe("us-population:mean-center-2020");
    expect(q.rule.radiusKm).toBe(600);
    expect(q.rule.tiers).toHaveLength(3);
    expect(
      isCorrect(q, context, {
        ...response,
        pin: { lat: 37.4158, lng: -92.3464 },
      }),
    ).toBe(true);
    expect(
      isCorrect(q, context, {
        ...response,
        pin: { lat: 40.7128, lng: -74.006 },
      }),
    ).toBe(false);
    expect(q.guidance?.assist?.places).toHaveLength(2);
  });
});
