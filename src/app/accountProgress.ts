import { dateOrdinal, localDateKey } from "./dailyProgress";
import type { DailyProgress } from "./dailyProgress";
import { studyComplete, leaveStudy, startStudy } from "../study/engine";
import type { StudySave } from "../study/engine";
import type { JourneyScore, Challenge } from "../services/community";
import { helpSummary } from "../game/guidance";

export function openStudyChallenge(
  save: StudySave,
  challenge: Challenge,
): StudySave {
  if (
    save.session?.challengeId === challenge.id &&
    save.session.phase !== "summary"
  )
    return save;
  return {
    ...leaveStudy(save),
    settings: challenge.settings,
    session: {
      ...startStudy(challenge.settings, challenge.seed),
      id: crypto.randomUUID(),
      challengeId: challenge.id,
    },
  };
}

export function accountProgress(
  daily: DailyProgress,
  study: StudySave,
  today = localDateKey(),
) {
  const attempts = new Map<string, (typeof daily.attempts)[string]>();
  for (const attempt of [
    ...Object.values(daily.archivedAttempts ?? {}),
    ...Object.values(daily.attempts),
  ]) {
    const key = `${attempt.date}/${attempt.journeyId}`;
    const previous = attempts.get(key);
    if (!previous || (attempt.startedAt ?? 0) >= (previous.startedAt ?? 0))
      attempts.set(key, attempt);
  }
  const journeys: JourneyScore[] = [...attempts.values()]
    .filter((a) => a.game.phase === "finished" || a.game.phase === "failed")
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((a) => ({
      date: a.date,
      journeyId: a.journeyId,
      correct: a.game.answers.filter((answer) => answer.correct).length,
      total: 5,
      ...(a.game.help ? { help: helpSummary(a.game) } : {}),
    }));
  const completedDays = new Set(journeys.map((a) => dateOrdinal(a.date)));
  let day = dateOrdinal(today),
    streak = 0;
  if (!completedDays.has(day)) day--;
  while (completedDays.has(day--)) streak++;
  const records = [
    ...new Map((study.history ?? []).map((r) => [r.id, r])).values(),
  ].sort((a, b) => b.finishedAt - a.finishedAt);
  const answers = records.flatMap((r) => r.session.history);
  return {
    journeys,
    streak,
    records,
    sessions: records.filter((r) => studyComplete(r.session)).length,
    questions: answers.length,
    accuracy: answers.length
      ? Math.round(
          (100 * answers.filter((a) => a.correct).length) / answers.length,
        )
      : undefined,
  };
}
