import type {
  AnswerMode,
  KnowledgeRule,
  Question,
  QuestionContext,
  Response,
} from "./questionContracts";
import { validPin } from "./answerTargets";
import { orderedCards } from "./ordering";

export type AnswerControl =
  | "pin"
  | "map"
  | "choice"
  | "cards"
  | "text"
  | "number"
  | "text-list";
type Fail = (message: string) => never;
type Submission = { count: number; eligible: string[] };
export interface MechanicDefinition<
  R extends readonly KnowledgeRule["type"][] = readonly KnowledgeRule["type"][],
> {
  rules: R;
  label: string;
  control: AnswerControl;
  response: "pin" | "selected" | "text" | "ordered";
  mapSelection: "none" | "regions" | "places";
  single: boolean;
  editableCommitment: boolean;
  visible: boolean;
  canSubmit(
    question: Question,
    response: Response,
    submission: Submission,
  ): boolean;
  validate?: (question: Question, fail: Fail) => void;
  validateContext?: (
    question: Question,
    expected: string[],
    fail: Fail,
  ) => void;
  /** Control-specific grading; knowledge rules otherwise own correctness. */
  grade?: (
    question: Question,
    context: QuestionContext,
    response: Response,
    expected: string[],
    submission: Submission,
  ) => boolean;
}
const submissionChecks: Record<
  MechanicDefinition["response"],
  MechanicDefinition["canSubmit"]
> = {
  pin: (_, response) => validPin(response.pin),
  text: (_, response) => response.text.trim() !== "",
  selected: (_, response, { count }) => response.selectedIds.length === count,
  ordered: (_, response, { count }) =>
    response.ordered.length === count &&
    response.ordered.every((value) => value.trim() !== ""),
};
const cardSubmission: MechanicDefinition["canSubmit"] = (
  question,
  response,
  { count, eligible },
) => {
  const cards = orderedCards(question, response);
  return (
    cards.length === count &&
    new Set(cards).size === count &&
    cards.every((id) => eligible.includes(id))
  );
};
const cardGrade: NonNullable<MechanicDefinition["grade"]> = (
  question,
  _,
  response,
  expected,
  submission,
) =>
  cardSubmission(question, response, submission) &&
  orderedCards(question, response).every((id, index) => id === expected[index]);
const validateCards: NonNullable<MechanicDefinition["validateContext"]> = (
  question,
  expected,
  fail,
) => {
  const ids = (question.choices ?? []).map((choice) => choice.id);
  const fixed = question.guidance?.assist?.fixedSlots ?? [];
  if (
    ids.length < question.count ||
    expected.length !== question.count ||
    new Set(expected).size !== expected.length ||
    expected.some((id) => !ids.includes(id)) ||
    new Set(fixed.map((slot) => slot.index)).size !== fixed.length ||
    fixed.some(
      (slot) =>
        !Number.isInteger(slot.index) ||
        slot.index < 0 ||
        slot.index >= question.count ||
        expected[slot.index] !== slot.id,
    ) ||
    fixed.length >= question.count ||
    (question.orderLabels && question.orderLabels.length !== question.count) ||
    (question.orderInitial &&
      (ids.length !== question.count + 1 ||
        question.orderInitial.length !== question.count ||
        new Set(question.orderInitial).size !== question.count ||
        question.orderInitial.some((id) => !ids.includes(id))))
  )
    fail(
      `Invalid ${question.mode === "choice-order" ? "ordering" : "matching"} puzzle configuration: ${question.id}.`,
    );
};
const validateMatching: NonNullable<MechanicDefinition["validate"]> = (
  question,
  fail,
) => {
  const slots = question.matchSlots ?? [];
  const matches =
    question.rule.type === "slot-matches" ? question.rule.matches : [];
  const choices = new Set(question.choices?.map((choice) => choice.id));
  if (
    slots.length !== question.count ||
    slots.some((slot) => !slot.id.trim() || !slot.label.trim()) ||
    new Set(slots.map((slot) => slot.id)).size !== slots.length ||
    matches.length !== slots.length ||
    new Set(matches.map((match) => match.slotId)).size !== matches.length ||
    new Set(matches.map((match) => match.choiceId)).size !== matches.length ||
    matches.some(
      (match) =>
        !slots.some((slot) => slot.id === match.slotId) ||
        !choices.has(match.choiceId),
    ) ||
    question.orderInitial ||
    question.orderLabels
  )
    fail(
      "matching requires distinct labelled slots and one unique eligible card per slot",
    );
};
function defineMechanic<const R extends readonly KnowledgeRule["type"][]>(
  rules: R,
  label: string,
  control: AnswerControl,
  response: MechanicDefinition["response"],
  mapSelection: MechanicDefinition["mapSelection"],
  single: boolean,
  options: Partial<
    Omit<
      MechanicDefinition<R>,
      "rules" | "label" | "control" | "response" | "mapSelection" | "single"
    >
  > = {},
): MechanicDefinition<R> {
  return {
    rules,
    label,
    control,
    response,
    mapSelection,
    single,
    editableCommitment: control === "map",
    visible: true,
    canSubmit: submissionChecks[response],
    ...options,
  };
}
const countryRules = [
  "country-ids",
  "region-ids",
  "flag-country",
  "territory-owner",
  "physical-feature",
  "country-circle",
  "name-length",
  "country-fact",
  "language-family",
] as const;
const choiceRules = [
  "choice-ids",
  "country-ids",
  "official-languages",
  "territory-owner",
  "region-ids",
  "flag-country",
  "physical-feature",
  "language-family",
] as const;
const cards = {
  canSubmit: cardSubmission,
  grade: cardGrade,
  validateContext: validateCards,
};
/** One registry owns answer capabilities, allowed rules, validation and control grading. */
export const MECHANICS = {
  pin: defineMechanic(
    ["pin-distance", "pin-inside"],
    "Drop a pin",
    "pin",
    "pin",
    "none",
    true,
  ),
  "city-single": defineMechanic(
    ["place-ids"],
    "Single city pick",
    "map",
    "selected",
    "places",
    true,
  ),
  "city-multiple": defineMechanic(
    ["place-ids"],
    "Multiple city picks",
    "map",
    "selected",
    "places",
    false,
  ),
  "map-single": defineMechanic(
    countryRules,
    "Single country pick",
    "map",
    "selected",
    "regions",
    true,
  ),
  "map-multiple": defineMechanic(
    countryRules,
    "Multiple country picks",
    "map",
    "selected",
    "regions",
    false,
  ),
  number: defineMechanic(
    ["manual-number", "feature-count", "shortest-borders", "capital-circle"],
    "Number",
    "number",
    "text",
    "none",
    true,
    {
      canSubmit: (_, response) =>
        response.text.trim() !== "" &&
        Number.isInteger(Number(response.text)) &&
        Number(response.text) >= 0,
    },
  ),
  text: defineMechanic(
    [
      "manual-text",
      "capital-name",
      "capital-coordinate",
      "capital-circle",
      "text-fact",
    ],
    "Free response",
    "text",
    "text",
    "none",
    true,
  ),
  "typed-regions": defineMechanic(
    ["region-ids"],
    "Typed region names",
    "text-list",
    "ordered",
    "none",
    false,
  ),
  "ordered-countries": defineMechanic(
    ["country-ids", "great-circle-order"],
    "Ordered country names",
    "text-list",
    "ordered",
    "none",
    false,
  ),
  "ordered-capitals": defineMechanic(
    ["capital-order"],
    "Ordered capital names",
    "text-list",
    "ordered",
    "none",
    false,
  ),
  "choice-single": defineMechanic(
    choiceRules,
    "Single choice",
    "choice",
    "selected",
    "none",
    true,
  ),
  "choice-multiple": defineMechanic(
    choiceRules,
    "Multiple choices",
    "choice",
    "selected",
    "none",
    false,
  ),
  "choice-order": defineMechanic(
    ["country-ids"],
    "Order cards",
    "cards",
    "ordered",
    "none",
    false,
    {
      ...cards,
      validate: (question, fail) => {
        if (question.rule.type !== "country-ids" || !question.rule.ordered)
          fail("card ordering requires ordered grading");
      },
    },
  ),
  "choice-match": defineMechanic(
    ["slot-matches"],
    "Match cards to roles",
    "cards",
    "ordered",
    "none",
    false,
    { ...cards, validate: validateMatching },
  ),
  "land-path": defineMechanic(
    ["shortest-borders"],
    "Land path",
    "map",
    "selected",
    "regions",
    false,
    { editableCommitment: false, visible: false },
  ),
} satisfies Record<AnswerMode, MechanicDefinition>;
export const mechanicFor = (
  question: Pick<Question, "mode">,
): MechanicDefinition => MECHANICS[question.mode];
export const usesChoiceCards = (question: Pick<Question, "mode">) =>
  ["choice", "cards"].includes(mechanicFor(question).control);
