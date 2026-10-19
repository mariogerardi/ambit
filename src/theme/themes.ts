import { playColors } from "./playColors";
export type ThemeId = "atlas" | "ocean" | "dusk" | "paper";
interface Theme {
  name: string;
  scheme: "dark" | "light";
  ui: Record<string, string>;
  globe: {
    ocean: string;
    atmosphere: string;
    land: readonly string[];
    disabled: string;
    border: string;
    highlight: string;
  };
}
const dark = {
  bg: "#050d11",
  input: "#061216",
  text: "#eff1df",
  muted: "#b6c9bf",
  faint: "#91aaa4",
  editorial: "#e5cf94",
  "editorial-rgb": "229 207 148",
  accent: "#a7d9cc",
  "accent-hover": "#c5eee2",
  action: "#e5cf94",
  "action-hover": "#f1dfae",
  "daily-action": "#f0cc7a",
  "daily-action-hover": "#ffdb90",
  "on-accent": "#203b3b",
  "accent-rgb": "167 217 204",
  "line-rgb": "145 170 164",
  "surface-rgb": "22 29 32",
  "raised-rgb": "36 44 43",
  "scrim-rgb": "3 10 14",
  "shadow-rgb": "0 0 0",
  "shadow-strength": "1",
  focus: "#efd18f",
  correct: "#9de0b7",
  incorrect: "#ffa19a",
  "text-shadow": "0 1px 3px rgb(0 0 0 / .6)",
};
export const THEMES: Record<ThemeId, Theme> = {
  atlas: {
    name: "Atlas",
    scheme: "dark",
    ui: dark,
    globe: {
      ocean: "#234650",
      atmosphere: "#8dcfc7",
      land: ["#a4c898", "#e4ca83", "#72bfb3", "#d5a17d", "#b4a8cf", "#bec887"],
      disabled: "#788f91",
      border: "rgba(37,62,60,0.52)",
      highlight: "#fff1be",
    },
  },
  ocean: {
    name: "Ocean",
    scheme: "dark",
    ui: {
      ...dark,
      bg: "#071321",
      input: "#0a1b2c",
      text: "#edf4f7",
      muted: "#b2c9d7",
      faint: "#8da9ba",
      editorial: "#efbb91",
      "editorial-rgb": "239 187 145",
      accent: "#9fdde4",
      "accent-hover": "#c0eef0",
      action: "#efbb91",
      "action-hover": "#f8d4b3",
      "daily-action": "#efbb91",
      "daily-action-hover": "#f8d4b3",
      "on-accent": "#102b3c",
      "accent-rgb": "159 221 228",
      "line-rgb": "141 169 186",
      focus: "#9fdde4",
      "surface-rgb": "22 31 42",
      "raised-rgb": "36 45 53",
      "scrim-rgb": "7 19 33",
    },
    globe: {
      ocean: "#153c65",
      atmosphere: "#8ecfe3",
      land: ["#86cabc", "#dcab86", "#b3c98e", "#b6a7d8", "#e1d0a5", "#8ebace"],
      disabled: "#7291a7",
      border: "rgba(27,55,73,0.65)",
      highlight: "#fff1be",
    },
  },
  dusk: {
    name: "Dusk",
    scheme: "dark",
    ui: {
      ...dark,
      bg: "#17131d",
      input: "#1e1b26",
      text: "#f6eee5",
      muted: "#ccbfcf",
      faint: "#ae98b2",
      editorial: "#efcc88",
      "editorial-rgb": "239 204 136",
      accent: "#f0b98b",
      "accent-hover": "#f6d1ad",
      action: "#a1d6c8",
      "action-hover": "#c0eadf",
      "daily-action": "#a1d6c8",
      "daily-action-hover": "#c0eadf",
      "on-accent": "#332033",
      "accent-rgb": "240 185 139",
      "line-rgb": "174 152 178",
      focus: "#f0b98b",
      "surface-rgb": "32 32 42",
      "raised-rgb": "47 39 50",
      "scrim-rgb": "23 19 29",
    },
    globe: {
      ocean: "#3b2f4f",
      atmosphere: "#bd9dc2",
      land: ["#b4a3d8", "#89c6b2", "#e4c58e", "#d59a79", "#92bdcf", "#aebd7a"],
      disabled: "#9a8c9c",
      border: "rgba(64,43,64,0.65)",
      highlight: "#fff1be",
    },
  },
  paper: {
    name: "Paper",
    scheme: "light",
    ui: {
      ...dark,
      bg: "#f4eee1",
      input: "#fffaf0",
      text: "#29343b",
      muted: "#50616a",
      faint: "#53616a",
      editorial: "#934831",
      "editorial-rgb": "147 72 49",
      accent: "#215f65",
      "accent-hover": "#16484d",
      action: "#294f70",
      "action-hover": "#1d3e5a",
      "daily-action": "#294f70",
      "daily-action-hover": "#1d3e5a",
      "on-accent": "#fffaf0",
      "accent-rgb": "33 95 101",
      "line-rgb": "104 119 127",
      focus: "#215f65",
      "shadow-rgb": "55 44 26",
      "shadow-strength": ".18",
      "text-shadow": "none",
      correct: "#26734e",
      incorrect: "#b33c35",
      "surface-rgb": "255 250 240",
      "raised-rgb": "229 226 216",
      "scrim-rgb": "244 238 225",
    },
    globe: {
      ocean: "#82b3cc",
      atmosphere: "#7eafbd",
      land: ["#93b79c", "#d5bc7e", "#ce997e", "#aab8d2", "#9abfc2", "#c3a2b6"],
      disabled: "#b3b7a7",
      border: "rgba(60,78,68,0.65)",
      highlight: "#78541d",
    },
  },
};
export const THEME_IDS = Object.keys(THEMES) as ThemeId[];
export const THEME_KEY = "ambit.theme.v1";
export const DEFAULT_THEME: ThemeId = "atlas";
export function isTheme(value: unknown): value is ThemeId {
  return typeof value === "string" && Object.hasOwn(THEMES, value);
}
export function readTheme(): ThemeId {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(THEME_KEY) ?? "null",
    );
    if (
      value &&
      typeof value === "object" &&
      "version" in value &&
      value.version === 1 &&
      "theme" in value &&
      isTheme(value.theme)
    )
      return value.theme;
  } catch {
    /* Unavailable or malformed preferences use the default. */
  }
  return DEFAULT_THEME;
}
export function saveTheme(theme: ThemeId) {
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify({ version: 1, theme }));
  } catch {
    /* The live selection still works when storage is unavailable. */
  }
}
export function applyTheme(id: ThemeId, root = document.documentElement) {
  const theme = THEMES[id];
  root.dataset.theme = id;
  root.style.colorScheme = theme.scheme;
  for (const [name, value] of Object.entries(theme.ui))
    root.style.setProperty(`--ui-${name}`, value);
  root.style.setProperty("--map-neutral", theme.globe.disabled);
  for (const [role, color] of Object.entries(playColors(id)))
    root.style.setProperty(`--play-${role}`, color);
  root.ownerDocument
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme.ui.bg);
}
