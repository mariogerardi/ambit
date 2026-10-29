// @vitest-environment jsdom
import { click, host, mount, probe } from "./helpers/appShell";
import { act } from "react";
import { expect, it, vi } from "vitest";
import { MOBILE_LAYOUT_QUERY } from "../src/app/useMobileLayout";

it("preserves keyboard focus on the next action and prompt during mobile minigame transitions", async () => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === MOBILE_LAYOUT_QUERY,
    addEventListener() {},
    removeEventListener() {},
  }));
  history.replaceState(null, "", "/minigames/shared-neighbors/play");
  await mount();
  expect(document.activeElement).toBe(
    host.querySelector(".shared-neighbors-game h1"),
  );
  await act(async () => probe.props!.onCoordinateTap!({ lat: 0, lng: -140 }));
  await click("Check answer");
  expect(document.activeElement).toBe(
    host.querySelector(".minigame-action-row button"),
  );
  await click("Next pair");
  expect(document.activeElement).toBe(
    host.querySelector(".shared-neighbors-game h1"),
  );
});

it("keeps Pinpoint's target visible while using the enlarged mobile globe", async () => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === MOBILE_LAYOUT_QUERY,
    addEventListener() {},
    removeEventListener() {},
  }));
  history.replaceState(null, "", "/minigames/pinpoint/play");
  await mount();
  const target = host
    .querySelector(".shared-neighbors-game h1 em")!
    .textContent!.replace(/\?$/, "");
  const canvas = host.querySelector("canvas");
  await click("Enlarge globe");
  expect(host.querySelector(".mode-incoming")!.hasAttribute("inert")).toBe(
    true,
  );
  expect(host.querySelector(".mobile-map-prompt")!.textContent).toContain(
    target,
  );
  await act(async () => probe.props!.onCoordinateTap!({ lat: 0, lng: -140 }));
  expect(host.querySelector(".mobile-map-prompt")!.textContent).toContain(
    target,
  );
  await click("Show details ↓");
  expect(host.querySelector(".mode-incoming")!.hasAttribute("inert")).toBe(
    false,
  );
  await click("Check answer");
  await click("Enlarge globe");
  expect(host.querySelector(".mobile-map-prompt")).toBeNull();
  expect(host.querySelector("canvas")).toBe(canvas);
  expect(probe.mounts).toBe(1);
});
