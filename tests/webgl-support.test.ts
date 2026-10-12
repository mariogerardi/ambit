// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { supportsWebGL } from "../src/globe/support";
afterEach(() => vi.restoreAllMocks());
it("uses the fallback when WebGL 2 is unavailable or the probe fails", () => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  expect(supportsWebGL()).toBe(false);
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementation(() => {
    throw new Error("disabled");
  });
  expect(supportsWebGL()).toBe(false);
});
it("releases a supported probe before creating the persistent renderer", () => {
  const loseContext = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    getExtension: () => ({ loseContext }),
  } as unknown as WebGL2RenderingContext);
  expect(supportsWebGL()).toBe(true);
  expect(loseContext).toHaveBeenCalledOnce();
});
