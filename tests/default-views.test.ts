import { describe, expect, it } from "vitest";
import {
  DEFAULT_WORLD_VIEW,
  worldView,
  studyCameraTarget,
} from "../src/globe/defaultViews";
describe("shared world overview policy", () => {
  it("keeps normal world positions untouched between recall prompts", () => {
    expect(
      studyCameraTarget({ lat: -18, lng: -70, altitude: 1.7 }, 1.65),
    ).toBeUndefined();
  });
  it("resets nonstandard zoom without choosing another continent", () => {
    for (const altitude of [0.1, 4])
      expect(studyCameraTarget({ lat: 1, lng: 2, altitude }, 1.65)).toEqual({
        lat: 1,
        lng: 2,
        altitude: 1.65,
      });
  });
  it("frames an explicit country clue", () => {
    expect(
      studyCameraTarget({ lat: 10, lng: 10, altitude: 1.7 }, 1.65, {
        lat: 45,
        lng: 25,
      }),
    ).toEqual({ lat: 45, lng: 25, altitude: 1.7 });
  });
  it("uses a stable orientation only when no live view exists", () => {
    expect(worldView(undefined, 2)).toEqual({
      ...DEFAULT_WORLD_VIEW,
      altitude: 2,
    });
    expect(worldView({ lat: 70, lng: -50, altitude: 0.2 }, 2)).toEqual({
      lat: 70,
      lng: -50,
      altitude: 2,
    });
  });
});
