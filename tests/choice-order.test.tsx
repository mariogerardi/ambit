// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { act, useReducer } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, vi } from "vitest";
import { ANDES_JOURNEY } from "../src/game/andesJourney";
import { AnswerForm } from "../src/game/AnswerForm";
import { gameReducer, initialGame } from "../src/game/state";
import type { Action, GameState } from "../src/game/state";
import {
  createQuestionContext,
  canSubmit,
  isCorrect,
} from "../src/game/questions";
import type { Question } from "../src/game/questions";
import { correctAnswerSummary } from "../src/game/copy";
import type { RegionFeature } from "../src/geography/types";

// The retained card-order engine is exercised independently of live Journey content.
const order: Question = {
  ...ANDES_JOURNEY.rounds[4],
  id: "test:order-neighbors",
  mode: "choice-order",
  count: 3,
  selection: { type: "none" },
  rule: {
    type: "country-ids",
    ids: ["wurl:PER", "wurl:BOL", "wurl:ARG"],
    ordered: true,
  },
  choices: [
    { id: "wurl:BOL", label: "Bolivia" },
    { id: "wurl:PRY", label: "Paraguay" },
    { id: "wurl:ARG", label: "Argentina" },
    { id: "wurl:PER", label: "Peru" },
  ],
  orderLabels: ["North", "Middle", "South"],
  orderInitial: ["wurl:BOL", "wurl:PRY", "wurl:PER"],
  orderAsideLabel: "Impostor",
  guidance: {
    hint: "One card belongs farther east.",
    assist: {
      text: "Argentina is locked in the south.",
      fixedSlots: [{ index: 2, id: "wurl:ARG" }],
    },
  },
};
const journey = {
  ...ANDES_JOURNEY,
  rounds: [...ANDES_JOURNEY.rounds.slice(0, 4), order],
};
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
const placed = () =>
  reduce(
    at(4),
    ...["wurl:PER", "wurl:BOL", "wurl:ARG"].map(
      (id, index): Action => ({ type: "order-card", id, index }),
    ),
  );
describe("card ordering controls", () => {
  it("grades complete, unique card order with a real distractor", () => {
    expect(canSubmit(order, context, at(4))).toBe(true);
    expect(isCorrect(order, context, at(4))).toBe(false);
    expect(
      reduce({ ...at(3), phase: "feedback" }, { type: "next" }).ordered,
    ).toEqual(order.orderInitial);
    const correct = placed();
    expect(canSubmit(order, context, correct)).toBe(true);
    expect(isCorrect(order, context, correct)).toBe(true);
    expect(reduce(correct, { type: "submit" }).answers.at(-1)?.correct).toBe(
      true,
    );
    expect(correctAnswerSummary(order, context, correct).value).toBe(
      "Peru → Bolivia → Argentina",
    );
    for (const ordered of [
      ["wurl:BOL", "wurl:PER", "wurl:ARG"],
      ["wurl:PER", "wurl:PRY", "wurl:ARG"],
      ["wurl:PER", "wurl:PER", "wurl:ARG"],
      ["wurl:PER", "wurl:BOL"],
    ])
      expect(isCorrect(order, context, { ...correct, ordered })).toBe(false);
    expect(
      reduce(correct, { type: "order-card", id: "wurl:USA", index: 0 }),
    ).toBe(correct);
    expect(
      reduce(correct, { type: "order-card", id: "wurl:PER", index: 3 }),
    ).toBe(correct);
    expect(
      reduce(correct, { type: "ordered", index: 0, value: "wurl:PRY" }),
    ).toBe(correct);
  });
  it("swaps placed cards, returns displaced cards to spares, and enforces assist locks", () => {
    const correct = placed();
    const swapped = reduce(correct, {
      type: "order-card",
      id: "wurl:ARG",
      index: 0,
    });
    expect(swapped.ordered).toEqual(["wurl:ARG", "wurl:BOL", "wurl:PER"]);
    const displaced = reduce(swapped, {
      type: "order-card",
      id: "wurl:PRY",
      index: 2,
    });
    expect(displaced.ordered).toEqual(["wurl:ARG", "wurl:BOL", "wurl:PRY"]);
    const helped = reduce(
      displaced,
      { type: "request-hint" },
      { type: "request-assist" },
    );
    expect(helped.ordered).toEqual(["wurl:PRY", "wurl:BOL", "wurl:ARG"]);
    expect(helped.help?.[order.id]).toBe("assisted");
    for (const action of [
      { type: "order-card", id: "wurl:ARG", index: -1 },
      { type: "order-card", id: "wurl:PRY", index: 2 },
    ] as Action[])
      expect(reduce(helped, action)).toBe(helped);
    const cleared = reduce(helped, { type: "clear" });
    expect(cleared.ordered).toEqual(["wurl:BOL", "wurl:PRY", "wurl:ARG"]);
    const bankSwap = reduce(correct, {
      type: "order-card",
      id: "wurl:PER",
      index: -1,
    });
    expect(bankSwap.ordered).toEqual(["wurl:PRY", "wurl:BOL", "wurl:ARG"]);
    expect(
      reduce(
        cleared,
        { type: "order-card", id: "wurl:PER", index: 0 },
        { type: "order-card", id: "wurl:BOL", index: 1 },
        { type: "submit" },
      ).answers.at(-1)?.correct,
    ).toBe(true);
    expect(() =>
      createQuestionContext(regions, [], {
        ...journey,
        rounds: [
          {
            ...order,
            guidance: {
              hint: "Hint",
              assist: {
                text: "Assist",
                fixedSlots: [{ index: 2, id: "wurl:PRY" }],
              },
            },
          },
        ],
      }),
    ).toThrow("Invalid ordering");
  });
  it("supports button placement, pointer drag, and the hint-to-lock transition", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    function Puzzle() {
      const [game, dispatch] = useReducer(
        (state: GameState, action: Action) =>
          gameReducer(state, action, journey, context),
        at(4),
      );
      return (
        <AnswerForm
          question={order}
          context={context}
          game={game}
          dispatch={dispatch}
          webgl
        />
      );
    }
    try {
      await act(async () => root.render(<Puzzle />));
      const button = (text: string) =>
        [...host.querySelectorAll<HTMLButtonElement>("button")].find(
          (element) => element.textContent?.includes(text),
        )!;
      await act(async () => button("Peru").click());
      await act(async () =>
        host
          .querySelector<HTMLButtonElement>('[aria-label="North: Bolivia"]')!
          .click(),
      );
      expect(host.querySelector('[aria-label="North: Peru"]')).toBeTruthy();
      expect(host.querySelectorAll(".order-card")).toHaveLength(4);
      expect(host.textContent).not.toContain("Spare cards");
      expect(host.textContent).toContain("Impostor");
      expect(host.textContent).not.toContain("North → South");
      expect(host.textContent).not.toContain("empty");
      const card = button("Bolivia");
      const middle = host.querySelector<HTMLElement>('[data-order-slot="1"]')!;
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: () => middle,
      });
      card.getBoundingClientRect = () =>
        ({ left: 40, top: 60, width: 240, height: 44 }) as DOMRect;
      await act(async () =>
        card.dispatchEvent(
          new MouseEvent("pointerdown", {
            bubbles: true,
            clientX: 100,
            clientY: 80,
          }),
        ),
      );
      await act(async () =>
        card.dispatchEvent(
          new MouseEvent("pointermove", {
            bubbles: true,
            clientX: 300,
            clientY: 150,
          }),
        ),
      );
      const preview = document.body.querySelector<HTMLElement>(
        ".order-drag-preview",
      )!;
      expect(host.contains(preview)).toBe(false); // Escape transformed panel ancestors.
      expect(preview.style.left).toBe("240px");
      expect(preview.style.top).toBe("130px");
      expect(preview.style.width).toBe("240px");
      expect(preview.style.height).toBe("44px");
      await act(async () =>
        card.dispatchEvent(
          new MouseEvent("pointerup", {
            bubbles: true,
            clientX: 300,
            clientY: 150,
          }),
        ),
      );
      expect(document.body.querySelector(".order-drag-preview")).toBeNull();
      expect(host.querySelector('[aria-label="Middle: Bolivia"]')).toBeTruthy();
      await act(async () => button("Get a hint").click());
      await act(async () => button("Need an assist?").click());
      expect(
        host.querySelector<HTMLButtonElement>(
          '[aria-label="South: Argentina, locked by assist"]',
        )!.disabled,
      ).toBe(true);
      expect(button("Submit answer").disabled).toBe(false);
      expect(
        host.querySelector('[data-order-slot="-1"]')?.textContent,
      ).toContain("Paraguay");
    } finally {
      await act(async () => root.unmount());
      host.remove();
      vi.unstubAllGlobals();
      delete (document as unknown as Record<string, unknown>).elementFromPoint;
    }
  });
});
