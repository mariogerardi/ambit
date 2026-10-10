import { RecordSave } from "./recordSave";
import type { SaveCodec } from "./recordSave";
import { isRecord } from "./storage";
import {
  DAILY_KEY,
  emptyDaily,
  validDaily,
  recoverDaily,
  dateOrdinal,
} from "./dailyProgress";
import type { DailyProgress, DailyAttempt } from "./dailyProgress";
import type { JourneySummary } from "../game/journeyRegistry";
import {
  STUDY_KEY,
  defaultSettings,
  emptyStudy,
  validStudy,
  validSettings,
  recoverStudy,
  leaveStudy,
} from "../study/engine";
import type { StudySave, StudyRecord } from "../study/engine";
const optionalSettings = new Set([
  "choiceCount",
  "revisitMissed",
  "perTopicMethods",
]);

export const studySaveCodec: SaveCodec<StudySave> = {
  empty: emptyStudy,
  valid: validStudy,
  recover: recoverStudy,
  encode(save) {
    const persistent = save.session
      ? leaveStudy({
          ...save,
          session: {
            ...save.session,
            id:
              save.session.id ??
              `legacy-study-${save.session.seed}-${save.session.prompt.ordinal}`,
          },
        })
      : save;
    return {
      ...Object.fromEntries(
        Object.entries(persistent.settings)
          .filter(([key]) => key !== "styles")
          .map(([key, value]) => [`settings.${key}`, value]),
      ),
      ...Object.fromEntries(
        Object.entries(persistent.settings.styles).map(([topic, style]) => [
          `styles.${topic}`,
          style,
        ]),
      ),
      ...Object.fromEntries(
        (persistent.history ?? []).map((r) => [`history.${r.id}`, r]),
      ),
    };
  },
  decode(fields) {
    const settings = {
      ...defaultSettings,
      styles: { ...defaultSettings.styles },
    };
    const history: StudyRecord[] = [];
    for (const [field, value] of Object.entries(fields)) {
      if (field.startsWith("settings."))
        Object.assign(settings, {
          [field.slice(9)]: value === null ? undefined : value,
        });
      else if (field.startsWith("styles."))
        Object.assign(settings.styles, { [field.slice(7)]: value });
      else if (field.startsWith("history.") && value)
        history.push(value as StudyRecord);
    }
    history.sort(
      (a, b) => b.finishedAt - a.finishedAt || a.id.localeCompare(b.id),
    );
    return { version: 1, settings, ...(history.length ? { history } : {}) };
  },
  accepts(field, value) {
    if (field.startsWith("history."))
      return (
        isRecord(value) &&
        field === `history.${value.id}` &&
        validStudy({ version: 1, settings: defaultSettings, history: [value] })
      );
    if (field.startsWith("styles.")) {
      const topic = field.slice(7);
      return (
        Object.hasOwn(defaultSettings.styles, topic) &&
        validSettings({
          ...defaultSettings,
          styles: { ...defaultSettings.styles, [topic]: value },
        })
      );
    }
    const key = field.slice(9);
    return (
      field.startsWith("settings.") &&
      (Object.hasOwn(defaultSettings, key) || optionalSettings.has(key)) &&
      key !== "styles" &&
      validSettings({
        ...defaultSettings,
        [key]: value === null && optionalSettings.has(key) ? undefined : value,
      })
    );
  },
  resolve(field, previous, next) {
    if (field.startsWith("history.")) {
      const a = previous as StudyRecord,
        b = next as StudyRecord;
      return a.session.history.length > b.session.history.length ? a : b;
    }
    return next;
  },
  // Keep the old settings address compatible without duplicating growing history.
  projection: (value) => ({ version: 1, settings: value.settings }),
};

export function dailySaveCodec(
  catalog: JourneySummary[],
): SaveCodec<DailyProgress> {
  const runField = (
    attempt: Pick<DailyAttempt, "date" | "journeyId" | "runId">,
  ) => `run.${attempt.date}/${attempt.journeyId}/${attempt.runId ?? "legacy"}`;
  const preferAttempt = (a: DailyAttempt, b: DailyAttempt) => {
    if (a.runId !== b.runId || a.journeyId !== b.journeyId)
      return (a.startedAt ?? 0) > (b.startedAt ?? 0) ? a : b;
    const rank = (attempt: DailyAttempt) =>
      attempt.game.answers.length * 100 +
      attempt.game.roundIndex * 10 +
      { home: 0, playing: 1, feedback: 2, finished: 3, failed: 3 }[
        attempt.game.phase
      ];
    return rank(a) > rank(b) ? a : b;
  };
  return {
    empty: emptyDaily,
    valid: (value): value is DailyProgress => validDaily(value, catalog),
    recover: (value) => recoverDaily(value, catalog),
    encode(save) {
      return {
        ...(save.activeDate ? { activeDate: save.activeDate } : {}),
        // Progress belongs to a run; the currently chosen run is a separate
        // pointer. A stale tab editing an old run cannot change that selection.
        ...Object.fromEntries(
          [
            ...Object.values(save.archivedAttempts ?? {}),
            ...Object.values(save.attempts),
          ].map((attempt) => [runField(attempt), attempt]),
        ),
        ...Object.fromEntries(
          Object.entries(save.attempts).map(([key, value]) => [
            `selection.${key}`,
            { journeyId: value.journeyId, runId: value.runId },
          ]),
        ),
        ...Object.fromEntries(
          Object.entries(save.archivedAttempts ?? {}).map(([key, value]) => [
            `archive.${key}`,
            value,
          ]),
        ),
        ...Object.fromEntries(
          Object.entries(save.overrides ?? {}).map(([key, value]) => [
            `override.${key}`,
            value,
          ]),
        ),
      };
    },
    decode(fields) {
      const save: DailyProgress = { version: 1, attempts: {} };
      for (const [field, value] of Object.entries(fields)) {
        if (field === "activeDate" && value) save.activeDate = String(value);
        else if (field.startsWith("attempt.") && value)
          save.attempts[field.slice(8)] = value as DailyAttempt;
        else if (field.startsWith("archive.") && value)
          (save.archivedAttempts ??= {})[field.slice(8)] =
            value as DailyAttempt;
        else if (field.startsWith("override.") && value)
          (save.overrides ??= {})[field.slice(9)] = String(value);
      }
      for (const [field, value] of Object.entries(fields)) {
        if (!field.startsWith("selection.")) continue;
        const date = field.slice(10);
        const selected = value as Pick<
          DailyAttempt,
          "journeyId" | "runId"
        > | null;
        const attempt =
          selected &&
          (fields[runField({ ...selected, date })] as DailyAttempt | undefined);
        if (attempt) save.attempts[date] = attempt;
        else delete save.attempts[date];
      }
      // Keep readers compatible with the first record format and expose newer
      // progress submitted to a run after it was archived by another tab.
      for (const [date, attempt] of Object.entries(save.attempts)) {
        const latest = fields[runField(attempt)] as DailyAttempt | undefined;
        if (latest) save.attempts[date] = preferAttempt(attempt, latest);
      }
      for (const [key, attempt] of Object.entries(
        save.archivedAttempts ?? {},
      )) {
        const latest = fields[runField(attempt)] as DailyAttempt | undefined;
        if (latest)
          save.archivedAttempts![key] = preferAttempt(attempt, latest);
      }
      return save;
    },
    accepts(field, value) {
      if (field === "activeDate") {
        if (value === null) return true;
        if (typeof value !== "string") return false;
        try {
          dateOrdinal(value);
          return true;
        } catch {
          return false;
        }
      }
      if (field.startsWith("attempt."))
        return (
          value === null ||
          validDaily(
            { version: 1, attempts: { [field.slice(8)]: value } },
            catalog,
          )
        );
      if (field.startsWith("run."))
        return (
          value === null ||
          (isRecord(value) &&
            typeof value.date === "string" &&
            field === runField(value as unknown as DailyAttempt) &&
            validDaily(
              { version: 1, attempts: { [value.date]: value } },
              catalog,
            ))
        );
      if (field.startsWith("selection.")) {
        try {
          dateOrdinal(field.slice(10));
        } catch {
          return false;
        }
        return (
          value === null ||
          (isRecord(value) &&
            catalog.some((journey) => journey.id === value.journeyId) &&
            (value.runId === undefined || typeof value.runId === "string"))
        );
      }
      if (field.startsWith("archive."))
        return (
          value === null ||
          validDaily(
            {
              version: 1,
              attempts: {},
              archivedAttempts: { [field.slice(8)]: value },
            },
            catalog,
          )
        );
      if (field.startsWith("override."))
        return (
          value === null ||
          validDaily(
            {
              version: 1,
              attempts: {},
              overrides: { [field.slice(9)]: value },
            },
            catalog,
          )
        );
      return false;
    },
    resolve(field, previous, next) {
      if (
        !(
          field.startsWith("run.") ||
          field.startsWith("attempt.") ||
          field.startsWith("archive.")
        ) ||
        !previous ||
        !next
      )
        return next;
      return preferAttempt(previous as DailyAttempt, next as DailyAttempt);
    },
  };
}
export const createStudySave = () => new RecordSave(STUDY_KEY, studySaveCodec);
export const createDailySave = (catalog: JourneySummary[]) =>
  new RecordSave(DAILY_KEY, dailySaveCodec(catalog));
