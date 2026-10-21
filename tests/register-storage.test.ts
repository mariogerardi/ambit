// @vitest-environment jsdom
import { IDBFactory, IDBDatabase } from "fake-indexeddb";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { RegisterStorage } from "../src/app/registerStorage";

const stores: RegisterStorage[] = [];
const prefix = "wurl.study.v1.records.v2/";
const key = `${prefix}settings.length/writer`;
const entry = (clock: number, value = 50) =>
  JSON.stringify({
    version: 2,
    clock,
    writer: "writer",
    field: "settings.length",
    value,
  });
const open = async () => {
  const store = new RegisterStorage();
  stores.push(store);
  await store.initialize();
  return store;
};
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("indexedDB", new IDBFactory());
});
afterEach(() => {
  for (const store of stores) store.close();
  stores.length = 0;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("migrates registers only after commit, preserves damaged data and reloads history from the database", async () => {
  localStorage.setItem(key, entry(1));
  localStorage.setItem(`${prefix}draft.bad/writer`, "broken JSON");
  localStorage.setItem(`${prefix}migrated`, "2");
  localStorage.setItem("ambit.theme", "ocean");
  const store = await open();
  expect(store.available).toBe(true);
  expect(localStorage.getItem(key)).toBeNull();
  expect(localStorage.getItem("ambit.theme")).toBe("ocean");
  expect(localStorage.getItem(`${prefix}migrated`)).toBe("2");
  const reloaded = await open();
  expect(reloaded.getItem(key)).toBe(entry(1));
  expect(reloaded.getItem(`${prefix}draft.bad/writer`)).toBe("broken JSON");
});

it("keeps edits in the synchronous journal until committed and restores them on reload", async () => {
  const store = await open();
  store.setItem(key, entry(2));
  expect(localStorage.getItem(key)).toBe(entry(2));
  expect(await store.flush()).toBe(true);
  expect(localStorage.getItem(key)).toBeNull();
  expect((await open()).getItem(key)).toBe(entry(2));
});

it("replays the journal after a database transaction abort instead of dropping the edit", async () => {
  const store = await open();
  const transaction = IDBDatabase.prototype.transaction;
  const failure = vi
    .spyOn(IDBDatabase.prototype, "transaction")
    .mockImplementation(function (this: IDBDatabase, ...args) {
      const tx = transaction.apply(this, args);
      if (args[1] === "readwrite") queueMicrotask(() => tx.abort());
      return tx;
    });
  store.setItem(key, entry(3));
  expect(await store.flush()).toBe(false);
  expect(localStorage.getItem(key)).toBe(entry(3));
  failure.mockRestore();
  store.close();
  const reloaded = await open();
  expect(reloaded.getItem(key)).toBe(entry(3));
  expect(localStorage.getItem(key)).toBeNull();
});

it("does not report an edit as durable when its synchronous journal write fails", async () => {
  const store = await open();
  await store.import([[key, entry(1)]]);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Full", "QuotaExceededError");
  });
  expect(() => store.setItem(key, entry(2))).toThrow("Full");
  expect(store.getItem(key)).toBe(entry(1));
});

it("cannot regress a committed writer when an older tab flushes late", async () => {
  const a = await open(),
    b = await open();
  await a.import([[key, entry(10)]]);
  b.setItem(key, entry(2));
  await b.flush();
  expect(b.getItem(key)).toBe(entry(10));
  expect((await open()).getItem(key)).toBe(entry(10));
});

it("restores more than LocalStorage quota without copying the bulk payload into the journal", async () => {
  const store = await open();
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Full", "QuotaExceededError");
  });
  const records: [string, string][] = Array.from({ length: 200 }, (_, n) => [
    `${prefix}history.${n}/writer`,
    JSON.stringify({ clock: 1, value: "x".repeat(40000) }),
  ]);
  await store.import(records);
  expect(store.entries(prefix)).toHaveLength(200);
  vi.restoreAllMocks();
  expect((await open()).entries(prefix)).toHaveLength(200);
});

it("blocks a partial-journal fallback when a migrated database cannot be opened", async () => {
  localStorage.setItem("ambit.progress.indexeddb.v1", "1");
  vi.spyOn(indexedDB, "open").mockImplementation(() => {
    throw Error("Unavailable");
  });
  const store = await open();
  expect(store.available).toBe(false);
  expect(() => store.setItem(key, entry(1))).toThrow("unavailable");
});

it("saves a Study draft without rereading or revalidating retained history", async () => {
  vi.resetModules();
  const { registerStorage } = await import("../src/app/registerStorage");
  stores.push(registerStorage);
  await registerStorage.initialize();
  const { createStudySave, studySaveCodec } = await import(
    "../src/app/progressSaves"
  );
  const { defaultSettings, startStudy, studyReducer, archiveStudy } =
    await import("../src/study/engine");
  const store = createStudySave();
  const settings = {
    ...defaultSettings,
    styles: { ...defaultSettings.styles, countries: "typing" as const },
  };
  let session = { ...startStudy(defaultSettings, 42), id: "completed" };
  session = studyReducer(session, {
    type: "pick",
    id: session.prompt.targetId,
  }) as typeof session;
  const completed = archiveStudy({
    version: 1,
    settings: defaultSettings,
    session,
  }).history![0];
  const history = Array.from({ length: 365 }, (_, i) => ({
    ...completed,
    id: `result-${i}`,
  }));
  const saved = store.save({
    version: 1,
    settings,
    history,
    session: { ...startStudy(settings, 50), id: "active" },
  });
  expect(saved.ok).toBe(true);
  await registerStorage.flush();
  const reads = vi.spyOn(Storage.prototype, "getItem");
  const scans = vi.spyOn(Storage.prototype, "key");
  const validates = vi.spyOn(studySaveCodec, "accepts");
  const edited = store.save({
    ...saved.value,
    session: { ...saved.value.session!, text: "Bra" },
  });
  expect(edited.ok).toBe(true);
  expect(edited.value.history).toHaveLength(365);
  expect(edited.value.session!.text).toBe("Bra");
  expect(scans).not.toHaveBeenCalled();
  expect(reads).not.toHaveBeenCalled();
  expect(
    validates.mock.calls.every(([field]) => field.startsWith("draft.")),
  ).toBe(true);
  await registerStorage.flush();
});

it("retries a failed guest import without claiming its data for another account", async () => {
  vi.resetModules();
  const { registerStorage } = await import("../src/app/registerStorage");
  stores.push(registerStorage);
  await registerStorage.initialize();
  const { createStudySave } = await import("../src/app/progressSaves");
  const { defaultSettings, emptyStudy, startStudy } = await import(
    "../src/study/engine"
  );
  const guest = createStudySave();
  guest.save({
    ...emptyStudy,
    session: { ...startStudy(defaultSettings, 42), id: "guest-session" },
  });
  await registerStorage.flush();
  vi.spyOn(registerStorage, "import").mockRejectedValueOnce(
    Error("Interrupted import"),
  );
  const owner = createStudySave("owner");
  await expect(owner.ready).rejects.toThrow("Interrupted import");
  await owner.ready;
  expect(owner.load().session?.id).toBe("guest-session");
  const other = createStudySave("other");
  await other.ready;
  expect(other.load().session).toBeUndefined();
  expect(guest.load().session?.id).toBe("guest-session");
  await registerStorage.flush();
});
