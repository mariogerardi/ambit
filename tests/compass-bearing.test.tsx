// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { act, useReducer } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VACCINE_EXPEDITION_JOURNEY as journey } from "../src/game/vaccineExpeditionJourney";
import {
  angularError,
  greatCircleArc,
  initialBearing,
  normalizeBearing,
  pointAlongBearing,
} from "../src/game/geodesic";
import { bearingValue, reviewedBearing } from "../src/game/compassBearing";
import { canSubmit, isCorrect } from "../src/game/questionEvaluation";
import { createQuestionContext } from "../src/game/questionPreparation";
import {
  defineQuestion,
  validateQuestionContract,
} from "../src/game/questionBuilder";
import { initialGame, gameReducer, type GameState } from "../src/game/state";
import { submittedPoints, journeyPoints } from "../src/game/points";
import { journeyWorld } from "../src/app/journeyWorld";
import { auditJourney } from "../src/game/journeyAudit";
import { auditVisualScene } from "../src/game/journeyVisualRules";
import { validGame } from "../src/app/daily";
import { AnswerForm } from "../src/game/AnswerForm";
import { CompassReview } from "../src/game/CompassAnswer";
import { QuestionAccuracy } from "../src/game/QuestionSupport";
import { overlayPositions } from "../src/globe/overlays";
import type { RegionFeature } from "../src/geography/types";
import type { BearingRule } from "../src/game/compassBearing";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(regions, [], journey);
const q = journey.rounds[0];
const rule = q.rule as BearingRule;
const north = defineQuestion({
  ...q,
  scenes: undefined,
  mode: "compass-bearing",
  selection: { type: "none" },
  commitment: "submit",
  count: 1,
  rule: {
    ...rule,
    origin: { ...rule.origin, lat: 0, lng: 0 },
    destination: { ...rule.destination, lat: 10, lng: 0 },
  },
  guidance: undefined,
});
const playing: GameState = { ...initialGame, phase: "playing" };
const response = (text: string) => ({ ...playing, text });
const roundTrip = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

describe("spherical compass geometry", () => {
  it("matches the five independently calculated city bearings", () => {
    const expected = [
      205.542524, 268.966872, 185.463845, 284.915197, 305.590029,
    ];
    for (const [i, question] of journey.rounds.entries()) {
      const r = question.rule as BearingRule;
      expect(initialBearing(r.origin, r.destination)).toBeCloseTo(
        expected[i],
        5,
      );
    }
    expect(isCorrect(journey.rounds[4], context, response("270"))).toBe(false);
    expect(angularError(359, 1)).toBe(2);
    expect(angularError(0, 360)).toBe(0);
    expect(angularError(0, 180)).toBe(180);
  });
  it("rejects undefined bearings and broken coordinates", () => {
    for (const [a, b] of [
      [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 0 },
      ],
      [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 180 },
      ],
      [
        { lat: 90, lng: 0 },
        { lat: 20, lng: 10 },
      ],
      [
        { lat: NaN, lng: 0 },
        { lat: 20, lng: 10 },
      ],
    ])
      expect(() => initialBearing(a, b)).toThrow();
  });
  it("renders one continuous short spherical path through the Date Line", () => {
    const r = journey.rounds[4].rule as BearingRule;
    const arc = greatCircleArc(r.origin, r.destination);
    expect(arc[0][0]).toBeCloseTo(r.origin.lng, 8);
    expect(arc[0][1]).toBeCloseTo(r.origin.lat, 8);
    expect(arc.at(-1)![0]).toBeCloseTo(r.destination.lng, 8);
    expect(arc.some((p) => p[0] < -175)).toBe(true);
    expect(arc.some((p) => p[0] > 175)).toBe(true);
    expect(Math.max(...arc.map((p) => p[1]))).toBeGreaterThan(35);
    expect(
      initialBearing(r.origin, { lat: arc[1][1], lng: arc[1][0] }),
    ).toBeCloseTo(initialBearing(r.origin, r.destination), 7);
    const positions = overlayPositions({
      id: "pacific",
      type: "path",
      coordinates: arc,
    });
    for (let i = 0; i < positions.length; i += 6) {
      const length = Math.hypot(
        positions[i] - positions[i + 3],
        positions[i + 1] - positions[i + 4],
        positions[i + 2] - positions[i + 5],
      );
      expect(length).toBeLessThan(0.012); // No cross-globe seam, despite wrapped longitudes.
    }
  });
});

it("requires a deliberate whole-degree response, accepting zero and normalizing 360", () => {
  for (const text of [
    "",
    " ",
    "NaN",
    "Infinity",
    "-1",
    "361",
    "12.5",
    "1e2",
    "0x10",
  ])
    expect(canSubmit(q, context, response(text)), text).toBe(false);
  for (const text of ["0", "000", "359", "360"])
    expect(canSubmit(q, context, response(text)), text).toBe(true);
  expect(bearingValue(response("360"))).toBe(0);
  expect(gameReducer(playing, { type: "submit" }, journey, context)).toEqual(
    playing,
  );
});

it("grades inclusive circular tier edges with independent hint and assist ceilings", () => {
  for (const [error, points] of [
    [0, 3],
    [8, 3],
    [9, 2],
    [18, 2],
    [19, 1],
    [35, 1],
    [36, 0],
    [180, 0],
  ]) {
    for (const sign of [-1, 1]) {
      const guess = response(String(normalizeBearing(sign * error)));
      const correct = isCorrect(north, context, guess);
      expect(correct).toBe(points > 0);
      expect(submittedPoints(north, guess, correct)).toBe(points);
      expect(submittedPoints(north, guess, correct, "hinted")).toBe(
        Math.min(points, 2),
      );
      expect(submittedPoints(north, guess, correct, "assisted")).toBe(
        Math.min(points, 1),
      );
    }
  }
  const boundaryRule = north.rule as BearingRule;
  for (const [error, points] of [
    [8.00001, 2],
    [18.00001, 1],
    [35.00001, 0],
  ]) {
    const question = {
      ...north,
      rule: {
        ...boundaryRule,
        destination: {
          ...boundaryRule.destination,
          ...pointAlongBearing(boundaryRule.origin, error, 0.2),
        },
      },
    };
    expect(
      submittedPoints(
        question,
        response("0"),
        isCorrect(question, context, response("0")),
      ),
    ).toBe(points);
  }
});

it("rejects incompatible contracts and dishonest or degenerate compass guides", () => {
  for (const tiers of [
    [],
    rule.tiers.slice(0, 2),
    rule.tiers.map((t) => ({ ...t, degrees: 8 })),
    [...rule.tiers.slice(0, 2), { degrees: 180, feedback: "Wide" }],
  ])
    expect(() =>
      validateQuestionContract({ ...q, rule: { ...rule, tiers } }),
    ).toThrow();
  for (const compassSector of [
    { start: 0, end: 0 },
    { start: 20, end: 40 },
    { start: 0, end: 100 },
    { start: NaN, end: 270 },
  ])
    expect(() =>
      validateQuestionContract({
        ...q,
        guidance: { hint: "hint", assist: { text: "guide", compassSector } },
      }),
    ).toThrow();
  for (const question of journey.rounds) {
    const r = question.rule as BearingRule;
    const sector = question.guidance!.assist!.compassSector!;
    const midpoint = normalizeBearing(
      sector.start + normalizeBearing(sector.end - sector.start) / 2,
    );
    expect(
      angularError(midpoint, initialBearing(r.origin, r.destination)),
    ).toBeGreaterThan(8);
  }
});

it("plays any bearing question independently and retains edited drafts through help and restoration", () => {
  const single = {
    ...journey,
    rounds: [journey.rounds[4]],
    completion: undefined,
  };
  const ctx = createQuestionContext(regions, [], single);
  let game = gameReducer(initialGame, { type: "start" }, single, ctx);
  game = gameReducer(game, { type: "text", value: "300" }, single, ctx);
  game = roundTrip(game);
  expect(validGame(game, single)).toBe(true);
  for (const type of ["request-hint", "request-assist"] as const) {
    game = gameReducer(game, { type }, single, ctx);
    expect(game.text).toBe("300");
    const scene = journeyWorld(regions, single, game, ctx);
    expect(scene.places.some((p) => p.name === "Manila")).toBe(false);
    expect(scene.overlays).toEqual([]);
  }
  game = gameReducer(game, { type: "submit" }, single, ctx);
  expect(game.answers[0]).toMatchObject({
    correct: true,
    points: 1,
    bearing: { chosen: 300, tier: 0 },
  });
  expect(validGame(roundTrip(game), single)).toBe(true);
});

it("freezes bearing evidence and rejects malformed snapshots without regrading historical coordinates", () => {
  const submitted = gameReducer(
    response("206"),
    { type: "submit" },
    journey,
    context,
  );
  const restored = roundTrip(submitted);
  expect(validGame(restored, journey)).toBe(true);
  const changed = {
    ...q,
    rule: { ...rule, destination: { ...rule.destination, lng: 40 } },
  };
  expect(reviewedBearing(changed, restored)).toEqual(
    submitted.answers[0].bearing,
  );
  const scene = journeyWorld(
    regions,
    { ...journey, rounds: [changed] },
    restored,
    context,
  );
  expect(scene.places.find((p) => p.id === rule.destination.id)?.lng).toBe(
    rule.destination.lng,
  );
  for (const bad of [
    { target: NaN },
    { error: -1 },
    { chosen: 360 },
    { tier: 3 },
    { version: 2 },
    { origin: {} },
    { origin: { ...rule.origin, lat: 90 } },
    {
      destination: {
        ...rule.destination,
        lat: rule.origin.lat,
        lng: rule.origin.lng,
      },
    },
  ]) {
    const broken = roundTrip(submitted);
    Object.assign(broken.answers[0].bearing!, bad);
    expect(validGame(broken, journey)).toBe(false);
  }
});

it("reveals an actual wrong angle without grading countries or inventing a wrong destination", () => {
  const missed = gameReducer(
    response("0"),
    { type: "submit" },
    journey,
    context,
  );
  const scene = journeyWorld(regions, journey, missed, context);
  expect(
    scene.places.find((p) => p.id === rule.destination.id)?.visualState,
  ).toBe("answer");
  expect(
    Object.values(scene.states).some((s) =>
      ["correct", "answer", "incorrect"].includes(s),
    ),
  ).toBe(false);
  expect(
    scene.overlays?.find((o) => o.id.startsWith("bearing-guess:")),
  ).toMatchObject({
    visualState: "incorrect",
    arrowhead: true,
    label: "Your bearing",
  });
  const advanced = gameReducer(missed, { type: "next" }, journey, context);
  expect(advanced.text).toBe("");
  expect(journeyWorld(regions, journey, advanced, context).overlays).toEqual(
    [],
  );
  const markup = renderToStaticMarkup(
    <CompassReview question={q} response={missed} />,
  );
  expect(markup).not.toContain("compass-origin");
  expect(markup).not.toContain("angular error");
  expect(markup).not.toContain("Bullseye");
  expect(markup).toContain("compass-miss");
  expect(markup).toContain("000°");
});

it("finishes at 15 points, retaining all five discoveries and comparison arcs after correct or missed answers", () => {
  for (const miss of [false, true]) {
    let game = gameReducer(initialGame, { type: "start" }, journey, context);
    for (const question of journey.rounds) {
      const r = question.rule as BearingRule;
      game = gameReducer(
        game,
        {
          type: "text",
          value: String(
            normalizeBearing(
              Math.round(
                initialBearing(r.origin, r.destination) + (miss ? 180 : 0),
              ),
            ),
          ),
        },
        journey,
        context,
      );
      game = gameReducer(game, { type: "submit" }, journey, context);
      game = gameReducer(game, { type: "next" }, journey, context);
    }
    expect(game.phase).toBe("finished");
    expect(journeyPoints(game)).toBe(miss ? 0 : 15);
    const scene = journeyWorld(regions, journey, game, context);
    for (const question of journey.rounds)
      expect(
        scene.places.find(
          (p) => p.id === (question.rule as BearingRule).destination.id,
        )?.visualState,
      ).toBe("visited");
    expect(scene.places.some((p) => p.visualState === "incorrect")).toBe(false);
    for (const id of ["place:3629706", "place:3553478", "place:3530597"])
      expect(scene.places.find((p) => p.id === id)?.visualState).toBe("hinted");
    expect(
      scene.overlays?.filter((o) => o.id.startsWith("bearing-route:")),
    ).toHaveLength(5);
    expect(scene.overlays?.some((o) => o.id.startsWith("bearing-guess:"))).toBe(
      false,
    );
  }
  expect(auditJourney(journey, regions).errors).toEqual([]);
  const scene = journeyWorld(regions, journey, playing, context);
  expect(scene.states["wurl:ESP"]).toBe("disabled");
  expect(
    auditVisualScene(q, context, playing, {
      ...scene,
      places: [...scene.places, rule.destination],
    }).join(),
  ).toContain("bearing-disclosure");
});

let root: ReturnType<typeof createRoot> | undefined;
let host: HTMLDivElement;
afterEach(() => {
  if (root) act(() => root!.unmount());
  root = undefined;
  host?.remove();
  vi.restoreAllMocks();
});
function mount() {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  function Harness() {
    const [game, dispatch] = useReducer(
      (s: GameState, a: Parameters<typeof gameReducer>[1]) =>
        gameReducer(s, a, journey, context),
      playing,
    );
    return game.phase === "playing" ? (
      <AnswerForm
        question={q}
        context={context}
        game={game}
        dispatch={dispatch}
        webgl={false}
      />
    ) : (
      <CompassReview question={q} response={game} />
    );
  }
  act(() => root!.render(<Harness />));
}
it("keeps optional degree entry below the actions and supports keyboard input without WebGL", () => {
  mount();
  const submit = () =>
    Array.from(host.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Set bearing"),
    )!;
  expect(submit().disabled).toBe(true);
  expect(host.querySelector(".compass-origin")).toBeNull();
  expect(host.querySelector(".question-support")?.textContent).toBe(
    "Aim for within 8°!",
  );
  const manual = host.querySelector<HTMLDetailsElement>(
    ".compass-manual-entry",
  )!;
  expect(manual.open).toBe(false);
  expect(
    submit().compareDocumentPosition(manual) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  act(() => manual.querySelector("summary")!.click());
  expect(manual.open).toBe(true);
  expect(manual.querySelector("summary")?.textContent).toContain(
    "Type my answer",
  );
  const dial = host.querySelector('[role="slider"]')!;
  act(() =>
    dial.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Home", bubbles: true }),
    ),
  );
  expect(host.querySelector("output")?.textContent).toBe("000°");
  expect(submit().disabled).toBe(false);
  act(() =>
    dial.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
    ),
  );
  expect(host.querySelector("output")?.textContent).toBe("359°");
  const input = host.querySelector<HTMLInputElement>('input[type="number"]')!;
  act(() => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, "360");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(host.querySelector("output")?.textContent).toBe("000°");
  expect(host.textContent).toContain("Bearing in degrees");
  expect(renderToStaticMarkup(<QuestionAccuracy question={q} />)).toContain(
    "clockwise from true north",
  );
});
it("turns the needle with pointer/touch input while retaining the draft when assistance opens", () => {
  mount();
  const dial = host.querySelector<HTMLElement>('[role="slider"]')!;
  let captured = false;
  dial.setPointerCapture = () => {
    captured = true;
  };
  dial.hasPointerCapture = () => captured;
  dial.releasePointerCapture = () => {
    captured = false;
  };
  vi.spyOn(dial, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    width: 200,
    height: 200,
  } as DOMRect);
  const pointer = (type: string, x: number, y: number) => {
    const event = new MouseEvent(type, {
      clientX: x,
      clientY: y,
      button: 0,
      bubbles: true,
    });
    Object.defineProperty(event, "pointerId", { value: 1 });
    act(() => dial.dispatchEvent(event));
  };
  pointer("pointerdown", 180, 100);
  pointer("pointermove", 100, 180);
  pointer("pointerup", 100, 180);
  expect(host.querySelector("output")?.textContent).toBe("180°");
  expect(captured).toBe(false);
  const clickHelp = (text: string) =>
    act(() =>
      Array.from(host.querySelectorAll("button"))
        .find((b) => b.textContent?.includes(text))!
        .click(),
    );
  clickHelp("Need a hint");
  clickHelp("Need an assist");
  expect(host.querySelector("output")?.textContent).toBe("180°");
  expect(host.querySelector(".compass-sector")).not.toBeNull();
  clickHelp("Set bearing");
  expect(host.querySelector(".compass-sector")).toBeNull();
  expect(host.querySelector(".compass-review")).not.toBeNull();
});
