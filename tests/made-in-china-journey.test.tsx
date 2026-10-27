// @vitest-environment jsdom
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  MADE_IN_CHINA_JOURNEY as journey,
  MADE_IN_CHINA_WALL_ANSWERS,
  MADE_IN_CHINA_WALL_CANDIDATES,
  MADE_IN_CHINA_WALL_REGIONS,
} from "../src/game/madeInChinaJourney";
import { journeyWorld } from "../src/app/journeyWorld";
import { auditJourney } from "../src/game/journeyAudit";
import { answerPlace, pinDistance } from "../src/game/answerTargets";
import { pointAlongBearing } from "../src/game/geodesic";
import { journeyPoints } from "../src/game/points";
import media from "../src/game/data/made-in-china-media.v1.json";
import {
  createQuestionContext,
  canSubmit,
  isCorrect,
  solutionIds,
} from "../src/game/questions";
import { validateQuestionContract } from "../src/game/questionBuilder";
import {
  gameReducer,
  initialGame,
  type Action,
  type GameState,
} from "../src/game/state";
import { validGame } from "../src/app/dailyProgress";
import { correctAnswerSummary } from "../src/game/copy";
import { GameShell } from "../src/game/GameShell";
import { JOURNEY_INDEX } from "../src/game/journeyRegistry";
import type { RegionFeature } from "../src/geography/types";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
// Direct-module fixture: no catalog registration or generated metadata changes.
const question = journey.rounds[3];
const draft = {
  id: "made-in-china-draft",
  title: "Made in China",
  description: "Chronology prototype",
  rounds: [question],
};
const context = createQuestionContext(regions, [], draft);
const expected = solutionIds(question, context);
const start = (): GameState => ({ ...initialGame, phase: "playing" });
const reduce = (game: GameState, ...actions: Action[]) =>
  actions.reduce(
    (state, action) => gameReducer(state, action, draft, context),
    game,
  );
const place = (ordered: string[], game = start()) =>
  reduce(
    game,
    ...ordered.map((id, index): Action => ({ type: "order-card", id, index })),
  );

describe("Made in China chronology prototype", () => {
  it("grades arbitrary landmark cards by chronology, not the set or tray order", () => {
    const cards = question.choices!.map(({ id }) => id);
    let correct = 0;
    for (const a of cards)
      for (const b of cards.filter((id) => id !== a))
        for (const c of cards.filter((id) => id !== a && id !== b)) {
          const d = cards.find((id) => ![a, b, c].includes(id))!;
          const game = place([a, b, c, d]);
          expect(canSubmit(question, context, game)).toBe(true);
          const result = reduce(game, { type: "submit" });
          const ordered = [a, b, c, d].every(
            (id, index) => id === expected[index],
          );
          expect(result.answers[0]).toMatchObject({
            correct: ordered,
            points: ordered ? 3 : 0,
          });
          correct += Number(ordered);
        }
    expect(correct).toBe(1);
    for (const ordered of [
      [],
      expected.slice(1),
      [...expected, expected[0]],
      [expected[0], expected[0], ...expected.slice(2)],
      ["unknown", ...expected.slice(1)],
    ]) {
      expect(canSubmit(question, context, { ...start(), ordered })).toBe(false);
      expect(isCorrect(question, context, { ...start(), ordered })).toBe(false);
    }
    expect(() =>
      validateQuestionContract({
        ...question,
        rule: { type: "choice-ids", ids: expected },
      }),
    ).toThrow("ordered grading");
  });

  it("locks the earliest landmark, preserves other cards, and restores frozen rewards", () => {
    const hinted = reduce(
      place(expected),
      { type: "request-hint" },
      { type: "submit" },
    );
    expect(hinted.answers[0]).toMatchObject({ correct: true, points: 2 });
    const helped = reduce(
      place([...expected].reverse()),
      { type: "request-hint" },
      { type: "request-assist" },
    );
    expect(helped.ordered[0]).toBe(expected[0]);
    expect(helped.ordered.slice(1, 3)).toEqual([expected[2], expected[1]]);
    // The card displaced by the locked answer returns to the tray.
    expect(helped.ordered).not.toContain(expected[3]);
    expect(
      reduce(helped, { type: "order-card", id: expected[0], index: -1 }),
    ).toBe(helped);
    expect(
      reduce(helped, { type: "order-card", id: expected[1], index: 0 }),
    ).toBe(helped);
    const result = reduce(place(expected, helped), { type: "submit" });
    expect(result.answers[0]).toMatchObject({
      correct: true,
      points: 1,
      ordered: expected,
    });
    const restored = JSON.parse(JSON.stringify(result)) as GameState;
    expect(validGame(restored, draft)).toBe(true);
    expect(restored.answers).toEqual(result.answers);
    expect(() =>
      createQuestionContext(regions, [], {
        ...draft,
        rounds: [
          {
            ...question,
            guidance: {
              hint: "Hint",
              assist: {
                text: "Assist",
                fixedSlots: [{ index: 0, id: expected[1] }],
              },
            },
          },
        ],
      }),
    ).toThrow("Invalid ordering");
  });

  it("shows a real wrong sequence beside the canonical chronology without exposing internal IDs", () => {
    const wrongOrder = [...expected].reverse();
    const wrong = reduce(place(wrongOrder), { type: "submit" });
    expect(wrong.answers[0]).toMatchObject({
      correct: false,
      ordered: wrongOrder,
      points: 0,
    });
    expect(correctAnswerSummary(question, context, wrong).value).toBe(
      "Terracotta Army · near Xi’an → Forbidden City · Beijing → Shanghai Customs House · the Bund → Bird’s Nest · Beijing National Stadium",
    );
    const html = renderToStaticMarkup(
      <GameShell
        journey={draft}
        context={context}
        game={wrong}
        dispatch={() => {}}
        webgl
        onHome={() => {}}
        onStudy={() => {}}
        frame={() => {}}
      />,
    );
    expect(html).toContain("Not quite.");
    expect(html).toContain("1420");
    expect(html).not.toContain("landmark:");
    const play = renderToStaticMarkup(
      <GameShell
        journey={draft}
        context={context}
        game={start()}
        dispatch={() => {}}
        webgl
        onHome={() => {}}
        onStudy={() => {}}
        frame={() => {}}
      />,
    );
    expect(play).toContain("Place a card");
    expect(play).not.toContain("Place a country");
    expect(play).not.toContain("1420");
    expect(
      JOURNEY_INDEX.some((journey) => journey.id.startsWith("made-in-china")),
    ).toBe(false);
  });
});

const journeyContext = createQuestionContext(regions, [], journey);
const atRound = (roundIndex: number): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex,
});
const step = (game: GameState, ...actions: Action[]) =>
  actions.reduce(
    (state, action) => gameReducer(state, action, journey, journeyContext),
    game,
  );
const view = (game: GameState) =>
  journeyWorld(regions, journey, game, journeyContext);
const assign = (game: GameState, ordered: string[]) =>
  step(
    game,
    ...ordered.map((id, index): Action => ({ type: "order-card", id, index })),
  );
const select = (game: GameState, ids: string[]) =>
  step(game, ...ids.map((id): Action => ({ type: "select", id })));
const submit: Action = { type: "submit" };
const hint: Action = { type: "request-hint" };
const assist: Action = { type: "request-assist" };
const shell = (game: GameState) => {
  const node = document.createElement("div");
  node.innerHTML = renderToStaticMarkup(
    <GameShell
      journey={journey}
      context={journeyContext}
      game={game}
      dispatch={() => {}}
      webgl
      onHome={() => {}}
      onStudy={() => {}}
      frame={() => {}}
    />,
  );
  return node;
};

describe("Made in China complete Journey", () => {
  it("audits five unregistered rounds, canonical geography, sources, and all licensed media", () => {
    expect(journey.rounds.map((round) => round.mode)).toEqual([
      "choice-match",
      "city-single",
      "map-multiple",
      "choice-order",
      "pin",
    ]);
    const report = auditJourney(journey, regions, (asset) =>
      existsSync(`public${asset}`),
    );
    expect(report.errors).toEqual([]);
    expect(report.assets).toHaveLength(12);
    expect(report.warnings).toEqual([]);
    expect(JOURNEY_INDEX.some((item) => item.id === journey.id)).toBe(false);
    for (const image of Object.values(media)) {
      expect(
        createHash("sha256")
          .update(readFileSync(`public${image.src}`))
          .digest("hex"),
      ).toBe(image.sha256);
      expect(image.alt).toBeTruthy();
      expect(image.credit.licenseUrl).toMatch(/^https:\/\//);
    }
    const canonical = JSON.parse(
      readFileSync("public/geography/chn-adm1.v1.json", "utf8"),
    ) as RegionFeature[];
    for (const region of journey.rounds[2].importedRegions!)
      expect(region.geometry).toEqual(
        canonical.find((item) => item.id === region.id)!.geometry,
      );
  });

  it("matches photographed dishes, locks Chengdu, and reveals the actual misplaced cities", () => {
    const q = journey.rounds[0],
      solution = solutionIds(q, journeyContext);
    expect(view(atRound(0)).places).toEqual([]);
    const playing = shell(atRound(0));
    expect(playing.querySelectorAll(".match-slot-photo")).toHaveLength(3);
    const wrong = step(
      assign(atRound(0), [solution[2], solution[1], solution[0]]),
      submit,
    );
    expect(wrong.answers[0]).toMatchObject({ correct: false, points: 0 });
    expect(
      view(wrong).places.find((place) => place.id === solution[0])?.visualState,
    ).toBe("incorrect");
    expect(
      view(wrong).places.find((place) => place.id === solution[1])?.visualState,
    ).toBe("correct");
    expect(
      shell(wrong).querySelectorAll('[aria-label="Your assignments"] li'),
    ).toHaveLength(3);
    const helped = step(atRound(0), hint, assist);
    expect(helped.ordered[0]).toBe(solution[0]);
    expect(
      step(helped, { type: "order-card", id: solution[1], index: 0 }),
    ).toBe(helped);
    expect(step(assign(helped, solution), submit).answers[0]).toMatchObject({
      correct: true,
      points: 1,
    });
  });

  it("keeps four city candidates anonymous and adds useful Jiangxi geometry only on assist", () => {
    const q = journey.rounds[1];
    const before = view(atRound(1));
    expect(before.places).toHaveLength(4);
    expect(
      before.places.every((place) => place.labelHidden && !place.name),
    ).toBe(true);
    expect(
      new Set(
        before.places.map(
          (place) => `${place.markerSize}:${place.kind}:${place.visualState}`,
        ),
      ).size,
    ).toBe(1);
    expect(before.regions.some((region) => region.id === "wurl:CHN-JX")).toBe(
      false,
    );
    const helped = step(atRound(1), hint, assist),
      assisted = view(helped);
    expect(assisted.regions.some((region) => region.id === "wurl:CHN-JX")).toBe(
      true,
    );
    expect(assisted.states["wurl:CHN-JX"]).toBe("hinted");
    expect(assisted.places.filter((place) => place.answerTarget)).toHaveLength(
      4,
    );
    expect(
      assisted.places.some(
        (place) => place.name === "Jiangxi" && place.markerHidden,
      ),
    ).toBe(true);
    const wrong = step(select(helped, ["place:1800163"]), submit),
      feedback = view(wrong);
    expect(wrong.answers[0]).toMatchObject({ correct: false, points: 0 });
    expect(
      feedback.places.find((place) => place.id === "place:1800163")
        ?.visualState,
    ).toBe("incorrect");
    expect(
      feedback.places.find((place) => place.id === "place:1805680")
        ?.visualState,
    ).toBe("answer");
    expect(feedback.selectableRegionIds).toEqual([]);
    expect(
      shell(wrong).querySelectorAll(".journey-feedback-image"),
    ).toHaveLength(2);
    const correct = step(
      select(atRound(1), solutionIds(q, journeyContext)),
      submit,
    );
    expect(correct.answers[0]).toMatchObject({ correct: true, points: 3 });
  });

  it("grades only the six provinces and distinguishes the three answers from the wider Wall network", () => {
    const before = view(atRound(2));
    expect(before.selectableRegionIds).toEqual(MADE_IN_CHINA_WALL_CANDIDATES);
    expect(before.places.map((place) => place.name).sort()).toEqual([
      "Gansu",
      "Hebei",
      "Jiangsu",
      "Shanxi",
      "Sichuan",
      "Zhejiang",
    ]);
    expect(before.regions.some((region) => region.id === "wurl:CHN-NM")).toBe(
      false,
    );
    const partial = step(
      select(atRound(2), ["wurl:CHN-HE", "wurl:CHN-SX", "wurl:CHN-SC"]),
      submit,
    );
    expect(partial.answers[0]).toMatchObject({ correct: false, points: 0 });
    const revealed = view(partial);
    expect(revealed.states["wurl:CHN-SC"]).toBe("incorrect");
    expect(revealed.states["wurl:CHN-HE"]).toBe("correct");
    expect(revealed.states["wurl:CHN-GS"]).toBe("answer");
    for (const id of MADE_IN_CHINA_WALL_REGIONS.filter(
      (id) => !MADE_IN_CHINA_WALL_ANSWERS.includes(id),
    ))
      expect(revealed.states[id]).toBe("hinted");
    const helped = step(atRound(2), hint, assist);
    expect(helped.selectedIds).toEqual(["wurl:CHN-GS"]);
    expect(step(helped, { type: "select", id: "wurl:CHN-GS" })).toBe(helped);
    expect(
      shell(helped).querySelector('img[src$="jiayuguan.v1.jpg"]'),
    ).toBeTruthy();
    expect(
      step(select(helped, ["wurl:CHN-HE", "wurl:CHN-SX"]), submit).answers[0],
    ).toMatchObject({ correct: true, points: 1 });
    expect(
      step(atRound(2), { type: "select", id: "wurl:CHN" }).selectedIds,
    ).toEqual([]);
  });

  it("keeps landmark dates in the reveal, grades each wrong slot, and supplies four ordered camera views", () => {
    const q = journey.rounds[3];
    expect(view(atRound(3)).places).toEqual([]);
    const playing = shell(atRound(3));
    expect(playing.querySelectorAll(".order-card-content img")).toHaveLength(4);
    expect(playing.textContent).not.toMatch(/1420|1927|2008/);
    const wrong = step(
      assign(atRound(3), [...solutionIds(q, journeyContext)].reverse()),
      submit,
    );
    expect(
      view(wrong).places.every((place) => place.visualState === "incorrect"),
    ).toBe(true);
    expect(
      view(wrong).places.find((place) => place.id === "landmark:birds-nest")
        ?.markerBadge,
    ).toBe("1");
    expect(q.feedbackViews).toHaveLength(4);
    expect(
      shell(wrong).querySelectorAll(".journey-feedback-image"),
    ).toHaveLength(4);
    expect(shell(wrong).textContent).toContain("1420");
  });

  it("calibrates Shenzhen independently of help, excludes Hong Kong, and preserves missed pins", () => {
    const q = journey.rounds[4];
    expect(q.rule.type).toBe("pin-distance");
    const target = answerPlace(q, solutionIds(q, journeyContext)[0])!;
    expect(view(atRound(4)).places.map((place) => place.name)).toEqual([
      "Hong Kong",
    ]);
    const helped = step(atRound(4), hint, assist);
    expect(
      view(helped)
        .places.map((place) => place.name)
        .sort(),
    ).toEqual(["Guangzhou", "Hong Kong"]);
    expect(view(helped).places.some((place) => place.id === target.id)).toBe(
      false,
    );
    for (const [km, points] of [
      [7.99, 3],
      [8.01, 2],
      [15.99, 2],
      [16.01, 1],
      [23.99, 1],
      [24.01, 0],
    ]) {
      const pin = pointAlongBearing(target, 0, km / 6371);
      const result = step(atRound(4), { type: "drop-pin", ...pin }, submit);
      expect(result.answers[0]).toMatchObject({ points, correct: points > 0 });
    }
    for (const reference of view(helped).places)
      expect(
        step(
          atRound(4),
          { type: "drop-pin", lat: reference.lat, lng: reference.lng },
          submit,
        ).answers[0].correct,
      ).toBe(false);
    const assisted = step(
      helped,
      { type: "drop-pin", lat: target.lat, lng: target.lng },
      submit,
    );
    expect(assisted.answers[0].points).toBe(1);
    const missed = step(
      atRound(4),
      { type: "drop-pin", lat: 22.3, lng: 113.6 },
      submit,
    );
    expect(pinDistance(q, missed)).toBeGreaterThan(24);
    expect(
      view(missed).places.some(
        (place) => place.id === target.id && place.visualState === "answer",
      ),
    ).toBe(true);
    expect(
      view(missed).places.some(
        (place) =>
          place.sourceId === "player" &&
          place.visualState === "incorrect" &&
          place.lat === 22.3,
      ),
    ).toBe(true);
    expect(
      shell(missed).querySelectorAll(".journey-feedback-image"),
    ).toHaveLength(2);
  });

  it("completes a fifteen-point run and retains actual mistakes on an intentional recap", () => {
    let game = step(initialGame, { type: "start" });
    for (const q of journey.rounds) {
      const solution = solutionIds(q, journeyContext);
      game =
        q.mode === "pin"
          ? step(game, {
              type: "drop-pin",
              lat: answerPlace(q, solution[0])!.lat,
              lng: answerPlace(q, solution[0])!.lng,
            })
          : q.mode === "choice-order" || q.mode === "choice-match"
            ? assign(game, solution)
            : select(game, solution);
      game = step(game, submit, { type: "next" });
    }
    expect(game.phase).toBe("finished");
    expect(journeyPoints(game)).toBe(15);
    expect(validGame(JSON.parse(JSON.stringify(game)), journey)).toBe(true);
    expect(
      view(game).places.filter((place) => !place.markerHidden),
    ).toHaveLength(9);
    expect(
      view(game).places.every((place) => place.visualState === "visited"),
    ).toBe(true);
    expect(view(game).overlays ?? []).toEqual([]);
    expect(
      Object.entries(view(game).states)
        .filter(([, state]) => state === "visited")
        .map(([id]) => id)
        .sort(),
    ).toEqual([...MADE_IN_CHINA_WALL_ANSWERS].sort());
    const wrongProvince = step(
      select(atRound(2), ["wurl:CHN-SC", "wurl:CHN-HE", "wurl:CHN-SX"]),
      submit,
    ).answers[0];
    const wrongCity = step(select(atRound(1), ["place:1800163"]), submit)
      .answers[0];
    const wrongPin = step(
      atRound(4),
      { type: "drop-pin", lat: 22.3, lng: 113.6 },
      submit,
    ).answers[0];
    const mixed = {
      ...game,
      answers: game.answers.map((answer) =>
        answer.roundId === wrongProvince.roundId
          ? wrongProvince
          : answer.roundId === wrongCity.roundId
            ? wrongCity
            : answer.roundId === wrongPin.roundId
              ? wrongPin
              : answer,
      ),
    };
    expect(view(mixed).states["wurl:CHN-SC"]).toBe("incorrect");
    const recap = shell(mixed);
    expect(recap.querySelectorAll(".journey-answer-recap")).toHaveLength(5);
    expect(recap.textContent).toContain("Your answer: Nanchang");
    expect(recap.textContent).toContain("Your pin was");
    expect(
      view(mixed).places.find((place) => place.id === "place:1800163")
        ?.visualState,
    ).toBe("incorrect");
    expect(
      view(mixed).places.some(
        (place) =>
          place.sourceId === "player" && place.visualState === "incorrect",
      ),
    ).toBe(true);
  });
});
