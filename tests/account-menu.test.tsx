// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AccountMenu } from "../src/app/AccountMenu";

let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
const onNavigate = vi.fn(),
  openJourney = vi.fn();
const props = {
  signedIn: true,
  admin: false,
  path: "/",
  onNavigate,
  journey: {
    title: "Island Instincts",
    action: "Resume",
    progress: "2 of 5 stops",
    ready: true,
    open: openJourney,
  },
};
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  onNavigate.mockClear();
  openJourney.mockClear();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
async function mount(overrides: Partial<typeof props> = {}) {
  await act(async () => root.render(<AccountMenu {...props} {...overrides} />));
}
async function click(label: string) {
  const button = [...host.querySelectorAll<HTMLButtonElement>("button")].find(
    (button) =>
      button.getAttribute("aria-label") === label ||
      button.textContent?.trim() === label,
  )!;
  expect(button).toBeDefined();
  await act(async () => button.click());
}
it("opens direct account destinations and keeps Admin restricted", async () => {
  await mount();
  await click("Account");
  expect(
    host.querySelector('[aria-label="Your account"]')?.textContent,
  ).not.toContain("Admin");
  await click("Settings");
  expect(onNavigate).toHaveBeenLastCalledWith("/account?tab=appearance");
  expect(host.querySelector("nav")).toBeNull();
  await mount({ admin: true });
  await click("Account");
  await click("Admin");
  expect(onNavigate).toHaveBeenLastCalledWith("/account?tab=admin");
});
it("dismisses with Escape, focus leaving, outside presses and navigation", async () => {
  await mount();
  await click("Account");
  const trigger = host.querySelector<HTMLButtonElement>(
    '[aria-label="Account"]',
  )!;
  await act(async () =>
    dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", cancelable: true }),
    ),
  );
  expect(host.querySelector("nav")).toBeNull();
  expect(document.activeElement).toBe(trigger);
  await click("Account");
  await act(async () =>
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true })),
  );
  expect(host.querySelector("nav")).toBeNull();
  await click("Account");
  const other = document.createElement("button");
  document.body.append(other);
  await act(async () => other.focus());
  expect(host.querySelector("nav")).toBeNull();
  other.remove();
  await click("Account");
  await mount({ path: "/explore" });
  expect(host.querySelector("nav")).toBeNull();
});
it("opens the existing Journey action without changing a save itself", async () => {
  await mount();
  await click("Account");
  const journey = host.querySelector<HTMLButtonElement>(".account-menu-today")!;
  expect(journey.textContent).toContain("2 of 5 stops");
  await act(async () => journey.click());
  expect(openJourney).toHaveBeenCalledOnce();
  expect(onNavigate).not.toHaveBeenCalled();
  expect(host.querySelector("nav")).toBeNull();
});
it("takes guests straight to sign-in and closes account navigation on sign-out", async () => {
  await mount();
  await click("Account");
  await mount({ signedIn: false });
  expect(host.querySelector("nav")).toBeNull();
  await click("Account");
  expect(onNavigate).toHaveBeenLastCalledWith("/account");
  expect(host.querySelector("[aria-expanded]")).toBeNull();
});
