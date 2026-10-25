import { DEFAULT_THEME } from "./themes.ts";
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
  const colors = {
    surface: "#909090",
    "context-land": "#90accf",
    selectable: "#dccfae",
    "candidate-hover": "#dbb28f",
    "candidate-hover-outline": "#65462e",
    selected: "#e6ad7c",
    "context-outline": "#202b33",
    hinted: "#9eb9e3",
    clue: "#9eb9e3",
    "clue-outline": "#202b33",
    correct: "#79d58b",
    answer: "#70c9d4",
    incorrect: "#eb9b96",
    corridor: "#c9976f",
    visited: "#b9a3db",
    disabled: "#5b5b5b",
    river: "#087b9b",
    "river-casing": "#e5edf0",
    outline: "#242424",
    "on-feedback": "#242424",
    "on-selected": "#242424",
    guide: "#c9976f",
  };
  if (theme === "paper")
    return {
      ...colors,
      surface: "#97a38e",
      "context-land": "#94b4b2",
      selectable: "#d5c6a0",
      "candidate-hover": "#cfa184",
      "candidate-hover-outline": "#4a3627",
      selected: "#ad704a",
      "context-outline": "#14281f",
      hinted: "#a0c6c3",
      clue: "#a0c6c3",
      "clue-outline": "#14281f",
      correct: "#76d496",
      answer: "#c4b6ef",
      incorrect: "#e898ad",
      corridor: "#c18b66",
      visited: "#c5afd0",
      disabled: "#4b5b4d",
      river: "#224951",
      "river-casing": "#e5eed9",
      outline: "#182b1f",
      "on-feedback": "#182b1f",
      "on-selected": "#061009",
      guide: "#c18b66",
    };
  if (theme === "dusk")
    return {
      ...colors,
      surface: "#9a8ba8",
      "context-land": "#a09bbb",
      selectable: "#bdacd0",
      "candidate-hover": "#f3b1df",
      "candidate-hover-outline": "#6c245e",
      selected: "#64e8ed",
      "context-outline": "#1b1126",
      hinted: "#b9b3ea",
      clue: "#b9b3ea",
      "clue-outline": "#1b1126",
      correct: "#8ce77d",
      answer: "#9dafff",
      incorrect: "#ff9891",
      corridor: "#ff8cda",
      visited: "#e2a1f2",
      disabled: "#51465e",
      river: "#282044",
      "river-casing": "#b6f2f4",
      outline: "#21152f",
      "on-feedback": "#21152f",
      "on-selected": "#21152f",
      guide: "#ff8cda",
    };
  if (theme === "survey")
    return {
      ...colors,
      surface: "#b0b0b0",
      "context-land": "#8b96a6",
      selectable: "#c5b8a8",
      "candidate-hover": "#e8c780",
      "candidate-hover-outline": "#755421",
      selected: "#f0c671",
      "context-outline": "#1b1b1b",
      hinted: "#b7c3d4",
      clue: "#b7c3d4",
      "clue-outline": "#1b1b1b",
      correct: "#8bd89a",
      answer: "#8bd0dc",
      incorrect: "#ed9a91",
      corridor: "#d7ad63",
      visited: "#b1a1c5",
      disabled: "#4e4e4e",
      river: "#414a54",
      "river-casing": "#e0e4e7",
      outline: "#202020",
      "on-feedback": "#202020",
      "on-selected": "#202020",
      guide: "#efd18f",
    };
  return colors;
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
