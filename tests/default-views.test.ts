import { describe, expect, it } from "vitest";
import {
  DEFAULT_VIEWS,
  createDefaultViewCycle,
  studyCameraTarget,
} from "../src/globe/defaultViews";
describe("Study camera policy", () => {
  it("keeps normal world positions untouched between recall prompts", () => {
    const next = createDefaultViewCycle(3),
      view = { lat: -18, lng: -70, altitude: 1.7 };
    expect(studyCameraTarget(view, 1.65, next)).toBeUndefined();
    expect(studyCameraTarget(view, 1.65, next)).toBeUndefined();
    expect(next(1.65)).toEqual({ ...DEFAULT_VIEWS[3], altitude: 1.65 });
  });
  it("resets only nonstandard zooms and cycles through six answer-independent locations", () => {
    const next = createDefaultViewCycle(2),
      views = [];
    for (let i = 0; i < 7; i++)
      views.push(
        studyCameraTarget(
          { lat: 1, lng: 2, altitude: i % 2 ? 4 : 0.5 },
          1.65,
          next,
        ),
      );
    expect(
      new Set(views.slice(0, 6).map((view) => `${view!.lat},${view!.lng}`))
        .size,
    ).toBe(6);
    expect(views[0]).toEqual(views[6]);
    expect(views.every((v) => v!.altitude === 1.65)).toBe(true);
  });
  it("frames a highlighted-country identification clue without forcing a close zoom", () => {
    const destination = studyCameraTarget(
      { lat: 10, lng: 10, altitude: 1.7 },
      1.65,
      createDefaultViewCycle(),
      { lat: 45, lng: 25 },
    );
    expect(destination).toEqual({ lat: 45, lng: 25, altitude: 1.7 });
  });
});
