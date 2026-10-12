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

  it("keeps available, selected, and known-context yellows distinct across themes", () => {
    expect(PLAY_HIGHLIGHTS).toEqual({
      selectable: "#efd88e",
      selected: "#ffdb70",
      context: "#efb75b",
    });
    expect(new Set(Object.values(PLAY_HIGHLIGHTS)).size).toBe(3);
    for (const theme of THEME_IDS) {
      expect(playRegionStyle("wurl:ARG", "selectable", false, theme).fill).toBe(
        PLAY_HIGHLIGHTS.selectable,
      );
      expect(playRegionStyle("wurl:ARG", "selected", false, theme).fill).toBe(
        PLAY_HIGHLIGHTS.selected,
      );
      for (const state of ["hinted", "clue"] as const)
        expect(playRegionStyle("wurl:ARG", state, false, theme).fill).toBe(
          PLAY_HIGHLIGHTS.context,
        );
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
          playRegionStyle("CAN", state).fill,
        );
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
