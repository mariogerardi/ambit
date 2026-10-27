// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MADE_IN_CHINA_CHRONOLOGY_DRAFT as question } from "../src/game/madeInChinaJourney";
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
