import { JOURNEYS } from "./journeys";
import type { Question } from "./questions";
export { ANSWER_TYPES, RULE_TYPES } from "./questionTypes";
export const QUESTION_CATALOG: Question[] = JOURNEYS.flatMap(
  (journey) => journey.rounds,
);
