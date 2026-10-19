import type { Question, QuestionContext, Response } from "./questionContracts";
import type { Focus } from "../geography/types";
import type { GameState } from "./state";
import { answerPlace, pinDistanceTier, validPin } from "./answerTargets";
import { geoDistance, geoInterpolate } from "d3-geo";

/** Keep local authored explanations; compare distant pins when one view can show both.
 * Extremely distant/antipodal guesses use the explicit answer/guess review controls.
 */
export function pinReviewViews(
  question: Question,
  context: QuestionContext,
  game: GameState,
  preferred?: Focus,
) {
  if (
    game.phase !== "feedback" ||
    question.mode !== "pin" ||
    !validPin(game.pin)
  )
    return undefined;
  const rule = question.rule;
  const target =
    rule.type === "pin-distance"
      ? answerPlace(question, rule.targetId)
      : rule.type === "pin-inside"
        ? context.targets.get(rule.ids[0])?.focus
        : undefined;
  if (!target) return undefined;
  const answer: Focus = preferred ??
    question.feedbackFocus ?? {
      lat: target.lat,
      lng: target.lng,
      altitude: 0.65,
    };
  const guess: Focus = {
    ...game.pin,
    altitude: Math.max(0.4, Math.min(0.85, answer.altitude ?? 0.65)),
  };
  let overview = answer;
  if (rule.type === "pin-distance" && !game.answers.at(-1)?.correct) {
    const a: [number, number] = [target.lng, target.lat];
    const b: [number, number] = [game.pin.lng, game.pin.lat];
    const separation = geoDistance(a, b);
    const horizon = Math.acos(1 / (1 + (answer.altitude ?? 0.65)));
    if (
      geoDistance([answer.lng, answer.lat], b) > horizon * 0.6 &&
      separation <= (Math.PI * 5) / 6
    ) {
      const [lng, lat] = geoInterpolate(a, b)(0.5);
      const half = separation / 2;
      overview = {
        lat,
        lng,
        altitude: Math.min(
          5.5,
          Math.max(
            0.4 + (separation * 6371.0088) / 4000,
            1 / Math.cos(half + Math.PI / 36) - 1,
            Math.cos(half) + Math.sin(half) / Math.tan(Math.PI / 12) - 1,
          ),
        ),
      };
    }
  }
  return { answer, guess, overview };
}

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
