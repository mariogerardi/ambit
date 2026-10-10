import type { VisualState } from "../geography/types";
import { regionStyle } from "./visualStates";
import { THEMES } from "../theme/themes";
import type { ThemeId } from "../theme/themes";
export type GlobeTheme = "natural" | "play";
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
    selectable: "#efd88e",
    selected: "#ffdb70",
    correct: "#78dfaa",
    answer: "#439d78",
    incorrect: "#ed6d68",
    visited: "#b79ae3",
    disabled,
    hinted: "#efb75b",
    clue: "#efb75b",
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
