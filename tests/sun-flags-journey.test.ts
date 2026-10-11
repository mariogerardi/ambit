import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SUN_FLAGS_JOURNEY } from "../src/game/sunFlagsJourney";
import { JOURNEYS } from "../src/game/journeys";
import {
  JOURNEY_INDEX,
  AVAILABLE_JOURNEY_INDEX,
  loadJourney,
} from "../src/game/journeyRegistry";
import { ACTIVE_JOURNEY_IDS } from "../src/game/journeyRotation";
import { CAPITALS } from "../src/game/quizData";
import { ORIGINAL_SUN_FLAGS_JOURNEY } from "../src/game/sunFlagsOriginalJourney";
import {
  dailyJourney,
  openDaily,
  emptyDaily,
  validDaily,
} from "../src/app/dailyProgress";
import { modeForPath } from "../src/app/modes";
import { COUNTRY_FACTS } from "../src/game/countryFacts";
import { createQuestionContext, isCorrect } from "../src/game/questions";
import { gameReducer, initialGame, journeyScore } from "../src/game/state";
import type { Response } from "../src/game/questions";
import type { Action, GameState } from "../src/game/state";
import type { RegionFeature } from "../src/geography/types";
import { journeyWorld } from "../src/app/journeyWorld";
const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(world, COUNTRY_FACTS, SUN_FLAGS_JOURNEY);

describe("Chasing the sun", () => {
  it("allows both Sun of May countries to be tapped with names hidden until selection", () => {
    const view = journeyWorld(
      world,
      SUN_FLAGS_JOURNEY,
      { ...initialGame, phase: "playing" },
      context,
    );
    expect(view.regionInteraction).toBe(true);
    expect(view.regionNames).toBe("committed");
    expect(view.namedRegionIds).toEqual([]);
    const countries = CAPITALS.filter(
      (capital) => capital.continent === "SA",
    ).map((capital) => capital.countryId);
    expect(countries).toHaveLength(12);
    for (const id of countries) expect(view.states[id]).toBe("hinted");
    expect(view.states["wurl:MEX"]).toBe("disabled");
    expect(new Set(countries.map((id) => view.states[id])).size).toBe(1);
  });
  it("shows known settings, pivots the colonial reveal to Spain, and keeps the Japan pin blind", () => {
    const prepared = (
      roundIndex: number,
      phase: GameState["phase"] = "playing",
      correct = false,
    ) =>
      journeyWorld(
        world,
        SUN_FLAGS_JOURNEY,
        {
          ...initialGame,
          roundIndex,
          phase,
          answers:
            phase === "feedback"
              ? [
                  {
                    ...initialGame,
                    roundId: SUN_FLAGS_JOURNEY.rounds[roundIndex].id,
                    correct,
                  },
                ]
              : [],
        },
        context,
      );
    for (const [index, id] of [
      [1, "wurl:PHL"],
      [2, "wurl:KAZ"],
      [4, "wurl:MWI"],
    ] as const) {
      expect(prepared(index).states[id]).toBe("hinted");
      expect(prepared(index).regionNames).toBe("none");
      expect(prepared(index).focus.lng).toBeCloseTo(
        world.find((r) => r.id === id)!.focus.lng,
        1,
      );
    }
    for (const correct of [false, true]) {
      const spain = prepared(1, "feedback", correct);
      expect(spain.states["wurl:ESP"]).toBe(correct ? "correct" : "answer");
      expect(spain.states["wurl:PHL"]).toBe("disabled");
      expect(spain.focus.lng).toBeCloseTo(-3.66);
      for (const [index, id] of [
        [2, "wurl:KAZ"],
        [4, "wurl:MWI"],
      ] as const) {
        expect(prepared(index, "feedback", correct).states[id]).toBe("hinted");
        expect(
          Object.values(prepared(index, "feedback", correct).states),
        ).not.toContain("correct");
      }
    }
    const japan = prepared(3);
    expect(japan.showBorders).toBe(false);
    expect(japan.states["wurl:JPN"]).toBe("disabled");
    expect(japan.regionNames).toBe("none");
    expect(japan.places).toEqual([]);
    expect(japan.focus).toEqual({ lat: 25, lng: 132, altitude: 1.5 });
  });
  it("plays five distinct stops with history, observation, symbolism and geographic placement", () => {
    const answers: Action[][] = [
      [
        { type: "select", id: "wurl:ARG" },
        { type: "select", id: "wurl:URY" },
        { type: "submit" },
      ],
      [{ type: "select", id: "power:spain" }, { type: "submit" }],
      [{ type: "select", id: "rays:grain" }, { type: "submit" }],
      [{ type: "drop-pin", lat: 35.68, lng: 139.69 }, { type: "submit" }],
      [{ type: "select", id: "dawn:freedom" }, { type: "submit" }],
    ];
    let game: GameState = { ...initialGame, phase: "playing" };
    for (const [index, question] of SUN_FLAGS_JOURNEY.rounds.entries()) {
      expect(question.explanation.length).toBeLessThan(230);
      expect(question.leadIn).toBeTruthy();
      expect(question.choices?.length ?? 0).toBeLessThanOrEqual(6);
      expect(existsSync(`public${question.image!.src}`)).toBe(true);
      for (const action of answers[index])
        game = gameReducer(game, action, SUN_FLAGS_JOURNEY, context);
      expect(game.phase, question.id).toBe("feedback");
      expect(game.answers.at(-1)?.correct, question.id).toBe(true);
      game = gameReducer(game, { type: "next" }, SUN_FLAGS_JOURNEY, context);
    }
    expect(game.phase).toBe("finished");
    expect(journeyScore(game)).toBe(5);
  });
  it("rejects incomplete or wrong country pairs, colonial powers, symbols, and mainland pins", () => {
    for (const [index, response] of [
      [0, { selectedIds: ["wurl:ARG"] }],
      [0, { selectedIds: ["wurl:ARG", "wurl:CHL"] }],
      [1, { selectedIds: ["power:portugal"] }],
      [2, { selectedIds: ["rays:feathers"] }],
      [3, { pin: { lat: 39.9, lng: 116.4 } }],
      [4, { selectedIds: ["dawn:equator"] }],
    ] as [number, Partial<Response>][])
      expect(
        isCorrect(SUN_FLAGS_JOURNEY.rounds[index], context, {
          ...initialGame,
          ...response,
        }),
      ).toBe(false);
    expect(SUN_FLAGS_JOURNEY.rounds[3].map).toMatchObject({
      borders: false,
      hover: false,
      revealOnAnswer: true,
    });
  });
  it("is publishable in Admin without changing existing dates in the automatic rotation", () => {
    expect(JOURNEYS).toContain(SUN_FLAGS_JOURNEY);
    expect(
      JOURNEY_INDEX.find((entry) => entry.id === SUN_FLAGS_JOURNEY.id)?.path,
    ).toBe("/journey/chasing-the-sun");
    expect(ACTIVE_JOURNEY_IDS).not.toContain(SUN_FLAGS_JOURNEY.id);
  });
  it("revises new attempts while preserving the original edition for started saves", async () => {
    const day = "2026-10-11";
    const assignments = { [day]: ORIGINAL_SUN_FLAGS_JOURNEY.id };
    const started = openDaily(
      emptyDaily,
      day,
      false,
      [ORIGINAL_SUN_FLAGS_JOURNEY],
      assignments,
    );
    expect(started.attempts[day].journeyId).toBe(ORIGINAL_SUN_FLAGS_JOURNEY.id);
    expect(dailyJourney(day, undefined, JOURNEY_INDEX, assignments).id).toBe(
      SUN_FLAGS_JOURNEY.id,
    );
    expect(
      openDaily(emptyDaily, day, false, JOURNEY_INDEX, assignments).attempts[
        day
      ].journeyId,
    ).toBe(SUN_FLAGS_JOURNEY.id);
    expect(
      openDaily(started, day, false, JOURNEY_INDEX, assignments).attempts[day]
        .journeyId,
    ).toBe(ORIGINAL_SUN_FLAGS_JOURNEY.id);
    expect(validDaily(started, JOURNEY_INDEX)).toBe(true);
    expect(
      (await loadJourney(ORIGINAL_SUN_FLAGS_JOURNEY.id)).rounds[0].id,
    ).toBe("sun-flags-revolution-month-v1");
    expect(
      AVAILABLE_JOURNEY_INDEX.some(
        (journey) => journey.id === ORIGINAL_SUN_FLAGS_JOURNEY.id,
      ),
    ).toBe(false);
    expect(modeForPath("/")).toBe("home");
  });
});
