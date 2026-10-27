// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { JourneyShareDialog } from "../src/app/JourneyShareDialog";

let root: ReturnType<typeof createRoot>;
let host: HTMLDivElement, workspace: HTMLElement, trigger: HTMLButtonElement;
const onClose = vi.fn();
const card = {
  heading: "Share your result",
  caption: "Play Ambit",
  description: "An Ambit result card",
  filename: "ambit.png",
  image: async () => new Blob(["image"], { type: "image/png" }),
};

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:result"),
    revokeObjectURL: vi.fn(),
  });
  onClose.mockClear();
  workspace = document.createElement("main");
  workspace.className = "experience";
  trigger = document.createElement("button");
  workspace.append(trigger);
  host = document.createElement("div");
  document.body.append(workspace, host);
  root = createRoot(host);
  trigger.focus();
});

afterEach(async () => {
  await act(async () => root.unmount());
  workspace.remove();
  host.remove();
  document.body.style.overflow = "";
  vi.unstubAllGlobals();
});

async function render(close: () => void = onClose) {
  await act(async () =>
    root.render(<JourneyShareDialog card={card} onClose={close} />),
  );
  return document.querySelector<HTMLElement>('[role="dialog"]')!;
}

async function key(key: string, shiftKey = false) {
  await act(async () =>
    dispatchEvent(
      new KeyboardEvent("keydown", { key, shiftKey, cancelable: true }),
    ),
  );
}

it("isolates the sharing dialog and restores focus and scroll state when closed", async () => {
  document.body.style.overflow = "clip";
  const dialog = await render();
  expect(workspace.hasAttribute("inert")).toBe(true);
  expect(document.body.style.overflow).toBe("hidden");
  expect(document.activeElement).toBe(dialog);
  const buttons = dialog.querySelectorAll("button");
  await key("Tab");
  expect(document.activeElement).toBe(buttons[0]);
  await key("Tab", true);
  expect(document.activeElement).toBe(buttons[buttons.length - 1]);
  await key("Tab");
  expect(document.activeElement).toBe(buttons[0]);
  await key("Escape");
  expect(onClose).toHaveBeenCalledOnce();
  await act(async () => root.render(null));
  expect(workspace.hasAttribute("inert")).toBe(false);
  expect(document.body.style.overflow).toBe("clip");
  expect(document.activeElement).toBe(trigger);
});

it("preserves an inert workspace and keeps focus when the close callback changes", async () => {
  workspace.setAttribute("inert", "");
  const dialog = await render();
  const share = dialog.querySelector<HTMLButtonElement>(".primary-button")!;
  share.focus();
  await render(() => onClose("latest"));
  expect(document.activeElement).toBe(share);
  await key("Escape");
  expect(onClose).toHaveBeenCalledWith("latest");
  await act(async () => root.render(null));
  expect(workspace.hasAttribute("inert")).toBe(true);
});
