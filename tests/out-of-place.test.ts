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
import { minigameCompletion } from "../src/minigames/minigameRecap";
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
      } else expect(journey.rounds[0].explanation).toContain(" was actually ");
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
  it("recaps countries as fills and cities as dots without duplicate wrong-answer pins", () => {
    const items = outOfPlaceItems(regions);
    const cities = items.filter((p) => p.type === "city").slice(0, 3);
    const countries = items
      .filter(
        (p) =>
          p.type === "country" &&
          !cities.some((city) => city.parentId === p.id),
      )
      .slice(0, 3);
    const visit = (
      target: (typeof items)[number],
      correct: boolean,
      selected = target,
    ) => ({
      target: {
        id: target.id,
        name: target.name,
        lat: target.lat,
        lng: target.lng,
      },
      ids: target.type === "country" ? [target.id] : [],
      correct,
      point: { lat: target.lat, lng: target.lng },
      selectedId: selected.id,
      ...(!correct ? { pin: { lat: selected.lat, lng: selected.lng } } : {}),
    });
    const run = {
      ...startNeighborRun(pairs),
      kind: "out-of-place" as const,
      overview: true,
      result: false,
      selectedId: cities[0].id,
      pin: { lat: cities[0].lat, lng: cities[0].lng },
      history: [
        visit(cities[0], true),
        visit(countries[0], true),
        visit(cities[1], false, countries[1]),
        visit(countries[2], false, cities[2]),
        visit(cities[1], false, cities[0]),
      ],
    };
    const completion = minigameCompletion(run, base);
    const journey = { ...outOfPlaceJourney(pairs[0], base), completion };
    const view = minigameWorld({
      regions,
      journey,
      context: createQuestionContext(regions, [], journey, base),
      game: neighborGame(run, journey),
      kind: "out-of-place",
      pair: pairs[0],
      overview: true,
    });
    expect(view.places).toHaveLength(6);
    expect(new Set(view.places.map((p) => p.id)).size).toBe(6);
    expect(view.places.some((p) => p.kind === "pin")).toBe(false);
    const states = ["correct", "answer", "incorrect"];
    countries.forEach((country, index) => {
      expect(view.states[country.id]).toBe(states[[0, 2, 1][index]]);
      expect(view.places.find((p) => p.id === country.id)).toMatchObject({
        markerHidden: true,
      });
    });
    cities.forEach((city, index) => {
      expect(view.places.find((p) => p.id === city.id)).toMatchObject({
        kind: "city",
        markerHidden: false,
        visualState: states[index],
      });
      expect(view.states[city.parentId]).toBe("disabled");
    });
    expect(view.regionInteraction).toBe(false);
    expect(view.clueLocators).toEqual([]);
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
