import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import type { RegionFeature } from "../src/geography/types";
import { createQuestionContext } from "../src/game/questionPreparation";
import {
  neighborReducer,
  neighborGame,
  startNeighborRun,
  neighborRunEnded,
} from "../src/minigames/sharedNeighbors";
import {
  borderRunPairs,
  borderRunJourney,
  landTopology,
  extraGameBase,
  pinpointPairs,
  pinpointDeck,
  pinpointJourney,
  pinpointPoints,
} from "../src/minigames/extraGames";
import {
  defaultMinigameSettings,
  smallCountryIds,
  filterMinigamePairs,
} from "../src/minigames/minigameSettings";
import { missingBorderPairs } from "../src/minigames/missingBorders";
import { minigameCompletion } from "../src/minigames/minigameRecap";
import { validNeighborRun } from "../src/minigames/sharedNeighborsSave";
import { journeyWorld } from "../src/app/journeyWorld";
const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const topology = landTopology(world);
const routes = borderRunPairs(topology);
it("builds country-only connected routes and removes excluded transit countries", () => {
  expect(routes.length).toBeGreaterThan(1000);
  for (const pair of routes) {
    expect(pair.route.length).toBeGreaterThan(2);
    expect(pair.answer).toBe(String(pair.route.length - 1));
    expect(
      pair.route.every((id) => topology.countries.has(id) && !id.includes("-")),
    ).toBe(true);
    for (let i = 1; i < pair.route.length; i++)
      expect(pair.components[i - 1].neighbors.has(pair.components[i].key)).toBe(
        true,
      );
  }
  expect(routes.some((p) => p.countries.includes("wurl:ISL"))).toBe(false);
  for (const pair of borderRunPairs(topology, ["wurl:FRA", "wurl:RUS"]))
    expect(pair.route.some((id) => ["wurl:FRA", "wurl:RUS"].includes(id))).toBe(
      false,
    );
});
it("grades the numeric minimum, locks feedback and reveals a valid path", () => {
  const base = createQuestionContext(world, [], extraGameBase("border-run"));
  for (const pair of routes.filter((_, i) => i % 700 === 0)) {
    const journey = borderRunJourney(pair, base),
      context = createQuestionContext(world, [], journey, base);
    const run = {
      ...startNeighborRun(routes),
      kind: "border-run" as const,
      text: pair.answer,
    };
    const result = neighborReducer(
      run,
      { type: "submit" },
      journey,
      context,
      routes.length,
    );
    expect(result.result).toBe(true);
    expect(journey.rounds[0].feedbackContextIds).toEqual(pair.route);
    expect(journey.rounds[0].map?.borders).toBe(false);
    expect(
      neighborReducer(
        result,
        { type: "text", value: "99" },
        journey,
        context,
        routes.length,
      ),
    ).toBe(result);
  }
});
it("offers only supported categories, balances them, and hides point targets until reveal", () => {
  const pairs = pinpointPairs(world, defaultMinigameSettings);
  expect(new Set(pairs.map((p) => p.category))).toEqual(
    new Set(["cities", "landmarks"]),
  );
  expect(pairs.filter((p) => p.category === "landmarks")).toHaveLength(60);
  for (const seed of [0, 42, 928]) {
    const deck = pinpointDeck(pairs, seed, 0);
    expect(deck).toHaveLength(10);
    expect(new Set(deck.map((p) => p.place?.parentId)).size).toBe(10);
    expect(new Set(deck.map((p) => p.id)).size).toBe(10);
    expect(pinpointDeck(pairs, seed, 0)).toEqual(deck);
  }
  expect(pinpointDeck([], 42, 0)).toEqual([]);
  expect(
    pinpointPairs(world, { ...defaultMinigameSettings, categories: [] }),
  ).toEqual([]);
  for (const category of [
    "cities",
    "landmarks",
    "countries",
    "regions",
  ] as const) {
    const pool = pinpointPairs(world, {
      ...defaultMinigameSettings,
      categories: [category],
    });
    expect(pool.length).toBeGreaterThan(0);
    for (const pair of pool.slice(0, 5)) {
      const journey = pinpointJourney(pair),
        context = createQuestionContext(world, [], journey);
      const run = { ...startNeighborRun(pool), kind: "pinpoint" as const };
      const view = journeyWorld(
        world,
        journey,
        neighborGame(run, journey),
        context,
      );
      expect(view.places.some((p) => p.id === pair.answer)).toBe(false);
      expect(view.states[pair.answer]).not.toBe("answer");
      if (pair.photo)
        expect(readFileSync(`public${pair.photo.src}`).length).toBeGreaterThan(
          1000,
        );
    }
  }
});
it("keeps Pinpoint running through misses and shows the tenth reveal before its overview", () => {
  const pairs = pinpointPairs(world, {
    ...defaultMinigameSettings,
    categories: ["landmarks"],
  });
  const journey = pinpointJourney(pairs[0]),
    context = createQuestionContext(world, [], journey);
  let run = { ...startNeighborRun(pairs), kind: "pinpoint" as const };
  for (let round = 0; round < 10; round++) {
    run = neighborReducer(
      {
        ...run,
        pin: {
          lat: -pairs[0].place!.lat,
          lng:
            pairs[0].place!.lng > 0
              ? pairs[0].place!.lng - 180
              : pairs[0].place!.lng + 180,
        },
      },
      { type: "submit" },
      journey,
      context,
      10,
    ) as typeof run;
    expect(run.answered).toBe(round + 1);
    expect(neighborRunEnded(run)).toBe(round === 9);
    expect(run.overview).toBe(false);
    if (round < 9)
      run = neighborReducer(
        run,
        { type: "next" },
        journey,
        context,
        10,
      ) as typeof run;
  }
  expect(neighborGame(run, journey).phase).toBe("feedback");
  const overview = neighborReducer(
    run,
    { type: "overview" },
    journey,
    context,
    10,
  );
  expect(neighborGame(overview, journey).phase).toBe("finished");
  expect(validNeighborRun(overview)).toBe(true);
  expect(pinpointPoints(0)).toBe(1000);
  expect(pinpointPoints(1)).toBe(1000);
  expect(pinpointPoints(100)).toBeGreaterThan(pinpointPoints(1000));
  expect(pinpointPoints(20000)).toBe(0);
});
it("excludes countries under 2,500 km² from merged answers by default, with an opt-out", () => {
  const small = smallCountryIds(world),
    pairs = missingBorderPairs(world);
  for (const id of ["MCO", "SMR", "LIE", "AND", "SGP"])
    expect(small.has(`wurl:${id}`)).toBe(true);
  expect(small.has("wurl:LUX")).toBe(false);
  const filtered = filterMinigamePairs(
    pairs,
    defaultMinigameSettings,
    new Map(),
    "missing-borders",
    small,
  );
  expect(filtered.length).toBeLessThan(pairs.length);
  expect(filtered.some((p) => p.countries.some((id) => small.has(id)))).toBe(
    false,
  );
  expect(
    filterMinigamePairs(
      pairs,
      { ...defaultMinigameSettings, excludeSmallCountries: false },
      new Map(),
      "missing-borders",
      small,
    ),
  ).toEqual(pairs);
});
it("samples a bounded completion tour and retains correct areas and wrong pins", () => {
  const run = {
    ...startNeighborRun(routes),
    history: Array.from({ length: 64 }, (_, i) => ({
      ids: [`wurl:${i}`],
      correct: i % 3 !== 0,
      point: { lat: i, lng: i },
      pin: { lat: 0, lng: i },
    })),
  };
  const recap = minigameCompletion(run);
  expect(recap.views!.length).toBeLessThanOrEqual(6);
  expect(recap.regionIds).toContain("wurl:1");
  expect(recap.regionIds).not.toContain("wurl:0");
  expect(recap.places.some((p) => p.visualState === "incorrect")).toBe(true);
  expect(
    validNeighborRun({
      ...run,
      history: [{ ids: [], correct: true, point: { lat: NaN, lng: 0 } }],
    }),
  ).toBe(false);
});
