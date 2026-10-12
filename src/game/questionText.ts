/** Prompt, disclosure and feedback text, separate from grading. */
import type { Question, QuestionContext } from "./questionContracts";
import { responseCount } from "./questionPreparation";

export function questionPrompt(question: Question, context: QuestionContext) {
  return question.prompt.replace(
    "{count}",
    String(responseCount(question, context)),
  );
}

export function committedNameVisible(
  question: Question,
  selectedIds: string[],
  id: string,
) {
  return (
    question.disclosure.hoverNames ||
    (question.disclosure.committedNames && selectedIds.includes(id))
  );
}
export function explanation(
  question: Question,
  context: QuestionContext,
  _selectedIds: string[],
  _correct: boolean,
) {
  if (question.rule.type === "shortest-borders") {
    const path = context.paths.get(question.id) ?? [];
    return `One shortest route: ${path.map((id) => context.names.get(id)).join(" → ")}.`;
  }
  if (question.explanation.trim()) return question.explanation;
  if (question.rule.type === "capital-coordinate") {
    const referenceId = question.rule.referenceId;
    const reference = context.capitals.find(
      (capital) => capital.id === referenceId,
    );
    return `The line follows ${reference?.name}’s latitude. Geography can surprise you when you compare places on the same globe.`;
  }
  if (question.rule.type === "capital-circle")
    return "The circle includes its boundary. Each country contributes one primary capital.";
  if (question.rule.type === "country-circle")
    return "All of each country’s land must fit inside the circle.";
  return "";
}
