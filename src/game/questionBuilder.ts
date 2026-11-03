import { validateBearingIntersection } from "./bearingIntersection";
import { compileQuestionScenes } from "./scenes";
import { mechanicFor, usesChoiceCards } from "./mechanics";
import type {
  Journey,
  Question,
  QuestionPresentation,
  AuthoredQuestion,
} from "./questionContracts";
export type {
  QuestionPresentation,
  QuestionContract,
  AuthoredQuestion,
} from "./questionContracts";

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
    "matchSlots",
    "orderInitial",
    "shuffleChoices",
    "guidance",
    "bearingIntersection",
    "constructionExample",
    "constructionExampleFootprint",
    "constructionInitial",
    "partialCredit",
    "textClue",
  ];
  if (forbidden.some((key) => key in presentation))
    throw Error(
      "Shared presentation cannot inherit question content or answer contracts",
    );
  return presentation;
}

export const isRegionAnswer = (question: Pick<Question, "mode">) =>
  mechanicFor(question).mapSelection === "regions";

/** Fail during authoring/build and lazy loading, before a player reaches broken controls. */
export function validateQuestionContract(q: Question): void {
  const fail = (message: string): never => {
    throw Error(`Invalid question contract (${q.id}): ${message}`);
  };
  if (
    q.textClue &&
    (!q.textClue.text.trim() ||
      !/^[a-z]{2,3}(?:-[A-Za-z0-9]+)*$/.test(q.textClue.lang) ||
      !q.textClue.reveal.language.trim() ||
      !q.textClue.reveal.translation.trim() ||
      (q.textClue.dir !== undefined &&
        !["ltr", "rtl", "auto"].includes(q.textClue.dir)))
  )
    fail(
      "text clues require native text, a language tag and a reveal-only language/translation",
    );
  if (
    q.feedbackNetwork &&
    (!q.feedbackNetwork.regionIds.length ||
      !q.feedbackNetwork.label.trim() ||
      new Set(q.feedbackNetwork.regionIds).size !==
        q.feedbackNetwork.regionIds.length)
  )
    fail("explanatory networks require distinct regions and a legend label");
  if (
    q.feedbackReturnToSelection &&
    (q.mode !== "map-single" || q.feedbackOrbit)
  )
    fail(
      "returning to a selection requires a single country answer and cannot also start overview rotation",
    );
  if (q.feedbackOrbit && (q.feedbackFocus?.altitude ?? 0) < 1.65)
    fail("a rotating reveal requires a whole-globe final focus");
  const definition = mechanicFor(q);
  if (
    q.playFraming === "selection" &&
    (definition.mapSelection !== "regions" ||
      !["ids", "neighbors"].includes(q.selection.type))
  )
    fail("selection framing requires a bounded selectable region pool");
  const allowed = definition?.rules;
  if (!allowed?.includes(q.rule.type))
    fail("answer mode and grading rule disagree");
  if (!Number.isInteger(q.count) || q.count < 1)
    fail("count must be a positive integer");
  if (definition.single && q.count !== 1)
    fail("single answers require count 1");
  if (
    q.partialCredit !== undefined &&
    (q.partialCredit !== "one-of-two" ||
      q.mode !== "map-multiple" ||
      q.count !== 2 ||
      q.rule.type !== "country-ids" ||
      q.rule.ids.length !== 2 ||
      new Set(q.rule.ids).size !== 2 ||
      q.rule.ordered ||
      q.rule.match === "any")
  )
    fail("partial credit requires an unordered pair of country answers");
  if (
    q.candidateRegionIds &&
    (new Set(q.candidateRegionIds).size !== q.candidateRegionIds.length ||
      q.candidateRegionIds.some((id) => q.contextIds?.includes(id)))
  )
    fail("candidate geography must be distinct from reference geography");
  if (
    q.map?.candidateRole === "clue" &&
    (!q.candidateRegionIds?.length ||
      definition.mapSelection !== "none" ||
      q.map.selectionFeedback !== "after-submit" ||
      q.map.hoverFeedback)
  )
    fail(
      "clue candidates require noninteractive geography and deferred identity feedback",
    );
  const city = definition.mapSelection === "places";
  if (q.guidance?.hintAsideId && q.mode !== "choice-order")
    fail("a hint discard requires card ordering");
  if (
    q.map?.revealOrder &&
    (q.mode !== "choice-order" ||
      q.rule.type !== "country-ids" ||
      !Number.isFinite(q.map.revealOrder.stepMs) ||
      q.map.revealOrder.stepMs < 0 ||
      !Number.isFinite(q.map.revealOrder.durationMs) ||
      q.map.revealOrder.durationMs <= 0)
  )
    fail(
      "ordered country reveals require nonnegative spacing and a positive duration",
    );
  if (
    q.disclosure.bearingDestination !== undefined &&
    (q.mode !== "compass-bearing" ||
      typeof q.disclosure.bearingDestination !== "boolean")
  )
    fail(
      "bearing destination disclosure requires a compass question and a boolean",
    );
  const suppliedAreas = new Set([
    ...(q.contextIds ?? []),
    ...(q.candidateRegionIds ?? []),
    ...(q.highlightParts ?? []).map((part) => `clue-part:${part.countryId}`),
  ]);
  if (
    q.clueLocators?.some(
      (clue, index, clues) =>
        !clue.label.trim() ||
        !suppliedAreas.has(clue.regionId) ||
        clues.findIndex((other) => other.regionId === clue.regionId) !== index,
    )
  )
    fail(
      "clue locators require unique, explicitly supplied areas and authored labels",
    );
  if (isRegionAnswer(q) || city) {
    if (q.selection.type === "none")
      fail("map answers require selectable candidates");
    if (city && q.selection.type !== "ids")
      fail("city answers require explicit place candidates");
  } else if (q.selection.type !== "none")
    fail("non-map answers cannot inherit map selection");
  if (!definition.editableCommitment && q.commitment !== "submit")
    fail("this mode requires explicit submission");
  if (usesChoiceCards(q)) {
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
  if (q.guidance?.assist?.compassSector && q.mode !== "compass-bearing")
    fail("compass sectors require the compass answer mode");
  validateBearingIntersection(q, fail);
  definition.validate?.(q, fail);
  for (const choice of q.choices ?? [])
    if (
      choice.geographyIds &&
      (!choice.geographyIds.length ||
        new Set(choice.geographyIds).size !== choice.geographyIds.length)
    )
      fail("choice geography requires distinct, nonempty identities");
  if (q.mode !== "choice-match" && q.matchSlots)
    fail("matching slots require a matching answer mode");
}
export function defineQuestion(question: AuthoredQuestion): Question {
  const compiled = compileQuestionScenes(question);
  validateQuestionContract(compiled);
  return compiled;
}
export function validateJourneyContracts(journey: Journey): void {
  if (
    journey.dailyEligible !== undefined &&
    typeof journey.dailyEligible !== "boolean"
  )
    throw Error(`Invalid Daily eligibility: ${journey.id}`);
  if (
    journey.completion?.initialConstructionRoundId &&
    (!journey.completion.constructionResults ||
      !journey.rounds.some(
        (q) => q.id === journey.completion?.initialConstructionRoundId,
      ))
  )
    throw Error(`Invalid initial construction review: ${journey.id}`);
  if (
    journey.saveRevision !== undefined &&
    (!Number.isSafeInteger(journey.saveRevision) || journey.saveRevision < 1)
  )
    throw Error(`Invalid Journey save revision: ${journey.id}`);
  if (
    journey.legacyRoundLabels &&
    (!journey.saveRevision ||
      Object.entries(journey.legacyRoundLabels).some(
        ([id, label]) =>
          !journey.rounds.some((round) => round.id === id) ||
          typeof label !== "string" ||
          !label.trim(),
      ))
  )
    throw Error(`Invalid legacy receipt labels: ${journey.id}`);
  const ids = new Set<string>();
  for (const question of journey.rounds) {
    if (ids.has(question.id))
      throw Error(`Duplicate question ID: ${question.id}`);
    ids.add(question.id);
    validateQuestionContract(question);
  }
}
