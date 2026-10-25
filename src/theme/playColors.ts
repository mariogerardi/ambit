import { DEFAULT_THEME } from "./themes";
import type { ThemeId } from "./themes";

/** Legacy dark-theme values; rendering consumers should use playColors(theme). */
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
export function playColors(theme: ThemeId = DEFAULT_THEME) {
  const paper = theme === "paper";
  const ocean = theme === "ocean";
  const colors = {
    surface: paper
      ? "#d2d0c4"
      : ocean
        ? "#909090"
        : theme === "dusk"
          ? "#8a858e"
          : "#87999c",
    "context-land": paper
      ? "#c0d4df"
      : theme === "dusk"
        ? "#99abc7"
        : "#94b2c8",
    selectable: paper ? "#e4cf91" : PLAY_HIGHLIGHTS.selectable,
    "candidate-hover": paper ? "#ddba68" : "#f0d18a",
    "candidate-hover-outline": paper ? "#78541d" : "#a36708",
    selected: paper ? "#d68c19" : PLAY_HIGHLIGHTS.selected,
    "context-outline": paper ? "#244e72" : "#0b2037",
    hinted: paper ? "#83a9c7" : PLAY_HIGHLIGHTS.context,
    clue: paper ? "#83a9c7" : PLAY_HIGHLIGHTS.context,
    "clue-outline": paper ? "#244e72" : "#0b2037",
    correct: paper ? "#216d4e" : PLAY_FEEDBACK.correct,
    answer: paper ? "#176e81" : PLAY_FEEDBACK.answer,
    incorrect: paper ? "#ac3346" : PLAY_FEEDBACK.incorrect,
    corridor: paper ? "#a36708" : "#ffd34e",
    visited: paper ? "#73539e" : PLAY_FEEDBACK.visited,
    disabled: paper
      ? "#d9dacd"
      : theme === "dusk"
        ? "#62596d"
        : theme === "ocean"
          ? "#5b5b5b"
          : "#4e666d",
    river: "#007ba7",
    "river-casing": paper ? "#fffaf0" : "#edf6fa",
    outline: paper ? "#283e47" : "#172b35",
    "on-feedback": paper ? "#fffaf0" : "#172b35",
    "on-selected": "#172b35",
    guide: "#efd18f",
  };
  if (theme === "survey")
    return {
      ...colors,
      surface: "#b0b0b0",
      "context-land": "#8b96a6",
      selectable: "#c5b8a8",
      "candidate-hover": "#dbb28f",
      "candidate-hover-outline": "#65462e",
      selected: "#e6ad7c",
      "context-outline": "#1b1b1b",
      hinted: "#b7c3d4",
      clue: "#b7c3d4",
      "clue-outline": "#1b1b1b",
      correct: "#8bd89a",
      answer: "#8bd0dc",
      incorrect: "#ed9a91",
      corridor: "#c9976f",
      visited: "#b1a1c5",
      disabled: "#4e4e4e",
      river: "#414a54",
      "river-casing": "#e0e4e7",
      outline: "#202020",
      "on-feedback": "#202020",
      "on-selected": "#202020",
      guide: "#c9976f",
    };
  if (!ocean) return colors;
  // The default theme keeps the established meanings in a warmer, quieter palette.
  return {
    ...colors,
    "context-land": "#90accf",
    selectable: "#dccfae",
    "candidate-hover": "#e8c780",
    "candidate-hover-outline": "#755421",
    selected: "#f0c671",
    "context-outline": "#202b33",
    hinted: "#9eb9e3",
    clue: "#9eb9e3",
    "clue-outline": "#202b33",
    correct: "#79d58b",
    answer: "#70c9d4",
    incorrect: "#eb9b96",
    corridor: "#d7ad63",
    visited: "#b9a3db",
    river: "#087b9b",
    "river-casing": "#e5edf0",
    outline: "#242424",
    "on-feedback": "#242424",
    "on-selected": "#242424",
  };
}

export function pinBandColor(
  index: number,
  count: number,
  theme: ThemeId = DEFAULT_THEME,
) {
  const colors = playColors(theme);
  if (index === 0) return colors.correct;
  return index === count - 1 ? colors.hinted : colors.selected;
}
