// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProgressSync, progressRequest } from "../src/services/progressSync";
import type { CloudEntry, ProgressStores } from "../src/services/progressSync";
import { createDailySave, createStudySave } from "../src/app/progressSaves";
import { JOURNEY_INDEX } from "../src/game/journeyRegistry";
import {
  defaultSettings,
  emptyStudy,
  startStudy,
  archiveStudy,
  studyReducer,
} from "../src/study/engine";
import { openDaily } from "../src/app/dailyProgress";

const clients: ProgressSync[] = [];
beforeEach(() => {
  localStorage.clear();
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
});
afterEach(() => {
  clients.forEach((client) => client.stop());
  clients.length = 0;
  vi.restoreAllMocks();
  vi.useRealTimers();
});
const key = (entry: CloudEntry) =>
  JSON.stringify([entry.namespace, entry.field, entry.writer]);
function cloud() {
  const records = new Map<string, CloudEntry>();
  const calls: {
    token: string;
    body?: { entries: CloudEntry[] };
    cursor?: string;
  }[] = [];
  let failure = false;
  let beforeWrite: (() => void) | undefined;
  const request: typeof progressRequest = async <T>(
    token: string,
    signal: AbortSignal,
    raw?: unknown,
    cursor?: string,
  ): Promise<T> => {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    if (failure) throw new TypeError("Network failed");
    const body = raw as { entries: CloudEntry[] } | undefined;
    calls.push({ token, body, cursor });
    if (body) {
      beforeWrite?.();
      beforeWrite = undefined;
      for (const entry of body.entries) {
        if ((records.get(key(entry))?.clock ?? -1) < entry.clock)
          records.set(key(entry), entry);
      }
      return { saved: true } as T;
    }
    const all = [...records.values()];
    const offset = Number(cursor ?? 0);
    return {
      entries: all.slice(offset, offset + 4),
      ...(all.length > offset + 4 ? { cursor: String(offset + 4) } : {}),
    } as T;
  };
  return {
    records,
    calls,
    request,
    fail: (value: boolean) => {
      failure = value;
    },
    beforeWrite: (callback: () => void) => {
      beforeWrite = callback;
    },
  };
}
function device(scope: string, remote: ReturnType<typeof cloud>) {
  const stores: ProgressStores = {
    daily: createDailySave(JOURNEY_INDEX, scope),
    study: createStudySave(scope),
  };
  const status = vi.fn();
  const sync = new ProgressSync(
    stores,
    async () => "test-token",
    status,
    remote.request,
  );
  clients.push(sync);
  return {
    sync,
    status,
    daily: stores.daily as ReturnType<typeof createDailySave>,
    study: stores.study as ReturnType<typeof createStudySave>,
  };
}
it("continues Journey and active Study on another device, including paginated cloud records", async () => {
  const remote = cloud(),
    a = device("device-a", remote);
  const daily = openDaily(a.daily.load(), "2026-10-10", false, JOURNEY_INDEX);
  a.daily.save(daily);
  const session = { ...startStudy(defaultSettings, 42), id: "active" };
  a.study.save({
    ...emptyStudy,
    session: { ...session, text: "draft" },
    settings: { ...defaultSettings, length: 50 },
  });
  await a.sync.flush();
  const b = device("device-b", remote);
  await b.sync.flush();
  expect(b.daily.load()).toEqual(daily);
  expect(b.study.load().session).toMatchObject({ id: "active", text: "draft" });
  expect(b.study.load().settings.length).toBe(50);
  expect(remote.calls.some((call) => call.cursor)).toBe(true);
  expect(b.status).toHaveBeenLastCalledWith("saved", expect.any(String));
});
it("keeps offline work durable and merges both devices' completed history on retry", async () => {
  const remote = cloud(),
    a = device("a", remote),
    b = device("b", remote);
  const result = (id: string) => {
    const session = { ...startStudy(defaultSettings, 42), id };
    return archiveStudy({
      ...emptyStudy,
      session: studyReducer(session, {
        type: "pick",
        id: session.prompt.targetId,
      }),
    });
  };
  a.study.save(result("a"));
  remote.fail(true);
  await a.sync.flush();
  expect(a.status).toHaveBeenLastCalledWith(
    "error",
    expect.stringContaining("saved on this device"),
  );
  expect(createStudySave("a").load().history).toHaveLength(1);
  remote.fail(false);
  b.study.save(result("b"));
  await b.sync.flush();
  await a.sync.flush();
  await b.sync.flush();
  expect(new Set(b.study.load().history?.map((record) => record.id))).toEqual(
    new Set(["a", "b"]),
  );
});
it("does not acknowledge a write made while an earlier upload is in flight", async () => {
  const remote = cloud(),
    a = device("a", remote);
  remote.beforeWrite(() =>
    a.study.save({
      ...a.study.load(),
      settings: { ...defaultSettings, length: 10 },
    }),
  );
  await a.sync.flush();
  await a.sync.flush();
  const b = device("b", remote);
  await b.sync.flush();
  expect(b.study.load().settings.length).toBe(10);
});
it("does not upload local defaults until all cloud pages are available", async () => {
  const remote = cloud(),
    a = device("a", remote);
  a.study.save({ ...emptyStudy, settings: { ...defaultSettings, length: 50 } });
  await a.sync.flush();
  const before = JSON.stringify([...remote.records.values()]);
  const b = device("b", remote);
  remote.fail(true);
  await b.sync.flush();
  expect(JSON.stringify([...remote.records.values()])).toBe(before);
  expect(b.status).toHaveBeenLastCalledWith("error", expect.any(String));
});
it("leaves device-local admin overrides out of cloud saves", async () => {
  const remote = cloud(),
    a = device("a", remote);
  a.daily.save({
    ...a.daily.load(),
    overrides: { "2026-10-10": JOURNEY_INDEX[0].id },
  });
  await a.sync.flush();
  expect(
    [...remote.records.values()].some((entry) =>
      entry.field.startsWith("override."),
    ),
  ).toBe(false);
});
it("aborts and ignores an old account's response when its workspace closes", async () => {
  let resolve!: (page: { entries: CloudEntry[] }) => void;
  const request = vi.fn(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  ) as unknown as typeof progressRequest;
  const stores = {
    daily: createDailySave(JOURNEY_INDEX, "a"),
    study: createStudySave("a"),
  };
  const status = vi.fn();
  const sync = new ProgressSync(stores, async () => "a-token", status, request);
  clients.push(sync);
  const flush = sync.flush();
  await Promise.resolve();
  sync.stop();
  resolve({
    entries: [
      {
        namespace: "study",
        version: 2,
        clock: 100,
        writer: "remote",
        field: "settings.length",
        value: 50,
      },
    ],
  });
  await flush;
  expect(stores.study.load().settings.length).toBe(defaultSettings.length);
  expect(status).not.toHaveBeenCalled();
  expect(request).toHaveBeenCalledOnce();
});
it("retries automatically after reconnecting without clearing local records", async () => {
  vi.useFakeTimers();
  const remote = cloud(),
    a = device("a", remote);
  const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  a.sync.start();
  await vi.advanceTimersByTimeAsync(0);
  expect(a.status).toHaveBeenLastCalledWith("offline", expect.any(String));
  online.mockReturnValue(true);
  dispatchEvent(new Event("online"));
  await vi.advanceTimersByTimeAsync(0);
  expect(a.status).toHaveBeenLastCalledWith("saved", expect.any(String));
});
it("retries a throttled page without restarting a large cloud download", async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response("", { status: 429 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ entries: [] })));
  const result = progressRequest(
    "token",
    new AbortController().signal,
    undefined,
    "next-page",
  );
  await vi.advanceTimersByTimeAsync(1000);
  expect(await result).toEqual({ entries: [] });
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[0][0]).toBe(fetcher.mock.calls[1][0]);
});
