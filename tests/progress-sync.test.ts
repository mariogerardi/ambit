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
    manifest?: boolean;
  }[] = [];
  let failure = false;
  let beforeWrite: (() => void) | undefined;
  const request: typeof progressRequest = async <T>(
    token: string,
    signal: AbortSignal,
    raw?: unknown,
    cursor?: string,
    manifest?: boolean,
  ): Promise<T> => {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    if (failure) throw new TypeError("Network failed");
    const body = raw as { entries: CloudEntry[] } | undefined;
    calls.push({ token, body, cursor, manifest });
    if (raw && typeof raw === "object" && "read" in raw) {
      const read = (
        raw as { read: Pick<CloudEntry, "namespace" | "writer" | "field">[] }
      ).read;
      return {
        entries: [...records.values()].filter((entry) =>
          read.some((wanted) => key(entry) === key(wanted as CloudEntry)),
        ),
      } as T;
    }
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
      entries: all
        .slice(offset, offset + 4)
        .map((entry) =>
          manifest ? (({ value: _, ...revision }) => revision)(entry) : entry,
        ),
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
    overrides: { "2026-10-10": "beyond-the-maple-leaf-v1" },
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
  await vi.waitFor(() => expect(request).toHaveBeenCalled());
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

it("syncs a Journey replay as a new run without restoring the previous completed run", async () => {
  const remote = cloud(),
    a = device("replay-a", remote);
  const date = "2026-10-10";
  const original = openDaily(a.daily.load(), date, false, JOURNEY_INDEX);
  const attempt = original.attempts[date];
  a.daily.save({
    ...original,
    attempts: {
      [date]: { ...attempt, game: { ...attempt.game, phase: "failed" } },
    },
  });
  await a.sync.flush();
  const b = device("replay-b", remote);
  await b.sync.flush();
  const replay = openDaily(b.daily.load(), date, true, JOURNEY_INDEX);
  b.daily.save(replay);
  await b.sync.flush();
  await a.sync.flush();
  await b.sync.flush();
  for (const player of [a, b]) {
    expect(player.daily.load().attempts[date].runId).toBe(
      replay.attempts[date].runId,
    );
    expect(player.daily.load().attempts[date].game.phase).toBe("playing");
  }
});

it("syncs the distractor preference and a city-answer Study session", async () => {
  const remote = cloud(),
    a = device("cities-a", remote);
  const settings = {
    ...defaultSettings,
    topics: ["capitals" as const],
    scope: "custom" as const,
    countryIds: ["wurl:CAN"],
    capitalDistractors: "countryCities" as const,
    styles: { ...defaultSettings.styles, capitals: "choices" as const },
  };
  let session = { ...startStudy(settings, 42), id: "cities" };
  const city = session.prompt.choices.find((id) => id.startsWith("place:"))!;
  session = studyReducer(studyReducer(session, { type: "choice", id: city }), {
    type: "submit",
  }) as typeof session;
  a.study.save({ ...emptyStudy, settings, session });
  await a.sync.flush();
  const b = device("cities-b", remote);
  await b.sync.flush();
  expect(b.study.load().settings.capitalDistractors).toBe("countryCities");
  expect(b.study.load().session).toMatchObject({
    id: session.id,
    phase: "feedback",
    prompt: session.prompt,
    history: session.history,
    settings,
  });
});

it("uploads local edits without repeating cloud downloads and dedupes focus wakes", async () => {
  vi.useFakeTimers();
  const remote = cloud(),
    a = device("cached", remote);
  a.sync.start();
  await vi.advanceTimersByTimeAsync(0);
  const pulls = () =>
    remote.calls.filter((call) => !call.body && !call.cursor).length;
  expect(pulls()).toBe(1);
  a.study.save({ ...emptyStudy, settings: { ...defaultSettings, length: 50 } });
  await vi.advanceTimersByTimeAsync(1200);
  expect(pulls()).toBe(1);
  expect(remote.calls.some((call) => call.body)).toBe(true);
  dispatchEvent(new Event("focus"));
  dispatchEvent(new Event("focus"));
  await vi.advanceTimersByTimeAsync(0);
  expect(pulls()).toBe(1);
  await vi.advanceTimersByTimeAsync(300000);
  expect(pulls()).toBe(2);
  a.sync.schedule(0);
  await vi.advanceTimersByTimeAsync(0);
  expect(pulls()).toBe(3);
});

it("forces a cloud restore on reconnect even while a downloaded page is cached", async () => {
  vi.useFakeTimers();
  const remote = cloud(),
    a = device("reconnect", remote);
  a.sync.start();
  await vi.advanceTimersByTimeAsync(0);
  remote.records.set("remote", {
    namespace: "study",
    version: 2,
    field: "settings.length",
    writer: "other",
    clock: 100,
    value: 50,
  });
  dispatchEvent(new Event("online"));
  await vi.advanceTimersByTimeAsync(0);
  expect(a.study.load().settings.length).toBe(50);
  expect(
    remote.calls.filter((call) => !call.body && !call.cursor),
  ).toHaveLength(2);
});

it("retains HTTP diagnostics without including tokens, cursors or save values", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response("private backend body", { status: 503 }),
  );
  try {
    await progressRequest(
      "private-token",
      new AbortController().signal,
      { entries: [{ value: "private-save" }] },
      "private-cursor",
    );
    throw new Error("Expected failure");
  } catch (error) {
    expect(error).toMatchObject({
      context: {
        route: "/account/saves",
        method: "POST",
        httpStatus: 503,
        errorType: "http",
        attemptCount: 1,
        online: true,
      },
    });
    expect(JSON.stringify(error)).not.toContain("private");
  }
});

it("keeps network and timeout diagnostics distinct from HTTP failures", async () => {
  vi.spyOn(globalThis, "fetch").mockRejectedValue(
    new TypeError("private-network-detail"),
  );
  await expect(
    progressRequest("token", new AbortController().signal),
  ).rejects.toMatchObject({ context: { httpStatus: 0, errorType: "network" } });
  const timeout = new AbortController();
  timeout.abort(new DOMException("Timed out", "TimeoutError"));
  vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeout.signal);
  vi.mocked(fetch).mockRejectedValue(timeout.signal.reason);
  await expect(
    progressRequest("token", new AbortController().signal),
  ).rejects.toMatchObject({ context: { httpStatus: 0, errorType: "timeout" } });
});

it("keeps malformed response contents out of player-facing sync errors", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response("private invalid json"),
  );
  await expect(
    progressRequest("token", new AbortController().signal),
  ).rejects.toThrow("Couldn’t read cloud progress");
});

it("refreshes revisions without downloading unchanged values, including after reopening a device", async () => {
  const remote = cloud(),
    a = device("cached-history", remote);
  a.study.save({
    ...emptyStudy,
    session: { ...startStudy(defaultSettings, 42), id: "active" },
  });
  await a.sync.flush();
  remote.calls.length = 0;
  const reopened = device("cached-history", remote);
  await reopened.sync.flush();
  expect(remote.calls.every((call) => call.manifest && !call.body)).toBe(true);
  const changed: CloudEntry = {
    namespace: "study",
    version: 2,
    clock: 100,
    writer: "remote",
    field: "settings.length",
    value: 50,
  };
  remote.records.set(key(changed), changed);
  remote.calls.length = 0;
  await reopened.sync.flush();
  const reads = remote.calls.filter((call) => call.body && "read" in call.body);
  expect(reads).toHaveLength(1);
  expect(reads[0].body).toEqual({
    read: [{ namespace: "study", field: "settings.length", writer: "remote" }],
  });
  expect(reopened.study.load().settings.length).toBe(50);
});

it("does not upload or acknowledge revisions when a selected restore is incomplete", async () => {
  const remote = cloud();
  const stores = {
    daily: createDailySave(JOURNEY_INDEX, "incomplete"),
    study: createStudySave("incomplete"),
  };
  stores.study.save({
    ...emptyStudy,
    session: { ...startStudy(defaultSettings, 42), id: "active" },
  });
  const changed: CloudEntry = {
    namespace: "study",
    version: 2,
    clock: 100,
    writer: "remote",
    field: "settings.length",
    value: 50,
  };
  remote.records.set(key(changed), changed);
  let incomplete = true;
  const request: typeof progressRequest = async (...args) =>
    args[2] && "read" in (args[2] as object) && incomplete
      ? ({ entries: [null] } as never)
      : remote.request(...args);
  const status = vi.fn();
  const sync = new ProgressSync(stores, async () => "token", status, request);
  clients.push(sync);
  await sync.flush();
  expect(status).toHaveBeenLastCalledWith(
    "error",
    "Couldn’t read cloud progress. Please try again.",
  );
  expect(remote.calls.some((call) => call.body && "entries" in call.body)).toBe(
    false,
  );
  incomplete = false;
  await sync.flush();
  expect(stores.study.load().settings.length).toBe(50);
  expect(status).toHaveBeenLastCalledWith("saved", expect.any(String));
});

it("accepts full-value responses from a backend without manifest support", async () => {
  const remote = cloud(),
    a = device("old-server", remote);
  a.study.save({
    ...emptyStudy,
    session: { ...startStudy(defaultSettings, 42), id: "active" },
  });
  const request: typeof progressRequest = (...args) =>
    remote.request(args[0], args[1], args[2], args[3], false);
  const sync = new ProgressSync(
    { daily: a.daily, study: a.study },
    async () => "token",
    a.status,
    request,
  );
  clients.push(sync);
  await sync.flush();
  await sync.flush();
  expect(a.status).toHaveBeenLastCalledWith("saved", expect.any(String));
});
