// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  MOBILE_LAYOUT_QUERY,
  useMobileLayout,
} from "../src/app/useMobileLayout";
import { AnswerForm } from "../src/game/AnswerForm";
import { JOURNEY, COUNTRY_FACTS } from "../src/game/journey";
import { createQuestionContext } from "../src/game/questions";
import { initialGame } from "../src/game/state";
import { readFileSync } from "node:fs";
import type { RegionFeature } from "../src/geography/types";

let root: Root, host: HTMLDivElement;
let visual: EventTarget & { height: number; offsetTop: number; scale: number };
let media: EventTarget & { matches: boolean };
let layout: ReturnType<typeof useMobileLayout>;
function Probe() {
  layout = useMobileLayout();
  return <input aria-label="Answer" />;
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("innerHeight", 844);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
    setTimeout(() => cb(0), 0),
  );
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  media = Object.assign(new EventTarget(), { matches: true });
  visual = Object.assign(new EventTarget(), {
    height: 844,
    offsetTop: 0,
    scale: 1,
  });
  vi.stubGlobal("visualViewport", visual);
  vi.stubGlobal("matchMedia", (query: string) =>
    query === MOBILE_LAYOUT_QUERY ? media : { matches: false },
  );
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
it("makes room for the keyboard and follows Safari's visible viewport without disabling page zoom", async () => {
  await act(async () => root.render(<Probe />));
  expect(layout.enabled).toBe(true);
  expect(layout.keyboard).toBe(false);
  await act(async () => {
    host.querySelector("input")!.focus();
    visual.height = 480;
    visual.offsetTop = 16;
    visual.dispatchEvent(new Event("resize"));
  });
  expect(layout.keyboard).toBe(true);
  expect(layout.style).toMatchObject({
    "--app-height": "480px",
    "--visual-top": "16px",
  });
  await act(async () => {
    visual.scale = 2;
    visual.dispatchEvent(new Event("resize"));
  });
  expect(layout.keyboard).toBe(false);
  expect(layout.style).toMatchObject({
    "--app-height": "100dvh",
    "--visual-top": "0px",
  });
  await act(async () => {
    host.querySelector("input")!.blur();
    visual.scale = 1;
    visual.height = 844;
    visual.offsetTop = 0;
    visual.dispatchEvent(new Event("resize"));
    media.matches = false;
    media.dispatchEvent(new Event("change"));
  });
  expect(layout.keyboard).toBe(false);
  expect(layout.enabled).toBe(false);
});
it("does not mistake a short landscape viewport for a keyboard, and supports browsers without VisualViewport", async () => {
  visual.height = 390;
  await act(async () => root.render(<Probe />));
  expect(layout.keyboard).toBe(false);
  await act(async () => root.unmount());
  vi.stubGlobal("visualViewport", undefined);
  root = createRoot(host);
  await act(async () => root.render(<Probe />));
  expect(layout.enabled).toBe(true);
  expect(layout.style).toMatchObject({ "--app-height": "100dvh" });
});
it("advances ordered-answer fields with Return instead of submitting an unfinished route", async () => {
  const world = JSON.parse(
    readFileSync("public/geography/world.v1.json", "utf8"),
  ) as RegionFeature[];
  const context = createQuestionContext(world, COUNTRY_FACTS, JOURNEY);
  const question = JOURNEY.rounds.find((q) => q.mode === "ordered-countries")!;
  const dispatch = vi.fn();
  await act(async () =>
    root.render(
      <AnswerForm
        question={question}
        context={context}
        game={{ ...initialGame, phase: "playing" }}
        dispatch={dispatch}
        webgl
      />,
    ),
  );
  const inputs = [...host.querySelectorAll("input")];
  await act(async () => {
    inputs[0].focus();
    inputs[0].dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  expect(document.activeElement).toBe(inputs[1]);
  expect(dispatch).not.toHaveBeenCalled();
  expect(inputs[0].getAttribute("enterkeyhint")).toBe("next");
  expect(inputs.at(-1)!.getAttribute("enterkeyhint")).toBe("done");
});

it("detects the keyboard when Safari shrinks innerHeight along with VisualViewport", async () => {
  await act(async () => root.render(<Probe />));
  await act(async () => {
    host.querySelector("input")!.focus();
    vi.stubGlobal("innerHeight", 480);
    visual.height = 480;
    visual.dispatchEvent(new Event("resize"));
  });
  expect(layout.keyboard).toBe(true);
  expect(layout.style).toMatchObject({ "--app-height": "480px" });
  await act(async () => {
    vi.stubGlobal("innerHeight", 390);
    visual.height = 390;
    window.dispatchEvent(new Event("orientationchange"));
  });
  expect(layout.keyboard).toBe(false);
});
it("marks quiz text as a response rather than an address and disables text correction", async () => {
  const world = JSON.parse(
    readFileSync("public/geography/world.v1.json", "utf8"),
  ) as RegionFeature[];
  const context = createQuestionContext(world, COUNTRY_FACTS, JOURNEY);
  const question = JOURNEY.rounds.find((q) => q.mode === "ordered-countries")!;
  await act(async () =>
    root.render(
      <AnswerForm
        question={question}
        context={context}
        game={{ ...initialGame, phase: "playing" }}
        dispatch={vi.fn()}
        webgl
      />,
    ),
  );
  const field = host.querySelector("input")!;
  expect(field.type).toBe("search");
  expect(field.getAttribute("role")).toBe("textbox");
  expect(field.autocomplete).toBe("off");
  expect(field.getAttribute("autocorrect")).toBe("off");
  expect(field.getAttribute("autocapitalize")).toBe("none");
  expect(field.placeholder).toBe("Your answer");
  expect(field.form?.getAttribute("autocomplete")).toBe("off");
});
