// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { GameShell } from "../src/game/GameShell";
import { ModePanels } from "../src/app/ModePanels";
import { SUN_FLAGS_JOURNEY as journey } from "../src/game/sunFlagsJourney";
import { createQuestionContext } from "../src/game/questions";
import { gameReducer, initialGame } from "../src/game/state";
import type { GameState } from "../src/game/state";
import type { RegionFeature } from "../src/geography/types";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(regions, [], journey);
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
async function render(game: GameState, hidden = false) {
  await act(async () =>
    root.render(
      <ModePanels mode="/journey/chasing-the-sun" reduced hidden={hidden}>
        <GameShell
          journey={journey}
          context={context}
          game={game}
          dispatch={() => {}}
          webgl
          frame={() => {}}
          onHome={() => {}}
          onStudy={() => {}}
        />
      </ModePanels>,
    ),
  );
}
const start: GameState = { ...initialGame, phase: "playing" };

describe("Journey panel reading position", () => {
  it("starts a new question at the top of both scroll containers and focuses the new heading", async () => {
    let game = gameReducer(
      start,
      { type: "select", id: "wurl:ARG" },
      journey,
      context,
    );
    game = gameReducer(
      game,
      { type: "select", id: "wurl:URY" },
      journey,
      context,
    );
    game = gameReducer(game, { type: "submit" }, journey, context);
    await render(game);
    const card = host.querySelector<HTMLElement>(".question-card")!;
    const tray = host.querySelector<HTMLElement>(".mode-layer")!;
    card.scrollTop = 400;
    tray.scrollTop = 300;
    await render(gameReducer(game, { type: "next" }, journey, context));
    expect(card.scrollTop).toBe(0);
    expect(tray.scrollTop).toBe(0);
    expect(card.dataset.questionId).toBe("sun-flags-philippines-revolution-v2");
    expect(document.activeElement).toBe(card.querySelector("h1"));
  });
  it("keeps the reading position while selecting, opening help, and revealing an answer", async () => {
    await render(start);
    const card = host.querySelector<HTMLElement>(".question-card")!;
    const tray = host.querySelector<HTMLElement>(".mode-layer")!;
    card.scrollTop = 220;
    tray.scrollTop = 150;
    let game = start;
    for (const action of [
      { type: "request-hint" as const },
      { type: "request-assist" as const },
      { type: "select" as const, id: "wurl:ARG" },
      { type: "select" as const, id: "wurl:URY" },
      { type: "submit" as const },
    ]) {
      game = gameReducer(game, action, journey, context);
      await render(game);
      expect(card.scrollTop).toBe(220);
      expect(tray.scrollTop).toBe(150);
    }
  });
  it("does not move focus into a hidden panel", async () => {
    const outside = document.createElement("button");
    host.before(outside);
    outside.focus();
    await render(start, true);
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });
});
