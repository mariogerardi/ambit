// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  emptyDaily,
  openDaily,
  reconcileDailyAssignment,
  validDaily,
} from "../src/app/dailyProgress";
import { createDailySave } from "../src/app/progressSaves";
import { JOURNEY_INDEX } from "../src/game/journeyRegistry";

const day = "2026-11-02";
const oldId = "across-the-divide-v1";
const assignedId = "im-like-a-bird-v1";
const open = (progress = emptyDaily, id = oldId, date = day) =>
  openDaily(progress, date, false, JOURNEY_INDEX, { [date]: id });
beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-02T17:00:00Z"));
});
afterEach(() => vi.useRealTimers());

it("selects today's authoritative assignment without losing either edition's draft or changing history", () => {
  const historical = open(emptyDaily, oldId, "2026-11-01");
  const previous = open(historical);
  previous.attempts[day].game.text = "old draft";
  const switched = openDaily(previous, day, false, JOURNEY_INDEX, {
    [day]: assignedId,
  });
  expect(switched.attempts[day].journeyId).toBe(assignedId);
  expect(switched.archivedAttempts?.[`${day}/${oldId}`]).toEqual(
    previous.attempts[day],
  );
  expect(switched.attempts["2026-11-01"]).toBe(previous.attempts["2026-11-01"]);
  switched.attempts[day].game.text = "assigned draft";
  const restored = openDaily(switched, day, false, JOURNEY_INDEX, {
    [day]: oldId,
  });
  expect(restored.attempts[day]).toEqual(previous.attempts[day]);
  const back = openDaily(restored, day, false, JOURNEY_INDEX, {
    [day]: assignedId,
  });
  expect(back.attempts[day]).toEqual(switched.attempts[day]);
  expect(validDaily(back)).toBe(true);
  expect(
    reconcileDailyAssignment(back, day, { [day]: assignedId }, JOURNEY_INDEX),
  ).toBe(back);
  expect(reconcileDailyAssignment(back, day, {}, JOURNEY_INDEX)).toBe(back);
});

it("preserves a completed result when today's assignment changes", () => {
  const previous = open();
  const journey = JOURNEY_INDEX.find((j) => j.id === oldId)!;
  const attempt = previous.attempts[day];
  attempt.completedOn = day;
  attempt.game = {
    ...attempt.game,
    phase: "finished",
    roundIndex: 4,
    answers: journey.rounds.map((q) => ({
      roundId: q.id,
      correct: true,
      text: "",
      selectedIds: [],
      ordered: [],
      points: 3,
      pointsVersion: 1,
    })),
  };
  const next = openDaily(previous, day, false, JOURNEY_INDEX, {
    [day]: assignedId,
  });
  expect(next.archivedAttempts?.[`${day}/${oldId}`]).toEqual(attempt);
  expect(
    openDaily(next, day, false, JOURNEY_INDEX, { [day]: oldId }).attempts[day],
  ).toEqual(attempt);
});

it("does not substitute another Journey for an unavailable assignment", () => {
  const previous = open();
  const assignments = { [day]: "new-content-not-loaded" };
  const next = reconcileDailyAssignment(
    previous,
    day,
    assignments,
    JOURNEY_INDEX,
  );
  expect(next.attempts[day]).toBeUndefined();
  expect(next.archivedAttempts?.[`${day}/${oldId}`]).toEqual(
    previous.attempts[day],
  );
  expect(() =>
    openDaily(previous, day, false, JOURNEY_INDEX, assignments),
  ).toThrow("Journey unavailable");
});

it("recovers the assigned edition from cloud run records despite a newer conflicting selection", () => {
  const local = createDailySave(JOURNEY_INDEX, "local-device");
  const assigned = open(emptyDaily, assignedId);
  assigned.attempts[day].game.text = "cloud-saved assigned draft";
  local.save(assigned);
  const other = createDailySave(JOURNEY_INDEX, "other-device");
  const previous = open();
  previous.attempts[day].game.text = "other edition's draft";
  other.save(previous);
  const incoming = other
    .entries()
    .map((entry) => ({ ...entry, clock: entry.clock + 1000 }));
  local.mergeEntries(incoming);
  const conflicted = local.load();
  expect(conflicted.attempts[day].journeyId).toBe(oldId);
  expect(conflicted.archivedAttempts?.[`${day}/${assignedId}`]).toEqual(
    assigned.attempts[day],
  );
  const reconciled = reconcileDailyAssignment(
    conflicted,
    day,
    { [day]: assignedId },
    JOURNEY_INDEX,
  );
  expect(local.save(reconciled).ok).toBe(true);
  const reloaded = createDailySave(JOURNEY_INDEX, "local-device").load();
  expect(reloaded.attempts[day]).toEqual(assigned.attempts[day]);
  expect(reloaded.archivedAttempts?.[`${day}/${oldId}`]).toEqual(
    previous.attempts[day],
  );
  // The same stale cloud payload must not recreate or reset either run.
  local.mergeEntries(incoming);
  expect(local.load().attempts[day]).toEqual(assigned.attempts[day]);
});
