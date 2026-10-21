import { useCallback, useEffect, useRef, useState } from "react";
import type { JourneySummary } from "../game/journeyRegistry";
import { reportFailure } from "../services/monitoring";
import {
  DAILY_KEY,
  emptyDaily,
  localDateKey,
  resetDailyAttempt,
  validDaily,
} from "./dailyProgress";
import { createDailySave, createStudySave, progressKey } from "./progressSaves";
import { readSave } from "./storage";
import { useProgressSync } from "./useProgressSync";

/** Account-scoped save lifetime follows PlayerWorkspace's subject-keyed remount. */
export function usePlayerProgress({
  subject,
  accessToken,
  catalog,
  catalogReady,
}: {
  subject?: string;
  accessToken: () => Promise<string | undefined>;
  catalog: JourneySummary[];
  catalogReady: boolean;
}) {
  const dailyStore = useRef<ReturnType<typeof createDailySave> | undefined>(
    undefined,
  );
  const [dailyLoaded, setDailyLoaded] = useState(false);
  const [dailyRead] = useState(() =>
    readSave(progressKey(DAILY_KEY, subject), emptyDaily, validDaily),
  );
  const [studyStore] = useState(() => createStudySave(subject));
  const [daily, setDaily] = useState(dailyRead.value);
  const [study, setStudy] = useState(() => studyStore.load());
  const [dailySaveOk, setDailySaveOk] = useState(dailyRead.available);
  const [studySaveOk, setStudySaveOk] = useState(studyStore.writable);
  const [saveRecovered, setSaveRecovered] = useState(studyStore.recovered);
  const cloudSave = useProgressSync(
    subject,
    dailyLoaded ? dailyStore.current : undefined,
    studyStore,
    accessToken,
  );
  const canSave = dailySaveOk && studySaveOk;
  useEffect(() => {
    if (!canSave) reportFailure("local save");
  }, [canSave]);
  useEffect(() => {
    if (!catalogReady || dailyLoaded) return;
    const store = createDailySave(catalog, subject);
    dailyStore.current = store;
    setDaily(store.load());
    setDailySaveOk(store.writable);
    if (store.recovered) setSaveRecovered(true);
    setDailyLoaded(true);
  }, [catalogReady, dailyLoaded, catalog, subject]);
  useEffect(() => {
    if (!dailyLoaded || !dailyStore.current) return;
    const saved = dailyStore.current.save(daily);
    setDailySaveOk(saved.ok);
    if (!dailyStore.current.equivalent(saved.value, daily))
      setDaily(saved.value);
  }, [daily, dailyLoaded]);
  useEffect(() => {
    const saved = studyStore.save(study);
    setStudySaveOk(saved.ok);
    if (!studyStore.equivalent(saved.value, study)) setStudy(saved.value);
  }, [study, studyStore]);
  useEffect(() => {
    const change = (event: Event) => {
      const key =
        event instanceof StorageEvent
          ? event.key
          : (event as CustomEvent<string>).detail;
      if (dailyStore.current?.matches(key)) {
        try {
          const merge = dailyStore.current.incoming();
          setDaily((current) => {
            const value = merge(current);
            return dailyStore.current!.equivalent(current, value)
              ? current
              : value;
          });
        } catch {
          setDailySaveOk(false);
        }
      }
      if (studyStore.matches(key)) {
        try {
          const merge = studyStore.incoming();
          setStudy((current) => {
            const value = merge(current);
            return studyStore.equivalent(current, value) ? current : value;
          });
        } catch {
          setStudySaveOk(false);
        }
      }
    };
    addEventListener("storage", change);
    addEventListener("ambit-progress-received", change);
    return () => {
      removeEventListener("storage", change);
      removeEventListener("ambit-progress-received", change);
    };
  }, [studyStore]);
  const retrySaving = useCallback(() => {
    setStudySaveOk(studyStore.save(study).ok);
    if (dailyStore.current) setDailySaveOk(dailyStore.current.save(daily).ok);
    cloudSave.retry();
  }, [studyStore, study, daily, cloudSave.retry]);
  const resetAttempt = useCallback(
    (date: string) => {
      const store = dailyStore.current;
      if (!subject || !store || !cloudSave.hydrated || date !== localDateKey())
        return false;
      try {
        const current = store.load();
        if (!current.attempts[date]) return false;
        const saved = store.save(resetDailyAttempt(current, date));
        setDailySaveOk(saved.ok);
        if (!saved.ok) return false;
        setDaily(saved.value);
        cloudSave.retry();
        return true;
      } catch {
        setDailySaveOk(false);
        return false;
      }
    },
    [subject, cloudSave.hydrated, cloudSave.retry],
  );
  return {
    daily,
    setDaily,
    study,
    setStudy,
    dailyLoaded,
    canSave,
    saveRecovered,
    cloudSave,
    retrySaving,
    resetAttempt,
  };
}
