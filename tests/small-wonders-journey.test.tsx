// @vitest-environment jsdom
import { readFileSync, existsSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SMALL_WONDERS_JOURNEY as journey } from "../src/game/smallWondersJourney";
import { JOURNEYS } from "../src/game/journeys";
import {
  JOURNEY_INDEX,
  journeyPath,
  loadJourney,
} from "../src/game/journeyRegistry";
import { COUNTRY_FACTS } from "../src/game/countryFacts";
import {
  createQuestionContext,
  canSelect,
} from "../src/game/questionPreparation";
import { canSubmit } from "../src/game/questionEvaluation";
import {
  gameReducer,
  initialGame,
  type Action,
  type GameState,
} from "../src/game/state";
import { journeyWorld } from "../src/app/journeyWorld";
import { GameShell } from "../src/game/GameShell";
import { answerPlace, pinDistance } from "../src/game/answerTargets";
import { initialBearing, pointAlongBearing } from "../src/game/geodesic";
import { journeyPoints } from "../src/game/points";
import { answerPoints } from "../src/game/points";
import { validGame } from "../src/app/dailyProgress";
import { auditJourney } from "../src/game/journeyAudit";
import { validateQuestionContract } from "../src/game/questionBuilder";
import type { RegionFeature } from "../src/geography/types";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(regions, COUNTRY_FACTS, journey);
const play = (roundIndex: number): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex,
});
const reduce = (game: GameState, ...actions: Action[]) =>
  actions.reduce(
    (state, action) => gameReducer(state, action, journey, context),
    game,
  );
const world = (game: GameState) =>
  journeyWorld(regions, journey, game, context);
const shell = (game: GameState) => {
  const node = document.createElement("div");
  node.innerHTML = renderToStaticMarkup(
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
  return node;
};
const select = (id: string): Action => ({ type: "select", id });
const submit: Action = { type: "submit" };
const hint: Action = { type: "request-hint" };
const assist: Action = { type: "request-assist" };

describe("Small Wonders", () => {
  it("registers a fresh five-stop Journey and loads it through its public metadata", async () => {
    expect(JOURNEYS.find((j) => j.id === journey.id)).toBe(journey);
    expect(
      JOURNEY_INDEX.find((j) => j.id === journey.id)?.rounds.map((q) => q.id),
    ).toEqual(journey.rounds.map((q) => q.id));
    expect(journeyPath(journey.id)).toBe("/journey/small-wonders");
    expect((await loadJourney(journey.id)).rounds.map((q) => q.mode)).toEqual([
      "choice-single",
      "city-single",
      "map-multiple",
      "compass-bearing",
      "pin",
    ]);
    expect(
      auditJourney(journey, regions, (path) => existsSync(`public${path}`))
        .errors,
    ).toEqual([]);
  });

  it("grades the quokka explanation without treating the animal's island or Australia as the answer", () => {
    const start = play(0);
    expect(journey.rounds[0].choices).toHaveLength(4);
    expect(world(start).places[0]).toMatchObject({
      name: "Rottnest Island",
      markerHidden: true,
      visualState: "hinted",
    });
    expect(world(start).selectableRegionIds).toEqual([]);
    const answered = reduce(start, select("quokka:foxes"), submit);
    expect(answered.answers.at(-1)).toMatchObject({ correct: true, points: 3 });
    expect(world(answered).states["wurl:AUS"]).toBe("hinted");
    expect(world(answered).places[0].visualState).toBe("hinted");
    const wrong = reduce(start, select("quokka:water"), submit);
    expect(wrong.answers.at(-1)?.correct).toBe(false);
    expect(shell(wrong).textContent).toContain(
      "They haven’t reached Rottnest Island",
    );
    const helped = reduce(start, hint, assist);
    expect(canSelect(journey.rounds[0], context, "quokka:water")).toBe(true);
    expect(journey.rounds[0].guidance!.assist!.text).not.toMatch(
      /fox|keep.*out|threat/i,
    );
    const correct = reduce(helped, select("quokka:foxes"), submit);
    expect(correct.answers.at(-1)).toMatchObject({ correct: true, points: 1 });
  });

  it("shows six anonymous, equal city markers and reveals actual mistaken city picks", () => {
    const start = play(1);
    const view = world(start);
    expect(view.places).toHaveLength(6);
    expect(
      new Set(
        view.places.map((p) => `${p.kind}:${p.markerSize}:${p.visualState}`),
      ).size,
    ).toBe(1);
    expect(view.places.every((p) => p.labelHidden)).toBe(true);
    expect(view.selectableRegionIds).toEqual([]);
    const mexico = "place:3530597";
    const wrong = "place:6173331";
    expect(canSelect(journey.rounds[1], context, mexico)).toBe(true);
    const pending = reduce(start, select(mexico));
    expect(pending.phase).toBe("playing");
    expect(world(pending).places.every((p) => p.labelHidden)).toBe(true);
    const helped = reduce(start, hint, assist);
    expect(world(helped).places).toHaveLength(3);
    expect(world(helped).places.map((p) => p.id)).toContain("place:3995465");
    expect(journey.rounds[1].guidance!.assist!.text).not.toMatch(
      /central Mexico/i,
    );
    expect(world(helped).focus).toEqual(view.focus);
    const answered = reduce(start, select(wrong), submit);
    expect(answered.answers.at(-1)?.correct).toBe(false);
    expect(world(answered).places.find((p) => p.id === mexico)).toMatchObject({
      name: "Mexico City",
      labelHidden: false,
      visualState: "answer",
    });
    expect(world(answered).places.find((p) => p.id === wrong)).toMatchObject({
      name: "Vancouver",
      visualState: "incorrect",
    });
    expect(world(answered).states["wurl:MEX"]).not.toBe("correct");
    expect(world(answered).states["wurl:CAN"]).not.toBe("incorrect");
    // A distant wrong city stays in view; canal detail is supplied by the reveal photo.
    expect(world(answered).focus).toEqual(view.focus);
  });

  it("requires both range countries, keeps references ineligible, and preserves partial mistakes", () => {
    const q = journey.rounds[2],
      start = play(2);
    expect(world(start).selectableRegionIds.sort()).toEqual(
      ["wurl:NPL", "wurl:BTN", "wurl:PAK", "wurl:TJK", "wurl:BGD"].sort(),
    );
    for (const id of ["wurl:IND", "wurl:CHN"])
      expect(canSelect(q, context, id)).toBe(false);
    for (const stage of [start, reduce(start, hint)]) {
      const view = world(stage);
      for (const id of view.selectableRegionIds)
        expect(view.states[id]).toBe("selectable");
      expect(view.states["wurl:IND"]).toBe("disabled");
      expect(view.states["wurl:CHN"]).toBe("disabled");
    }
    expect(q.map?.hoverFeedback).toBe(true);
    const partial = reduce(start, select("wurl:NPL"));
    expect(canSubmit(q, context, partial)).toBe(false);
    const wrong = reduce(partial, select("wurl:BGD"), submit);
    expect(wrong.answers.at(-1)?.correct).toBe(false);
    expect(world(wrong).states["wurl:NPL"]).toBe("correct");
    expect(world(wrong).states["wurl:BTN"]).toBe("answer");
    expect(world(wrong).states["wurl:BGD"]).toBe("incorrect");
    const helped = reduce(start, hint, assist);
    expect(helped.selectedIds).toEqual(["wurl:NPL"]);
    expect(reduce(helped, select("wurl:NPL")).selectedIds).toEqual([
      "wurl:NPL",
    ]);
    expect(
      reduce(helped, select("wurl:BTN"), submit).answers.at(-1),
    ).toMatchObject({ correct: true, points: 1 });
  });

  it.each([
    ["wurl:NPL", "wurl:BGD", 1],
    ["wurl:BTN", "wurl:PAK", 1],
    ["wurl:PAK", "wurl:BGD", 0],
    ["wurl:NPL", "wurl:BTN", 3],
  ])(
    "rewards the independently found countries in %s / %s with %i points",
    (first, second, points) => {
      const game = reduce(play(2), select(first), select(second), submit);
      expect(game.answers.at(-1)).toMatchObject({
        points,
        correct: points === 3,
      });
      expect(journeyPoints(game)).toBe(points);
      const restored = JSON.parse(JSON.stringify(game));
      expect(validGame(restored, journey)).toBe(true);
      expect(journeyPoints(restored)).toBe(points);
      if (points === 1) {
        expect(shell(game).textContent).toContain("One country found.");
        expect(
          shell(game)
            .querySelector(".feedback-point-summary .point-orbs")
            ?.getAttribute("aria-label"),
        ).toBe("1 of 3 points");
        expect(answerPoints({ ...game.answers[0], points: 3 })).toBe(1);
        const invalid = {
          ...restored,
          answers: [
            {
              ...restored.answers[0],
              partialCredit: { matchedId: "wurl:CHN" },
            },
          ],
        };
        expect(validGame(invalid, journey)).toBe(false);
      }
    },
  );

  it("does not award partial credit for the assisted answer or change other country questions", () => {
    const partial = reduce(
      play(2),
      hint,
      select("wurl:BTN"),
      select("wurl:BGD"),
      submit,
    );
    expect(journeyPoints(partial)).toBe(1);
    const assisted = reduce(play(2), hint, assist, select("wurl:BGD"), submit);
    expect(journeyPoints(assisted)).toBe(0);
    expect(assisted.answers[0].partialCredit).toBeUndefined();
    const ordinary = {
      ...journey,
      rounds: [{ ...journey.rounds[2], partialCredit: undefined }],
      completion: undefined,
    };
    const ctx = createQuestionContext(regions, COUNTRY_FACTS, ordinary);
    let state = { ...initialGame, phase: "playing" as const } as GameState;
    for (const action of [select("wurl:NPL"), select("wurl:BGD"), submit])
      state = gameReducer(state, action, ordinary, ctx);
    expect(journeyPoints(state)).toBe(0);
    expect(() =>
      validateQuestionContract({
        ...journey.rounds[0],
        partialCredit: "one-of-two",
      }),
    ).toThrow("partial credit");
  });

  it("supplies both fox comparison locations but withholds all answer routes through help and draft edits", () => {
    const q = journey.rounds[3];
    if (q.rule.type !== "bearing-angle") throw Error("Expected bearing");
    const { origin, destination } = q.rule;
    expect(initialBearing(origin, destination)).toBeCloseTo(329.346481, 5);
    for (const game of [
      play(3),
      reduce(play(3), hint),
      reduce(play(3), hint, assist),
      reduce(play(3), { type: "text", value: "329" }),
    ]) {
      const view = world(game);
      expect(view.places.map((p) => p.id)).toEqual([origin.id, destination.id]);
      expect(
        view.places.every(
          (p) =>
            p.visualState === "hinted" &&
            p.kind === "city" &&
            p.markerSize === 24,
        ),
      ).toBe(true);
      expect(view.overlays).toEqual([]);
      expect(view.selectableRegionIds).toEqual([]);
    }
    const correct = reduce(play(3), { type: "text", value: "329" }, submit);
    expect(correct.answers.at(-1)).toMatchObject({ correct: true, points: 3 });
    const wrong = reduce(play(3), { type: "text", value: "149" }, submit);
    expect(wrong.answers.at(-1)?.correct).toBe(false);
    expect(world(wrong).overlays?.map((o) => o.id)).toEqual([
      `bearing-route:${q.id}`,
      `bearing-guess:${q.id}`,
    ]);
    expect(
      world(wrong).places.find((p) => p.id === destination.id)?.visualState,
    ).toBe("answer");
    expect(
      world(wrong).overlays?.find((o) => o.id.startsWith("bearing-guess:")),
    ).toMatchObject({ type: "path", visualState: "incorrect" });
    expect(shell(wrong).textContent).toContain(
      "shortest path starts north-northwest",
    );
  });

  it("validates destination disclosure as presentation only, preserving hidden-destination defaults", () => {
    const q = journey.rounds[3];
    const concealed = {
      ...journey,
      rounds: [
        { ...q, disclosure: { ...q.disclosure, bearingDestination: false } },
      ],
      completion: undefined,
    };
    const ctx = createQuestionContext(regions, COUNTRY_FACTS, concealed);
    expect(journeyWorld(regions, concealed, play(0), ctx).places).toHaveLength(
      1,
    );
    expect(() =>
      validateQuestionContract({
        ...journey.rounds[0],
        disclosure: {
          ...journey.rounds[0].disclosure,
          bearingDestination: true,
        },
      }),
    ).toThrow("bearing destination disclosure");
  });

  it("hides the penguin target through help, retains the equator, and keeps references outside the accepted pin zone", () => {
    const q = journey.rounds[4];
    if (q.rule.type !== "pin-distance") throw Error("Expected pin");
    const target = answerPlace(q, q.rule.targetId)!;
    for (const game of [
      play(4),
      reduce(play(4), hint),
      reduce(play(4), hint, assist),
    ]) {
      const view = world(game);
      expect(view.overlays).toEqual([
        expect.objectContaining({ type: "parallel", latitude: 0 }),
      ]);
      expect(view.places.some((p) => p.id === target.id)).toBe(false);
      expect(view.regionNames).toBe("none");
      expect(shell(game).textContent).not.toContain("Galápagos Islands");
      expect(shell(game).querySelectorAll(".question-support")).toHaveLength(1);
    }
    const reference = q.guidance!.assist!.places![0];
    expect(pinDistance(q, { ...play(4), pin: reference })).toBeGreaterThan(
      q.rule.radiusKm,
    );
    const answered = reduce(
      play(4),
      { type: "drop-pin", lat: 0, lng: 0 },
      submit,
    );
    const view = world(answered);
    expect(view.places.find((p) => p.id === target.id)).toMatchObject({
      visualState: "answer",
      markerRole: "target",
    });
    expect(view.places.find((p) => p.sourceId === "player")?.visualState).toBe(
      "incorrect",
    );
    expect(
      view.overlays?.some((o) => o.type === "parallel" && o.latitude === 0),
    ).toBe(true);
  });

  it.each([
    // Coast vertices from pinned Natural Earth v5.1.2; see the Journey source notes.
    ["San Cristóbal’s southeastern tip", -1.391697, -89.613271, 3],
    ["Darwin’s northern edge", 1.664374, -92.006093, 2],
  ])(
    "keeps %s within the intended island-group accuracy band",
    (_name, lat, lng, points) => {
      const answered = reduce(play(4), { type: "drop-pin", lat, lng }, submit);
      expect(answered.answers.at(-1)).toMatchObject({ correct: true, points });
    },
  );

  it.each([
    [200, 3],
    [200.01, 2],
    [300, 2],
    [300.01, 1],
    [450, 1],
    [450.01, 0],
  ])("grades the penguin pin at %s km for %s points", (km, points) => {
    const q = journey.rounds[4];
    if (q.rule.type !== "pin-distance") throw Error("Expected pin");
    const target = answerPlace(q, q.rule.targetId)!;
    const pin = pointAlongBearing(target, 0, km / 6371.0088);
    const answered = reduce(play(4), { type: "drop-pin", ...pin }, submit);
    expect(answered.answers.at(-1)).toMatchObject({
      correct: points > 0,
      points,
    });
  });

  it("plays all five controls for 15 points and clears question-specific imagery and geography on advance", () => {
    let game = play(0);
    const answers: Action[][] = [
      [select("quokka:foxes")],
      [select("place:3530597")],
      [select("wurl:NPL"), select("wurl:BTN")],
      [{ type: "text", value: "329" }],
      [{ type: "drop-pin", lat: 0, lng: -90.5 }],
    ];
    for (const [index, actions] of answers.entries()) {
      expect(game.roundIndex).toBe(index);
      const card = shell(game).querySelector(".question-card")!;
      expect(card.querySelectorAll(".journey-photo-clue img")).toHaveLength(
        journey.rounds[index].image!.context ? 2 : 1,
      );
      expect(
        card.querySelector(".journey-photo-clue img")?.getAttribute("src"),
      ).toBe(journey.rounds[index].image!.src);
      game = reduce(game, ...actions, submit);
      expect(game.answers.at(-1)).toMatchObject({ correct: true, points: 3 });
      game = reduce(game, { type: "next" });
      if (index < 4) {
        expect(
          world(game).places.some((p) => p.id === "small-wonders:rottnest"),
        ).toBe(false);
        expect(
          world(game).overlays?.some((o) => o.id.startsWith("bearing-route:")),
        ).toBe(false);
      }
    }
    expect(game.phase).toBe("finished");
    expect(journeyPoints(game)).toBe(15);
    expect(
      shell(game).querySelectorAll(".journey-photo-result img"),
    ).toHaveLength(5);
    const recap = world(game);
    expect(recap.states["wurl:NPL"]).toBe("visited");
    expect(recap.states["wurl:BTN"]).toBe("visited");
    for (const id of [
      "wurl:AUS",
      "wurl:IND",
      "wurl:CHN",
      "wurl:DZA",
      "wurl:GRL",
    ])
      expect(recap.states[id]).toBe("disabled");
    expect(recap.overlays).toEqual([
      expect.objectContaining({ id: "small-wonders:rottnest-coast" }),
    ]);
    for (const id of ["small-wonders:rottnest", "small-wonders:el-oued"])
      expect(recap.places.find((p) => p.id === id)?.visualState).toBe("hinted");
    expect(journey.completion!.focus).toEqual(journey.completion!.views![0]);
    expect(journey.completion!.views).toHaveLength(5);
    expect(shell(game).textContent).toContain(
      "Small Wonders · a wildlife atlas",
    );
    expect(shell(game).textContent).not.toContain(
      "Arrows show broad current directions",
    );
  });

  it("retains actual city, country and ocean-pin mistakes on the authored habitat recap", () => {
    const city = reduce(play(1), select("place:6173331"), submit);
    const countries = reduce(
      play(2),
      select("wurl:NPL"),
      select("wurl:BGD"),
      submit,
    );
    const pin = reduce(play(4), { type: "drop-pin", lat: 0, lng: 0 }, submit);
    const finished: GameState = {
      ...pin,
      phase: "finished",
      answers: [...city.answers, ...countries.answers, ...pin.answers],
    };
    const recap = world(finished);
    expect(recap.states["wurl:BGD"]).toBe("incorrect");
    expect(recap.states["wurl:NPL"]).toBe("visited");
    expect(
      recap.places.find((p) => p.id === "place:6173331")?.visualState,
    ).toBe("incorrect");
    expect(
      recap.places.find((p) => p.id === "place:3530597")?.visualState,
    ).toBe("visited");
    expect(recap.places.find((p) => p.sourceId === "player")).toMatchObject({
      lat: 0,
      lng: 0,
      visualState: "incorrect",
    });
    expect(recap.states["wurl:CAN"]).toBe("disabled");
  });

  it("serves five real local JPEGs, with captions and licenses shown after submission", () => {
    for (const [index, q] of journey.rounds.entries()) {
      const data = readFileSync(`public${q.image!.src}`);
      expect([...data.subarray(0, 3)]).toEqual([255, 216, 255]);
      expect(data.length).toBeGreaterThan(10000);
      expect(q.feedbackImage!.src).toBe(q.image!.src);
      const start = shell(play(index));
      expect(start.querySelector(".journey-feedback-image")).toBeNull();
      expect(start.textContent).not.toContain(q.feedbackImage!.credit.name);
      const revealed = shell({
        ...play(index),
        phase: "feedback",
        selectedIds: [],
        answers: [{ ...initialGame, roundId: q.id, correct: false }],
      });
      expect(
        revealed.querySelector(".journey-feedback-image figcaption")
          ?.textContent,
      ).toContain(q.feedbackImage!.credit.name);
      expect(
        revealed.querySelector(
          `a[href="${q.feedbackImage!.credit.licenseUrl}"]`,
        ),
      ).not.toBeNull();
      for (const image of q.feedbackImages ?? []) {
        expect(existsSync(`public${image.src}`)).toBe(true);
        expect(
          revealed.querySelector(`img[src="${image.src}"]`),
        ).not.toBeNull();
        expect(
          revealed.querySelector(`a[href="${image.credit.url}"]`),
        ).not.toBeNull();
      }
    }
  });

  it("keeps habitat illustrations and currents reveal-only, while showing both fox portraits during play", () => {
    for (const index of [1, 2]) {
      for (const state of [
        play(index),
        reduce(play(index), hint),
        reduce(play(index), hint, assist),
      ]) {
        expect(
          shell(state).querySelector(
            'img[src*="xochimilco"],img[src*="red-panda-range"]',
          ),
        ).toBeNull();
      }
    }
    expect(
      shell(play(3)).querySelector('img[src*="arctic-fox"]'),
    ).not.toBeNull();
    for (const state of [
      play(4),
      reduce(play(4), hint),
      reduce(play(4), hint, assist),
    ]) {
      const scene = world(state);
      expect(scene.places.some((p) => /gal.pagos/i.test(p.name))).toBe(false);
      expect(scene.overlays?.some((o) => o.id.includes("current"))).toBe(false);
    }
    const revealed = world(
      reduce(play(4), { type: "drop-pin", lat: 0, lng: -90.5 }, submit),
    );
    expect(
      revealed.overlays?.filter((o) => o.id.includes("current")),
    ).toHaveLength(2);
    const cityReveal = world(reduce(play(1), select("place:3530597"), submit));
    expect(
      cityReveal.places.find((p) => p.id === "small-wonders:xochimilco"),
    ).toMatchObject({ markerHidden: true, visualState: "hinted" });
  });
});
