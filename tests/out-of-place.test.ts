// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DISPLAY_CAPITALS } from "../src/geography/places";
import type { RegionFeature } from "../src/geography/types";
import {
  outOfPlaceItems,
  outOfPlacePairs,
  outOfPlaceDeck,
  outOfPlaceJourney,
  outOfPlaceClear,
  outOfPlaceOwnership,
  outOfPlaceGeographyClear,
} from "../src/minigames/outOfPlace";
import { minigameBase } from "../src/minigames/minigameContext";
import { createQuestionContext } from "../src/game/questionPreparation";
import {
  neighborGame,
  neighborReducer,
  startNeighborRun,
} from "../src/minigames/sharedNeighbors";
import { journeyWorld } from "../src/app/journeyWorld";
import { minigameWorld } from "../src/minigames/minigameWorld";
import { createNeighborSave } from "../src/minigames/sharedNeighborsSave";
import {
  minigameResultText,
  minigameResult,
} from "../src/minigames/minigameSharing";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const base = minigameBase(regions);
const pairs = outOfPlacePairs(regions);
describe("Out of Place", () => {
  it("builds a global pool of capitals, million-plus cities and country anchors", () => {
    const capitals = new Set(DISPLAY_CAPITALS.map((p) => p.id));
    const items = outOfPlaceItems(regions);
    expect(items.length).toBeGreaterThan(400);
    for (const city of items.filter((i) => i.type === "city"))
      expect(capitals.has(city.id) || (city.population ?? 0) >= 1_000_000).toBe(
        true,
      );
    expect(pairs.length, "regional scene generation").toBeGreaterThanOrEqual(
      12,
    );
  });
  it("generates seeded six-item scenes with exactly one error and clear tap targets", () => {
    const variants = new Set<string>();
    const types = new Set<string>();
    for (const seed of [1, 42, 567, 10000]) {
      const deck = outOfPlaceDeck(pairs, regions, seed, 0);
      expect(deck).toEqual(outOfPlaceDeck(pairs, regions, seed, 0));
      for (const pair of deck) {
        variants.add(pair.id);
        types.add(pair.mistake);
        expect(pair.items).toHaveLength(6);
        expect(pair.displayed).toHaveLength(6);
        expect(new Set(pair.items.map((i) => i.type)).size).toBe(2);
        expect(outOfPlaceOwnership(pair.items)).toBe(true);
        expect(outOfPlaceGeographyClear(pair.items, regions)).toBe(true);
        expect(outOfPlaceGeographyClear(pair.displayed, regions)).toBe(true);
        expect(outOfPlaceClear(pair.items, pair.focus)).toBe(true);
        expect(outOfPlaceClear(pair.displayed, pair.focus)).toBe(true);
        const errors = pair.displayed.filter((i) => {
          const real = pair.items.find((p) => p.id === i.id)!;
          return (
            i.name !== real.name || i.lat !== real.lat || i.lng !== real.lng
          );
        });
        expect(errors.map((i) => i.id)).toEqual([pair.answer]);
        if (pair.items.find((i) => i.id === pair.answer)!.type === "country")
          expect(pair.mistake).toBe("name");
      }
    }
    expect(types).toEqual(new Set(["name", "position"]));
    expect(variants.size).toBeGreaterThan(pairs.length * 2);
  });
  it("grades a single marker tap once, restores real names/coordinates and ignores outside taps", () => {
    for (const pair of outOfPlaceDeck(pairs, regions, 42, 0)) {
      const journey = outOfPlaceJourney(pair, base);
      const context = createQuestionContext(regions, [], journey, base);
      const run = { ...startNeighborRun(pairs), kind: "out-of-place" as const };
      expect(
        neighborReducer(
          run,
          { type: "select", id: "wurl:CHN" },
          journey,
          context,
          pairs.length,
        ),
      ).toBe(run);
      const result = neighborReducer(
        run,
        { type: "select", id: pair.answer },
        journey,
        context,
        pairs.length,
      );
      expect(result.correct).toBe(1);
      expect(result.answered).toBe(1);
      expect(
        neighborReducer(
          result,
          { type: "select", id: pair.items[0].id },
          journey,
          context,
          pairs.length,
        ),
      ).toBe(result);
      const world = journeyWorld(
        regions,
        journey,
        neighborGame(result, journey),
        context,
      );
      expect(world.regionInteraction).toBe(false);
      expect(world.places.filter((p) => p.answerTarget)).toHaveLength(6);
      const presented = minigameWorld({
        regions,
        journey,
        context,
        game: neighborGame(result, journey),
        kind: "out-of-place",
        pair,
      });
      for (const city of pair.items.filter((i) => i.type === "city"))
        expect(presented.states[city.parentId]).toBe("surface");
      if (pair.mistake === "position") {
        const original = presented.places.find((p) =>
          p.id.endsWith(":original-position"),
        );
        const shown = pair.displayed.find((p) => p.id === pair.answer)!;
        expect(original).toMatchObject({
          name: "Shown here",
          lat: shown.lat,
          lng: shown.lng,
          answerTarget: false,
        });
        expect(journey.rounds[0].explanation).toContain(
          "km from its true location",
        );
      }
      for (const actual of pair.items) {
        const revealed = world.places.find((p) => p.id === actual.id)!;
        expect(revealed).toMatchObject({
          name: actual.name,
          lat: actual.lat,
          lng: actual.lng,
        });
      }
      expect(world.places.find((p) => p.id === pair.answer)!.visualState).toBe(
        "correct",
      );
    }
  });
  it("persists a first-tap result in its own save and shares its own game URL", () => {
    const pair = pairs[0],
      journey = outOfPlaceJourney(pair, base);
    const context = createQuestionContext(regions, [], journey, base);
    const run = neighborReducer(
      { ...startNeighborRun(pairs), kind: "out-of-place" },
      { type: "select", id: pair.answer },
      journey,
      context,
      pairs.length,
    );
    const store = createNeighborSave(undefined, "out-of-place");
    store.save({ version: 1, run });
    expect(store.load().run).toEqual(run);
    const text = minigameResultText(minigameResult("out-of-place", run, true));
    expect(text).toContain("1 mistakes spotted");
    expect(text).toContain("/minigames/out-of-place");
  });
});
