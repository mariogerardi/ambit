// @vitest-environment jsdom
import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { afterEach, expect, it, vi } from "vitest";
import { LoadingScreen } from "../src/app/LoadingScreen";
import { THEME_KEY, THEMES } from "../src/theme/themes";

const html = readFileSync("index.html", "utf8");
const shell = new DOMParser().parseFromString(html, "text/html");

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("ships a small, accessible loading screen in HTML before the app script", () => {
  const loader = shell.querySelector("#root > .ambit-loading-screen");
  const style = shell.querySelector("head style")?.textContent ?? "";
  expect(loader?.getAttribute("role")).toBe("status");
  expect(loader?.getAttribute("aria-live")).toBe("polite");
  expect(loader?.textContent).toContain("Loading your world…");
  const map = loader?.querySelector("svg .ambit-loading-map");
  expect(map?.parentElement?.getAttribute("clip-path")).toBe(
    "url(#ambit-loading-clip)",
  );
  expect(map?.getAttribute("transform")).toBe("translate(-90)");
  expect(map?.querySelectorAll('use[href="#ambit-loading-land"]')).toHaveLength(
    1,
  );
  expect(
    [...(loader?.querySelectorAll("#ambit-loading-land path[fill]") ?? [])].map(
      (path) => path.getAttribute("fill"),
    ),
  ).toEqual(THEMES.atlas.globe.land);
  expect(
    loader
      ?.querySelector("#ambit-loading-ocean stop[offset='.55']")
      ?.getAttribute("stop-color"),
  ).toBe(THEMES.atlas.globe.ocean);
  for (const path of loader?.querySelectorAll("#ambit-loading-land path") ??
    []) {
    expect(path.getAttribute("d")).not.toMatch(/M0,20(?:L180,20|h180)/);
  }
  expect(style).toContain("100dvh");
  expect(style).toContain(THEMES.atlas.ui.bg);
  expect(style).toContain("min(38vw, 170px)");
  expect(style).toContain("animation: ambit-loading-glow 3.2s");
  expect(style).toContain("filter: drop-shadow(0 0 32px #8dcfc777)");
  expect(style).not.toContain("ambit-loading-orbit");
  expect(style).toContain("prefers-reduced-motion");
  expect(style).toContain("animation-duration: 8s");
  expect(style).toContain("transition: opacity 450ms");
  expect(html.indexOf('id="root"')).toBeLessThan(
    html.indexOf('src="/src/main.tsx"'),
  );
  expect(
    gzipSync(
      `${style}${shell.querySelector("head script")?.textContent}${loader?.outerHTML}`,
    ).length,
  ).toBeLessThan(3200);
  expect(
    shell.querySelector('link[rel="preload"][href*="Manrope"]'),
  ).not.toBeNull();
  expect(
    shell.querySelector('link[rel="preload"][href*="Newsreader"]'),
  ).toBeNull();
});

it("uses the saved theme before the app bundle loads", () => {
  for (const theme of ["atlas", "ocean", "dusk", "paper"] as const) {
    const page = new JSDOM(html, {
      url: "https://playambit.com",
      runScripts: "dangerously",
      beforeParse(window) {
        window.localStorage.setItem(
          THEME_KEY,
          JSON.stringify({ version: 1, theme }),
        );
      },
    });
    const root = page.window.document.documentElement;
    if (theme === "atlas") {
      expect(root.dataset.theme).toBeUndefined();
    } else {
      expect(root.dataset.theme).toBe(theme);
      expect(
        page.window.getComputedStyle(root).getPropertyValue("--ui-bg").trim(),
      ).toBe(THEMES[theme].ui.bg);
    }
    page.window.close();
  }
  expect(html.indexOf("localStorage.getItem")).toBeLessThan(
    html.indexOf('id="root"'),
  );
});

it("keeps the React loading markup aligned with the HTML shell", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<LoadingScreen />));
  const initial = shell.querySelector(".ambit-loading-screen")!;
  const mounted = document.body.querySelector(".ambit-loading-screen")!;
  expect(mounted.textContent?.replace(/\s+/g, "")).toBe(
    initial.textContent?.replace(/\s+/g, ""),
  );
  expect(mounted.querySelector("svg")?.getAttribute("viewBox")).toBe(
    initial.querySelector("svg")?.getAttribute("viewBox"),
  );
  for (const selector of [
    "#ambit-loading-land path",
    ".ambit-loading-map use",
    "radialGradient stop",
  ]) {
    expect(
      [...mounted.querySelectorAll(selector)].map((element) =>
        [...element.attributes]
          .map((attribute) => `${attribute.name}=${attribute.value}`)
          .sort(),
      ),
    ).toEqual(
      [...initial.querySelectorAll(selector)].map((element) =>
        [...element.attributes]
          .map((attribute) => `${attribute.name}=${attribute.value}`)
          .sort(),
      ),
    );
  }
  await act(async () => root.unmount());
});

it("fades out and removes the React loader after content is ready", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers();
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<LoadingScreen active />));
  await act(async () => root.render(<LoadingScreen active={false} />));
  expect(
    document.body
      .querySelector(".ambit-loading-screen.is-leaving")
      ?.getAttribute("aria-hidden"),
  ).toBe("true");
  await act(async () => vi.advanceTimersByTime(500));
  expect(document.body.querySelector(".ambit-loading-screen")).toBeNull();
  await act(async () => root.unmount());
});
