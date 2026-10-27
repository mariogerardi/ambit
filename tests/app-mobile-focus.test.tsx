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
