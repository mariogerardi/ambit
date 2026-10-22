// @vitest-environment jsdom
import { act, useReducer } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { it, expect, vi } from "vitest";
import { AnswerForm } from "../src/game/AnswerForm";
import { CONSTRUCTION_RECIPES } from "../src/game/constructionRecipes";
import { initialGame, gameReducer, type GameState } from "../src/game/state";
import { createQuestionContext } from "../src/game/questionPreparation";
import { QuestionAccuracy } from "../src/game/QuestionSupport";
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
it("keeps paint, erase, size and edit actions in one row without coordinate entry", async () => {
  const { DRAWING_SAHARA_JOURNEY } = await import(
    "../src/game/drawingSaharaJourney"
  );
  const q = DRAWING_SAHARA_JOURNEY.rounds[0],
    journey = { ...DRAWING_SAHARA_JOURNEY, rounds: [q] },
    context = createQuestionContext([], [], journey);
  let latest: GameState = {
    ...initialGame,
    phase: "playing",
    construction: {
      version: 1,
      kind: "brush",
      strokes: [{ points: [{ lat: 30, lng: 7 }], radiusKm: 160, erase: false }],
    },
  };
  function Host() {
    const [game, dispatch] = useReducer(
      (s: GameState, a: Parameters<typeof gameReducer>[1]) =>
        gameReducer(s, a, journey, context),
      latest,
    );
    latest = game;
    return (
      <AnswerForm
        question={q}
        game={game}
        dispatch={dispatch}
        context={context}
        webgl
      />
    );
  }
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<Host />));
  const row = host.querySelector('[aria-label="Painting controls"]')!,
    slider = row.querySelector("input")!;
  expect(slider.value).toBe("160");
  expect(row.textContent).toContain("160 km");
  expect(row.querySelectorAll("svg").length).toBe(4);
  expect(host.querySelector("details")).toBeNull();
  expect(host.textContent).not.toContain("Brush radius");
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(slider, "240");
    slider.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(latest.brushRadiusKm).toBe(240);
  expect(row.textContent).toContain("240 km");
  const erase = [...row.querySelectorAll("button")].find((b) =>
    b.textContent?.includes("Erase"),
  )!;
  await act(async () => erase.click());
  expect(latest.constructionTool).toBe("erase");
  const reset = row.querySelector(
    '[aria-label="Reset shape"]',
  ) as HTMLButtonElement;
  await act(async () => reset.click());
  expect(latest.construction).toBeUndefined();
  await act(async () => root.unmount());
  host.remove();
});
it("discloses all quality bands before answering for each independent mode", () => {
  for (const question of CONSTRUCTION_RECIPES) {
    const markup = renderToStaticMarkup(
      <QuestionAccuracy question={question} />,
    );
    expect(markup).toContain("Accuracy");
    expect(markup).toContain("3");
  }
});

it("shows manual completion controls and removes the brush coordinate disclosure", async () => {
  const { GameShell } = await import("../src/game/GameShell");
  const { DRAWING_SAHARA_JOURNEY: journey } = await import(
    "../src/game/drawingSaharaJourney"
  );
  const { constructionAuditSample } = await import(
    "../src/game/constructionAudit"
  );
  const { readFileSync } = await import("node:fs");
  const { evaluateConstruction } = await import("../src/game/construction");
  const context = createQuestionContext(
    JSON.parse(readFileSync("public/geography/world.v1.json", "utf8")),
    [],
    journey,
  );
  const game: GameState = {
    ...initialGame,
    phase: "finished",
    roundIndex: 4,
    answers: journey.rounds.map((q, i) => {
      const construction = constructionAuditSample(q, true);
      return {
        ...initialGame,
        roundId: q.id,
        construction,
        constructionResult: evaluateConstruction(q, {
          ...initialGame,
          construction,
        }),
        correct: true,
        points: 3,
        pointsVersion: 1,
        roundIndex: i,
      };
    }),
  };
  const props = {
    journey,
    context,
    game,
    dispatch: () => {},
    webgl: true,
    frame: () => {},
    onHome: () => {},
    onStudy: () => {},
    constructionReviewIndex: 1,
  };
  const markup = renderToStaticMarkup(<GameShell {...props} />);
  expect(markup).toContain('aria-label="Review your constructions"');
  expect(markup).toContain("Capitals enclosed");
  expect(markup).not.toContain("scoring cells");
  expect(markup).not.toContain("Your submitted shape is kept");
  const overview = renderToStaticMarkup(
    <GameShell {...props} constructionReviewIndex={undefined} />,
  );
  expect(overview).toContain("Overview");
  expect(overview).not.toContain("Your construction result");
  const playing = renderToStaticMarkup(
    <GameShell
      {...props}
      webgl={false}
      game={{ ...initialGame, phase: "playing" }}
    />,
  );
  expect(playing).not.toContain("Enter or edit a location");
  expect(playing).not.toContain("Move globe");
  expect(playing).toContain("Submit shape");
});

it("refreshes editorial feedback without changing frozen population metrics or points", async () => {
  const { GameShell } = await import("../src/game/GameShell"),
    { DRAWING_SAHARA_JOURNEY: journey } = await import(
      "../src/game/drawingSaharaJourney"
    ),
    { evaluateConstruction } = await import("../src/game/construction"),
    { readFileSync } = await import("node:fs");
  const context = createQuestionContext(
      JSON.parse(readFileSync("public/geography/world.v1.json", "utf8")),
      [],
      journey,
    ),
    q = journey.rounds[4],
    construction = q.constructionExample!,
    result = evaluateConstruction(q, { ...initialGame, construction })!;
  result.feedback = "People, not land.";
  const game: GameState = {
      ...initialGame,
      phase: "feedback",
      roundIndex: 4,
      construction,
      constructionResult: result,
      answers: [
        {
          ...initialGame,
          roundId: q.id,
          construction,
          constructionResult: result,
          correct: true,
          points: 3,
          pointsVersion: 1,
        },
      ],
    },
    before = JSON.stringify(game);
  const markup = renderToStaticMarkup(
    <GameShell
      journey={journey}
      context={context}
      game={game}
      dispatch={() => {}}
      webgl
      frame={() => {}}
      onHome={() => {}}
      onStudy={() => {}}
    />,
  );
  expect(markup).toContain("An even split.");
  expect(markup).not.toContain("People, not land.");
  expect(markup).not.toContain("construction-model-note");
  expect(JSON.stringify(game)).toBe(before);
});

it("keeps the island target in play and explains scoring with each question result", async () => {
  const { WITHIN_REACH_JOURNEY: journey } = await import(
    "../src/game/withinReachJourney"
  );
  const { GameShell } = await import("../src/game/GameShell");
  const { readFileSync } = await import("node:fs");
  const context = createQuestionContext(
    JSON.parse(readFileSync("public/geography/world.v1.json", "utf8")),
    [],
    journey,
  );
  const game: GameState = {
    ...initialGame,
    phase: "playing",
    construction: {
      version: 1,
      kind: "circle",
      center: { lat: 42.31, lng: -70.95 },
    },
  };
  const before = JSON.stringify(game),
    pulse = vi.fn(),
    frame = vi.fn(),
    dispatch = vi.fn();
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const props = {
    journey,
    context,
    game,
    dispatch,
    webgl: true,
    frame,
    onPulseIslands: pulse,
    onHome: () => {},
    onStudy: () => {},
  };
  await act(async () => root.render(<GameShell {...props} />));
  expect(host.querySelector('[aria-label="Reset shape"]')).toBeNull();
  const buttons = [...host.querySelectorAll("button")];
  await act(async () =>
    buttons.find((b) => b.textContent?.includes("Pulse islands"))!.click(),
  );
  await act(async () =>
    buttons.find((b) => b.textContent?.includes("Recenter view"))!.click(),
  );
  expect(pulse).toHaveBeenCalledOnce();
  expect(frame).toHaveBeenCalledWith(journey.rounds[0].focus);
  expect(dispatch).not.toHaveBeenCalled();
  expect(JSON.stringify(game)).toBe(before);
  expect(
    host.querySelector('[aria-label="Best possible: 16 islands"]')?.textContent,
  ).toMatch(/16\s+islands/);
  expect(host.querySelector('[aria-label="Island scoring"]')).toBeNull();
  expect(host.textContent).not.toContain("1–2 fewer");
  expect(host.textContent).not.toContain("or fewer: 0 points");
  const answered = gameReducer(game, { type: "submit" }, journey, context);
  await act(async () => root.render(<GameShell {...props} game={answered} />));
  const scoring = host.querySelector('[aria-label="Island scoring"]')!;
  expect(host.textContent).not.toContain("Whole islands enclosed");
  expect(host.querySelector('[aria-label="Your construction result"]')).toBeNull();
  expect(scoring.querySelectorAll("tbody tr")).toHaveLength(1);
  expect(scoring.textContent).toContain("Boston Harbor");
  expect(scoring.textContent).toContain("14–15");
  expect(scoring.textContent).toContain("11–13");
  expect(scoring.textContent).not.toContain("Isles of Scilly");
  expect(scoring.querySelectorAll('[role="img"]')).toHaveLength(3);
  expect(scoring.textContent).not.toContain("or fewer");
  const finished: GameState = {
    ...game,
    phase: "finished",
    roundIndex: 4,
    help: { [journey.rounds[0].id]: "assisted" },
  };
  await act(async () => root.render(<GameShell {...props} game={finished} />));
  expect(host.querySelector('[aria-label="Island scoring"]')).toBeNull();
  await act(async () =>
    root.render(
      <GameShell {...props} game={finished} constructionReviewIndex={0} />,
    ),
  );
  expect(
    host.querySelectorAll('[aria-label="Island scoring"] tbody tr'),
  ).toHaveLength(1);
  expect(host.querySelector('[aria-label="Your construction result"]')).toBeNull();
  expect(
    host.querySelector('[aria-label="Island scoring"]')?.textContent,
  ).toContain("Assist cap: 1 point");
  await act(async () => root.unmount());
  host.remove();
});
