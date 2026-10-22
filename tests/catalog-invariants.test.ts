import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { JOURNEYS, journeyPath } from "../src/game/journeys";
import { JOURNEY_INDEX } from "../src/game/journeyRegistry";
import { auditJourney } from "../src/game/journeyAudit";
import { dailyJourney } from "../src/app/dailyProgress";
import type { RegionFeature } from "../src/geography/types";

describe("catalog identity", () => {
  it("keeps authored and generated entries aligned without relying on registration order", () => {
    const ids = JOURNEYS.map((journey) => journey.id);
    const indexIds = JOURNEY_INDEX.map((journey) => journey.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(indexIds).toEqual([...ids].sort());
    expect(new Set(JOURNEY_INDEX.map((journey) => journey.path)).size).toBe(
      ids.length,
    );
    const roundIds = JOURNEYS.flatMap((journey) =>
      journey.rounds.map((round) => round.id),
    );
    expect(new Set(roundIds).size).toBe(roundIds.length);
    for (const journey of JOURNEYS) {
      const entry = JOURNEY_INDEX.find((item) => item.id === journey.id)!;
      expect(entry.path).toBe(journeyPath(journey.id));
      expect(entry.addedAt).toBe(journey.addedAt);
      expect(entry.rounds.map((round) => round.id)).toEqual(
        journey.rounds.map((round) => round.id),
      );
      if (journey.supersedes) expect(ids).not.toContain(journey.supersedes);
    }
    expect(journeyPath("missing-journey")).toBe("/");
  });

  it("keeps automatic choices independent of registration order", () => {
    const reordered = [...JOURNEYS].reverse();
    const start = Date.UTC(2026, 9, 5);
    for (let offset = 0; offset < 365; offset++) {
      const date = new Date(start + offset * 86400000)
        .toISOString()
        .slice(0, 10);
      const expected = dailyJourney(date, undefined, JOURNEYS).id;
      expect(dailyJourney(date, undefined, reordered).id).toBe(expected);
    }
  });

  it("audits every registered Journey", () => {
    const world = JSON.parse(
      readFileSync("public/geography/world.v1.json", "utf8"),
    ) as RegionFeature[];
    for (const journey of JOURNEYS)
      expect(auditJourney(journey, world).errors, journey.id).toEqual([]);
  });
});
