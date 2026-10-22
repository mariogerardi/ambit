// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { REGGAETON_JOURNEY as journey } from "../src/game/reggaetonJourney";
import { JOURNEY_INDEX, loadJourney } from "../src/game/journeyRegistry";
import { answerPlace, pinDistance } from "../src/game/answerTargets";
import { createQuestionContext } from "../src/game/questionPreparation";
import { gameReducer, initialGame } from "../src/game/state";
import { journeyPoints } from "../src/game/points";
import { journeyWorld } from "../src/app/journeyWorld";
import { validGame } from "../src/app/daily";
import { upgradeDailyAttempt } from "../src/app/dailyProgress";
import type { DailyAttempt } from "../src/app/dailyProgress";
import { geoDistance } from "d3-geo";
import { EARTH_KM } from "../src/game/spatial";
import { GameShell } from "../src/game/GameShell";
import { auditJourney } from "../src/game/journeyAudit";
import type { Action, GameState } from "../src/game/state";
import type { RegionFeature } from "../src/geography/types";

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
const world = (game: GameState) =>
  journeyWorld(regions, journey, game, context);
const help = (game: GameState) =>
  reduce(game, { type: "request-hint" }, { type: "request-assist" });
const targetAt = (index: number) => {
  const round = journey.rounds[index];
  if (round.rule.type !== "pin-distance")
    throw Error("Expected a distance pin");
  return answerPlace(round, round.rule.targetId)!;
};
const html = (game: GameState) =>
  renderToStaticMarkup(
    <GameShell
      journey={journey}
      context={context}
      game={game}
      dispatch={() => {}}
      webgl
      frame={() => {}}
      onHome={() => {}}
      onStudy={() => {}}
    />,
  );

describe("The Sound of Somewhere: Reggaetón", () => {
  it("loads a registered edition with finite scene cameras and no audio/media dependency", async () => {
    expect(
      JOURNEY_INDEX.find((entry) => entry.id === journey.id),
    ).toMatchObject({
      path: "/journey/the-sound-of-somewhere-reggaeton",
    });
    expect((await loadJourney(journey.id)).id).toBe(journey.id);
    for (const round of journey.rounds) {
      if (round.introViews)
        expect(round.introViews.at(-1)).toEqual(round.focus);
      if (round.feedbackViews)
        expect(round.feedbackViews.at(-1)).toEqual(round.feedbackFocus);
      expect(round.image).toBeUndefined();
    }
    const invalid = {
      ...journey,
      rounds: journey.rounds.map((q, i) =>
        i === 1 ? { ...q, introViews: [{ lat: 91, lng: 0 }] } : q,
      ),
    };
    expect(
      auditJourney(invalid, regions).errors.some(
        (error) => error.includes("Invalid camera") && error.includes("view 1"),
      ),
    ).toBe(true);
  });

  it("asks for Puerto Rico without a locating giveaway, keeping names and San Juan hidden until commitment", () => {
    const start = world(at(0));
    expect(start.regionNames).toBe("none");
    expect(start.showBorders).toBe(true);
    expect(journey.rounds[0].map?.hoverFeedback).toBe(true);
    expect(start.places).toEqual([]);
    expect(start.selectableRegionIds).toContain("wurl:CUB");
    expect(journey.rounds[0].prompt).toBe("Find Puerto Rico on the globe.");
    expect(journey.rounds[0].leadIn).not.toMatch(/Cuba|Hispaniola|east|west/);
    const assisted = world(help(at(0)));
    expect(assisted.states["wurl:PRI"]).toBe("selectable");
    expect(assisted.states["wurl:JAM"]).toBe("disabled");
    const answer = reduce(at(0), { type: "select", id: "wurl:PRI" });
    expect(answer.phase).toBe("feedback");
    expect(answer.answers[0]).toMatchObject({ correct: true, points: 3 });
    expect(world(answer).states["wurl:PRI"]).toBe("correct");
    expect(world(answer).places.some((p) => p.name === "San Juan")).toBe(true);
    const miss = reduce(at(0), { type: "select", id: "wurl:JAM" });
    expect(world(miss).states["wurl:JAM"]).toBe("incorrect");
    expect(world(miss).states["wurl:PRI"]).toBe("answer");
  });

  it("withholds pin targets, canal paths and relocation lines through help, preserving earlier discoveries", () => {
    for (const index of [1]) {
      const round = journey.rounds[index];
      const target = targetAt(index);
      for (const game of [
        at(index),
        reduce(at(index), { type: "request-hint" }),
        help(at(index)),
      ]) {
        const scene = world(game);
        expect(scene.places.some((p) => p.id === target.id)).toBe(false);
        expect(
          scene.overlays?.some((o) => o.type === "path" || o.type === "circle"),
        ).toBe(false);
        expect(
          scene.physicalFeatures.some((f) => f.id === "reggaeton:panama-canal"),
        ).toBe(false);
        expect(scene.regionInteraction).toBe(false);
        for (const p of scene.places.filter((p) => !p.markerHidden))
          expect(pinDistance(round, { ...game, pin: p })).toBeGreaterThan(
            round.rule.type === "pin-distance" ? round.rule.radiusKm : Infinity,
          );
      }
      const placed = reduce(at(index), {
        type: "drop-pin",
        lat: target.lat + 1,
        lng: target.lng,
      });
      expect(help(placed).pin).toEqual(placed.pin);
      const answered = reduce(
        at(index),
        { type: "drop-pin", lat: target.lat, lng: target.lng },
        { type: "submit" },
      );
      const reveal = world(answered);
      expect(reveal.places.filter((p) => p.id === target.id)).toHaveLength(1);
      expect(reveal.overlays?.filter((o) => o.type === "circle")).toHaveLength(
        3,
      );
      if (index === 1)
        expect(
          reveal.physicalFeatures.find((f) => f.id === "reggaeton:panama-canal")
            ?.paths,
        ).toHaveLength(3);
    }
    expect(world(at(4)).places.map((p) => p.name)).toEqual(
      expect.arrayContaining([
        "San Juan",
        "Medellín",
        "Kingston",
        "Colón",
        "New York City",
      ]),
    );
    const round = journey.rounds[1];
    const pacificCity = round.guidance!.assist!.places!.find(
      (p) => p.name === "Panama City",
    )!;
    expect(
      reduce(at(1), { type: "drop-pin", ...pacificCity }, { type: "submit" })
        .answers[0].correct,
    ).toBe(false);
  });

  it("grades every inclusive pin-band edge and applies help ceilings independently", () => {
    for (const index of [1]) {
      const round = journey.rounds[index];
      if (round.rule.type !== "pin-distance") throw Error("Expected pin");
      const target = targetAt(index);
      for (const [bandIndex, band] of round.rule.tiers!.entries())
        for (const offset of [0, 0.01]) {
          const accuracy = Math.max(0, 3 - bandIndex - (offset ? 1 : 0));
          const pin = {
            lat:
              target.lat +
              (((band.radiusKm + offset) / 6371.0088) * 180) / Math.PI,
            lng: target.lng,
          };
          for (const stage of ["none", "hinted", "assisted"] as const) {
            let game = at(index);
            if (stage !== "none") game = reduce(game, { type: "request-hint" });
            if (stage === "assisted")
              game = reduce(game, { type: "request-assist" });
            game = reduce(
              game,
              { type: "drop-pin", ...pin },
              { type: "submit" },
            );
            expect(game.answers.at(-1)).toMatchObject({
              correct: accuracy > 0,
              points: Math.min(
                accuracy,
                stage === "none" ? 3 : stage === "hinted" ? 2 : 1,
              ),
            });
          }
        }
    }
  });

  it("keeps five city candidates equally anonymous while revealing NYC separately from Freeport", () => {
    const ids =
      journey.rounds[2].selection.type === "ids"
        ? journey.rounds[2].selection.ids
        : [];
    for (const game of [
      at(2),
      help(at(2)),
      reduce(at(2), { type: "select", id: "place:5128581" }),
    ]) {
      const markers = world(game).places.filter((p) => ids.includes(p.id));
      expect(markers).toHaveLength(5);
      expect(
        new Set(markers.map((p) => `${p.kind}:${p.markerSize}:${p.priority}`))
          .size,
      ).toBe(1);
      expect(
        markers.every((p) => p.name === "" && p.labelHidden && !p.hoverName),
      ).toBe(true);
      expect(world(game).places.some((p) => p.id === "place:5117949")).toBe(
        false,
      );
    }
    const answer = reduce(
      at(2),
      { type: "select", id: "place:5128581" },
      { type: "submit" },
    );
    expect(answer.answers[0].correct).toBe(true);
    expect(
      world(answer).places.find((p) => p.id === "place:5128581")?.visualState,
    ).toBe("correct");
    expect(
      world(answer).places.find((p) => p.id === "place:5117949"),
    ).toMatchObject({
      name: "Freeport",
      displayRole: "reference",
      visualState: "hinted",
    });
    expect(world(answer).states["wurl:USA"]).toBe("hinted");
  });

  it("connects mainland/island circulation to political geography without grading either place", () => {
    expect(reduce(at(3), { type: "submit" }).phase).toBe("playing");
    expect(journey.rounds[3].choices).toHaveLength(4);
    expect(
      journey.rounds[3].choices?.some(
        (choice) => choice.id === "reggaeton:district",
      ),
    ).toBe(true);
    expect(journey.rounds[3].guidance!.assist!.candidateIds).toHaveLength(2);
    for (const index of [3, 4]) {
      expect(world(at(index)).places.some((p) => p.name === "Freeport")).toBe(
        false,
      );
    }
    const correct = reduce(
      help(at(3)),
      { type: "select", id: "reggaeton:territory" },
      { type: "submit" },
    );
    expect(correct.answers[0]).toMatchObject({ correct: true, points: 1 });
    const wrong = reduce(
      at(3),
      { type: "select", id: "reggaeton:state" },
      { type: "submit" },
    );
    expect(wrong.answers[0]).toMatchObject({ correct: false, points: 0 });
    expect(world(wrong).states["wurl:PRI"]).toBe("hinted");
    expect(
      world(wrong).places.find((p) => p.name === "San Juan")?.visualState,
    ).toBe("hinted");
    const review = html(wrong);
    expect(review).toContain("A U.S. state");
    expect(review).toContain("Gasolina");
    expect(world(wrong).states["wurl:USA"]).toBe("hinted");
  });

  it("gives both finale cities and asks for geodesic scale, with no hidden destination or location grading", () => {
    const round = journey.rounds[4];
    expect(round.mode).toBe("slider");
    expect(round.rule).toMatchObject({ type: "numeric-range", value: 1700 });
    const scene = world(at(4));
    const origin = scene.places.find((p) => p.name === "San Juan")!;
    const destination = scene.places.find((p) => p.name === "Medellín")!;
    expect(origin.visualState).toBe("hinted");
    expect(destination.visualState).toBe("hinted");
    const km =
      geoDistance(
        [origin.lng, origin.lat],
        [destination.lng, destination.lat],
      ) * EARTH_KM;
    expect(Math.round(km / 100) * 100).toBe(1700);
    expect(scene.overlays).toEqual([]);
    expect(scene.physicalFeatures).toEqual([]);
    expect(world(help(at(4))).overlays).toMatchObject([
      {
        type: "circle",
        radiusKm: 1000,
        center: { lat: origin.lat, lng: origin.lng },
      },
    ]);
    for (const correct of [true, false]) {
      const game = reduce(
        at(4),
        {
          type: "text",
          value: correct ? "1700" : "500",
        },
        { type: "submit" },
      );
      expect(game.answers.at(-1)).toMatchObject({
        correct,
        points: correct ? 3 : 0,
      });
      const reveal = world(game);
      expect(
        reveal.places.find((p) => p.id === destination.id)?.visualState,
      ).toBe("hinted");
      expect(reveal.places.some((p) => p.kind === "pin")).toBe(false);
      expect(reveal.overlays).toMatchObject([
        {
          type: "path",
          coordinates: [
            [origin.lng, origin.lat],
            [destination.lng, destination.lat],
          ],
        },
      ]);
      expect(reveal.states["wurl:COL"]).toBe("hinted");
      expect(reveal.physicalFeatures).toEqual([]);
      expect(reveal.places.some((p) => p.name === "Freeport")).toBe(false);
      expect(html(game)).toContain("Your estimate:");
      expect(html(game)).toContain("Estimate accuracy bands");
      expect(html(game).indexOf('class="estimate-review"')).toBeLessThan(
        html(game).indexOf('class="feedback-point-summary"'),
      );
      expect(html(game).match(/class="estimate-review"/g)).toHaveLength(1);
      expect(html(game)).not.toContain('type="range"');
      expect(html(game)).not.toContain("Drop a pin");
    }
    const helped = reduce(
      help(at(4)),
      { type: "text", value: "1700" },
      { type: "submit" },
    );
    expect(helped.answers.at(-1)?.points).toBe(1);
  });

  it("upgrades old attempts without regrading results or retaining obsolete drafts", () => {
    const old: DailyAttempt = {
      date: "2026-10-19",
      journeyId: journey.id,
      scheduleVersion: 1,
      contentRevision: 1,
      game: {
        ...at(4),
        pin: { lat: 6, lng: -75 },
        help: { [journey.rounds[4].id]: "assisted" },
        answers: journey.rounds.slice(0, 4).map((round, index) => ({
          ...initialGame,
          roundId: round.id,
          selectedIds:
            index === 0
              ? ["wurl:JAM"]
              : index === 2
                ? ["place:5128581"]
                : index === 3
                  ? ["reggaeton:obscenity", "reggaeton:incitement"]
                  : [],
          ...(index === 1 ? { pin: { lat: 9.36025, lng: -79.90019 } } : {}),
          correct: true,
          points: index === 0 ? 2 : 3,
          pointsVersion: 1 as const,
        })),
      },
    };
    const snapshot = JSON.stringify(old);
    const current = upgradeDailyAttempt(old, JOURNEY_INDEX);
    expect(JSON.stringify(old)).toBe(snapshot);
    expect(current.contentRevision).toBe(3);
    expect(current.game.pin).toBeUndefined();
    expect(current.game.help).toBeUndefined();
    expect(current.game.answers[0]).toMatchObject({
      correct: true,
      points: 2,
      selectedIds: ["wurl:JAM"],
      receiptLabel: "Jamaica · Kingston",
    });
    const choiceDraft: DailyAttempt = {
      ...old,
      contentRevision: 2,
      game: {
        ...old.game,
        pin: undefined,
        selectedIds: ["reggaeton:move-1700"],
        answers: old.game.answers.map((answer, index) => ({
          ...answer,
          receiptLabel: journey.rounds[index].resolvedLabel,
        })),
      },
    };
    const upgradedChoice = upgradeDailyAttempt(choiceDraft, JOURNEY_INDEX);
    expect(upgradedChoice.contentRevision).toBe(3);
    expect(upgradedChoice.game.selectedIds).toEqual([]);
    expect(upgradedChoice.game.text).toBe("");
    expect(upgradedChoice.game.help).toBeUndefined();
    expect(upgradedChoice.game.answers).toEqual(choiceDraft.game.answers);
    const completed: DailyAttempt = {
      ...old,
      game: {
        ...old.game,
        phase: "finished",
        answers: journey.rounds.map((q, index) => ({
          ...initialGame,
          roundId: q.id,
          correct: true,
          points: index === 4 ? 1 : 3,
          pointsVersion: 1,
        })),
      },
    };
    const historical = upgradeDailyAttempt(completed, JOURNEY_INDEX);
    expect(historical.game.phase).toBe("finished");
    expect(journeyPoints(historical.game)).toBe(13);
    expect(historical.game.answers.at(-1)?.points).toBe(1);
    expect(historical.game.answers.at(-1)?.receiptLabel).toBe(
      "Medellín · the Colombian scene",
    );
  });

  it.each([true, false])(
    "retains actual responses, discoveries and mistakes across a complete correct=%s saved run",
    (correct) => {
      let game = at(0);
      game = reduce(
        game,
        { type: "select", id: correct ? "wurl:PRI" : "wurl:JAM" },
        { type: "next" },
      );
      game = reduce(
        game,
        {
          type: "drop-pin",
          lat: correct ? targetAt(1).lat : 9,
          lng: correct ? targetAt(1).lng : -81,
        },
        { type: "submit" },
        { type: "next" },
      );
      game = reduce(
        game,
        { type: "select", id: correct ? "place:5128581" : "place:5110629" },
        { type: "submit" },
        { type: "next" },
      );
      game = reduce(
        game,
        {
          type: "select",
          id: correct ? "reggaeton:territory" : "reggaeton:independent",
        },
        { type: "submit" },
        { type: "next" },
      );
      expect(
        world(game).places.find((p) => p.name === "San Juan")?.visualState,
      ).toBe("hinted");
      game = reduce(
        game,
        {
          type: "text",
          value: correct ? "1700" : "500",
        },
        { type: "submit" },
        { type: "next" },
      );
      expect(game.phase).toBe("finished");
      expect(journeyPoints(game)).toBe(correct ? 15 : 0);
      expect(validGame(JSON.parse(JSON.stringify(game)), journey)).toBe(true);
      const recap = world(game);
      for (const name of [
        "Kingston",
        "Colón",
        "New York City",
        "San Juan",
        "Medellín",
      ])
        expect(recap.places.filter((p) => p.name === name)).toMatchObject([
          { visualState: "visited" },
        ]);
      if (!correct) {
        expect(recap.states["wurl:JAM"]).toBe("incorrect");
        expect(
          recap.places.find((p) => p.id === "place:5110629")?.visualState,
        ).toBe("incorrect");
        expect(
          recap.places
            .filter((p) => p.sourceId === "player")
            .every((p) => p.visualState === "incorrect"),
        ).toBe(true);
        expect(
          recap.places.filter((p) => p.sourceId === "player"),
        ).toHaveLength(1);
      }
      expect(recap.places.some((p) => p.name === "Freeport")).toBe(false);
      expect(recap.routes).toEqual([]);
      expect(recap.overlays).toHaveLength(1);
    },
  );
});
