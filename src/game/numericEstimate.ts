import type { KnowledgeRule, Question, Response } from "./questionContracts";

export type NumericRange = Extract<KnowledgeRule, { type: "numeric-range" }>;

/** The saved text register holds a numeric estimate, including a deliberate zero. */
export function estimateValue(rule: NumericRange, response: Response) {
  const value = Number(response.text);
  const steps = (value - rule.min) / rule.step;
  return response.text.trim() !== "" &&
    Number.isFinite(value) &&
    value >= rule.min &&
    value <= rule.max &&
    Math.abs(steps - Math.round(steps)) < 1e-7
    ? value
    : undefined;
}

export function estimateError(question: Question, response: Response) {
  if (question.rule.type !== "numeric-range") return undefined;
  const value = estimateValue(question.rule, response);
  return value === undefined
    ? undefined
    : Math.abs(value - question.rule.value);
}

export function estimateTier(question: Question, response: Response) {
  const error = estimateError(question, response);
  return question.rule.type === "numeric-range" && error !== undefined
    ? question.rule.tiers?.find((tier) => error <= tier.tolerance + 1e-7)
    : undefined;
}

export const formatEstimate = (value: number, unit: string) =>
  `${value.toLocaleString("en-US", { maximumFractionDigits: 10 })} ${unit}`;

export function estimateBands(question: Question, response: Response) {
  if (question.rule.type !== "numeric-range") return [];
  const tiers = question.rule.tiers ?? [];
  const achieved = estimateTier(question, response);
  return tiers.map((tier, index) => ({
    ...tier,
    index,
    count: tiers.length,
    label:
      index === 0
        ? "Bullseye"
        : index === tiers.length - 1
          ? "Within range"
          : "Close",
    achieved: tier === achieved,
  }));
}
