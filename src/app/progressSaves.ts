import { RecordSave } from "./recordSave";
import type { SaveCodec } from "./recordSave";
import { isRecord } from "./storage";
import { mergeHelp } from "../game/guidance";
import {
  DAILY_KEY,
  emptyDaily,
  validDaily,
  recoverDaily,
  dateOrdinal,
  upgradeDailyAttempt,
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
} from "../study/engine";
import type { StudySave, StudyRecord, StudySession } from "../study/engine";
const optionalSettings = new Set([
  "choiceCount",
  "capitalDistractors",
  "revisitMissed",
  "perTopicMethods",
]);

export const studySaveCodec: SaveCodec<StudySave> = {
  empty: emptyStudy,
  valid: validStudy,
  recover: recoverStudy,
  encode(save) {
    const persistent = save;
    const session = save.session && {
      ...save.session,
      id: save.session.id ?? `legacy-study-${save.session.seed}`,
      text: "",
      choiceId: "",
    };
    return {
      activeSession: session?.id ?? null,
      ...(session
        ? {
            [`session.${session.id}`]: session,
            [`draft.${session.id}/${session.prompt.ordinal}`]: {
              text: save.session!.text,
              choiceId: save.session!.choiceId,
            },
          }
        : {}),
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
    let session = fields[`session.${fields.activeSession}`] as
      | StudySession
      | undefined;
    if (session) {
      const draft = fields[`draft.${session.id}/${session.prompt.ordinal}`] as
        | { text: string; choiceId: string }
        | undefined;
      session = { ...session, ...(session.phase === "playing" ? draft : {}) };
    }
    return {
      version: 1,
      settings,
      ...(session ? { session } : {}),
      ...(history.length ? { history } : {}),
    };
  },
  accepts(field, value) {
    if (field === "activeSession")
      return value === null || typeof value === "string";
    if (field.startsWith("session."))
      return (
        isRecord(value) &&
        field === `session.${value.id}` &&
        validStudy({ version: 1, settings: defaultSettings, session: value })
      );
    if (field.startsWith("draft."))
      return (
        isRecord(value) &&
        typeof value.text === "string" &&
        value.text.length <= 10000 &&
        typeof value.choiceId === "string" &&
        value.choiceId.length <= 200
      );
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
  retain: (field) =>
    field.startsWith("session.") ||
    field.startsWith("draft.") ||
    field.startsWith("history."),
  resolve(field, previous, next) {
    if (field.startsWith("session.")) {
      const rank = (session: StudySession) =>
        session.history.length * 100 +
        session.prompt.ordinal * 10 +
        { playing: 0, feedback: 1, summary: 2 }[session.phase];
      return rank(previous as StudySession) > rank(next as StudySession)
        ? previous
        : next;
    }
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
    a = upgradeDailyAttempt(a, catalog);
    b = upgradeDailyAttempt(b, catalog);
    if (a.runId !== b.runId || a.journeyId !== b.journeyId)
      return (a.startedAt ?? 0) > (b.startedAt ?? 0) ? a : b;
    const rank = (attempt: DailyAttempt) =>
      attempt.game.answers.length * 100 +
      attempt.game.roundIndex * 10 +
      { home: 0, playing: 1, feedback: 2, finished: 3, failed: 3 }[
        attempt.game.phase
      ];
    const preferred = rank(a) > rank(b) ? a : b;
    return a.game.help || b.game.help
      ? {
          ...preferred,
          game: {
            ...preferred.game,
            help: mergeHelp(a.game.help, b.game.help),
          },
        }
      : preferred;
  };
  return {
    empty: emptyDaily,
    valid: (value): value is DailyProgress => validDaily(value, catalog),
    recover: (value) => recoverDaily(value, catalog),
    encode(save) {
      return {
        ...(save.activeDate ? { activeDate: save.activeDate } : {}),
        ...Object.fromEntries(
          Object.entries(save.resets ?? {}).map(([key, cutoff]) => [
            `reset.${key}`,
            cutoff,
          ]),
        ),
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
        else if (field.startsWith("reset.") && typeof value === "number")
          (save.resets ??= {})[field.slice(6)] = value;
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
        save.attempts[date] = latest
          ? preferAttempt(attempt, latest)
          : upgradeDailyAttempt(attempt, catalog);
      }
      for (const [key, attempt] of Object.entries(
        save.archivedAttempts ?? {},
      )) {
        const latest = fields[runField(attempt)] as DailyAttempt | undefined;
        save.archivedAttempts![key] = latest
          ? preferAttempt(attempt, latest)
          : upgradeDailyAttempt(attempt, catalog);
      }
      const cleared = (attempt: DailyAttempt) => {
        const cutoff = save.resets?.[`${attempt.date}/${attempt.journeyId}`];
        return cutoff !== undefined && (attempt.startedAt ?? 0) <= cutoff;
      };
      for (const [date, attempt] of Object.entries(save.attempts))
        if (cleared(attempt)) delete save.attempts[date];
      for (const [key, attempt] of Object.entries(save.archivedAttempts ?? {}))
        if (cleared(attempt)) delete save.archivedAttempts![key];
      if (save.activeDate && !save.attempts[save.activeDate])
        delete save.activeDate;
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
      if (field.startsWith("reset."))
        return validDaily(
          { version: 1, attempts: {}, resets: { [field.slice(6)]: value } },
          catalog,
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
      if (field.startsWith("reset."))
        return Math.max(Number(previous), Number(next));
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
export const progressKey = (key: string, subject?: string) =>
  subject ? `${key}.account.${encodeURIComponent(subject)}` : key;

function accountStore<T>(key: string, codec: SaveCodec<T>, subject?: string) {
  const store = new RecordSave(progressKey(key, subject), codec);
  if (!subject || !store.writable) return store;
  try {
    const marker = `${store.prefix}guest-imported`;
    if (localStorage.getItem(marker)) return store;
    const owner = localStorage.getItem("ambit.guest-progress-owner");
    if (owner && owner !== subject) return store;
    const guest = new RecordSave(key, codec);
    if (!guest.writable) return store;
    const entries = guest.entries();
    // An empty guest profile must not override preferences already in the cloud.
    if (
      !entries.some((entry) =>
        /^(run|attempt|history|session)\./.test(entry.field),
      )
    )
      return store;
    const device =
      localStorage.getItem("ambit.guest-import-device") ?? crypto.randomUUID();
    localStorage.setItem("ambit.guest-import-device", device);
    // Claim before copying so a partial import cannot leak into another account.
    localStorage.setItem("ambit.guest-progress-owner", subject);
    store.mergeEntries(
      entries
        .filter((entry) => !entry.field.startsWith("override."))
        .map((entry) => ({
          ...entry,
          writer: `zguest.${device}.${entry.writer}`,
        })),
    );
    localStorage.setItem(marker, "1");
  } catch {
    /* Keep the original guest save and retry the import next time. */
  }
  return store;
}
export const createStudySave = (subject?: string) =>
  accountStore(STUDY_KEY, studySaveCodec, subject);
export const createDailySave = (catalog: JourneySummary[], subject?: string) =>
  accountStore(DAILY_KEY, dailySaveCodec(catalog), subject);
