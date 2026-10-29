// @vitest-environment jsdom
import { act, useContext, useLayoutEffect, useRef } from "react";
import type { ComponentProps } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { StudyHistory } from "../src/study/StudyHistory";
import { ModePanels, PanelActive } from "../src/app/ModePanels";

let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
let activations: { label: string; active: boolean }[];
function Content({ label }: { label: string }) {
  const active = useContext(PanelActive);
  const button = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    activations.push({ label, active });
    if (active) button.current?.focus();
  }, [active, label]);
  return (
    <section>
      <button ref={button} data-active={active}>
        {label}
      </button>
    </section>
  );
}
async function render(
  mode: string,
  props: Partial<ComponentProps<typeof ModePanels>> = {},
  label = mode,
) {
  await act(async () =>
    root.render(
      <ModePanels mode={mode} reduced={false} {...props}>
        <Content label={label} />
      </ModePanels>,
    ),
  );
}
async function finishExit(target = host.querySelector(".mode-outgoing")!) {
  await act(async () => {
    for (const type of ["animationend", "webkitAnimationEnd"])
      target.dispatchEvent(
        Object.assign(new Event(type, { bubbles: true }), {
          animationName: "mode-exit",
        }),
      );
  });
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers();
  activations = [];
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("waits for the outgoing animation before showing, activating or focusing the incoming panel", async () => {
  await render("Home");
  await render("Minigames");
  const outgoing = host.querySelector(".mode-outgoing")!;
  const incoming = host.querySelector(".mode-incoming")!;
  expect(outgoing.textContent).toBe("Home");
  expect(outgoing.hasAttribute("inert")).toBe(true);
  expect(incoming.classList.contains("mode-waiting")).toBe(true);
  expect(incoming.hasAttribute("inert")).toBe(true);
  expect(incoming.getAttribute("aria-hidden")).toBe("true");
  expect(
    activations.filter((a) => a.label === "Minigames").every((a) => !a.active),
  ).toBe(true);
  expect(document.activeElement).not.toBe(incoming.querySelector("button"));
  // A nested element's animation cannot end the panel's exit early.
  await finishExit(outgoing.querySelector("button")!);
  expect(host.querySelector(".mode-waiting")).not.toBeNull();
  await finishExit();
  expect(host.querySelector(".mode-outgoing")).toBeNull();
  expect(incoming.classList.contains("mode-waiting")).toBe(false);
  expect(incoming.hasAttribute("inert")).toBe(false);
  expect(incoming.hasAttribute("aria-hidden")).toBe(false);
  expect(document.activeElement).toBe(incoming.querySelector("button"));
});

it("keeps one visible exit and goes straight to the latest requested destination", async () => {
  await render("Home");
  await render("Minigames");
  const outgoing = host.querySelector(".mode-outgoing");
  await act(async () => vi.advanceTimersByTime(100));
  await render("Explore");
  expect(host.querySelectorAll(".mode-outgoing")).toHaveLength(1);
  expect(host.querySelector(".mode-outgoing")).toBe(outgoing);
  expect(outgoing!.textContent).toBe("Home");
  expect(host.querySelector(".mode-incoming")!.textContent).toBe("Explore");
  expect(activations.some((a) => a.label === "Minigames" && a.active)).toBe(
    false,
  );
  await finishExit();
  expect(host.querySelector(".mode-waiting")).toBeNull();
  expect(document.activeElement?.textContent).toBe("Explore");
});

it("keeps mounted results and their animation nodes intact throughout exit", async () => {
  let mounts = 0,
    cleanups = 0;
  function Results() {
    useLayoutEffect(() => {
      mounts++;
      return () => {
        cleanups++;
      };
    }, []);
    return (
      <section>
        <input aria-label="Result state" defaultValue="Settled score" />
        <span className="point-orb">★</span>
      </section>
    );
  }
  await act(async () =>
    root.render(
      <ModePanels mode="results" reduced={false}>
        <Results />
      </ModePanels>,
    ),
  );
  const layer = host.querySelector(".mode-incoming");
  const input = host.querySelector<HTMLInputElement>("input")!;
  const orb = host.querySelector(".point-orb");
  input.value = "Already revealed";
  await render("Home");
  expect(host.querySelector(".mode-outgoing")).toBe(layer);
  expect(host.querySelector(".mode-outgoing input")).toBe(input);
  expect(input.value).toBe("Already revealed");
  expect(host.querySelector(".mode-outgoing .point-orb")).toBe(orb);
  expect(mounts).toBe(1);
  expect(cleanups).toBe(0);
  await finishExit();
  expect(cleanups).toBe(1);
});

it("cancels an exit when returning to its page without duplicating or remounting it", async () => {
  await render("Home");
  const original = host.querySelector(".mode-incoming");
  await render("Study");
  await render("Home");
  expect(host.querySelector(".mode-outgoing")).toBeNull();
  expect(host.querySelectorAll(".mode-layer")).toHaveLength(1);
  expect(host.querySelector(".mode-incoming")).toBe(original);
  expect(host.querySelector(".mode-waiting")).toBeNull();
});

it("recovers if an animation-end event is missing without restarting the exit on navigation", async () => {
  await render("Home");
  await render("Minigames");
  await act(async () => vi.advanceTimersByTime(200));
  await render("Study");
  await act(async () => vi.advanceTimersByTime(119));
  expect(host.querySelector(".mode-waiting")).not.toBeNull();
  await act(async () => vi.advanceTimersByTime(1));
  expect(host.querySelector(".mode-outgoing")).toBeNull();
  expect(host.querySelector(".mode-waiting")).toBeNull();
});

it.each([{ reduced: true }, { page: true }, { animateExit: false }])(
  "skips the wait when no exit animation applies: %j",
  async (props) => {
    await render("Home", props);
    await render("Study", props);
    expect(host.querySelector(".mode-outgoing")).toBeNull();
    expect(host.querySelector(".mode-waiting")).toBeNull();
    expect(document.activeElement?.textContent).toBe("Study");
  },
);

it("releases a pending panel immediately when reduced motion is enabled", async () => {
  await render("Home");
  await render("Study");
  await render("Study", { reduced: true });
  expect(host.querySelector(".mode-outgoing")).toBeNull();
  expect(host.querySelector(".mode-waiting")).toBeNull();
  expect(document.activeElement?.textContent).toBe("Study");
});

it("keeps a persistent tray mounted and preserves same-page content updates", async () => {
  await render("Home", { persistent: true });
  const tray = host.querySelector(".mode-incoming");
  await render("Home", { persistent: true }, "Updated Home");
  expect(host.querySelector(".mode-outgoing")).toBeNull();
  await render("Study", { persistent: true });
  expect(host.querySelector(".mode-incoming")).toBe(tray);
  expect(host.querySelector(".mode-outgoing")!.textContent).toBe(
    "Updated Home",
  );
  await finishExit();
  expect(host.querySelector(".mode-incoming")).toBe(tray);
});

it("keeps Study and other page typography stable while the app mode changes around an outgoing panel", async () => {
  const styles = document.createElement("style");
  styles.textContent =
    readFileSync("src/app/styles/shell-base.css", "utf8") +
    readFileSync("src/app/styles/study-workspace.css", "utf8");
  document.head.append(styles);
  const page = async (mode: string) =>
    act(async () =>
      root.render(
        <div className={`experience mode-${mode}`}>
          <ModePanels mode={mode} reduced={false}>
            {mode === "study" ? (
              <StudyHistory records={[]} onView={() => {}} onStart={() => {}} />
            ) : (
              <section className="info-view">
                <h1 className="editorial-heading">Other page</h1>
              </section>
            )}
          </ModePanels>
        </div>,
      ),
    );
  try {
    await page("explore");
    const otherSize = getComputedStyle(host.querySelector("h1")!).fontSize;
    await page("study");
    expect(
      getComputedStyle(host.querySelector(".mode-outgoing h1")!).fontSize,
    ).toBe(otherSize);
    await finishExit();
    const studySize = getComputedStyle(
      host.querySelector(".mode-incoming h1")!,
    ).fontSize;
    expect(studySize).not.toBe(otherSize);
    await page("minigames");
    expect(
      getComputedStyle(host.querySelector(".mode-outgoing h1")!).fontSize,
    ).toBe(studySize);
    await finishExit();
    expect(getComputedStyle(host.querySelector("h1")!).fontSize).toBe(
      otherSize,
    );
  } finally {
    styles.remove();
  }
});
