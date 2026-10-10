import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EIGHTH_JOURNEY as journey } from "../src/game/eighthJourney";
import {
  ANSWER_PLACES,
  answerPlace,
  cityIdForName,
  pinDistance,
} from "../src/game/answerTargets";
import {
  canSubmit,
  createQuestionContext,
  isCorrect,
  solutionIds,
} from "../src/game/questions";
import type { Question } from "../src/game/questions";
import type { RegionFeature } from "../src/geography/types";
import { gameReducer, initialGame } from "../src/game/state";
import { journeyWorld } from "../src/app/journeyWorld";
import { validGame } from "../src/app/daily";
import { SurfaceGesture } from "../src/globe/gesture";
const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(regions, [], journey);
const response = { selectedIds: [], ordered: [], text: "" };
const at = (roundIndex: number) => ({
  ...initialGame,
  phase: "playing" as const,
  roundIndex,
});
const [distance, city, inside, multiple] = journey.rounds;
const target = answerPlace(distance, solutionIds(distance, context)[0])!;
describe("pins and cities remain playable without the authoring tool", () => {
  it("requires a finite in-range pin and grades distance independently of any country", () => {
    expect(canSubmit(distance, context, response)).toBe(false);
    for (const pin of [
      { lat: NaN, lng: 0 },
      { lat: 91, lng: 0 },
      { lat: 0, lng: 181 },
    ])
      expect(canSubmit(distance, context, { ...response, pin })).toBe(false);
    expect(pinDistance(distance, { ...response, pin: target })).toBe(0);
    expect(isCorrect(distance, context, { ...response, pin: target })).toBe(
      true,
    );
    expect(
      isCorrect(distance, context, {
        ...response,
        pin: { lat: target.lat + 3, lng: target.lng },
      }),
    ).toBe(false);
    let state = gameReducer(
      at(0),
      { type: "drop-pin", lat: target.lat + 3, lng: target.lng },
      journey,
      context,
    );
    expect(state.phase).toBe("playing");
    state = gameReducer(
      state,
      { type: "drop-pin", lat: target.lat, lng: target.lng },
      journey,
      context,
    );
    state = gameReducer(state, { type: "submit" }, journey, context);
    expect(state.answers[0].correct).toBe(true);
    expect(validGame(JSON.parse(JSON.stringify(state)), journey)).toBe(true);
    expect(journeyWorld(regions, journey, at(0), context).places).toEqual([]);
    expect(
      journeyWorld(regions, journey, state, context).places.some(
        (p) => p.name === "Your pin",
      ),
    ).toBe(true);
  });
  it("accepts any New Mexico land point but rejects points outside its polygon", () => {
    expect(
      isCorrect(inside, context, { ...response, pin: { lat: 34, lng: -106 } }),
    ).toBe(true);
    expect(
      isCorrect(inside, context, {
        ...response,
        pin: { lat: 34.8, lng: -105 },
      }),
    ).toBe(true);
    expect(
      isCorrect(inside, context, { ...response, pin: { lat: 34, lng: -112 } }),
    ).toBe(false);
    expect(
      isCorrect(inside, context, { ...response, pin: { lat: 0, lng: 0 } }),
    ).toBe(false);
    expect(journeyWorld(regions, journey, at(2), context).showBorders).toBe(
      false,
    );
  });
  it("accepts city markers and normalized names but never treats a country as the city's answer", () => {
    expect(
      isCorrect(city, context, { ...response, selectedIds: ["place:2988507"] }),
    ).toBe(true);
    expect(
      isCorrect(city, context, { ...response, selectedIds: ["wurl:FRA"] }),
    ).toBe(false);
    expect(cityIdForName(city, "PARIS")).toBe("place:2988507");
    expect(ANSWER_PLACES.get("place:2988507")?.name).toBe("Paris");
    expect(
      journeyWorld(regions, journey, at(1), context).places.every(
        (p) => p.labelHidden,
      ),
    ).toBe(true);
    const state = gameReducer(
      at(1),
      { type: "select", id: "place:2988507" },
      journey,
      context,
    );
    expect(state.phase).toBe("feedback");
    expect(state.answers[0].correct).toBe(true);
    expect(
      journeyWorld(regions, journey, state, context).places.every(
        (p) => !p.labelHidden,
      ),
    ).toBe(true);
    expect(
      gameReducer(at(1), { type: "select", id: "wurl:FRA" }, journey, context),
    ).toEqual(at(1));
  });
  it("grades the full city set and requires submission before reveal", () => {
    const ids = solutionIds(multiple, context);
    expect(ids).toHaveLength(3);
    expect(
      isCorrect(multiple, context, { ...response, selectedIds: ids }),
    ).toBe(true);
    expect(
      canSubmit(multiple, context, {
        ...response,
        selectedIds: ids.slice(0, 2),
      }),
    ).toBe(false);
    let state = at(3);
    for (const id of ids)
      state = gameReducer(
        state,
        { type: "select", id },
        journey,
        context,
      ) as typeof state;
    expect(state.phase).toBe("playing");
    expect(
      gameReducer(state, { type: "submit" }, journey, context).answers[0]
        .correct,
    ).toBe(true);
  });
  it("rejects missing targets, invalid distances and incompatible answer modes", () => {
    for (const q of [
      {
        ...distance,
        rule: { type: "pin-distance", targetId: "unknown", radiusKm: 100 },
      },
      {
        ...distance,
        rule: { type: "pin-distance", targetId: target.id, radiusKm: -1 },
      },
      {
        ...inside,
        importedRegions: [],
        rule: { type: "pin-inside", ids: ["missing"] },
      },
      {
        ...city,
        selection: { type: "ids", ids: ["missing", "place:2988507"] },
      },
      { ...city, mode: "map-single" },
      { ...inside, commitment: "immediate" },
    ] as Question[])
      expect(() =>
        createQuestionContext(
          regions,
          [],
          { id: "test", title: "Pin test", description: "", rounds: [q] },
          context,
        ),
      ).toThrow();
  });
  it("keeps drags and pinches from committing pins", () => {
    const gesture = new SurfaceGesture();
    gesture.down(1, 0, 0);
    gesture.up(1, 9, 0);
    expect(gesture.consume()).toBe(false);
    gesture.down(1, 0, 0);
    gesture.down(2, 1, 1);
    gesture.up(1, 0, 0);
    gesture.up(2, 1, 1);
    expect(gesture.consume()).toBe(false);
    gesture.down(1, 0, 0);
    gesture.up(1, 2, 3);
    expect(gesture.consume()).toBe(true);
    expect(gesture.consume()).toBe(false);
  });
});
