// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyTheme,
  DEFAULT_THEME,
  isTheme,
  readTheme,
  saveTheme,
  THEME_IDS,
  THEME_KEY,
  THEMES,
} from "../src/theme/themes";
import { playColors } from "../src/theme/playColors";
import {
  PLAY_HIGHLIGHTS,
  playRegionStyle,
  themedRegionStyle,
} from "../src/globe/themes";

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    clear: () => store.clear(),
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function contrast(a: string, b: string) {
  const luminance = (hex: string) => {
    const rgb = hex
      .slice(1)
      .match(/../g)!
      .map((channel) => parseInt(channel, 16) / 255)
      .map((channel) =>
        channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4,
      );
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

describe("application themes", () => {
  it("persists a versioned preference and safely rejects corrupt or unknown values", () => {
    expect(readTheme()).toBe(DEFAULT_THEME);
    saveTheme("paper");
    expect(readTheme()).toBe("paper");
    for (const value of [
      "{",
      "null",
      '"ocean"',
      '{"version":2,"theme":"dusk"}',
      '{"version":1,"theme":"toString"}',
    ]) {
      localStorage.setItem(THEME_KEY, value);
      expect(readTheme()).toBe(DEFAULT_THEME);
    }
    expect(isTheme("constructor")).toBe(false);
  });

  it("remains usable when preference storage is blocked", () => {
    vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readTheme()).toBe(DEFAULT_THEME);
    expect(() => saveTheme("ocean")).not.toThrow();
    applyTheme("ocean");
    expect(document.documentElement.dataset.theme).toBe("ocean");
  });

  it.each(THEME_IDS)(
    "applies %s to document, native controls, and browser chrome with legible UI roles",
    (id) => {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.append(meta);
      applyTheme(id);
      const { ui, scheme } = THEMES[id];
      expect(document.documentElement.style.colorScheme).toBe(scheme);
      expect(meta.content).toBe(ui.bg);
      expect(Object.keys(ui).sort()).toEqual(
        Object.keys(THEMES.atlas.ui).sort(),
      );
      for (const [name, value] of Object.entries(ui)) {
        expect(
          document.documentElement.style.getPropertyValue(`--ui-${name}`),
        ).toBe(value);
      }
      const rgbHex = (value: string) =>
        "#" +
        value
          .split(" ")
          .map((channel) => Number(channel).toString(16).padStart(2, "0"))
          .join("");
      for (const background of [
        ui.bg,
        ui.input,
        rgbHex(ui["surface-rgb"]),
        rgbHex(ui["raised-rgb"]),
      ]) {
        for (const foreground of [
          ui.text,
          ui.muted,
          ui.faint,
          ui.accent,
          ui.editorial,
        ]) {
          expect(
            contrast(foreground, background),
            `${id}: ${foreground} on ${background}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
      for (const background of [
        ui.action,
        ui["action-hover"],
        ui["daily-action"],
        ui["daily-action-hover"],
      ]) {
        expect(contrast(ui["on-accent"], background)).toBeGreaterThanOrEqual(
          4.5,
        );
      }
      meta.remove();
    },
  );

  it("distinguishes interaction from context and gives selection a legible outline in every theme", () => {
    expect(new Set(Object.values(PLAY_HIGHLIGHTS)).size).toBe(3);
    for (const theme of THEME_IDS) {
      const candidate = playRegionStyle("wurl:ARG", "selectable", false, theme);
      const selected = playRegionStyle("wurl:ARG", "selected", false, theme);
      const context = playRegionStyle("wurl:ARG", "hinted", false, theme);
      expect(context.fill).not.toBe(playColors(theme).hinted);
      expect(context.stroke).toBe(playColors(theme)["context-outline"]);
      expect(contrast(context.stroke, context.fill)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(
        contrast(context.stroke, playColors(theme).disabled),
      ).toBeGreaterThanOrEqual(2);
      expect(
        contrast(playColors(theme).visited, playColors(theme).disabled),
      ).toBeGreaterThan(2);
      expect(new Set([candidate.fill, selected.fill, context.fill]).size).toBe(
        3,
      );
      expect(contrast(selected.stroke, selected.fill)).toBeGreaterThanOrEqual(
        3,
      );
      applyTheme(theme);
      expect(
        document.documentElement.style.getPropertyValue("--play-selected"),
      ).toBe(selected.fill);
    }
  });

  it("changes geography appearance without changing the meaning of answers and selections", () => {
    expect(
      new Set(
        THEME_IDS.map(
          (id) => playRegionStyle("CAN", "default", false, id).fill,
        ),
      ).size,
    ).toBe(4);
    for (const id of THEME_IDS) {
      for (const state of [
        "selected",
        "selectable",
        "correct",
        "incorrect",
        "answer",
        "clue",
      ] as const) {
        expect(playRegionStyle("CAN", state, false, id).fill).toBe(
          playColors(id)[state === "clue" ? "clue" : state],
        );
        if (state !== "selectable")
          expect(playRegionStyle("CAN", state, true, id).fill).toBe(
            playRegionStyle("CAN", state, false, id).fill,
          );
      }
      expect(
        themedRegionStyle("natural", "CAN", "selected", false, id),
      ).toEqual(themedRegionStyle("natural", "CAN", "selected"));
    }
  });
});

it("gives clues the same restrained, legible outline as references in every theme", () => {
  for (const theme of THEME_IDS) {
    const style = playRegionStyle("clue-part:test", "clue", false, theme);
    expect(
      contrast(style.stroke, playColors(theme).disabled),
      theme,
    ).toBeGreaterThanOrEqual(2);
    expect(contrast(style.stroke, style.fill), theme).toBeGreaterThanOrEqual(3);
    expect(style.stroke).toBe(
      playRegionStyle("reference", "hinted", false, theme).stroke,
    );
    expect(style.stroke).not.toBe(
      playRegionStyle("candidate", "selectable", false, theme).stroke,
    );
  }
});

it("distinguishes candidate hover from selection and leaves noninteractive roles steady", () => {
  for (const theme of THEME_IDS) {
    for (const state of ["selectable", "surface"] as const) {
      const idle = playRegionStyle("candidate", state, false, theme);
      const hover = playRegionStyle("candidate", state, true, theme);
      expect(hover.fill, theme).not.toBe(idle.fill);
      expect(hover.fill, theme).not.toBe(playColors(theme).selected);
      expect(hover.stroke, theme).not.toBe(idle.stroke);
      expect(contrast(hover.stroke, hover.fill), theme).toBeGreaterThanOrEqual(
        3,
      );
    }
    for (const state of [
      "hinted",
      "clue",
      "disabled",
      "selected",
      "correct",
      "answer",
      "incorrect",
      "visited",
    ] as const)
      expect(playRegionStyle("steady", state, true, theme)).toEqual(
        playRegionStyle("steady", state, false, theme),
      );
  }
});

it("keeps river ink or casing readable over reference and muted land in every theme", () => {
  for (const theme of THEME_IDS) {
    const colors = playColors(theme);
    expect(
      contrast(colors.river, colors["context-land"]),
      theme,
    ).toBeGreaterThanOrEqual(2);
    for (const background of [colors.disabled, colors.selectable])
      expect(
        Math.max(
          contrast(colors.river, background),
          contrast(colors["river-casing"], background),
        ),
        theme,
      ).toBeGreaterThanOrEqual(3);
  }
});
