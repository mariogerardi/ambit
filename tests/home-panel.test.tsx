// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HomePanel } from "../src/app/HomePanel";

let width: number;
let glyphWidth: number;
let resize: () => void;
let fonts: EventTarget;
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
const disconnect = vi.fn();
const fontDescriptor = Object.getOwnPropertyDescriptor(document, "fonts");

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  width = 300;
  glyphWidth = 0.6;
  fonts = Object.assign(new EventTarget(), { ready: Promise.resolve() });
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: fonts,
  });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe() {}
      disconnect = disconnect;
    },
  );
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
    () => width,
  );
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      const size = parseFloat(this.parentElement?.style.fontSize || "30");
      return DOMRect.fromRect({
        width: (this.textContent?.length ?? 0) * size * glyphWidth,
      });
    },
  );
  vi.stubGlobal("getComputedStyle", (element: HTMLElement) => ({
    fontSize: element.style.fontSize || "30px",
  }));
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  if (fontDescriptor) Object.defineProperty(document, "fonts", fontDescriptor);
  else Reflect.deleteProperty(document, "fonts");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function render(title = "The Vaccine That Crossed the World") {
  await act(async () =>
    root.render(
      <HomePanel
        journey={{ id: "test", title, description: "A Journey.", rounds: [] }}
        ready
        onPlay={() => {}}
        onRetrySchedule={() => {}}
        onMinigames={() => {}}
        onExplore={() => {}}
        onStudy={() => {}}
      />,
    ),
  );
  return host.querySelector("h2")!;
}

function expectFits(heading: HTMLElement) {
  expect(
    heading.firstElementChild!.getBoundingClientRect().width,
  ).toBeLessThanOrEqual(width);
}

it("shrinks long titles to fit and restores their size when space returns", async () => {
  const heading = await render();
  expectFits(heading);
  expect(parseFloat(heading.style.fontSize)).toBeLessThan(30);
  const initial = parseFloat(heading.style.fontSize);
  width = 180;
  resize();
  expectFits(heading);
  expect(parseFloat(heading.style.fontSize)).toBeLessThan(initial);
  width = 900;
  resize();
  expect(heading.style.fontSize).toBe("");
  expectFits(heading);
});

it("refits after font loading and title changes, and stops observing on unmount", async () => {
  const heading = await render();
  const initial = parseFloat(heading.style.fontSize);
  glyphWidth = 0.9;
  fonts.dispatchEvent(new Event("loadingdone"));
  expectFits(heading);
  expect(parseFloat(heading.style.fontSize)).toBeLessThan(initial);
  await render("Short title");
  expect(heading.style.fontSize).toBe("");
  expectFits(heading);
  await act(async () => root.unmount());
  expect(disconnect).toHaveBeenCalled();
  root = createRoot(host);
});
