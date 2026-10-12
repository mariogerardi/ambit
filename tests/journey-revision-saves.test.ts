// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  openDaily,
  emptyDaily,
  upgradeDailyAttempt,
  validDaily,
  DAILY_KEY,
} from "../src/app/dailyProgress";
import type { DailyAttempt } from "../src/app/dailyProgress";
import { createDailySave } from "../src/app/progressSaves";
import { JOURNEY_INDEX } from "../src/game/journeyRegistry";
import { initialGame } from "../src/game/state";
const journey = JOURNEY_INDEX.find((j) => j.id === "mediterranean-v1")!;
const day = "2026-10-12";
const legacy = (): DailyAttempt => ({
  date: day,
  journeyId: journey.id,
  scheduleVersion: 1,
  runId: "old-run",
  startedAt: 100,
  game: {
    ...initialGame,
    phase: "playing",
    roundIndex: 3,
    selectedIds: ["wurl:HRV", "wurl:SRB"],
    text: "stale",
    ordered: ["old"],
    help: {
      "spain-regional-languages": "hinted",
      "yugoslavia-six": "assisted",
    },
    answers: [
      {
        ...initialGame,
        roundId: "spain-regional-languages",
        correct: true,
        selectedIds: ["language:cat", "language:eus"],
      },
    ],
  },
});
beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});
describe("in-place Journey revision save handling", () => {
  it("preserves earned grades and identity, but clears the obsolete unsubmitted draft and its help", () => {
    const old = legacy();
    const original = JSON.stringify(old);
    const current = upgradeDailyAttempt(old, JOURNEY_INDEX);
    expect(current.runId).toBe(old.runId);
    expect(current.startedAt).toBe(old.startedAt);
    expect(current.contentRevision).toBe(2);
    expect(current.game.roundIndex).toBe(3);
    expect(current.game.answers[0]).toMatchObject({
      correct: true,
      selectedIds: ["language:cat", "language:eus"],
      receiptLabel: "Catalan and Basque",
    });
    expect(current.game.selectedIds).toEqual([]);
    expect(current.game.text).toBe("");
    expect(current.game.ordered).toEqual([]);
    expect(current.game.help).toEqual({ "spain-regional-languages": "hinted" });
    expect(JSON.stringify(old)).toBe(original);
    expect(upgradeDailyAttempt(current, JOURNEY_INDEX)).toBe(current);
  });
  it("advances past already graded feedback rather than interpreting it using new rules", () => {
    const old = legacy();
    old.game.phase = "feedback";
    old.game.answers.push({
      ...initialGame,
      roundId: "yugoslavia-six",
      correct: false,
    });
    const current = upgradeDailyAttempt(old, JOURNEY_INDEX);
    expect(current.game.phase).toBe("playing");
    expect(current.game.roundIndex).toBe(4);
    expect(current.game.answers[1]).toMatchObject({
      correct: false,
      receiptLabel: "Six Yugoslav republics",
    });
  });
  it("preserves complete results, stored help and grades without restarting or regrading", () => {
    const old = legacy();
    old.game.roundIndex = 4;
    old.game.phase = "feedback";
    old.game.answers = journey.rounds.map((q, i) => ({
      ...initialGame,
      roundId: q.id,
      correct: i !== 3,
    }));
    const current = upgradeDailyAttempt(old, JOURNEY_INDEX);
    expect(current.game.phase).toBe("finished");
    expect(current.game.answers.map((a) => a.correct)).toEqual([
      true,
      true,
      true,
      false,
      true,
    ]);
    expect(current.game.answers.map((a) => a.receiptLabel)).toEqual([
      "Catalan and Basque",
      "Sicily",
      "Tripoli",
      "Six Yugoslav republics",
      "22 Mediterranean coastal countries",
    ]);
    expect(current.game.help).toEqual(old.game.help);
    expect(
      validDaily(
        { ...emptyDaily, attempts: { [day]: current } },
        JOURNEY_INDEX,
      ),
    ).toBe(true);
  });
  it("stamps fresh attempts and replayed runs, retaining current drafts unchanged", () => {
    const current = openDaily(emptyDaily, day, false, JOURNEY_INDEX, {
      [day]: journey.id,
    });
    expect(current.attempts[day].contentRevision).toBe(2);
    current.attempts[day].game.selectedIds = ["wurl:MAR"];
    expect(upgradeDailyAttempt(current.attempts[day], JOURNEY_INDEX)).toBe(
      current.attempts[day],
    );
    const replay = openDaily(current, day, true, JOURNEY_INDEX);
    expect(replay.attempts[day].contentRevision).toBe(2);
    expect(replay.attempts[day].game.answers).toEqual([]);
    expect(replay.attempts[day].runId).not.toBe(current.attempts[day].runId);
  });
  it("upgrades local and stale synced register copies without restoring old draft/help or dropping other dates", () => {
    const old = legacy();
    const otherDay = "2026-10-11";
    const other = openDaily(emptyDaily, otherDay).attempts[otherDay];
    localStorage.setItem(
      DAILY_KEY,
      JSON.stringify({
        ...emptyDaily,
        activeDate: day,
        attempts: { [day]: old, [otherDay]: other },
        archivedAttempts: { [`${day}/${journey.id}`]: old },
      }),
    );
    const store = createDailySave(JOURNEY_INDEX);
    const current = store.load();
    expect(current.attempts[day].contentRevision).toBe(2);
    expect(
      current.archivedAttempts![`${day}/${journey.id}`].contentRevision,
    ).toBe(2);
    expect(current.attempts[otherDay]).toEqual(other);
    store.save(current);
    store.mergeEntries([
      {
        version: 2,
        clock: 999,
        writer: "old-device",
        field: `run.${day}/${journey.id}/${old.runId}`,
        value: old,
      },
    ]);
    const merged = store.load().attempts[day];
    expect(merged.game.selectedIds).toEqual([]);
    expect(merged.game.help).toEqual({ "spain-regional-languages": "hinted" });
    expect(merged.game.answers[0].receiptLabel).toBe("Catalan and Basque");
  });
});
