import { JOURNEYS } from "./journeys";
import type { Journey, Question } from "./questions";
export { ANSWER_TYPES, RULE_TYPES } from "./questionTypes";
export const QUESTION_CATALOG: Question[] = JOURNEYS.flatMap(
  (journey) => journey.rounds,
);
export const PLAYGROUND_JOURNEY: Journey = {
  id: "question-playground-v1",
  title: "Question playground",
  description: "Review the questions in the Journeys.",
  rounds: QUESTION_CATALOG,
};
