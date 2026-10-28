import { mechanicFor } from "./mechanics";
import type { Question, Response } from "./questionContracts";

/** Ordering and matching share card movement; their grading contracts stay separate. */
export const isSlotAnswer = (question: Pick<Question, "mode">) =>
  mechanicFor(question).control === "cards";

/** Populated puzzles start with every slot filled, with at most one spare card. */
export function orderedCards(
  question: Question,
  response: Pick<Response, "ordered">,
) {
  return question.orderInitial && response.ordered.length === 0
    ? [...question.orderInitial]
    : [...response.ordered];
}

export function swapOrderCard(
  question: Question,
  current: string[],
  id: string,
  index: number,
) {
  const ordered = Array.from(
    { length: question.count },
    (_, i) => current[i] ?? "",
  );
  const from = ordered.indexOf(id);
  if (from === index) return ordered;
  const spare = question.choices?.find(
    (choice) => !ordered.includes(choice.id),
  );
  // A fully populated puzzle without a spare can only swap existing cards.
  if (from >= 0 && index < 0 && question.orderInitial && !spare) return ordered;
  if (from >= 0)
    ordered[from] =
      index >= 0 ? ordered[index] : question.orderInitial ? spare!.id : "";
  if (index >= 0) ordered[index] = id;
  return ordered;
}
