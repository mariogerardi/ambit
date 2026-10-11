import { describe, expect, it } from "vitest";
import {
  COMPATIBILITY_JOURNEYS,
  JOURNEYS,
  journeyPath,
} from "../src/game/journeys";
import {
  AVAILABLE_JOURNEY_INDEX,
  JOURNEY_INDEX,
  loadJourney,
} from "../src/game/journeyRegistry";
import {
  dailyJourney,
  emptyDaily,
  openDaily,
  validDaily,
} from "../src/app/dailyProgress";

describe("deferred Journey content", () => {
  it("keeps routing and save-validation metadata aligned with the authored catalog", () => {
    expect(AVAILABLE_JOURNEY_INDEX.map((j) => j.id)).toEqual(
      JOURNEYS.map((j) => j.id),
    );
    expect(JOURNEY_INDEX.map((j) => j.id)).toEqual(
      [...JOURNEYS, ...COMPATIBILITY_JOURNEYS].map((j) => j.id),
    );
    for (const journey of [...JOURNEYS, ...COMPATIBILITY_JOURNEYS]) {
      const entry = JOURNEY_INDEX.find((j) => j.id === journey.id)!;
      expect(entry.path).toBe(journeyPath(journey.id));
      expect(entry.title).toBe(journey.title);
      expect(journey.title.trim()).not.toBe("");
      expect(entry.description).toBe(journey.description);
      expect(entry.rounds).toEqual(
        journey.rounds.map(({ id, label, progressLabel }) => ({
          id,
          label,
          ...(progressLabel ? { progressLabel } : {}),
        })),
      );
    }
    const progress = openDaily(emptyDaily, "2026-10-07");
    expect(dailyJourney("2026-10-07").id).toBe("shared-neighbors-v1");
    expect(validDaily(JSON.parse(JSON.stringify(progress)))).toBe(true);
    progress.attempts["2026-10-07"].game.answers.push({
      roundId: "unknown",
      correct: true,
      selectedIds: [],
      text: "",
      ordered: [],
    });
    expect(validDaily(progress)).toBe(false);
  });

  it("loads every Journey with its canonical question and geometry identities", async () => {
    for (const journey of [...JOURNEYS, ...COMPATIBILITY_JOURNEYS]) {
      const first = loadJourney(journey.id);
      expect(loadJourney(journey.id)).toBe(first);
      expect(await first).toBe(journey);
    }
    await expect(loadJourney("unknown")).rejects.toThrow("Unknown Journey");
  });
});
