// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useRevealSequence } from "../src/minigames/useRevealSequence";
let root: ReturnType<typeof createRoot>;
let result: ReturnType<typeof useRevealSequence>;
function Probe({ active = true }: { active?: boolean }) {
  result = useRevealSequence("run:round", 3, active);
  return null;
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.useFakeTimers();
  root = createRoot(document.createElement("div"));
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("shows the full route immediately with reduced motion", async () => {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener() {},
    removeEventListener() {},
  }));
  await act(async () => root.render(<Probe />));
  expect(result).toEqual({ reduced: true, step: 3 });
  expect(vi.getTimerCount()).toBe(0);
});
it("cancels pending steps when leaving the game and restarts the reveal on return", async () => {
  await act(async () => root.render(<Probe />));
  await act(async () => vi.advanceTimersByTimeAsync(160));
  expect(result.step).toBe(1);
  await act(async () => root.render(<Probe active={false} />));
  expect(vi.getTimerCount()).toBe(0);
  await act(async () => root.render(<Probe />));
  expect(result.step).toBe(0);
  await act(async () => vi.advanceTimersByTimeAsync(1200));
  expect(result.step).toBe(3);
  expect(vi.getTimerCount()).toBe(0);
});
