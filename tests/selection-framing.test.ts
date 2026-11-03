import { readFileSync } from "node:fs";
import { geoDistance } from "d3-geo";
import { describe, expect, it } from "vitest";
import type { RegionFeature } from "../src/geography/types";
import { MISSING_BORDERS_TWO_JOURNEY as journey } from "../src/game/missingBordersTwoJourney";
import {
  createQuestionContext,
  selectableIds,
} from "../src/game/questionPreparation";
import { selectionFocus } from "../src/game/selectionFraming";
import { MECHANIC_RECIPES } from "../src/game/recipes";
import {
  defineQuestion,
  validateQuestionContract,
} from "../src/game/questionBuilder";
import { initialGame } from "../src/game/state";
import { journeyWorld } from "../src/app/journeyWorld";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(regions, [], journey);

describe("selection framing", () => {
  it.each(journey.rounds.map((question) => [question.id, question] as const))(
    "fits the full candidate outlines for %s, including merged members and offshore parts",
    (_, question) => {
      expect(question.playFraming).toBe("selection");
      expect(question.scenes?.play?.focus).toBeUndefined();
      const focus = selectionFocus(question, context);
      const distance = 1 + focus.altitude!;
      let widest = 0;
      let nearestHorizon = 1;
      for (const id of selectableIds(question, context)) {
        const geometry = context.targets.get(id)!.geometry;
        const polygons =
          geometry.type === "Polygon"
            ? [geometry.coordinates]
            : geometry.coordinates;
        for (const rings of polygons)
          for (const ring of rings)
            for (const point of ring) {
              const angle = geoDistance(
                [focus.lng, focus.lat],
                [point[0], point[1]],
              );
              // Independent perspective projection: the coastline is visible and fits
              // inside a 40-degree field, leaving margin in the globe's 50-degree view.
              nearestHorizon = Math.min(nearestHorizon, Math.cos(angle));
              widest = Math.max(
                widest,
                Math.atan2(Math.sin(angle), distance - Math.cos(angle)),
              );
            }
      }
      expect(nearestHorizon).toBeGreaterThan(1 / distance);
      expect(widest).toBeLessThan(Math.PI / 9);
      expect(selectionFocus(question, context)).toBe(focus);
    },
  );

  it("keeps the Oceania search across the dateline instead of centering on Greenwich", () => {
    const question = journey.rounds.find((q) =>
      q.id.includes("indonesia-papua"),
    )!;
    const focus = selectionFocus(question, context);
    expect(focus.lng).toBeGreaterThan(100);
    expect(focus.lng).toBeLessThan(180);
  });

  it("uses a world overview when the selectable geography spans more than a hemisphere", () => {
    const question = {
      ...journey.rounds[0],
      selection: {
        type: "ids" as const,
        ids: ["wurl:RUS", "wurl:USA", "wurl:CHL", "wurl:AUS"],
      },
    };
    const focus = selectionFocus(question, context);
    expect(focus.altitude).toBe(2.2);
    expect(Number.isFinite(focus.lat) && Number.isFinite(focus.lng)).toBe(true);
  });

  it("fits assist survivors and preserves the authored answer reveal", () => {
    const roundIndex = journey.rounds.findIndex((q) =>
      q.id.includes("moldova"),
    );
    const question = journey.rounds[roundIndex];
    const playing = { ...initialGame, phase: "playing" as const, roundIndex };
    const assisted = {
      ...playing,
      help: { [question.id]: "assisted" as const },
    };
    expect(journeyWorld(regions, journey, playing, context).focus).toEqual(
      selectionFocus(question, context),
    );
    const narrowed = journeyWorld(regions, journey, assisted, context).focus;
    expect(narrowed).toEqual(selectionFocus(question, context, true));
    expect(narrowed).not.toEqual(selectionFocus(question, context));
    expect(
      journeyWorld(regions, journey, { ...playing, phase: "feedback" }, context)
        .focus,
    ).toEqual(question.feedbackFocus);
  });

  it("does not use the correct answer to frame a finite country pool", () => {
    const recipe = MECHANIC_RECIPES.find((q) => q.id === "recipe:map-single")!;
    const first = defineQuestion({
      ...recipe,
      mode: "map-single",
      count: 1,
      commitment: "immediate",
      selection: { type: "ids", ids: ["wurl:POL", "wurl:BLR", "wurl:UKR"] },
      rule: { type: "country-ids", ids: ["wurl:POL"] },
      scenes: { play: { framing: "selection" } },
    });
    expect(selectionFocus(first, context)).toEqual(
      selectionFocus(
        {
          ...first,
          rule: { type: "country-ids", ids: ["wurl:UKR"] },
        },
        context,
      ),
    );
    expect(() =>
      validateQuestionContract({ ...first, selection: { type: "world" } }),
    ).toThrow(/bounded selectable region pool/);
  });
});
