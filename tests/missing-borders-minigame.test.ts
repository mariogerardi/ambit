import { readFileSync } from "node:fs";
import { geoDistance } from "d3-geo";
import { expect, it } from "vitest";
import type { RegionFeature } from "../src/geography/types";
import { createQuestionContext } from "../src/game/questionPreparation";
import { journeyWorld } from "../src/app/journeyWorld";
import {
  missingBorderPairs,
  missingBorderFocus,
  missingBorderJourney,
  missingBordersBase,
} from "../src/minigames/missingBorders";
import {
  startNeighborRun,
  neighborReducer,
  neighborGame,
  neighborDeck,
} from "../src/minigames/sharedNeighbors";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const base = createQuestionContext(regions, [], missingBordersBase);
const pairs = missingBorderPairs(regions);

it("generates a stable pool of real land borders, including overseas components", () => {
  expect(pairs.length).toBeGreaterThan(200);
  expect(new Set(pairs.map((p) => p.id)).size).toBe(pairs.length);
  for (const pair of pairs)
    expect(base.graph.get(pair.countries[0])?.has(pair.countries[1])).toBe(
      true,
    );
  const franceBrazil = pairs.find((p) => p.id === "wurl:BRA|wurl:FRA")!;
  expect(franceBrazil.anchor.lat).toBeGreaterThan(0);
  expect(franceBrazil.anchor.lat).toBeLessThan(6);
  expect(franceBrazil.anchor.lng).toBeLessThan(-45);
  expect(missingBorderPairs([...regions].reverse())).toEqual(pairs);
  const deck = neighborDeck(pairs, 123, 0);
  expect(new Set(deck.map((p) => p.id)).size).toBe(pairs.length);
});

it("prepares and dissolves every pair, with selectable distractors and no answer-only emphasis", () => {
  for (const pair of pairs) {
    const journey = missingBorderJourney(pair, base, regions, 123);
    const context = createQuestionContext(regions, [], journey, base);
    const run = startNeighborRun(pairs);
    const play = journeyWorld(
      regions,
      journey,
      neighborGame(run, journey),
      context,
    );
    expect(play.regions.some((r) => r.id === pair.answer)).toBe(true);
    for (const id of pair.countries)
      expect(play.regions.some((r) => r.id === id)).toBe(false);
    expect(play.regionNames).toBe("none");
    expect(play.showBorders).toBe(true);
    expect(play.selectableRegionIds!.length).toBeGreaterThan(100);
    const other = play.selectableRegionIds!.find((id) => id !== pair.answer)!;
    expect(play.states[pair.answer]).toBe(play.states[other]);
    const graded = neighborReducer(
      run,
      { type: "select", id: pair.answer },
      journey,
      context,
      pairs.length,
    );
    expect(graded).toMatchObject({ answered: 1, correct: 1, result: true });
    const reveal = journeyWorld(
      regions,
      journey,
      neighborGame(graded, journey),
      context,
    );
    expect(reveal.regions.some((r) => r.id === pair.answer)).toBe(false);
    for (const id of pair.countries) expect(reveal.states[id]).toBe("correct");
  }
});

it("varies regional framing reproducibly while keeping the erased boundary off-center and in view", () => {
  const rad = Math.PI / 180;
  for (const pair of pairs)
    for (const seed of [0, 123, 456]) {
      const focus = missingBorderFocus(pair, regions, seed);
      const distance =
        geoDistance(
          [focus.lng, focus.lat],
          [pair.anchor.lng, pair.anchor.lat],
        ) / rad;
      expect(distance).toBeGreaterThanOrEqual(12 - 1e-6);
      expect(distance).toBeLessThanOrEqual(24 + 1e-6);
      expect(focus.altitude).toBe(1.25);
      const distractors = regions.filter(
        (r) =>
          !pair.countries.includes(r.id) &&
          geoDistance([focus.lng, focus.lat], [r.focus.lng, r.focus.lat]) <
            42 * rad,
      );
      expect(distractors.length, pair.id).toBeGreaterThanOrEqual(6);
    }
  expect(missingBorderFocus(pairs[0], regions, 123)).toEqual(
    missingBorderFocus(pairs[0], regions, 123),
  );
  expect(missingBorderFocus(pairs[0], regions, 456)).not.toEqual(
    missingBorderFocus(pairs[0], regions, 123),
  );
});

it("rejects hidden member IDs, grades a pick immediately, locks reveals, and ends at three strikes", () => {
  const pair = pairs.find((p) => p.id === "wurl:ESP|wurl:PRT")!;
  const journey = missingBorderJourney(pair, base, regions, 123);
  const context = createQuestionContext(regions, [], journey, base);
  let run = startNeighborRun(pairs);
  for (const action of [
    { type: "select", id: pair.countries[0] },
    { type: "select", id: "unknown" },
    { type: "pin", lat: 0, lng: 0 },
    { type: "submit" },
  ] as const)
    expect(neighborReducer(run, action, journey, context, pairs.length)).toBe(
      run,
    );
  for (let i = 1; i <= 3; i++) {
    run = neighborReducer(
      run,
      { type: "select", id: "wurl:FRA" },
      journey,
      context,
      pairs.length,
    );
    expect(run).toMatchObject({ answered: i, correct: 0, result: false });
    expect(
      neighborReducer(
        run,
        { type: "select", id: pair.answer },
        journey,
        context,
        pairs.length,
      ),
    ).toBe(run);
    if (i < 3) {
      run = neighborReducer(
        run,
        { type: "next" },
        journey,
        context,
        pairs.length,
      );
      expect(run.selectedId).toBeUndefined();
    }
  }
  expect(run.ended).toBe("strikes");
});
