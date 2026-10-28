// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  createNeighborSave,
  validNeighborRun,
} from "../src/minigames/sharedNeighborsSave";
import { startNeighborRun } from "../src/minigames/sharedNeighbors";
import { createMinigameSettingsSave } from "../src/minigames/minigameSettingsSave";
import { defaultMinigameSettings } from "../src/minigames/minigameSettings";

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  });
});
afterEach(() => vi.unstubAllGlobals());
const run = () =>
  startNeighborRun([{ id: "a|b", countries: ["a", "b"], answer: "c" }]);

it("saves preferences separately from active runs, accounts, and the other minigame", () => {
  const initial = run();
  createNeighborSave("a").save({ version: 1, run: initial });
  const settings = {
    ...defaultMinigameSettings,
    includeTerritories: false,
    excludedCountries: ["wurl:FRA"],
  };
  createMinigameSettingsSave("a", "shared-neighbors").save(settings);
  expect(createMinigameSettingsSave("a", "shared-neighbors").load()).toEqual(
    settings,
  );
  expect(createMinigameSettingsSave("a", "missing-borders").load()).toEqual(
    defaultMinigameSettings,
  );
  expect(createMinigameSettingsSave("b", "shared-neighbors").load()).toEqual(
    defaultMinigameSettings,
  );
  expect(createNeighborSave("a").load().run).toEqual(initial);
});

it("merges independent preference fields from stale tabs", () => {
  const a = createMinigameSettingsSave(undefined, "shared-neighbors"),
    b = createMinigameSettingsSave(undefined, "shared-neighbors");
  a.save({ ...defaultMinigameSettings, includeTerritories: false });
  b.save({ ...defaultMinigameSettings, excludeAdjacentClues: true });
  expect(
    createMinigameSettingsSave(undefined, "shared-neighbors").load(),
  ).toMatchObject({ includeTerritories: false, excludeAdjacentClues: true });
});

it("preserves a run's settings snapshot and accepts legacy runs without settings", () => {
  const initial = {
    ...run(),
    settings: {
      ...defaultMinigameSettings,
      framing: "wide" as const,
      region: "EU" as const,
    },
  };
  createNeighborSave(undefined, "missing-borders").save({
    version: 1,
    run: initial,
  });
  expect(createNeighborSave(undefined, "missing-borders").load().run).toEqual(
    initial,
  );
  expect(validNeighborRun(run())).toBe(true);
  expect(
    validNeighborRun({
      ...initial,
      settings: { ...initial.settings, region: "invalid" },
    }),
  ).toBe(false);
});

it("restores a shuffled run, scores, and feedback without mixing accounts or Study saves", () => {
  const store = createNeighborSave("a");
  const saved = {
    ...run(),
    pin: { lat: 12, lng: 34 },
    result: true,
    answered: 1,
    correct: 1,
  };
  expect(store.save({ version: 1, run: saved }).ok).toBe(true);
  expect(createNeighborSave("a").load().run).toEqual(saved);
  expect(createNeighborSave("b").load().run).toBeUndefined();
  expect(createNeighborSave().load().run).toBeUndefined();
});
it("keeps forward progress when an older tab writes a stale run", () => {
  const a = createNeighborSave(),
    b = createNeighborSave();
  const initial = run();
  a.save({ version: 1, run: initial });
  const advanced = { ...initial, index: 1, answered: 1, correct: 1 };
  a.save({ version: 1, run: advanced });
  b.save({ version: 1, run: initial });
  expect(createNeighborSave().load().run).toEqual(advanced);
});
it("rejects malformed scores, coordinates, and feedback without a pin", () => {
  const valid = run();
  expect(validNeighborRun(valid)).toBe(true);
  for (const patch of [
    { correct: 1 },
    { index: -1 },
    { seed: Infinity },
    { pin: { lat: 91, lng: 0 } },
    { result: true },
    { ended: "unknown" },
    { ended: "strikes" },
  ])
    expect(validNeighborRun({ ...valid, ...patch })).toBe(false);
});
it("preserves a finished run against stale answers and allows a new game to replace it", () => {
  const a = createNeighborSave(),
    b = createNeighborSave();
  const initial = run();
  a.save({ version: 1, run: initial });
  const finished = { ...initial, ended: "finished" as const };
  a.save({ version: 1, run: finished });
  b.save({
    version: 1,
    run: {
      ...initial,
      answered: 1,
      correct: 1,
      pin: { lat: 12, lng: 34 },
      result: true,
    },
  });
  expect(createNeighborSave().load().run).toEqual(finished);
  const restarted = { ...run(), startedAt: finished.startedAt + 1 };
  a.save({ version: 1, run: restarted });
  b.save({ version: 1, run: finished });
  expect(createNeighborSave().load().run).toEqual(restarted);
});

it("restores Missing Borders selections independently of Shared Neighbors and other accounts", () => {
  const saved = {
    ...run(),
    selectedId: "composite:test",
    result: true,
    answered: 1,
    correct: 1,
  };
  const missing = createNeighborSave("a", "missing-borders");
  expect(missing.save({ version: 1, run: saved }).ok).toBe(true);
  expect(createNeighborSave("a", "missing-borders").load().run).toEqual(saved);
  expect(createNeighborSave("a").load().run).toBeUndefined();
  expect(createNeighborSave("b", "missing-borders").load().run).toBeUndefined();
});

it("round-trips regional Pinpoint rules while continuing to accept unversioned legacy runs", () => {
  const legacy = { ...run(), kind: "pinpoint" as const };
  const modern = { ...legacy, pinpointRules: "regional" as const };
  const save = createNeighborSave("regional-player", "pinpoint");
  expect(save.save({ version: 1, run: modern }).ok).toBe(true);
  expect(
    createNeighborSave("regional-player", "pinpoint").load().run?.pinpointRules,
  ).toBe("regional");
  expect(validNeighborRun(legacy)).toBe(true);
  expect(validNeighborRun({ ...legacy, pinpointRules: "unrecognized" })).toBe(
    false,
  );
});
