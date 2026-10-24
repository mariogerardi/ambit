// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { ActivityPreviewDialog } from "../src/app/ActivityPreviewDialog";
import { readFileSync } from "node:fs";
import { STUDY_PATHS } from "../src/study/paths";

let host: HTMLDivElement, workspace: HTMLElement, trigger: HTMLButtonElement;
let root: ReturnType<typeof createRoot>;
const onClose = vi.fn();
const preview = {
  title: "Discover Asia",
  description: "Get to know Asia's countries on the globe.",
  image: "/previews/discover-asia.svg",
  imageAlt: "An illustrated map of Asia.",
  facts: [{ label: "Session", value: "10 questions" }],
  howToPlay: "Find each country on the globe.",
};

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
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
  host.remove();
  workspace.remove();
  document.body.style.overflow = "";
  vi.unstubAllGlobals();
});
async function render() {
  await act(async () =>
    root.render(
      <ActivityPreviewDialog
        preview={preview}
        onClose={onClose}
        returnFocus={trigger}
        primary={{ label: "Start session", onClick: vi.fn() }}
        customize={{ label: "Customize", onClick: vi.fn() }}
      />,
    ),
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

it("presents the image and details, traps focus, and restores the trigger and prior scroll state", async () => {
  document.body.style.overflow = "clip";
  const dialog = await render();
  expect(
    document.getElementById(dialog.getAttribute("aria-labelledby")!)
      ?.textContent,
  ).toBe(preview.title);
  expect(
    document.getElementById(dialog.getAttribute("aria-describedby")!)
      ?.textContent,
  ).toBe(preview.description);
  expect(dialog.querySelector("img")?.alt).toBe(preview.imageAlt);
  expect(workspace.hasAttribute("inert")).toBe(true);
  expect(document.body.style.overflow).toBe("hidden");
  expect(document.activeElement).toBe(dialog);
  const controls = dialog.querySelectorAll("button");
  await key("Tab");
  expect(document.activeElement).toBe(controls[0]);
  await key("Tab", true);
  expect(document.activeElement).toBe(controls[controls.length - 1]);
  await key("Tab");
  expect(document.activeElement).toBe(controls[0]);
  await key("Escape");
  expect(onClose).toHaveBeenCalledOnce();
  await act(async () => root.unmount());
  expect(document.activeElement).toBe(trigger);
  expect(workspace.hasAttribute("inert")).toBe(false);
  expect(document.body.style.overflow).toBe("clip");
  root = createRoot(host);
});

it("dismisses only on the backdrop and preserves an already inert workspace", async () => {
  workspace.setAttribute("inert", "");
  const dialog = await render();
  await act(async () => dialog.querySelector("img")!.click());
  expect(onClose).not.toHaveBeenCalled();
  await act(async () =>
    document.querySelector<HTMLElement>(".activity-preview-backdrop")!.click(),
  );
  expect(onClose).toHaveBeenCalledOnce();
  await act(async () => root.unmount());
  expect(workspace.hasAttribute("inert")).toBe(true);
  root = createRoot(host);
});

it("does not reset focus when parent callbacks change", async () => {
  const dialog = await render();
  const start = dialog.querySelector<HTMLElement>(".primary-button")!;
  start.focus();
  await act(async () =>
    root.render(
      <ActivityPreviewDialog
        preview={preview}
        onClose={() => onClose("new")}
        returnFocus={trigger}
        primary={{ label: "Start session", onClick: vi.fn() }}
        customize={{ label: "Customize", onClick: vi.fn() }}
      />,
    ),
  );
  expect(document.activeElement).toBe(start);
  await key("Escape");
  expect(onClose).toHaveBeenCalledWith("new");
});

it("ships an illustration for every preset and minigame", () => {
  const paths = [
    ...STUDY_PATHS.map((path) => path.image),
    "/previews/shared-neighbors.svg",
    "/previews/missing-borders.svg",
  ];
  for (const path of paths)
    expect(readFileSync(`public${path}`, "utf8")).toContain(
      '<svg xmlns="http://www.w3.org/2000/svg"',
    );
});
