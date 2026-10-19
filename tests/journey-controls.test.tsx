// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnswerForm } from "../src/game/AnswerForm";
import { JOURNEY, COUNTRY_FACTS } from "./fixtures/engine/journey";
import { FIFTEENTH_JOURNEY } from "../src/game/fifteenthJourney";
import { createQuestionContext } from "../src/game/questions";
import type { Journey } from "../src/game/questions";
import { gameReducer, initialGame } from "../src/game/state";
import type { GameState } from "../src/game/state";
import type { RegionFeature } from "../src/geography/types";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const numbers: Journey = {
  ...JOURNEY,
  rounds: [{ ...JOURNEY.rounds[1], rule: { type: "manual-number", value: 2 } }],
};
let root: Root, host: HTMLDivElement, current: GameState;
function Harness({
  journey,
  pin,
}: {
  journey: Journey;
  pin?: GameState["pin"];
}) {
  const [game, setGame] = useState<GameState>({
    ...initialGame,
    phase: "playing",
    pin,
  });
  const [context] = useState(() =>
    createQuestionContext(regions, COUNTRY_FACTS, journey),
  );
  current = game;
  return (
    <AnswerForm
      question={journey.rounds[0]}
      context={context}
      game={game}
      dispatch={(action) =>
        setGame((state) => gameReducer(state, action, journey, context))
      }
      webgl
    />
  );
}
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
async function click(label: string) {
  const button = [...host.querySelectorAll<HTMLButtonElement>("button")].find(
    (button) =>
      button.getAttribute("aria-label") === label ||
      button.textContent?.trim().startsWith(label),
  )!;
  await act(async () => button.click());
}
async function enter(value: string) {
  const input = host.querySelector<HTMLInputElement>("#written-answer")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
const submit = () =>
  host.querySelector<HTMLButtonElement>("button.answer-submit-button")!;

describe("Journey answer controls", () => {
  it("starts unanswered, steps explicitly down to zero, and submits the player's chosen number", async () => {
    await act(async () => root.render(<Harness journey={numbers} />));
    expect(submit().disabled).toBe(true);
    expect(
      host.querySelector<HTMLButtonElement>('[aria-label="Decrease answer"]')!
        .disabled,
    ).toBe(true);
    await click("Increase answer");
    expect(current.text).toBe("1");
    expect(current.answers).toHaveLength(0);
    await click("Decrease answer");
    expect(current.text).toBe("0");
    await click("Decrease answer");
    expect(current.text).toBe("0");
    await click("Increase answer");
    await click("Increase answer");
    await click("Submit answer");
    expect(current.phase).toBe("feedback");
    expect(current.answers[0]).toMatchObject({ text: "2", correct: true });
  });

  it("keeps direct number entry, rejects negative/fractional/blank answers, and supports form submission", async () => {
    await act(async () => root.render(<Harness journey={numbers} />));
    for (const value of ["-1", "1.5", ""]) {
      await enter(value);
      expect(submit().disabled).toBe(true);
    }
    await enter("12");
    await click("Decrease answer");
    expect(current.text).toBe("11");
    await enter("2");
    const input = host.querySelector<HTMLInputElement>("#written-answer")!;
    expect(input.labels?.[0].textContent).toBe("Border crossings");
    expect(input.inputMode).toBe("numeric");
    await act(async () =>
      host
        .querySelector("form")!
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        ),
    );
    expect(current.answers[0]).toMatchObject({ text: "2", correct: true });
  });

  it("keeps pin submission and removal together without coordinate entry", async () => {
    await act(async () =>
      root.render(
        <Harness journey={FIFTEENTH_JOURNEY} pin={{ lat: 61, lng: 25 }} />,
      ),
    );
    expect(
      host.querySelector(".pin-answer-actions .answer-submit-button"),
    ).toBe(submit());
    expect(submit().disabled).toBe(false);
    expect(host.textContent).not.toContain("Enter coordinates");
    await click("Remove pin");
    expect(current.pin).toBeUndefined();
    expect(submit().disabled).toBe(true);
    expect(host.querySelector(".commit-note")?.textContent).toContain(
      "Tap land or water to place a pin",
    );
    expect(host.querySelector("#pin-latitude")).toBeNull();
  });
});
