import { answerPlace } from "./answerTargets";
import { solutionIds } from "./questionPreparation";
import type { Journey, QuestionContext } from "./questionContracts";
import type { Answer } from "./state";
import type { Focus } from "../geography/types";

/** Reveal destinations, rather than broad playable framing or mistaken pins. */
export function journeyStops(
  journey: Journey,
  context: QuestionContext,
  answers: Answer[],
): Focus[] {
  const answered = new Set(answers.map((answer) => answer.roundId));
  return journey.rounds
    .filter((question) => answered.has(question.id))
    .map((question) => {
      if (question.feedbackFocus) return question.feedbackFocus;
      const ids = solutionIds(question, context);
      const place =
        ids.length === 1 ? answerPlace(question, ids[0]) : undefined;
      const region = ids.length === 1 ? context.targets.get(ids[0]) : undefined;
      const destination: Focus =
        place ?? region?.focus ?? question.feedbackFocus ?? question.focus;
      return {
        lat: destination.lat,
        lng: destination.lng,
        altitude: Math.max(0.55, Math.min(1.2, destination.altitude ?? 0.65)),
      };
    });
}
