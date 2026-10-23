// @vitest-environment jsdom
import { act, useReducer } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { AnswerForm } from "../src/game/AnswerForm";
import { AnswerReview } from "../src/game/AnswerReview";
import { QuestionAccuracy } from "../src/game/QuestionSupport";
import {
  INDIA_DATA,
  SHAPE_OF_INDIA_JOURNEY as journey,
} from "../src/game/shapeOfIndiaJourney";
import { createQuestionContext } from "../src/game/questionPreparation";
import {
  gameReducer,
  initialGame,
  type Action,
  type GameState,
} from "../src/game/state";
import { recalledIds } from "../src/game/countryRecall";
import { GameShell } from "../src/game/GameShell";
import type { RegionFeature } from "../src/geography/types";
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
const regions: RegionFeature[] = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
);
const context = createQuestionContext(regions, [], journey);

async function mount(id: string) {
  const q = journey.rounds.find((q) => q.id === id)!;
  let latest: GameState = {
    ...initialGame,
    phase: "playing",
    roundIndex: journey.rounds.indexOf(q),
  };
  let send: (a: Action) => void;
  function Host() {
    const [game, dispatch] = useReducer(
      (s: GameState, a: Action) => gameReducer(s, a, journey, context),
      latest,
    );
    latest = game;
    send = dispatch;
    return (
      <AnswerForm
        question={q}
        context={context}
        game={game}
        dispatch={dispatch}
        webgl
      />
    );
  }
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<Host />));
  return {
    host,
    get game() {
      return latest;
    },
    async send(a: Action) {
      await act(async () => send(a));
    },
    async close() {
      await act(async () => root.unmount());
      host.remove();
    },
  };
}
async function fill(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
const button = (host: HTMLElement, text: string) =>
  [...host.querySelectorAll("button")].find((b) =>
    b.textContent?.trim().startsWith(text),
  )!;

it("keeps country entry separate from Finish and exposes progressive score/help limits", async () => {
  const s = await mount("india-03-name-the-neighbors");
  try {
    const input = s.host.querySelector("input")!;
    await fill(input, "Afghanistan");
    await act(async () => button(s.host, "Add country").click());
    expect(s.host.textContent).toContain("beyond the area India administers");
    expect(s.host.textContent).toContain("0 / 3 incorrect");
    await fill(input, "Burma");
    await act(async () =>
      s.host
        .querySelector("form")!
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        ),
    );
    expect(recalledIds(s.game.recall)).toEqual(["wurl:MMR"]);
    expect(s.game.phase).toBe("playing");
    expect(s.host.querySelector(".recall-chips")?.textContent).toContain(
      "Myanmar",
    );
    await s.send({ type: "request-hint" });
    expect(s.host.textContent).toContain("2 / 3 max points");
    await s.send({ type: "request-assist" });
    expect(s.host.textContent).toContain("1 / 3 max points");
    expect(s.host.textContent).toContain("supplied by assist");
    await act(async () => button(s.host, "Finish").click());
    expect(s.game.answers[0].points).toBe(1);
    expect(s.game.answers[0].correct).toBe(false);
  } finally {
    await s.close();
  }
});

it("picks up and places tray pins, cancels pickup without losing a position, and undoes edits", async () => {
  const s = await mount("india-02-three-landscapes");
  try {
    const submit = button(s.host, "Submit pins");
    const pin = (label: string) =>
      s.host.querySelector(
        `[aria-label="Pick up ${label} pin"]`,
      ) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect(s.host.querySelectorAll(".pin-tray button")).toHaveLength(3);
    expect(s.host.querySelector("details")).toBeNull();
    await s.send({ type: "drop-labeled-pin", lat: 30.7, lng: 78.7 });
    expect(s.game.construction).toBeUndefined();
    await act(async () => pin("Himalayas").click());
    expect(s.game.activePinSlot).toBe("himalayas");
    expect(s.host.textContent).toContain("In hand");
    await s.send({ type: "drop-labeled-pin", lat: 30.7, lng: 78.7 });
    expect(s.game.activePinSlot).toBeUndefined();
    expect(pin("Himalayas").dataset.placed).toBe("true");
    const original = structuredClone(s.game.construction);
    await act(async () => pin("Himalayas").click());
    await act(async () => pin("Himalayas").click());
    expect(s.game.activePinSlot).toBeUndefined();
    expect(s.game.construction).toEqual(original);
    await act(async () => pin("Himalayas").click());
    await s.send({ type: "drop-labeled-pin", lat: 29, lng: 77 });
    await act(async () => button(s.host, "Undo pin edit").click());
    expect(s.game.construction).toEqual(original);
    await act(async () => pin("Thar Desert").click());
    await s.send({ type: "drop-labeled-pin", lat: 27, lng: 70.9 });
    await act(async () => pin("Indo-Gangetic Plain").click());
    await s.send({ type: "drop-labeled-pin", lat: 26.8, lng: 81 });
    expect(submit.disabled).toBe(false);
    await act(async () => pin("Himalayas").click());
    expect(submit.disabled).toBe(true);
    await act(async () => button(s.host, "Remove selected pin").click());
    expect(
      s.game.construction?.kind === "pins" &&
        s.game.construction.pins.himalayas,
    ).toBeUndefined();
    await act(async () => button(s.host, "Undo pin edit").click());
    expect(submit.disabled).toBe(false);
    await act(async () => submit.click());
    expect(s.game.answers[0].points).toBe(3);
  } finally {
    await s.close();
  }
});

it("discloses accuracy without spoilers and gives the density scale before help", () => {
  const q = journey.rounds.find(
    (q) => q.id === "india-05-half-the-population",
  )!;
  const markup = renderToStaticMarkup(
    <AnswerForm
      question={q}
      context={context}
      game={{
        ...initialGame,
        phase: "playing",
        roundIndex: journey.rounds.indexOf(q),
      }}
      dispatch={() => {}}
      webgl
    />,
  );
  expect(markup).toContain("People per km²");
  expect(markup).toContain("5,000+");
  expect(markup).not.toContain("49.99");
  const recall = journey.rounds.find((q) => q.mode === "country-recall")!;
  const accuracy = renderToStaticMarkup(<QuestionAccuracy question={recall} />);
  expect(accuracy).toContain("a third ends the round at zero");
  expect(accuracy).not.toContain("Bangladesh");
});

it("retains partial recall points and typed mistakes in the completed receipt", () => {
  const q = journey.rounds.find((q) => q.mode === "country-recall")!;
  let game: GameState = {
    ...initialGame,
    phase: "playing",
    roundIndex: journey.rounds.indexOf(q),
  };
  for (const text of ["China", "Sri Lanka"]) {
    game = gameReducer(game, { type: "text", value: text }, journey, context);
    game = gameReducer(game, { type: "recall-country" }, journey, context);
  }
  game = gameReducer(game, { type: "submit" }, journey, context);
  const html = renderToStaticMarkup(
    <GameShell
      journey={journey}
      context={context}
      game={{ ...game, phase: "finished", roundIndex: 4 }}
      dispatch={() => {}}
      webgl
      frame={() => {}}
      onHome={() => {}}
      onStudy={() => {}}
      constructionReviewIndex={2}
    />,
  );
  expect(html).toContain('aria-label="1 of 15 points"');
  expect(html).toContain("Six land neighbors");
  expect(html).toContain("Sri Lanka");
  expect(html).not.toContain("Still to find:");
  expect(html).toContain("Incorrect guesses:");
  expect(recalledIds(game.recall)).toContain("wurl:CHN");
  expect(INDIA_DATA.zones).toHaveLength(3);
});

it("omits successful and missing recall entries while retaining incorrect guesses", () => {
  const q = journey.rounds.find((q) => q.mode === "country-recall")!;
  let game: GameState = {
    ...initialGame,
    phase: "playing",
    roundIndex: journey.rounds.indexOf(q),
  };
  for (const text of [
    "Pakistan",
    "China",
    "Nepal",
    "Bhutan",
    "Bangladesh",
    "Myanmar",
  ]) {
    game = gameReducer(game, { type: "text", value: text }, journey, context);
    game = gameReducer(game, { type: "recall-country" }, journey, context);
  }
  const html = renderToStaticMarkup(
    <AnswerReview question={q} context={context} game={game} />,
  );
  expect(html).toBe("");
});
it("keeps the population control and legend free of undo, reset and technical scale text", async () => {
  const s = await mount("india-05-half-the-population");
  try {
    await s.send({
      type: "construction",
      value: {
        version: 1,
        kind: "cut",
        points: INDIA_DATA.balancedExamples[0].points,
      },
    });
    expect(s.host.querySelector('[aria-label="Remove last point"]')).toBeNull();
    expect(s.host.querySelector('[aria-label="Reset shape"]')).toBeNull();
    expect(s.host.textContent).not.toContain("logarithmic");
    expect(button(s.host, "Submit shape").disabled).toBe(false);
  } finally {
    await s.close();
  }
});
