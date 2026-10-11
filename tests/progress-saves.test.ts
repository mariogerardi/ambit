// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createDailySave, createStudySave } from "../src/app/progressSaves";
import {
  DAILY_KEY,
  emptyDaily,
  openDaily,
  setDailyPuzzle,
} from "../src/app/dailyProgress";
import { JOURNEY_INDEX } from "../src/game/journeyRegistry";
import {
  STUDY_KEY,
  emptyStudy,
  defaultSettings,
  startStudy,
  studyReducer,
  archiveStudy,
  validStudy,
  recoverStudy,
} from "../src/study/engine";
import { readSave } from "../src/app/storage";
import type { StudySave } from "../src/study/engine";

let values: Map<string, string>;
beforeEach(() => {
  values = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => values.delete(key),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function result(id: string): StudySave {
  let session = { ...startStudy(defaultSettings, 42), id };
  session = studyReducer(session, {
    type: "pick",
    id: session.prompt.targetId,
  }) as typeof session;
  return archiveStudy({ ...emptyStudy, session });
}

describe("durable player saves", () => {
  it("keeps results when a stale tab updates preferences, including after reload", () => {
    const a = createStudySave(),
      b = createStudySave();
    const stale = b.load();
    a.save(result("a"));
    b.save({ ...stale, settings: { ...stale.settings, length: 10 } });
    expect(
      createStudySave()
        .load()
        .history?.map((r) => r.id),
    ).toEqual(["a"]);
    expect(a.load().settings.length).toBe(10);
  });
  it("preserves both results when writers interleave inside a storage write", () => {
    const a = createStudySave(),
      b = createStudySave();
    const set = localStorage.setItem;
    let interleaved = false;
    vi.spyOn(localStorage, "setItem").mockImplementation((key, value) => {
      if (!interleaved && key.includes("history.a")) {
        interleaved = true;
        b.save(result("b"));
      }
      set(key, value);
    });
    a.save(result("a"));
    expect(interleaved).toBe(true);
    expect(
      new Set(
        createStudySave()
          .load()
          .history?.map((r) => r.id),
      ),
    ).toEqual(new Set(["a", "b"]));
  });
  it("merges preferences at field level rather than overwriting another tab's edits", () => {
    const a = createStudySave(),
      b = createStudySave();
    const oldA = a.load(),
      oldB = b.load();
    a.save({ ...oldA, settings: { ...oldA.settings, countryNames: true } });
    b.save({ ...oldB, settings: { ...oldB.settings, length: 50 } });
    expect(createStudySave().load().settings).toMatchObject({
      countryNames: true,
      length: 50,
    });
  });
  it("salvages valid history and settings and retains the exact damaged original", () => {
    const save = result("good");
    const raw = JSON.stringify({
      ...save,
      session: undefined,
      settings: { ...save.settings, length: 50, borders: "damaged" },
      history: [
        ...save.history!,
        { id: "bad" },
        { ...save.history![0], id: "invalid-date", finishedAt: 1e20 },
      ],
    });
    values.set(STUDY_KEY, raw);
    const store = createStudySave(),
      loaded = store.load();
    expect(store.recovered).toBe(true);
    expect(loaded.history?.map((r) => r.id)).toEqual(["good"]);
    expect(loaded.settings).toMatchObject({ length: 50, borders: true });
    expect(
      [...values.entries()].find(([key]) =>
        key.startsWith(`${STUDY_KEY}.recovery.`),
      )?.[1],
    ).toBe(raw);
    expect(createStudySave().load().history).toEqual(loaded.history);
  });
  it("does not overwrite malformed JSON or an unknown future format", () => {
    for (const raw of [
      "{broken",
      JSON.stringify({ version: 99, results: ["future"] }),
    ]) {
      values.clear();
      values.set(STUDY_KEY, raw);
      const store = createStudySave();
      expect(store.save(emptyStudy).ok).toBe(false);
      expect(values.get(STUDY_KEY)).toBe(raw);
    }
  });
  it("refuses replacement when the damaged original cannot be backed up", () => {
    const raw = JSON.stringify({ ...result("good"), history: [{ id: "bad" }] });
    values.set(STUDY_KEY, raw);
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw Error("quota");
    });
    const read = readSave(STUDY_KEY, emptyStudy, validStudy, recoverStudy);
    expect(read.writable).toBe(false);
    expect(values.get(STUDY_KEY)).toBe(raw);
  });
  it("loads durable results even if the expendable compatibility projection is damaged", () => {
    createStudySave().save(result("safe"));
    values.set(STUDY_KEY, "broken projection");
    expect(createStudySave().load().history?.[0].id).toBe("safe");
  });
  it("does not rewrite history or preferences for an unchanged save", () => {
    const store = createStudySave();
    const saved = store.save(result("a")).value;
    const writes = vi.spyOn(localStorage, "setItem");
    store.save(saved);
    expect(writes).not.toHaveBeenCalled();
    store.save({ ...saved, settings: { ...saved.settings, length: 10 } });
    expect(writes.mock.calls.some(([key]) => key.includes("history."))).toBe(
      false,
    );
    expect(JSON.parse(values.get(STUDY_KEY)!)).not.toHaveProperty("history");
  });
  it("resumes an interrupted migration without dropping records that were not copied yet", () => {
    const source = {
      ...emptyStudy,
      history: [...result("a").history!, ...result("b").history!],
    };
    values.set(STUDY_KEY, JSON.stringify(source));
    const set = localStorage.setItem;
    const writes = vi
      .spyOn(localStorage, "setItem")
      .mockImplementation((key, value) => {
        if (key.includes("history.b")) throw Error("quota during migration");
        set(key, value);
      });
    expect(createStudySave().writable).toBe(false);
    expect(JSON.parse(values.get(STUDY_KEY)!)).toEqual(source);
    writes.mockRestore();
    expect(
      new Set(
        createStudySave()
          .load()
          .history?.map((r) => r.id),
      ),
    ).toEqual(new Set(["a", "b"]));
  });
  it("persists the per-topic checkbox even when all selected methods match", () => {
    const store = createStudySave();
    store.save({
      ...emptyStudy,
      settings: {
        ...defaultSettings,
        perTopicMethods: true,
        styles: { countries: "map", capitals: "map", flags: "map" },
      },
    });
    expect(createStudySave().load().settings.perTopicMethods).toBe(true);
  });
  it("retains other dates and prevents stale draft edits from rolling back answered rounds", () => {
    const date = "2026-10-05";
    const initial = openDaily(emptyDaily, date);
    values.set(DAILY_KEY, JSON.stringify(initial));
    const a = createDailySave(JOURNEY_INDEX),
      b = createDailySave(JOURNEY_INDEX);
    const stale = a.load(),
      latest = b.load();
    const attempt = latest.attempts[date];
    const answer = {
      roundId: JOURNEY_INDEX.find(
        (journey) => journey.id === attempt.journeyId,
      )!.rounds[0].id,
      correct: true,
      text: "",
      ordered: [],
      selectedIds: [],
    };
    b.save({
      ...latest,
      attempts: {
        ...latest.attempts,
        [date]: {
          ...attempt,
          game: { ...attempt.game, phase: "feedback", answers: [answer] },
        },
      },
    });
    a.save({
      ...stale,
      attempts: {
        ...stale.attempts,
        [date]: {
          ...stale.attempts[date],
          game: { ...stale.attempts[date].game, text: "old draft" },
        },
      },
    });
    const advanced = createDailySave(JOURNEY_INDEX).load();
    expect(advanced.attempts[date].game.answers).toHaveLength(1);
    a.save(openDaily(advanced, "2026-10-06"));
    expect(
      Object.keys(createDailySave(JOURNEY_INDEX).load().attempts),
    ).toHaveLength(2);
  });
  it("keeps a fresh replay even if an older tab submits its previous run afterward", () => {
    vi.spyOn(Date, "now").mockReturnValue(42);
    const date = "2026-10-05";
    values.set(DAILY_KEY, JSON.stringify(openDaily(emptyDaily, date)));
    const a = createDailySave(JOURNEY_INDEX),
      b = createDailySave(JOURNEY_INDEX);
    const stale = a.load();
    const replay = openDaily(b.load(), date, true);
    b.save(replay);
    a.save({
      ...stale,
      attempts: {
        ...stale.attempts,
        [date]: {
          ...stale.attempts[date],
          game: { ...stale.attempts[date].game, text: "late edit" },
        },
      },
    });
    expect(createDailySave(JOURNEY_INDEX).load().attempts[date].runId).toBe(
      replay.attempts[date].runId,
    );
  });
  it("restores an earlier Journey without letting a stale tab change the chosen Journey", () => {
    vi.spyOn(Date, "now").mockReturnValue(100);
    const date = "2026-10-05",
      first = JOURNEY_INDEX[0].id,
      second = JOURNEY_INDEX[1].id;
    const store = createDailySave(JOURNEY_INDEX);
    store.save(openDaily(setDailyPuzzle(emptyDaily, date, first), date));
    store.save(setDailyPuzzle(store.load(), date, second));
    vi.mocked(Date.now).mockReturnValue(200);
    store.save(openDaily(store.load(), date));
    const staleTab = createDailySave(JOURNEY_INDEX),
      stale = staleTab.load();
    store.save(setDailyPuzzle(store.load(), date, first));
    expect(store.load().attempts[date].journeyId).toBe(first);
    staleTab.save({
      ...stale,
      attempts: {
        ...stale.attempts,
        [date]: {
          ...stale.attempts[date],
          game: {
            ...stale.attempts[date].game,
            text: "late second-Journey draft",
          },
        },
      },
    });
    const saved = createDailySave(JOURNEY_INDEX).load();
    expect(saved.attempts[date].journeyId).toBe(first);
    expect(saved.overrides?.[date]).toBe(first);
    expect(saved.archivedAttempts?.[`${date}/${second}`].game.text).toBe(
      "late second-Journey draft",
    );
  });
  it("recovers daily records independently and keeps the original damaged save", () => {
    const save = openDaily(emptyDaily, "2026-10-05");
    const raw = JSON.stringify({
      ...save,
      attempts: {
        ...save.attempts,
        "bad-date": { journeyId: JOURNEY_INDEX[0].id },
      },
    });
    values.set(DAILY_KEY, raw);
    const store = createDailySave(JOURNEY_INDEX);
    expect(store.recovered).toBe(true);
    expect(Object.keys(store.load().attempts)).toEqual(["2026-10-05"]);
    expect(
      [...values.entries()].some(
        ([key, value]) =>
          key.startsWith(`${DAILY_KEY}.recovery.`) && value === raw,
      ),
    ).toBe(true);
  });
});

it("restores active Study answers and draft input after refresh without rewriting history per key", () => {
  const store = createStudySave();
  let session = {
    ...startStudy(
      {
        ...defaultSettings,
        styles: { ...defaultSettings.styles, countries: "typing" },
      },
      42,
    ),
    id: "active",
  };
  store.save({ ...emptyStudy, session });
  const before = store
    .entries()
    .find((entry) => entry.field === "session.active");
  session = { ...session, text: "Arg" };
  store.save({ ...emptyStudy, session });
  expect(createStudySave().load().session).toMatchObject({
    id: "active",
    text: "Arg",
  });
  expect(
    store.entries().find((entry) => entry.field === "session.active"),
  ).toEqual(before);
});
it("keeps guest import idempotent and isolates accounts, including after sign-out", () => {
  const guest = createStudySave();
  guest.save(result("guest-result"));
  const a = createStudySave("account-a");
  expect(a.load().history?.map((entry) => entry.id)).toEqual(["guest-result"]);
  expect(createStudySave("account-a").load().history).toHaveLength(1);
  a.save(result("account-result"));
  expect(createStudySave("account-b").load().history).toBeUndefined();
  expect(
    createStudySave()
      .load()
      .history?.map((entry) => entry.id),
  ).toEqual(["guest-result"]);
});
it("merges two devices' history and preserves queued edits against a cloud update", () => {
  const a = createStudySave("a");
  const initial = a.load();
  const b = createStudySave("b");
  b.save(result("cloud-result"));
  a.mergeEntries(b.entries());
  const merge = a.incoming();
  const merged = merge({
    ...initial,
    settings: { ...initial.settings, length: 50 },
  });
  expect(merged.history?.[0].id).toBe("cloud-result");
  expect(merged.settings.length).toBe(50);
  a.save(merged);
  expect(createStudySave("a").load()).toEqual(merged);
});
it("does not regress Study progress or let an old run replace a replay", () => {
  const store = createStudySave("a");
  const start = { ...startStudy(defaultSettings, 42), id: "old" };
  const advanced = studyReducer(start, {
    type: "pick",
    id: start.prompt.targetId,
  });
  store.save({ ...emptyStudy, session: advanced });
  const oldEntries = store.entries();
  const replay = { ...startStudy(defaultSettings, 43), id: "new" };
  store.save({ ...emptyStudy, session: replay });
  store.mergeEntries(
    oldEntries.map((entry) =>
      entry.field === "session.old"
        ? { ...entry, writer: "late-device", clock: 100, value: start }
        : entry,
    ),
  );
  expect(store.load().session?.id).toBe("new");
  store.mergeEntries([
    {
      version: 2,
      writer: "remote",
      clock: 101,
      field: "activeSession",
      value: "old",
    },
  ]);
  expect(store.load().session?.history).toHaveLength(1);
});
it("imports a legacy guest's active Study session and non-default preferences", () => {
  const session = startStudy(defaultSettings, 42);
  localStorage.setItem(
    STUDY_KEY,
    JSON.stringify({
      ...emptyStudy,
      settings: { ...defaultSettings, length: 50 },
      session,
    }),
  );
  const save = createStudySave("first-account").load();
  expect(save.session?.seed).toBe(session.seed);
  expect(save.settings.length).toBe(50);
});
