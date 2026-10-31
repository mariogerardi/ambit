// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useMinigameTour } from "../src/minigames/useMinigameTour";
import { minigameExamples } from "../src/minigames/minigameDemos";
import type { RegionFeature } from "../src/geography/types";
import type { GlobeHandle } from "../src/globe/GlobeView";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
type Options = Parameters<typeof useMinigameTour>[0];
let host: HTMLDivElement,
  root: ReturnType<typeof createRoot>,
  tour: ReturnType<typeof useMinigameTour>;
let options: Options, now: number, serial: number, hidden: boolean;
let frames: Map<number, FrameRequestCallback>;
function Probe() {
  tour = useMinigameTour(options);
  return null;
}
async function render(update: Partial<Options> = {}) {
  options = { ...options, ...update };
  await act(async () => root.render(<Probe />));
}
async function advance(time: number) {
  await act(async () => {
    for (let step = 0; step < time; step += 16) {
      now += Math.min(16, time - step);
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback(now));
    }
  });
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  now = 0;
  serial = 0;
  hidden = false;
  frames = new Map();
  vi.spyOn(performance, "now").mockImplementation(() => now);
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = ++serial;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  options = {
    active: true,
    kind: "pinpoint",
    regions,
    reduced: false,
    globe: {
      current: {
        orbitView: vi.fn(),
        view: () => ({ lat: 30, lng: 140, altitude: 1.65 }),
      } as unknown as GlobeHandle,
    },
  };
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("excludes an unfinished puzzle, pauses its clock and cancels work off screen", async () => {
  const blockedId = minigameExamples(regions).pinpoint[0].id;
  await render({ blockedId });
  expect(tour.count).toBe(4);
  expect(tour.example?.id).not.toBe(blockedId);
  await advance(8500);
  expect(tour.phase).toBe("reveal");
  await act(async () => tour.pause());
  expect(frames.size).toBe(0);
  const calls = vi.mocked(options.globe.current!.orbitView).mock.calls.length;
  await advance(5000);
  expect(vi.mocked(options.globe.current!.orbitView).mock.calls.length).toBe(
    calls,
  );
  await act(async () => tour.toggle());
  expect(frames.size).toBe(1);
  await act(async () => {
    hidden = true;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(frames.size).toBe(0);
  await act(async () => {
    hidden = false;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(frames.size).toBe(1);
  await render({ active: false });
  expect(frames.size).toBe(0);
  expect(tour.world).toBeUndefined();
});

it("offers manual examples and reveals without animation for reduced motion", async () => {
  await render({ reduced: true });
  expect(frames.size).toBe(0);
  const first = tour.example?.id;
  expect(tour.phase).toBe("question");
  await act(async () => tour.reveal());
  expect(tour.phase).toBe("reveal");
  await act(async () => tour.next());
  expect(tour.example?.id).not.toBe(first);
  expect(tour.phase).toBe("question");
  expect(frames.size).toBe(0);
});

it("keeps the animation loop and current velocity when switching games and clears the old scene", async () => {
  await render();
  await advance(8000);
  const orbit = vi.mocked(options.globe.current!.orbitView);
  const poses = () =>
    orbit.mock.calls.flatMap(([focus]) => (focus ? [focus] : []));
  const before = poses().slice(-2);
  const pending = [...frames.keys()];
  await render({ kind: "border-run" });
  expect([...frames.keys()]).toEqual(pending);
  expect(tour.phase).toBe("travel");
  expect(tour.world?.places).toEqual([]);
  expect(tour.world?.states).toEqual({});
  await act(async () => {
    now += 30;
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((callback) => callback(now));
  });
  const after = poses().at(-1)!;
  // The new join begins at the old velocity, then accelerates gradually.
  const oldVelocity = (before[1].lng - before[0].lng) / 16;
  expect(Math.abs((after.lng - before[1].lng) / 30 - oldVelocity)).toBeLessThan(
    0.001,
  );
  expect(Math.abs(after.lat - before[1].lat)).toBeLessThan(1);
  expect(Math.abs(after.altitude! - before[1].altitude!)).toBeLessThan(0.05);
  await advance(6000);
  expect(tour.example?.kind).toBe("border-run");
  expect(tour.phase).not.toBe("travel");
});

it("does not skip the tour approach when one animation frame is delayed", async () => {
  await render();
  await advance(1000);
  const orbit = vi.mocked(options.globe.current!.orbitView);
  const before = orbit.mock.lastCall![0]!;
  await act(async () => {
    now += 5000;
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((callback) => callback(now));
  });
  const after = orbit.mock.lastCall![0]!;
  expect(Math.abs(after.lng - before.lng)).toBeLessThan(1);
  expect(Math.abs(after.lat - before.lat)).toBeLessThan(1);
  expect(Math.abs(after.altitude! - before.altitude!)).toBeLessThan(0.05);
  expect(tour.phase).toBe("travel");
});
