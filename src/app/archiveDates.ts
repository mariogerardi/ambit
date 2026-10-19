import { dateOrdinal, unfinished } from "./dailyProgress";
import type { DailyProgress } from "./dailyProgress";
import type { JourneySummary } from "../game/journeyRegistry";
import type { DayRecord } from "../services/journeySchedule";

/** Public opening date, independent of rotation anchors and private player history. */
export const ARCHIVE_START_DATE = "2026-10-11";
export const archivePath = (date: string) => `/archive/${date}`;
export const archiveDateFromPath = (path: string) =>
  path.split(/[?#]/)[0].startsWith("/archive/")
    ? path.split(/[?#]/)[0].slice("/archive/".length)
    : undefined;
export function isArchiveDate(date: string, today: string) {
  try {
    dateOrdinal(date);
    dateOrdinal(today);
    return date >= ARCHIVE_START_DATE && date < today;
  } catch {
    return false;
  }
}
export const shiftedDate = (date: string, days: number) =>
  new Date((dateOrdinal(date) + days) * 86400000).toISOString().slice(0, 10);
export const archiveDateLabel = (date: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));

/** Existing attempts own their edition; unplayed dates require actual stored history. */
export function archiveDay(
  date: string,
  today: string,
  progress: DailyProgress,
  catalog: JourneySummary[],
  records: Record<string, DayRecord>,
) {
  if (!isArchiveDate(date, today)) return undefined;
  const attempt = progress.attempts[date];
  const record = records[date];
  const storedId =
    record?.source !== "provisional" ? record?.journeyId : undefined;
  const journey = attempt
    ? catalog.find((j) => j.id === attempt.journeyId)
    : (catalog.find((j) => j.supersedes === storedId && !!storedId) ??
      catalog.find((j) => j.id === storedId));
  return {
    date,
    attempt,
    journey,
    status: !journey
      ? ("unavailable" as const)
      : !attempt
        ? ("unplayed" as const)
        : unfinished(attempt)
          ? ("in-progress" as const)
          : ("completed" as const),
  };
}
