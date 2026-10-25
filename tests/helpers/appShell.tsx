import { readFileSync } from "node:fs";
import {
  act,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, vi } from "vitest";
import historicRotation from "../../scripts/legacy-journey-rotation.json";
import { App } from "../../src/App";
import { localDateKey } from "../../src/app/dailyProgress";
import { createStudySave } from "../../src/app/progressSaves";
import type {
  Focus,
  MapOverlay,
  PhysicalFeature,
  PlaceFeature,
  RegionFeature,
  RouteFeature,
  VisualState,
} from "../../src/geography/types";
import type { ClueLocator } from "../../src/globe/clueLocators";
import { createGlobeRegionPreparer } from "../../src/globe/geometry";
import type { GlobeHandle } from "../../src/globe/GlobeView";
import { supportsWebGL } from "../../src/globe/support";
import { clearProfileCache } from "../../src/services/playerProfileCache";
export const savedStudy = () => createStudySave().load();
interface GlobeProps {
  routes: RouteFeature[];
  regionReveal?: import("../../src/globe/regionFades").RegionReveal;
  borderOmissions?: Record<string, number[][][]>;
  clueLocators?: ClueLocator[];
  overlays?: MapOverlay[];
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
  physicalFeatures?: PhysicalFeature[];
  onReady(): void;
  onFailure(): void;
  onInteraction(): void;
  onSelect(region: RegionFeature, point?: Focus): void;
  onPlace(place: PlaceFeature): void;
  onCoordinateTap?(point: Focus): void;
  regionInteraction?: boolean;
  selectDisabled?: boolean;
  selectableRegionIds?: readonly string[];
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
vi.mock("../../src/globe/support", () => ({
  supportsWebGL: vi.fn(() => true),
}));
vi.mock("../../src/globe/GlobeView", () => ({
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
        pulseIslands() {},
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
vi.mock("../../src/services/accounts", () => ({
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
vi.mock("../../src/app/FeedbackReview", () => ({ FeedbackReview: () => null }));
type MockDay = {
  day: string;
  journeyId: string | null;
  source: "assigned" | "auto" | "provisional";
  revision: number;
};
const historicRecords = () =>
  Object.fromEntries(
    historicRotation.map((journeyId, index) => {
      const day = `2026-10-${String(index + 5).padStart(2, "0")}`;
      return [day, { day, journeyId, source: "auto" as const, revision: 1 }];
    }),
  ) as Record<string, MockDay>;
export let scheduleState = {
  records: historicRecords(),
  assignments: {} as Record<string, string>,
};
export let root: Root, host: HTMLDivElement;
export const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
export const member = (id: string) => world.find((r) => r.id === id)!;
export async function click(text: string) {
  await settleLoads();
  const buttons = [
    ...document.querySelectorAll<HTMLButtonElement>("button"),
  ].filter((b) => !b.closest("[inert]"));
  let button =
    buttons.find(
      (b) =>
        b.textContent?.trim() === text || b.getAttribute("aria-label") === text,
    ) ?? buttons.find((b) => b.textContent?.trim().startsWith(text));
  if (!button && text === "Admin") {
    // Existing Admin behavior fixtures enter its protected deep link. Dedicated
    // account-navigation coverage exercises discovery through the Admin tab.
    await act(async () => {
      history.pushState(null, "", "/admin");
      dispatchEvent(new PopStateEvent("popstate"));
    });
    await settleLoads();
    return;
  }
  if (
    !button &&
    [
      "Home",
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
export async function settleLoads() {
  // Effects load Journey content, then rendering can request a lazy panel.
  await act(async () => {
    await vi.dynamicImportSettled();
  });
  await act(async () => {
    await vi.dynamicImportSettled();
  });
}
export async function mount() {
  await act(async () => {
    root.render(<App />);
  });
  await settleLoads();
}
export let panelObservers: {
  resize(): void;
  element?: Element;
  disconnected: boolean;
}[] = [];
beforeEach(() => {
  vi.mocked(supportsWebGL).mockReturnValue(true);
  clearProfileCache();
  scheduleState = { records: historicRecords(), assignments: {} };
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
  sessionStorage.clear();
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
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("/journeys/schedule")) {
        if (init?.method === "PATCH") {
          const edit = JSON.parse(init.body as string);
          if (edit.journeyId)
            scheduleState.assignments[edit.date] = edit.journeyId;
          else delete scheduleState.assignments[edit.date];
          scheduleState.records[edit.date] = {
            day: edit.date,
            journeyId: edit.journeyId,
            source: edit.journeyId ? "assigned" : "provisional",
            revision: (scheduleState.records[edit.date]?.revision ?? 0) + 1,
          };
        }
        return new Response(
          JSON.stringify({ ...scheduleState, today: localDateKey() }),
        );
      }
      return new Response(readFileSync(`public${url.split("?")[0]}`, "utf8"));
    }),
  );
  host = document.createElement("div");
  document.body.append(host);
  resetRoot();
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

export function resetRoot() {
  root = createRoot(host);
}

export { probe, authProbe };
