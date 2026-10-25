import { playColors } from "./playColors.ts";
import { themeCursors } from "./cursors.ts";
export type ThemeId = "ocean" | "survey" | "dusk" | "paper";
interface Theme {
  name: string;
  scheme: "dark" | "light";
  ui: Record<string, string>;
  globe: {
    ocean: string;
    atmosphere: string;
    showAtmosphere: boolean;
    land: readonly string[];
    disabled: string;
    border: string;
    candidateBorder?: string;
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
const discoveryUi = {
  ...dark,
  bg: "#101010",
  input: "#161616",
  text: "#ececec",
  muted: "#bdbdbd",
  faint: "#a6a6a6",
  editorial: "#e6ad7c",
  "editorial-rgb": "230 173 124",
  accent: "#91dfbd",
  "accent-hover": "#b2edd3",
  action: "#e6ad7c",
  "action-hover": "#f1c39e",
  "daily-action": "#e6ad7c",
  "daily-action-hover": "#f1c39e",
  "on-accent": "#202020",
  "accent-rgb": "145 223 189",
  "line-rgb": "160 160 160",
  focus: "#91dfbd",
  "surface-rgb": "28 28 28",
  "raised-rgb": "38 38 38",
  "scrim-rgb": "16 16 16",
  "shadow-strength": ".6",
  "text-shadow": "none",
  correct: "#79d58b",
  incorrect: "#eb9b96",
};
export const THEMES: Record<ThemeId, Theme> = {
  ocean: {
    name: "Discovery",
    scheme: "dark",
    ui: discoveryUi,
    globe: {
      ocean: "#234d69",
      atmosphere: "#a6a6a6",
      showAtmosphere: false,
      land: ["#78cfa0", "#efbc62", "#70bfce", "#e99579", "#b59ae1", "#bfd574"],
      disabled: "#5b5b5b",
      border: "rgba(25,47,57,0.7)",
      highlight: "#e6ad7c",
    },
  },
  survey: {
    name: "Odyssey",
    scheme: "dark",
    ui: {
      ...discoveryUi,
      editorial: "#f0c671",
      "editorial-rgb": "240 198 113",
      accent: "#f0c671",
      "accent-hover": "#f6d798",
      action: "#f0c671",
      "action-hover": "#f6d798",
      "daily-action": "#f0c671",
      "daily-action-hover": "#f6d798",
      "accent-rgb": "240 198 113",
      focus: "#f0c671",
      correct: "#8bd89a",
      incorrect: "#ed9a91",
    },
    globe: {
      ocean: "#242424",
      atmosphere: "#bcbcbc",
      showAtmosphere: false,
      land: ["#676767", "#858585", "#747474", "#969696", "#5b5b5b", "#a6a6a6"],
      disabled: "#4e4e4e",
      border: "rgba(225,225,225,0.7)",
      candidateBorder: "#202020",
      highlight: "#f0c671",
    },
  },
  dusk: {
    // Preserve saved Dusk preferences while rebuilding its visual identity.
    name: "Expedition",
    scheme: "dark",
    ui: {
      ...discoveryUi,
      bg: "#100d18",
      input: "#171320",
      text: "#f2edf9",
      muted: "#c4bad5",
      faint: "#afa1c5",
      editorial: "#ff8cda",
      "editorial-rgb": "255 140 218",
      accent: "#64e8ed",
      "accent-hover": "#a0f4f6",
      action: "#64e8ed",
      "action-hover": "#a0f4f6",
      "daily-action": "#64e8ed",
      "daily-action-hover": "#a0f4f6",
      "on-accent": "#161020",
      "accent-rgb": "100 232 237",
      "line-rgb": "151 126 181",
      focus: "#64e8ed",
      "surface-rgb": "29 23 40",
      "raised-rgb": "40 31 54",
      "scrim-rgb": "16 13 24",
      correct: "#8ce77d",
      incorrect: "#ff9891",
    },
    globe: {
      ocean: "#211833",
      atmosphere: "#b79ae5",
      showAtmosphere: false,
      land: ["#ae7fea", "#48bdc9", "#df78bb", "#678fe0", "#c4a4ec", "#dfa76b"],
      disabled: "#51465e",
      border: "rgba(25,16,39,0.85)",
      candidateBorder: "#21152f",
      highlight: "#64e8ed",
    },
  },
  paper: {
    // Keep the original preference ID so existing selections survive the redesign.
    name: "Safari",
    scheme: "dark",
    ui: {
      ...discoveryUi,
      bg: "#08140d",
      input: "#111f16",
      text: "#f0eddf",
      muted: "#c2c8b9",
      faint: "#abb7a2",
      // Matching lighter ink keeps small editorial text legible on raised surfaces.
      editorial: "#c18b66",
      "editorial-rgb": "193 139 102",
      accent: "#a3dec5",
      "accent-hover": "#c2ebda",
      action: "#ad704a",
      "action-hover": "#bd825b",
      "daily-action": "#ad704a",
      "daily-action-hover": "#bd825b",
      "on-accent": "#061009",
      "accent-rgb": "163 222 197",
      "line-rgb": "147 165 140",
      focus: "#a3dec5",
      correct: "#76d496",
      incorrect: "#e898ad",
      "surface-rgb": "27 38 29",
      "raised-rgb": "37 51 39",
      "scrim-rgb": "8 20 13",
    },
    globe: {
      ocean: "#204c68",
      atmosphere: "#a5b79b",
      showAtmosphere: false,
      land: ["#72956b", "#8da976", "#537f65", "#a1b68b", "#699785", "#8b8a60"],
      disabled: "#4b5b4d",
      border: "rgba(10,27,17,0.8)",
      candidateBorder: "#17271b",
      highlight: "#ad704a",
    },
  },
};
export const THEME_IDS = Object.keys(THEMES) as ThemeId[];
export const THEME_KEY = "ambit.theme.v1";
export const DEFAULT_THEME: ThemeId = "ocean";
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
  root.style.setProperty(
    "--artwork-account",
    `url("/artwork/${id}/brand/account-globe.svg")`,
  );
  for (const [name, value] of Object.entries(theme.ui))
    root.style.setProperty(`--ui-${name}`, value);
  root.style.setProperty("--map-neutral", theme.globe.disabled);
  root.style.setProperty("--map-ocean", theme.globe.ocean);
  root.style.setProperty("--map-atmosphere", theme.globe.atmosphere);
  root.style.setProperty("--map-border", theme.globe.border);
  theme.globe.land.forEach((color, index) =>
    root.style.setProperty(`--map-land-${index}`, color),
  );
  for (const [role, color] of Object.entries(playColors(id)))
    root.style.setProperty(`--play-${role}`, color);
  for (const [tool, value] of Object.entries(
    themeCursors(playColors(id), theme.ui.text),
  ))
    root.style.setProperty(`--cursor-${tool}`, value);
  root.ownerDocument
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme.ui.bg);
}
