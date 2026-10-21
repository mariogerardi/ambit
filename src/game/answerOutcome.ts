import type { Question, Response } from "./questionContracts";
import type { BearingResult } from "./compassBearing";
import type { ConstructionResult } from "./constructionTypes";
import { bearingResult } from "./compassBearing";
import { evaluateConstruction } from "./construction";
import { pinDistance, pinDistanceTier } from "./answerTargets";
import { estimateError, estimateTier } from "./numericEstimate";

/** Canonical acceptance, accuracy reward and frozen evidence from one evaluation.
 * Help caps rewards separately; presentation/camera never participate. */
export interface AnswerOutcome {
  correct: boolean;
  accuracyPoints: number;
  bearing?: BearingResult;
  constructionResult?: ConstructionResult;
}
export type OutcomeEvaluator = (
  question: Question,
  response: Response,
  useSubmittedEvidence?: boolean,
) => AnswerOutcome | undefined;
const reward = (tier: number | null | undefined) =>
  tier === null || tier === undefined ? 0 : 3 - tier;

export const constructionOutcome: OutcomeEvaluator = (
  question,
  response,
  useSubmittedEvidence = false,
) => {
  const result =
    (useSubmittedEvidence ? response.constructionResult : undefined) ??
    evaluateConstruction(question, response);
  return {
    correct: !!result && result.tier !== null,
    accuracyPoints: reward(result?.tier),
    constructionResult: result,
  };
};
export const compassOutcome: OutcomeEvaluator = (question, response) => {
  const bearing = bearingResult(question, response);
  return {
    correct: !!bearing && bearing.tier !== null,
    accuracyPoints: reward(bearing?.tier),
    bearing,
  };
};
export const pinOutcome: OutcomeEvaluator = (question, response) => {
  if (question.rule.type !== "pin-distance") return;
  const distance = pinDistance(question, response);
  const correct =
    distance !== undefined && distance <= question.rule.radiusKm + 1e-7;
  const tier = pinDistanceTier(question, response);
  return {
    correct,
    accuracyPoints: correct
      ? question.rule.tiers?.length === 3 && tier
        ? 3 - question.rule.tiers.indexOf(tier)
        : 3
      : 0,
  };
};
export const estimateOutcome: OutcomeEvaluator = (question, response) => {
  if (question.rule.type !== "numeric-range") return;
  const error = estimateError(question, response);
  const correct =
    error !== undefined && error <= question.rule.tolerance + 1e-7;
  const tier = estimateTier(question, response);
  return {
    correct,
    accuracyPoints: correct
      ? question.rule.tiers?.length === 3 && tier
        ? 3 - question.rule.tiers.indexOf(tier)
        : 3
      : 0,
  };
};
