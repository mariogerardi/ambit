// @vitest-environment jsdom
// Install shared mocks before importing the application.
import {
  click,
  authProbe,
  host,
  member,
  mount,
  panelObservers,
  probe,
  savedStudy,
  settleLoads,
} from "./helpers/appShell";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { DAILY_KEY } from "../src/app/dailyProgress";
import { MOBILE_LAYOUT_QUERY } from "../src/app/useMobileLayout";
import * as journeyRegistry from "../src/game/journeyRegistry";
import { supportsWebGL } from "../src/globe/support";
import { defaultSettings, emptyStudy, STUDY_KEY } from "../src/study/engine";

describe("app globe shell (DOM only; no browser or WebGL)", () => {
  it("recovers the renderer once without losing a Study draft and offers manual retry after repeated loss", async () => {
    localStorage.setItem(
      STUDY_KEY,
      JSON.stringify({
        ...emptyStudy,
        settings: {
          ...defaultSettings,
          styles: { ...defaultSettings.styles, countries: "typing" },
        },
      }),
    );
    await mount();
    await click("Study");
    await click("Custom");
    await click("Start studying");
    const input = host.querySelector<HTMLInputElement>(
      ".study-question input",
    )!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(input, "Bra");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const prompt = host.querySelector(".study-question h1")!.textContent;
    const view = { lat: -15, lng: 133, altitude: 1.7 };
    probe.currentView = view;
    await act(async () => probe.props!.onFailure());
    expect(host.querySelector("canvas")).toBeNull();
    expect(host.textContent).toContain("Restoring the globe");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 650));
    });
    await settleLoads();
    expect(probe.mounts).toBe(2);
    expect(probe.props!.initialFocus).toEqual(view);
    expect(
      host.querySelector<HTMLInputElement>(".study-question input")!.value,
    ).toBe("Bra");
    expect(host.querySelector(".study-question h1")!.textContent).toBe(prompt);
    expect(savedStudy().session?.text).toBe("Bra");

    await act(async () => probe.props!.onFailure());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 650));
    });
    expect(probe.mounts).toBe(2);
    expect(host.querySelector("canvas")).toBeNull();
    expect(host.textContent).toContain("The globe isn’t available");
    await click("Retry globe");
    expect(probe.mounts).toBe(3);
    expect(
      host.querySelector<HTMLInputElement>(".study-question input")!.value,
    ).toBe("Bra");
    expect(host.querySelector(".experience-status")).toBeNull();
  });

  it("keeps navigation usable when the recovery probe fails and retries only on player request", async () => {
    await mount();
    vi.mocked(supportsWebGL).mockReturnValue(false);
    await act(async () => probe.props!.onFailure());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 650));
    });
    expect(probe.mounts).toBe(1);
    expect(host.querySelector("canvas")).toBeNull();
    expect(host.textContent).toContain("The globe isn’t available");
    await click("Explore");
    expect(location.pathname).toBe("/explore");
    vi.mocked(supportsWebGL).mockReturnValue(true);
    await click("Retry globe");
    expect(probe.mounts).toBe(2);
  });

  it("reveals the globe after painting geography and keeps it presented across modes", async () => {
    const frames = new Map<number, FrameRequestCallback>();
    let nextFrame = 0;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
    const paint = async () => {
      await act(async () => {
        const pending = [...frames.values()];
        frames.clear();
        pending.forEach((callback) => callback(performance.now()));
      });
    };
    await mount();
    expect(probe.props!.regions.length).toBeGreaterThan(0);
    expect(host.querySelector(".game-scene")!.getAttribute("aria-busy")).toBe(
      "true",
    );
    expect(document.body.querySelector(".ambit-loading-screen")).not.toBeNull();
    expect(host.textContent).not.toMatch(
      /Unfolding your world|Gathering the world/,
    );
    await paint();
    expect(host.querySelector(".game-scene.globe-presented")).toBeNull();
    expect(document.body.querySelector(".ambit-loading-screen")).not.toBeNull();
    await paint();
    expect(host.querySelector(".game-scene.globe-presented")).not.toBeNull();
    expect(
      document.body.querySelector(".ambit-loading-screen.is-leaving"),
    ).not.toBeNull();
    await click("Explore");
    await click("Study");
    await click("Home");
    expect(host.querySelector(".game-scene.globe-presented")).not.toBeNull();
    expect(probe.mounts).toBe(1);
  });

  it("frames selected countries more closely on a phone and retains the framing on recenter", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === MOBILE_LAYOUT_QUERY,
      addEventListener() {},
      removeEventListener() {},
    }));
    await mount();
    await click("Explore");
    const country = member("wurl:CAN");
    await act(async () => probe.props!.onSelect(country));
    expect(probe.focus.at(-1)).toEqual({
      ...country.focus,
      altitude: country.focus.altitude! * 0.72,
    });
    await click("◎ Recenter");
    expect(probe.focus.at(-1)).toEqual({
      ...country.focus,
      altitude: country.focus.altitude! * 0.72,
    });
  });

  it.each([
    ["Explore", ".explore-card"],
    ["Journey archive", ".journey-archive"],
  ])(
    "fits the mobile %s tray to changing content while keeping the globe and enlargement control",
    async (label, panelClass) => {
      let contentHeight = 196;
      const bounds = HTMLElement.prototype.getBoundingClientRect;
      vi.spyOn(
        HTMLElement.prototype,
        "getBoundingClientRect",
      ).mockImplementation(function (this: HTMLElement) {
        if (!this.matches(panelClass)) return bounds.call(this);
        return { ...bounds.call(this), height: contentHeight } as DOMRect;
      });
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches: query === MOBILE_LAYOUT_QUERY,
        addEventListener() {},
        removeEventListener() {},
      }));
      await mount();
      expect(probe.props!.visualScale).toBe(1.2);
      const tray = host.querySelector(".mode-incoming");
      const mapTools = host.querySelector(".mobile-map-tools");
      await click(label);
      expect(host.querySelector(".mode-incoming")).toBe(tray);
      expect(host.querySelector(".mobile-map-tools")).toBe(mapTools);
      const experience = host.querySelector<HTMLElement>(".experience")!;
      expect(
        experience.style.getPropertyValue("--explore-content-height"),
      ).toBe("196px");
      expect(probe.props!.visualScale).toBe(1);
      const enlargement = [
        ...host.querySelectorAll<HTMLButtonElement>("button"),
      ].find((button) => button.textContent?.trim() === "Enlarge globe")!;
      expect(enlargement.getAttribute("aria-expanded")).toBe("false");
      expect(host.querySelector(".mode-incoming")!.hasAttribute("inert")).toBe(
        false,
      );
      const observer = panelObservers.find((item) =>
        item.element?.matches(panelClass),
      )!;
      contentHeight = 480;
      await act(async () => observer.resize());
      expect(
        experience.style.getPropertyValue("--explore-content-height"),
      ).toBe("480px");
      await act(async () => enlargement.click());
      expect(enlargement.getAttribute("aria-expanded")).toBe("true");
      await act(async () => enlargement.click());
      expect(enlargement.textContent?.trim()).toBe("Enlarge globe");
      expect(host.querySelector(panelClass)).not.toBeNull();
      expect(probe.mounts).toBe(1);
      await click("Home");
      expect(observer.disconnected).toBe(true);
      expect(probe.props!.visualScale).toBe(1.2);
      expect(host.querySelector(".mode-incoming")).toBe(tray);
      await click("Study");
      expect(host.querySelector(".mode-incoming")).toBe(tray);
      await click("Explore");
      expect(host.querySelector(".mode-incoming")).toBe(tray);
      await click("Study");
      expect(host.querySelector(".mode-incoming")).toBe(tray);
      expect(probe.mounts).toBe(1);
    },
  );

  it("defers Journey warming until idle and retries a failed load without replacing Earth", async () => {
    const loader = vi.spyOn(journeyRegistry, "loadJourney");
    await mount();
    expect(loader).not.toHaveBeenCalled();
    const canvas = host.querySelector("canvas");
    loader.mockRejectedValueOnce(Error("offline"));
    await click("Play");
    expect(host.textContent).toContain(
      "Couldn’t load this Journey. Please reload to try again.",
    );
    const attempt = JSON.parse(localStorage.getItem(DAILY_KEY)!).attempts;
    await click("Try again");
    expect(host.querySelector(".mode-incoming .question-card")).not.toBeNull();
    expect(host.querySelector("canvas")).toBe(canvas);
    expect(JSON.parse(localStorage.getItem(DAILY_KEY)!).attempts).toEqual(
      attempt,
    );
  });

  it("warms today's Journey at idle without changing Home's globe or starting a game", async () => {
    const loader = vi.spyOn(journeyRegistry, "loadJourney");
    await mount();
    const states = probe.props!.states;
    const canvas = host.querySelector("canvas");
    expect(loader).not.toHaveBeenCalled();
    const callback = vi.mocked(requestIdleCallback).mock.calls.at(-1)![0];
    await act(async () =>
      callback({ didTimeout: false, timeRemaining: () => 50 }),
    );
    await settleLoads();
    expect(loader).toHaveBeenCalledTimes(1);
    expect(location.pathname).toBe("/");
    expect(probe.props!.states).toBe(states);
    expect(probe.focus).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem(DAILY_KEY)!).attempts).toEqual({});
    await click("Play");
    expect(host.querySelector(".question-card")).not.toBeNull();
    expect(probe.focus.length).toBeGreaterThan(0);
    expect(host.querySelector("canvas")).toBe(canvas);
  });

  it("preserves the canvas, world load, and render feature identities through rapid mode changes", async () => {
    // Keep the outgoing panel alive while lazy imports settle on slower CI hosts.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    await mount();
    const canvas = host.querySelector("canvas");
    const first = probe.renders.find((r) => r.length === 242)!;
    expect(first).toBeDefined();
    await click("Explore");
    await click("Home");
    await click("Study");
    await click("Home");
    await click("Play");
    await click("Home");
    await act(async () => {
      history.pushState(null, "", "/journey/down-the-danube");
      dispatchEvent(new PopStateEvent("popstate"));
    });
    await settleLoads();
    expect(probe.mounts).toBe(1);
    expect(host.querySelector("canvas")).toBe(canvas);
    expect(
      vi
        .mocked(fetch)
        .mock.calls.map((c) => c[0])
        .filter((url) => String(url).startsWith("/geography/")),
    ).toEqual(["/geography/manifest.json", "/geography/world.v1.json"]);
    for (const rendered of probe.renders.filter((r) => r.length === 242))
      expect(rendered).toBe(first);
    expect(host.querySelectorAll(".mode-outgoing").length).toBeLessThanOrEqual(
      1,
    );
    expect(host.querySelector(".mode-incoming")?.hasAttribute("inert")).toBe(
      false,
    );
    await act(async () => vi.advanceTimersByTime(1000));
    expect(host.querySelector(".mode-outgoing")).toBeNull();
    expect(host.querySelector("canvas")).toBe(canvas);
  });

  it("resumes natural rotation on entering Explore and Home after interaction", async () => {
    await mount();
    expect(probe.props!.motion).toBe(true);
    await act(async () => probe.props!.onInteraction());
    expect(probe.props!.motion).toBe(false);
    await click("Explore");
    expect(probe.props!.motion).toBe(true);
    await click("Home");
    expect(probe.props!.motion).toBe(true);
    await click("Pause Earth");
    expect(probe.props!.motion).toBe(false);
  });

  it("preserves enabled rotation through Explore navigation and fidget", async () => {
    await mount();
    expect(probe.props!.motion).toBe(true);
    await click("Explore");
    expect(probe.props!.motion).toBe(true);
    await click("Fidget");
    expect(probe.fidgets).toBe(1);
    expect(probe.props!.motion).toBe(true);
  });

  it.each(["pointerdown", "wheel", "keydown"])(
    "keeps mobile playback between the map actions and dismisses the hint on %s",
    async (eventType) => {
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches: query === MOBILE_LAYOUT_QUERY,
        addEventListener() {},
        removeEventListener() {},
      }));
      await mount();
      const tools = host.querySelector(".mobile-map-tools")!;
      expect([...tools.children].map((child) => child.className)).toEqual([
        "",
        "globe-controls",
        "",
      ]);
      expect(document.querySelectorAll(".globe-controls")).toHaveLength(1);
      expect(host.querySelector(".mobile-gesture-hint")).not.toBeNull();
      // Programmatic camera changes must not dismiss the player's instruction.
      await click("Enlarge globe");
      expect(host.querySelector(".mobile-gesture-hint")).not.toBeNull();
      await act(async () => {
        host
          .querySelector("canvas")!
          .dispatchEvent(new Event(eventType, { bubbles: true }));
      });
      expect(host.querySelector(".mobile-gesture-hint")).toBeNull();
      await click("Explore");
      expect(host.querySelector(".mobile-gesture-hint")).toBeNull();
    },
  );

  it.each(["account", "builder"])(
    "fits Home to its live viewport after leaving the hidden %s globe",
    async (page) => {
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches: query === MOBILE_LAYOUT_QUERY,
        addEventListener() {},
        removeEventListener() {},
      }));
      await mount();
      if (page === "account") {
        await click("Account");
        if (authProbe.subject) await click("Progress");
      } else {
        await click("Study");
        await click("Custom");
      }
      expect(probe.props!.active).toBe(false);
      const scene = host.querySelector(".game-scene")!;
      Object.defineProperty(scene, "clientWidth", {
        configurable: true,
        value: 390,
      });
      Object.defineProperty(scene, "clientHeight", {
        configurable: true,
        value: 844,
      });
      probe.currentView = { lat: 17, lng: 80, altitude: 1.4 };
      await click("ambit home");
      expect(probe.props!.active).toBe(true);
      expect(probe.fitModes.at(-1)).toBe("world");
      expect(probe.focus.at(-1)).toMatchObject({ lat: 17, lng: 80 });
      expect(probe.mounts).toBe(1);
    },
  );

  it("requires WebGL to play without mounting it when unsupported", async () => {
    vi.mocked(supportsWebGL).mockReturnValue(false);
    await mount();
    expect(probe.mounts).toBe(0);
    expect(host.querySelector(".account-earth")).not.toBeNull();
    expect(host.textContent).toContain("The 3D globe isn’t available");
    expect(
      host.querySelector<HTMLButtonElement>(".daily-menu .primary-button")
        ?.disabled,
    ).toBe(true);
    expect(host.querySelector('[role="alert"]')).toBeNull();
    await click("Study");
    expect(probe.mounts).toBe(0);
    expect(host.textContent).toContain("This activity requires the 3D globe");
  });
});
