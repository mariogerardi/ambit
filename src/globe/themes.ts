import type { VisualState } from "../geography/types";
import { regionStyle } from "./visualStates";
import { THEMES } from "../theme/themes";
import type { ThemeId } from "../theme/themes";
export type GlobeTheme = "natural" | "play";
/** Available countries, player selections, and known context have distinct tones. */
export const PLAY_HIGHLIGHTS = {
  selectable: "#efd88e",
  selected: "#ffdb70",
  context: "#efb75b",
} as const;
/** Graded answers and recap share exact colors across land, markers and paths. */
export const PLAY_FEEDBACK = {
  correct: "#78dfaa",
  answer: "#439d78",
  incorrect: "#ed6d68",
  visited: "#b79ae3",
} as const;
export function playStateColor(state: VisualState): string | undefined {
  if (state === "hinted" || state === "clue") return PLAY_HIGHLIGHTS.context;
  if (state === "selected" || state === "selectable")
    return PLAY_HIGHLIGHTS[state];
  if (
    state === "correct" ||
    state === "answer" ||
    state === "incorrect" ||
    state === "visited"
  )
    return PLAY_FEEDBACK[state];
  return undefined;
}
export function playRegionStyle(
  id: string,
  state: VisualState = "default",
  hovered = false,
  palette: ThemeId = "atlas",
) {
  const { land, disabled, border, highlight } = THEMES[palette].globe;
  let hash = 0;
  for (const character of id)
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  const colors: Partial<Record<VisualState, string>> = {
    selectable: PLAY_HIGHLIGHTS.selectable,
    selected: PLAY_HIGHLIGHTS.selected,
    ...PLAY_FEEDBACK,
    disabled,
    hinted: PLAY_HIGHLIGHTS.context,
    clue: PLAY_HIGHLIGHTS.context,
  };
  return {
    fill: colors[state] ?? land[hash % land.length],
    stroke:
      hovered && state !== "disabled"
        ? highlight
        : state === "selected"
          ? highlight
          : border,
  };
}
export function themedRegionStyle(
  theme: GlobeTheme,
  id: string,
  state: VisualState = "default",
  hovered = false,
  palette: ThemeId = "atlas",
) {
  return theme === "play"
    ? playRegionStyle(id, state, hovered, palette)
    : regionStyle(state, hovered);
}
