import { capitalForName, countryIdForName } from "./answerNames";
import type { VisualState } from "../geography/types";
import type { Question, QuestionContext } from "./questionContracts";
import { matchingCapitals, solutionIds } from "./questionPreparation";
import { answerPlace } from "./answerTargets";
import {
  questionPlaces,
  questionRegions,
  questionVisualStates,
} from "./presentation";
import type { GameState } from "./state";

/** Praise the action used to answer, rather than varying praise at random. */
export function correctAnswerCopy(question: Question): string {
  if (question.correctFeedback) return question.correctFeedback;
  if (question.mode === "pin") return "Nicely placed.";
  if (
    [
      "shortest-borders",
      "great-circle-order",
      "capital-order",
      "capital-coordinate",
      "capital-circle",
      "country-circle",
      "feature-count",
      "name-length",
      "language-family",
    ].includes(question.rule.type)
  )
    return "Beautifully reasoned.";
  if (["text", "typed-regions"].includes(question.mode))
    return "Nicely remembered.";
  if (
    [
      "map-single",
      "map-multiple",
      "city-single",
      "city-multiple",
      "choice-single",
      "choice-multiple",
    ].includes(question.mode)
  )
    return "Well spotted.";
  return "Exactly right.";
}

export const roundIdentity = (question: Question) =>
  question.progressLabel ?? question.label;

export const resolvedRoundIdentity = (question: Question) =>
  question.resolvedLabel ?? roundIdentity(question);

/** Canonical answers, independent of the submitted guess and explanatory prose. */
export function correctAnswerSummary(
  question: Question,
  context: QuestionContext,
  game: GameState,
) {
  const rule = question.rule;
  const expected = solutionIds(question, context);
  const name = (id: string) =>
    question.choices?.find((choice) => choice.id === id)?.label ??
    answerPlace(question, id)?.name ??
    context.names.get(id) ??
    context.choiceNames.get(id) ??
    id;
  const capital = (countryId: string) =>
    context.capitals.find((place) => place.countryId === countryId)?.name ?? "";
  let values: string[];
  let alternatives = false;
  if (rule.type === "slot-matches")
    values = (question.matchSlots ?? []).map(
      (slot, index) => `${slot.label}: ${name(expected[index])}`,
    );
  else if (rule.type === "manual-number") values = [String(rule.value)];
  else if (rule.type === "manual-text") values = [rule.answers[0]];
  else if (rule.type === "capital-name") values = [capital(rule.countryId)];
  else if (rule.type === "text-fact")
    values = [
      context.facts.find(
        (fact) =>
          fact.countryId === rule.countryId && fact.field === rule.field,
      )?.value ?? "",
    ];
  else if (rule.type === "pin-distance") values = [name(rule.targetId)];
  else if (rule.type === "capital-order") values = expected.map(capital);
  else if (rule.type === "shortest-borders" && question.mode === "number")
    values = [String(expected.length - 1)];
  else if (rule.type === "feature-count" || rule.type === "country-circle")
    values = [String(expected.length)];
  else if (rule.type === "capital-circle")
    values = [String(matchingCapitals(question, context).length)];
  else if (rule.type === "capital-coordinate") {
    const answer = game.answers.at(-1);
    const accepted = answer?.correct
      ? capitalForName(context, answer.text)
      : undefined;
    values = [
      accepted?.name ?? matchingCapitals(question, context)[0]?.name ?? "",
    ];
    alternatives = !accepted && matchingCapitals(question, context).length > 1;
  } else {
    alternatives =
      ("match" in rule && rule.match === "any") || rule.type === "name-length";
    const answer = game.answers.at(-1);
    const ids =
      alternatives && answer?.correct
        ? question.mode === "typed-regions"
          ? answer.ordered
              .map((value) => countryIdForName(context, value)!)
              .filter(Boolean)
          : answer.selectedIds
        : alternatives
          ? expected.slice(0, question.count)
          : expected;
    values = ids.map(name);
    alternatives = alternatives && !answer?.correct;
  }
  const ordered = [
    "ordered-countries",
    "ordered-capitals",
    "choice-order",
    "land-path",
  ].includes(question.mode);
  return {
    label: alternatives
      ? values.length > 1
        ? "One correct set"
        : "One correct answer"
      : values.length > 1
        ? "Correct answers"
        : "Correct answer",
    value: values.join(ordered ? " → " : ", "),
  };
}

/** Only explain colors present in the rendered reveal, including city/pin markers. */
export function feedbackLegend(
  question: Question,
  context: QuestionContext,
  game: GameState,
) {
  const states = questionVisualStates(question, context, game);
  const visible = new Set<VisualState>(
    questionRegions(context.regions, question, game.phase).map(
      (region) => states[region.id] ?? "default",
    ),
  );
  for (const place of questionPlaces(
    question,
    context,
    game.phase,
    game.text,
    !!game.answers.at(-1)?.correct,
    game,
  ))
    if (place.visualState) visible.add(place.visualState);
  const entries: { key: string; label: string }[] = [];
  if (visible.has("correct"))
    entries.push({ key: "correct", label: "Correct" });
  if (visible.has("answer"))
    entries.push({
      key: "answer",
      label:
        question.rule.type === "pin-distance"
          ? "Target location"
          : question.count > 1
            ? visible.has("correct")
              ? "Other correct answers"
              : "Correct answers"
            : "Correct answer",
    });
  if (visible.has("incorrect"))
    entries.push({
      key: "incorrect",
      label:
        question.mode === "pin"
          ? "Your pin"
          : question.mode === "choice-match"
            ? "Incorrect match"
            : "Incorrect pick",
    });
  if (
    visible.has("hinted") ||
    visible.has("selectable") ||
    visible.has("selected")
  )
    entries.push({ key: "hint", label: "Highlighted context" });
  if (visible.has("disabled") || visible.has("default"))
    entries.push({
      key: "neutral",
      label:
        question.mode.startsWith("city-") || question.mode === "choice-match"
          ? "Other places"
          : "Other countries",
    });
  return entries;
}
