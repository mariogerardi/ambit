// @vitest-environment jsdom
import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { LoadingScreen } from "../src/app/LoadingScreen";

const html = readFileSync("index.html", "utf8");
const shell = new DOMParser().parseFromString(html, "text/html");

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

it("ships a small, accessible loading screen in HTML before the app script", () => {
  const loader = shell.querySelector("#root > .ambit-loading-screen");
  const style = shell.querySelector("head style")?.textContent ?? "";
  expect(loader?.getAttribute("role")).toBe("status");
  expect(loader?.getAttribute("aria-live")).toBe("polite");
  expect(loader?.textContent).toContain("Loading your world…");
  expect(loader?.querySelector("svg .ambit-loading-turn")).not.toBeNull();
  expect(style).toContain("100dvh");
  expect(style).toContain("prefers-reduced-motion");
  expect(html.indexOf('id="root"')).toBeLessThan(
    html.indexOf('src="/src/main.tsx"'),
  );
  expect(gzipSync(`${style}${loader?.outerHTML}`).length).toBeLessThan(3000);
  expect(
    shell.querySelector('link[rel="preload"][href*="Manrope"]'),
  ).not.toBeNull();
  expect(
    shell.querySelector('link[rel="preload"][href*="Newsreader"]'),
  ).toBeNull();
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
  expect(
    [...mounted.querySelectorAll(".ambit-loading-turn path")].map((path) =>
      path.getAttribute("d"),
    ),
  ).toEqual(
    [...initial.querySelectorAll(".ambit-loading-turn path")].map((path) =>
      path.getAttribute("d"),
    ),
  );
  await act(async () => root.unmount());
});
