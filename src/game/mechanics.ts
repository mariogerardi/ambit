import {
  constructionReady,
  validateConstructionQuestion,
} from "./construction";
import type {
  AnswerMode,
  KnowledgeRule,
  Question,
  QuestionContext,
  Response,
} from "./questionContracts";
import { validPin } from "./answerTargets";
import { orderedCards } from "./ordering";
import { estimateValue } from "./numericEstimate";
import { bearingValue } from "./compassBearing";
import {
  constructionOutcome,
  compassOutcome,
  pinOutcome,
  estimateOutcome,
} from "./answerOutcome";
import type { OutcomeEvaluator } from "./answerOutcome";
import { initialBearing, normalizeBearing } from "./geodesic";
import { recallOutcome } from "./countryRecall";

export type AnswerControl =
  | "construction"
  | "compass"
  | "pin"
  | "map"
  | "choice"
  | "cards"
  | "text"
  | "number"
  | "slider"
  | "text-list"
  | "recall";
type Fail = (message: string) => never;
type Submission = { count: number; eligible: string[] };
export interface MechanicDefinition<
  R extends readonly KnowledgeRule["type"][] = readonly KnowledgeRule["type"][],
> {
  rules: R;
  label: string;
  control: AnswerControl;
  response: "pin" | "selected" | "text" | "ordered" | "construction";
  mapSelection: "none" | "regions" | "places";
  single: boolean;
  editableCommitment: boolean;
  visible: boolean;
  /** Tiered mechanics evaluate acceptance, rewards and evidence together. */
  outcome?: OutcomeEvaluator;
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
  construction: (question, response) => constructionReady(question, response),
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
  "country-recall": defineMechanic(
    ["country-set-recall"],
    "Recall a set of countries",
    "recall",
    "text",
    "none",
    false,
    {
      canSubmit: () => true,
      outcome: recallOutcome,
      validate: (q, fail) => {
        if (q.rule.type !== "country-set-recall") return;
        const r = q.rule;
        if (
          !q.inputLabel?.trim() ||
          r.ids.length !== q.count ||
          r.ids.length < 3 ||
          new Set(r.ids).size !== r.ids.length ||
          r.assistOrder.length !== r.ids.length ||
          new Set(r.assistOrder).size !== r.ids.length ||
          r.assistOrder.some((id) => !r.ids.includes(id)) ||
          r.exceptions?.some(
            (e) => r.ids.includes(e.id) || !e.message.trim(),
          ) ||
          new Set(r.exceptions?.map((e) => e.id)).size !==
            (r.exceptions?.length ?? 0)
        )
          fail("invalid progressive recall answer set");
      },
    },
  ),
  "geo-multipin": defineMechanic(
    ["labeled-region-pin-set"],
    "Place labeled landscape pins",
    "construction",
    "construction",
    "none",
    true,
    { validate: validateConstructionQuestion, outcome: constructionOutcome },
  ),
  "geo-brush": defineMechanic(
    ["raster-overlap"],
    "Paint a geographic area",
    "construction",
    "construction",
    "none",
    true,
    { validate: validateConstructionQuestion, outcome: constructionOutcome },
  ),
  "geo-circle": defineMechanic(
    ["point-coverage-max", "island-coverage-max"],
    "Fit a geographic circle",
    "construction",
    "construction",
    "none",
    true,
    { validate: validateConstructionQuestion, outcome: constructionOutcome },
  ),
  "geo-trace": defineMechanic(
    ["line-following"],
    "Trace a geographic path",
    "construction",
    "construction",
    "none",
    true,
    { validate: validateConstructionQuestion, outcome: constructionOutcome },
  ),
  "geo-polygon": defineMechanic(
    ["population-coverage-area-budget"],
    "Construct a population region",
    "construction",
    "construction",
    "none",
    true,
    { validate: validateConstructionQuestion, outcome: constructionOutcome },
  ),
  "geo-cut": defineMechanic(
    ["population-balance"],
    "Divide a population",
    "construction",
    "construction",
    "none",
    true,
    { validate: validateConstructionQuestion, outcome: constructionOutcome },
  ),
  "compass-bearing": defineMechanic(
    ["bearing-angle"],
    "Compass bearing",
    "compass",
    "text",
    "none",
    true,
    {
      outcome: compassOutcome,
      canSubmit: (_, response) => bearingValue(response) !== undefined,
      validate: (question, fail) => {
        if (question.rule.type !== "bearing-angle")
          return fail("compass requires angular grading");
        const { origin, destination, tiers } = question.rule;
        try {
          initialBearing(origin, destination);
        } catch {
          fail("invalid compass endpoints");
        }
        if (
          !origin.id?.trim() ||
          !destination.id?.trim() ||
          origin.id === destination.id ||
          !origin.name?.trim() ||
          !destination.name?.trim() ||
          !origin.sourceId?.trim() ||
          !destination.sourceId?.trim() ||
          tiers.length !== 3 ||
          tiers.some(
            (tier, i) =>
              !Number.isFinite(tier.degrees) ||
              tier.degrees <= (tiers[i - 1]?.degrees ?? 0) ||
              tier.degrees >= 180 ||
              !tier.feedback.trim(),
          )
        )
          fail(
            "compass requires named endpoints and three ascending angular bands below 180 degrees",
          );
        const sector = question.guidance?.assist?.compassSector;
        if (sector) {
          const width = normalizeBearing(sector.end - sector.start);
          const target = initialBearing(origin, destination);
          if (
            ![sector.start, sector.end].every(
              (n) => Number.isFinite(n) && n >= 0 && n < 360,
            ) ||
            width < 60 ||
            width > 180 ||
            normalizeBearing(target - sector.start) > width
          )
            fail(
              "compass assist requires a broad sector containing the target",
            );
        }
        if (
          question.guidance?.assist?.candidateIds ||
          question.guidance?.assist?.fixedSlots ||
          question.guidance?.assist?.fixedSelections
        )
          fail("compass assistance cannot change answer eligibility");
      },
    },
  ),
  pin: defineMechanic(
    ["pin-distance", "pin-inside"],
    "Place a pin",
    "pin",
    "pin",
    "none",
    true,
    { outcome: pinOutcome },
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
  "merged-region-single": defineMechanic(
    ["merged-region"],
    "Single territory pick",
    "map",
    "selected",
    "regions",
    true,
    {
      canSubmit: (question, response, { eligible }) =>
        response.selectedIds.length === 1 &&
        eligible.includes(response.selectedIds[0]) &&
        question.selection.type === "ids",
      validate: (question, fail) => {
        const rule = question.rule;
        if (rule.type !== "merged-region" || question.selection.type !== "ids")
          return fail("composites require explicit targets and members");
        const ids = question.selection.ids;
        if (
          !rule.targetId.startsWith("composite:") ||
          rule.memberIds.length < 2 ||
          new Set(rule.memberIds).size !== rule.memberIds.length ||
          ids.length < 2 ||
          new Set(ids).size !== ids.length ||
          !ids.includes(rule.targetId) ||
          rule.memberIds.some((id) => ids.includes(id)) ||
          question.disclosure.hoverNames ||
          question.disclosure.namedChoices ||
          question.disclosure.committedNames ||
          question.disclosure.previousVisits ||
          question.choices?.length ||
          question.highlightParts?.length ||
          question.displayGeometries ||
          question.importedRegions?.length ||
          question.places?.length ||
          question.contextIds?.length ||
          question.map?.borders === false ||
          question.map?.borderIds ||
          question.map?.candidates !== "highlighted"
        )
          fail(
            "composites require distinct anonymous candidates and canonical member geometry",
          );
        const pairs = rule.hiddenAdjacencies.map(([a, b]) =>
          [a, b].sort().join("|"),
        );
        if (
          !pairs.length ||
          new Set(pairs).size !== pairs.length ||
          rule.hiddenAdjacencies.some(
            ([a, b]) =>
              a === b ||
              !rule.memberIds.includes(a) ||
              !rule.memberIds.includes(b),
          )
        )
          fail("hidden adjacencies must be distinct internal member pairs");
      },
    },
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
  slider: defineMechanic(
    ["numeric-range"],
    "Estimate with a slider",
    "slider",
    "text",
    "none",
    true,
    {
      outcome: estimateOutcome,
      canSubmit: (question, response) =>
        question.rule.type === "numeric-range" &&
        estimateValue(question.rule, response) !== undefined,
      validate: (question, fail) => {
        const rule = question.rule;
        if (rule.type !== "numeric-range")
          return fail("slider requires a numeric range");
        const steps = (rule.max - rule.min) / rule.step;
        if (
          ![rule.min, rule.max, rule.step, rule.value, rule.tolerance].every(
            Number.isFinite,
          ) ||
          rule.min >= rule.max ||
          rule.step <= 0 ||
          rule.tolerance <= 0 ||
          rule.value < rule.min ||
          rule.value > rule.max ||
          Math.abs(steps - Math.round(steps)) > 1e-7 ||
          !rule.unit.trim() ||
          !question.inputLabel?.trim()
        )
          fail("invalid slider bounds, step, target, tolerance or label");
        if (
          rule.tiers &&
          (rule.tiers.length !== 3 ||
            rule.tiers.at(-1)?.tolerance !== rule.tolerance ||
            rule.tiers.some(
              (tier, index) =>
                !Number.isFinite(tier.tolerance) ||
                tier.tolerance <= (rule.tiers?.[index - 1]?.tolerance ?? 0) ||
                !tier.feedback.trim(),
            ))
        )
          fail(
            "slider accuracy requires three ascending bands ending at the tolerance",
          );
        if (question.guidance?.assist?.candidateIds?.length)
          fail("slider assistance cannot narrow choice candidates");
      },
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
    ["country-ids", "choice-ids"],
    "Order cards",
    "cards",
    "ordered",
    "none",
    false,
    {
      ...cards,
      validate: (question, fail) => {
        if (
          (question.rule.type !== "country-ids" &&
            question.rule.type !== "choice-ids") ||
          !question.rule.ordered
        )
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
