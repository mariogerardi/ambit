import { useCallback, useEffect, useRef, useState } from "react";
import { dateOrdinal, localDateKey } from "../app/dailyProgress";
import { JOURNEY_INDEX } from "../game/journeyRegistry";
import { reportFailure } from "./monitoring";
import { serviceConfig } from "./config";

export interface DayRecord {
  day: string;
  journeyId: string | null;
  source: "assigned" | "auto" | "provisional";
  revision: number;
  lockedAt?: string;
  autoJourneyId?: string;
}
export interface JourneySchedule {
  today: string;
  records: Record<string, DayRecord>;
  /** Effective stored choices; missing dates use the provisional seeded pick. */
  assignments: Record<string, string>;
}
const dateAt = (ordinal: number) =>
  new Date(ordinal * 86400000).toISOString().slice(0, 10);
const rangeFor = (month?: string) => {
  const first = month ? `${month}-01` : localDateKey();
  const start = dateOrdinal(first);
  const end = month
    ? dateOrdinal(new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10))
    : start + 31;
  return { from: dateAt(start - 14), to: dateAt(end + 14) };
};
export function validJourneySchedule(value: unknown): value is Pick<JourneySchedule, "today" | "records"> {
  if (!value || typeof value !== "object") return false;
  const schedule = value as JourneySchedule;
  try {
    dateOrdinal(schedule.today);
    return !!schedule.records && typeof schedule.records === "object" && !Array.isArray(schedule.records) &&
      Object.entries(schedule.records).every(([day, record]) => {
        dateOrdinal(day);
        return record?.day === day && ["assigned", "auto", "provisional"].includes(record.source) &&
          Number.isInteger(record.revision) && record.revision >= 0 &&
          (record.journeyId === null || typeof record.journeyId === "string");
      });
  } catch { return false; }
}
function merge(previous: JourneySchedule | undefined, incoming: Pick<JourneySchedule, "today" | "records">): JourneySchedule {
  const records = { ...previous?.records };
  for (const [day, record] of Object.entries(incoming.records))
    if (!records[day] || record.revision >= records[day].revision) records[day] = record;
  const assignments = Object.fromEntries(Object.entries(records)
    .filter(([, record]) => record.source !== "provisional" && !!record.journeyId)
    .map(([day, record]) => [day, record.journeyId as string]));
  return { today: incoming.today, records, assignments };
}
async function request(token?: string, body?: unknown, month?: string, admin = false): Promise<Pick<JourneySchedule, "today" | "records">> {
  const range = month ? rangeFor(month) : rangeFor();
  const query = body || admin ? "" : `?${new URLSearchParams(range)}`;
  const response = await fetch(`${serviceConfig.apiUrl}${body || admin ? "/admin/journeys/schedule" : "/journeys/schedule"}${query}`, {
    method: body ? "PATCH" : "GET",
    signal: AbortSignal.timeout(15000),
    headers: body ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` } : admin ? { Authorization: `Bearer ${token}` } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok)
    throw Error(response.status === 409 ? "The schedule changed or this day is past. Refresh before saving again." :
      response.status === 403 || response.status === 401 ? "Sign in with an admin account to change the schedule." :
      "Couldn’t load or save the Journey schedule. Please try again.");
  const schedule: unknown = await response.json();
  if (!validJourneySchedule(schedule)) throw Error("Couldn’t read the Journey schedule. Please try again.");
  return schedule;
}
export function useJourneySchedule() {
  const [schedule, setSchedule] = useState<JourneySchedule>();
  const [error, setError] = useState("");
  const [loadedMonths, setLoadedMonths] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const epoch = useRef(0);
  const reading = useRef(false);
  const writing = useRef(false);
  const queued = useRef<{ month?: string } | undefined>(undefined);
  const reported = useRef(new Set<string>());
  useEffect(() => {
    if (!schedule) return;
    for (const [day, record] of Object.entries(schedule.records)) {
      if (day < schedule.today || !record.journeyId || record.source === "provisional" ||
        JOURNEY_INDEX.some((journey) => journey.id === record.journeyId || journey.supersedes === record.journeyId) ||
        reported.current.has(day)) continue;
      reported.current.add(day);
      reportFailure("Journey schedule unavailable", { day });
    }
  }, [schedule]);
  const refresh = useCallback(async (month?: string) => {
    if (reading.current || writing.current) { queued.current = { month }; return; }
    reading.current = true;
    const version = epoch.current;
    try {
      const result = await request(undefined, undefined, month);
      if (version === epoch.current) {
        setSchedule((prior) => merge(prior, result)); setError("");
        if (month) setLoadedMonths(prior => prior.includes(month) ? prior : [...prior, month]);
      }
    } catch (failure) {
      if (version === epoch.current) setError(failure instanceof Error ? failure.message : "Couldn’t load the Journey schedule.");
    } finally {
      reading.current = false;
      const next = queued.current;
      queued.current = undefined;
      if (next && version === epoch.current) void refresh(next.month);
    }
  }, []);
  const refreshAll = useCallback(async (token: string) => {
    const version = epoch.current;
    try {
      const result = await request(token, undefined, undefined, true);
      if (version === epoch.current) { setSchedule((prior) => merge(prior, result)); setError(""); }
    } catch (failure) {
      if (version === epoch.current) setError(failure instanceof Error ? failure.message : "Couldn’t load schedule history.");
    }
  }, []);
  useEffect(() => {
    void refresh();
    const wake = () => { if (document.visibilityState !== "hidden") void refresh(); };
    const timer = setInterval(wake, 60000);
    addEventListener("focus", wake);
    addEventListener("online", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      epoch.current++;
      reading.current = false;
      queued.current = undefined;
      clearInterval(timer);
      removeEventListener("focus", wake);
      removeEventListener("online", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [refresh]);
  const save = async (date: string, journeyId: string | undefined, token: string, rewriteHistory = false) => {
    if (!schedule || writing.current) return false;
    writing.current = true;
    const version = epoch.current;
    setBusy(true);
    setError("");
    try {
      const result = await request(token, { date, journeyId: journeyId ?? null, revision: schedule.records[date]?.revision ?? 0, ...(rewriteHistory ? { rewriteHistory: true } : {}) });
      if (version === epoch.current) setSchedule((prior) => merge(prior, result));
      return true;
    } catch (failure) {
      if (version === epoch.current) setError(failure instanceof Error ? failure.message : "Couldn’t save the schedule.");
      return false;
    } finally {
      writing.current = false;
      if (version === epoch.current) {
        setBusy(false);
        const next = queued.current;
        queued.current = undefined;
        if (next) void refresh(next.month);
      }
    }
  };
  return { schedule, ready: !!schedule, error, busy, loadedMonths, refresh, refreshAll, save };
}
