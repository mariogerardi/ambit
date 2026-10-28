// @vitest-environment jsdom
// Install shared mocks before importing the application.
import {
  authProbe,
  click,
  host,
  member,
  mount,
  probe,
  resetRoot,
  root,
} from "./helpers/appShell";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { MOBILE_LAYOUT_QUERY } from "../src/app/useMobileLayout";
import { DEFAULT_LAYERS, GLOBE_LAYERS_KEY } from "../src/app/worldPreferences";
import { THEME_KEY, readTheme } from "../src/theme/themes";

describe("app preferences shell (DOM only; no browser or WebGL)", () => {
  it.each([undefined, "owner"])(
    "switches and syncs themes from Appearance without replacing Earth (account: %s)",
    async (subject) => {
      authProbe.subject = subject;
      history.replaceState(null, "", "/explore");
      await mount();
      expect(probe.props!.palette).toBe("ocean");
      await act(async () => probe.props!.onSelect(member("wurl:CAN")));
      const earth = host.querySelector("canvas");
      await click("Account");
      await click("Settings");
      expect(location.pathname + location.search).toBe(
        "/account?tab=appearance",
      );
      const heading = host.querySelector(
        subject ? ".account-heading" : ".account-panel h1",
      );
      const focusCount = probe.focus.length;
      const states = probe.props!.states;
      const motion = probe.props!.motion;
      await click("Open menu");
      expect(host.querySelector(".app-menu-content .theme-picker")).toBeNull();
      await click("Close menu");
      const firstTheme = host.querySelector<HTMLInputElement>(
        'input[name="app-theme"]',
      )!;
      expect(firstTheme.value).toBe("ocean");
      expect(firstTheme.checked).toBe(true);
      const survey = host.querySelector<HTMLInputElement>(
        'input[name="app-theme"][value="survey"]',
      )!;
      await act(async () => survey.closest<HTMLLabelElement>("label")!.click());
      expect(readTheme()).toBe("survey");
      expect(document.documentElement.dataset.theme).toBe("survey");
      expect(probe.props!.palette).toBe("survey");
      expect(probe.props!.states).toEqual(states);
      expect(probe.focus).toHaveLength(focusCount);
      expect(host.querySelector("canvas")).toBe(earth);
      const paper = host.querySelector<HTMLInputElement>(
        'input[name="app-theme"][value="paper"]',
      )!;
      await act(async () => paper.closest<HTMLLabelElement>("label")!.click());
      expect(readTheme()).toBe("paper");
      expect(document.documentElement.dataset.theme).toBe("paper");
      expect(probe.props!.palette).toBe("paper");
      expect(probe.props!.states).toEqual(states);
      expect(probe.props!.motion).toBe(motion);
      expect(probe.focus).toHaveLength(focusCount);
      expect(host.querySelector("canvas")).toBe(earth);
      expect(
        host.querySelector(subject ? ".account-heading" : ".account-panel h1"),
      ).toBe(heading);
      expect(paper.checked).toBe(true);
      expect(probe.mounts).toBe(1);
      localStorage.setItem(
        THEME_KEY,
        JSON.stringify({ version: 1, theme: "dusk" }),
      );
      await act(async () =>
        dispatchEvent(new StorageEvent("storage", { key: THEME_KEY })),
      );
      expect(probe.props!.palette).toBe("dusk");
      expect(
        host.querySelector<HTMLInputElement>(
          'input[name="app-theme"][value="dusk"]',
        )!.checked,
      ).toBe(true);
      await click("Home");
      expect(probe.props!.palette).toBe("dusk");
      expect(probe.mounts).toBe(1);
    },
  );

  it.each(["dusk", "survey"] as const)(
    "restores a saved %s theme at startup",
    async (theme) => {
      localStorage.setItem(THEME_KEY, JSON.stringify({ version: 1, theme }));
      await mount();
      expect(probe.props!.palette).toBe(theme);
      expect(document.documentElement.dataset.theme).toBe(theme);
    },
  );

  it("shares display settings while overview navigation keeps the live orientation", async () => {
    await mount();
    await click("Admin");
    await click("Home");
    await click("Study");
    await click("Home");
    await click("Explore");
    const saved = { lat: 40, lng: -75, altitude: 0.45 };
    probe.currentView = saved;
    await click("Globe settings");
    const borders = document.querySelector<HTMLInputElement>(
      ".explore-settings-popover input",
    )!;
    await act(async () => borders.click());
    await click("Home");
    expect(probe.currentView).toMatchObject({ lat: saved.lat, lng: saved.lng });
    expect(probe.currentView.altitude).toBeGreaterThan(0.45);
    await click("Admin");
    expect(probe.currentView).toMatchObject({ lat: saved.lat, lng: saved.lng });
    expect(probe.currentView.altitude).toBeGreaterThan(0.45);
    await click("Home");
    await click("Study");
    expect(probe.currentView).toMatchObject({ lat: saved.lat, lng: saved.lng });
    expect(probe.currentView.altitude).toBeGreaterThan(0.45);
    await click("Home");

    await click("Play");
    expect(probe.focus.at(-1)).not.toEqual(saved);
    expect(
      JSON.parse(localStorage.getItem(GLOBE_LAYERS_KEY)!),
    ).not.toHaveProperty("focus");
    expect(probe.mounts).toBe(1);
  });

  it("ignores legacy saved cameras and removes default-view actions", async () => {
    const saved = { lat: -25, lng: 130, altitude: 0.55 };
    localStorage.setItem(
      "wurl.default-view.v1",
      JSON.stringify({ version: 1, focus: saved }),
    );
    await mount();
    expect(probe.props!.initialFocus).not.toEqual(saved);
    await click("Explore");
    await click("Globe settings");
    expect(
      document.querySelector(".explore-settings-popover")!.textContent,
    ).not.toContain("default view");
    await click("Home");
    expect(probe.focus.at(-1)).not.toEqual(saved);
    await click("Admin");
    expect(probe.focus.at(-1)).not.toEqual(saved);
  });

  it("saves Explore layers globally, reloads them, and preserves question disclosure", async () => {
    vi.setSystemTime(new Date(2026, 9, 5, 12));
    await mount();
    await click("Explore");
    await click("Globe settings");
    for (const name of [
      "Country borders",
      "Country names",
      "Major cities",
      "Rivers",
      "Mountain ranges",
      "Ocean & sea names",
    ]) {
      const input = [...document.querySelectorAll("label")]
        .find((l) => l.textContent === name)!
        .querySelector("input")!;
      await act(async () => input.click());
    }
    const saved = JSON.parse(localStorage.getItem(GLOBE_LAYERS_KEY)!);
    expect(saved).toEqual({
      ...DEFAULT_LAYERS,
      borders: false,
      names: false,
      cities: false,
      rivers: true,
      mountains: true,
      oceans: true,
    });
    const expectLayers = () => {
      expect(probe.props!.showBorders).toBe(false);
      expect(probe.props!.regionNames).toBe("none");
      expect(probe.props!.places.length).toBeGreaterThan(0);
      expect(probe.props!.places.every((p) => p.kind === "capital")).toBe(true);
      expect(
        new Set(probe.props!.physicalFeatures!.map((f) => f.kind)),
      ).toEqual(new Set(["river", "mountain", "ocean"]));
    };
    await click("Home");
    expectLayers();
    await click("Admin");
    expectLayers();
    await click("Home");
    await click("Study");
    expectLayers();
    await click("Home");

    await click("Play");
    expect(probe.props!.showBorders).toBe(true);
    expect(probe.props!.physicalFeatures).toEqual([]);
    expect(probe.props!.places.length).toBeLessThan(10);
    await click("Home");
    await act(async () => root.unmount());
    resetRoot();
    await mount();
    expectLayers();
    await click("Explore");
    expectLayers();
    await click("Globe settings");
    expect(
      document.querySelector(".explore-settings-popover")!.textContent,
    ).not.toContain("default view");
  });

  it("updates display settings from another tab without replacing or reframing the globe", async () => {
    await mount();
    const flights = probe.focus.length;
    localStorage.setItem(
      GLOBE_LAYERS_KEY,
      JSON.stringify({ ...DEFAULT_LAYERS, rivers: true }),
    );
    await act(async () =>
      dispatchEvent(new StorageEvent("storage", { key: GLOBE_LAYERS_KEY })),
    );
    expect(probe.focus).toHaveLength(flights);
    expect(probe.props!.places.some((p) => p.kind === "capital")).toBe(true);
    expect(probe.props!.physicalFeatures!.some((f) => f.kind === "river")).toBe(
      true,
    );
    expect(probe.mounts).toBe(1);
  });

  it.each([false, true])(
    "adjusts rotation speed without restarting rotation (mobile: %s)",
    async (mobile) => {
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches: mobile && query === MOBILE_LAYOUT_QUERY,
        addEventListener() {},
        removeEventListener() {},
      }));
      await mount();
      expect(host.querySelector(".home-menu > .overline")).toBeNull();
      expect(probe.props!.rotationSpeed).toBe(1);
      await act(async () => probe.props!.onInteraction());
      const canvas = host.querySelector("canvas");
      if (mobile) await click("Globe settings");
      const speed = document.querySelector<HTMLSelectElement>(
        'select[aria-label="Rotation speed"]',
      )!;
      await act(async () => {
        speed.value = "8";
        speed.dispatchEvent(new Event("change", { bubbles: true }));
      });
      expect(probe.props!.rotationSpeed).toBe(8);
      expect(probe.props!.motion).toBe(false);
      if (mobile) await click("Close globe settings");
      await click("Fidget");
      expect(probe.fidgets).toBeGreaterThan(0);
      expect(host.querySelector("canvas")).toBe(canvas);
      await click("Rotate Earth");
      expect(probe.props!.motion).toBe(true);
      await click("Explore");
      expect(probe.props!.rotationSpeed).toBe(8);
    },
  );
});
