import { dateOrdinal, localDateKey } from "./dailyProgress";
import type { DailyProgress } from "./dailyProgress";
import {
  studyComplete,
  leaveStudy,
  startStudy,
  COUNTRIES,
} from "../study/engine";
import type { StudySave } from "../study/engine";
import type { JourneyScore, Challenge } from "../services/community";
import { helpSummary } from "../game/guidance";
import { journeyPoints, legacyPointCredit } from "../game/points";

const countryIds = new Set(COUNTRIES.map((country) => country.id));

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
  const completed = [...attempts.values()].filter(
    (a) => a.game.phase === "finished" || a.game.phase === "failed",
  );
  const journeys: JourneyScore[] = completed
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((a) => ({
      date: a.date,
      journeyId: a.journeyId,
      correct: a.game.answers.filter((answer) => answer.correct).length,
      total: 5,
      points: journeyPoints(a.game),
      maxPoints: 15,
      legacyPoints: legacyPointCredit(a.game),
      ...(a.game.help ? { help: helpSummary(a.game) } : {}),
    }));
  const completedDays = new Set(journeys.map((a) => dateOrdinal(a.date)));
  let day = dateOrdinal(today),
    streak = 0;
  if (!completedDays.has(day)) day--;
  while (completedDays.has(day--)) streak++;
  let longestStreak = 0,
    consecutive = 0,
    previousDay = -Infinity;
  for (const day of [...completedDays].sort((a, b) => a - b)) {
    consecutive = day === previousDay + 1 ? consecutive + 1 : 1;
    longestStreak = Math.max(longestStreak, consecutive);
    previousDay = day;
  }
  const records = [
    ...new Map((study.history ?? []).map((r) => [r.id, r])).values(),
  ].sort((a, b) => b.finishedAt - a.finishedAt);
  const answers = records.flatMap((r) => r.session.history);
  const journeyAnswers = completed.flatMap((attempt) => attempt.game.answers);
  const journeyCorrect = journeyAnswers.filter(
    (answer) => answer.correct,
  ).length;
  const practiced = new Set(
    answers
      .filter(
        (answer) =>
          answer.prompt.topic !== "places" &&
          countryIds.has(answer.prompt.targetId),
      )
      .map((answer) => answer.prompt.targetId),
  );
  let bestStudyStreak = 0;
  for (const record of records) {
    let consecutive = 0;
    for (const answer of record.session.history) {
      consecutive = answer.correct ? consecutive + 1 : 0;
      bestStudyStreak = Math.max(bestStudyStreak, consecutive);
    }
  }
  return {
    journeys,
    streak,
    longestStreak,
    perfectJourneys: journeys.filter((journey) => journey.points === 15).length,
    journeyAnswers: journeyAnswers.length,
    journeyCorrect,
    journeyAccuracy: journeyAnswers.length
      ? Math.round((100 * journeyCorrect) / journeyAnswers.length)
      : undefined,
    records,
    sessions: records.filter((r) => studyComplete(r.session)).length,
    questions: answers.length,
    studyCorrect: answers.filter((answer) => answer.correct).length,
    countriesPracticed: practiced.size,
    bestStudyStreak,
    accuracy: answers.length
      ? Math.round(
          (100 * answers.filter((a) => a.correct).length) / answers.length,
        )
      : undefined,
  };
}
