import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ACTIVE_JOURNEY_IDS } from "../src/game/journeyRotation";
import { JOURNEY_INDEX, loadJourney } from "../src/game/journeyRegistry";
import {
  NORTH_AMERICA_JOURNEY,
  MEXICO_BORDER_STATES,
} from "../src/game/northAmericaJourney";
import { CANADIAN_TERRITORIES, FIFTH_JOURNEY } from "../src/game/fifthJourney";
import {
  dailyJourney,
  emptyDaily,
  openDaily,
  setDailyPuzzle,
  validDaily,
} from "../src/app/dailyProgress";
import { createQuestionContext, isCorrect } from "../src/game/questions";
import { initialGame } from "../src/game/state";
import type { RegionFeature } from "../src/geography/types";
const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];

describe("retained daily rotation", () => {
  it("cycles only the nine approved editions, while keeping scrapped saves loadable", async () => {
    expect(ACTIVE_JOURNEY_IDS).toHaveLength(9);
    expect(new Set(ACTIVE_JOURNEY_IDS).size).toBe(9);
    for (let index = 0; index < 18; index++) {
      const date = `2026-10-${String(index + 5).padStart(2, "0")}`;
      expect(dailyJourney(date).id).toBe(ACTIVE_JOURNEY_IDS[index % 9]);
    }
    const old = openDaily(
      setDailyPuzzle(emptyDaily, "2026-10-10", "enclosed-territories-v1"),
      "2026-10-10",
    );
    expect(validDaily(JSON.parse(JSON.stringify(old)))).toBe(true);
    expect(openDaily(old, "2026-10-10").attempts["2026-10-10"]).toBe(
      old.attempts["2026-10-10"],
    );
    expect((await loadJourney("enclosed-territories-v1")).rounds).toHaveLength(
      5,
    );
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
