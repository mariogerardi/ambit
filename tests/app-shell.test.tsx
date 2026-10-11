// @vitest-environment jsdom
import {
  act,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { publishProfile } from "../src/services/playerProfile";
import { clearProfileCache } from "../src/services/playerProfileCache";
import { THEME_KEY, readTheme } from "../src/theme/themes";
import { regionBorderVisible } from "../src/globe/outlines";
import type { GlobeHandle } from "../src/globe/GlobeView";
import type {
  RegionFeature,
  Focus,
  VisualState,
  PlaceFeature,
} from "../src/geography/types";
import { createGlobeRegionPreparer } from "../src/globe/geometry";
import { App, PlayerWorkspace } from "../src/App";
import { createStudySave, createDailySave } from "../src/app/progressSaves";
const savedStudy = () => createStudySave().load();
import * as journeyRegistry from "../src/game/journeyRegistry";
import {
  STUDY_KEY,
  defaultSettings,
  emptyStudy,
  startStudy,
  studyReducer,
  studyPool,
  capitalOf,
  archiveStudy,
} from "../src/study/engine";
import { initialGame } from "../src/game/state";
import { FOURTH_JOURNEY, YUGOSLAV_REPUBLICS } from "../src/game/fourthJourney";
import { FIFTH_JOURNEY } from "../src/game/fifthJourney";
import { SIXTH_JOURNEY } from "../src/game/sixthJourney";
import { EIGHTH_JOURNEY } from "../src/game/eighthJourney";
import { SEVENTH_JOURNEY } from "../src/game/seventhJourney";
import { FIFTEENTH_JOURNEY } from "../src/game/fifteenthJourney";
import { DAILY_KEY, openDaily } from "../src/app/dailyProgress";
import { GLOBE_LAYERS_KEY, DEFAULT_LAYERS } from "../src/app/worldPreferences";
import { MOBILE_LAYOUT_QUERY } from "../src/app/useMobileLayout";
import { STUDY_PATHS } from "../src/study/paths";
interface GlobeProps {
  palette?: string;
  visualScale?: number;
  initialFocus?: Focus;
  regions: RegionFeature[];
  places: PlaceFeature[];
  placeContextual: boolean;
  states: Record<string, VisualState>;
  motion: boolean;
  rotationSpeed: number;
  regionNames: string;
  namedRegionIds?: string[];
  borderRegionIds?: string[];
  showBorders: boolean;
  physicalFeatures?: { kind: string }[];
  onReady(): void;
  onInteraction(): void;
  onSelect(region: RegionFeature): void;
  onPlace(place: PlaceFeature): void;
  onCoordinateTap?(point: Focus): void;
  regionInteraction?: boolean;
  selectDisabled?: boolean;
  placeMarkers?: boolean;
  placeLabels?: boolean;
  placeInteraction?: boolean;
  onSurfaceTap?(region?: RegionFeature): void;
  active?: boolean;
}
const probe = vi.hoisted(() => ({
  mounts: 0,
  fidgets: 0,
  props: undefined as GlobeProps | undefined,
  renders: [] as RegionFeature[][],
  focus: [] as Focus[],
  fitModes: [] as (boolean | "world" | undefined)[],
  tours: [] as Focus[][],
  tourCancellations: 0,
  currentView: { lat: 14, lng: 24, altitude: 1.65 } as Focus,
}));
vi.mock("../src/globe/GlobeView", () => ({
  GlobeView: forwardRef<GlobeHandle, GlobeProps>((props, ref) => {
    const prepare = useMemo(createGlobeRegionPreparer, []);
    const rendered = prepare(props.regions);
    probe.renders.push(rendered);
    probe.props = props;
    const view = useRef(probe.currentView);
    useImperativeHandle(
      ref,
      () => ({
        focus(target, fit) {
          probe.fitModes.push(fit);
          probe.focus.push(target);
          probe.currentView = target;
          view.current = target;
        },
        cancelFocus() {},
        flyover(stops) {
          probe.tours.push(stops);
        },
        cancelFlyover() {
          probe.tourCancellations++;
        },
        cancelFidget() {},
        fidget() {
          probe.fidgets++;
        },
        view: () => probe.currentView,
        measure: async () => ({ fps: 60, frames: 1, seconds: 1, triangles: 1 }),
      }),
      [],
    );
    useEffect(() => {
      probe.mounts++;
      props.onReady();
    }, []);
    return <canvas data-testid="shared-earth" />;
  }),
}));
const authProbe = vi.hoisted(() => ({
  admin: true,
  subject: undefined as string | undefined,
  loading: false,
}));
vi.mock("../src/services/accounts", () => ({
  useAccount: () => ({
    user: authProbe.subject
      ? {
          profile: {
            sub: authProbe.subject,
            email: `${authProbe.subject}@example.com`,
          },
        }
      : null,
    admin: authProbe.admin,
    loading: authProbe.loading,
    busy: false,
    error: "",
    signIn: vi.fn(),
    signOut: vi.fn(),
    accessToken: async () => "test-access-token",
  }),
}));
vi.mock("../src/app/FeedbackReview", () => ({ FeedbackReview: () => null }));
let root: Root, host: HTMLDivElement;
const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const member = (id: string) => world.find((r) => r.id === id)!;
async function click(text: string) {
  await settleLoads();
  const buttons = [
    ...document.querySelectorAll<HTMLButtonElement>("button"),
  ].filter((b) => !b.closest("[inert]"));
  let button =
    buttons.find(
      (b) =>
        b.textContent?.trim() === text || b.getAttribute("aria-label") === text,
    ) ?? buttons.find((b) => b.textContent?.trim().startsWith(text));
  if (
    !button &&
    [
      "Home",
      "Admin",
      "Journey",
      "Explore",
      "Study",
      "Account",
      "Send feedback",
    ].includes(text)
  ) {
    await click("Open menu");
    button = [
      ...host.querySelectorAll<HTMLButtonElement>(".app-menu-content button"),
    ].find((b) => b.textContent === text);
  }
  expect(button, `Button: ${text}`).toBeDefined();
  await act(async () => button!.click());
  await settleLoads();
}
async function settleLoads() {
  // Effects load Journey content, then rendering can request a lazy panel.
  await act(async () => {
    await vi.dynamicImportSettled();
  });
  await act(async () => {
    await vi.dynamicImportSettled();
  });
}
async function openPlayground() {
  await act(async () => {
    history.pushState(null, "", "/playground");
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await settleLoads();
}
async function mount() {
  await act(async () => {
    root.render(<App />);
  });
  await settleLoads();
}
let panelObservers: {
  resize(): void;
  element?: Element;
  disconnected: boolean;
}[] = [];
beforeEach(() => {
  clearProfileCache();
  authProbe.admin = true;
  authProbe.subject = undefined;
  authProbe.loading = false;
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    clear: () => store.clear(),
    removeItem: (key: string) => store.delete(key),
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  });
  panelObservers = [];
  vi.stubGlobal(
    "ResizeObserver",
    class {
      item: (typeof panelObservers)[number];
      constructor(resize: () => void) {
        this.item = { resize, disconnected: false };
        panelObservers.push(this.item);
      }
      observe(element: Element) {
        this.item.element = element;
      }
      disconnect() {
        this.item.disconnected = true;
      }
    },
  );
  localStorage.clear();
  history.replaceState(null, "", "/");
  probe.mounts = 0;
  probe.props = undefined;
  probe.renders = [];
  probe.focus = [];
  probe.fitModes = [];
  probe.tours = [];
  probe.tourCancellations = 0;
  probe.currentView = { lat: 14, lng: 24, altitude: 1.65 };
  vi.stubGlobal(
    "requestIdleCallback",
    vi.fn(() => 1),
  );
  vi.stubGlobal("cancelIdleCallback", vi.fn());
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (url: string) =>
        new Response(readFileSync(`public${url.split("?")[0]}`, "utf8")),
    ),
  );
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe("persistent application shell (DOM only; no browser or WebGL)", () => {
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
    expect(host.textContent).not.toMatch(
      /Unfolding your world|Gathering the world/,
    );
    await paint();
    expect(host.querySelector(".game-scene.globe-presented")).toBeNull();
    await paint();
    expect(host.querySelector(".game-scene.globe-presented")).not.toBeNull();
    await click("Explore");
    await click("Study");
    await click("Home");
    expect(host.querySelector(".game-scene.globe-presented")).not.toBeNull();
    expect(probe.mounts).toBe(1);
  });
  it("remounts progress when accounts change and waits for account discovery", async () => {
    authProbe.loading = true;
    await act(async () => root.render(<PlayerWorkspace />));
    expect(host.textContent).toContain("Checking your account");
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
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
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
    expect(restored.activeDate).toBe(original.activeDate);
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
  it("switches and syncs themes without replacing Earth or changing its current selection and view", async () => {
    history.replaceState(null, "", "/explore");
    await mount();
    await act(async () => probe.props!.onSelect(member("wurl:CAN")));
    const earth = host.querySelector("canvas");
    const focusCount = probe.focus.length;
    const states = probe.props!.states;
    const motion = probe.props!.motion;
    await click("Open menu");
    const menuTrigger =
      host.querySelector<HTMLButtonElement>(".app-menu-toggle")!;
    await act(async () => menuTrigger.focus());
    const paper = host.querySelector<HTMLInputElement>(
      'input[name="app-theme"][value="paper"]',
    )!;
    const choice = paper.closest<HTMLLabelElement>("label")!;
    // A pointer press on the visible label can blur the trigger before the
    // label's default click forwards activation to its hidden radio input.
    await act(async () => {
      choice.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      menuTrigger.blur();
    });
    expect(choice.isConnected).toBe(true);
    await act(async () => choice.click());
    expect(readTheme()).toBe("paper");
    expect(document.documentElement.dataset.theme).toBe("paper");
    expect(probe.props!.palette).toBe("paper");
    expect(probe.props!.states).toEqual(states);
    expect(probe.props!.motion).toBe(motion);
    expect(probe.focus).toHaveLength(focusCount);
    expect(host.querySelector("canvas")).toBe(earth);
    expect(probe.mounts).toBe(1);
    await act(async () => paper.focus());
    expect(host.querySelector(".app-menu-content")).not.toBeNull();
    await act(async () =>
      host.querySelector<HTMLButtonElement>(".experience-logo")!.focus(),
    );
    expect(host.querySelector(".app-menu-content")).toBeNull();
    localStorage.setItem(
      THEME_KEY,
      JSON.stringify({ version: 1, theme: "dusk" }),
    );
    await act(async () =>
      dispatchEvent(new StorageEvent("storage", { key: THEME_KEY })),
    );
    expect(probe.props!.palette).toBe("dusk");
    await click("Home");
    expect(probe.props!.palette).toBe("dusk");
    expect(probe.mounts).toBe(1);
  });

  it.each(
    (["finished", "failed"] as const).flatMap((phase) =>
      [true, false].map((admin) => ({ phase, admin })),
    ),
  )(
    "restricts $phase daily Journey replay to admins (admin: $admin)",
    async ({ phase, admin }) => {
      authProbe.admin = admin;
      const date = "2026-10-06";
      const save = createDailySave(journeyRegistry.JOURNEY_INDEX);
      const progress = openDaily(
        save.load(),
        date,
        false,
        journeyRegistry.JOURNEY_INDEX,
      );
      const attempt = progress.attempts[date];
      save.save({
        ...progress,
        attempts: {
          [date]: {
            ...attempt,
            game: {
              ...attempt.game,
              phase,
              roundIndex: 4,
              answers: journeyRegistry.JOURNEY_INDEX.find(
                (journey) => journey.id === attempt.journeyId,
              )!.rounds.map((round) => ({
                roundId: round.id,
                correct: true,
                selectedIds: [],
                text: "",
                ordered: [],
              })),
            },
          },
        },
      });
      history.replaceState(null, "", "/daily");
      await mount();
      if (phase === "finished")
        expect(host.textContent).not.toContain("JOURNEY COMPLETE");
      await click("Open menu");
      expect(host.querySelector(".app-menu-caption")).toBeNull();
      await click("Close menu");
      if (!admin) {
        expect(host.querySelector(".journey-replay")).toBeNull();
        expect(host.querySelector(".journey-receipt")).not.toBeNull();
        expect(save.load().attempts[date].runId).toBe(attempt.runId);
        return;
      }
      await click("Play again");
      const replay = createDailySave(journeyRegistry.JOURNEY_INDEX).load()
        .attempts[date];
      expect(replay.runId).not.toBe(attempt.runId);
      expect(replay.journeyId).toBe(attempt.journeyId);
      expect(replay.game).toMatchObject({
        phase: "playing",
        roundIndex: 0,
        answers: [],
      });
      await act(async () => root.unmount());
      root = createRoot(host);
      await mount();
      expect(
        host.querySelector(".mode-incoming .question-card"),
      ).not.toBeNull();
      expect(
        createDailySave(journeyRegistry.JOURNEY_INDEX).load().attempts[date]
          .runId,
      ).toBe(replay.runId);
    },
  );
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

  it("fits the mobile Explore tray to changing content while keeping the globe and enlargement control", async () => {
    let contentHeight = 196;
    const bounds = HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        if (!this.matches(".explore-card")) return bounds.call(this);
        return { ...bounds.call(this), height: contentHeight } as DOMRect;
      },
    );
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === MOBILE_LAYOUT_QUERY,
      addEventListener() {},
      removeEventListener() {},
    }));
    await mount();
    expect(probe.props!.visualScale).toBe(1.2);
    const tray = host.querySelector(".mode-incoming");
    const mapTools = host.querySelector(".mobile-map-tools");
    await click("Explore");
    expect(host.querySelector(".mode-incoming")).toBe(tray);
    expect(host.querySelector(".mobile-map-tools")).toBe(mapTools);
    const experience = host.querySelector<HTMLElement>(".experience")!;
    expect(experience.style.getPropertyValue("--explore-content-height")).toBe(
      "196px",
    );
    expect(probe.props!.visualScale).toBe(1);
    const enlargement = [
      ...host.querySelectorAll<HTMLButtonElement>("button"),
    ].find((button) => button.textContent?.trim() === "Enlarge globe")!;
    expect(enlargement.getAttribute("aria-expanded")).toBe("false");
    expect(host.querySelector(".mode-incoming")!.hasAttribute("inert")).toBe(
      false,
    );
    const observer = panelObservers.find((item) =>
      item.element?.matches(".explore-card"),
    )!;
    contentHeight = 480;
    await act(async () => observer.resize());
    expect(experience.style.getPropertyValue("--explore-content-height")).toBe(
      "480px",
    );
    await act(async () => enlargement.click());
    expect(enlargement.getAttribute("aria-expanded")).toBe("true");
    await act(async () => enlargement.click());
    expect(enlargement.textContent?.trim()).toBe("Enlarge globe");
    expect(host.querySelector(".explore-card")).not.toBeNull();
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
  });

  it("restores a saved theme at startup", async () => {
    localStorage.setItem(
      THEME_KEY,
      JSON.stringify({ version: 1, theme: "ocean" }),
    );
    await mount();
    expect(probe.props!.palette).toBe("ocean");
    expect(document.documentElement.dataset.theme).toBe("ocean");
  });

  it.each([false, true])(
    "tours finished Journey answers and stops on navigation (reduced motion: %s)",
    async (reduced) => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(2026, 9, 6, 12));
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches: reduced && query === "(prefers-reduced-motion: reduce)",
        addEventListener() {},
        removeEventListener() {},
      }));
      const date = "2026-10-06";
      localStorage.setItem(
        DAILY_KEY,
        JSON.stringify({
          version: 1,
          activeDate: date,
          attempts: {
            [date]: {
              date,
              journeyId: FIFTEENTH_JOURNEY.id,
              scheduleVersion: 1,
              game: {
                ...initialGame,
                phase: "finished",
                roundIndex: 4,
                answers: FIFTEENTH_JOURNEY.rounds.map((round) => ({
                  roundId: round.id,
                  correct: true,
                  selectedIds: [],
                  text: "",
                  ordered: [],
                  pin: { lat: 0, lng: 0 },
                })),
              },
            },
          },
        }),
      );
      history.replaceState(null, "", "/daily");
      await mount();
      expect(
        [...host.querySelectorAll(".finish-actions button")].map(
          (button) => button.textContent,
        ),
      ).toEqual(["Home", "Study"]);
      expect(host.textContent).not.toContain(
        "The same Journey, with a fresh start.",
      );
      const countries = ["FIN", "PRK", "MNG", "GEO", "EST"];
      if (reduced) {
        expect(probe.tours).toHaveLength(0);
        expect(probe.focus.at(-1)).toMatchObject({
          lat: member("wurl:FIN").focus.lat,
          lng: member("wurl:FIN").focus.lng,
        });
        await click("Study");
        expect(location.pathname).toBe("/study");
        expect(
          host.querySelector('.mode-incoming [aria-label="Study setup"]'),
        ).not.toBeNull();
      } else {
        expect(probe.tours).toHaveLength(1);
        expect(probe.tours[0].map(({ lat, lng }) => ({ lat, lng }))).toEqual(
          countries.map((code) => ({
            lat: member(`wurl:${code}`).focus.lat,
            lng: member(`wurl:${code}`).focus.lng,
          })),
        );
        const before = probe.tourCancellations;
        await click("Home");
        expect(probe.tourCancellations).toBeGreaterThan(before);
        expect(probe.tours).toHaveLength(1);
      }
    },
  );

  it("selects Study countries through Earth and previews each hint independently", async () => {
    history.replaceState(null, "", "/study");
    await mount();
    await click("Custom");
    expect(host.querySelector(".page-layout .study-editor")).toBeNull();
    expect(probe.props!.active).toBe(true);
    await act(async () => probe.props!.onSelect(member("wurl:BRA")));
    expect(probe.props!.states["wurl:BRA"]).toBe("selected");
    expect(probe.props!.selectDisabled).toBe(true);
    await act(async () => probe.props!.onSelect(member("wurl:CAN")));
    expect(probe.props!.states["wurl:CAN"]).toBe("selected");
    await act(async () => probe.props!.onSelect(member("wurl:BRA")));
    expect(probe.props!.states["wurl:BRA"]).toBe("disabled");
    expect(probe.focus.at(-1)).toMatchObject({
      lat: member("wurl:CAN").focus.lat,
      lng: member("wurl:CAN").focus.lng,
    });
    const saved = savedStudy().settings;
    expect(saved.scope).toBe("custom");
    expect(saved.countryIds).toEqual(["wurl:CAN"]);
    await act(async () =>
      host.querySelector<HTMLElement>(".study-advanced > summary")!.click(),
    );
    const toggle = async (name: string) =>
      act(async () => {
        const label = [
          ...host.querySelectorAll<HTMLLabelElement>("label"),
        ].find((element) => element.textContent?.trim() === name)!;
        label.querySelector<HTMLInputElement>("input")!.click();
      });
    await toggle("Country borders");
    expect(probe.props!.showBorders).toBe(false);
    await toggle("Country names");
    expect(probe.props!.regionNames).toBe("committed");
    expect(probe.props!.namedRegionIds).toEqual(["wurl:CAN"]);
    expect(probe.props!.borderRegionIds).toEqual([]);
    expect(regionBorderVisible(member("wurl:CAN"), probe.props!)).toBe(false);
    await toggle("Country borders");
    expect(regionBorderVisible(member("wurl:CAN"), probe.props!)).toBe(true);
    expect(probe.props!.places.map((p) => p.name)).toEqual(["Canada"]);
    expect(probe.props!.places[0].markerHidden).toBe(true);
    expect(probe.props!.placeMarkers).toBe(false);
    expect(probe.props!.placeLabels).toBe(true);
    await toggle("Capital markers");
    expect(probe.props!.placeMarkers).toBe(true);
    expect(
      probe.props!.places.find((p) => p.kind === "capital")?.labelHidden,
    ).toBe(true);
    await toggle("Capital names");
    expect(
      probe.props!.places.find((p) => p.kind === "capital")?.labelHidden,
    ).toBe(false);
    await toggle("Country names");
    expect(probe.props!.places.some((p) => p.markerHidden)).toBe(false);
    expect(probe.props!.regionNames).toBe("none");
  });
  it("hides the globe only in the mobile Study builder and leaves its orbit alone while settings change", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === MOBILE_LAYOUT_QUERY,
      addEventListener() {},
      removeEventListener() {},
    }));
    history.replaceState(null, "", "/study");
    await mount();
    await click("Custom");
    const where = [...host.querySelectorAll<HTMLLabelElement>("label")].find(
      (label) => label.textContent === "Where",
    )!.control as HTMLSelectElement;
    await act(async () => {
      where.value = "continent";
      where.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const pool = studyPool({
      ...defaultSettings,
      scope: "continent",
      continent: "AF",
    });
    for (const id of pool) expect(probe.props!.states[id]).toBe("selectable");
    expect(probe.props!.states["wurl:CAN"]).toBe("disabled");
    expect(
      host.querySelector(".experience")?.hasAttribute("data-panel-only"),
    ).toBe(true);
    expect(host.querySelector("#mobile-map")?.hasAttribute("inert")).toBe(true);
    expect(probe.focus).toHaveLength(0);
    const flights = probe.focus.length;
    await act(async () =>
      host.querySelector<HTMLElement>(".study-advanced > summary")!.click(),
    );
    await act(async () => {
      const label = [...host.querySelectorAll<HTMLLabelElement>("label")].find(
        (element) => element.textContent?.trim() === "Country borders",
      )!;
      label.querySelector<HTMLInputElement>("input")!.click();
    });
    expect(probe.focus).toHaveLength(flights);
    await act(async () => {
      where.value = "all";
      where.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(probe.focus).toHaveLength(flights);
    for (const id of studyPool(defaultSettings))
      expect(probe.props!.states[id]).toBe("selectable");
    await click("Back to paths");
    expect(host.querySelector(".experience.page-layout")).toBeNull();
    expect(probe.props!.states["wurl:EGY"]).toBe("disabled");
    expect(
      host.querySelector(".experience")?.hasAttribute("data-panel-only"),
    ).toBe(false);
  });
  it.each([false, true])(
    "leaves the Study builder without flashing the overview (mobile: %s)",
    async (mobile) => {
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches: mobile && query === MOBILE_LAYOUT_QUERY,
        addEventListener() {},
        removeEventListener() {},
      }));
      history.replaceState(null, "", "/study");
      await mount();
      await click("Custom");
      expect(host.querySelector(".study-editor")).not.toBeNull();
      await click("Home");
      expect(host.querySelector(".home-menu")).not.toBeNull();
      expect(host.querySelector(".study-landing")).toBeNull();
      expect(host.querySelector(".mode-outgoing")).toBeNull();
      expect(probe.mounts).toBe(1);
    },
  );
  it("opens Admin on mobile without replacing Earth or losing the current attempt", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === MOBILE_LAYOUT_QUERY,
      addEventListener() {},
      removeEventListener() {},
    }));
    await mount();
    await click("Play");
    const earth = host.querySelector("canvas");
    const attempts = JSON.parse(localStorage.getItem(DAILY_KEY)!).attempts;
    await click("Admin");
    expect(host.querySelector(".mode-incoming .admin-panel")).not.toBeNull();
    expect(location.pathname).toBe("/admin");
    expect(
      host.querySelector(".page-layout .admin-content .admin-panel"),
    ).not.toBeNull();
    expect(probe.props!.active).toBe(false);
    expect(host.querySelector("canvas")).toBe(earth);
    expect(JSON.parse(localStorage.getItem(DAILY_KEY)!).attempts).toEqual(
      attempts,
    );
    await click("Journey");
    await settleLoads();
    expect(probe.props!.active).toBe(true);
    expect(host.querySelector(".mode-incoming .question-card")).not.toBeNull();
    expect(host.querySelector("canvas")).toBe(earth);
    expect(probe.mounts).toBe(1);
  });
  it("keeps the mobile Earth mounted, preserves an enlarged pin preview, and returns to feedback after a map answer", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === MOBILE_LAYOUT_QUERY,
      addEventListener() {},
      removeEventListener() {},
    }));
    const date = "2026-10-06";
    localStorage.setItem(
      DAILY_KEY,
      JSON.stringify({
        version: 1,
        activeDate: date,
        attempts: {
          [date]: {
            date,
            journeyId: EIGHTH_JOURNEY.id,
            scheduleVersion: 1,
            game: { ...initialGame, phase: "playing" },
          },
        },
      }),
    );
    history.replaceState(null, "", "/daily");
    await mount();
    const earth = host.querySelector("canvas");
    await click("Enlarge globe");
    expect(host.querySelector(".mode-incoming")!.hasAttribute("inert")).toBe(
      true,
    );
    await act(async () =>
      probe.props!.onCoordinateTap!({ lat: -12.04318, lng: -77.02824 }),
    );
    expect(
      host.querySelector("main")!.classList.contains("globe-expanded"),
    ).toBe(true);
    expect(host.querySelector(".mobile-map-prompt")!.textContent).toContain(
      "Pin placed",
    );
    await click("Show question");
    await click("Submit pin");
    await click("Next");
    await click("Enlarge globe");
    await act(async () =>
      probe.props!.onPlace(
        probe.props!.places.find((p) => p.id === "place:2988507")!,
      ),
    );
    expect(
      host.querySelector("main")!.classList.contains("globe-expanded"),
    ).toBe(false);
    expect(host.querySelector(".mode-incoming")!.hasAttribute("inert")).toBe(
      false,
    );
    expect(host.querySelector(".round-feedback")!.textContent).toContain(
      "Paris",
    );
    await click("Explore");
    await settleLoads();
    expect(host.querySelector(".explore-card")).not.toBeNull();
    await click("Study");
    await settleLoads();
    expect(host.querySelector(".study-paths")).not.toBeNull();
    await click("Custom");
    expect(
      host.querySelector<HTMLDetailsElement>(".study-advanced")!.open,
    ).toBe(false);
    await click("Start studying");
    const prompt = host.querySelector(".study-question h1")!.textContent;
    await click("Enlarge globe");
    expect(host.querySelector(".mobile-map-prompt")!.textContent).toBe(prompt);
    const target = savedStudy().settings;
    expect(target.topics).toContain("countries");
    await act(async () => probe.props!.onSelect(member("wurl:FRA")));
    expect(
      host.querySelector("main")!.classList.contains("globe-expanded"),
    ).toBe(false);
    expect(host.querySelector(".mode-incoming .round-feedback")).not.toBeNull();
    expect(host.querySelector("canvas")).toBe(earth);
    expect(probe.mounts).toBe(1);
  });
  it.each([
    ["wurl:RUS", "Kalmyk", "Mansi"],
    ["wurl:MOZ", "Portuguese (Mozambique)", "Makhuwa"],
  ])(
    "shows readable language names for %s in Explore",
    async (id, first, second) => {
      history.replaceState(null, "", "/explore");
      await mount();
      await act(async () => probe.props!.onSelect(member(id)));
      const label = [...host.querySelectorAll(".mode-incoming dt")].find(
        (dt) => dt.textContent === "Languages",
      )!;
      expect(label.nextElementSibling!.textContent).toContain(first);
      expect(label.nextElementSibling!.textContent).toContain(second);
      expect(label.nextElementSibling!.textContent).not.toMatch(
        /\b(xal|vmw|mns)\b/,
      );
    },
  );
  it("defers Journey warming until idle and retries a failed load without replacing Earth", async () => {
    const loader = vi.spyOn(journeyRegistry, "loadJourney");
    await mount();
    expect(loader).not.toHaveBeenCalled();
    const canvas = host.querySelector("canvas");
    loader.mockRejectedValueOnce(Error("offline"));
    await click("Play");
    expect(host.textContent).toContain("The Journey could not be loaded.");
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
  it("places editable pins on the shared globe and commits city markers without country answers", async () => {
    const date = "2026-10-06";
    localStorage.setItem(
      DAILY_KEY,
      JSON.stringify({
        version: 1,
        activeDate: date,
        attempts: {
          [date]: {
            date,
            journeyId: EIGHTH_JOURNEY.id,
            scheduleVersion: 1,
            game: { ...initialGame, phase: "playing" },
          },
        },
      }),
    );
    history.replaceState(null, "", "/daily");
    await mount();
    expect(probe.props!.onCoordinateTap).toBeTypeOf("function");
    expect(probe.props!.places).toEqual([]);
    expect(probe.props!.showBorders).toBe(false);
    await act(async () =>
      probe.props!.onCoordinateTap!({ lat: -12.04318, lng: -77.02824 }),
    );
    expect(probe.props!.places).toHaveLength(1);
    expect(probe.props!.places[0]).toMatchObject({
      kind: "pin",
      visualState: "selected",
    });
    expect(
      JSON.parse(localStorage.getItem(DAILY_KEY)!).attempts[date].game.pin,
    ).toEqual({ lat: -12.04318, lng: -77.02824 });
    await click("Submit pin");
    expect(host.textContent).toContain("Less than 1 km from Lima");
    expect(probe.props!.places).toHaveLength(2);
    await click("Next");
    expect(probe.props!.placeInteraction).toBe(true);
    expect(probe.props!.regionInteraction).toBe(false);
    expect(probe.props!.onCoordinateTap).toBeUndefined();
    expect(probe.props!.places).toHaveLength(6);
    expect(probe.props!.places.every((p) => !p.name && !p.hoverName)).toBe(
      true,
    );
    expect(host.querySelector("#country-guess")).toBeNull(); // find-city prompts require location recall
    await act(async () => probe.props!.onSelect(member("wurl:FRA")));
    expect(host.querySelector(".round-feedback")).toBeNull();
    await act(async () =>
      probe.props!.onPlace(
        probe.props!.places.find((p) => p.id === "place:2988507")!,
      ),
    );
    expect(host.querySelector(".round-feedback")!.textContent).toContain(
      "Your answer: Paris",
    );
    expect(
      probe.props!.places.find((p) => p.id === "place:2988507")!.visualState,
    ).toBe("correct");
    await click("Next");
    expect(probe.props!.places).toEqual([]);
    expect(probe.props!.showBorders).toBe(false);
    expect(probe.props!.regions.some((r) => r.id === "wurl:USA-NM")).toBe(
      false,
    );
    await act(async () =>
      probe.props!.onCoordinateTap!({ lat: 34, lng: -106 }),
    );
    await click("Submit pin");
    expect(host.querySelector(".round-feedback")!.textContent).toContain(
      "inside New Mexico",
    );
    expect(probe.props!.states["wurl:USA-NM"]).toBe("correct");
    expect(probe.mounts).toBe(1);
  });
  it("keeps Antarctica on its cached country surface without exposing or fetching placeholder regions", async () => {
    await mount();
    await click("Explore");
    const original = probe.renders.at(-1)!.find((r) => r.id === "wurl:ATA");
    await act(async () => probe.props!.onSelect(member("wurl:ATA")));
    const panel = host.querySelector(".mode-incoming .explore-card")!;
    expect(panel.querySelector("h1")?.textContent).toBe("Antarctica");
    expect(panel.querySelector(".regional-toggle")).toBeNull();
    expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).not.toContain(
      "/geography/ata-adm1.v1.json",
    );
    expect(probe.renders.at(-1)!.find((r) => r.id === "wurl:ATA")).toBe(
      original,
    );
    expect(probe.mounts).toBe(1);
  });
  it("makes Journey 6 playable through Admin with its first typing-only question", async () => {
    await mount();
    await click("Admin");
    const select = host.querySelector<HTMLSelectElement>(
      ".mode-incoming select",
    )!;
    expect(
      [...select.options].find((o) => o.value === SIXTH_JOURNEY.id)
        ?.textContent,
    ).toContain("Journey 6");
    await act(async () => {
      select.value = SIXTH_JOURNEY.id;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await click("Set today’s Journey");
    await click("Home");
    await click("Play");
    expect(host.textContent).toContain(SIXTH_JOURNEY.rounds[0].prompt);
    expect(probe.props!.regionNames).toBe("none");
    expect(probe.props!.states["wurl:LSO"]).toBe("hinted");
    expect(probe.mounts).toBe(1);
  });
  it("opens Journey 7 through Admin with hidden labels and no renderer replacement", async () => {
    await mount();
    await click("Admin");
    const select = host.querySelector<HTMLSelectElement>(
      ".mode-incoming select",
    )!;
    expect(
      [...select.options].find((o) => o.value === SEVENTH_JOURNEY.id)
        ?.textContent,
    ).toContain("Journey 7");
    await act(async () => {
      select.value = SEVENTH_JOURNEY.id;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await click("Set today’s Journey");
    await click("Home");
    await click("Play");
    expect(host.textContent).toContain(SEVENTH_JOURNEY.rounds[0].prompt);
    expect(probe.props!.states["wurl:NZL"]).toBe("selectable");
    expect(probe.props!.states["wurl:NLD-ZE"]).toBe("hinted");
    expect(probe.props!.regionNames).toBe("none");
    expect(probe.mounts).toBe(1);
  });
  it("accepts a Mexico globe tap without exposing Nuevo León until the answer is committed", async () => {
    const date = "2026-10-06";
    localStorage.setItem(
      DAILY_KEY,
      JSON.stringify({
        version: 1,
        activeDate: date,
        attempts: {
          [date]: {
            date,
            journeyId: SEVENTH_JOURNEY.id,
            scheduleVersion: 1,
            game: { ...initialGame, phase: "playing", roundIndex: 4 },
          },
        },
      }),
    );
    history.replaceState(null, "", "/daily");
    await mount();
    expect(probe.props!.regions.some((r) => r.id === "wurl:MEX-NLE")).toBe(
      false,
    );
    expect(probe.props!.states["wurl:MEX"]).toBe("selectable");
    expect(probe.props!.regionNames).toBe("none");
    await act(async () => probe.props!.onSelect(member("wurl:MEX")));
    expect(host.textContent).toContain("Well spotted.");
    expect(probe.props!.regions.some((r) => r.id === "wurl:MEX-NLE")).toBe(
      true,
    );
    expect(probe.props!.states["wurl:MEX-NLE"]).toBe("correct");
  });
  it("shows selected state names and hover names in the New England question", async () => {
    const date = "2026-10-06";
    localStorage.setItem(
      DAILY_KEY,
      JSON.stringify({
        version: 1,
        activeDate: date,
        attempts: {
          [date]: {
            date,
            journeyId: SEVENTH_JOURNEY.id,
            scheduleVersion: 1,
            game: { ...initialGame, phase: "playing", roundIndex: 2 },
          },
        },
      }),
    );
    history.replaceState(null, "", "/daily");
    await mount();
    expect(probe.props!.regionNames).toBe("all");
    const maine = probe.props!.regions.find((r) => r.id === "wurl:USA-ME")!;
    await act(async () => probe.props!.onSelect(maine));
    expect(host.querySelector(".committed-choices")!.textContent).toContain(
      "Maine",
    );
    expect(host.textContent).toContain(
      "Select the six U.S. states that make up New England.",
    );
  });
  it("prioritizes selected-country details, folds settings, and lazily loads a worldwide subdivision branch", async () => {
    await mount();
    await click("Explore");
    expect(host.querySelector(".mode-incoming .explore-controls")).toBeNull();
    await click("Globe settings");
    const popover = document.querySelector(
      '.explore-settings-popover[role="dialog"]',
    )!;
    expect(popover).not.toBeNull();
    expect(host.querySelector(".explore-card")!.contains(popover)).toBe(false);
    expect(popover.contains(document.activeElement)).toBe(true);
    await act(async () =>
      dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
    );
    expect(document.querySelector(".explore-settings-popover")).toBeNull();
    expect(document.activeElement).toBe(
      host.querySelector('.settings-button[aria-label="Globe settings"]'),
    );
    await click("Globe settings");
    const borderToggle = [
      ...document.querySelectorAll<HTMLLabelElement>(
        ".explore-settings-popover label",
      ),
    ]
      .find((label) => label.textContent?.trim() === "Country borders")!
      .querySelector<HTMLInputElement>("input")!;
    await act(async () => borderToggle.click());
    expect(probe.props!.showBorders).toBe(false);
    await act(async () => probe.props!.onSelect(member("wurl:BRA")));
    const panel = host.querySelector(".mode-incoming .explore-card")!;
    expect(panel.querySelector("h1")?.textContent).toBe("Brazil");
    expect(panel.querySelector(".explore-controls")).toBeNull();
    expect(panel.querySelector(".explore-search-field")).toBeNull();
    expect(panel.querySelector(".explore-heading .detail-flag")).not.toBeNull();
    expect(panel.textContent).not.toContain("YOUR CURRENT PLACE");
    const toggle = panel.querySelector<HTMLInputElement>(
      ".regional-toggle input",
    )!;
    await act(async () => toggle.click());
    expect(
      probe.props!.regions.filter((r) => r.parentId === "wurl:BRA"),
    ).toHaveLength(27);
    expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).toContain(
      "/geography/bra-adm1.v1.json",
    );
    expect(probe.mounts).toBe(1);
  });
  it("edits hints without replacing Earth, moving the camera, or losing a typed answer", async () => {
    const settings = {
      ...defaultSettings,
      styles: { ...defaultSettings.styles, countries: "typing" as const },
    };
    localStorage.setItem(
      STUDY_KEY,
      JSON.stringify({ ...emptyStudy, settings }),
    );
    await mount();
    await click("Study");
    await click("Custom");
    await click("Start studying");
    const earth = host.querySelector("canvas");
    const question = host.querySelector(".mode-incoming .study-question")!;
    const input = question.querySelector<HTMLInputElement>("input")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(input, "Bra");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const prompt = question.querySelector("h1")!.textContent;
    const cameraChanges = probe.focus.length;
    await click("Session settings");
    const dialog = document.querySelector<HTMLElement>(
      '[role="dialog"][aria-modal="true"]',
    )!;
    expect(dialog).not.toBeNull();
    expect(dialog.querySelector("h2")?.textContent).toBe("Session settings");
    expect(
      question
        .querySelector(".round-number")
        ?.classList.contains("journey-step"),
    ).toBe(true);
    expect(question.hasAttribute("inert")).toBe(true);
    expect(probe.focus).toHaveLength(cameraChanges);
    expect(probe.props!.regionInteraction).toBe(false);
    await act(async () => probe.props!.onSelect(member("wurl:BRA")));
    expect(question.querySelector(".round-feedback")).toBeNull();
    await click("Edit this session");
    const borders = [...dialog.querySelectorAll("label")]
      .find((label) => label.textContent === "Country borders")!
      .querySelector<HTMLInputElement>("input")!;
    await act(async () => borders.click());
    expect(probe.props!.showBorders).toBe(true);
    await click("Apply & resume");
    expect(document.querySelector(".study-options-dialog")).toBeNull();
    expect(probe.props!.showBorders).toBe(false);
    expect(probe.props!.regionInteraction).toBe(true);
    expect(input.value).toBe("Bra");
    expect(question.querySelector("h1")!.textContent).toBe(prompt);
    expect(probe.focus).toHaveLength(cameraChanges);
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      "Session settings",
    );
    expect(host.querySelector("canvas")).toBe(earth);
    expect(probe.mounts).toBe(1);
  });
  it.each([
    { correct: true, markers: false, names: false },
    { correct: false, markers: false, names: false },
    { correct: true, markers: true, names: false },
    { correct: false, markers: false, names: true },
  ])(
    "reveals the correct capital during feedback (correct=$correct, markers=$markers, names=$names) without enabling hints",
    async ({ correct, markers, names }) => {
      vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
      vi.setSystemTime(12);
      const settings = {
        ...defaultSettings,
        topics: ["capitals" as const],
        scope: "custom" as const,
        countryIds: ["wurl:COG", "wurl:GAB", "wurl:CMR"],
        styles: { ...defaultSettings.styles, capitals: "choices" as const },
        capitalMarkers: markers,
        capitalNames: names,
        countryNames: true,
        autoAdvance: false,
      };
      const session = startStudy(settings, 12);
      const capital = capitalOf(session.prompt.targetId);
      localStorage.setItem(
        STUDY_KEY,
        JSON.stringify({ ...emptyStudy, settings }),
      );
      await mount();
      await click("Study");
      await click("Custom");
      await click("Start studying");
      const input = host.querySelector<HTMLInputElement>(
        `.mode-incoming .study-choices input[value="${correct ? session.prompt.targetId : session.prompt.choices.find((id) => id !== session.prompt.targetId)}"]`,
      )!;
      expect(input).not.toBeNull();
      await act(async () => input.click());
      await click("Submit answer");
      expect(
        host.querySelector(".mode-incoming .round-feedback")?.textContent,
      ).toContain(correct ? "Well spotted." : "Not quite.");
      const revealed = probe.props!.places.find(
        (place) => place.id === capital.id,
      )!;
      expect(revealed).toMatchObject({
        name: capital.name,
        lat: capital.lat,
        lng: capital.lng,
        markerHidden: false,
        labelHidden: false,
      });
      expect(probe.props!.placeMarkers).toBe(true);
      expect(probe.props!.placeLabels).toBe(true);
      for (const other of probe.props!.places.filter(
        (place) => place.kind === "capital" && place.id !== capital.id,
      )) {
        expect(other.markerHidden).toBe(!markers);
        expect(other.labelHidden).toBe(!names);
        expect(revealed.priority!).toBeGreaterThan(other.priority ?? 0);
      }
      expect(savedStudy().settings).toMatchObject({
        capitalMarkers: markers,
        capitalNames: names,
      });
      await click("Next");
      expect(probe.props!.placeMarkers).toBe(markers);
      expect(
        probe
          .props!.places.filter((place) => place.kind === "capital")
          .every(
            (place) =>
              place.labelHidden === !names && place.markerHidden === !markers,
          ),
      ).toBe(true);
      expect(probe.props!.places.some((place) => place.priority === 1000)).toBe(
        false,
      );
    },
  );
  it("resumes Journey 5 with five typing-only fields and reveals the state route after submission", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(new Date(2026, 9, 5, 12));
    const date = "2026-10-05";
    localStorage.setItem(
      DAILY_KEY,
      JSON.stringify({
        version: 1,
        activeDate: date,
        overrides: { [date]: FIFTH_JOURNEY.id },
        attempts: {
          [date]: {
            date,
            journeyId: FIFTH_JOURNEY.id,
            scheduleVersion: 1,
            game: { ...initialGame, phase: "playing", roundIndex: 2 },
          },
        },
      }),
    );
    await mount();
    await click("Resume");
    expect(host.textContent).toContain(
      "Name five U.S. states that border Canada",
    );
    expect(probe.props!.showBorders).toBe(false);
    expect(probe.props!.regionNames).toBe("none");
    expect(probe.props!.places).toHaveLength(0);
    const fields = [
      ...host.querySelectorAll<HTMLInputElement>(
        ".mode-incoming .answer-form input",
      ),
    ];
    expect(fields).toHaveLength(5);
    const enter = async (field: HTMLInputElement, value: string) =>
      act(async () => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )!.set!.call(field, value);
        field.dispatchEvent(new Event("input", { bubbles: true }));
      });
    for (const [i, value] of [
      "Maine",
      "NY",
      "Ohio",
      "Washington",
      "Alaska",
    ].entries())
      await enter(fields[i], value);
    await act(async () =>
      probe.props!.onSelect(
        probe.props!.regions.find((r) => r.id === "wurl:USA-CA")!,
      ),
    );
    expect(fields.map((f) => f.value)).toEqual([
      "Maine",
      "NY",
      "Ohio",
      "Washington",
      "Alaska",
    ]);
    await click("Submit answer");
    expect(host.textContent).toContain("Nicely remembered.");
    expect(probe.props!.states["wurl:USA-ME"]).toBe("correct");
    const next = [...host.querySelectorAll<HTMLButtonElement>("button")].find(
      (b) => !b.closest("[inert]") && b.textContent?.includes("Next"),
    )!;
    await act(async () => next.click());
    expect(host.textContent).toContain(
      "fewest number of state border crossings",
    );
    expect(probe.props!.showBorders).toBe(false);
    await enter(
      host.querySelector<HTMLInputElement>(
        ".mode-incoming .answer-form input",
      )!,
      "4",
    );
    await click("Submit answer");
    expect(probe.props!.showBorders).toBe(true);
    expect(host.textContent).toContain(
      "California → Arizona → New Mexico → Oklahoma → Missouri",
    );
    await click("Admin");
    expect(host.textContent).toContain("Journey 5 is active.");
    expect(
      host.querySelector('option[value="north-america-v1"]'),
    ).not.toBeNull();
    expect(probe.mounts).toBe(1);
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
    await openPlayground();
    expect(probe.mounts).toBe(1);
    expect(host.querySelector("canvas")).toBe(canvas);
    expect(vi.mocked(fetch).mock.calls.map((c) => c[0])).toEqual([
      "/geography/manifest.json",
      "/geography/world.v1.json",
    ]);
    for (const rendered of probe.renders.filter((r) => r.length === 242))
      expect(rendered).toBe(first);
    expect(host.querySelectorAll(".mode-outgoing").length).toBeLessThanOrEqual(
      1,
    );
    expect(host.querySelector(".mode-outgoing")?.hasAttribute("inert")).toBe(
      true,
    );
    await act(async () => vi.advanceTimersByTime(1000));
    expect(host.querySelector(".mode-outgoing")).toBeNull();
    expect(host.querySelector("canvas")).toBe(canvas);
  });
  it("automatically frames Explore country taps while water entry preserves the orbit", async () => {
    await mount();
    const before = probe.focus.length;
    await act(async () => probe.props!.onSurfaceTap!(member("wurl:CAN")));
    expect(location.pathname).toBe("/explore");
    expect(host.textContent).toContain("Ottawa");
    expect(probe.focus).toHaveLength(before + 1);
    expect(probe.focus.at(-1)).toEqual(member("wurl:CAN").focus);
    expect(probe.props!.motion).toBe(false);
    await act(async () => probe.props!.onSelect(member("wurl:JPN")));
    expect(host.textContent).toContain("Tokyo");
    expect(probe.focus).toHaveLength(before + 2);
    expect(probe.focus.at(-1)).toEqual(member("wurl:JPN").focus);
    await click("Zoom to country");
    expect(probe.focus.length).toBe(before + 3);
    await click("Home");
    const onHome = probe.focus.length;
    await act(async () => probe.props!.onSurfaceTap!());
    expect(location.pathname).toBe("/explore");
    expect(probe.focus).toHaveLength(onHome);
    expect(probe.props!.motion).toBe(true);
  });
  it("does not overwrite an existing custom daily attempt when its local library cannot be loaded", async () => {
    const saved = {
      version: 1,
      activeDate: "2026-10-05",
      attempts: {
        "2026-10-05": {
          date: "2026-10-05",
          journeyId: "studio:published:unavailable",
          scheduleVersion: 1,
          game: { ...initialGame, phase: "playing" },
        },
      },
    };
    localStorage.setItem(DAILY_KEY, JSON.stringify(saved));
    await mount();
    await click("Play");
    expect(JSON.parse(localStorage.getItem(DAILY_KEY)!)).toEqual(saved);
    expect(host.textContent).toContain("won’t be saved after this visit");
  });
  it("loads a versioned physical snapshot once and keeps the globe through toggles", async () => {
    await mount();
    await click("Explore");
    await click("Globe settings");
    const toggle = [...document.querySelectorAll("label")]
      .find((l) => l.textContent === "Rivers")!
      .querySelector("input")!;
    await act(async () => toggle.click());
    const calls = vi
      .mocked(fetch)
      .mock.calls.map((c) => String(c[0]))
      .filter((url) => url.startsWith("/geography/physical.v1.json"));
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatch(/\?v=[a-f0-9]{16}$/);
    await act(async () => toggle.click());
    await act(async () => toggle.click());
    expect(probe.mounts).toBe(1);
    expect(
      vi
        .mocked(fetch)
        .mock.calls.filter((c) =>
          String(c[0]).startsWith("/geography/physical.v1.json"),
        ),
    ).toHaveLength(1);
  });
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
    expect(probe.props!.physicalFeatures).toBeUndefined();
    expect(probe.props!.places.length).toBeLessThan(10);
    await click("Home");
    await act(async () => root.unmount());
    root = createRoot(host);
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
  it("defaults capitals on and lazily loads only an enabled regional branch while preserving Earth", async () => {
    await mount();
    const canvas = host.querySelector("canvas");
    await click("Explore");
    expect(probe.props!.places.some((p) => p.kind === "capital")).toBe(true);
    await act(async () => probe.props!.onSelect(member("wurl:CAN")));
    const toggle = [...document.querySelectorAll("label")]
      .find((l) => l.textContent === "Provinces & territories")!
      .querySelector("input")!;
    await act(async () => toggle.click());
    expect(
      probe.props!.regions.filter((r) => r.parentId === "wurl:CAN"),
    ).toHaveLength(13);
    expect(
      probe.props!.regions.find((r) => r.id === "wurl:CAN")?.displayBase,
    ).toBe(true);
    expect(probe.mounts).toBe(1);
    expect(host.querySelector("canvas")).toBe(canvas);
    expect(probe.props!.states["wurl:CAN"]).toBe("selected");
    const ontario = probe.props!.regions.find((r) => r.id === "wurl:CAN-ON")!;
    await act(async () => probe.props!.onSelect(ontario));
    expect(probe.props!.states["wurl:CAN"]).toBe("disabled");
    expect(probe.props!.states["wurl:CAN-ON"]).toBe("selected");
    expect(probe.props!.states["wurl:CAN-MB"]).toBe("disabled");
    expect(probe.focus.at(-1)).toEqual(ontario.focus);
    expect(host.textContent).toContain("Ontario");
    await act(async () => probe.props!.onSelect(member("wurl:CAN")));
    expect(probe.props!.states["wurl:CAN"]).toBe("selected");
    expect(probe.props!.states["wurl:CAN-MB"]).toBe("selected");
    await click("Home");
    expect(probe.props!.regions).toHaveLength(242);
  });
  it("clears subdivisions when changing countries, including returning from Home, and ignores stale region taps", async () => {
    await mount();
    await click("Explore");
    await act(async () => probe.props!.onSelect(member("wurl:CAN")));
    const toggle = host.querySelector<HTMLInputElement>(
      ".regional-toggle input",
    )!;
    await act(async () => toggle.click());
    const ontario = probe.props!.regions.find((r) => r.id === "wurl:CAN-ON")!;
    await act(async () => probe.props!.onSelect(ontario));
    expect(host.querySelector(".region-detail")?.textContent).toContain(
      "Ontario",
    );
    await act(async () => probe.props!.onSelect(member("wurl:RUS")));
    expect(host.querySelector(".explore-heading h1")?.textContent).toBe(
      "Russia",
    );
    expect(host.querySelector(".region-detail")).toBeNull();
    expect(probe.props!.states["wurl:RUS"]).toBe("selected");
    expect(
      host.querySelector<HTMLInputElement>(".regional-toggle input")?.checked,
    ).toBe(false);
    await act(async () => probe.props!.onSelect(ontario));
    expect(host.querySelector(".explore-heading h1")?.textContent).toBe(
      "Russia",
    );
    await click("Home");
    await act(async () => probe.props!.onSurfaceTap?.(member("wurl:UZB")));
    expect(host.querySelector(".explore-heading h1")?.textContent).toBe(
      "Uzbekistan",
    );
    expect(host.querySelector(".region-detail")).toBeNull();
    expect(probe.props!.states["wurl:UZB"]).toBe("selected");
  });
  it("frames small Explore countries from search and can refocus the same selection", async () => {
    await mount();
    await click("Explore");
    expect(document.querySelector(".explore-search-popup")).toBeNull();
    expect(host.querySelector(".explore-search-field")).toBeNull();
    await click("Search countries");
    const input = host.querySelector<HTMLInputElement>(
      ".explore-search-field input",
    )!;
    expect(document.activeElement).toBe(input);
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(input, "a");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await click("Andorra");
    expect(document.querySelector(".explore-search-popup")).toBeNull();
    expect(host.querySelector(".explore-search-field")).toBeNull();
    expect(document.activeElement).toBe(
      host.querySelector(".mode-incoming .explore-country-search-trigger"),
    );
    expect(probe.focus.at(-1)).toEqual(member("wurl:AND").focus);
    expect(probe.focus.at(-1)!.altitude).toBeLessThan(0.1);
    const count = probe.focus.length;
    await click("Search another country");
    expect(
      document.querySelector('.explore-country-search[role="dialog"]'),
    ).not.toBeNull();
    expect(host.querySelector(".explore-search-field")).toBeNull();
    expect(host.querySelector(".country-facts")?.textContent).toContain(
      "Andorra",
    );
    expect(probe.focus).toHaveLength(count);
    await act(async () =>
      dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
    );
    expect(document.querySelector(".explore-country-search")).toBeNull();
    await act(async () => probe.props!.onSelect(member("wurl:AND")));
    expect(probe.focus).toHaveLength(count + 1);
    expect(probe.focus.at(-1)).toEqual(member("wurl:AND").focus);
  });
  it("dismisses Explore search with Escape or Close and restores focus without replacing Earth", async () => {
    await mount();
    await click("Explore");
    const earth = host.querySelector("canvas");
    await click("Search countries");
    const input = host.querySelector<HTMLInputElement>(
      ".explore-search-field input",
    )!;
    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    expect(host.querySelector(".explore-search-field")).toBeNull();
    expect(document.activeElement).toBe(
      host.querySelector(".mode-incoming .explore-search-link"),
    );
    await click("Search countries");
    await click("Close search");
    expect(host.querySelector(".explore-search-field")).toBeNull();
    expect(document.activeElement).toBe(
      host.querySelector(".mode-incoming .explore-search-link"),
    );
    expect(host.querySelector("canvas")).toBe(earth);
    expect(probe.mounts).toBe(1);
  });
  it.each(["typing", "choices"] as const)(
    "frames the named country for Study capital %s prompts",
    async (style) => {
      const session = startStudy(
        {
          ...defaultSettings,
          topics: ["capitals"],
          scope: "custom",
          countryIds: ["wurl:MEX", "wurl:AND"],
          autoAdvance: false,
          styles: { ...defaultSettings.styles, capitals: style },
        },
        24,
      );
      localStorage.setItem(
        STUDY_KEY,
        JSON.stringify({ ...emptyStudy, settings: session.settings, session }),
      );
      vi.spyOn(Date, "now").mockReturnValue(24);
      await mount();
      await click("Study");
      await click("Custom");
      await click("Start new session");
      expect(probe.focus.at(-1)).toEqual(member(session.prompt.targetId).focus);
      if (style === "choices") {
        const answer = host.querySelector<HTMLInputElement>(
          `.mode-incoming input[value="${session.prompt.targetId}"]`,
        )!;
        const count = probe.focus.length;
        await act(async () => answer.click());
        expect(probe.focus).toHaveLength(count); // answering does not restart travel
        await click("Submit answer");
        await click("Next");
        const next = studyReducer(
          studyReducer(
            studyReducer(session, {
              type: "choice",
              id: session.prompt.targetId,
            }),
            { type: "submit" },
          ),
          { type: "next" },
        );
        expect(probe.focus.at(-1)).toEqual(member(next.prompt.targetId).focus);
      }
    },
  );
  it("keeps Study capital map prompts from focusing their hidden country answer", async () => {
    const session = startStudy(
      {
        ...defaultSettings,
        topics: ["capitals"],
        styles: { ...defaultSettings.styles, capitals: "map" },
      },
      24,
    );
    localStorage.setItem(
      STUDY_KEY,
      JSON.stringify({ ...emptyStudy, settings: session.settings, session }),
    );
    await mount();
    await click("Study");
    await click("Custom");
    const count = probe.focus.length;
    await click("Start new session");
    expect(probe.focus).toHaveLength(count);
  });
  it("sets the daily through Admin, preserves the globe, and resumes each selected puzzle", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(new Date(2026, 9, 5, 12));
    await mount();
    await click("Play");
    await act(async () => probe.props!.onSelect(member("wurl:NAM")));
    const canvas = host.querySelector("canvas");
    await click("Admin");
    expect(location.pathname).toBe("/admin");
    const select = host.querySelector<HTMLSelectElement>(
      ".mode-incoming select",
    )!;
    await act(async () => {
      select.value = "mediterranean-v1";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await click("Set today’s Journey");
    expect(host.textContent).toContain("Journey 4 is active.");
    expect(host.querySelector("canvas")).toBe(canvas);
    await click("Home");
    await click("Play");
    expect(host.textContent).toContain("official in parts of Spain");
    expect(
      JSON.parse(localStorage.getItem(DAILY_KEY)!).attempts["2026-10-05"]
        .journeyId,
    ).toBe("mediterranean-v1");
    await click("Admin");
    const picker = host.querySelector<HTMLSelectElement>(
      ".mode-incoming select",
    )!;
    await act(async () => {
      picker.value = "";
      picker.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await click("Set today’s Journey");
    await click("Home");
    await click("Resume");
    expect(host.textContent).toContain("Well spotted.");
    expect(
      JSON.parse(localStorage.getItem(DAILY_KEY)!).attempts["2026-10-05"].game
        .answers,
    ).toHaveLength(1);
    expect(probe.mounts).toBe(1);
  });
  it("allows six republic picks through the globe's eligibility states before submitting", async () => {
    const date = "2026-10-05";
    localStorage.setItem(
      DAILY_KEY,
      JSON.stringify({
        version: 1,
        activeDate: date,
        attempts: {
          [date]: {
            date,
            journeyId: FOURTH_JOURNEY.id,
            scheduleVersion: 1,
            game: { ...initialGame, phase: "playing", roundIndex: 3 },
          },
        },
      }),
    );
    history.replaceState(null, "", "/daily");
    await mount();
    for (const id of YUGOSLAV_REPUBLICS) {
      expect(probe.props!.states[id]).not.toBe("disabled");
      await act(async () => probe.props!.onSelect(member(id)));
      expect(probe.props!.states[id]).toBe("selected");
    }
    expect(
      JSON.parse(localStorage.getItem(DAILY_KEY)!).attempts[date].game
        .selectedIds,
    ).toHaveLength(6);
    await click("Submit answer");
    expect(host.textContent).toContain("Well spotted.");
  });
  it("offers local major cities only in Explore and keeps the canvas through layer toggles", async () => {
    await mount();
    expect(probe.props!.places).toHaveLength(0);
    const canvas = host.querySelector("canvas");
    await click("Explore");
    expect(probe.props!.placeContextual).toBe(true);
    expect(
      probe.props!.places.find((p) => p.name === "Los Angeles"),
    ).toBeDefined();
    await click("Globe settings");
    const checkbox = [
      ...document.querySelectorAll<HTMLInputElement>("input[type=checkbox]"),
    ].find((input) =>
      input.closest("label")?.textContent?.includes("Major cities"),
    )!;
    expect(checkbox.checked).toBe(true);
    await act(async () => checkbox.click());
    expect(probe.props!.places.some((p) => p.kind === "city")).toBe(false);
    expect(probe.props!.places.some((p) => p.kind === "capital")).toBe(true);
    expect(host.querySelector("canvas")).toBe(canvas);
    await click("Home");
    await click("Play");
    expect(probe.props!.placeContextual).toBe(false);
    expect(probe.props!.places.some((p) => p.kind === "city")).toBe(false);
    expect(host.querySelector("canvas")).toBe(canvas);
  });
  it("retains daily answers and partial input across home, refresh, and midnight", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(new Date(2026, 9, 5, 23, 59, 59));
    await mount();
    await click("Play");
    await act(async () => probe.props!.onSelect(member("wurl:NAM")));
    expect(host.textContent).toContain("Well spotted.");
    const saved = JSON.parse(localStorage.getItem(DAILY_KEY)!);
    expect(saved.attempts["2026-10-05"].game.answers).toHaveLength(1);
    await act(async () => vi.advanceTimersByTime(1026));
    expect(JSON.parse(localStorage.getItem(DAILY_KEY)!).activeDate).toBe(
      "2026-10-05",
    );
    await click("Home");
    expect(host.querySelector(".daily-menu h2")?.textContent).toBe(
      journeyRegistry.JOURNEY_INDEX[1].title,
    );
    expect(host.textContent).toContain("Continue 2026-10-05");
    await click("Continue 2026-10-05");
    expect(host.textContent).toContain("Well spotted.");
    await click("Next");
    expect(probe.props!.showBorders).toBe(false);
    expect(probe.props!.regionNames).toBe("none");
    await act(async () => {
      root.unmount();
      root = createRoot(host);
    });
    await mount();
    expect(location.pathname).toBe("/daily");
    expect(host.textContent).toContain(
      "What is the fewest number of international land borders you must cross from Namibia to Chad?",
    );
    expect(probe.props!.showBorders).toBe(false);
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
  it("clears Explore's prior selection and keeps the live orientation on return", async () => {
    await mount();
    await click("Explore");
    await act(async () => probe.props!.onSelect(member("wurl:CAN")));
    expect(host.textContent).toContain("Canada");
    await click("Study");
    probe.currentView = { lat: 12, lng: 112, altitude: 1.65 };
    const flights = probe.focus.length;
    await click("Explore");
    expect(probe.currentView).toEqual({ lat: 12, lng: 112, altitude: 1.65 });
    expect(probe.focus).toHaveLength(flights);
    expect(probe.props!.states["wurl:CAN"]).not.toBe("selected");
    expect(probe.props!.motion).toBe(true);
    expect(probe.mounts).toBe(1);
  });
  it("raises the panel only for mobile Study customization and restores the mounted globe on close", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === MOBILE_LAYOUT_QUERY,
      addEventListener() {},
      removeEventListener() {},
    }));
    await mount();
    await click("Study");
    await click("Custom");
    expect(
      host.querySelector(".experience")?.hasAttribute("data-panel-only"),
    ).toBe(true);
    await click("Start studying");
    expect(
      host.querySelector(".experience")?.hasAttribute("data-panel-only"),
    ).toBe(false);
    const cog = host.querySelector<HTMLButtonElement>(
      '[aria-label="Session settings"]',
    )!;
    await act(async () => cog.click());
    expect(
      host.querySelector(".experience")?.hasAttribute("data-panel-only"),
    ).toBe(false);
    const edit = [
      ...document.querySelectorAll<HTMLButtonElement>("button"),
    ].find((b) => b.textContent === "Edit this session")!;
    await act(async () => edit.click());
    expect(
      host.querySelector(".experience")?.hasAttribute("data-panel-only"),
    ).toBe(true);
    await act(async () =>
      document
        .querySelector<HTMLButtonElement>(
          '[aria-label="Close Session settings"]',
        )!
        .click(),
    );
    expect(
      host.querySelector(".experience")?.hasAttribute("data-panel-only"),
    ).toBe(false);
    expect(probe.mounts).toBe(1);
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
  it("frames a path and saves completed results for viewing and replay", async () => {
    vi.spyOn(Date, "now").mockReturnValue(24);
    await mount();
    await click("Study");
    await click("Start Discover Asia");
    expect(probe.focus.at(-1)).toMatchObject({ lat: 35, lng: 90 });
    const session = startStudy(STUDY_PATHS[0].settings, 24);
    await act(async () =>
      probe.props!.onSelect(member(session.prompt.targetId)),
    );
    const focused = probe.focus.length;
    await click("Next");
    expect(probe.focus).toHaveLength(focused);
    await click("Session settings");
    await click("Finish this session");
    const saved = savedStudy();
    expect(saved.history).toHaveLength(1);
    expect(saved.session?.phase).toBe("summary");
    expect(saved.history![0].session.history[0].correct).toBe(true);
    expect(host.querySelector(".study-summary .settings-button")).toBeNull();
    await click("Past study sessions");
    expect(host.textContent).toContain("Ended early");
    expect(
      Object.values(probe.props!.states).every((state) => state === "disabled"),
    ).toBe(true);
    expect(probe.props!.regionInteraction).toBe(false);
    expect(probe.focus.at(-1)!.altitude).toBeGreaterThanOrEqual(1.65);
    await click("Back to Study");
    expect(probe.props!.states[session.prompt.targetId]).toBe("correct");
    await click("Home");
    await click("Study");
    expect(host.querySelector(".study-paths")).not.toBeNull();
    expect(host.querySelector(".study-summary")).toBeNull();
    expect(host.textContent).not.toContain("Return to results");
    await click("Past study sessions");
    await click("1 / 1 correct");
    expect(host.querySelector(".study-summary")).not.toBeNull();
    await click("Repeat this session");
    expect(
      host.querySelector(".study-question .round-number")?.textContent,
    ).toBe("1");
    expect(savedStudy().history).toHaveLength(1);
    await click("Home");
    await act(async () => {
      root.unmount();
      root = createRoot(host);
    });
    await mount();
    await click("Study");
    await click("Past study sessions");
    expect(host.querySelectorAll(".study-history-list li")).toHaveLength(1);
    await act(async () =>
      host
        .querySelector<HTMLButtonElement>(
          '.study-history-list [aria-label^="Replay session"]',
        )!
        .click(),
    );
    expect(
      host.querySelector(".study-question .round-number")?.textContent,
    ).toBe("1");
  });
  it("merges a cross-tab result without discarding a locally queued completion", async () => {
    const settings = { ...defaultSettings, autoAdvance: false };
    localStorage.setItem(
      STUDY_KEY,
      JSON.stringify({ ...emptyStudy, settings }),
    );
    const other = createStudySave();
    await mount();
    await click("Study");
    await click("Custom");
    await click("Start studying");
    let session = startStudy(settings, 42);
    await act(async () =>
      probe.props!.onSelect(member(session.prompt.targetId)),
    );
    session = studyReducer(session, {
      type: "pick",
      id: session.prompt.targetId,
    });
    const remote = archiveStudy({
      ...other.load(),
      session: { ...session, id: "other-tab" },
    });
    await click("Session settings");
    await act(async () => {
      const finish = [
        ...document.querySelectorAll<HTMLButtonElement>(
          ".study-options-dialog button",
        ),
      ].find((b) => b.textContent?.trim() === "Finish this session")!;
      finish.click();
      other.save(remote);
      dispatchEvent(
        new StorageEvent("storage", {
          key: `${other.prefix}history.other-tab/${other.writer}`,
        }),
      );
    });
    const saved = savedStudy();
    expect(saved.history).toHaveLength(2);
    expect(saved.history?.some((record) => record.id === "other-tab")).toBe(
      true,
    );
    expect(host.querySelector(".study-summary")).not.toBeNull();
    await click("Past study sessions");
    expect(document.querySelectorAll(".study-history-list li")).toHaveLength(2);
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
  it("advances correct Study answers at 650 ms, while wrong answers wait for Next", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(12);
    let session = startStudy({ ...defaultSettings, topics: ["flags"] }, 12);
    localStorage.setItem(
      STUDY_KEY,
      JSON.stringify({ ...emptyStudy, settings: session.settings }),
    );
    await mount();
    await click("Study");
    await click("Custom");
    await click("Start studying");
    await act(async () =>
      probe.props!.onSelect(member(session.prompt.targetId)),
    );
    await click("Session settings");
    await act(async () => vi.advanceTimersByTime(1000));
    expect(
      host.querySelector(".mode-incoming .round-number")?.textContent,
    ).toBe("1");
    await act(async () =>
      dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" })),
    );
    expect(
      host.querySelector(".mode-incoming .round-number")?.textContent,
    ).toBe("1");
    await click("Close Session settings");
    await act(async () => vi.advanceTimersByTime(649));
    expect(
      host.querySelector(".mode-incoming .study-question")!.textContent,
    ).toContain("Well spotted");
    await act(async () => vi.advanceTimersByTime(1));
    session = studyReducer(
      studyReducer(session, { type: "pick", id: session.prompt.targetId }),
      { type: "next" },
    );
    expect(
      host.querySelector(".mode-incoming .study-question")!.textContent,
    ).not.toContain("Well spotted");
    const wrong = session.pool.find((id) => id !== session.prompt.targetId)!;
    await act(async () => probe.props!.onSelect(member(wrong)));
    await act(async () => vi.advanceTimersByTime(1000));
    expect(
      host.querySelector(".mode-incoming .study-question")!.textContent,
    ).toContain("Not quite");
    await click("Next");
    expect(
      host.querySelector(".mode-incoming .study-question")!.textContent,
    ).not.toContain("Not quite");
    expect(savedStudy().session?.prompt.ordinal).toBe(2);
  });
  it("requires map clicks for named-country prompts while preserving the Study orbit", async () => {
    vi.spyOn(Date, "now").mockReturnValue(24);
    let session = startStudy({ ...defaultSettings, autoAdvance: false }, 24);
    localStorage.setItem(
      STUDY_KEY,
      JSON.stringify({ ...emptyStudy, settings: session.settings }),
    );
    await mount();
    await click("Study");
    await click("Custom");
    await click("Start studying");
    const question = host.querySelector(".mode-incoming .study-question")!;
    expect(question.querySelector("input")).toBeNull();
    expect(question.textContent).not.toContain("Answer by name");
    probe.currentView = { lat: -15, lng: 133, altitude: 1.7 };
    const count = probe.focus.length;
    await act(async () =>
      probe.props!.onSelect(member(session.prompt.targetId)),
    );
    await click("Next");
    expect(probe.focus).toHaveLength(count);
    expect(probe.currentView.lng).toBe(133);
    session = studyReducer(
      studyReducer(session, { type: "pick", id: session.prompt.targetId }),
      { type: "next" },
    );
    probe.currentView = { lat: -15, lng: 133, altitude: 0.5 };
    await act(async () =>
      probe.props!.onSelect(member(session.prompt.targetId)),
    );
    await click("Next");
    expect(probe.focus).toHaveLength(count + 1);
    expect(probe.currentView.altitude).toBeGreaterThan(1.5);
  });
  it("introduces today's selected Journey with title, description and five-round progress", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 6, 12));
    const date = "2026-10-06";
    localStorage.setItem(
      DAILY_KEY,
      JSON.stringify({
        version: 1,
        attempts: {},
        archivedAttempts: {},
        overrides: { [date]: FIFTEENTH_JOURNEY.id },
      }),
    );
    await mount();
    const daily = host.querySelector(".daily-menu")!;
    expect(daily.querySelector(".daily-menu-eyebrow")?.textContent).toBe(
      "TODAY’S JOURNEY",
    );
    expect(daily.querySelector("h2")?.textContent).toBe(
      FIFTEENTH_JOURNEY.title,
    );
    expect(daily.querySelector(".daily-menu-description")?.textContent).toBe(
      FIFTEENTH_JOURNEY.description,
    );
    expect(daily.querySelector("time")).toBeNull();
    expect(daily.querySelectorAll(".daily-levels span")).toHaveLength(5);
  });
  it("resumes an attempt after navigation and archives it when a new session starts", async () => {
    const settings = {
      ...defaultSettings,
      topics: ["flags"] as typeof defaultSettings.topics,
      borders: false,
    };
    localStorage.setItem(
      STUDY_KEY,
      JSON.stringify({ ...emptyStudy, settings }),
    );
    await mount();
    await click("Study");
    await click("Custom");
    await click("Start studying");
    expect(probe.props!.showBorders).toBe(false);
    await act(async () => probe.props!.onSelect(member("wurl:USA")));
    await click("Home");
    const saved = savedStudy();
    expect(saved.settings).toEqual(settings);
    expect(saved.session?.history).toHaveLength(1);
    expect(saved.history).toBeUndefined();
    await click("Study");
    expect(host.querySelector(".study-paths")).not.toBeNull();
    await click("Resume session");
    expect(host.querySelector(".round-feedback")).not.toBeNull();
    await click("Home");
    await act(async () => {
      root.unmount();
      root = createRoot(host);
    });
    await mount();
    await click("Study");
    await click("Resume session");
    expect(savedStudy().session?.id).toBe(saved.session?.id);
    await click("Session settings");
    await click("Edit this session");
    expect(
      document.querySelector(".study-options-dialog")?.textContent,
    ).not.toContain("Build a new session");
    await click("Close Session settings");
    await click("Home");
    await click("Study");
    await click("Custom");
    expect(host.querySelector(".study-editor")).not.toBeNull();
    expect(host.textContent).not.toContain("Return to results");
    await click("Start new session");
    expect(
      host.querySelector(".study-question .round-number")?.textContent,
    ).toBe("1");
    expect(host.querySelector(".round-feedback")).toBeNull();
    expect(savedStudy().history).toHaveLength(1);
  });
  it("keeps Explore qualifications in dismissible notes and labels Türkiye consistently", async () => {
    await mount();
    await click("Explore");
    await act(async () => probe.props!.onSelect(member("wurl:TUR")));
    expect(host.querySelector(".mode-incoming h1")?.textContent).toBe(
      "Türkiye",
    );
    expect(host.textContent).not.toContain("downloaded in October 2026");
    await click("Data notes");
    const note = document.querySelector<HTMLElement>(".info-note-tooltip")!;
    expect(note.textContent).toContain("not a population census date");
    expect(document.activeElement).toBe(note);
    expect(note.parentElement).toBe(document.body);
    await act(async () =>
      dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
    );
    expect(document.querySelector(".info-note-tooltip")).toBeNull();
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      "Data notes",
    );
    await click("Data notes");
    await click("Home");
    expect(document.querySelector(".info-note-tooltip")).toBeNull();
  });
  it.each(["account", "builder"])(
    "fits Home to its live viewport after leaving the hidden %s globe",
    async (page) => {
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches: query === MOBILE_LAYOUT_QUERY,
        addEventListener() {},
        removeEventListener() {},
      }));
      await mount();
      if (page === "account") await click("Account");
      else {
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
    const credits =
      host.querySelector<HTMLDetailsElement>(".app-menu-credits")!;
    await act(async () =>
      credits.querySelector<HTMLElement>("summary")!.click(),
    );
    expect(credits.open).toBe(true);
    expect(credits.textContent).toContain("Natural Earth");
    await act(async () =>
      dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
    );
    expect(host.querySelector(".app-menu-content")).toBeNull();
    expect(document.activeElement).toBe(host.querySelector(".app-menu-toggle"));
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
  it("lets Island instincts use either country taps or six immediate choices without making the clue answerable", async () => {
    history.replaceState(null, "", "/journey/island-instincts");
    await mount();
    const canvas = host.querySelector("canvas");
    expect(
      host.querySelectorAll(".mode-incoming .candidate-grid button"),
    ).toHaveLength(6);
    expect(
      host.querySelector(".mode-incoming .question-card")!.textContent,
    ).toContain("Andaman and Nicobar");
    const clue = probe.props!.regions.find(
      (r) => r.id === "clue-part:wurl:IND",
    )!;
    await act(async () => probe.props!.onSelect(clue));
    expect(host.querySelector(".mode-incoming .round-feedback")).toBeNull();
    await act(async () =>
      probe.props!.onSelect(
        probe.props!.regions.find((r) => r.id === "wurl:IND")!,
      ),
    );
    expect(
      host.querySelector(".mode-incoming .round-feedback")!.textContent,
    ).toContain("Your answer: India");
    expect(probe.props!.states["clue-part:wurl:IND"]).toBe("correct");
    await act(async () => probe.props!.onSelect(member("wurl:MMR")));
    expect(
      host.querySelector(".mode-incoming .round-feedback")!.textContent,
    ).toContain("Your answer: India");
    await click("Next");
    expect(
      host.querySelector(".mode-incoming .question-card")!.textContent,
    ).toContain("Bioko Norte");
    const answer = [
      ...host.querySelectorAll<HTMLButtonElement>(
        ".mode-incoming .candidate-grid button",
      ),
    ].find((b) => b.textContent?.includes("Equatorial Guinea"))!;
    await act(async () => answer.click());
    expect(
      host.querySelector(".mode-incoming .round-feedback")!.textContent,
    ).toContain("Your answer: Equatorial Guinea");
    expect(probe.props!.states["wurl:GNQ"]).toBe("correct");
    expect(host.querySelector("canvas")).toBe(canvas);
  });
});
