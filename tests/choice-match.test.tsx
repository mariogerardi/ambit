// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { act, useReducer } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { ELEVENTH_JOURNEY as journey } from "../src/game/eleventhJourney";
import { AnswerForm } from "../src/game/AnswerForm";
import {
  canSubmit,
  createQuestionContext,
  isCorrect,
  solutionIds,
} from "../src/game/questions";
import type { Question } from "../src/game/questions";
import { validateQuestionContract } from "../src/game/questionBuilder";
import { gameReducer, initialGame } from "../src/game/state";
import type { Action, GameState } from "../src/game/state";
import { validGame } from "../src/app/dailyProgress";
import { correctAnswerSummary } from "../src/game/copy";
import { journeyWorld } from "../src/app/journeyWorld";
import type { RegionFeature } from "../src/geography/types";
const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(world, [], journey);
const question = journey.rounds[4];
const at = (): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex: 4,
});
const reduce = (game: GameState, ...actions: Action[]) =>
  actions.reduce(
    (state, action) => gameReducer(state, action, journey, context),
    game,
  );
const place = (ids: string[]) =>
  reduce(
    at(),
    ...ids.map((id, index): Action => ({ type: "order-card", id, index })),
  );
const correct = ["place:964137", "place:3369157", "place:1018725"];

describe("card matching", () => {
  it("requires correct roles, not just the correct set of cities", () => {
    const candidates = question.choices!.map((choice) => choice.id);
    let accepted = 0;
    for (const a of candidates)
      for (const b of candidates)
        for (const c of candidates) {
          if (new Set([a, b, c]).size !== 3) continue;
          const game = place([a, b, c]);
          expect(canSubmit(question, context, game)).toBe(true);
          const result = reduce(game, { type: "submit" });
          const expected =
            a === correct[0] && b === correct[1] && c === correct[2];
          expect(result.answers.at(-1)?.correct).toBe(expected);
          accepted += Number(expected);
        }
    expect(accepted).toBe(1);
    for (const ordered of [
      [],
      correct.slice(0, 2),
      [correct[0], correct[0], correct[2]],
      [correct[0], "unknown", correct[2]],
      [...correct, "place:993800"],
    ]) {
      expect(canSubmit(question, context, { ...at(), ordered })).toBe(false);
      expect(isCorrect(question, context, { ...at(), ordered })).toBe(false);
    }
  });
  it("keys answers by role ID even when authoring order changes", () => {
    const reordered: Question = {
      ...question,
      matchSlots: [...question.matchSlots!].reverse(),
      rule: {
        type: "slot-matches",
        matches: [
          ...(question.rule.type === "slot-matches"
            ? question.rule.matches
            : []),
        ].reverse(),
      },
      guidance: undefined,
    };
    const other = { ...journey, rounds: [reordered] };
    const otherContext = createQuestionContext(world, [], other);
    expect(solutionIds(reordered, otherContext)).toEqual(
      [...correct].reverse(),
    );
    expect(
      isCorrect(reordered, otherContext, {
        ...initialGame,
        ordered: [...correct].reverse(),
      }),
    ).toBe(true);
    expect(correctAnswerSummary(reordered, otherContext, at()).value).toContain(
      "Supreme Court of Appeal: Bloemfontein",
    );
  });
  it("swaps, returns cards, preserves assist locks and restores them from stale drafts", () => {
    const assigned = place(correct);
    expect(reduce(assigned, { type: "ordered", index: 0, value: "bad" })).toBe(
      assigned,
    );
    expect(
      reduce(assigned, { type: "order-card", index: 3, id: correct[0] }),
    ).toBe(assigned);
    expect(
      reduce(assigned, { type: "order-card", index: 0, id: "unknown" }),
    ).toBe(assigned);
    const swapped = reduce(assigned, {
      type: "order-card",
      id: correct[2],
      index: 0,
    });
    expect(swapped.ordered).toEqual([correct[2], correct[1], correct[0]]);
    expect(
      reduce(swapped, { type: "order-card", id: correct[0], index: -1 })
        .ordered,
    ).toEqual([correct[2], correct[1], ""]);
    const assisted = reduce(
      swapped,
      { type: "request-hint" },
      { type: "request-assist" },
    );
    expect(
      reduce(assisted, { type: "order-card", id: correct[1], index: 0 }),
    ).toBe(assisted);
    expect(
      reduce(assisted, { type: "order-card", id: correct[0], index: 1 }),
    ).toBe(assisted);
    expect(reduce(assisted, { type: "clear" }).ordered).toEqual([
      "",
      correct[1],
      "",
    ]);
    const stale = { ...assisted, ordered: [correct[1], "", correct[0]] };
    const restored = reduce(stale, { type: "text", value: "" });
    expect(restored.ordered).toEqual(["", correct[1], correct[0]]);
    expect(validGame(JSON.parse(JSON.stringify(restored)), journey)).toBe(true);
    expect(
      validGame(
        JSON.parse(JSON.stringify(reduce(assigned, { type: "submit" }))),
        journey,
      ),
    ).toBe(true);
  });
  it("rejects incomplete, ambiguous or impossible authoring and invalid locks", () => {
    for (const patch of [
      { matchSlots: question.matchSlots!.slice(0, 2) },
      {
        matchSlots: [
          question.matchSlots![0],
          question.matchSlots![0],
          question.matchSlots![2],
        ],
      },
      {
        rule: {
          type: "slot-matches",
          matches: [
            { slotId: "executive", choiceId: correct[0] },
            { slotId: "legislative", choiceId: correct[0] },
            { slotId: "judicial", choiceId: correct[2] },
          ],
        },
      },
      {
        rule: {
          type: "slot-matches",
          matches: [
            { slotId: "executive", choiceId: correct[0] },
            { slotId: "legislative", choiceId: correct[1] },
            { slotId: "unknown", choiceId: "unknown" },
          ],
        },
      },
    ])
      expect(() =>
        validateQuestionContract({ ...question, ...patch } as Question),
      ).toThrow("matching requires");
    expect(() =>
      createQuestionContext(world, [], {
        ...journey,
        rounds: [
          {
            ...question,
            guidance: {
              hint: "Hint",
              assist: {
                text: "Wrong lock",
                fixedSlots: [{ index: 0, id: "place:993800" }],
              },
            },
          },
        ],
      }),
    ).toThrow("Invalid matching");
  });
  it("shows honest map feedback when the right cities are assigned to wrong roles", () => {
    const game = reduce(place([correct[2], correct[1], correct[0]]), {
      type: "submit",
    });
    const map = journeyWorld(world, journey, game, context);
    expect(map.places.map((p) => p.visualState)).toEqual([
      "incorrect",
      "correct",
      "incorrect",
      "hinted",
    ]);
    expect(correctAnswerSummary(question, context, game).value).toBe(
      "National administration: Pretoria, Parliament: Cape Town, Supreme Court of Appeal: Bloemfontein",
    );
  });
  it("supports tap placement, pointer drag, locks and submission without WebGL", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    let latest = at();
    function Puzzle() {
      const [game, dispatch] = useReducer(
        (state: GameState, action: Action) =>
          gameReducer(state, action, journey, context),
        at(),
      );
      latest = game;
      return (
        <AnswerForm
          question={question}
          context={context}
          game={game}
          dispatch={dispatch}
          webgl={false}
        />
      );
    }
    const button = (label: string) =>
      [...host.querySelectorAll<HTMLButtonElement>("button")].find((node) =>
        node.textContent?.includes(label),
      )!;
    try {
      await act(async () => root.render(<Puzzle />));
      expect(host.querySelector(".match-columns")).not.toBeNull();
      expect(host.querySelectorAll(".order-bank .order-card")).toHaveLength(4);
      expect(host.querySelectorAll(".order-slots li")).toHaveLength(3);
      expect(
        host
          .querySelector(".match-columns")!
          .firstElementChild!.classList.contains("order-bank"),
      ).toBe(true);
      const judicial = host.querySelector(
        '[aria-label="Supreme Court of Appeal: empty"]',
      )!;
      expect(judicial.textContent).toContain("Supreme Court of Appeal");
      expect(
        host.querySelector(".order-position:not(.sr-only)")?.textContent,
      ).toBe("Cities");
      expect(host.textContent).not.toContain("Place a card");
      expect(host.textContent).toContain("Supreme Court of Appeal");
      expect(host.textContent).not.toContain("Place a country");
      expect(button("Submit answer").disabled).toBe(true);
      await act(async () => button("Pretoria").click());
      await act(async () =>
        host
          .querySelector<HTMLButtonElement>(
            '[aria-label="National administration: empty"]',
          )!
          .click(),
      );
      const card = button("Bloemfontein");
      const target = host.querySelector('[data-order-slot="2"]')!;
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: () => target,
      });
      await act(async () =>
        card.dispatchEvent(
          new MouseEvent("pointerdown", {
            bubbles: true,
            clientX: 10,
            clientY: 10,
          }),
        ),
      );
      await act(async () =>
        card.dispatchEvent(
          new MouseEvent("pointermove", {
            bubbles: true,
            clientX: 100,
            clientY: 100,
          }),
        ),
      );
      expect(document.body.querySelector(".order-drag-preview")).not.toBeNull();
      await act(async () =>
        card.dispatchEvent(
          new MouseEvent("pointerup", {
            bubbles: true,
            clientX: 100,
            clientY: 100,
          }),
        ),
      );
      await act(async () => button("Get a hint").click());
      await act(async () => button("Need an assist?").click());
      expect(
        host.querySelector<HTMLButtonElement>(
          '[aria-label="Parliament: Cape Town, locked by assist"]',
        )!.disabled,
      ).toBe(true);
      expect(host.querySelector(".order-bank")!.textContent).toContain(
        "Johannesburg",
      );
      expect(button("Submit answer").disabled).toBe(false);
      await act(async () => button("Submit answer").click());
      expect(latest.answers.at(-1)?.correct).toBe(true);
      expect(latest.phase).toBe("feedback");
    } finally {
      await act(async () => root.unmount());
      host.remove();
      vi.unstubAllGlobals();
      delete (document as unknown as Record<string, unknown>).elementFromPoint;
    }
  });
});
