import { readFileSync, existsSync } from "node:fs";
import { geoContains } from "d3-geo";
import { describe, expect, it } from "vitest";
import type { RegionFeature } from "../src/geography/types";
import { sphericalGeometry } from "../src/geography/sphericalGeometry.mjs";
import {
  TENTH_JOURNEY,
  PACIFIC_ANDEAN_COUNTRIES,
} from "../src/game/tenthJourney";
import { JOURNEYS, journeyPath } from "../src/game/journeys";
import { createQuestionContext, isCorrect } from "../src/game/questions";
import { gameReducer, initialGame } from "../src/game/state";
import type { Action, GameState } from "../src/game/state";
import {
  questionRegions,
  highlightedPartId,
  questionPlaces,
} from "../src/game/presentation";
import { journeyWorld } from "../src/app/journeyWorld";

const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const journey = TENTH_JOURNEY;
const context = createQuestionContext(world, [], journey);
const at = (roundIndex: number): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex,
});
const reduce = (state: GameState, ...actions: Action[]) =>
  actions.reduce((s, a) => gameReducer(s, a, journey, context), state);

describe("Pacific Journey", () => {
  it("registers five varied rounds and uses a local clue asset", () => {
    expect(JOURNEYS).toContain(journey);
    expect(journeyPath(journey.id)).toBe("/journey/ring-of-fire");
    expect(journey.rounds).toHaveLength(5);
    expect(new Set(journey.rounds.map((q) => q.mode)).size).toBe(5);
    expect(existsSync(`public${journey.rounds[0].image!.src}`)).toBe(true);
  });
  it("highlights Hokkaido alone without identifying it before feedback", () => {
    const q = journey.rounds[1];
    const rendered = questionRegions(world, q, "playing");
    const island = rendered.find(
      (r) => r.id === highlightedPartId("wurl:JPN"),
    )!;
    expect(island.name).toBe("Highlighted territory");
    expect(geoContains(sphericalGeometry(island.geometry), [142.7, 43.2])).toBe(
      true,
    );
    expect(geoContains(sphericalGeometry(island.geometry), [139.7, 35.7])).toBe(
      false,
    );
    expect(q.choices).toHaveLength(6);
  });
  it("keeps pin borders and capital answers hidden, and rejects water and incomplete sets", () => {
    const pin = journey.rounds[2];
    const presentation = journeyWorld(world, journey, at(2), context);
    expect(presentation.showBorders).toBe(false);
    expect(presentation.regionNames).toBe("none");
    expect(presentation.regionInteraction).toBe(false);
    expect(
      isCorrect(pin, context, {
        selectedIds: [],
        text: "",
        ordered: [],
        pin: { lat: -6.9, lng: 107.6 },
      }),
    ).toBe(true);
    expect(
      isCorrect(pin, context, {
        selectedIds: [],
        text: "",
        ordered: [],
        pin: { lat: -15, lng: 110 },
      }),
    ).toBe(false);
    expect(
      isCorrect(journey.rounds[3], context, {
        selectedIds: PACIFIC_ANDEAN_COUNTRIES.slice(0, 3),
        text: "",
        ordered: [],
      }),
    ).toBe(false);
    expect(questionPlaces(journey.rounds[4], context, "playing")).toEqual([]);
    expect(questionPlaces(journey.rounds[4], context, "feedback")[0].name).toBe(
      "Wellington",
    );
  });
  it("completes all five rounds through the existing game engine", () => {
    let state = reduce(
      at(0),
      { type: "select", id: "wurl:JPN" },
      { type: "next" },
    );
    state = reduce(
      state,
      { type: "select", id: "island:hokkaido" },
      { type: "submit" },
      { type: "next" },
    );
    state = reduce(
      state,
      { type: "drop-pin", lat: -6.9, lng: 107.6 },
      { type: "submit" },
      { type: "next" },
    );
    state = reduce(
      state,
      ...PACIFIC_ANDEAN_COUNTRIES.map((id): Action => ({ type: "select", id })),
      { type: "submit" },
      { type: "next" },
    );
    state = reduce(
      state,
      { type: "text", value: "Wellington" },
      { type: "submit" },
      { type: "next" },
    );
    expect(state.phase).toBe("finished");
    expect(state.answers).toHaveLength(5);
    expect(state.answers.every((answer) => answer.correct)).toBe(true);
  });
});
