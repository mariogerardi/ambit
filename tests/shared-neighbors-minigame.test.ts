import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { RegionFeature } from "../src/geography/types";
import { buildBorderGraph } from "../src/game/reasoning";
import { createQuestionContext } from "../src/game/questionPreparation";
import { CAPITALS } from "../src/game/quizData";
import { journeyWorld } from "../src/app/journeyWorld";
import { SHARED_NEIGHBOR_CLUES } from "../src/game/ninthJourney";
import { SHARED_NEIGHBOR_TWO_CLUES } from "../src/game/sharedNeighborsTwoJourney";
import {
  sharedNeighborPairs,
  neighborDeck,
  startNeighborRun,
  neighborJourneyBase,
  neighborJourney,
  neighborReducer,
  neighborGame,
  poolSignature,
  neighborRunEnded,
} from "../src/minigames/sharedNeighbors";

const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const base = createQuestionContext(world, [], neighborJourneyBase);
const pairs = sharedNeighborPairs(base.graph);
const pair = pairs.find(
  (p) => p.countries.includes("wurl:SUR") && p.countries.includes("wurl:COL"),
)!;
const journey = neighborJourney(pair, base);
const context = createQuestionContext(world, [], journey, base);

describe("Shared Neighbors minigame", () => {
  it("includes French Guiana in France's land-border relationships", () => {
    expect(pairs.find((p) => p.id === "wurl:FRA|wurl:SUR")?.answer).toBe(
      "wurl:BRA",
    );
    expect(base.graph.get("wurl:FRA")?.has("wurl:BRA")).toBe(true);
    expect(base.graph.get("wurl:FRA")?.has("wurl:SUR")).toBe(true);
  });
  it("prepares every generated pair with valid geometry and finite entry/reveal framing", () => {
    for (const pair of pairs) {
      const definition = neighborJourney(pair, base);
      expect(() =>
        createQuestionContext(world, [], definition, base),
      ).not.toThrow();
      const question = definition.rounds[0];
      for (const focus of [question.focus, question.feedbackFocus!]) {
        expect(
          Number.isFinite(focus.lat) &&
            Number.isFinite(focus.lng) &&
            Number.isFinite(focus.altitude),
        ).toBe(true);
        expect(Math.abs(focus.lat)).toBeLessThanOrEqual(90);
        expect(Math.abs(focus.lng)).toBeLessThanOrEqual(180);
      }
    }
    const future = Date.now() + 60_000;
    expect(startNeighborRun(pairs, future).startedAt).toBe(future + 1);
  });
  it("includes both Journey editions and remains independent of geography order", () => {
    for (const clue of [...SHARED_NEIGHBOR_CLUES, ...SHARED_NEIGHBOR_TWO_CLUES])
      expect(
        pairs.find((p) => p.id === [...clue.countries].sort().join("|"))
          ?.answer,
      ).toBe(clue.answer);
    expect(sharedNeighborPairs(buildBorderGraph([...world].reverse()))).toEqual(
      pairs,
    );
  });
  it("includes adjacent clue pairs and rejects ambiguity even when the second answer is outside the eligible roster", () => {
    const graph = new Map([
      ["wurl:CAN", new Set(["wurl:USA", "wurl:MEX"])],
      ["wurl:USA", new Set(["wurl:CAN", "wurl:MEX"])],
      ["wurl:MEX", new Set(["wurl:CAN", "wurl:USA"])],
    ]);
    expect(sharedNeighborPairs(graph)).toContainEqual({
      id: "wurl:CAN|wurl:MEX",
      countries: ["wurl:CAN", "wurl:MEX"],
      answer: "wurl:USA",
    });
    graph.get("wurl:CAN")!.add("territory:extra");
    graph.get("wurl:MEX")!.add("territory:extra");
    graph.set("territory:extra", new Set(["wurl:CAN", "wurl:MEX"]));
    expect(
      sharedNeighborPairs(graph).some((p) => p.id === "wurl:CAN|wurl:MEX"),
    ).toBe(false);
  });
  it("shuffles the entire pool without repeats and keeps a saved seed stable", () => {
    const first = neighborDeck(pairs, 123, 0);
    expect(new Set(first.map((p) => p.id)).size).toBe(pairs.length);
    expect([...first].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      [...pairs].sort((a, b) => a.id.localeCompare(b.id)),
    );
    expect(neighborDeck(pairs, 123, 0)).toEqual(first);
    expect(neighborDeck(pairs, 124, 0)).not.toEqual(first);
    const next = neighborDeck(pairs, 123, 1);
    expect(next).not.toEqual(first);
    expect(new Set(next.map((p) => p.id))).toEqual(
      new Set(first.map((p) => p.id)),
    );
    expect(poolSignature(pairs.slice(1))).not.toBe(poolSignature(pairs));
  });
  it("grades canonical containment, locks feedback, and hides the answer until submission", () => {
    const run = startNeighborRun(pairs);
    expect(
      neighborReducer(run, { type: "submit" }, journey, context, pairs.length),
    ).toBe(run);
    expect(
      neighborReducer(run, { type: "next" }, journey, context, pairs.length),
    ).toBe(run);
    expect(
      neighborReducer(
        run,
        { type: "pin", lat: NaN, lng: 0 },
        journey,
        context,
        pairs.length,
      ),
    ).toBe(run);
    const capital = CAPITALS.find((c) => c.countryId === pair.answer)!;
    const placed = neighborReducer(
      run,
      { type: "pin", lat: capital.lat, lng: capital.lng },
      journey,
      context,
      pairs.length,
    );
    const before = journeyWorld(
      world,
      journey,
      neighborGame(placed, journey),
      context,
    );
    expect(before.regionNames).toBe("none");
    expect(before.showBorders).toBe(false);
    expect(before.borderRegionIds).toEqual(pair.countries);
    expect(before.states[pair.answer]).toBe("surface");
    const submitted = neighborReducer(
      placed,
      { type: "submit" },
      journey,
      context,
      pairs.length,
    );
    expect(submitted).toMatchObject({ result: true, correct: 1, answered: 1 });
    expect(
      neighborReducer(
        submitted,
        { type: "submit" },
        journey,
        context,
        pairs.length,
      ),
    ).toBe(submitted);
    expect(
      neighborReducer(
        submitted,
        { type: "pin", lat: 0, lng: -140 },
        journey,
        context,
        pairs.length,
      ),
    ).toBe(submitted);
    const revealed = journeyWorld(
      world,
      journey,
      neighborGame(submitted, journey),
      context,
    );
    expect(revealed.states[pair.answer]).toBe("correct");
    const ocean = neighborReducer(
      run,
      { type: "pin", lat: 0, lng: -140 },
      journey,
      context,
      pairs.length,
    );
    expect(
      neighborReducer(
        ocean,
        { type: "submit" },
        journey,
        context,
        pairs.length,
      ),
    ).toMatchObject({ result: false, correct: 0, answered: 1 });
  });
  it("advances through the last pair into a newly shuffled cycle without losing the score", () => {
    const run = {
      ...startNeighborRun(pairs),
      index: pairs.length - 1,
      answered: pairs.length,
      correct: pairs.length - 1,
      pin: { lat: 0, lng: 0 },
      result: false,
    };
    expect(
      neighborReducer(run, { type: "next" }, journey, context, pairs.length),
    ).toMatchObject({
      index: 0,
      cycle: 1,
      answered: pairs.length,
      correct: pairs.length - 1,
      pin: undefined,
      result: undefined,
    });
  });
  it("ends on the third miss, reveals the final answer, and locks further actions", () => {
    let run = startNeighborRun(pairs);
    for (let strike = 1; strike <= 3; strike++) {
      run = neighborReducer(
        run,
        { type: "pin", lat: 0, lng: -140 },
        journey,
        context,
        pairs.length,
      );
      run = neighborReducer(
        run,
        { type: "submit" },
        journey,
        context,
        pairs.length,
      );
      expect(run).toMatchObject({
        answered: strike,
        correct: 0,
        result: false,
      });
      expect(neighborRunEnded(run)).toBe(strike === 3);
      if (strike < 3)
        run = neighborReducer(
          run,
          { type: "next" },
          journey,
          context,
          pairs.length,
        );
    }
    expect(run.ended).toBe("strikes");
    expect(
      journeyWorld(world, journey, neighborGame(run, journey), context).states[
        pair.answer
      ],
    ).toBe("answer");
    for (const action of [
      { type: "pin", lat: 10, lng: 10 },
      { type: "submit" },
      { type: "next" },
      { type: "finish" },
    ] as const)
      expect(neighborReducer(run, action, journey, context, pairs.length)).toBe(
        run,
      );
  });
  it("finishes early without counting an unsubmitted pin as an answer or strike", () => {
    const run = { ...startNeighborRun(pairs), pin: { lat: 0, lng: -140 } };
    const finished = neighborReducer(
      run,
      { type: "finish" },
      journey,
      context,
      pairs.length,
    );
    expect(finished).toMatchObject({
      ended: "finished",
      answered: 0,
      correct: 0,
    });
    expect(neighborRunEnded(finished)).toBe(true);
    expect(
      neighborReducer(
        finished,
        { type: "submit" },
        journey,
        context,
        pairs.length,
      ),
    ).toBe(finished);
    expect(neighborRunEnded({ ...run, answered: 5, correct: 2 })).toBe(true);
  });
});
