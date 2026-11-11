import type { ReactNode } from "react";
import type {
  Journey,
  Question,
  QuestionContext,
} from "../game/questionContracts";
import { startRound } from "../game/state";
import type { GameState } from "../game/state";
import { validGame } from "./dailyProgress";
import type { ThemeId } from "../theme/themes";

export const REVIEW_STAGES = [
  "play",
  "hint",
  "assist",
  "correct",
  "missed",
  "partial",
  "completion",
  "completion-mixed",
] as const;
export type ReviewStage = (typeof REVIEW_STAGES)[number] | `tier-${number}`;
export function isReviewStage(value: string): value is ReviewStage {
  return (
    REVIEW_STAGES.some((stage) => stage === value) ||
    /^tier-[1-9]\d*$/.test(value)
  );
}

export function reviewOutcomes(question: Question) {
  const rule = question.rule;
  const canMiss = !(
    question.partialCredit === "one-of-two" &&
    rule.type === "country-ids" &&
    question.selection.type === "ids" &&
    question.selection.ids.filter((id) => !rule.ids.includes(id)).length <
      question.count
  );
  const outcomes: { stage: ReviewStage; label: string }[] = [
    { stage: "correct", label: "Correct" },
  ];
  if (canMiss) outcomes.push({ stage: "missed", label: "Missed" });
  if (
    rule.type === "pin-distance" ||
    rule.type === "numeric-range" ||
    rule.type === "bearing-angle"
  ) {
    rule.tiers?.forEach((tier, index) => {
      if (index > 0)
        outcomes.push({ stage: `tier-${index}`, label: tier.feedback });
    });
  } else if (question.partialCredit === "one-of-two") {
    outcomes.push({ stage: "partial", label: "One of two" });
  }
  return outcomes;
}
export interface JourneyReviewSource {
  /** Changes only for a new navigation request, never ordinary preview actions. */
  requestKey?: string;
  journey: Journey;
  seed: number;
  theme?: ThemeId;
  stage: ReviewStage;
  questionId?: string;
  navigation?: ReactNode;
  catalog?: ReactNode;
  onInspect?(index: number, stage: ReviewStage): void;
  /** Leave this isolated source workspace with a full document navigation. */
  onExit?(path: string): void;
}
export function reviewRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
export function reviewRound(journey: Journey, index: number, seed?: number) {
  if (!journey.rounds[index]) throw Error("Unknown review question.");
  return startRound(
    journey.rounds[index],
    index,
    seed === undefined ? Math.random : reviewRandom(seed + index),
  );
}
export async function reviewState(
  journey: Journey,
  context: QuestionContext,
  index: number,
  stage: ReviewStage,
  seed?: number,
): Promise<GameState> {
  const { gameReducer } = await import("../game/state");
  let game = reviewRound(journey, index, seed);
  if (stage === "play") return game;
  if (
    stage === "missed" &&
    journey.rounds[index].partialCredit === "one-of-two"
  ) {
    const question = journey.rounds[index];
    const { selectableIds, solutionIds, responseCount } = await import(
      "../game/questionPreparation"
    );
    const correct = new Set(solutionIds(question, context));
    const wrong = selectableIds(question, context)
      .filter((id) => !correct.has(id))
      .slice(0, responseCount(question, context));
    for (const id of wrong)
      game = gameReducer(game, { type: "select", id }, journey, context);
    if (game.phase === "playing")
      game = gameReducer(game, { type: "submit" }, journey, context);
    if (game.answers.at(-1)?.points !== 0)
      throw Error(
        "A fully missed example is unavailable for this question. Try an answer in the player view.",
      );
    return game;
  }
  if (stage === "hint" || stage === "assist") {
    if (
      !journey.rounds[index].guidance ||
      (stage === "assist" && !journey.rounds[index].guidance?.assist)
    )
      throw Error("This question does not provide that help stage.");
    game = gameReducer(game, { type: "request-hint" }, journey, context);
    return stage === "assist"
      ? gameReducer(game, { type: "request-assist" }, journey, context)
      : game;
  }
  const { submitSample, submitPartialSample } = await import(
    "../game/journeyAudit"
  );
  if (stage.startsWith("tier-")) {
    const tierIndex = Number(stage.slice(5));
    const question = journey.rounds[index];
    const rule = question.rule;
    const { answerPlace } = await import("../game/answerTargets");
    const { initialBearing, normalizeBearing, pointAlongBearing } =
      await import("../game/geodesic");
    if (rule.type === "pin-distance" && rule.tiers?.[tierIndex]) {
      const target = answerPlace(question, rule.targetId);
      if (!target) throw Error("The target location is unavailable.");
      const km =
        (rule.tiers[tierIndex - 1].radiusKm + rule.tiers[tierIndex].radiusKm) /
        2;
      game = gameReducer(
        game,
        { type: "drop-pin", ...pointAlongBearing(target, 90, km / 6371.0088) },
        journey,
        context,
      );
    } else if (rule.type === "bearing-angle" && rule.tiers[tierIndex]) {
      const offset =
        (rule.tiers[tierIndex - 1].degrees + rule.tiers[tierIndex].degrees) / 2;
      game = gameReducer(
        game,
        {
          type: "text",
          value: String(
            normalizeBearing(
              Math.round(
                initialBearing(rule.origin, rule.destination) + offset,
              ),
            ),
          ),
        },
        journey,
        context,
      );
    } else if (rule.type === "numeric-range" && rule.tiers?.[tierIndex]) {
      const low = rule.tiers[tierIndex - 1].tolerance;
      const high = rule.tiers[tierIndex].tolerance;
      const { estimateTier } = await import("../game/numericEstimate");
      const candidates = [1, -1].flatMap((sign) =>
        [low + rule.step, (low + high) / 2, high].map(
          (offset) =>
            rule.min +
            Math.round((rule.value + sign * offset - rule.min) / rule.step) *
              rule.step,
        ),
      );
      const value = candidates.find(
        (value) =>
          value >= rule.min &&
          value <= rule.max &&
          estimateTier(question, { ...game, text: String(value) }) ===
            rule.tiers![tierIndex],
      );
      if (value === undefined)
        throw Error(
          "No example fits this score band. Try an answer in the player view.",
        );
      game = gameReducer(
        game,
        { type: "text", value: String(value) },
        journey,
        context,
      );
    } else throw Error("This question does not provide that outcome.");
    game = gameReducer(game, { type: "submit" }, journey, context);
    if (
      game.phase !== "feedback" ||
      game.answers.at(-1)?.points !== 3 - tierIndex
    )
      throw Error(
        "An example for this score band is unavailable. Try an answer in the player view.",
      );
    return game;
  }
  if (stage === "partial") {
    const partial = submitPartialSample(
      journey,
      journey.rounds[index],
      context,
      index,
    );
    if (!partial)
      throw Error(
        "An example for this outcome is unavailable. Try an answer in the player view.",
      );
    return partial;
  }
  if (stage === "completion" || stage === "completion-mixed") {
    const answers: GameState["answers"] = [];
    for (const [i, question] of journey.rounds.entries()) {
      const result = submitSample(
        journey,
        question,
        context,
        i,
        stage === "completion" || i % 2 === 0,
      );
      if (!result)
        throw Error(
          "A sample completion is unavailable. Play through the review instead.",
        );
      answers.push(...result.answers);
      game = result;
    }
    return { ...game, answers, phase: "finished" };
  }
  const result = submitSample(
    journey,
    journey.rounds[index],
    context,
    index,
    stage === "correct",
  );
  if (!result)
    throw Error(
      "An example answer is unavailable. Try your own answer in the review.",
    );
  return result;
}

export function captureReview(journey: Journey, game: GameState) {
  return JSON.stringify(
    {
      version: 1,
      journeyId: journey.id,
      revision: journey.saveRevision ?? 1,
      game,
    },
    null,
    2,
  );
}
export function restoreReview(journey: Journey, text: string): GameState {
  const value = JSON.parse(text);
  if (
    value?.version !== 1 ||
    value.journeyId !== journey.id ||
    value.revision !== (journey.saveRevision ?? 1) ||
    !validGame(value.game, journey)
  )
    throw Error(
      "This capture does not match the Journey and its current answer contracts.",
    );
  return value.game;
}
