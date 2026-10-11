import { useCallback, useEffect, useRef, useState } from "react";
import { dateOrdinal } from "../app/dailyProgress";
import { JOURNEY_INDEX } from "../game/journeyRegistry";
import { serviceConfig } from "./config";

export interface JourneySchedule {
  revision: number;
  assignments: Record<string, string>;
}
export function validJourneySchedule(value: unknown): value is JourneySchedule {
  if (!value || typeof value !== "object") return false;
  const schedule = value as JourneySchedule;
  return (
    Number.isInteger(schedule.revision) &&
    schedule.revision >= 0 &&
    !!schedule.assignments &&
    typeof schedule.assignments === "object" &&
    !Array.isArray(schedule.assignments) &&
    Object.entries(schedule.assignments).every(([date, id]) => {
      try {
        dateOrdinal(date);
      } catch {
        return false;
      }
      return JOURNEY_INDEX.some((journey) => journey.id === id);
    })
  );
}
async function request(
  token?: string,
  body?: unknown,
): Promise<JourneySchedule> {
  const response = await fetch(
    `${serviceConfig.apiUrl}${body ? "/admin/journeys/schedule" : "/journeys/schedule"}`,
    {
      method: body ? "PATCH" : "GET",
      signal: AbortSignal.timeout(15000),
      headers: body
        ? {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          }
        : {},
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  );
  if (!response.ok)
    throw Error(
      response.status === 409
        ? "The schedule changed in another session. Refresh the schedule before saving again."
        : response.status === 403 || response.status === 401
          ? "Sign in with an admin account to change the schedule."
          : "Couldn’t load or save the Journey schedule. Please try again.",
    );
  const schedule: unknown = await response.json();
  if (!validJourneySchedule(schedule))
    throw Error("The Journey schedule could not be read. Please try again.");
  return schedule;
}
export function useJourneySchedule() {
  const [schedule, setSchedule] = useState<JourneySchedule>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const epoch = useRef(0);
  const reading = useRef(false);
  const writing = useRef(false);
  const refresh = useCallback(async () => {
    if (reading.current || writing.current) return;
    reading.current = true;
    const version = ++epoch.current;
    try {
      const result = await request();
      if (version === epoch.current) {
        setSchedule(result);
        setError("");
      }
    } catch (error) {
      if (version === epoch.current)
        setError(
          error instanceof Error
            ? error.message
            : "Couldn’t load the Journey schedule.",
        );
    } finally {
      reading.current = false;
    }
  }, []);
  useEffect(() => {
    void refresh();
    const wake = () => {
      if (document.visibilityState !== "hidden") void refresh();
    };
    const timer = setInterval(wake, 60000);
    addEventListener("focus", wake);
    addEventListener("online", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      epoch.current++;
      reading.current = false;
      clearInterval(timer);
      removeEventListener("focus", wake);
      removeEventListener("online", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [refresh]);
  const save = async (
    date: string,
    journeyId: string | undefined,
    token: string,
  ) => {
    if (!schedule || writing.current) return false;
    writing.current = true;
    const version = ++epoch.current;
    setBusy(true);
    setError("");
    try {
      const result = await request(token, {
        date,
        journeyId: journeyId ?? null,
        revision: schedule.revision,
      });
      if (version === epoch.current) setSchedule(result);
      return true;
    } catch (error) {
      if (version === epoch.current)
        setError(
          error instanceof Error
            ? error.message
            : "Couldn’t save the schedule.",
        );
      return false;
    } finally {
      writing.current = false;
      if (version === epoch.current) setBusy(false);
    }
  };
  return { schedule, ready: !!schedule, error, busy, refresh, save };
}
