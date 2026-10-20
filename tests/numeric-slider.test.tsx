// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { REGGAETON_JOURNEY as journey } from "../src/game/reggaetonJourney";
import { AnswerForm } from "../src/game/AnswerForm";
import { canSubmit, isCorrect } from "../src/game/questionEvaluation";
import { createQuestionContext } from "../src/game/questionPreparation";
import { validateQuestionContract } from "../src/game/questionBuilder";
import { submittedPoints } from "../src/game/points";
import { estimateBands, estimateValue } from "../src/game/numericEstimate";
import { initialGame, gameReducer } from "../src/game/state";
import { validGame } from "../src/app/daily";
import type { GameState } from "../src/game/state";
import type { RegionFeature } from "../src/geography/types";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(regions, [], journey);
const question = journey.rounds.find((q) => q.id === "reggaeton-05-medellin")!;
if (question.rule.type !== "numeric-range")
  throw Error("Expected numeric range");
const rule = question.rule;
const start: GameState = {
  ...initialGame,
  phase: "playing",
  roundIndex: journey.rounds.indexOf(question),
  answers: journey.rounds.slice(0, 4).map((q) => ({
    ...initialGame,
    roundId: q.id,
    correct: true,
    points: 3,
    pointsVersion: 1,
  })),
};
const response = (text: string) => ({ ...start, text });

it("requires a deliberate finite, in-bounds, step-aligned estimate, including zero", () => {
  for (const text of ["", " ", "NaN", "Infinity", "-50", "5050", "1725"])
    expect(canSubmit(question, context, response(text)), text).toBe(false);
  for (const text of ["0", "50", "1700", "5000"])
    expect(canSubmit(question, context, response(text)), text).toBe(true);
  expect(gameReducer(start, { type: "submit" }, journey, context)).toEqual(
    start,
  );
  expect(isCorrect(question, context, response("1725"))).toBe(false);
});

it("grades both inclusive edges of each error band and independently caps points for help", () => {
  for (const [error, points] of [
    [0, 3],
    [100, 3],
    [150, 2],
    [300, 2],
    [350, 1],
    [500, 1],
    [550, 0],
  ]) {
    for (const sign of [-1, 1]) {
      const guess = response(String(rule.value + sign * error));
      const correct = isCorrect(question, context, guess);
      expect(correct).toBe(points > 0);
      expect(submittedPoints(question, guess, correct)).toBe(points);
      expect(submittedPoints(question, guess, correct, "hinted")).toBe(
        Math.min(points, 2),
      );
      expect(submittedPoints(question, guess, correct, "assisted")).toBe(
        Math.min(points, 1),
      );
      expect(
        estimateBands(question, guess).filter((band) => band.achieved),
      ).toHaveLength(points ? 1 : 0);
    }
  }
  const untiered = { ...question, rule: { ...rule, tiers: undefined } };
  expect(submittedPoints(untiered, response("2200"), true)).toBe(3);
});

it("rejects broken authored bounds and bands while supporting decimal and negative scales", () => {
  for (const change of [
    { min: 5000 },
    { max: 1 },
    { step: 0 },
    { step: 30 },
    { value: Infinity },
    { value: 6000 },
    { tolerance: -1 },
    { unit: " " },
    { tiers: [{ tolerance: 100, feedback: "Close" }] },
    { tiers: rule.tiers!.map((tier) => ({ ...tier, tolerance: 500 })) },
  ]) {
    expect(() =>
      validateQuestionContract({ ...question, rule: { ...rule, ...change } }),
    ).toThrow();
  }
  expect(() =>
    validateQuestionContract({ ...question, inputLabel: "" }),
  ).toThrow();
  const decimal = {
    ...rule,
    min: -5,
    max: 5,
    step: 0.5,
    value: 0.5,
    tolerance: 1,
    tiers: undefined,
  };
  expect(() =>
    validateQuestionContract({ ...question, rule: decimal }),
  ).not.toThrow();
  expect(estimateValue(decimal, response("-0.5"))).toBe(-0.5);
  expect(estimateValue(decimal, response("0.25"))).toBeUndefined();
});

it("restores, edits and submits a numeric draft through the existing save register", () => {
  const draft = gameReducer(
    start,
    { type: "text", value: "2050" },
    journey,
    context,
  );
  const restored: GameState = JSON.parse(JSON.stringify(draft));
  expect(validGame(restored, journey)).toBe(true);
  const helped = gameReducer(
    restored,
    { type: "request-hint" },
    journey,
    context,
  );
  expect(helped.text).toBe("2050");
  expect(helped.answers).toHaveLength(4);
  const edited = gameReducer(
    helped,
    { type: "text", value: "1700" },
    journey,
    context,
  );
  const submitted = gameReducer(edited, { type: "submit" }, journey, context);
  expect(submitted.answers.at(-1)).toMatchObject({
    text: "1700",
    correct: true,
    points: 2,
  });
  expect(validGame(JSON.parse(JSON.stringify(submitted)), journey)).toBe(true);
});

describe("numeric slider control without WebGL", () => {
  let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });
  async function render(game = start) {
    function Harness() {
      const [state, setState] = useState(game);
      return (
        <AnswerForm
          question={question}
          context={context}
          game={state}
          webgl={false}
          dispatch={(action) =>
            setState((previous) =>
              gameReducer(previous, action, journey, context),
            )
          }
        />
      );
    }
    await act(async () => root.render(<Harness />));
  }
  const slider = () =>
    host.querySelector<HTMLInputElement>('input[type="range"]')!;
  const submit = () =>
    host.querySelector<HTMLButtonElement>('button[type="submit"]')!;

  it("labels the native range, leaves its default uncommitted and wires pointer/keyboard confirmation", async () => {
    await render();
    expect(host.querySelector('label[for="written-answer"]')?.textContent).toBe(
      "Distance in kilometres",
    );
    expect(slider().getAttribute("min")).toBe("0");
    expect(slider().getAttribute("max")).toBe("5000");
    expect(slider().getAttribute("step")).toBe("50");
    expect(slider().getAttribute("aria-valuetext")).toBe(
      "No estimate selected",
    );
    expect(submit().disabled).toBe(true);
    await act(async () =>
      slider().dispatchEvent(
        new KeyboardEvent("keyup", { key: "ArrowRight", bubbles: true }),
      ),
    );
    expect(submit().disabled).toBe(false);
    expect(host.querySelector("output")?.textContent).toBe("2,500 km");
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    await act(async () => {
      setter.call(slider(), "1800");
      slider().dispatchEvent(new Event("input", { bubbles: true }));
      slider().dispatchEvent(new Event("pointerup", { bubbles: true }));
    });
    expect(host.querySelector("output")?.textContent).toBe("1,800 km");
    expect(slider().getAttribute("aria-valuetext")).toBe("1,800 km");
  });

  it("shows a restored estimate and permits submission without forcing another drag", async () => {
    await render(response("2050"));
    expect(slider().value).toBe("2050");
    expect(host.querySelector("output")?.textContent).toBe("2,050 km");
    expect(submit().disabled).toBe(false);
  });
});
