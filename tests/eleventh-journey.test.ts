import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { RegionFeature } from "../src/geography/types";
import {
  ELEVENTH_JOURNEY,
  BRAZIL_CITY_TARGETS,
  SOUTH_AFRICA_CAPITAL_TARGETS,
} from "../src/game/eleventhJourney";
import { JOURNEYS, journeyPath } from "../src/game/journeys";
import { createQuestionContext, isCorrect } from "../src/game/questions";
import { ANSWER_PLACES } from "../src/game/answerTargets";
import { gameReducer, initialGame } from "../src/game/state";
import type { Action, GameState } from "../src/game/state";
import { journeyWorld } from "../src/app/journeyWorld";
const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const journey = ELEVENTH_JOURNEY;
const context = createQuestionContext(world, [], journey);
const at = (roundIndex: number): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex,
});
const reduce = (state: GameState, ...actions: Action[]) =>
  actions.reduce((s, a) => gameReducer(s, a, journey, context), state);

describe("not the obvious city", () => {
  it("registers five questions with explicit local city targets", () => {
    expect(JOURNEYS).toContain(journey);
    expect(journeyPath(journey.id)).toBe("/journey/not-the-obvious-city");
    expect(journey.rounds).toHaveLength(5);
    expect(journey.rounds[0].choices).toHaveLength(6);
    for (const q of journey.rounds.filter((q) => q.mode.startsWith("city-"))) {
      expect(q.allowTyping).not.toBe(true);
      expect(q.selection.type === "ids" && q.selection.ids.length).toBe(6);
    }
  });
  it("highlights Turkey without disclosing its two cities until submission, then zooms in", () => {
    const before = journeyWorld(world, journey, at(0), context);
    expect(before.places).toEqual([]);
    expect(before.states["wurl:TUR"]).toBe("hinted");
    expect(before.states["wurl:GRC"]).toBe("disabled");
    expect(before.regionInteraction).toBe(false);
    const selected = reduce(at(0), { type: "select", id: "city:ankara" });
    expect(journeyWorld(world, journey, selected, context).places).toEqual([]);
    const after = journeyWorld(
      world,
      journey,
      reduce(selected, { type: "submit" }),
      context,
    );
    expect(after.states["wurl:TUR"]).toBe("correct");
    expect(after.places.map((p) => p.name)).toEqual(["Ankara", "Istanbul"]);
    expect(after.focus.altitude).toBeLessThan(before.focus.altitude!);
  });
  it("grades Canberra with the 150km tolerance and reveals Sydney and Melbourne only afterward", () => {
    const q = journey.rounds[1],
      target = ANSWER_PLACES.get("place:2172517")!;
    const response = { selectedIds: [], ordered: [], text: "", pin: target };
    expect(isCorrect(q, context, response)).toBe(true);
    expect(
      isCorrect(q, context, {
        ...response,
        pin: { lat: target.lat + 1, lng: target.lng },
      }),
    ).toBe(true);
    expect(
      isCorrect(q, context, {
        ...response,
        pin: ANSWER_PLACES.get("place:2147714")!,
      }),
    ).toBe(false);
    const before = journeyWorld(world, journey, at(1), context);
    expect(before.places).toEqual([]);
    expect(before.regionNames).toBe("none");
    expect(before.borderRegionIds).toEqual(["wurl:AUS"]);
    const after = journeyWorld(
      world,
      journey,
      reduce(
        at(1),
        { type: "drop-pin", lat: target.lat, lng: target.lng },
        { type: "submit" },
      ),
      context,
    );
    expect(after.places.map((p) => p.name)).toEqual([
      "Your pin",
      "Canberra",
      "Sydney",
      "Melbourne",
    ]);
    expect(new Set(after.places.map((p) => p.id)).size).toBe(
      after.places.length,
    );
  });
  it("shows Abuja and Lagos after typed recall without disclosing either beforehand", () => {
    const before = journeyWorld(world, journey, at(2), context);
    expect(before.places).toEqual([]);
    expect(before.states["wurl:NGA"]).toBe("hinted");
    const after = journeyWorld(
      world,
      journey,
      reduce(at(2), { type: "text", value: "Abuja" }, { type: "submit" }),
      context,
    );
    expect(after.places.map((p) => p.name)).toEqual(["Abuja", "Lagos"]);
  });
  it("keeps all Brazilian markers anonymous through hover and highlights Rio only on reveal", () => {
    const before = journeyWorld(world, journey, at(3), context);
    expect(before.places.map((p) => p.id)).toEqual(BRAZIL_CITY_TARGETS);
    expect(
      before.places.every(
        (p) =>
          p.name === "" &&
          p.labelHidden &&
          !p.hoverName &&
          p.visualState === "selectable",
      ),
    ).toBe(true);
    expect(before.regionInteraction).toBe(false);
    const after = journeyWorld(
      world,
      journey,
      reduce(at(3), { type: "select", id: "place:3469058" }),
      context,
    );
    expect(after.places.every((p) => p.name && !p.labelHidden)).toBe(true);
    expect(
      after.places.find((p) => p.name === "Rio de Janeiro")?.visualState,
    ).toBe("hinted");
    expect(after.places.find((p) => p.name === "Brasília")?.visualState).toBe(
      "correct",
    );
    const wrong = journeyWorld(
      world,
      journey,
      reduce(at(3), { type: "select", id: "place:3451190" }),
      context,
    );
    expect(
      wrong.places.find((p) => p.name === "Rio de Janeiro")?.visualState,
    ).toBe("incorrect");
  });
  it("names all six South African cities equally, then reveals the three roles and semantic feedback", () => {
    const before = journeyWorld(world, journey, at(4), context);
    expect(before.places.map((p) => p.name)).toEqual([
      "Pretoria",
      "Cape Town",
      "Bloemfontein",
      "Johannesburg",
      "Durban",
      "Gqeberha",
    ]);
    expect(
      before.places.every(
        (p) => !p.labelHidden && p.visualState === "selectable",
      ),
    ).toBe(true);
    const after = journeyWorld(
      world,
      journey,
      reduce(
        at(4),
        ...SOUTH_AFRICA_CAPITAL_TARGETS.map(
          (id): Action => ({ type: "select", id }),
        ),
        { type: "submit" },
      ),
      context,
    );
    expect(after.places.slice(0, 3).map((p) => p.name)).toEqual([
      "Pretoria · administrative",
      "Cape Town · legislative",
      "Bloemfontein · judicial",
    ]);
    expect(
      after.places.slice(0, 3).every((p) => p.visualState === "correct"),
    ).toBe(true);
    expect(
      after.places.slice(3).every((p) => p.visualState === "disabled"),
    ).toBe(true);
  });
  it("completes the five-round pack through the game engine", () => {
    let s = reduce(
      at(0),
      { type: "select", id: "city:ankara" },
      { type: "submit" },
      { type: "next" },
    );
    const canberra = ANSWER_PLACES.get("place:2172517")!;
    s = reduce(
      s,
      { type: "drop-pin", lat: canberra.lat, lng: canberra.lng },
      { type: "submit" },
      { type: "next" },
    );
    s = reduce(
      s,
      { type: "text", value: "Abuja" },
      { type: "submit" },
      { type: "next" },
    );
    s = reduce(s, { type: "select", id: "place:3469058" }, { type: "next" });
    s = reduce(
      s,
      ...SOUTH_AFRICA_CAPITAL_TARGETS.map(
        (id): Action => ({ type: "select", id }),
      ),
      { type: "submit" },
      { type: "next" },
    );
    expect(s.phase).toBe("finished");
    expect(s.answers).toHaveLength(5);
    expect(s.answers.every((a) => a.correct)).toBe(true);
  });
});
