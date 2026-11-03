import type { ReactNode } from "react";
import type { Journey, QuestionContext } from "../game/questionContracts";
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
  "completion",
  "completion-mixed",
] as const;
export type ReviewStage = (typeof REVIEW_STAGES)[number];
export interface JourneyReviewSource {
  journey: Journey;
  seed: number;
  theme?: ThemeId;
  stage: ReviewStage;
  questionId?: string;
  navigation?: ReactNode;
  onInspect?(index: number, stage: ReviewStage): void;
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
  const { submitSample } = await import("../game/journeyAudit");
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
