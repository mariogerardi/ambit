// @vitest-environment jsdom
// Install shared mocks before importing the application.
import {
  authProbe,
  click,
  host,
  mount,
  probe,
  root,
  settleLoads,
} from "./helpers/appShell";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { PlayerWorkspace } from "../src/App";
import { openDaily } from "../src/app/dailyProgress";
import { createDailySave, createStudySave } from "../src/app/progressSaves";
import * as journeyRegistry from "../src/game/journeyRegistry";
import { publishProfile } from "../src/services/playerProfile";
import {
  archiveStudy,
  defaultSettings,
  emptyStudy,
  startStudy,
  studyReducer,
} from "../src/study/engine";

describe("app shell (DOM only; no browser or WebGL)", () => {
  it("remounts progress when accounts change and waits for account discovery", async () => {
    authProbe.loading = true;
    await act(async () => root.render(<PlayerWorkspace />));
    expect(
      document.body.querySelector(".ambit-loading-screen")?.textContent,
    ).toContain("Loading your world…");
    expect(localStorage.length).toBe(0);
    const record = (id: string) => {
      const session = { ...startStudy(defaultSettings, 42), id };
      return archiveStudy({
        ...emptyStudy,
        session: studyReducer(session, {
          type: "pick",
          id: session.prompt.targetId,
        }),
      });
    };
    createStudySave("a").save(record("account-a-result"));
    createStudySave("b").save(record("account-b-result"));
    authProbe.loading = false;
    authProbe.subject = "a";
    await act(async () => root.render(<PlayerWorkspace />));
    await settleLoads();
    await click("Study");
    await click("Past study sessions");
    expect(host.querySelectorAll(".study-history-list li")).toHaveLength(1);
    authProbe.subject = "b";
    await act(async () => root.render(<PlayerWorkspace />));
    await settleLoads();
    await click("Past study sessions");
    expect(host.querySelectorAll(".study-history-list li")).toHaveLength(1);
    expect(
      createStudySave("b")
        .load()
        .history?.map((entry) => entry.id),
    ).toEqual(["account-b-result"]);
    authProbe.subject = undefined;
    await act(async () => root.render(<PlayerWorkspace />));
    await settleLoads();
    await click("Past study sessions");
    expect(host.querySelectorAll(".study-history-list li")).toHaveLength(0);
  });

  it("restores cloud progress before creating a Journey on a new device", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(new Date(2026, 9, 11, 12));
    const source = createDailySave(
      journeyRegistry.JOURNEY_INDEX,
      "source-device",
    );
    const original = openDaily(
      source.load(),
      "2026-10-10",
      false,
      journeyRegistry.JOURNEY_INDEX,
    );
    source.save(original);
    const entries = source
      .entries()
      .map((entry) => ({ ...entry, namespace: "daily" }));
    let release!: (value: Response) => void;
    const assets = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, options?: RequestInit) => {
        if (!url.includes("/account/saves")) return assets(url, options);
        if (options?.method === "POST")
          return Promise.resolve(new Response(JSON.stringify({ saved: true })));
        return new Promise<Response>((resolve) => {
          release = resolve;
        });
      }),
    );
    authProbe.subject = "new-device";
    history.replaceState(null, "", "/daily");
    await act(async () => root.render(<PlayerWorkspace />));
    await settleLoads();
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(
      createDailySave(journeyRegistry.JOURNEY_INDEX, "new-device").load()
        .attempts,
    ).toEqual({});
    expect(host.textContent).toContain("Syncing your progress");
    await act(async () => release(new Response(JSON.stringify({ entries }))));
    await settleLoads();
    const restored = createDailySave(
      journeyRegistry.JOURNEY_INDEX,
      "new-device",
    ).load();
    expect(restored.activeDate).toBe("2026-10-11");
    expect(restored.attempts["2026-10-10"].runId).toBe(
      original.attempts["2026-10-10"].runId,
    );
  });

  it("hides admin from guests and protects a direct admin route", async () => {
    authProbe.admin = false;
    history.replaceState(null, "", "/admin");
    await mount();
    expect(host.querySelector(".admin-panel")).toBeNull();
    expect(host.textContent).toContain("Admin access required.");
    await click("Open menu");
    expect(
      [...host.querySelectorAll(".app-menu-content button")].some(
        (button) => button.textContent === "Admin",
      ),
    ).toBe(false);
    expect(host.querySelector(".mobile-navigation")).toBeNull();
  });

  it("opens general feedback from the menu, leaving the shared Earth mounted", async () => {
    authProbe.admin = false;
    await mount();
    const earth = host.querySelector("canvas");
    await click("Send feedback");
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
      "Send feedback",
    );
    expect(host.querySelector("main")?.hasAttribute("inert")).toBe(true);
    await click("Close feedback");
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(host.querySelector("canvas")).toBe(earth);
  });

  it("puts Account access in the header and keeps it out of general navigation", async () => {
    await mount();
    const profile = host.querySelector<HTMLButtonElement>(".profile-toggle")!;
    expect(profile.textContent).toContain("Sign in");
    await click("Open menu");
    expect(
      [...host.querySelectorAll(".app-menu-content button")].some(
        (b) => b.textContent?.trim() === "Account",
      ),
    ).toBe(false);
    await act(async () => profile.click());
    expect(location.pathname).toBe("/account");
    expect(host.textContent).toContain("Welcome to Ambit.");
    expect(host.querySelector(".app-menu-content")).toBeNull();
  });

  it.each([true, false])(
    "places Admin alongside account sections only for admins (admin: %s)",
    async (admin) => {
      authProbe.admin = admin;
      authProbe.subject = "owner";
      await mount();
      await click("Account");
      const adminTab = host.querySelector<HTMLButtonElement>(
        '[data-dd-action-name="Account Open Admin"]',
      );
      expect(!!adminTab).toBe(admin);
      await click("Open menu");
      expect(
        host.querySelector('[data-dd-action-name="Menu Admin"]'),
      ).toBeNull();
      await click("Close menu");
      if (!adminTab) return;
      await act(async () => adminTab.click());
      await settleLoads();
      expect(location.pathname + location.search).toBe("/account?tab=admin");
      expect(
        host.querySelector('.account-tabs [aria-current="page"]')?.textContent,
      ).toBe("Admin");
      expect(host.querySelector(".admin-panel")).not.toBeNull();
      await act(async () =>
        host
          .querySelector<HTMLButtonElement>(
            '[data-dd-action-name="Account Open Profile"]',
          )!
          .click(),
      );
      await settleLoads();
      expect(location.pathname + location.search).toBe("/account?tab=profile");
      expect(
        host.querySelector('.account-tabs [aria-current="page"]')?.textContent,
      ).toBe("Profile");
    },
  );

  it("keeps the account shell and admin draft mounted across URL-driven tabs and browser history", async () => {
    authProbe.subject = "owner";
    history.replaceState(null, "", "/account?tab=dashboard");
    await mount();
    const layer = host.querySelector(".mode-incoming");
    const heading = host.querySelector(".account-heading");
    const tabs = host.querySelector(".account-tabs");
    async function section(label: string) {
      await act(async () =>
        host
          .querySelector<HTMLButtonElement>(
            `[data-dd-action-name="Account Open ${label}"]`,
          )!
          .click(),
      );
      await settleLoads();
      expect(host.querySelector(".mode-incoming")).toBe(layer);
      expect(host.querySelector(".account-heading")).toBe(heading);
      expect(host.querySelector(".account-tabs")).toBe(tabs);
      expect(host.querySelector(".mode-outgoing")).toBeNull();
    }
    await section("Profile");
    expect(location.search).toBe("?tab=profile");
    await section("Friends");
    expect(location.search).toBe("?tab=friends");
    await section("Admin");
    expect(location.search).toBe("?tab=admin");
    expect(host.querySelector(".admin-panel > h1")).toBeNull();
    const editor = host.querySelector(".journey-date-editor");
    await click("Choose a Journey");
    await act(async () =>
      host
        .querySelector<HTMLButtonElement>(
          '[data-journey-id="down-the-danube-v1"]',
        )!
        .click(),
    );
    await click("Feedback");
    expect(location.search).toBe("?tab=admin&section=feedback");
    await click("Tools");
    expect(location.search).toBe("?tab=admin&section=tools");
    await act(async () => {
      history.back();
      await new Promise((resolve) => setTimeout(resolve, 25));
    });
    expect(location.search).toBe("?tab=admin&section=feedback");
    expect(host.querySelector("#admin-feedback")?.hasAttribute("hidden")).toBe(
      false,
    );
    await act(async () => {
      history.forward();
      await new Promise((resolve) => setTimeout(resolve, 25));
    });
    expect(location.search).toBe("?tab=admin&section=tools");
    expect(host.querySelector("#admin-tools")?.hasAttribute("hidden")).toBe(
      false,
    );
    await section("Dashboard");
    expect(location.search).toBe("?tab=dashboard");
    await section("Admin");
    expect(host.querySelector(".journey-date-editor")).toBe(editor);
    expect(
      host.querySelector(".scheduled-journey-preview.is-draft h4")?.textContent,
    ).toBe("Down the Danube");
    expect(probe.mounts).toBe(1);
  });

  it.each([true, false])(
    "opens an admin subtab directly and preserves access protection (admin: %s)",
    async (admin) => {
      authProbe.subject = "owner";
      authProbe.admin = admin;
      history.replaceState(null, "", "/account?tab=admin&section=tools");
      await mount();
      if (admin) {
        expect(host.querySelector("#admin-tools")?.hasAttribute("hidden")).toBe(
          false,
        );
        expect(
          host.querySelector("#admin-tab-tools")?.getAttribute("aria-selected"),
        ).toBe("true");
      } else {
        expect(host.textContent).toContain("Admin access required.");
        expect(host.querySelector(".admin-panel")).toBeNull();
        expect(
          host.querySelector('[data-dd-action-name="Account Open Admin"]'),
        ).toBeNull();
      }
    },
  );

  it("nests Archive directly beneath Journey and preserves the shared globe when opening it", async () => {
    await mount();
    const canvas = host.querySelector("canvas");
    await click("Open menu");
    expect(
      [...host.querySelectorAll(".app-menu-journeys button")].map((button) =>
        button.textContent?.trim(),
      ),
    ).toEqual(["Journey", "Archive"]);
    expect(
      host.querySelector(".app-menu-journeys .app-menu-subitem")?.textContent,
    ).toBe("Archive");
    await click("Archive");
    expect(location.pathname).toBe("/archive");
    expect(host.querySelector(".app-menu-content")).toBeNull();
    expect(host.querySelector("canvas")).toBe(canvas);
    await click("Open menu");
    expect(
      host.querySelector('.app-menu-subitem[aria-current="page"]')?.textContent,
    ).toBe("Archive");
  });

  it("shows a saved handle and flag in the header and ignores another player's profile", async () => {
    authProbe.subject = "a";
    await mount();
    const profile = {
      id: "a",
      displayName: "Alice",
      handle: "alice",
      avatar: "flag:wurl:CAN" as const,
      favoriteRegion: "",
      bio: "",
      shareJourneyScores: false,
      presets: [],
      revision: 1,
    };
    await act(async () => publishProfile("a", profile));
    expect(host.querySelector(".profile-toggle")?.textContent).toBe("@alice");
    expect(
      host.querySelector(".profile-toggle img")?.getAttribute("src"),
    ).toMatch(/^\/flags\/study\//);
    await act(async () =>
      publishProfile("b", { ...profile, id: "b", handle: "bob" }),
    );
    expect(host.querySelector(".profile-toggle")?.textContent).toBe("@alice");
    expect(
      host.querySelector(".profile-toggle")?.classList.contains("is-signed-in"),
    ).toBe(false);
  });

  it("keeps app navigation in a dismissible menu without blocking or replacing Earth", async () => {
    await mount();
    const canvas = host.querySelector("canvas");
    expect(host.querySelector(".app-menu-content")).toBeNull();
    await click("Open menu");
    expect(
      host.querySelector('.app-menu-content [aria-current="page"]')
        ?.textContent,
    ).toBe("Home");
    await click("World credits");
    const credits = document.querySelector<HTMLElement>(
      '.world-credits-dialog[role="dialog"][aria-modal="true"]',
    )!;
    expect(credits).not.toBeNull();
    expect(credits.textContent).toContain("Natural Earth");
    expect(credits.querySelector('a[href="/NOTICE.txt"]')).not.toBeNull();
    expect(
      credits.querySelector('a[href="/geography/danube-context.v1.json"]'),
    ).not.toBeNull();
    expect(host.querySelector(".app-menu-content")).toBeNull();
    expect(host.querySelector("main")?.hasAttribute("inert")).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.activeElement).toBe(credits);
    const controls = credits.querySelectorAll<HTMLElement>("button, a[href]");
    await act(async () =>
      dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" })),
    );
    expect(document.activeElement).toBe(controls[0]);
    await act(async () =>
      dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", shiftKey: true }),
      ),
    );
    expect(document.activeElement).toBe(controls[controls.length - 1]);
    await act(async () =>
      dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" })),
    );
    expect(document.activeElement).toBe(controls[0]);
    await act(async () =>
      dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
    );
    expect(host.querySelector(".app-menu-content")).toBeNull();
    expect(document.activeElement).toBe(host.querySelector(".app-menu-toggle"));
    expect(document.querySelector(".world-credits-dialog")).toBeNull();
    expect(host.querySelector("main")?.hasAttribute("inert")).toBe(false);
    expect(document.body.style.overflow).toBe("");
    await click("Open menu");
    await act(async () =>
      canvas!.dispatchEvent(new Event("pointerdown", { bubbles: true })),
    );
    expect(host.querySelector(".app-menu-content")).toBeNull();
    await click("Admin");
    expect(host.querySelector(".admin-panel")).not.toBeNull();
    expect(host.querySelector(".app-menu-content")).toBeNull();
    expect(host.querySelector("canvas")).toBe(canvas);
  });

  it.each(["button", "backdrop"])(
    "closes world credits with its %s",
    async (method) => {
      await mount();
      await click("Open menu");
      await click("World credits");
      await act(async () =>
        document
          .querySelector<HTMLElement>(
            method === "button"
              ? '[aria-label="Close world credits"]'
              : ".world-credits-backdrop",
          )!
          .click(),
      );
      expect(document.querySelector(".world-credits-dialog")).toBeNull();
      expect(document.activeElement).toBe(
        host.querySelector(".app-menu-toggle"),
      );
      expect(document.body.style.overflow).toBe("");
    },
  );

  it("routes comparison links on entry and updates query intent on browser history changes", async () => {
    const comparison =
      "/account?tab=friends&view=compare&date=2026-10-13&journey=beyond-the-maple-leaf-v1&version=1";
    history.replaceState(null, "", comparison);
    await mount();
    expect(host.textContent).toContain("Compare your Journey with friends.");
    await act(async () => {
      history.replaceState(null, "", "/account?friend=bob");
      dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(host.textContent).toContain("Connect with @bob");
    await act(async () => {
      history.replaceState(null, "", comparison);
      dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(host.textContent).toContain("Compare your Journey with friends.");
    expect(probe.mounts).toBe(1);
  });
});
