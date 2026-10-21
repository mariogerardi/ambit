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
  const definition = mechanicFor(q);
  const allowed = definition?.rules;
  if (!allowed?.includes(q.rule.type))
    fail("answer mode and grading rule disagree");
  if (!Number.isInteger(q.count) || q.count < 1)
    fail("count must be a positive integer");
  if (definition.single && q.count !== 1)
    fail("single answers require count 1");
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
