import { NORTH_AMERICA_JOURNEY } from "./northAmericaJourney";
import { FIFTEENTH_JOURNEY } from "./fifteenthJourney";
import { FOURTEENTH_JOURNEY } from "./fourteenthJourney";
import { THIRTEENTH_JOURNEY } from "./thirteenthJourney";
import { TWELFTH_JOURNEY } from "./twelfthJourney";
import { ELEVENTH_JOURNEY } from "./eleventhJourney";
import { TENTH_JOURNEY } from "./tenthJourney";
import { NINTH_JOURNEY } from "./ninthJourney";
import { EIGHTH_JOURNEY } from "./eighthJourney";
import { JOURNEY } from "./journey";
import { SECOND_JOURNEY } from "./secondJourney";
import { FOURTH_JOURNEY } from "./fourthJourney";
import { THIRD_JOURNEY } from "./thirdJourney";
import { FIFTH_JOURNEY } from "./fifthJourney";
import { SIXTH_JOURNEY } from "./sixthJourney";
import { SEVENTH_JOURNEY } from "./seventhJourney";
import type { Journey, Question } from "./questions";

export { ANSWER_TYPES, RULE_TYPES } from "./questionTypes";

// The library contains only questions belonging to Journeys.
export const QUESTION_CATALOG: Question[] = [
  ...JOURNEY.rounds,
  ...SECOND_JOURNEY.rounds,
  ...THIRD_JOURNEY.rounds,
  ...FOURTH_JOURNEY.rounds,
  ...FIFTH_JOURNEY.rounds,
  ...SIXTH_JOURNEY.rounds,
  ...SEVENTH_JOURNEY.rounds,
  ...EIGHTH_JOURNEY.rounds,
  ...NINTH_JOURNEY.rounds,
  ...TENTH_JOURNEY.rounds,
  ...ELEVENTH_JOURNEY.rounds,
  ...TWELFTH_JOURNEY.rounds,
  ...THIRTEENTH_JOURNEY.rounds,
  ...FOURTEENTH_JOURNEY.rounds,
  ...FIFTEENTH_JOURNEY.rounds,
  ...NORTH_AMERICA_JOURNEY.rounds,
];
export const PLAYGROUND_JOURNEY: Journey = {
  id: "question-playground-v1",
  title: "Question playground",
  description: "Review the questions in the Journeys.",
  rounds: QUESTION_CATALOG,
};
