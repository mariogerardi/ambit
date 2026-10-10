import type { VisualState } from "../geography/types";
import type { Question, QuestionContext } from "./questions";
import {
  questionPlaces,
  questionRegions,
  questionVisualStates,
} from "./presentation";
import type { GameState } from "./state";

/** Praise the action used to answer, rather than varying praise at random. */
export function correctAnswerCopy(question: Question): string {
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
      label: question.mode === "pin" ? "Your pin" : "Incorrect pick",
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
      label: question.mode.startsWith("city-")
        ? "Other places"
        : "Other countries",
    });
  return entries;
}
