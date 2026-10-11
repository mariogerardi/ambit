import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { DANUBE_JOURNEY } from "../src/game/danubeJourney";
import { COUNTRY_FACTS } from "../src/game/countryFacts";
import { createQuestionContext, isCorrect } from "../src/game/questions";
import { gameReducer, initialGame, journeyScore } from "../src/game/state";
import { JOURNEY_INDEX } from "../src/game/journeyRegistry";
import { ACTIVE_JOURNEY_IDS } from "../src/game/journeyRotation";
import type { Action, GameState } from "../src/game/state";
import type { RegionFeature } from "../src/geography/types";
import { journeyWorld } from "../src/app/journeyWorld";
import mapContext from "../src/game/data/danube-context.v1.json";
const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(world, COUNTRY_FACTS, DANUBE_JOURNEY);
const at = (roundIndex: number): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex,
});
it("uses reviewed river vertices without fabricating cross-basin connections", () => {
  const physical = JSON.parse(
    readFileSync("public/geography/physical.v1.json", "utf8"),
  );
  expect(mapContext.sourceRevision).toBe(physical.revision);
  const paths: number[][][] = physical.features
    .filter((f: { name: string }) =>
      ["Danube", "Rhine", "Rhein"].includes(f.name),
    )
    .flatMap((f: { paths: number[][][] }) => f.paths);
  const edges = new Set(
    paths.flatMap((path) =>
      path.slice(1).map((point, index) => JSON.stringify([path[index], point])),
    ),
  );
  for (const features of Object.values(mapContext.segments))
    for (const feature of features)
      if ("paths" in feature)
        for (const path of feature.paths)
          for (let i = 1; i < path.length; i++)
            expect(edges.has(JSON.stringify([path[i - 1], path[i]]))).toBe(
              true,
            );
});
it("follows the river through five playable stops, from an underground detour to its delta", () => {
  const answers: Action[][] = [
    [{ type: "select", id: "river:rhine" }, { type: "submit" }],
    [{ type: "drop-pin", lat: 48.208, lng: 16.373 }, { type: "submit" }],
    [{ type: "text", value: "  bUDapest  " }, { type: "submit" }],
    [
      { type: "select", id: "wurl:SRB" },
      { type: "select", id: "wurl:ROU" },
      { type: "submit" },
    ],
    [{ type: "select", id: "sea:black" }, { type: "submit" }],
  ];
  let game: GameState = { ...initialGame, phase: "playing" };
  for (const [index, question] of DANUBE_JOURNEY.rounds.entries()) {
    expect(question.explanation.length).toBeLessThan(230);
    expect(question.leadIn).toBeTruthy();
    expect(question.choices?.length ?? 0).toBeLessThanOrEqual(6);
    for (const action of answers[index])
      game = gameReducer(game, action, DANUBE_JOURNEY, context);
    expect(game.phase, question.id).toBe("feedback");
    expect(game.answers.at(-1)?.correct, question.id).toBe(true);
    game = gameReducer(game, { type: "next" }, DANUBE_JOURNEY, context);
  }
  expect(game.phase).toBe("finished");
  expect(journeyScore(game)).toBe(5);
});
it("makes the gorge countries tappable without exposing their names, and keeps city pin borders", () => {
  const pin = journeyWorld(world, DANUBE_JOURNEY, at(1), context);
  expect(pin.showBorders).toBe(true);
  expect(pin.regionNames).toBe("none");
  expect(pin.places).toEqual([]);
  expect(pin.physicalFeatures).toEqual([]);
  const gorge = journeyWorld(world, DANUBE_JOURNEY, at(3), context);
  expect(gorge.regionInteraction).toBe(true);
  expect(gorge.showBorders).toBe(true);
  expect(gorge.regionNames).toBe("committed");
  for (const id of ["wurl:SRB", "wurl:ROU", "wurl:BGR"])
    expect(gorge.selectDisabled || gorge.states[id] !== "disabled").toBe(true);
  expect(gorge.physicalFeatures.some((f) => f.paths?.length)).toBe(true);
  expect(gorge.namedRegionIds).toEqual([]);
});
it("reveals relevant physical geography without coloring starting context as the answer or leaking later stops", () => {
  const before = journeyWorld(world, DANUBE_JOURNEY, at(0), context);
  expect(before.physicalFeatures.every((f) => f.name === "Danube")).toBe(true);
  expect(
    before.physicalFeatures
      .flatMap((f) => f.paths?.flat() ?? [])
      .every(([lng]) => lng < 12),
  ).toBe(true);
  const reveal = (roundIndex: number) =>
    journeyWorld(
      world,
      DANUBE_JOURNEY,
      {
        ...at(roundIndex),
        phase: "feedback",
        answers: [
          {
            roundId: DANUBE_JOURNEY.rounds[roundIndex].id,
            correct: false,
            selectedIds: [],
            text: "",
            ordered: [],
          },
        ],
      },
      context,
    );
  const opening = reveal(0);
  expect(opening.states["wurl:DEU"]).toBe("disabled");
  expect(opening.physicalFeatures.map((f) => f.name)).toContain("Rhine");
  expect(opening.physicalFeatures.map((f) => f.name)).not.toContain(
    "Black Sea",
  );
  const city = reveal(2);
  expect(city.places.map((p) => p.name)).toEqual(["Buda", "Pest"]);
  expect(city.places[0].lng).toBeLessThan(city.places[1].lng);
  expect(city.physicalFeatures.some((f) => f.paths?.length)).toBe(true);
  expect(city.focus.altitude).toBeLessThan(0.05);
  const last = journeyWorld(world, DANUBE_JOURNEY, at(4), context);
  expect(last.physicalFeatures).toEqual([]);
  expect(last.places).toEqual([]);
  expect(reveal(4).physicalFeatures.map((f) => f.name)).toContain("Black Sea");
});
it("grades the city radius and the gorge’s exact border pair", () => {
  const pin = DANUBE_JOURNEY.rounds[1];
  expect(
    isCorrect(pin, context, { ...initialGame, pin: { lat: 48.5, lng: 16.4 } }),
  ).toBe(true);
  expect(
    isCorrect(pin, context, { ...initialGame, pin: { lat: 47.5, lng: 19 } }),
  ).toBe(false);
  const gorge = DANUBE_JOURNEY.rounds[3];
  expect(
    isCorrect(gorge, context, {
      ...initialGame,
      selectedIds: ["wurl:ROU", "wurl:BGR"],
    }),
  ).toBe(false);
  expect(
    isCorrect(gorge, context, { ...initialGame, selectedIds: ["wurl:ROU"] }),
  ).toBe(false);
  expect(DANUBE_JOURNEY.rounds[0].explanation).not.toContain("Black Sea");
  expect(
    JOURNEY_INDEX.find((journey) => journey.id === DANUBE_JOURNEY.id)?.path,
  ).toBe("/journey/down-the-danube");
  expect(ACTIVE_JOURNEY_IDS).not.toContain(DANUBE_JOURNEY.id);
});
