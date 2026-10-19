import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CANADA_JOURNEY } from "../src/game/canadaJourney";
import { ELEVENTH_JOURNEY } from "../src/game/eleventhJourney";
import { createQuestionContext } from "../src/game/questionPreparation";
import { COUNTRY_FACTS } from "../src/game/countryFacts";
import { gameReducer, initialGame } from "../src/game/state";
import type { Action, Answer, GameState } from "../src/game/state";
import type { RegionFeature } from "../src/geography/types";
import {
  answerPoints,
  journeyPoints,
  submittedPoints,
  scorePointTotals,
} from "../src/game/points";
import { PointOrbs } from "../src/game/PointOrbs";
import { QuestionActions } from "../src/game/QuestionActions";
import { validGame } from "../src/app/dailyProgress";
import { answerPlace } from "../src/game/answerTargets";
import { geoCircle } from "d3-geo";
import { GameShell } from "../src/game/GameShell";

const regions: RegionFeature[] = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
);
const context = createQuestionContext(regions, COUNTRY_FACTS, CANADA_JOURNEY);
const answer = (points?: number): Answer => ({
  ...initialGame,
  roundId: "round",
  correct: true,
  ...(points === undefined ? {} : { points, pointsVersion: 1 }),
});

describe("Journey point rewards", () => {
  it.each([
    [14, 15, "That was an <em>ambitious run.</em>"],
    [12, 13, "Look how far <em>you wandered.</em>"],
    [10, 11, "You’ve covered <em>serious ground.</em>"],
    [8, 9, "You found <em>your stride.</em>"],
    [6, 7, "You’re finding <em>your way.</em>"],
    [4, 5, "A few turns, <em>new discoveries.</em>"],
    [1, 3, "Every step <em>takes you somewhere.</em>"],
    [0, 0, "A whole world <em>still awaits.</em>"],
  ] as const)(
    "uses the earned-score closing line for %i–%i points",
    (minimum, maximum, line) => {
      for (let total = minimum; total <= maximum; total++) {
        const game: GameState = {
          ...initialGame,
          phase: "finished",
          roundIndex: 4,
          answers: CANADA_JOURNEY.rounds.map((round, index) => {
            const points = Math.max(0, Math.min(3, total - index * 3));
            return {
              ...answer(points),
              roundId: round.id,
              correct: points > 0,
            };
          }),
        };
        const html = renderToStaticMarkup(
          <GameShell
            journey={CANADA_JOURNEY}
            game={game}
            context={context}
            dispatch={() => {}}
            webgl
            frame={() => {}}
            onHome={() => {}}
            onStudy={() => {}}
          />,
        );
        const heading = html
          .split('class="journey-result-heading"')[1]
          .split("</h1>")[0];
        expect(heading).toContain(line);
      }
    },
  );

  it("shows a continuous 15-point total below the closing line and aligned receipt rewards", () => {
    const game: GameState = {
      ...initialGame,
      phase: "finished",
      roundIndex: 4,
      answers: [3, 2, 1, 0, 3].map((points, index) => ({
        ...answer(points),
        roundId: CANADA_JOURNEY.rounds[index].id,
        correct: points > 0,
      })),
      help: { [CANADA_JOURNEY.rounds[1].id]: "hinted" },
    };
    const html = renderToStaticMarkup(
      <GameShell
        journey={CANADA_JOURNEY}
        game={game}
        context={context}
        dispatch={() => {}}
        webgl
        frame={() => {}}
        onHome={() => {}}
        onStudy={() => {}}
      />,
    );
    expect(html).toContain("9<span>/15</span>");
    expect(html).toContain("4/5 correct answers");
    const summary = html
      .split('<p class="journey-result-summary">')[1]
      .split("</p>")[0];
    expect(summary).toContain('class="journey-correct-count"');
    expect(summary).toContain('class="journey-help-summary"');
    expect(summary).toContain("1 hint");
    expect(html.indexOf("journey-score")).toBeGreaterThan(
      html.indexOf("your stride."),
    );
    const overview = html
      .split('class="journey-point-total"')[1]
      .split("</div>")[0];
    expect(overview).toContain('aria-label="9 of 15 points"');
    expect(
      overview.match(/class="point-orb(?: point-orb-earned)?"/g),
    ).toHaveLength(15);
    expect(overview.match(/point-orb-earned/g)).toHaveLength(9);
    expect(overview).toContain("--orb-index:8");
    expect(overview).toContain("point-orbs-animate");
    const hintedRow = html.split("<li")[2].split("</li>")[0];
    expect(hintedRow.indexOf("journey-row-help")).toBeLessThan(
      hintedRow.indexOf("journey-round-points"),
    );
    expect(hintedRow.indexOf("point-orbs")).toBeLessThan(
      hintedRow.indexOf("journey-round-outcome"),
    );
  });
  it("uses reward totals for new friend summaries and prior full credit for old summaries", () => {
    expect(
      scorePointTotals({ correct: 4, total: 5, points: 9, maxPoints: 15 }),
    ).toEqual({ earned: 9, maximum: 15 });
    expect(scorePointTotals({ correct: 4, total: 5 })).toEqual({
      earned: 12,
      maximum: 15,
    });
  });
  it("animates earned points when an answer is revealed", () => {
    const game: GameState = {
      ...initialGame,
      phase: "feedback",
      answers: [{ ...answer(3), roundId: CANADA_JOURNEY.rounds[0].id }],
    };
    const html = renderToStaticMarkup(
      <GameShell
        journey={CANADA_JOURNEY}
        game={game}
        context={context}
        dispatch={() => {}}
        webgl
        frame={() => {}}
        onHome={() => {}}
        onStudy={() => {}}
      />,
    );
    const feedback = html
      .split('class="feedback-point-summary"')[1]
      .split("</div>")[1];
    expect(feedback).toContain("point-orbs-animate");
    expect(feedback.match(/point-orb-earned/g)).toHaveLength(3);
  });
  it.each([
    [[], 3],
    [["request-hint"], 2],
    [["request-hint", "request-assist"], 1],
  ] as const)("caps a correct answer after %j", (help, points) => {
    const actions: Action[] = [
      ...help.map((type) => ({ type })),
      { type: "select", id: "wurl:CAN" },
    ];
    const game = actions.reduce(
      (g, a) => gameReducer(g, a, CANADA_JOURNEY, context),
      { ...initialGame, phase: "playing" } as GameState,
    );
    expect(game.answers[0]).toMatchObject({
      correct: true,
      points,
      pointsVersion: 1,
    });
    expect(journeyPoints(game)).toBe(points);
    expect(validGame(JSON.parse(JSON.stringify(game)), CANADA_JOURNEY)).toBe(
      true,
    );
  });
  it("keeps earned snapshots through content changes and stronger synced help without raising the score", () => {
    expect(answerPoints(answer(3), "assisted")).toBe(1);
    expect(answerPoints(answer(1))).toBe(1);
    expect(answerPoints(answer(2), "hinted")).toBe(2);
    expect(answerPoints({ ...answer(3), correct: false })).toBe(0);
    // Legacy credit was earned when help and accepted pin bands carried no deductions.
    expect(answerPoints(answer(), "assisted")).toBe(3);
  });
  it("awards inclusive pin tiers before applying the help ceiling", () => {
    const q = ELEVENTH_JOURNEY.rounds[1];
    if (q.rule.type !== "pin-distance") throw Error("Expected distance pin");
    const target = answerPlace(q, q.rule.targetId)!;
    for (const [distance, earned] of [
      [0, 3],
      [50, 3],
      [50.01, 2],
      [100, 2],
      [100.01, 1],
      [150, 1],
      [151, 0],
    ]) {
      const [lng, lat] = geoCircle()
        .center([target.lng, target.lat])
        .radius(((distance / 6371.0088) * 180) / Math.PI)().coordinates[0][0];
      const response = { ...initialGame, pin: { lat, lng } };
      expect(
        submittedPoints(q, response, distance <= 150),
        String(distance),
      ).toBe(earned);
      expect(submittedPoints(q, response, distance <= 150, "hinted")).toBe(
        Math.min(earned, 2),
      );
      expect(submittedPoints(q, response, distance <= 150, "assisted")).toBe(
        Math.min(earned, 1),
      );
    }
  });
  it("preserves legacy saves and rejects invalid point snapshots", () => {
    const saved = {
      ...initialGame,
      answers: [{ ...answer(), roundId: CANADA_JOURNEY.rounds[0].id }],
    };
    expect(validGame(saved, CANADA_JOURNEY)).toBe(true);
    for (const invalid of [
      { points: 4, pointsVersion: 1 },
      { points: 2.5, pointsVersion: 1 },
      { points: 3 },
      { points: 1, pointsVersion: 1, correct: false },
    ])
      expect(
        validGame(
          { ...saved, answers: [{ ...saved.answers[0], ...invalid }] },
          CANADA_JOURNEY,
        ),
      ).toBe(false);
  });
  it.each([0, 1, 2, 3])(
    "renders %i earned orbs followed by hollow slots",
    (earned) => {
      const html = renderToStaticMarkup(<PointOrbs earned={earned} />);
      expect(html).toContain(`aria-label="${earned} of 3 points"`);
      expect(
        html.match(/class="point-orb(?: point-orb-earned)?"/g),
      ).toHaveLength(3);
      expect(html.match(/point-orb-earned/g) ?? []).toHaveLength(earned);
      const slots = [
        ...html.matchAll(/class="point-orb( point-orb-earned)?"/g),
      ].map((match) => !!match[1]);
      expect(slots).toEqual([
        ...[...Array(earned)].map(() => true),
        ...[...Array(3 - earned)].map(() => false),
      ]);
    },
  );
  it("discloses help ceilings before activation while Study keeps its normal controls", () => {
    const guidance = {
      content: CANADA_JOURNEY.rounds[0].guidance!,
      onHint() {},
      onAssist() {},
    };
    expect(
      renderToStaticMarkup(
        <QuestionActions guidance={guidance} pointScoring />,
      ),
    ).toContain("Play for up to 2 points");
    expect(
      renderToStaticMarkup(
        <QuestionActions
          guidance={{ ...guidance, stage: "hinted" }}
          pointScoring
        />,
      ),
    ).toContain("Play for up to 1 point");
    expect(
      renderToStaticMarkup(<QuestionActions guidance={guidance} />),
    ).not.toContain("Play for up to");
  });
});
