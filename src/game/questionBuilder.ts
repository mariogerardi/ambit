import type { AnswerMode, Journey, KnowledgeRule, Question } from "./questions";

/** Shared styling/context only. A completed round is never an interaction template. */
export type QuestionPresentation = Partial<
  Omit<
    Question,
    | "id"
    | "title"
    | "prompt"
    | "explanation"
    | "qualification"
    | "mode"
    | "rule"
    | "count"
    | "selection"
    | "commitment"
    | "choices"
    | "inputLabel"
    | "orderLabels"
    | "guidance"
  >
>;
/** Exact keys also reject a completed question hidden behind an object spread. */
export function definePresentation<T extends QuestionPresentation>(
  presentation: T & Record<Exclude<keyof T, keyof QuestionPresentation>, never>,
): T {
  const forbidden = [
    "id",
    "title",
    "prompt",
    "explanation",
    "qualification",
    "mode",
    "rule",
    "count",
    "selection",
    "commitment",
    "choices",
    "inputLabel",
    "orderLabels",
    "guidance",
  ];
  if (forbidden.some((key) => key in presentation))
    throw Error(
      "Shared presentation cannot inherit question content or answer contracts",
    );
  return presentation;
}

type Rule<M extends AnswerMode> = Extract<
  KnowledgeRule,
  { type: (typeof rules)[M][number] }
>;
type NoMapSelection = { selection: { type: "none" }; commitment: "submit" };
type MapSelection = {
  selection: Exclude<Question["selection"], { type: "none" }>;
};
type Single = { count: 1 };
type Choices = { choices: NonNullable<Question["choices"]> };
/** Discriminated authoring contracts; the engine's read model stays stable. */
export type QuestionContract =
  | ({ mode: "pin"; rule: Rule<"pin"> } & Single & NoMapSelection)
  | ({
      mode: "city-single";
      rule: Rule<"city-single">;
      selection: { type: "ids"; ids: string[] };
      commitment: Question["commitment"];
    } & Single)
  | {
      mode: "city-multiple";
      rule: Rule<"city-multiple">;
      selection: { type: "ids"; ids: string[] };
      commitment: "submit";
      count: number;
    }
  | ({
      mode: "map-single";
      rule: Rule<"map-single">;
      commitment: Question["commitment"];
    } & Single &
      MapSelection)
  | ({
      mode: "map-multiple";
      rule: Rule<"map-multiple">;
      commitment: "submit";
      count: number;
    } & MapSelection)
  | ({
      mode: "choice-single";
      rule: Rule<"choice-single">;
    } & Single &
      NoMapSelection &
      Choices)
  | ({
      mode: "choice-multiple";
      rule: Rule<"choice-multiple">;
      count: number;
    } & NoMapSelection &
      Choices)
  | ({
      mode: "choice-order";
      rule: Rule<"choice-order"> & { ordered: true };
      count: number;
    } & NoMapSelection &
      Choices)
  | ({
      mode: "text";
      rule: Rule<"text">;
      inputLabel: string;
    } & Single &
      NoMapSelection)
  | ({
      mode: "number";
      rule: Rule<"number">;
      inputLabel: string;
    } & Single &
      NoMapSelection)
  | ({
      mode: "typed-regions";
      rule: Rule<"typed-regions">;
      inputLabel: string;
      count: number;
    } & NoMapSelection)
  | ({
      mode: "ordered-countries";
      rule: Rule<"ordered-countries">;
      count: number;
    } & NoMapSelection)
  | ({
      mode: "ordered-capitals";
      rule: Rule<"ordered-capitals">;
      count: number;
    } & NoMapSelection)
  | ({
      mode: "land-path";
      rule: Rule<"land-path">;
      count: number;
      commitment: "submit";
    } & MapSelection);
export type AuthoredQuestion = Omit<
  Question,
  "mode" | "rule" | "selection" | "commitment" | "count"
> &
  QuestionContract;

const rules = {
  pin: ["pin-distance", "pin-inside"],
  "city-single": ["place-ids"],
  "city-multiple": ["place-ids"],
  "map-single": [
    "country-ids",
    "region-ids",
    "flag-country",
    "territory-owner",
    "physical-feature",
    "country-circle",
    "name-length",
    "country-fact",
    "language-family",
  ],
  "map-multiple": [
    "country-ids",
    "region-ids",
    "flag-country",
    "territory-owner",
    "physical-feature",
    "country-circle",
    "name-length",
    "country-fact",
    "language-family",
  ],
  "choice-single": [
    "choice-ids",
    "country-ids",
    "official-languages",
    "territory-owner",
    "region-ids",
    "flag-country",
    "physical-feature",
    "language-family",
  ],
  "choice-multiple": [
    "choice-ids",
    "country-ids",
    "official-languages",
    "territory-owner",
    "region-ids",
    "flag-country",
    "physical-feature",
    "language-family",
  ],
  "choice-order": ["country-ids"],
  text: [
    "manual-text",
    "capital-name",
    "capital-coordinate",
    "capital-circle",
    "text-fact",
  ],
  number: [
    "manual-number",
    "feature-count",
    "shortest-borders",
    "capital-circle",
  ],
  "typed-regions": ["region-ids"],
  "ordered-countries": ["country-ids", "great-circle-order"],
  "ordered-capitals": ["capital-order"],
  "land-path": ["shortest-borders"],
} as const satisfies Record<AnswerMode, readonly KnowledgeRule["type"][]>;
export const isRegionAnswer = (question: Pick<Question, "mode">) =>
  question.mode === "map-single" ||
  question.mode === "map-multiple" ||
  question.mode === "land-path";

/** Fail during authoring/build and lazy loading, before a player reaches broken controls. */
export function validateQuestionContract(q: Question): void {
  const fail = (message: string): never => {
    throw Error(`Invalid question contract (${q.id}): ${message}`);
  };
  const allowed: readonly KnowledgeRule["type"][] = rules[q.mode];
  if (!allowed?.includes(q.rule.type))
    fail("answer mode and grading rule disagree");
  if (!Number.isInteger(q.count) || q.count < 1)
    fail("count must be a positive integer");
  const single = [
    "pin",
    "city-single",
    "map-single",
    "choice-single",
    "text",
    "number",
  ].includes(q.mode);
  if (single && q.count !== 1) fail("single answers require count 1");
  const city = q.mode.startsWith("city-");
  if (isRegionAnswer(q) || city) {
    if (q.selection.type === "none")
      fail("map answers require selectable candidates");
    if (city && q.selection.type !== "ids")
      fail("city answers require explicit place candidates");
  } else if (q.selection.type !== "none")
    fail("non-map answers cannot inherit map selection");
  if (
    !["map-single", "map-multiple", "city-single", "city-multiple"].includes(
      q.mode,
    ) &&
    q.commitment !== "submit"
  )
    fail("this mode requires explicit submission");
  if (q.mode.startsWith("choice-")) {
    const choices = q.choices ?? [];
    if (
      choices.length < 2 ||
      choices.length > 6 ||
      new Set(choices.map((c) => c.id)).size !== choices.length
    )
      fail("provide at least two and at most six distinct choices");
    if (q.count > choices.length)
      fail("not enough choices for the required answer count");
  } else if (
    q.choices?.length &&
    !(isRegionAnswer(q) && q.disclosure.namedChoices)
  )
    fail("choices require a choice mode or a named map alternative");
  if (
    ["text", "number", "typed-regions"].includes(q.mode) &&
    !q.inputLabel?.trim()
  )
    fail("typed answers require a field label");
  if (
    q.mode === "choice-order" &&
    (q.rule.type !== "country-ids" || !q.rule.ordered)
  )
    fail("card ordering requires ordered grading");
}
export function defineQuestion(question: AuthoredQuestion): Question {
  validateQuestionContract(question);
  return question;
}
export function validateJourneyContracts(journey: Journey): void {
  const ids = new Set<string>();
  for (const question of journey.rounds) {
    if (ids.has(question.id))
      throw Error(`Duplicate question ID: ${question.id}`);
    ids.add(question.id);
    validateQuestionContract(question);
  }
}
