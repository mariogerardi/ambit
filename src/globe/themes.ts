import type { VisualState } from "../geography/types";
import { regionStyle } from "./visualStates";
import { THEMES } from "../theme/themes";
import type { ThemeId } from "../theme/themes";
import mapColors from "../geography/data/map-colors.v1.json";
import { playColors } from "../theme/playColors";
export { PLAY_HIGHLIGHTS, PLAY_FEEDBACK } from "../theme/playColors";
export type GlobeTheme = "natural" | "play";
/** Available countries, player selections, and known context have distinct tones. */
/** Regions, places, paths and UI use the same semantic palette. */
export function playStateColor(
  state: VisualState,
  palette: ThemeId = "atlas",
): string | undefined {
  const colors = playColors(palette);
  return state in colors ? colors[state as keyof typeof colors] : undefined;
}
export function playRegionStyle(
  id: string,
  state: VisualState = "default",
  hovered = false,
  palette: ThemeId = "atlas",
) {
  const { land, border } = THEMES[palette].globe;
  let hash = 0;
  for (const character of id)
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  const colors = playColors(palette);
  const candidateHover = hovered && ["selectable", "surface"].includes(state);
  return {
    fill: candidateHover
      ? colors["candidate-hover"]
      : state === "hinted"
        ? colors["context-land"]
        : (playStateColor(state, palette) ??
          land[
            ((mapColors.colors as Record<string, number>)[id] ?? hash) %
              land.length
          ]),
    stroke: candidateHover
      ? colors["candidate-hover-outline"]
      : state === "hinted"
        ? colors["context-outline"]
        : state === "clue"
          ? colors["clue-outline"]
          : ["selected", "correct", "answer", "incorrect", "visited"].includes(
                state,
              )
            ? colors.outline
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
