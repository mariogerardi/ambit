// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
import {
  clearGlobeChunkReload,
  reloadGlobeChunkOnce,
} from "../src/app/globeChunkRecovery";

beforeEach(() => sessionStorage.clear());

it("reloads once for a failed globe import, then allows another attempt after success", () => {
  const reload = vi.fn();
  const error = new TypeError(
    "Failed to fetch dynamically imported module: https://playambit.com/assets/GlobeView-old.js",
  );
  expect(reloadGlobeChunkOnce(error, sessionStorage, reload)).toBe(true);
  expect(reloadGlobeChunkOnce(error, sessionStorage, reload)).toBe(false);
  expect(reload).toHaveBeenCalledOnce();
  clearGlobeChunkReload();
  expect(reloadGlobeChunkOnce(error, sessionStorage, reload)).toBe(true);
  expect(reload).toHaveBeenCalledTimes(2);
});

it("does not reload for render or WebGL errors, or when storage is unavailable", () => {
  const reload = vi.fn();
  expect(
    reloadGlobeChunkOnce(
      new Error("WebGL context lost"),
      sessionStorage,
      reload,
    ),
  ).toBe(false);
  expect(
    reloadGlobeChunkOnce(new Error("Render failed"), sessionStorage, reload),
  ).toBe(false);
  expect(
    reloadGlobeChunkOnce(
      new Error("Importing a module script failed."),
      {
        getItem: () => {
          throw new Error("Storage unavailable");
        },
        setItem: vi.fn(),
      },
      reload,
    ),
  ).toBe(false);
  expect(reload).not.toHaveBeenCalled();
});
