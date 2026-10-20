import {
  normalizeAnswer,
  countryIdForName,
  capitalForName,
} from "./answerNames";
/** Submission readiness and grading consume canonical answers, never display geometry. */
import type { Question, QuestionContext, Response } from "./questionContracts";
import { mechanicFor } from "./mechanics";
import { pinDistance, pinInside } from "./answerTargets";
import { isMinimumLandPath } from "./reasoning";
import { estimateError } from "./numericEstimate";
import {
  canSelect,
  selectableIds,
  solutionIds,
  responseCount,
  matchingCapitals,
} from "./questionPreparation";

export function canSubmit(
  question: Question,
  context: QuestionContext,
  response: Response,
) {
  return mechanicFor(question).canSubmit(question, response, {
    count: responseCount(question, context),
    eligible: selectableIds(question, context),
  });
}
export function isCorrect(
  question: Question,
  context: QuestionContext,
  response: Response,
) {
  const rule = question.rule,
    expected = solutionIds(question, context);
  const controlGrade = mechanicFor(question).grade;
  if (controlGrade)
    return controlGrade(question, context, response, expected, {
      count: responseCount(question, context),
      eligible: selectableIds(question, context),
    });
  if (rule.type === "pin-distance") {
    const distance = pinDistance(question, response);
    return distance !== undefined && distance <= rule.radiusKm + 1e-7;
  }
  if (rule.type === "pin-inside") return pinInside(question, context, response);
  if (rule.type === "numeric-range") {
    const error = estimateError(question, response);
    return error !== undefined && error <= rule.tolerance + 1e-7;
  }
  if (
    question.mode.startsWith("city-") &&
    response.selectedIds.some((id) => !canSelect(question, context, id))
  )
    return false;
  if (rule.type === "manual-text")
    return rule.answers.some(
      (answer) => normalizeAnswer(answer) === normalizeAnswer(response.text),
    );
  if (rule.type === "manual-number")
    return response.text.trim() !== "" && Number(response.text) === rule.value;
  if (rule.type === "capital-name")
    return capitalForName(context, response.text)?.countryId === rule.countryId;
  if (rule.type === "merged-region")
    return (
      response.selectedIds.length === 1 &&
      response.selectedIds[0] === rule.targetId
    );
  if (rule.type === "capital-order")
    return (
      response.ordered.length === expected.length &&
      response.ordered.every(
        (value, i) => capitalForName(context, value)?.countryId === expected[i],
      )
    );
  if (rule.type === "feature-count")
    return (
      response.text.trim() !== "" && Number(response.text) === expected.length
    );
  if (rule.type === "capital-coordinate") {
    const capital = capitalForName(context, response.text);
    return (
      !!capital &&
      matchingCapitals(question, context).some((c) => c.id === capital.id)
    );
  }
  if (rule.type === "capital-circle" || rule.type === "country-circle")
    return (
      response.text.trim() !== "" &&
      Number(response.text) ===
        (rule.type === "capital-circle"
          ? matchingCapitals(question, context).length
          : expected.length)
    );
  if (rule.type === "text-fact") {
    const fact = context.facts.find(
      (f) => f.countryId === rule.countryId && f.field === rule.field,
    );
    return (
      !!fact &&
      [fact.value, ...(fact.aliases ?? [])].some(
        (value) => normalizeAnswer(value) === normalizeAnswer(response.text),
      )
    );
  }
  if (rule.type === "shortest-borders")
    return question.mode === "land-path"
      ? isMinimumLandPath(
          context.borderGraphs.get(question) ?? context.graph,
          response.selectedIds,
          rule.from,
          rule.to,
        )
      : response.text.trim() !== "" &&
          Number(response.text) ===
            (context.paths.get(question.id)?.length ?? 0) - 1;
  if (rule.type === "great-circle-order") {
    const ids = response.ordered.map((value) =>
      countryIdForName(context, value),
    );
    return (
      ids.length === expected.length && ids.every((id, i) => id === expected[i])
    );
  }
  if (question.mode === "typed-regions" && rule.type === "region-ids") {
    const ids = response.ordered.map((value) =>
      countryIdForName(context, value),
    );
    return (
      ids.length === question.count &&
      new Set(ids).size === ids.length &&
      (rule.match === "any" || ids.length === expected.length) &&
      ids.every((id) => id !== undefined && expected.includes(id))
    );
  }
  if (
    question.mode === "ordered-countries" &&
    rule.type === "country-ids" &&
    rule.ordered
  ) {
    const ids = response.ordered.map((value) =>
      countryIdForName(context, value),
    );
    return (
      ids.length === expected.length &&
      ids.every((id, index) => id === expected[index])
    );
  }
  if (
    response.selectedIds.length !== question.count ||
    new Set(response.selectedIds).size !== response.selectedIds.length
  )
    return false;
  if (
    (rule.type === "country-ids" ||
      rule.type === "region-ids" ||
      rule.type === "place-ids") &&
    rule.match !== "any" &&
    response.selectedIds.length !== expected.length
  )
    return false;
  if (
    (rule.type === "official-languages" || rule.type === "physical-feature") &&
    rule.match === "all" &&
    response.selectedIds.length !== expected.length
  )
    return false;
  return rule.type === "country-ids" && rule.ordered
    ? response.selectedIds.every((id, i) => id === expected[i])
    : response.selectedIds.every((id) => expected.includes(id));
}
