// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ELEVENTH_JOURNEY as journey } from "../src/game/eleventhJourney";
import { JOURNEYS } from "../src/game/journeys";
import { createQuestionContext, isCorrect } from "../src/game/questions";
import type { Journey } from "../src/game/questions";
import { gameReducer, initialGame, journeyScore } from "../src/game/state";
import type { Action, GameState } from "../src/game/state";
import { GameShell } from "../src/game/GameShell";
import { helpSummary } from "../src/game/guidance";
import { journeyWorld } from "../src/app/journeyWorld";
import { validGame } from "../src/app/dailyProgress";
import { ANSWER_PLACES } from "../src/game/answerTargets";
import type { RegionFeature } from "../src/geography/types";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(regions, [], journey);
const at = (roundIndex = 0): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex,
});
const reduce = (state: GameState, ...actions: Action[]) =>
  actions.reduce(
    (game, action) => gameReducer(game, action, journey, context),
    state,
  );
const helped = (roundIndex: number) =>
  reduce(at(roundIndex), { type: "request-hint" }, { type: "request-assist" });
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
const shell = (
  game: GameState,
  dispatch: (action: Action) => void = () => {},
) => (
  <GameShell
    journey={journey}
    context={context}
    game={game}
    dispatch={dispatch}
    webgl
    frame={() => {}}
    onHome={() => {}}
    onStudy={() => {}}
    onPlayground={() => {}}
  />
);

describe("authored Journey hint and assist stages", () => {
  it("authors both stages only for Not the obvious city and validates candidate uncertainty", () => {
    for (const pack of JOURNEYS)
      expect(
        pack.rounds.every(
          (round) => !!round.guidance === (pack.id === journey.id),
        ),
      ).toBe(true);
    expect(journey.rounds.every((round) => !!round.guidance?.assist)).toBe(
      true,
    );
    const invalid: Journey = {
      ...journey,
      rounds: [
        {
          ...journey.rounds[0],
          guidance: {
            hint: "A clue",
            assist: { text: "Too easy", candidateIds: ["city:ankara"] },
          },
        },
      ],
    };
    expect(() => createQuestionContext(regions, [], invalid)).toThrow(
      "plausible alternatives",
    );
    invalid.rounds[0].guidance!.assist!.candidateIds = [
      "city:izmir",
      "city:bursa",
    ];
    expect(() => createQuestionContext(regions, [], invalid)).toThrow(
      "preserve answers",
    );
  });

  it("reveals the hint, changes button label/color/icon, and exhausts assistance without submitting", async () => {
    let game = at();
    async function render() {
      await act(async () =>
        root.render(
          shell(game, (action) => {
            game = reduce(game, action);
          }),
        ),
      );
    }
    async function clickHelp() {
      await act(async () =>
        host.querySelector<HTMLButtonElement>(".answer-hint-button")!.click(),
      );
      await render();
    }
    await render();
    const beforeIcon = host
      .querySelector(".answer-hint-button path")!
      .getAttribute("d");
    expect(host.querySelector(".question-guidance")).toBeNull();
    expect(host.querySelector(".answer-hint-button")!.textContent).toContain(
      "Need a hint?",
    );
    await clickHelp();
    expect(game.phase).toBe("playing");
    expect(host.textContent).toContain(journey.rounds[0].guidance!.hint);
    expect(host.textContent).not.toContain(
      journey.rounds[0].guidance!.assist!.text,
    );
    const assistButton = host.querySelector<HTMLButtonElement>(
      ".answer-assist-button",
    )!;
    expect(assistButton.textContent).toContain("Need an assist?");
    expect(assistButton.disabled).toBe(false);
    expect(assistButton.querySelector("path")!.getAttribute("d")).not.toBe(
      beforeIcon,
    );
    await clickHelp();
    expect(host.textContent).toContain(journey.rounds[0].guidance!.hint);
    expect(host.textContent).toContain(
      journey.rounds[0].guidance!.assist!.text,
    );
    expect(
      host.querySelector<HTMLButtonElement>(".answer-assist-button")!.disabled,
    ).toBe(true);
    expect(
      host.querySelectorAll(".candidate-grid button:disabled"),
    ).toHaveLength(3);
    expect(game.answers).toHaveLength(0);
    const restored = JSON.parse(JSON.stringify(game)) as GameState;
    await act(async () => root.render(shell(restored)));
    expect(
      host.querySelector<HTMLButtonElement>(".answer-assist-button")!.disabled,
    ).toBe(true);
  });

  it("enforces stage order, phase, idempotence and preserves selections and typed drafts", () => {
    expect(reduce(at(), { type: "request-assist" })).toEqual(at());
    const selected = reduce(at(), { type: "select", id: "city:izmir" });
    const assist = reduce(
      selected,
      { type: "request-hint" },
      { type: "request-assist" },
    );
    expect(assist.selectedIds).toEqual(selected.selectedIds);
    expect(renderToStaticMarkup(shell(assist))).toContain(
      "Your earlier selection is kept.",
    );
    expect(
      reduce(assist, { type: "request-hint" }, { type: "request-assist" }),
    ).toBe(assist);
    const removed = reduce(assist, { type: "select", id: "city:izmir" });
    expect(removed.selectedIds).toEqual([]);
    expect(reduce(removed, { type: "select", id: "city:izmir" })).toBe(removed);
    const wrong = reduce(assist, { type: "submit" });
    expect(wrong.answers[0].correct).toBe(false);
    expect(reduce(wrong, { type: "request-hint" })).toBe(wrong);
    const next = reduce(wrong, { type: "next" });
    expect(next.help).toEqual(assist.help);
    expect(next.help?.[journey.rounds[1].id]).toBeUndefined();
    expect(reduce(assist, { type: "start" }).help).toBeUndefined();
    const typed = reduce(
      at(2),
      { type: "text", value: "my draft" },
      { type: "request-hint" },
      { type: "request-assist" },
    );
    expect(typed.text).toBe("my draft");
    const unauthored = {
      ...journey,
      rounds: [{ ...journey.rounds[0], guidance: undefined }],
    };
    expect(
      gameReducer(at(), { type: "request-hint" }, unauthored, context),
    ).toEqual(at());
  });

  it("narrows markers equally, keeps them anonymous, guards map/fallback inputs and restores the reveal", () => {
    const game = helped(3);
    const world = journeyWorld(regions, journey, game, context);
    expect(world.places.map((place) => place.id)).toEqual(
      journey.rounds[3].guidance!.assist!.candidateIds,
    );
    expect(
      world.places.every(
        (place) =>
          place.visualState === "selectable" &&
          place.labelHidden &&
          !place.hoverName,
      ),
    ).toBe(true);
    expect(reduce(game, { type: "select", id: "place:3451190" })).toBe(game);
    const typed = reduce(game, { type: "text", value: "Rio de Janeiro" });
    const rejected = reduce(typed, { type: "guess-country" });
    expect(rejected.phase).toBe("playing");
    expect(rejected.selectedIds).toEqual([]);
    expect(rejected.inputError).toContain("removed by the assist");
    const feedback = reduce(game, { type: "select", id: "place:3469058" });
    expect(feedback.phase).toBe("feedback");
    expect(feedback.answers[0].correct).toBe(true);
    expect(
      journeyWorld(regions, journey, feedback, context).places,
    ).toHaveLength(6);
    const southAfrica = journeyWorld(regions, journey, helped(4), context);
    expect(southAfrica.places).toHaveLength(4);
    expect(
      southAfrica.places.every(
        (place) => !!place.name && place.visualState === "selectable",
      ),
    ).toBe(true);
  });

  it("adds a broad pin search area without recentering, exposing the target, or changing grading", () => {
    const q = journey.rounds[1];
    const before = journeyWorld(regions, journey, at(1), context);
    const assist = helped(1);
    const world = journeyWorld(regions, journey, assist, context);
    expect(world.places).toEqual([]);
    expect(world.focus).toEqual(before.focus);
    expect(world.overlays).toEqual(q.guidance!.assist!.overlays);
    const target = ANSWER_PLACES.get("place:2172517")!;
    for (const pin of [
      target,
      { lat: target.lat + 1, lng: target.lng },
      { lat: target.lat + 2, lng: target.lng },
    ]) {
      const submitted = reduce(
        assist,
        { type: "drop-pin", ...pin },
        { type: "submit" },
      );
      expect(submitted.answers[0].correct).toBe(
        isCorrect(q, context, { ...initialGame, pin }),
      );
      expect(
        journeyWorld(regions, journey, submitted, context).overlays,
      ).not.toContainEqual(q.guidance!.assist!.overlays![0]);
    }
    expect(q.rule).toMatchObject({ radiusKm: 150 });
  });

  it("keeps correctness and completion intact, annotates help and validates persisted usage", () => {
    let game = helped(0);
    game = reduce(
      game,
      { type: "select", id: "city:ankara" },
      { type: "submit" },
    );
    expect(journeyScore(game)).toBe(1);
    expect(helpSummary(game)).toEqual({
      hints: 1,
      assists: 1,
      status: "assisted",
    });
    const html = renderToStaticMarkup(shell({ ...game, phase: "finished" }));
    expect(html).toContain("1 hint · 1 assist");
    expect(html).toContain("Assisted");
    expect(validGame(JSON.parse(JSON.stringify(game)), journey)).toBe(true);
    expect(validGame({ ...game, help: { fake: "hinted" } }, journey)).toBe(
      false,
    );
    expect(
      validGame(
        { ...game, help: { [journey.rounds[0].id]: "wrong" } },
        journey,
      ),
    ).toBe(false);
    expect(validGame(at(), journey)).toBe(true);
  });
});
