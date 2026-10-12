// @vitest-environment jsdom
import { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useCameraOrchestration } from "../src/app/useCameraOrchestration";
import { ANDES_JOURNEY } from "../src/game/andesJourney";
import { createQuestionContext } from "../src/game/questions";
import { initialGame } from "../src/game/state";
import { worldAltitude } from "../src/globe/camera";
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
    focus: vi.fn(),
    cancelFocus: vi.fn(),
    flyover: vi.fn(),
    cancelFlyover: vi.fn(),
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
