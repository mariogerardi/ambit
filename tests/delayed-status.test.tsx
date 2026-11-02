// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { DelayedStatus } from "../src/app/DelayedStatus";

it("keeps fast loads silent, announces slow loads and cancels after unmount", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers();
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    await act(async () => root.render(<DelayedStatus>Loading…</DelayedStatus>));
    await act(async () => vi.advanceTimersByTime(50));
    expect(host.querySelector('[role="status"]')).toBeNull();
    await act(async () => root.render(null));
    expect(vi.getTimerCount()).toBe(0);
    await act(async () => root.render(<DelayedStatus>Loading…</DelayedStatus>));
    await act(async () => vi.advanceTimersByTime(150));
    expect(host.querySelector('[role="status"]')?.textContent).toBe("Loading…");
    await act(async () => root.render(null));
    expect(host.textContent).toBe("");
  } finally {
    await act(async () => root.unmount());
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }
});
