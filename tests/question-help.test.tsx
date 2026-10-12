// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GameShell } from "../src/game/GameShell";
import { SECOND_JOURNEY } from "./fixtures/engine/secondJourney";
import { COUNTRY_FACTS } from "./fixtures/engine/journey";
import { createQuestionContext } from "../src/game/questions";
import { initialGame } from "../src/game/state";
import { readFileSync } from "node:fs";
import type { RegionFeature } from "../src/geography/types";
const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(world, COUNTRY_FACTS, SECOND_JOURNEY);
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
const report = vi.fn();
async function render(roundIndex = 0, answered = false) {
  await act(async () =>
    root.render(
      <GameShell
        journey={SECOND_JOURNEY}
        context={context}
        game={{
          ...initialGame,
          phase: answered ? "feedback" : "playing",
          roundIndex,
          answers: answered
            ? [
                {
                  ...initialGame,
                  roundId: SECOND_JOURNEY.rounds[roundIndex].id,
                  correct: false,
                },
              ]
            : [],
        }}
        dispatch={() => {}}
        webgl
        frame={() => {}}
        onHome={() => {}}
        onStudy={() => {}}
        onReport={report}
      />,
    ),
  );
}
async function open() {
  await act(async () =>
    host
      .querySelector<HTMLButtonElement>('[aria-label="Question information"]')!
      .click(),
  );
}
it("keeps source/report controls out of the question body and opens the current question's utilities", async () => {
  report.mockClear();
  await render();
  expect(host.textContent).not.toContain("Sources");
  expect(host.textContent).not.toContain("Report this question");
  expect(
    host.querySelector(".round-overline .question-help-button"),
  ).not.toBeNull();
  await open();
  const dialog = document.querySelector('[role="dialog"]')!;
  expect(dialog.textContent).toContain("Sources");
  const details = dialog.querySelector("details")!;
  expect(details.open).toBe(false);
  await act(async () => details.querySelector("summary")!.click());
  expect(details.open).toBe(true);
  expect(dialog.querySelector("a")).toBeNull();
  expect(dialog.textContent).toContain("Sources appear after you answer.");
  expect(dialog.textContent).not.toContain(
    SECOND_JOURNEY.rounds[0].source.name,
  );
  await act(async () =>
    dialog.querySelector<HTMLButtonElement>("button")!.click(),
  );
  expect(report).toHaveBeenCalledWith(SECOND_JOURNEY.rounds[0].id);
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
it("closes on Escape and on changing questions, without leaking the prior question's sources", async () => {
  await render();
  await open();
  await act(async () =>
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
  );
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(document.activeElement).toBe(
    host.querySelector(".question-help-button"),
  );
  await open();
  await render(1, true);
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  await open();
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
    SECOND_JOURNEY.rounds[1].source.name.replace(/ · pinned /, " · "),
  );
});

it("reveals source links after answering without needing to leave the question", async () => {
  await render();
  await open();
  expect(document.querySelector('[role="dialog"] a')).toBeNull();
  await render(0, true);
  expect(
    document.querySelector('[role="dialog"] a')?.getAttribute("href"),
  ).toBe(SECOND_JOURNEY.rounds[0].source.url);
  expect(document.querySelector('[role="dialog"]')?.textContent).not.toContain(
    "Sources appear after you answer.",
  );
});
