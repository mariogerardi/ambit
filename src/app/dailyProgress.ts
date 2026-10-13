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
export const DAILY_TIME_ZONE = "America/New_York";
const dailyDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: DAILY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
/** Retained name for save callers; daily dates are shared New York dates. */
export function localDateKey(date = new Date()): string {
  const parts = dailyDateFormatter.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
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
  assignments?: Record<string, string>,
): T;
export function dailyJourney(
  date: string,
  progress?: DailyProgress,
  catalog: JourneySummary[] = JOURNEY_INDEX,
  assignments?: Record<string, string>,
): JourneySummary {
  const assignedId = (assignments ?? progress?.overrides)?.[date];
  const selected =
    catalog.find(
      (journey) => journey.supersedes === assignedId && !!assignedId,
    ) ?? catalog.find((journey) => journey.id === assignedId);
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
  const today = localDateKey(now),
    start = now.getTime();
  let low = start,
    high = start + 26 * 60 * 60 * 1000;
  // Locate the calendar boundary rather than assuming a 24-hour DST day.
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (localDateKey(new Date(middle)) === today) low = middle;
    else high = middle;
  }
  return high - start;
}
export interface DailyAttempt {
  contentRevision?: number;
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
  /** Clear earlier runs of one date/edition, including stale synced copies. */
  resets?: Record<string, number>;
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
  if (
    value.help !== undefined &&
    (!isRecord(value.help) ||
      !Object.entries(value.help).every(
        ([id, stage]) =>
          journey.rounds.some((round) => round.id === id) &&
          (stage === "hinted" || stage === "assisted"),
      ))
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
      typeof a.correct === "boolean" &&
      (a.receiptLabel === undefined || typeof a.receiptLabel === "string"),
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
    (value.contentRevision !== undefined &&
      (!Number.isSafeInteger(value.contentRevision) ||
        Number(value.contentRevision) < 1)) ||
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
  if (
    value.resets !== undefined &&
    (!isRecord(value.resets) ||
      !Object.entries(value.resets).every(([key, cutoff]) => {
        const [date, journeyId] = key.split("/");
        try {
          dateOrdinal(date);
        } catch {
          return false;
        }
        return (
          key === `${date}/${journeyId}` &&
          catalog.some((journey) => journey.id === journeyId) &&
          typeof cutoff === "number" &&
          Number.isSafeInteger(cutoff) &&
          cutoff >= 0
        );
      }))
  )
    return false;
  return true;
}
/** Admin reset: remove this attempt without resetting other dates or editions. */
export function resetDailyAttempt(
  progress: DailyProgress,
  date: string,
): DailyProgress {
  const attempt = progress.attempts[date];
  if (!attempt) return progress;
  const key = `${date}/${attempt.journeyId}`;
  const attempts = { ...progress.attempts };
  delete attempts[date];
  const archivedAttempts = { ...progress.archivedAttempts };
  const archived = archivedAttempts[key];
  delete archivedAttempts[key];
  return {
    ...progress,
    activeDate: progress.activeDate === date ? undefined : progress.activeDate,
    attempts,
    archivedAttempts,
    resets: {
      ...progress.resets,
      [key]: Math.max(
        Date.now(),
        (attempt.startedAt ?? 0) + 1,
        (archived?.startedAt ?? 0) + 1,
        (progress.resets?.[key] ?? 0) + 1,
      ),
    },
  };
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
/** Preserve earned grades; clear only an obsolete unsubmitted question/help draft. */
export function upgradeDailyAttempt(
  attempt: DailyAttempt,
  catalog: JourneySummary[],
): DailyAttempt {
  const journey = catalog.find((journey) => journey.id === attempt.journeyId);
  const revision = journey?.saveRevision ?? 1;
  if (!journey || (attempt.contentRevision ?? 1) >= revision) return attempt;
  const answers = attempt.game.answers.map((answer) => ({
    ...answer,
    receiptLabel:
      answer.receiptLabel ??
      journey.legacyRoundLabels?.[answer.roundId] ??
      journey.rounds.find((round) => round.id === answer.roundId)
        ?.resolvedLabel ??
      journey.rounds.find((round) => round.id === answer.roundId)?.label,
  }));
  const complete = answers.length === journey.rounds.length;
  const ended =
    complete ||
    attempt.game.phase === "finished" ||
    attempt.game.phase === "failed";
  const roundIndex =
    !ended && attempt.game.phase === "feedback"
      ? Math.min(attempt.game.roundIndex + 1, journey.rounds.length - 1)
      : attempt.game.roundIndex;
  const help = Object.fromEntries(
    Object.entries(attempt.game.help ?? {}).filter(([id]) =>
      answers.some((answer) => answer.roundId === id),
    ),
  );
  return {
    ...attempt,
    contentRevision: revision,
    game: ended
      ? {
          ...attempt.game,
          answers,
          ...(complete ? { phase: "finished" as const } : {}),
        }
      : {
          ...initialGame,
          phase: "playing",
          roundIndex,
          answers,
          ...(Object.keys(help).length ? { help } : {}),
        },
  };
}

export function openDaily(
  progress: DailyProgress,
  date: string,
  replay = false,
  catalog: JourneySummary[] = JOURNEY_INDEX,
  assignments?: Record<string, string>,
): DailyProgress {
  const saved = progress.attempts[date];
  const existing = saved && upgradeDailyAttempt(saved, catalog);
  const journeyId =
    existing?.journeyId ??
    dailyJourney(date, progress, catalog, assignments).id;
  const attempt =
    existing && !replay
      ? existing.game.phase === "feedback" && existing.game.answers.length === 5
        ? {
            ...existing,
            game: { ...existing.game, phase: "finished" as const },
          }
        : existing
      : {
          ...(catalog.find((journey) => journey.id === journeyId)?.saveRevision
            ? {
                contentRevision: catalog.find(
                  (journey) => journey.id === journeyId,
                )!.saveRevision,
              }
            : {}),
          runId: crypto.randomUUID(),
          startedAt: Math.max(
            Date.now(),
            (existing?.startedAt ?? 0) + 1,
            (progress.resets?.[`${date}/${journeyId}`] ?? 0) + 1,
          ),
          date,
          journeyId,
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
  a.game.answers.length < 5 &&
  (a.game.phase === "playing" || a.game.phase === "feedback");

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
  const resets = Object.fromEntries(
    isRecord(value.resets)
      ? Object.entries(value.resets).filter(([key, cutoff]) =>
          validDaily(
            { version: 1, attempts: {}, resets: { [key]: cutoff } },
            catalog,
          ),
        )
      : [],
  );
  return {
    version: 1,
    attempts: attempts as Record<string, DailyAttempt>,
    archivedAttempts: archivedAttempts as Record<string, DailyAttempt>,
    overrides: overrides as Record<string, string>,
    resets: resets as Record<string, number>,
    ...(typeof value.activeDate === "string" && attempts[value.activeDate]
      ? { activeDate: value.activeDate }
      : {}),
  };
}
