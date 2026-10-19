import type { ThemeId } from "./themes";

export const PLAY_HIGHLIGHTS = {
  selectable: "#eadfb9",
  selected: "#f6bc46",
  context: "#9bbddd",
} as const;
export const PLAY_FEEDBACK = {
  correct: "#78dfaa",
  answer: "#55c9c0",
  incorrect: "#f18c96",
  visited: "#b79ae3",
} as const;

/** Meaning is stable; values adapt to the surface instead of sharing unreadable hexes. */
export function playColors(theme: ThemeId = "atlas") {
  const paper = theme === "paper";
  return {
    surface: paper ? "#d2d0c4" : theme === "dusk" ? "#8a858e" : "#87999c",
    "context-land": paper
      ? "#c0d4df"
      : theme === "dusk"
        ? "#99abc7"
        : "#94b2c8",
    selectable: paper ? "#e4cf91" : PLAY_HIGHLIGHTS.selectable,
    selected: paper ? "#d68c19" : PLAY_HIGHLIGHTS.selected,
    hinted: paper ? "#83a9c7" : PLAY_HIGHLIGHTS.context,
    clue: paper ? "#83a9c7" : PLAY_HIGHLIGHTS.context,
    correct: paper ? "#216d4e" : PLAY_FEEDBACK.correct,
    answer: paper ? "#176e81" : PLAY_FEEDBACK.answer,
    incorrect: paper ? "#ac3346" : PLAY_FEEDBACK.incorrect,
    visited: paper ? "#73539e" : PLAY_FEEDBACK.visited,
    disabled: paper
      ? "#d9dacd"
      : theme === "dusk"
        ? "#62596d"
        : theme === "ocean"
          ? "#496476"
          : "#4e666d",
    outline: paper ? "#283e47" : "#172b35",
    "on-feedback": paper ? "#fffaf0" : "#172b35",
  };
}

export function pinBandColor(
  index: number,
  count: number,
  theme: ThemeId = "atlas",
) {
  const colors = playColors(theme);
  if (index === 0) return colors.correct;
  return index === count - 1 ? colors.hinted : colors.selected;
}
