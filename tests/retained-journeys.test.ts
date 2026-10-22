import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { JOURNEY_INDEX, loadJourney } from "../src/game/journeyRegistry";
import {
  NORTH_AMERICA_JOURNEY,
  MEXICO_BORDER_STATES,
} from "../src/game/northAmericaJourney";
import {
  CANADIAN_TERRITORIES,
  FIFTH_JOURNEY,
} from "./fixtures/engine/fifthJourney";
import {
  dailyJourney,
  emptyDaily,
  openDaily,
  setDailyPuzzle,
  validDaily,
  recoverDaily,
} from "../src/app/dailyProgress";
import { RETIRED_JOURNEY_IDS } from "../src/game/retiredJourneys";
import { modeForPath } from "../src/app/modes";
import { createQuestionContext, isCorrect } from "../src/game/questions";
import { initialGame } from "../src/game/state";
import type { RegionFeature } from "../src/geography/types";
const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];

describe("retained daily rotation", () => {
  it("drops retired saves and overrides while preserving retained progress and unavailable custom saves", async () => {
    const keep = openDaily(emptyDaily, "2026-10-11");
    const removed = {
      date: "2026-10-10",
      journeyId: "enclosed-territories-v1",
      scheduleVersion: 1,
      game: { ...initialGame, phase: "playing" },
    };
    const recovered = recoverDaily({
      ...keep,
      attempts: { ...keep.attempts, [removed.date]: removed },
      activeDate: removed.date,
      archivedAttempts: { [`${removed.date}/${removed.journeyId}`]: removed },
      overrides: { [removed.date]: removed.journeyId },
    })!;
    expect(recovered.attempts).toEqual(keep.attempts);
    expect(recovered.activeDate).toBeUndefined();
    expect(recovered.archivedAttempts).toEqual({});
    expect(recovered.overrides).toEqual({});
    expect(validDaily(recovered)).toBe(true);
    for (const id of RETIRED_JOURNEY_IDS) {
      expect(JOURNEY_INDEX.some((journey) => journey.id === id)).toBe(false);
      await expect(loadJourney(id)).rejects.toThrow("Unknown Journey");
    }
    for (const path of [
      "long-way-home",
      "beyond-borders",
      "silk-roads",
      "north-america-v1",
      "enclosed-territories",
      "borrowed-names",
      "pins-and-cities",
      "the-z-trail",
    ])
      expect(modeForPath(`/journey/${path}`)).toBe("home");
    const unavailable = { ...removed, journeyId: "studio:unavailable" };
    const hidden = recoverDaily({ ...keep, attempts: { [removed.date]: unavailable } })!;
    expect(hidden.attempts[removed.date]).toBeUndefined();
    expect(hidden.archivedAttempts?.[`${removed.date}/${unavailable.journeyId}`]).toEqual(unavailable);
    expect(validDaily(hidden)).toBe(true);
  });
  it("resolves pool Journeys by ID and permanently rejects removed editions", async () => {
    for (let index = 0; index < 22; index++) {
      const date = `2026-10-${String(index + 5).padStart(2, "0")}`;
      expect(JOURNEY_INDEX.find((entry) => entry.id === dailyJourney(date).id)?.id).toBeDefined();
    }
    await expect(loadJourney("enclosed-territories-v1")).rejects.toThrow(
      "Unknown Journey",
    );
    expect(() =>
      setDailyPuzzle(emptyDaily, "2026-10-10", "enclosed-territories-v1"),
    ).toThrow("Unknown Journey");
    expect(
      JOURNEY_INDEX.find((entry) => entry.id === NORTH_AMERICA_JOURNEY.id)
        ?.path,
    ).toBe("/journey/north-america");
  });

  it("accepts each territory and Mexican-border state individually, with aliases and no northern-border answers", () => {
    const context = createQuestionContext(world, [], NORTH_AMERICA_JOURNEY);
    for (const [index, ids] of [
      [0, CANADIAN_TERRITORIES],
      [2, MEXICO_BORDER_STATES],
    ] as const) {
      const question = NORTH_AMERICA_JOURNEY.rounds[index];
      expect(question.count).toBe(1);
      for (const id of ids) {
        expect(
          isCorrect(question, context, {
            ...initialGame,
            ordered: [context.names.get(id)!],
          }),
        ).toBe(true);
        if (index === 2) {
          expect(
            isCorrect(question, context, {
              ...initialGame,
              ordered: [id.split("-").at(-1)!],
            }),
          ).toBe(true);
        }
      }
      expect(
        isCorrect(question, context, { ...initialGame, ordered: ["Ontario"] }),
      ).toBe(false);
    }
    expect(
      isCorrect(NORTH_AMERICA_JOURNEY.rounds[2], context, {
        ...initialGame,
        ordered: ["Washington"],
      }),
    ).toBe(false);
    expect(FIFTH_JOURNEY.rounds[0].count).toBe(3);
    expect(FIFTH_JOURNEY.rounds[2].count).toBe(5);
    expect(
      NORTH_AMERICA_JOURNEY.rounds.every(
        (q) => !FIFTH_JOURNEY.rounds.some((old) => old.id === q.id),
      ),
    ).toBe(true);
  });
});
