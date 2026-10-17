// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { waitForStyles } from "../src/app/waitForStyles";

afterEach(() => {
  document.head.replaceChildren();
  vi.unstubAllGlobals();
});

it("keeps the shell until deferred CSS loads and a frame can apply it", async () => {
  let paint: FrameRequestCallback | undefined;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    paint = callback;
  });
  const style = document.createElement("link");
  style.dataset.ambitStyle = "";
  style.rel = "stylesheet";
  style.media = "print";
  document.head.append(style);
  let finished = false;
  const waiting = waitForStyles().then(() => {
    finished = true;
  });
  await Promise.resolve();
  expect(finished).toBe(false);
  style.media = "all";
  style.dataset.ready = "true";
  style.dispatchEvent(new Event("load"));
  await Promise.resolve();
  expect(finished).toBe(false);
  expect(paint).toBeDefined();
  paint!(0);
  await waiting;
  expect(finished).toBe(true);
});

it("rejects a stylesheet that failed before the app script ran", async () => {
  const style = document.createElement("link");
  style.dataset.ambitStyle = "";
  style.dataset.failed = "true";
  document.head.append(style);
  await expect(waitForStyles()).rejects.toThrow("Stylesheet failed");
});
