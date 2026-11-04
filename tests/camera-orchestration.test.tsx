// @vitest-environment jsdom
import { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useCameraOrchestration } from "../src/app/useCameraOrchestration";
import { ANDES_JOURNEY } from "../src/game/andesJourney";
import { DANUBE_JOURNEY } from "../src/game/danubeJourney";
import { REGGAETON_JOURNEY } from "../src/game/reggaetonJourney";
import { SMALL_WONDERS_JOURNEY } from "../src/game/smallWondersJourney";
import { createQuestionContext } from "../src/game/questions";
import { initialGame } from "../src/game/state";
import { reviewTourFrame, REVIEW_TOUR_ALTITUDE } from "../src/study/reviewTour";
import { worldAltitude } from "../src/globe/camera";
import {
  defaultSettings as defaultStudySettings,
  startStudy,
} from "../src/study/engine";
import type { GlobeHandle } from "../src/globe/GlobeView";
import type { Focus, RegionFeature } from "../src/geography/types";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(regions, [], ANDES_JOURNEY);
type Options = Parameters<typeof useCameraOrchestration>[0];
let root: ReturnType<typeof createRoot>;
let result: ReturnType<typeof useCameraOrchestration>;
let options: Options;
let port: GlobeHandle;
let view: Focus;
let width: number;
let height: number;
let media: MediaQueryList;
let mediaChange: (() => void) | undefined;
let exploreEntries: boolean[];
function Probe(props: Options) {
  const camera = useCameraOrchestration(props);
  result = camera;
  useEffect(() => {
    if (props.mode === "explore")
      exploreEntries.push(camera.exploreEntryFromCountry);
  }, [props.mode]);
  return null;
}
async function render(update: Partial<Options> = {}) {
  options = { ...options, ...update };
  await act(async () => root.render(<Probe {...options} />));
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  exploreEntries = [];
  media = {
    matches: false,
    addEventListener: vi.fn((_type, callback) => {
      mediaChange = callback;
    }),
    removeEventListener: vi.fn(),
  } as unknown as MediaQueryList;
  vi.stubGlobal("matchMedia", () => media);
  view = { lat: 12, lng: 28, altitude: 1.65 };
  port = {
    orbitView: vi.fn(),
    focus: vi.fn(),
    cancelFocus: vi.fn(),
    flyover: vi.fn(),
    cancelFlyover: vi.fn(),
    pulseIslands: vi.fn(),
    fidget: vi.fn(),
    cancelFidget: vi.fn(),
    view: () => view,
    measure: vi.fn(),
  };
  width = 900;
  height = 600;
  const scene = document.createElement("div");
  Object.defineProperties(scene, {
    clientWidth: { get: () => width },
    clientHeight: { get: () => height },
  });
  options = {
    mode: "home",
    transitionKey: "/",
    ready: true,
    mobile: false,
    globe: { current: port },
    scene: { current: scene },
    regions,
    clearHover: vi.fn(),
    journey: {
      active: false,
      definition: ANDES_JOURNEY,
      context,
      phase: "playing",
      roundIndex: 0,
      answers: initialGame.answers,
      dailyReady: true,
    },
    study: { active: false, editorOpen: false },
  };
  root = createRoot(document.createElement("div"));
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
});
it("sweeps Review continuously, pauses for interaction, and holds a static view for reduced motion", async () => {
  const pending = new Map<number, FrameRequestCallback>();
  let serial = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    pending.set(++serial, callback);
    return serial;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => pending.delete(id));
  const stops = [
    { lat: 10, lng: 20, altitude: 0.8 },
    { lat: -20, lng: 40, altitude: 0.55 },
  ];
  const preview = {
    ...defaultStudySettings,
    scope: "custom" as const,
    countryIds: ["wurl:CAN"],
  };
  await render({
    mode: "study",
    transitionKey: "/study?view=review",
    study: { active: false, editorOpen: false, preview, previewViews: stops },
  });
  expect(port.flyover).not.toHaveBeenCalled();
  expect(pending.size).toBe(1);
  const [id, tick] = [...pending][0];
  pending.delete(id);
  await act(async () => tick(performance.now() + 16));
  expect(port.orbitView).toHaveBeenLastCalledWith(
    expect.objectContaining({ lng: expect.any(Number) }),
  );
  await act(async () => result.stop());
  expect(pending.size).toBe(0);
  await act(async () => result.toggleMotion());
  expect(pending.size).toBe(1);
  await act(async () => result.recenter());
  expect(pending.size).toBe(0);
  expect(port.focus).toHaveBeenLastCalledWith({
    ...stops[0],
    altitude: REVIEW_TOUR_ALTITUDE,
  });
  await act(async () => result.toggleMotion());
  expect(pending.size).toBe(1);
  await render({ mode: "home", transitionKey: "/" });
  expect(pending.size).toBe(0);
  Object.defineProperty(media, "matches", { value: true });
  await act(async () => mediaChange?.());
  await render({ mode: "study", transitionKey: "/study?view=review" });
  expect(pending.size).toBe(0);
  expect(port.focus).toHaveBeenLastCalledWith({
    ...stops[0],
    altitude: REVIEW_TOUR_ALTITUDE,
  });
});
it("keeps Review's orbit speed and zoom steady across a full globe revolution", () => {
  const stops = [
    { lat: 40, lng: 30 },
    { lat: -25, lng: 140 },
    { lat: 20, lng: -70 },
  ];
  const origin = { lat: 10, lng: 0, altitude: 1.8 };
  const first = reviewTourFrame(stops, origin, 2000),
    later = reviewTourFrame(stops, origin, 62000);
  expect(first.lng - later.lng).toBe(360);
  expect(first.altitude).toBe(REVIEW_TOUR_ALTITUDE);
  expect(later.altitude).toBe(REVIEW_TOUR_ALTITUDE);
  expect(later.lat).toBeCloseTo(first.lat);
});

it("waits for a deferred Journey when restoring a playing attempt with saved help", async () => {
  const round = ANDES_JOURNEY.rounds[2];
  await render({
    mode: "daily",
    transitionKey: "/daily:restored",
    ready: false,
    journey: {
      ...options.journey,
      definition: { ...ANDES_JOURNEY, rounds: [] },
      context: undefined,
      roundIndex: 2,
      help: { [round.id]: "hinted" },
      dailyReady: false,
    },
  });
  expect(port.focus).not.toHaveBeenCalled();
  await render({
    ready: true,
    journey: {
      ...options.journey,
      active: true,
      definition: ANDES_JOURNEY,
      context,
      focus: round.focus,
      dailyReady: true,
    },
  });
  expect(port.focus).toHaveBeenCalledExactlyOnceWith(round.focus);
});

it("uses the latest reveal focus on a phase transition without restarting travel for display edits", async () => {
  const clue = { lat: 5, lng: -65, altitude: 0.8 };
  const reveal = { lat: 4, lng: -74, altitude: 0.6 };
  await render({
    mode: "practice",
    transitionKey: "/journey/along-the-andes",
    journey: { ...options.journey, active: true, focus: clue },
  });
  expect(port.focus).toHaveBeenLastCalledWith(clue);
  vi.mocked(port.focus).mockClear();
  await render({ journey: { ...options.journey, focus: reveal } });
  expect(port.focus).not.toHaveBeenCalled();
  await render({ journey: { ...options.journey, phase: "feedback" } });
  expect(port.focus).toHaveBeenCalledExactlyOnceWith(reveal);
  await render({
    journey: { ...options.journey },
    study: { ...options.study },
  });
  expect(port.focus).toHaveBeenCalledTimes(1);
});

it("frames an authored assist once without restarting travel on response rerenders", async () => {
  const clue = { lat: 43.7, lng: -79.4, altitude: 0.3 };
  const assisted = { lat: 42.7, lng: -81.65, altitude: 0.15 };
  const definition = {
    ...ANDES_JOURNEY,
    rounds: ANDES_JOURNEY.rounds.map((q, i) =>
      i === 0
        ? {
            ...q,
            guidance: {
              hint: "A hint",
              assist: { text: "River references", focus: assisted },
            },
          }
        : q,
    ),
  };
  await render({
    mode: "practice",
    transitionKey: "/journey/assist",
    journey: { ...options.journey, active: true, definition, focus: clue },
  });
  vi.mocked(port.focus).mockClear();
  await render({
    journey: {
      ...options.journey,
      help: { [definition.rounds[0].id]: "hinted" },
    },
  });
  expect(port.focus).not.toHaveBeenCalled();
  await render({
    journey: {
      ...options.journey,
      focus: assisted,
      help: { [definition.rounds[0].id]: "assisted" },
    },
  });
  expect(port.focus).toHaveBeenCalledExactlyOnceWith(assisted);
  await render({
    journey: {
      ...options.journey,
      focus: { ...assisted },
      help: { ...options.journey.help },
    },
  });
  expect(port.focus).toHaveBeenCalledTimes(1);
});

it("plays authored intros once, leaves answer edits alone, and ends the intro on help or reduced motion", async () => {
  const round = REGGAETON_JOURNEY.rounds[4];
  await render({
    mode: "practice",
    transitionKey: "/journey/reggaeton:4:playing",
    journey: {
      ...options.journey,
      active: true,
      definition: REGGAETON_JOURNEY,
      roundIndex: 4,
      focus: round.focus,
    },
  });
  expect(port.flyover).toHaveBeenCalledExactlyOnceWith(round.introViews, false);
  await render({ journey: { ...options.journey, focus: { ...round.focus } } });
  expect(port.flyover).toHaveBeenCalledTimes(1);
  await render({
    journey: { ...options.journey, help: { [round.id]: "hinted" } },
  });
  expect(port.cancelFlyover).toHaveBeenCalledTimes(1);
  expect(port.focus).toHaveBeenLastCalledWith(round.focus);
  expect(port.flyover).toHaveBeenCalledTimes(1);
  await act(async () => {
    Object.defineProperty(media, "matches", { value: true });
    mediaChange!();
  });
  expect(port.focus).toHaveBeenLastCalledWith(round.focus);
  expect(port.flyover).toHaveBeenCalledTimes(1);
  await render({
    mode: "home",
    transitionKey: "/",
    journey: { ...options.journey, active: false },
  });
  expect(port.cancelFlyover).toHaveBeenCalledTimes(3);
});

it("preserves Not From Here’s continental opening and frames both country assists", async () => {
  const { NOT_FROM_HERE_JOURNEY: definition } = await import(
    "../src/game/notFromHereJourney"
  );
  const { journeyWorld } = await import("../src/app/journeyWorld");
  const ctx = createQuestionContext(regions, [], definition);
  for (const roundIndex of [0, 1]) {
    const round = definition.rounds[roundIndex];
    const playing = { ...initialGame, phase: "playing" as const, roundIndex };
    const focus = journeyWorld(regions, definition, playing, ctx).focus;
    vi.mocked(port.flyover).mockClear();
    await render({
      mode: "practice",
      transitionKey: `not-from-here:${roundIndex}:playing`,
      journey: {
        ...options.journey,
        active: true,
        definition,
        context: ctx,
        phase: "playing",
        roundIndex,
        focus,
        help: {},
      },
    });
    if (roundIndex === 1) {
      expect(port.flyover).toHaveBeenCalledExactlyOnceWith([focus], false);
      expect(result.motion).toBe(false);
    }
    const help = { [round.id]: "assisted" as const };
    const assisted = journeyWorld(
      regions,
      definition,
      { ...playing, help },
      ctx,
    ).focus;
    await render({ journey: { ...options.journey, focus: assisted, help } });
    expect(port.focus).toHaveBeenLastCalledWith(assisted);
    expect(result.motion).toBe(false);
  }
});

it("ends a compass teaching flyover at the effective comparison frame", async () => {
  const journey = SMALL_WONDERS_JOURNEY;
  const index = journey.rounds.findIndex((q) => q.mode === "compass-bearing");
  const round = journey.rounds[index];
  const focus = { lat: 42, lng: -20, altitude: 1.4 };
  await render({
    mode: "practice",
    journey: {
      ...options.journey,
      active: true,
      definition: journey,
      context: createQuestionContext(regions, [], journey),
      roundIndex: index,
      phase: "feedback",
      focus,
    },
  });
  expect(port.flyover).toHaveBeenCalledWith(
    [...round.feedbackViews!, focus],
    false,
  );
});

it("uses reveal views only after commitment and preserves a missed pin's comparison framing", async () => {
  const round = REGGAETON_JOURNEY.rounds[2];
  await render({
    mode: "practice",
    transitionKey: "/journey/reggaeton:2:playing",
    journey: {
      ...options.journey,
      active: true,
      definition: REGGAETON_JOURNEY,
      roundIndex: 2,
      focus: round.focus,
    },
  });
  expect(port.flyover).not.toHaveBeenCalled();
  await render({
    transitionKey: "/journey/reggaeton:2:feedback",
    journey: {
      ...options.journey,
      phase: "feedback",
      focus: round.feedbackFocus,
    },
  });
  expect(port.flyover).toHaveBeenCalledExactlyOnceWith(
    round.feedbackViews,
    false,
  );
  const pin = REGGAETON_JOURNEY.rounds[1];
  const comparison = { lat: 25, lng: -37, altitude: 2 };
  await render({
    transitionKey: "/journey/reggaeton:1:feedback",
    journey: {
      ...options.journey,
      roundIndex: 1,
      focus: comparison,
      answers: [
        {
          ...initialGame,
          roundId: pin.id,
          correct: false,
          pin: { lat: 0, lng: 0 },
        },
      ],
    },
  });
  expect(port.flyover).toHaveBeenCalledTimes(1);
  expect(port.focus).toHaveBeenLastCalledWith(comparison);
});

it("flies over the Danube's authored river stops on completion", async () => {
  await render({
    mode: "daily",
    journey: {
      ...options.journey,
      active: true,
      definition: DANUBE_JOURNEY,
      context: createQuestionContext(regions, [], DANUBE_JOURNEY),
      phase: "finished",
    },
  });
  expect(port.flyover).toHaveBeenCalledOnce();
  const views = vi.mocked(port.flyover).mock.calls[0][0];
  expect(views.length).toBeGreaterThan(1);
  expect(views).toEqual(DANUBE_JOURNEY.completion!.views);
  // The route advances eastward before returning to its full-river overview.
  const stops = views.slice(0, -1);
  expect(stops.map((view) => view.lng)).toEqual(
    stops.map((view) => view.lng).sort((a, b) => a - b),
  );
  expect(views.at(-1)).toEqual(DANUBE_JOURNEY.completion!.focus);
});

it("starts completion only when saves are ready, cancels animated playback for reduced motion, and cleans up on exit", async () => {
  const destination = { lat: -54, lng: -68, altitude: 1.1 };
  const views = [destination, { lat: -35, lng: -70, altitude: 0.9 }];
  const definition = {
    ...ANDES_JOURNEY,
    completion: { ...ANDES_JOURNEY.completion!, focus: destination, views },
  };
  await render({
    mode: "daily",
    transitionKey: "/daily:today",
    journey: {
      ...options.journey,
      active: true,
      definition,
      phase: "finished",
      dailyReady: false,
    },
  });
  expect(port.flyover).not.toHaveBeenCalled();
  await render({ journey: { ...options.journey, dailyReady: true } });
  expect(port.flyover).toHaveBeenCalledExactlyOnceWith(views);
  await render({ journey: { ...options.journey } });
  expect(port.flyover).toHaveBeenCalledTimes(1);
  await act(async () => {
    Object.defineProperty(media, "matches", { value: true });
    mediaChange!();
  });
  expect(port.cancelFlyover).toHaveBeenCalledTimes(1);
  expect(port.focus).toHaveBeenLastCalledWith(destination);
  expect(port.flyover).toHaveBeenCalledTimes(1);
  await render({
    mode: "home",
    transitionKey: "/",
    journey: { ...options.journey, active: false },
  });
  expect(port.cancelFlyover).toHaveBeenCalledTimes(2);
  expect(result.motion).toBe(true);
});

it("loops authored completion views, including previously finite tours", async () => {
  const definition = {
    ...ANDES_JOURNEY,
    completion: { ...ANDES_JOURNEY.completion!, loopViews: false },
  };
  await render({
    mode: "daily",
    journey: {
      ...options.journey,
      active: true,
      definition,
      phase: "finished",
    },
  });
  expect(port.flyover).toHaveBeenCalledExactlyOnceWith(
    definition.completion.views,
  );
});

it("retains Home-tap entry intent while consuming its camera request, including delayed globe readiness", async () => {
  await render({ ready: false });
  const country = regions.find((r) => r.id === "wurl:CAN")!;
  result.pendingExploreFocus.current = country.id;
  await render({ mode: "explore", transitionKey: "/explore" });
  expect(exploreEntries).toEqual([true]);
  expect(port.focus).not.toHaveBeenCalled();
  await render({ ready: true });
  expect(port.focus).toHaveBeenCalledExactlyOnceWith(country.focus);
  expect(result.pendingExploreFocus.current).toBeUndefined();
  // Consuming the request and changing playback can rerender the hook, but
  // neither should trigger the shell's selection-clearing route-entry effect.
  expect(exploreEntries).toEqual([true]);
});

it.each(["/archive", "/archive?date=2026-10-11"])(
  "keeps the live overview orbit and rotation when entering %s",
  async (path) => {
    view = { lat: -20, lng: 130, altitude: worldAltitude(width, height) };
    await render();
    await act(async () => result.prepareNavigation(path));
    expect(result.motion).toBe(true);
    await render({ mode: "archive", transitionKey: path });
    expect(result.motion).toBe(true);
    expect(port.focus).not.toHaveBeenCalled();
    expect(view).toEqual({
      lat: -20,
      lng: 130,
      altitude: worldAltitude(width, height),
    });
  },
);

it("retains an explicit pause across overview navigation and temporary gameplay stops", async () => {
  await render();
  await act(async () => result.toggleMotion());
  expect(result.motion).toBe(false);
  for (const mode of ["explore", "archive", "study", "home"] as const) {
    await act(async () => result.prepareNavigation(`/${mode}`));
    await render({ mode, transitionKey: `/${mode}` });
    expect(result.motion).toBe(false);
  }
  await act(async () => result.toggleMotion());
  expect(result.motion).toBe(true);
  await act(async () => result.stop());
  await render({ mode: "explore", transitionKey: "/explore-again" });
  expect(result.motion).toBe(true);
});

it("recenters a Study question on its eligible scope after a pan without disclosing the answer", async () => {
  const session = startStudy(
    { ...defaultStudySettings, scope: "continent", continent: "EU" },
    42,
  );
  await render({
    mode: "study",
    transitionKey: "/study?view=session",
    study: { active: true, session, editorOpen: false },
  });
  const original = vi.mocked(port.focus).mock.lastCall![0];
  expect(original).toMatchObject({ lat: 50, lng: 20 });
  view = { ...original, lat: -20, lng: 130 };
  vi.mocked(port.focus).mockClear();
  await act(async () => result.recenter());
  expect(port.focus).toHaveBeenCalledExactlyOnceWith(original);
});

it("uses live viewport dimensions for recentering and tighter mobile Explore framing", async () => {
  await render({ mobile: true });
  width = 390;
  height = 250;
  view = { lat: -20, lng: 130, altitude: worldAltitude(width, height, true) };
  await act(async () => result.recenter());
  expect(vi.mocked(port.focus).mock.lastCall?.[0].altitude).toBe(
    worldAltitude(width, height, true),
  );
  const country = regions.find((r) => r.id === "wurl:CAN")!;
  await render({ mode: "explore", transitionKey: "/explore" });
  vi.mocked(port.focus).mockClear();
  await act(async () => result.recenter(country));
  expect(port.focus).toHaveBeenCalledExactlyOnceWith({
    ...country.focus,
    altitude: Math.max(0.012, (country.focus.altitude ?? 0.8) * 0.72),
  });
});

it("frames a late-loaded puzzle focus even when the phase and route key have not changed", async () => {
  await render({
    mode: "minigames",
    transitionKey: "missing:run:0",
    journey: {
      ...options.journey,
      active: true,
      focus: { lat: -15, lng: -60, altitude: 1.25 },
    },
  });
  vi.mocked(port.focus).mockClear();
  const focus = { lat: 50, lng: 20, altitude: 1.05 };
  await render({ journey: { ...options.journey, focus } });
  expect(port.focus).toHaveBeenCalledExactlyOnceWith(focus);
  vi.mocked(port.focus).mockClear();
  await render({ journey: { ...options.journey, focus: { ...focus } } });
  expect(port.focus).not.toHaveBeenCalled();
});

it("reframes automatic selection cameras when an assist narrows the field", async () => {
  const { MISSING_BORDERS_TWO_JOURNEY: definition } = await import(
    "../src/game/missingBordersTwoJourney"
  );
  const { journeyWorld } = await import("../src/app/journeyWorld");
  const context = createQuestionContext(regions, [], definition);
  const question = definition.rounds[3];
  const game = { ...initialGame, phase: "playing" as const, roundIndex: 3 };
  await render({
    mode: "practice",
    journey: {
      ...options.journey,
      active: true,
      definition,
      context,
      phase: "playing",
      roundIndex: 3,
      focus: journeyWorld(regions, definition, game, context).focus,
    },
  });
  vi.mocked(port.focus).mockClear();
  const assisted = { ...game, help: { [question.id]: "assisted" as const } };
  const focus = journeyWorld(regions, definition, assisted, context).focus;
  await render({ journey: { ...options.journey, help: assisted.help, focus } });
  expect(port.focus).toHaveBeenLastCalledWith(focus);
});

it("ends an automatic-framing introduction at the computed candidate view", async () => {
  const { MISSING_BORDERS_TWO_JOURNEY: source } = await import(
    "../src/game/missingBordersTwoJourney"
  );
  const { journeyWorld } = await import("../src/app/journeyWorld");
  const intro = { lat: 0, lng: 0, altitude: 2.2 };
  const definition = {
    ...source,
    rounds: source.rounds.map((round, index) =>
      index === 3 ? { ...round, introViews: [intro] } : round,
    ),
  };
  const context = createQuestionContext(regions, [], definition);
  const focus = journeyWorld(
    regions,
    definition,
    { ...initialGame, phase: "playing", roundIndex: 3 },
    context,
  ).focus;
  await render({
    mode: "practice",
    journey: {
      ...options.journey,
      active: true,
      definition,
      context,
      phase: "playing",
      roundIndex: 3,
      focus,
    },
  });
  expect(port.flyover).toHaveBeenLastCalledWith([intro, focus], false);
});

it.each(["wurl:MLI", "wurl:CAN"])(
  "returns a round tour to the chosen country %s, including a miss",
  async (id) => {
    const { WHERE_IS_IT_OFFICIAL_JOURNEY: definition } = await import(
      "../src/game/whereIsItOfficialJourney"
    );
    const { gameReducer } = await import("../src/game/state");
    const { journeyWorld } = await import("../src/app/journeyWorld");
    const context = createQuestionContext(regions, [], definition);
    const game = gameReducer(
      { ...initialGame, phase: "playing" },
      { type: "select", id },
      definition,
      context,
    );
    const focus = journeyWorld(regions, definition, game, context).focus;
    await render({
      mode: "practice",
      journey: {
        ...options.journey,
        active: true,
        definition,
        context,
        phase: "feedback",
        roundIndex: 0,
        answers: game.answers,
        focus,
      },
    });
    const call = vi.mocked(port.flyover).mock.calls.at(-1)!;
    expect(call[0]).toEqual([...definition.rounds[0].feedbackViews!, focus]);
    expect(call[0].at(-1)).toMatchObject(
      regions.find((r) => r.id === id)!.focus,
    );
    expect(call[1]).toBe(false);
    expect(call[2]?.onComplete).toBeUndefined();
    expect(result.motion).toBe(false);
  },
);
it("reserves overview rotation for completion and cancels its handoff on interaction", async () => {
  const { WHERE_IS_IT_OFFICIAL_JOURNEY: definition } = await import(
    "../src/game/whereIsItOfficialJourney"
  );
  await render({
    mode: "practice",
    journey: {
      ...options.journey,
      active: true,
      definition,
      phase: "finished",
      roundIndex: 4,
    },
  });
  const interrupted = vi.mocked(port.flyover).mock.calls.at(-1)![2]!
    .onComplete!;
  await act(async () => result.stop());
  await act(async () => interrupted());
  expect(result.motion).toBe(false);
  await render({
    journey: { ...options.journey, phase: "playing", roundIndex: 0 },
  });
  await render({
    journey: { ...options.journey, phase: "finished", roundIndex: 4 },
  });
  const completed = vi.mocked(port.flyover).mock.calls.at(-1)!;
  expect(completed[1]).toBe(false);
  await act(async () => completed[2]!.onComplete!());
  expect(result.motion).toBe(true);
});
it("uses the chosen country without a tour or spin under reduced motion", async () => {
  const { WHERE_IS_IT_OFFICIAL_JOURNEY: definition } = await import(
    "../src/game/whereIsItOfficialJourney"
  );
  const { gameReducer } = await import("../src/game/state");
  const { journeyWorld } = await import("../src/app/journeyWorld");
  const context = createQuestionContext(regions, [], definition);
  const game = gameReducer(
    { ...initialGame, phase: "playing" },
    { type: "select", id: "wurl:EGY" },
    definition,
    context,
  );
  const focus = journeyWorld(regions, definition, game, context).focus;
  Object.defineProperty(media, "matches", { configurable: true, value: true });
  await act(async () => mediaChange!());
  await render({
    mode: "practice",
    journey: {
      ...options.journey,
      active: true,
      definition,
      context,
      phase: "feedback",
      roundIndex: 0,
      answers: game.answers,
      focus,
    },
  });
  expect(port.flyover).not.toHaveBeenCalled();
  expect(port.focus).toHaveBeenLastCalledWith(focus);
  expect(result.motion).toBe(false);
});
it("preserves a suitable world view already rotating when a global question loads", async () => {
  const { WHERE_IS_IT_OFFICIAL_JOURNEY: definition } = await import(
    "../src/game/whereIsItOfficialJourney"
  );
  await render();
  expect(result.motion).toBe(true);
  vi.mocked(port.focus).mockClear();
  await render({
    mode: "practice",
    transitionKey: "/global",
    journey: {
      ...options.journey,
      active: true,
      definition,
      phase: "playing",
      roundIndex: 0,
    },
  });
  expect(port.focus).not.toHaveBeenCalled();
  expect(result.motion).toBe(true);
  await act(async () => result.stop());
  await render({ journey: { ...options.journey } });
  expect(result.motion).toBe(false);
  expect(port.focus).not.toHaveBeenCalled();
});
it("starts an unrotating global question on an answer-independent random continent and restarts only on a new question", async () => {
  const { WHERE_IS_IT_OFFICIAL_JOURNEY: definition } = await import(
    "../src/game/whereIsItOfficialJourney"
  );
  const { DEFAULT_VIEWS } = await import("../src/globe/defaultViews");
  const random = vi.spyOn(Math, "random").mockReturnValue(0);
  try {
    await render({
      mode: "practice",
      journey: {
        ...options.journey,
        active: true,
        definition,
        phase: "playing",
        roundIndex: 0,
      },
    });
    expect(port.focus).toHaveBeenLastCalledWith({
      ...DEFAULT_VIEWS[0],
      altitude: worldAltitude(width, height),
    });
    expect(result.motion).toBe(true);
    await act(async () => result.stop());
    random.mockReturnValue(0.99);
    await render({ journey: { ...options.journey, phase: "feedback" } });
    vi.mocked(port.focus).mockClear();
    await render({
      journey: { ...options.journey, phase: "playing", roundIndex: 1 },
    });
    expect(port.focus).toHaveBeenLastCalledWith({
      ...DEFAULT_VIEWS.at(-1),
      altitude: worldAltitude(width, height),
    });
    expect(result.motion).toBe(true);
    await render({
      journey: {
        ...options.journey,
        help: { [definition.rounds[1].id]: "hinted" },
      },
    });
    expect(result.motion).toBe(false);
  } finally {
    random.mockRestore();
  }
});
