/** Stable import surface for existing Journeys and clients. Core owners are separate. */
export type {
  AnswerMode,
  FactSource,
  FlagDisplay,
  CountryFact,
  KnowledgeRule,
  Question,
  Journey,
  QuestionContext,
  Response,
  QuestionPresentation,
  QuestionContract,
  AuthoredQuestion,
} from "./questionContracts";
export {
  createQuestionContext,
  selectableIds,
  canSelect,
  solutionIds,
  responseCount,
  matchingCapitals,
} from "./questionPreparation";
export { canSubmit, isCorrect } from "./questionEvaluation";
export { cityIdForName } from "./answerTargets";

export {
  questionPrompt,
  committedNameVisible,
  explanation,
} from "./questionText";
export {
  normalizeAnswer,
  countryIdForName,
  capitalForName,
} from "./answerNames";
