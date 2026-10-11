import { RETIRED_JOURNEY_IDS } from "../game/retiredJourneys";
import { ACTIVE_JOURNEY_IDS } from "../game/journeyRotation";
import { validPin } from "../game/answerTargets";
import { JOURNEY_INDEX } from "../game/journeyRegistry";
import type { JourneySummary } from "../game/journeyRegistry";
import type { GameState } from "../game/state";
import { initialGame } from "../game/state";
import { isRecord, strings } from "./storage";
export const DAILY_VERSION = 1;
export const DAILY_KEY = "wurl.daily.v1";
export const DAILY_SCHEDULE = {
  version: 1,
  begins: "2026-10-05",
  overrides: [] as { date: string; journeyId: string }[],
};
export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function dateOrdinal(key: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw Error("Invalid Journey date");
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    throw Error("Invalid Journey date");
  return date.getTime() / 86400000;
}
export function dailyJourney(
  date: string,
  progress?: DailyProgress,
): JourneySummary;
export function dailyJourney<T extends JourneySummary>(
  date: string,
  progress: DailyProgress | undefined,
  catalog: T[],
): T;
export function dailyJourney(
  date: string,
  progress?: DailyProgress,
  catalog: JourneySummary[] = JOURNEY_INDEX,
): JourneySummary {
  const selected = catalog.find((j) => j.id === progress?.overrides?.[date]);
  if (selected) return selected;
  const override = DAILY_SCHEDULE.overrides.find(
    (entry) => entry.date === date,
  );
  if (override)
    return catalog.find((j) => j.id === override.journeyId) ?? catalog[0];
  const offset = dateOrdinal(date) - dateOrdinal(DAILY_SCHEDULE.begins);
  const bundled = ACTIVE_JOURNEY_IDS.flatMap((id) => {
    const journey = catalog.find((entry) => entry.id === id);
    return journey ? [journey] : [];
  });
  if (!bundled.length) throw Error("No active Journeys are available");
  return bundled[((offset % bundled.length) + bundled.length) % bundled.length];
}
export function millisecondsToMidnight(now = new Date()): number {
  return (
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() -
    now.getTime()
  );
}
export interface DailyAttempt {
  runId?: string;
  startedAt?: number;
  date: string;
  journeyId: string;
  scheduleVersion: number;
  game: GameState;
}
export interface DailyProgress {
  version: 1;
  activeDate?: string;
  attempts: Record<string, DailyAttempt>;
  /** Device-local admin choices apply to one local calendar day. */
  overrides?: Record<string, string>;
  archivedAttempts?: Record<string, DailyAttempt>;
}
export const emptyDaily: DailyProgress = { version: 1, attempts: {} };
export function validGame(
  value: unknown,
  journey: JourneySummary,
): value is GameState {
  if (
    !isRecord(value) ||
    !["home", "playing", "feedback", "finished", "failed"].includes(
      String(value.phase),
    ) ||
    !Number.isInteger(value.roundIndex) ||
    Number(value.roundIndex) < 0 ||
    Number(value.roundIndex) >= journey.rounds.length ||
    (value.pin !== undefined && !validPin(value.pin)) ||
    !strings(value.selectedIds) ||
    !strings(value.ordered) ||
    typeof value.text !== "string" ||
    !Array.isArray(value.answers) ||
    value.answers.length > journey.rounds.length
  )
    return false;
  return value.answers.every(
    (a) =>
      isRecord(a) &&
      journey.rounds.some((q) => q.id === a.roundId) &&
      (a.pin === undefined || validPin(a.pin)) &&
      strings(a.selectedIds) &&
      strings(a.ordered) &&
      typeof a.text === "string" &&
      typeof a.correct === "boolean",
  );
}
function validAttempt(
  value: unknown,
  date: string,
  catalog: JourneySummary[] = JOURNEY_INDEX,
): value is DailyAttempt {
  try {
    dateOrdinal(date);
  } catch {
    return false;
  }
  if (
    !isRecord(value) ||
    value.date !== date ||
    value.scheduleVersion !== DAILY_VERSION ||
    (value.runId !== undefined && typeof value.runId !== "string") ||
    (value.startedAt !== undefined &&
      (typeof value.startedAt !== "number" ||
        !Number.isFinite(value.startedAt)))
  )
    return false;
  const journey = catalog.find((j) => j.id === value.journeyId);
  return !!journey && validGame(value.game, journey);
}
export function validDaily(
  value: unknown,
  catalog: JourneySummary[] = JOURNEY_INDEX,
): value is DailyProgress {
  if (
    !isRecord(value) ||
    value.version !== DAILY_VERSION ||
    !isRecord(value.attempts) ||
    (value.activeDate !== undefined && typeof value.activeDate !== "string")
  )
    return false;
  if (
    !Object.entries(value.attempts).every(([date, a]) =>
      validAttempt(a, date, catalog),
    )
  )
    return false;
  if (
    value.overrides !== undefined &&
    (!isRecord(value.overrides) ||
      !Object.entries(value.overrides).every(([date, id]) => {
        try {
          dateOrdinal(date);
        } catch {
          return false;
        }
        return catalog.some((j) => j.id === id);
      }))
  )
    return false;
  if (
    value.archivedAttempts !== undefined &&
    (!isRecord(value.archivedAttempts) ||
      !Object.entries(value.archivedAttempts).every(
        ([key, a]) =>
          isRecord(a) &&
          typeof a.date === "string" &&
          key === `${a.date}/${a.journeyId}` &&
          validAttempt(a, a.date, catalog),
      ))
  )
    return false;
  return true;
}
/** Switch today's Journey while keeping a resumable attempt for every chosen Journey. */
export function setDailyPuzzle(
  progress: DailyProgress,
  date: string,
  journeyId?: string,
  catalog: JourneySummary[] = JOURNEY_INDEX,
): DailyProgress {
  dateOrdinal(date);
  if (journeyId && !catalog.some((j) => j.id === journeyId))
    throw Error("Unknown Journey");
  const overrides = { ...progress.overrides };
  if (journeyId) overrides[date] = journeyId;
  else delete overrides[date];
  const next = { ...progress, overrides };
  const target = dailyJourney(date, next, catalog).id,
    current = progress.attempts[date];
  if (current?.journeyId === target) return next;
  const archivedAttempts = { ...progress.archivedAttempts };
  if (current) archivedAttempts[`${date}/${current.journeyId}`] = current;
  const attempts = { ...progress.attempts };
  const restored = archivedAttempts[`${date}/${target}`];
  if (restored) attempts[date] = restored;
  else delete attempts[date];
  return { ...next, attempts, archivedAttempts };
}
export function openDaily(
  progress: DailyProgress,
  date: string,
  replay = false,
  catalog: JourneySummary[] = JOURNEY_INDEX,
): DailyProgress {
  const existing = progress.attempts[date];
  const attempt =
    existing && !replay
      ? existing
      : {
          runId: crypto.randomUUID(),
          startedAt: Math.max(Date.now(), (existing?.startedAt ?? 0) + 1),
          date,
          journeyId:
            existing?.journeyId ?? dailyJourney(date, progress, catalog).id,
          scheduleVersion: DAILY_VERSION,
          game: { ...initialGame, phase: "playing" as const },
        };
  return {
    ...progress,
    activeDate: date,
    attempts: { ...progress.attempts, [date]: attempt },
  };
}
export const unfinished = (a: DailyAttempt) =>
  a.game.phase === "playing" || a.game.phase === "feedback";

export function recoverDaily(
  value: unknown,
  catalog: JourneySummary[] = JOURNEY_INDEX,
): DailyProgress | undefined {
  if (!isRecord(value) || value.version !== DAILY_VERSION) return;
  // A temporarily unavailable locally published Journey may return later.
  // Keep its original save untouched instead of treating it as damage.
  // Known retired editions are permanent removals, so their records can be dropped.
  const referenced = [
    ...[value.attempts, value.archivedAttempts].flatMap((items) =>
      isRecord(items)
        ? Object.values(items).flatMap((a) =>
            isRecord(a) && typeof a.journeyId === "string" ? [a.journeyId] : [],
          )
        : [],
    ),
    ...(isRecord(value.overrides) ? Object.values(value.overrides) : []),
  ];
  if (
    referenced.some(
      (id) =>
        typeof id === "string" &&
        !RETIRED_JOURNEY_IDS.has(id) &&
        !catalog.some((j) => j.id === id),
    )
  )
    return;
  const attempts = Object.fromEntries(
    isRecord(value.attempts)
      ? Object.entries(value.attempts).filter(([date, a]) =>
          validAttempt(a, date, catalog),
        )
      : [],
  );
  const archivedAttempts = Object.fromEntries(
    isRecord(value.archivedAttempts)
      ? Object.entries(value.archivedAttempts).filter(
          ([key, a]) =>
            isRecord(a) &&
            typeof a.date === "string" &&
            key === `${a.date}/${a.journeyId}` &&
            validAttempt(a, a.date, catalog),
        )
      : [],
  );
  const overrides = Object.fromEntries(
    isRecord(value.overrides)
      ? Object.entries(value.overrides).filter(([date, id]) => {
          try {
            dateOrdinal(date);
          } catch {
            return false;
          }
          return catalog.some((j) => j.id === id);
        })
      : [],
  );
  return {
    version: 1,
    attempts: attempts as Record<string, DailyAttempt>,
    archivedAttempts: archivedAttempts as Record<string, DailyAttempt>,
    overrides: overrides as Record<string, string>,
    ...(typeof value.activeDate === "string" && attempts[value.activeDate]
      ? { activeDate: value.activeDate }
      : {}),
  };
}
