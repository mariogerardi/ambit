import { DEFAULT_THEME, THEMES } from "./themes.ts";
import type { ThemeId } from "./themes";
import { playColors } from "./playColors.ts";

/** Authored illustrations only: flags and photographic clues retain their true colors. */
export const ARTWORK_PATHS = [
  "/previews/shared-neighbors.svg",
  "/previews/missing-borders.svg",
  "/previews/border-run.svg",
  "/previews/pinpoint.svg",
  "/previews/discover-asia.svg",
  "/previews/african-capitals.svg",
  "/previews/world-flags.svg",
  "/brand/account-globe.svg",
  "/ambit-orb.svg",
] as const;
export const ARTWORK_THEMES = ["ocean", "survey", "dusk", "paper"] as const;

export function artworkUrl(path: string, theme: ThemeId = DEFAULT_THEME) {
  return ARTWORK_PATHS.some((p) => p === path)
    ? `/artwork/${theme}${path}`
    : path;
}

/** Preserve the authored paths, flags, framing and opacity; map decorative inks by role. */
export function recolorArtwork(svg: string, path: string, theme: ThemeId) {
  const { ui, globe } = THEMES[theme],
    play = playColors(theme);
  const colors: Record<string, string> = path.includes("/previews/")
    ? {
        "#203b46": globe.ocean,
        "#091622": ui.bg,
        "#42616e": ui.accent,
        "#28434c": play.disabled,
        "#718a8c": globe.border,
        "#41636a": play["context-land"],
        "#233b46": ui.input,
        "#efbc91": play.selected,
        "#9ed9df": play.answer,
      }
    : path === "/ambit-orb.svg"
      ? {
          "#8bd5ce": globe.ocean,
          "#419caa": globe.ocean,
          "#205568": globe.ocean,
          "#a4cf9c": globe.land[0],
          "#fff": ui.text,
        }
      : {
          "#071321": ui.bg,
          "#122a3a": ui.input,
          "#35788a": globe.ocean,
          "#0b2a46": globe.ocean,
          "#d4ffff": ui.text,
          "#081424": ui.bg,
          "#020912": ui.bg,
          "#b3c98e": globe.land[0],
          "#213e50": globe.border,
          "#dcab86": globe.land[1],
          "#b6a7d8": globe.land[2],
          "#8ebace": globe.land[3],
          "#86cabc": globe.land[4],
          "#e1d0a5": globe.land[5],
          "#83cac9": ui.accent,
        };
  return svg.replace(
    /#[0-9a-f]{3,8}\b/gi,
    (color) => colors[color.toLowerCase()] ?? color,
  );
}
