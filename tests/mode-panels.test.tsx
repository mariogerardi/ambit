// @vitest-environment jsdom
import { act, useContext, useLayoutEffect, useRef } from "react";
import type { ComponentProps } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
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
