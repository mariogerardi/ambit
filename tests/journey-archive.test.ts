import { describe, it, expect } from "vitest";
import {
  archiveDateFromPath,
  archiveDay,
  isArchiveDate,
} from "../src/app/archiveDates";
import {
  emptyDaily,
  openDaily,
  withDailyGame,
  validDaily,
} from "../src/app/dailyProgress";
import { dailySaveCodec } from "../src/app/progressSaves";
import { JOURNEY_INDEX } from "../src/game/journeyRegistry";
import { initialGame } from "../src/game/state";
import { modeForPath } from "../src/app/modes";

const date = "2026-10-11",
  today = "2026-10-19";
const journey = JOURNEY_INDEX.find((j) => j.id === "along-the-andes-v1")!;
const other = JOURNEY_INDEX.find((j) => j.id === "mediterranean-v1")!;
const records = {
  [date]: {
    day: date,
    journeyId: journey.id,
    source: "assigned" as const,
    revision: 1,
  },
};

describe("public Journey archive", () => {
  it("starts on October 11 and excludes today, future and malformed deep links", () => {
    expect(modeForPath("/archive")).toBe("archive");
    expect(modeForPath(`/archive/${date}`)).toBe("daily");
    expect(archiveDateFromPath(`/archive/${date}?from=home`)).toBe(date);
    expect(archiveDateFromPath("/daily")).toBeUndefined();
    expect(isArchiveDate(date, today)).toBe(true);
    for (const invalid of [
      "2026-10-10",
      today,
      "2026-10-20",
      "2026-02-30",
      "2026-10-11/extra",
    ])
      expect(
        archiveDay(invalid, today, emptyDaily, JOURNEY_INDEX, records),
      ).toBeUndefined();
  });
  it("requires historical assignments instead of inventing a date from the current pool", () => {
    expect(archiveDay(date, today, emptyDaily, JOURNEY_INDEX, {})?.status).toBe(
      "unavailable",
    );
    expect(
      archiveDay(date, today, emptyDaily, JOURNEY_INDEX, {
        [date]: { ...records[date], source: "provisional" },
      })?.status,
    ).toBe("unavailable");
    expect(
      archiveDay(date, today, emptyDaily, JOURNEY_INDEX, {
        [date]: { ...records[date], journeyId: "gone" },
      })?.status,
    ).toBe("unavailable");
    expect(
      archiveDay(date, today, emptyDaily, JOURNEY_INDEX, records),
    ).toMatchObject({ status: "unplayed", journey });
  });
  it("preserves an existing edition even after a schedule change", () => {
    const saved = openDaily(emptyDaily, date, false, JOURNEY_INDEX, {
      [date]: other.id,
    });
    const entry = archiveDay(date, today, saved, JOURNEY_INDEX, records)!;
    expect(entry.journey?.id).toBe(other.id);
    expect(entry.status).toBe("in-progress");
    expect(
      openDaily(saved, date, false, JOURNEY_INDEX, { [date]: journey.id })
        .attempts[date],
    ).toEqual(saved.attempts[date]);
  });
  it("captures the actual completion day at the final answer and retains it through stale saves", () => {
    const attempt = openDaily(emptyDaily, date, false, JOURNEY_INDEX, {
      [date]: journey.id,
    }).attempts[date];
    const finalAnswer = {
      ...initialGame,
      phase: "feedback" as const,
      roundIndex: 4,
      answers: journey.rounds.map((q) => ({
        ...initialGame,
        roundId: q.id,
        correct: true,
        points: 3,
        pointsVersion: 1,
      })),
    };
    const completed = withDailyGame(attempt, finalAnswer, today);
    expect(completed.completedOn).toBe(today);
    expect(
      withDailyGame(
        completed,
        { ...finalAnswer, phase: "finished" },
        "2026-10-20",
      ).completedOn,
    ).toBe(today);
    expect(withDailyGame(attempt, finalAnswer, date).completedOn).toBe(date);
    const { completedOn: _, ...stale } = completed;
    expect(
      dailySaveCodec(JOURNEY_INDEX).resolve!(
        "attempt." + date,
        completed,
        stale,
      ),
    ).toMatchObject({ completedOn: today });
    expect(validDaily({ version: 1, attempts: { [date]: completed } })).toBe(
      true,
    );
    expect(
      validDaily({
        version: 1,
        attempts: { [date]: { ...completed, completedOn: "2026-02-30" } },
      }),
    ).toBe(false);
    // Viewing a legacy result must not retrospectively assign a completion date.
    expect(
      withDailyGame(stale, { ...finalAnswer, phase: "finished" }, today)
        .completedOn,
    ).toBeUndefined();
  });
});
