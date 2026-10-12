// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useJourneyContent } from "../src/app/useJourneyContent";
import { useWorldGeography } from "../src/app/useWorldGeography";
import * as registry from "../src/game/journeyRegistry";
import { CANADA_JOURNEY } from "../src/game/canadaJourney";
import { ANDES_JOURNEY } from "../src/game/andesJourney";
import { PHYSICAL_REVISION } from "../src/geography/physical";
import type { RegionFeature } from "../src/geography/types";
import { DEFAULT_LAYERS } from "../src/app/worldPreferences";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const published: Parameters<typeof useJourneyContent>[0]["published"] = [];
const manifest = [
  { key: "WORLD/ADM0", assetUrl: "/geography/world.v1.json", level: "ADM0" },
];
const response = (value: unknown) => new Response(JSON.stringify(value));
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let journeyResult: ReturnType<typeof useJourneyContent>;
let geographyResult: ReturnType<typeof useWorldGeography>;
let idleCallbacks: IdleRequestCallback[];
function JourneyProbe(props: Parameters<typeof useJourneyContent>[0]) {
  journeyResult = useJourneyContent(props);
  return null;
}
function GeographyProbe(props: Parameters<typeof useWorldGeography>[0]) {
  geographyResult = useWorldGeography(props);
  return null;
}
async function renderJourney(props: Parameters<typeof useJourneyContent>[0]) {
  await act(async () => root.render(<JourneyProbe {...props} />));
  await act(async () => {
    await vi.dynamicImportSettled();
  });
}
async function renderGeography(props: Parameters<typeof useWorldGeography>[0]) {
  await act(async () => root.render(<GeographyProbe {...props} />));
  await act(async () => {
    await vi.dynamicImportSettled();
  });
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  idleCallbacks = [];
  vi.stubGlobal(
    "requestIdleCallback",
    vi.fn((callback: IdleRequestCallback) => {
      idleCallbacks.push(callback);
      return idleCallbacks.length;
    }),
  );
  vi.stubGlobal("cancelIdleCallback", vi.fn());
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("ignores a late Home warmup after navigating to a different Journey", async () => {
  const warm = deferred<typeof CANADA_JOURNEY>();
  vi.spyOn(registry, "loadJourney")
    .mockReturnValueOnce(warm.promise)
    .mockResolvedValueOnce(ANDES_JOURNEY);
  const props = {
    mode: "home" as const,
    warmJourneyId: CANADA_JOURNEY.id,
    ready: true,
    regions,
    published,
    retry: 0,
  };
  await renderJourney(props);
  await act(async () =>
    idleCallbacks[0]({ didTimeout: false, timeRemaining: () => 50 }),
  );
  await renderJourney({
    ...props,
    mode: "practice",
    journeyId: ANDES_JOURNEY.id,
  });
  const context = journeyResult.context;
  expect(journeyResult.journey.id).toBe(ANDES_JOURNEY.id);
  await act(async () => warm.resolve(CANADA_JOURNEY));
  expect(journeyResult.journey.id).toBe(ANDES_JOURNEY.id);
  expect(journeyResult.context).toBe(context);
});

it("reuses prepared Journey answers until the canonical world is replaced", async () => {
  vi.spyOn(registry, "loadJourney").mockResolvedValue(CANADA_JOURNEY);
  const props = {
    mode: "practice" as const,
    journeyId: CANADA_JOURNEY.id,
    warmJourneyId: CANADA_JOURNEY.id,
    ready: true,
    regions,
    published,
    retry: 0,
  };
  await renderJourney(props);
  const context = journeyResult.context;
  expect(context).toBeDefined();
  await renderJourney({ ...props, mode: "study" });
  await renderJourney(props);
  expect(journeyResult.context).toBe(context);
  const replacement = regions.map((region) => ({ ...region }));
  await renderJourney({ ...props, regions: replacement });
  expect(journeyResult.context).not.toBe(context);
  expect(journeyResult.context?.regions).toBe(replacement);
});

it("aborts superseded world requests and ignores responses that arrive after retry", async () => {
  const first = deferred<Response>();
  const second = deferred<Response>();
  const signals: (AbortSignal | null | undefined)[] = [];
  let worlds = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, options?: RequestInit) => {
      if (url.endsWith("manifest.json"))
        return Promise.resolve(response(manifest));
      signals.push(options?.signal);
      return worlds++ === 0 ? first.promise : second.promise;
    }),
  );
  await renderGeography({ mode: "home", retry: 0 });
  await renderGeography({ mode: "home", retry: 1 });
  expect(signals[0]?.aborted).toBe(true);
  await act(async () =>
    second.resolve(response([{ ...regions[0], name: "Current world" }])),
  );
  expect(geographyResult.regions[0]?.name).toBe("Current world");
  await act(async () =>
    first.resolve(response([{ ...regions[0], name: "Stale world" }])),
  );
  expect(geographyResult.regions[0]?.name).toBe("Current world");
  await renderGeography({ mode: "study", retry: 1 });
  expect(worlds).toBe(2);
});

it("ignores a disabled physical-layer request and caches the subsequent valid snapshot", async () => {
  const stale = deferred<Response>();
  const latest = deferred<Response>();
  const physicalSignals: (AbortSignal | null | undefined)[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, options?: RequestInit) => {
      if (url.includes("physical.v1")) {
        physicalSignals.push(options?.signal);
        return physicalSignals.length === 1 ? stale.promise : latest.promise;
      }
      return Promise.resolve(
        response(url.endsWith("manifest.json") ? manifest : [regions[0]]),
      );
    }),
  );
  const layers = { ...DEFAULT_LAYERS, rivers: true };
  await renderGeography({ mode: "home", retry: 0, layers });
  await renderGeography({ mode: "home", retry: 0 });
  expect(physicalSignals[0]?.aborted).toBe(true);
  const snapshot = {
    version: 1,
    revision: PHYSICAL_REVISION,
    features: [
      {
        id: "test:river",
        name: "Current river",
        kind: "river",
        lat: 0,
        lng: 0,
        rank: 1,
      },
    ],
  };
  await act(async () => stale.resolve(response(snapshot)));
  await renderGeography({ mode: "home", retry: 0, layers });
  expect(physicalSignals).toHaveLength(2);
  await act(async () => latest.resolve(response(snapshot)));
  const feature = geographyResult.physicalFeatures?.[0];
  expect(feature?.name).toBe("Current river");
  await renderGeography({ mode: "home", retry: 0 });
  await renderGeography({ mode: "home", retry: 0, layers });
  expect(physicalSignals).toHaveLength(2);
  expect(geographyResult.physicalFeatures?.[0]).toBe(feature);
});
