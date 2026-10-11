import type { Question, Response } from "./questions";

/** Populated puzzles keep the remaining card in their single distractor group. */
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
  if (from >= 0)
    ordered[from] =
      index >= 0
        ? ordered[index]
        : question.orderInitial
          ? question.choices!.find((choice) => !ordered.includes(choice.id))!.id
          : "";
  if (index >= 0) ordered[index] = id;
  return ordered;
}
