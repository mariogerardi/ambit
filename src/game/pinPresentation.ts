import type { Question, Response } from "./questionContracts";
import { pinDistanceTier } from "./answerTargets";

/** Display-only bands. Acceptance and points remain owned by the grading contract. */
export function pinBands(question: Question, response: Response) {
  if (question.rule.type !== "pin-distance") return [];
  const tiers = question.rule.tiers;
  if (!tiers?.length) return [];
  const achieved = pinDistanceTier(question, response);
  return tiers.map((tier, index) => ({
    ...tier,
    index,
    count: tiers.length,
    label:
      index === 0
        ? "Bullseye"
        : index === tiers.length - 1
          ? "Within range"
          : tiers.length === 3
            ? "Close"
            : `Band ${index + 1}`,
    achieved: tier === achieved,
  }));
}
