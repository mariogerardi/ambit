import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { RegionFeature } from "../src/geography/types";
import { ANSWER_TYPES, PLAYGROUND_JOURNEY } from "../src/game/questionCatalog";
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
const context = createQuestionContext(world, COUNTRY_FACTS, PLAYGROUND_JOURNEY);
const reduce = (state: GameState, ...actions: Action[]) =>
  actions.reduce(
    (s, a) => gameReducer(s, a, PLAYGROUND_JOURNEY, context),
    state,
  );
const at = (id: string) =>
  reduce(initialGame, {
    type: "jump",
    index: PLAYGROUND_JOURNEY.rounds.findIndex((q) => q.id === id),
  });
describe("question playground", () => {
  it("catalogs Journey questions only, with distinct jump targets", () => {
    const rounds = PLAYGROUND_JOURNEY.rounds;
    expect(rounds.every((q) => Object.hasOwn(ANSWER_TYPES, q.mode))).toBe(true);
    expect(rounds).toHaveLength(65);
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
    const state = at(q.id);
    expect(reduce(state, { type: "select", id: "wurl:NAM" })).toBe(state);
  });
  it("starts fresh when jumping from a fatal mistake and rejects invalid targets", () => {
    const failed = reduce(at("canada-maple-flag-v1"), {
      type: "select",
      id: "wurl:FRA",
    });
    expect(failed.phase).toBe("feedback");
    const jumped = reduce(failed, { type: "jump", index: 5 });
    expect(jumped).toEqual({ ...initialGame, phase: "playing", roundIndex: 5 });
    for (const index of [-1, PLAYGROUND_JOURNEY.rounds.length, 1.5, NaN])
      expect(reduce(jumped, { type: "jump", index })).toBe(jumped);
  });
  it("does not expose standalone or discarded questions", () => {
    const ids = PLAYGROUND_JOURNEY.rounds.map((q) => q.id);
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
