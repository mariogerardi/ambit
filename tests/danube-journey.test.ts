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
it("keeps the sourced river continuous, preserves branch junctions and reaches actual mouths", () => {
  const source = JSON.parse(
    readFileSync("public/geography/danube-route-source.v1.geojson", "utf8"),
  );
  const sourcePaths: number[][][] = source.features.map(
    (f: { geometry: { coordinates: number[][] } }) => f.geometry.coordinates,
  );
  const stages = [
    "upper",
    "vienna",
    "budapest",
    "gorge",
    "lower",
    "delta",
  ] as const;
  const main = stages.flatMap((stage) =>
    mapContext.segments[stage][0].paths[0].slice(stage === "upper" ? 0 : 1),
  );
  const retainedInOrder = (path: number[][], original: number[][]) => {
    let cursor = -1;
    for (const point of path) {
      cursor = original.findIndex(
        (p, i) => i > cursor && p[0] === point[0] && p[1] === point[1],
      );
      expect(cursor).toBeGreaterThanOrEqual(0);
    }
  };
  retainedInOrder(main, sourcePaths[0]);
  expect(main[0]).toEqual(sourcePaths[0][0]);
  expect(main.at(-1)).toEqual(sourcePaths[0].at(-1));
  for (let i = 1; i < stages.length; i++)
    expect(mapContext.segments[stages[i - 1]][0].paths[0].at(-1)).toEqual(
      mapContext.segments[stages[i]][0].paths[0][0],
    );
  const rendered = [
    main,
    ...mapContext.segments.branches.map((f) => f.paths[0]),
  ];
  for (const [i, feature] of mapContext.segments.branches.entries()) {
    const path = feature.paths[0];
    retainedInOrder(path, sourcePaths[i + 1]);
    expect(path.at(-1)).toEqual(sourcePaths[i + 1].at(-1));
    expect(
      rendered.some(
        (other) =>
          other !== path &&
          other.some((p) => p[0] === path[0][0] && p[1] === path[0][1]),
      ),
    ).toBe(true);
  }
  expect(mapContext.license).toBe("ODbL-1.0");
  expect(readFileSync("public/geography/danube-context.v1.json", "utf8")).toBe(
    readFileSync("src/game/data/danube-context.v1.json", "utf8"),
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
it("keeps borders for the pin and requires named knowledge at the gorge, not tracing polygons", () => {
  const pin = journeyWorld(world, DANUBE_JOURNEY, at(1), context);
  expect(pin.showBorders).toBe(true);
  expect(pin.regionNames).toBe("none");
  expect(pin.places).toEqual([]);
  expect(pin.physicalFeatures.length).toBe(1);
  const gorge = journeyWorld(world, DANUBE_JOURNEY, at(3), context);
  expect(DANUBE_JOURNEY.rounds[3].mode).toBe("choice-multiple");
  expect(DANUBE_JOURNEY.rounds[3].choices?.length).toBe(6);
  expect(gorge.regionInteraction).toBe(false);
  expect(gorge.selectDisabled).toBe(false);
  expect(gorge.regionNames).toBe("none");
  expect(Object.values(gorge.states).every((s) => s === "disabled")).toBe(true);
  expect(gorge.physicalFeatures.some((f) => f.paths?.length)).toBe(true);
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
  expect(city.places.map((p) => p.name)).toEqual(["Budapest"]);
  expect(city.places[0].visualState).toBe("answer");
  expect(city.states["wurl:HUN"]).toBe("disabled");
  expect(DANUBE_JOURNEY.rounds[2].feedbackDiagram?.westBank).toBe("Buda");
  expect(city.physicalFeatures.some((f) => f.paths?.length)).toBe(true);
  expect(city.focus.altitude).toBeGreaterThan(0.1);
  const last = journeyWorld(world, DANUBE_JOURNEY, at(4), context);
  expect(last.physicalFeatures.length).toBe(5);
  expect(last.places).toEqual([]);
  expect(reveal(4).physicalFeatures.map((f) => f.name)).toContain("Black Sea");
  for (let i = 1; i < 5; i++) {
    const current = journeyWorld(world, DANUBE_JOURNEY, at(i), context);
    const previous = journeyWorld(world, DANUBE_JOURNEY, at(i - 1), context);
    expect(current.physicalFeatures.map((f) => f.id)).toEqual(
      expect.arrayContaining(previous.physicalFeatures.map((f) => f.id)),
    );
    expect(
      current.physicalFeatures.some(
        (f) => f.kind === "ocean" || f.id.includes("branch"),
      ),
    ).toBe(false);
    expect(current.physicalFeatures.some((f) => f.name === "Rhine")).toBe(
      false,
    );
  }
  const finished = journeyWorld(
    world,
    DANUBE_JOURNEY,
    { ...at(4), phase: "finished" },
    context,
  );
  expect(finished.physicalFeatures).toEqual(
    DANUBE_JOURNEY.completion?.physicalFeatures,
  );
  expect(finished.places.map((p) => p.name)).toEqual([
    "Danube seepage",
    "Vienna",
    "Budapest",
    "Iron Gates",
    "Danube Delta",
  ]);
  expect(Object.values(finished.states).every((s) => s === "disabled")).toBe(
    true,
  );
});
it("grades the city radius and the gorge’s exact border pair", () => {
  const pin = DANUBE_JOURNEY.rounds[1];
  expect(
    isCorrect(pin, context, { ...initialGame, pin: { lat: 48.5, lng: 16.4 } }),
  ).toBe(true);
  expect(
    isCorrect(pin, context, { ...initialGame, pin: { lat: 47.5, lng: 19 } }),
  ).toBe(false);
  expect(pin.rule).toMatchObject({ radiusKm: 50 });
  // Bratislava is only about 55 km away: do not award a different capital.
  expect(
    isCorrect(pin, context, {
      ...initialGame,
      pin: { lat: 48.1482, lng: 17.1067 },
    }),
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
