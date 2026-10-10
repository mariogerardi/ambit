import { geoContains, geoDistance } from "d3-geo";
import { sphericalGeometry } from "../src/geography/sphericalGeometry.mjs";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FIFTEENTH_JOURNEY as journey } from "../src/game/fifteenthJourney";
import { JOURNEYS, journeyPath } from "../src/game/journeys";
import { QUESTION_CATALOG } from "../src/game/questionCatalog";
import { JOURNEY_INDEX } from "../src/game/journeyRegistry";
import { createQuestionContext, isCorrect } from "../src/game/questions";
import { initialGame, gameReducer } from "../src/game/state";
import type { GameState } from "../src/game/state";
import type { RegionFeature } from "../src/geography/types";
import { journeyWorld } from "../src/app/journeyWorld";
import { modeForPath } from "../src/app/modes";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(regions, [], journey);
const points = [
  { lat: 64, lng: 26 },
  { lat: 40, lng: 127 },
  { lat: 46, lng: 104 },
  { lat: 42, lng: 44 },
  { lat: 58.7, lng: 25.5 },
];
const at = (roundIndex: number): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex,
});

describe("Try not to click Russia Journey", () => {
  it("registers the requested ordered five-round Journey and practice route", () => {
    expect(JOURNEYS).toContain(journey);
    expect(journey.rounds.map((q) => q.progressLabel)).toEqual([
      "Finland",
      "North Korea",
      "Mongolia",
      "Georgia",
      "Estonia",
    ]);
    expect(
      QUESTION_CATALOG.filter((q) => journey.rounds.includes(q)),
    ).toHaveLength(5);
    expect(JOURNEY_INDEX.find((j) => j.id === journey.id)?.path).toBe(
      journeyPath(journey.id),
    );
    expect(modeForPath(journeyPath(journey.id))).toBe("practice");
  });
  it.each(journey.rounds.map((q, i) => [q.progressLabel, i] as const))(
    "%s is borderless and anonymous until an editable pin is submitted",
    (_, i) => {
      const q = journey.rounds[i];
      const target = context.targets.get(
        q.rule.type === "pin-inside" ? q.rule.ids[0] : "",
      )!;
      expect(
        geoContains(sphericalGeometry(target.geometry), [
          q.focus.lng,
          q.focus.lat,
        ]),
      ).toBe(false);
      expect(q.focus.altitude).toBeGreaterThanOrEqual(1);
      expect(
        geoDistance([q.focus.lng, q.focus.lat], [points[i].lng, points[i].lat]),
      ).toBeLessThan(Math.PI / 3);
      const world = journeyWorld(regions, journey, at(i), context);
      expect(world.showBorders).toBe(false);
      expect(world.regionInteraction).toBe(false);
      expect(world.regionNames).toBe("none");
      expect(new Set(Object.values(world.states))).toEqual(
        new Set(["disabled"]),
      );
      expect(world.places).toEqual([]);
      expect(isCorrect(q, context, { ...initialGame, pin: points[i] })).toBe(
        true,
      );
      expect(
        isCorrect(q, context, {
          ...initialGame,
          pin: { lat: 55.75, lng: 37.6 },
        }),
      ).toBe(false);
      expect(
        isCorrect(q, context, { ...initialGame, pin: { lat: 0, lng: -30 } }),
      ).toBe(false);
      let game = gameReducer(
        at(i),
        { type: "drop-pin", lat: 55.75, lng: 37.6 },
        journey,
        context,
      );
      expect(game.answers).toHaveLength(0);
      game = gameReducer(
        game,
        { type: "drop-pin", ...points[i] },
        journey,
        context,
      );
      game = gameReducer(game, { type: "submit" }, journey, context);
      expect(game.answers[0].correct).toBe(true);
      const reveal = journeyWorld(regions, journey, game, context);
      expect(reveal.showBorders).toBe(true);
      expect(reveal.places[0].visualState).toBe("correct");
    },
  );
  it("allows mistakes and completes all five rounds", () => {
    let game = at(0);
    for (const point of points) {
      game = gameReducer(
        game,
        { type: "drop-pin", ...point },
        journey,
        context,
      );
      game = gameReducer(game, { type: "submit" }, journey, context);
      game = gameReducer(game, { type: "next" }, journey, context);
    }
    expect(game.phase).toBe("finished");
    expect(game.answers.every((a) => a.correct)).toBe(true);
    const wrong = gameReducer(
      gameReducer(
        at(0),
        { type: "drop-pin", lat: 55.75, lng: 37.6 },
        journey,
        context,
      ),
      { type: "submit" },
      journey,
      context,
    );
    expect(wrong.phase).toBe("feedback");
    expect(
      gameReducer(wrong, { type: "next" }, journey, context).roundIndex,
    ).toBe(1);
  });
});
