import { describe, expect, it } from "vitest";
import { validJourneySchedule } from "../src/services/journeySchedule";
import { JOURNEY_INDEX } from "../src/game/journeyRegistry";
import {
  dailyJourney,
  emptyDaily,
  openDaily,
  unfinished,
} from "../src/app/dailyProgress";
import { initialGame } from "../src/game/state";

describe("shared Journey dates", () => {
  const day = "2026-10-05";
  const edition = JOURNEY_INDEX[3];
  it("uses published dates before legacy device overrides and falls back to rotation", () => {
    const progress = {
      ...emptyDaily,
      overrides: { [day]: JOURNEY_INDEX[2].id },
    };
    expect(
      dailyJourney(day, progress, JOURNEY_INDEX, { [day]: edition.id }).id,
    ).toBe(edition.id);
    expect(dailyJourney(day, progress, JOURNEY_INDEX, {}).id).toBe(
      JOURNEY_INDEX[0].id,
    );
    const started = openDaily(progress, day, false, JOURNEY_INDEX, {
      [day]: edition.id,
    });
    expect(started.attempts[day].journeyId).toBe(edition.id);
    expect(
      openDaily(started, day, false, JOURNEY_INDEX, {}).attempts[day],
    ).toEqual(started.attempts[day]);
  });
  it("recognizes the fifth feedback answer as complete and opens its result", () => {
    const attempt = {
      date: day,
      journeyId: edition.id,
      scheduleVersion: 1,
      game: {
        ...initialGame,
        phase: "feedback" as const,
        roundIndex: 4,
        answers: edition.rounds.map((round) => ({
          roundId: round.id,
          correct: true,
          selectedIds: [],
          text: "",
          ordered: [],
        })),
      },
    };
    expect(unfinished(attempt)).toBe(false);
    expect(
      unfinished({
        ...attempt,
        game: { ...attempt.game, answers: attempt.game.answers.slice(0, 4) },
      }),
    ).toBe(true);
    expect(
      openDaily({ ...emptyDaily, attempts: { [day]: attempt } }, day).attempts[
        day
      ].game.phase,
    ).toBe("finished");
  });
  it("rejects malformed dates, unknown editions and invalid revisions", () => {
    expect(validJourneySchedule({ revision: 0, assignments: {} })).toBe(true);
    expect(
      validJourneySchedule({ revision: 2, assignments: { [day]: edition.id } }),
    ).toBe(true);
    for (const value of [
      { revision: true, assignments: {} },
      { revision: -1, assignments: {} },
      { revision: 0, assignments: [] },
      { revision: 0, assignments: { "2026-02-30": edition.id } },
      { revision: 0, assignments: { [day]: "local-pack" } },
    ])
      expect(validJourneySchedule(value)).toBe(false);
  });
});
