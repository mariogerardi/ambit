import type { Question } from "./questions";
import type { GameState } from "./state";

export type HelpStage = "hinted" | "assisted";
export type HelpUsage = Record<string, HelpStage>;

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
