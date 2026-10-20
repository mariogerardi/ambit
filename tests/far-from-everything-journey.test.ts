import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FAR_FROM_EVERYTHING_JOURNEY as journey } from "../src/game/farFromEverythingJourney";
import {
  JOURNEY_INDEX,
  loadJourney,
  journeyPath,
} from "../src/game/journeyRegistry";
import { answerPlace, pinDistance } from "../src/game/answerTargets";
import { createQuestionContext } from "../src/game/questionPreparation";
import { gameReducer, initialGame } from "../src/game/state";
import { journeyWorld } from "../src/app/journeyWorld";
import type { RegionFeature } from "../src/geography/types";
import type { Action, GameState } from "../src/game/state";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(regions, [], journey);
const at = (roundIndex: number): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex,
});
const reduce = (state: GameState, ...actions: Action[]) =>
  actions.reduce(
    (game, action) => gameReducer(game, action, journey, context),
    state,
  );
const targetAt = (index: number) => {
  const round = journey.rounds[index];
  if (round.rule.type !== "pin-distance")
    throw Error("Expected a distance pin");
  return answerPlace(round, round.rule.targetId)!;
};
const world = (game: GameState) =>
  journeyWorld(regions, journey, game, context);

describe("Far From Everything", () => {
  it("registers a separate unlisted edition without changing the daily pool", async () => {
    expect(
      JOURNEY_INDEX.find((entry) => entry.id === journey.id),
    ).toMatchObject({
      availability: "unlisted",
      path: "/journey/far-from-everything",
    });
    expect(journeyPath(journey.id)).toBe("/journey/far-from-everything");
    expect((await loadJourney(journey.id)).id).toBe(journey.id);
  });

  it("withholds each target and its rings through help, retaining independently useful references", () => {
    for (const [index, round] of journey.rounds.entries()) {
      const target = targetAt(index);
      const start = at(index);
      const hinted = reduce(start, { type: "request-hint" });
      const assisted = reduce(hinted, { type: "request-assist" });
      for (const game of [start, hinted, assisted]) {
        const scene = world(game);
        expect(scene.places.some((p) => p.id === target.id)).toBe(false);
        expect(
          scene.overlays?.some((o) => o.type === "circle" || o.type === "path"),
        ).toBe(false);
        expect(scene.focus).toEqual(round.focus);
        expect(scene.regionInteraction).toBe(false);
        expect(scene.routes).toEqual([]);
        for (const id of round.contextIds!)
          expect(scene.states[id]).toBe("hinted");
        for (const p of scene.places.filter((p) => !p.markerHidden)) {
          expect(p.visualState).toBe("hinted");
          expect(pinDistance(round, { ...game, pin: p })).toBeGreaterThan(
            round.rule.type === "pin-distance" ? round.rule.radiusKm : Infinity,
          );
        }
      }
      const placed = reduce(start, { type: "drop-pin", lat: 0, lng: 0 });
      const withHelp = reduce(
        placed,
        { type: "request-hint" },
        { type: "request-assist" },
      );
      expect(withHelp.pin).toEqual(placed.pin);
    }
    expect(world(at(2)).places.map((p) => p.name)).toEqual([
      "Cape Town",
      "Montevideo",
    ]);
    expect(
      world(reduce(at(1), { type: "request-hint" }, { type: "request-assist" }))
        .overlays,
    ).toEqual([{ id: "ffe:parallel:70", type: "parallel", latitude: 70 }]);
  });

  it("uses inclusive 3/2/1 bands with unchanged accuracy and independent help ceilings", () => {
    for (const [index, round] of journey.rounds.entries()) {
      if (round.rule.type !== "pin-distance")
        throw Error("Expected distance pin");
      const target = targetAt(index);
      expect(round.rule.tiers).toHaveLength(3);
      for (const [bandIndex, band] of round.rule.tiers!.entries()) {
        for (const offset of [0, 0.01]) {
          const km = band.radiusKm + offset;
          const pin = {
            lat: target.lat + ((km / 6371.0088) * 180) / Math.PI,
            lng: target.lng,
          };
          const accuracyPoints =
            offset === 0 ? 3 - bandIndex : Math.max(0, 2 - bandIndex);
          for (const help of ["none", "hinted", "assisted"] as const) {
            let game = at(index);
            if (help !== "none") game = reduce(game, { type: "request-hint" });
            if (help === "assisted")
              game = reduce(game, { type: "request-assist" });
            game = reduce(
              game,
              { type: "drop-pin", ...pin },
              { type: "submit" },
            );
            expect(game.phase).toBe("feedback");
            expect(game.answers.at(-1)).toMatchObject({
              correct: accuracyPoints > 0,
              points: Math.min(
                accuracyPoints,
                help === "none" ? 3 : help === "hinted" ? 2 : 1,
              ),
            });
          }
        }
      }
      const answered = reduce(
        at(index),
        { type: "drop-pin", lat: target.lat, lng: target.lng },
        { type: "submit" },
      );
      expect(
        world(answered)
          .overlays?.filter((o) => o.type === "circle")
          .map((o) => o.radiusKm),
      ).toEqual(round.rule.tiers!.map((b) => b.radiusKm));
    }
  });

  it.each([true, false])(
    "carries canonical discoveries forward after correct=%s and retains actual mistakes in the recap",
    (correct) => {
      let game = at(0);
      for (const [index, round] of journey.rounds.entries()) {
        const target = targetAt(index);
        if (index === 3 || index === 4) {
          const reference = targetAt(index === 3 ? 2 : 0);
          expect(
            world(game).places.filter((p) => p.id === reference.id),
          ).toMatchObject([
            {
              lat: reference.lat,
              lng: reference.lng,
              visualState: "hinted",
              displayRole: "reference",
            },
          ]);
        }
        game = reduce(
          game,
          {
            type: "drop-pin",
            lat: correct ? target.lat : 0,
            lng: correct ? target.lng : index,
          },
          { type: "submit" },
        );
        const feedback = world(game);
        expect(feedback.places.filter((p) => p.id === target.id)).toHaveLength(
          1,
        );
        expect(
          feedback.places.find((p) => p.sourceId === "player")?.visualState,
        ).toBe(correct ? "correct" : "incorrect");
        expect(feedback.places.find((p) => p.id === target.id)).toMatchObject({
          kind: "pin",
          markerRole: "target",
          lat: target.lat,
          lng: target.lng,
        });
        if (index === 4) {
          expect(feedback.places.map((p) => p.name)).toContain(
            "Motu Nui · Rapa Nui group",
          );
          expect(
            feedback.overlays?.filter((o) => o.type === "path"),
          ).toHaveLength(3);
        }
        game = reduce(game, { type: "next" });
        expect(game.answers.find((a) => a.roundId === round.id)?.correct).toBe(
          correct,
        );
      }
      expect(game.phase).toBe("finished");
      const recap = world(game);
      for (let index = 0; index < 5; index++) {
        expect(
          recap.places.filter((p) => p.id === targetAt(index).id),
        ).toMatchObject([{ visualState: "visited" }]);
        if (!correct)
          expect(
            recap.places.find(
              (p) => p.id === `pin:${journey.rounds[index].id}:guess`,
            ),
          ).toMatchObject({ visualState: "incorrect", lat: 0, lng: index });
      }
      expect(recap.routes).toEqual([]);
      expect(recap.overlays?.map((o) => o.type)).toEqual([
        "path",
        "path",
        "path",
      ]);
    },
  );
});
