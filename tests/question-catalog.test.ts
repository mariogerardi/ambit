import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { RegionFeature } from "../src/geography/types";
import { ANSWER_TYPES, QUESTION_CATALOG } from "../src/game/questionCatalog";
import { modeForPath } from "../src/app/modes";
import { COUNTRY_FACTS } from "../src/game/countryFacts";
import { CANADA_JOURNEY as JOURNEY } from "../src/game/canadaJourney";
import { NORTH_AMERICA_JOURNEY } from "../src/game/northAmericaJourney";
import {
  createQuestionContext,
  canSelect,
  committedNameVisible,
} from "../src/game/questions";
import { gameReducer, initialGame } from "../src/game/state";
import type { Action, GameState } from "../src/game/state";
const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(
  world,
  COUNTRY_FACTS,
  NORTH_AMERICA_JOURNEY,
);
const reduce = (state: GameState, ...actions: Action[]) =>
  actions.reduce(
    (s, a) => gameReducer(s, a, NORTH_AMERICA_JOURNEY, context),
    state,
  );
describe("current question catalog", () => {
  it("does not route the removed playground", () => {
    expect(modeForPath("/playground")).toBe("home");
  });
  it("catalogs Journey questions only, with distinct IDs", () => {
    const rounds = QUESTION_CATALOG;
    expect(rounds.every((q) => Object.hasOwn(ANSWER_TYPES, q.mode))).toBe(true);
    expect(rounds).toHaveLength(80);
    expect(new Set(rounds.map((q) => q.id)).size).toBe(rounds.length);
    expect(rounds.slice(0, 5)).toEqual(JOURNEY.rounds);
  });
  it("keeps the border-count challenge blind and excludes every map pick", () => {
    const q = NORTH_AMERICA_JOURNEY.rounds[3];
    expect(q.map).toMatchObject({
      borders: false,
      hoverFeedback: false,
      muteOthers: true,
    });
    for (const region of world) {
      expect(canSelect(q, context, region.id)).toBe(false);
      expect(committedNameVisible(q, [], region.id)).toBe(false);
    }
    const state: GameState = {
      ...initialGame,
      phase: "playing",
      roundIndex: 3,
    };
    expect(reduce(state, { type: "select", id: "wurl:NAM" })).toBe(state);
  });
  it("does not expose standalone or discarded questions", () => {
    const ids = QUESTION_CATALOG.map((q) => q.id);
    for (const id of [
      "construct-land-path",
      "capital-country-set",
      "canada-one-language",
      "danube-four",
      "andes-all",
      "europe-east-amman",
      "countries-wholly-in-circle",
    ])
      expect(ids).not.toContain(id);
  });
});
