import { describe, expect, it } from "vitest";
import { canPickRegion } from "../src/globe/interaction";

describe("region answer affordances", () => {
  it("keeps context and revealed answers inspectable without making them selectable", () => {
    const settings = {
      regionInteraction: true,
      selectableRegionIds: [],
      states: { context: "hinted", solution: "answer" } as const,
    };
    expect(canPickRegion({ id: "context" }, settings)).toBe(false);
    expect(canPickRegion({ id: "solution" }, settings)).toBe(false);
  });

  it("uses eligibility independently of fill, including blind picks and eliminated candidates", () => {
    const settings = {
      regionInteraction: true,
      selectDisabled: true,
      selectableRegionIds: ["blind"],
      states: { blind: "disabled", eliminated: "selectable" } as const,
    };
    expect(canPickRegion({ id: "blind" }, settings)).toBe(true);
    expect(canPickRegion({ id: "eliminated" }, settings)).toBe(false);
    expect(canPickRegion({ id: "blind", displayBase: true }, settings)).toBe(
      false,
    );
    expect(
      canPickRegion({ id: "blind" }, { ...settings, regionInteraction: false }),
    ).toBe(false);
  });

  it("preserves ordinary Explore selection outside a Journey", () => {
    expect(canPickRegion({ id: "country" }, { states: {} })).toBe(true);
  });
});
