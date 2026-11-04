import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { geoDistance } from "d3-geo";
import { NOT_FROM_HERE_JOURNEY as journey } from "../src/game/notFromHereJourney";
import { createQuestionContext } from "../src/game/questionPreparation";
import {
  gameReducer,
  initialGame,
  type Action,
  type GameState,
} from "../src/game/state";
import { journeyWorld } from "../src/app/journeyWorld";
import { validGame } from "../src/app/dailyProgress";
import { journeyPoints, submittedPoints } from "../src/game/points";
import { answerPlace } from "../src/game/answerTargets";
import { initialBearing, pointAlongBearing } from "../src/game/geodesic";
import type { RegionFeature } from "../src/geography/types";

const regions: RegionFeature[] = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
);
const context = createQuestionContext(regions, [], journey);
const round = (subject: string) =>
  journey.rounds.find((q) => q.id.endsWith(subject))!;
const play = (subject: string): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex: journey.rounds.indexOf(round(subject)),
});
const step = (game: GameState, ...actions: Action[]) =>
  actions.reduce(
    (state, action) => gameReducer(state, action, journey, context),
    game,
  );
const view = (game: GameState) => journeyWorld(regions, journey, game, context);
const select = (id: string): Action => ({ type: "select", id });
const submit: Action = { type: "submit" };
const help: Action[] = [{ type: "request-hint" }, { type: "request-assist" }];

describe("Not From Here handoff integration", () => {
  it("keeps country answers undisclosed until help and grades/saves open-world partial pairs", () => {
    for (const subject of ["kiwifruit", "potatoes"]) {
      const world = view(play(subject));
      expect(world.places).toEqual([]);
      expect(new Set(Object.values(world.states))).toEqual(
        new Set(["surface"]),
      );
      expect(world.overlays).toEqual([]);
    }
    const assisted = view(step(play("potatoes"), ...help));
    for (const id of ["wurl:PER", "wurl:BOL", "wurl:CHL", "wurl:ECU"])
      expect(assisted.states[id]).toBe("selectable");
    for (const [ids, points] of [
      [["wurl:PER", "wurl:BOL"], 3],
      [["wurl:BOL", "wurl:PER"], 3],
      [["wurl:PER", "wurl:CHL"], 1],
      [["wurl:BOL", "wurl:ECU"], 1],
      [["wurl:CHL", "wurl:ECU"], 0],
    ] as const) {
      const game = step(play("potatoes"), ...ids.map(select), submit);
      expect(game.answers.at(-1)).toMatchObject({
        correct: points === 3,
        points,
      });
      const restored = JSON.parse(JSON.stringify(game));
      expect(validGame(restored, journey)).toBe(true);
      expect(journeyPoints(restored)).toBe(points);
      const world = view(restored);
      for (const id of ids)
        expect(world.states[id]).toBe(
          ["wurl:PER", "wurl:BOL"].includes(id) ? "correct" : "incorrect",
        );
      expect(
        world.places.find((p) => p.name === "Lake Titicaca"),
      ).toBeDefined();
    }
    const partial = step(
      play("potatoes"),
      ...help,
      select("wurl:PER"),
      select("wurl:CHL"),
      submit,
    );
    expect(journeyPoints(partial)).toBe(1);
    const q = round("potatoes");
    expect(
      submittedPoints(
        { ...q, selection: { type: "world", excludeIds: ["wurl:PER"] } },
        partial,
        false,
      ),
    ).toBe(0);
    expect(
      submittedPoints({ ...q, contextIds: ["wurl:PER"] }, partial, false),
    ).toBe(0);
    expect(
      submittedPoints({ ...q, partialCredit: undefined }, partial, false),
    ).toBe(0);
  });

  it("keeps equally styled ports anonymous through pending selections and names actual misses on reveal", () => {
    const start = play("coffee");
    for (const game of [
      start,
      step(start, select("place:78751")),
      step(start, ...help),
    ]) {
      const ports = view(game).places;
      expect(ports.every((p) => !p.name && !p.hoverName && p.labelHidden)).toBe(
        true,
      );
      expect(new Set(ports.map((p) => p.markerSize)).size).toBe(1);
      expect(ports.map((p) => p.markerBadge)).toEqual(
        game.help?.[round("coffee").id] === "assisted"
          ? ["B", "C"]
          : ["A", "B", "C"],
      );
    }
    for (const id of ["place:105343", "place:415189", "place:78751"]) {
      const game = step(start, select(id), submit);
      const world = view(game);
      expect(world.places.map((p) => p.name)).toEqual([
        "Jeddah",
        "Mocha",
        "Aden",
      ]);
      expect(world.places.find((p) => p.id === id)?.visualState).toBe(
        id === "place:78751" ? "correct" : "incorrect",
      );
      expect(
        world.places.find((p) => p.id === "place:78751")?.visualState,
      ).toBe(id === "place:78751" ? "correct" : "answer");
      expect(view(step(game, { type: "next" })).places).toEqual([]);
    }
  });

  it("hides Réunion through assistance and awards each inclusive distance band, including sea pins", () => {
    const q = round("vanilla");
    if (q.rule.type !== "pin-distance") throw Error("Expected distance pin");
    const target = answerPlace(q, q.rule.targetId)!;
    expect(view(play("vanilla")).places).toEqual([]);
    const references = view(step(play("vanilla"), ...help)).places;
    expect(references.map((p) => p.name)).toEqual(["Mauritius"]);
    expect(
      geoDistance(
        [target.lng, target.lat],
        [references[0].lng, references[0].lat],
      ) * 6371.0088,
    ).toBeGreaterThan(90);
    for (const [km, points] of [
      [25, 3],
      [25.001, 2],
      [50, 2],
      [50.001, 1],
      [90, 1],
      [90.001, 0],
    ]) {
      const pin = pointAlongBearing(target, 90, km / 6371.0088);
      const game = step(play("vanilla"), { type: "drop-pin", ...pin }, submit);
      expect(game.answers.at(-1)).toMatchObject({
        correct: points > 0,
        points,
      });
      const world = view(game);
      expect(world.places.find((p) => p.id === target.id)).toMatchObject({
        name: "Réunion",
        markerHidden: false,
        labelHidden: false,
        visualState: "answer",
      });
      expect(
        world.places.find((p) => p.id.endsWith(":guess"))?.visualState,
      ).toBe(points ? "correct" : "incorrect");
    }
  });

  it("withholds the bearing route through assistance and retains mistakes in the independent-history recap", () => {
    const q = round("rubber");
    if (q.rule.type !== "bearing-angle") throw Error("Expected bearing");
    expect(initialBearing(q.rule.origin, q.rule.destination)).toBeCloseTo(
      32.46,
      2,
    );
    for (const game of [play("rubber"), step(play("rubber"), ...help)]) {
      const world = view(game);
      expect(world.places.map((p) => p.name)).toEqual(["Santarém", "London"]);
      expect(world.overlays).toEqual([]);
    }
    const answers = [
      step(play("kiwifruit"), select("wurl:JPN")),
      step(play("potatoes"), select("wurl:CHL"), select("wurl:PER"), submit),
      step(play("coffee"), select("place:415189"), submit),
      step(play("vanilla"), { type: "drop-pin", lat: 0, lng: 0 }, submit),
      step(play("rubber"), { type: "text", value: "180" }, submit),
    ].flatMap((g) => g.answers);
    const recap = view({ ...play("rubber"), phase: "finished", answers });
    expect(recap.states["wurl:JPN"]).toBe("incorrect");
    expect(recap.states["wurl:CHL"]).toBe("incorrect");
    expect(recap.places.find((p) => p.id === "place:415189")?.visualState).toBe(
      "incorrect",
    );
    expect(
      recap.places.some((p) => p.id === "not-from-here:recap:vanilla-reunion"),
    ).toBe(true);
    expect(
      recap.places.some(
        (p) => p.id.endsWith(":guess") && p.visualState === "incorrect",
      ),
    ).toBe(true);
    for (const [value, points] of [
      ["32", 3],
      ["45", 2],
      ["60", 1],
      ["180", 0],
    ] as const) {
      const game = step(play("rubber"), { type: "text", value }, submit);
      expect(game.answers.at(-1)).toMatchObject({
        correct: points > 0,
        points,
      });
      expect(
        view(game).overlays?.some((o) => o.id.startsWith("bearing-route:")),
      ).toBe(true);
    }
  });
});
