import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { RegionFeature } from "../src/geography/types";
import {
  ELEVENTH_JOURNEY,
  BRAZIL_CITY_TARGETS,
  SOUTH_AFRICA_CAPITAL_TARGETS,
  SOUTH_AFRICA_CITY_TARGETS,
  TURKEY_ASSIST_CITIES,
} from "../src/game/eleventhJourney";
import { JOURNEYS, journeyPath } from "../src/game/journeys";
import { createQuestionContext, isCorrect } from "../src/game/questions";
import { placeLabelStyle, placeMarkerSize } from "../src/globe/placeLabels";
import { ANSWER_PLACES } from "../src/game/answerTargets";
import { gameReducer, initialGame } from "../src/game/state";
import type { Action, GameState } from "../src/game/state";
import { upgradeDailyAttempt } from "../src/app/dailyProgress";
import { journeyPoints } from "../src/game/points";
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
    expect(journey.rounds.map((q) => q.mode)).toEqual([
      "text",
      "pin",
      "choice-single",
      "city-single",
      "city-multiple",
    ]);
    expect(journey.rounds[2].choices).toHaveLength(4);
    for (const q of journey.rounds.filter((q) => q.mode.startsWith("city-"))) {
      expect(q.selection.type === "ids" && q.selection.ids.length).toBe(
        q.mode === "city-multiple" ? 5 : 6,
      );
    }
  });
  it("highlights Turkey without disclosing its two cities until submission, then zooms in", () => {
    const before = journeyWorld(world, journey, at(0), context);
    expect(before.places).toEqual([]);
    expect(before.states["wurl:TUR"]).toBe("hinted");
    expect(before.states["wurl:GRC"]).toBe("disabled");
    expect(before.regionInteraction).toBe(false);
    const selected = reduce(at(0), { type: "text", value: "Ankara" });
    expect(journeyWorld(world, journey, selected, context).places).toEqual([]);
    const after = journeyWorld(
      world,
      journey,
      reduce(selected, { type: "submit" }),
      context,
    );
    expect(after.states["wurl:TUR"]).toBe("hinted");
    expect(after.places.map((p) => p.name)).toEqual(["Ankara", "Istanbul"]);
    expect(after.places.map((p) => p.visualState)).toEqual([
      "correct",
      "hinted",
    ]);
    expect(after.focus.altitude).toBeLessThan(before.focus.altitude!);
  });
  it("grades Canberra with the 200km tolerance and reveals Sydney and Melbourne only afterward", () => {
    const q = journey.rounds[1],
      target = ANSWER_PLACES.get("place:2172517")!;
    const response = { selectedIds: [], ordered: [], text: "", pin: target };
    expect(isCorrect(q, context, response)).toBe(true);
    expect(
      isCorrect(q, context, {
        ...response,
        pin: { lat: target.lat + 1.7, lng: target.lng },
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
    expect(after.places.find((p) => p.sourceId === "player")).toMatchObject({
      name: "",
      labelHidden: true,
    });
    expect(
      after.places
        .filter((p) => p.sourceId !== "player" && p.markerRole !== "annotation")
        .map((p) => p.name),
    ).toEqual(["Canberra", "Sydney", "Melbourne"]);
    expect(new Set(after.places.map((p) => p.id)).size).toBe(
      after.places.length,
    );
  });
  it("assists recall with three identically styled named city markers", () => {
    const hinted = reduce(
      at(0),
      { type: "text", value: "draft" },
      { type: "request-hint" },
    );
    expect(journeyWorld(world, journey, hinted, context).places).toEqual([]);
    const assisted = reduce(hinted, { type: "request-assist" });
    const cities = journeyWorld(world, journey, assisted, context).places;
    expect(cities).toEqual(TURKEY_ASSIST_CITIES);
    expect(cities.map((p) => p.name)).toEqual(["Ankara", "Konya", "Kayseri"]);
    expect(assisted.text).toBe("draft");
    for (const city of cities) {
      expect(city.kind).toBe("city");
      expect(city.answerTarget).not.toBe(true);
      expect(city.visualState).toBe("hinted");
      expect(city.priority).toBe(90);
      expect(placeMarkerSize(city)).toBe(24);
      expect(placeLabelStyle(city)).toEqual(placeLabelStyle(cities[1]));
      expect(placeLabelStyle(city).shape).toBe("circle");
    }
  });
  it("shows Abuja and Lagos as equal evidence, and grades only the relocation explanation", () => {
    const before = journeyWorld(world, journey, at(2), context);
    expect(before.places.map((p) => p.name)).toEqual(["Abuja", "Lagos"]);
    expect(
      before.places.every(
        (p) => p.kind === "city" && p.visualState === "hinted",
      ),
    ).toBe(true);
    const assisted = reduce(
      at(2),
      { type: "request-hint" },
      { type: "request-assist" },
    );
    for (const choice of journey.rounds[2].choices!) {
      const selected = reduce(at(2), { type: "select", id: choice.id });
      expect(reduce(selected, { type: "submit" }).answers.at(-1)?.correct).toBe(
        choice.id === "abuja:access",
      );
      const narrowed = reduce(assisted, { type: "select", id: choice.id });
      expect(narrowed.selectedIds).toEqual(
        ["abuja:access", "abuja:rivalry"].includes(choice.id)
          ? [choice.id]
          : [],
      );
    }
    const after = journeyWorld(
      world,
      journey,
      reduce(at(2), { type: "select", id: "abuja:access" }, { type: "submit" }),
      context,
    );
    expect(after.places.map((p) => p.name)).toEqual(["Abuja", "Lagos"]);
    expect(after.states["wurl:NGA"]).toBe("hinted");
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
      reduce(
        at(3),
        { type: "select", id: "place:3469058" },
        { type: "submit" },
      ),
      context,
    );
    expect(after.places.every((p) => p.name && !p.labelHidden)).toBe(true);
    expect(
      after.places.find((p) => p.id === "place:3451190")?.visualState,
    ).toBe("hinted");
    expect(
      after.places.find((p) => p.id === "place:3469058")?.visualState,
    ).toBe("correct");
    const wrong = journeyWorld(
      world,
      journey,
      reduce(
        at(3),
        { type: "select", id: "place:3451190" },
        { type: "submit" },
      ),
      context,
    );
    expect(
      wrong.places.find((p) => p.id === "place:3451190")?.visualState,
    ).toBe("incorrect");
  });
  it("offers five named cities with equal markers and accepts exactly the three traditional capitals", () => {
    const before = journeyWorld(world, journey, at(4), context);
    expect(before.places.map((p) => p.id)).toEqual(SOUTH_AFRICA_CITY_TARGETS);
    expect(before.places.map((p) => p.name)).toEqual([
      "Pretoria",
      "Cape Town",
      "Bloemfontein",
      "Johannesburg",
      "Durban",
    ]);
    expect(
      before.places.every(
        (p) =>
          p.kind === "city" && p.visualState === "selectable" && !p.labelHidden,
      ),
    ).toBe(true);
    expect(new Set(before.places.map((p) => placeMarkerSize(p))).size).toBe(1);
    for (let a = 0; a < 3; a++)
      for (let b = a + 1; b < 4; b++)
        for (let c = b + 1; c < 5; c++) {
          const ids = [a, b, c].map(
            (index) => SOUTH_AFRICA_CITY_TARGETS[index],
          );
          const game = reduce(
            at(4),
            ...ids.map((id): Action => ({ type: "select", id })),
            { type: "submit" },
          );
          const correct = ids.every((id) =>
            SOUTH_AFRICA_CAPITAL_TARGETS.includes(id),
          );
          expect(game.answers.at(-1)?.correct).toBe(correct);
          expect(journeyPoints(game)).toBe(correct ? 3 : 0);
        }
    const assisted = reduce(
      at(4),
      { type: "request-hint" },
      { type: "request-assist" },
    );
    const narrowed = journeyWorld(world, journey, assisted, context);
    expect(narrowed.places.map((p) => p.name)).toEqual([
      "Pretoria",
      "Cape Town",
      "Bloemfontein",
      "Johannesburg",
    ]);
    const ignored = reduce(assisted, { type: "select", id: "place:1007311" });
    expect(ignored.selectedIds).toEqual([]);
    const correct = reduce(
      at(4),
      ...SOUTH_AFRICA_CAPITAL_TARGETS.map(
        (id): Action => ({ type: "select", id }),
      ),
      { type: "submit" },
    );
    const after = journeyWorld(world, journey, correct, context);
    expect(
      after.places.slice(0, 3).every((p) => p.visualState === "correct"),
    ).toBe(true);
    expect(after.places.slice(3).every((p) => p.visualState === "hinted")).toBe(
      true,
    );
  });
  it("clears obsolete matching drafts while preserving submitted grades and receipt labels", () => {
    const answers = journey.rounds
      .slice(0, 4)
      .map((q) => ({
        ...initialGame,
        roundId: q.id,
        correct: true,
        points: 3,
        pointsVersion: 1 as const,
      }));
    const attempt = {
      date: "2026-11-03",
      journeyId: journey.id,
      scheduleVersion: 1,
      contentRevision: 1,
      game: {
        ...at(4),
        answers,
        ordered: SOUTH_AFRICA_CAPITAL_TARGETS,
        help: { [journey.rounds[4].id]: "assisted" as const },
      },
    };
    const upgraded = upgradeDailyAttempt(attempt, [journey]);
    expect(upgraded.contentRevision).toBe(2);
    expect(upgraded.game.ordered).toEqual([]);
    expect(upgraded.game.help).toBeUndefined();
    expect(upgraded.game.answers.map((a) => a.correct)).toEqual([
      true,
      true,
      true,
      true,
    ]);
    const completed = upgradeDailyAttempt(
      {
        ...attempt,
        game: {
          ...attempt.game,
          phase: "finished",
          answers: [
            ...answers,
            {
              ...initialGame,
              roundId: journey.rounds[4].id,
              correct: false,
              points: 0,
              pointsVersion: 1,
            },
          ],
        },
      },
      [journey],
    );
    expect(completed.game.answers.at(-1)).toMatchObject({
      correct: false,
      points: 0,
      receiptLabel: "Pretoria, Cape Town & Bloemfontein",
    });
    expect(journeyPoints(completed.game)).toBe(12);
  });
  it("completes the five-round pack through the game engine", () => {
    let s = reduce(
      at(0),
      { type: "text", value: "Ankara" },
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
      { type: "select", id: "abuja:access" },
      { type: "submit" },
      { type: "next" },
    );
    s = reduce(
      s,
      { type: "select", id: "place:3469058" },
      { type: "submit" },
      { type: "next" },
    );
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
    const completion = journeyWorld(world, journey, s, context);
    expect(
      completion.places
        .slice(0, 7)
        .every((p) => p.kind === "city" && p.visualState === "visited"),
    ).toBe(true);
    expect(
      completion.places.slice(7).map((p) => p.name.split(" · ")[0]),
    ).toEqual(["Istanbul", "Sydney", "Melbourne", "Lagos", "Rio de Janeiro"]);
    expect(completion.states["wurl:NGA"]).toBe("visited");
    expect(
      journey.completion!.views!.every((view) => view.altitude! <= 0.5),
    ).toBe(true);
    expect(completion.routes).toEqual([]);
    expect(completion.physicalFeatures).toEqual([]);
    expect(completion.focus).toEqual(journey.completion!.focus);
    expect(journey.completion!.views).toHaveLength(5);
  });
  it("keeps countries as context on every reveal and gives each stop a connection", () => {
    expect(journey.rounds.every((round) => !!round.leadIn)).toBe(true);
    expect(journey.rounds[1].prompt).toContain("Canberra");
    expect(journey.rounds[1].rule).toMatchObject({
      type: "pin-distance",
      radiusKm: 200,
    });
    expect(journey.rounds[1].instruction).not.toContain("km");
    for (let roundIndex = 0; roundIndex < journey.rounds.length; roundIndex++) {
      const round = journey.rounds[roundIndex];
      const game: GameState = {
        ...at(roundIndex),
        phase: "feedback",
        answers: [{ ...initialGame, roundId: round.id, correct: true }],
      };
      const reveal = journeyWorld(world, journey, game, context);
      expect(reveal.states[round.contextIds![0]]).toBe("hinted");
      expect(Object.values(reveal.states)).not.toContain("correct");
      expect(Object.values(reveal.states)).not.toContain("answer");
      expect(round.label).not.toBe("Drop a pin");
    }
  });
});
