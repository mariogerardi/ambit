import type { Question } from "./questionContracts";
import type { GameState } from "./state";
import { orderedCards, swapOrderCard } from "./ordering";
import { assistRecall } from "./countryRecall";

export type HelpStage = "hinted" | "assisted";
export type HelpUsage = Record<string, HelpStage>;

export function lockedSelectionIds(
  question: Question,
  game: Pick<GameState, "help">,
) {
  return game.help?.[question.id] === "assisted"
    ? (question.guidance?.assist?.fixedSelections ?? [])
    : [];
}

/** Reapply monotonic help when a resumed or merged draft predates the assist. */
export function withAssistanceLocks(
  question: Question,
  game: GameState,
): GameState {
  if (game.phase !== "playing") return game;
  if (
    question.mode === "country-recall" &&
    game.help?.[question.id] === "assisted"
  ) {
    const recall = assistRecall(question, game.recall);
    return recall === game.recall ? game : { ...game, recall };
  }
  const missing = lockedSelectionIds(question, game).filter(
    (id) => !game.selectedIds.includes(id),
  );
  const selected = missing.length
    ? { ...game, selectedIds: [...game.selectedIds, ...missing] }
    : game;
  const fixed = lockedOrderSlots(question, selected);
  if (!fixed.length) return selected;
  let ordered = orderedCards(question, selected);
  if (question.orderInitial) {
    for (const slot of fixed)
      ordered = swapOrderCard(question, ordered, slot.id, slot.index);
  } else {
    ordered = Array.from(
      { length: question.count },
      (_, index) =>
        fixed.find((slot) => slot.index === index)?.id ??
        (fixed.some((slot) => slot.id === ordered[index])
          ? ""
          : (ordered[index] ?? "")),
    );
  }
  return ordered.length === selected.ordered.length &&
    ordered.every((id, index) => id === selected.ordered[index])
    ? selected
    : { ...selected, ordered };
}

export function lockedOrderSlots(
  question: Question,
  game: Pick<GameState, "help">,
) {
  return game.help?.[question.id] === "assisted"
    ? (question.guidance?.assist?.fixedSlots ?? [])
    : [];
}

export function candidateAvailable(
  question: Question,
  game: Pick<GameState, "help" | "selectedIds">,
  id: string,
) {
  const survivors = question.guidance?.assist?.candidateIds;
  return (
    game.help?.[question.id] !== "assisted" ||
    !survivors ||
    survivors.includes(id) ||
    // Asking for help never deletes a player's existing selection. It can still be removed.
    game.selectedIds.includes(id)
  );
}

/** Assistance is monotonic within a run, including when stale tabs/devices merge. */
export function mergeHelp(a: HelpUsage = {}, b: HelpUsage = {}): HelpUsage {
  const result = { ...a };
  for (const [id, stage] of Object.entries(b))
    if (result[id] !== "assisted") result[id] = stage;
  return result;
}

export function helpSummary(game: Pick<GameState, "help" | "answers">) {
  const stages = [
    ...new Set(game.answers.map((answer) => answer.roundId)),
  ].flatMap((id) => (game.help?.[id] ? [game.help[id]] : []));
  const hints = stages.length;
  const assists = stages.filter((stage) => stage === "assisted").length;
  return {
    hints,
    assists,
    status: assists ? "assisted" : hints ? "hinted" : "unassisted",
  } as const;
}

export function helpCountCopy({
  hints,
  assists,
}: {
  hints: number;
  assists: number;
}) {
  return [
    hints ? `${hints} ${hints === 1 ? "hint" : "hints"}` : "",
    assists ? `${assists} ${assists === 1 ? "assist" : "assists"}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
