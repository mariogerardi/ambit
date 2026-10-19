import type { Question, Response } from "./questionContracts";
import type { Answer, GameState } from "./state";
import type { HelpStage } from "./guidance";
import { pinDistanceTier } from "./answerTargets";

export const QUESTION_POINTS = 3;
export const POINTS_VERSION = 1;
export const pointCeiling = (help?: HelpStage) =>
  help === "assisted" ? 1 : help === "hinted" ? 2 : QUESTION_POINTS;

/** Acceptance stays boolean; distance accuracy and help independently cap rewards. */
export function submittedPoints(
  question: Question,
  response: Response,
  correct: boolean,
  help?: HelpStage,
) {
  if (!correct) return 0;
  let earned = QUESTION_POINTS;
  if (
    question.rule.type === "pin-distance" &&
    question.rule.tiers?.length === 3
  ) {
    const tier = pinDistanceTier(question, response);
    if (tier) earned -= question.rule.tiers.indexOf(tier);
  }
  return Math.min(earned, pointCeiling(help));
}

/** Historical answers retain full prior credit; never regrade old coordinates/facts. */
export function answerPoints(answer: Answer | undefined, help?: HelpStage) {
  if (!answer?.correct) return 0;
  if (answer.pointsVersion === undefined && answer.points === undefined)
    return QUESTION_POINTS;
  if (
    answer.pointsVersion !== POINTS_VERSION ||
    !Number.isInteger(answer.points) ||
    answer.points! < 0 ||
    answer.points! > QUESTION_POINTS
  )
    return 0;
  // Stronger help can arrive from another tab after the answer snapshot.
  return Math.min(answer.points!, pointCeiling(help));
}
export const journeyPoints = (game: Pick<GameState, "answers" | "help">) =>
  game.answers.reduce(
    (sum, answer) => sum + answerPoints(answer, game.help?.[answer.roundId]),
    0,
  );
export const legacyPointCredit = (game: Pick<GameState, "answers">) =>
  game.answers.some(
    (a) => a.pointsVersion === undefined && a.points === undefined,
  );

export function scorePointTotals(score: {
  correct: number;
  total: number;
  points?: number;
  maxPoints?: number;
}) {
  const maximum = score.total * QUESTION_POINTS;
  return {
    earned:
      Number.isInteger(score.points) &&
      score.maxPoints === maximum &&
      score.points! >= 0 &&
      score.points! <= maximum
        ? score.points!
        : score.correct * QUESTION_POINTS,
    maximum,
  };
}
