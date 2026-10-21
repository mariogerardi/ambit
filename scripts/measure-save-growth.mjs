import { createServer } from "vite";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

// Offline diagnostic, not a CI timing gate. Never opens a player's storage or AWS.
// Optional --storage <path> exports the final synthetic fixture for browser checks.
const args = process.argv.slice(2).filter((arg) => arg !== "--indexeddb");
const output = args[0] === "--storage" ? args[1] : undefined;
if (args.length && (!output || args.length !== 2))
  throw Error(
    "Usage: npm run measure:saves -- [--indexeddb] [--storage <path>]",
  );
const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  logLevel: "error",
});
try {
  const { RecordSave } = await server.ssrLoadModule("/src/app/recordSave.ts");
  const { studySaveCodec, dailySaveCodec } = await server.ssrLoadModule(
    "/src/app/progressSaves.ts",
  );
  const study = await server.ssrLoadModule("/src/study/engine.ts");
  const daily = await server.ssrLoadModule("/src/app/dailyProgress.ts");
  const { initialGame } = await server.ssrLoadModule("/src/game/state.ts");
  const { JOURNEY_INDEX } = await server.ssrLoadModule(
    "/src/game/journeyRegistry.ts",
  );
  const catalog = JOURNEY_INDEX.filter((j) => j.availability === "pool");
  const settings = { ...study.defaultSettings, length: 20 };
  const codecs = {
    study: studySaveCodec,
    daily: dailySaveCodec(JOURNEY_INDEX),
  };
  const keys = { study: study.STUDY_KEY, daily: daily.DAILY_KEY };
  const values = new Map();
  const addresses = [];
  let io;
  const resetIO = () =>
    (io = { enumerated: 0, reads: 0, writes: 0, writtenBytes: 0 });
  resetIO();
  globalThis.localStorage = {
    get length() {
      return values.size;
    },
    key(index) {
      io.enumerated++;
      return addresses[index] ?? null;
    },
    getItem(key) {
      io.reads++;
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      if (!values.has(key)) addresses.push(key);
      values.set(key, value);
      io.writes++;
      io.writtenBytes += Buffer.byteLength(key + value);
    },
    removeItem(key) {
      if (values.delete(key)) addresses.splice(addresses.indexOf(key), 1);
    },
  };
  const events = new EventTarget();
  globalThis.dispatchEvent = events.dispatchEvent.bind(events);
  globalThis.addEventListener = events.addEventListener.bind(events);
  globalThis.removeEventListener = events.removeEventListener.bind(events);
  let clock = 0;
  const put = (namespace, field, value, writer) => {
    assert(codecs[namespace].accepts(field, value), `Invalid fixture ${field}`);
    localStorage.setItem(
      `${keys[namespace]}.records.v2/${encodeURIComponent(field)}/${writer}`,
      JSON.stringify({ version: 2, clock: ++clock, field, value, writer }),
    );
  };
  // Seed the same final field/writer registers as daily visits, bypassing the
  // quadratic cost of replaying a year's saves. Reducers/codecs validate fixtures.
  for (const namespace of Object.keys(keys)) {
    localStorage.setItem(`${keys[namespace]}.records.v2/migrated`, "2");
    for (const [field, value] of Object.entries(
      codecs[namespace].encode(codecs[namespace].empty),
    ))
      put(namespace, field, value, "legacy");
  }
  const history = [];
  const attempts = {};
  const measure = (action) => {
    resetIO();
    const started = performance.now();
    const result = action();
    return {
      result,
      cost: { ms: +(performance.now() - started).toFixed(2), ...io },
    };
  };
  for (let day = 0; day < 365; day++) {
    const timestamp = Date.UTC(2026, 9, 21 + day);
    const date = new Date(timestamp).toISOString().slice(0, 10);
    const writer = `00000000-0000-4000-8000-${String(day).padStart(12, "0")}`;
    const sessionId = `10000000-0000-4000-8000-${String(day).padStart(12, "0")}`;
    let session = { ...study.startStudy(settings, day + 1), id: sessionId };
    while (session.phase !== "summary") {
      put(
        "study",
        `draft.${sessionId}/${session.prompt.ordinal}`,
        { text: "", choiceId: "" },
        writer,
      );
      session = study.studyReducer(session, {
        type: "pick",
        id: session.prompt.targetId,
      });
      session = study.studyReducer(session, { type: "next" });
    }
    const record = { id: sessionId, finishedAt: timestamp, session };
    history.push(record);
    put("study", `session.${sessionId}`, session, writer);
    put("study", `history.${sessionId}`, record, writer);
    put("study", "activeSession", null, writer);
    const journey = catalog[day % catalog.length];
    const attempt = {
      date,
      completedOn: date,
      journeyId: journey.id,
      scheduleVersion: 2,
      contentRevision: journey.saveRevision ?? 1,
      runId: sessionId,
      startedAt: timestamp,
      game: {
        ...initialGame,
        phase: "finished",
        roundIndex: journey.rounds.length - 1,
        answers: journey.rounds.map((q) => ({
          roundId: q.id,
          receiptLabel: q.resolvedLabel ?? q.label,
          selectedIds: [],
          ordered: [],
          text: "Example answer",
          correct: true,
          points: 3,
          pointsVersion: 1,
        })),
      },
    };
    attempts[date] = attempt;
    for (const [field, value] of Object.entries(
      codecs.daily.encode({
        version: 1,
        activeDate: date,
        attempts: { [date]: attempt },
      }),
    ))
      put("daily", field, value, writer);
    if (![1, 30, 365].includes(day + 1)) continue;
    // The compatibility projections remain on disk too.
    localStorage.setItem(
      keys.daily,
      JSON.stringify({ version: 1, activeDate: date, attempts }),
    );
    localStorage.setItem(keys.study, JSON.stringify({ version: 1, settings }));
    const fixture = [...values];
    const storage = {
      keys: values.size,
      utf8Bytes: [...values].reduce(
        (n, [k, v]) => n + Buffer.byteLength(k + v),
        0,
      ),
      utf16Bytes: [...values].reduce(
        (n, [k, v]) => n + 2 * (k.length + v.length),
        0,
      ),
      studyUtf8Bytes: [...values]
        .filter(([k]) => k.startsWith(keys.study))
        .reduce((n, [k, v]) => n + Buffer.byteLength(k + v), 0),
      dailyUtf8Bytes: [...values]
        .filter(([k]) => k.startsWith(keys.daily))
        .reduce((n, [k, v]) => n + Buffer.byteLength(k + v), 0),
    };
    const loaded = measure(() => ({
      daily: new RecordSave(keys.daily, codecs.daily),
      study: new RecordSave(keys.study, codecs.study),
    }));
    const saved = loaded.result;
    assert.equal(saved.study.load().history.length, day + 1);
    assert.equal(Object.keys(saved.daily.load().attempts).length, day + 1);
    const entries = [
      ...saved.daily.entries().map((e) => ({ ...e, namespace: "daily" })),
      ...saved.study.entries().map((e) => ({ ...e, namespace: "study" })),
    ];
    const active = {
      ...study.startStudy(
        { ...settings, styles: { ...settings.styles, countries: "typing" } },
        2000,
      ),
      id: "measurement-active",
    };
    assert(
      saved.study.save({ version: 1, settings, history, session: active }).ok,
    );
    const current = saved.study.load();
    const edit = measure(() =>
      saved.study.save({
        ...current,
        session: { ...current.session, text: "Bra" },
      }),
    );
    assert(edit.result.ok);
    assert.equal(edit.result.value.session.text, "Bra");
    const report = {
      days: day + 1,
      storage,
      load: loaded.cost,
      studyKeystroke: edit.cost,
      cloud: {
        records: entries.length,
        jsonBytes: Buffer.byteLength(JSON.stringify({ entries })),
        minimumReadPages: Math.ceil(entries.length / 100),
        minimumUploadBatches: Math.ceil(entries.length / 25),
      },
    };
    console.log(JSON.stringify(report));
    // Keep checkpoint probes out of the next checkpoint's fixture.
    values.clear();
    addresses.length = 0;
    for (const [key, value] of fixture) localStorage.setItem(key, value);
  }
  if (output) await writeFile(output, JSON.stringify([...values]));
  if (process.argv.includes("--indexeddb")) {
    const { IDBFactory } = await import("fake-indexeddb");
    globalThis.indexedDB = new IDBFactory();
    globalThis.BroadcastChannel = undefined;
    const { registerStorage } = await server.ssrLoadModule(
      "/src/app/registerStorage.ts",
    );
    await registerStorage.initialize();
    const loaded = measure(() => new RecordSave(keys.study, codecs.study));
    const store = loaded.result;
    assert.equal(store.load().history.length, 365);
    assert(
      store.save({
        ...store.load(),
        session: {
          ...study.startStudy(
            {
              ...settings,
              styles: { ...settings.styles, countries: "typing" },
            },
            2000,
          ),
          id: "measurement-active",
        },
      }).ok,
    );
    await registerStorage.flush();
    let input = store.load();
    const edit = measure(() => {
      input = { ...input, session: { ...input.session, text: "Bra" } };
      const saved = store.save(input);
      assert(saved.ok);
      assert(store.equivalent(saved.value, input));
      return saved;
    });
    await registerStorage.flush();
    assert.equal(store.load().history.length, 365);
    console.log(
      JSON.stringify({
        mode: "indexeddb-emulated",
        days: 365,
        localStorageBytes: [...values].reduce(
          (n, [k, v]) => n + Buffer.byteLength(k + v),
          0,
        ),
        localStorageKeys: values.size,
        load: loaded.cost,
        studyKeystroke: edit.cost,
      }),
    );
    registerStorage.close();
  }
} finally {
  await server.close();
}
