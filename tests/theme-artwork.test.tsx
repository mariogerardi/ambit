// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { readFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
import {
  ARTWORK_PATHS,
  ARTWORK_THEMES,
  artworkUrl,
  recolorArtwork,
} from "../src/theme/artwork";
import { ThemeContext, ThemedImage } from "../src/theme/ThemedImage";
import { THEMES } from "../src/theme/themes";
import { playColors } from "../src/theme/playColors";

it("ships current themed artwork without changing its authored geometry or embedded flag illustrations", () => {
  for (const path of ARTWORK_PATHS) {
    const source = readFileSync(`public${path}`, "utf8");
    for (const theme of ARTWORK_THEMES) {
      const svg = readFileSync(`public${artworkUrl(path, theme)}`, "utf8");
      expect(svg).toBe(recolorArtwork(source, path, theme));
      expect([...svg.matchAll(/\bd="([^"]*)"/g)].map((m) => m[1])).toEqual(
        [...source.matchAll(/\bd="([^"]*)"/g)].map((m) => m[1]),
      );
      expect(
        [...svg.matchAll(/(?:href|xlink:href)="([^"]*)"/g)].map((m) => m[1]),
      ).toEqual(
        [...source.matchAll(/(?:href|xlink:href)="([^"]*)"/g)].map((m) => m[1]),
      );
      if (path.includes("/previews/")) {
        expect(svg).toContain(THEMES[theme].ui.bg);
        expect(svg).toContain(playColors(theme).selected);
        expect(svg).not.toContain("#efbc91");
      }
    }
  }
  expect(artworkUrl("/flags/example.svg", "dusk")).toBe("/flags/example.svg");
  expect(artworkUrl("/minigames/pinpoint/photo.jpg", "survey")).toBe(
    "/minigames/pinpoint/photo.jpg",
  );
});

it("updates an already mounted illustration when the live theme changes", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const host = document.createElement("div"),
    root = createRoot(host);
  try {
    for (const theme of ARTWORK_THEMES) {
      await act(async () =>
        root.render(
          <ThemeContext value={theme}>
            <ThemedImage src="/previews/border-run.svg" alt="A route" />
          </ThemeContext>,
        ),
      );
      expect(host.querySelector("img")?.getAttribute("src")).toBe(
        `/artwork/${theme}/previews/border-run.svg`,
      );
      expect(host.querySelector("img")?.alt).toBe("A route");
    }
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});
