// Synchronous full-catalog API for authored-content checks and tooling.
// The browser shell uses dailyProgress to avoid eager Journey imports.
import { JOURNEYS } from "../game/journeys";
import type { Journey } from "../game/questionContracts";
import * as daily from "./dailyProgress";
export * from "./dailyProgress";
export const dailyJourney = (
  date: string,
  progress?: daily.DailyProgress,
  catalog: Journey[] = JOURNEYS,
) => daily.dailyJourney(date, progress, catalog);
export const validDaily = (
  value: unknown,
  catalog: Journey[] = JOURNEYS,
): value is daily.DailyProgress => daily.validDaily(value, catalog);
export const setDailyPuzzle = (
  progress: daily.DailyProgress,
  date: string,
  journeyId?: string,
  catalog: Journey[] = JOURNEYS,
) => daily.setDailyPuzzle(progress, date, journeyId, catalog);
export const openDaily = (
  progress: daily.DailyProgress,
  date: string,
  replay = false,
  catalog: Journey[] = JOURNEYS,
) => daily.openDaily(progress, date, replay, catalog);
