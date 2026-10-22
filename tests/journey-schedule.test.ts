import { describe, expect, it } from "vitest";
import { validJourneySchedule } from "../src/services/journeySchedule";
import { JOURNEY_INDEX } from "../src/game/journeyRegistry";
import {
  dailyJourney,
  seededJourney,
  emptyDaily,
  openDaily,
  unfinished,
} from "../src/app/dailyProgress";
import { initialGame } from "../src/game/state";

describe("shared Journey dates", () => {
  const day = "2026-10-05";
  const edition = JOURNEY_INDEX.find(
    (journey) => journey.id === "across-the-divide-v1",
  )!;
  it("uses stored dates before provisional pool choices", () => {
    const progress = {
      ...emptyDaily,
      overrides: { [day]: "mediterranean-v1" },
    };
    expect(
      dailyJourney(day, progress, JOURNEY_INDEX, { [day]: edition.id }).id,
    ).toBe(edition.id);
    expect(dailyJourney(day, progress, JOURNEY_INDEX, {}).id).toBe(
      seededJourney(day, JOURNEY_INDEX).id,
    );
    const started = openDaily(progress, day, false, JOURNEY_INDEX, {
      [day]: edition.id,
    });
    expect(started.attempts[day].journeyId).toBe(edition.id);
    expect(
      openDaily(started, day, false, JOURNEY_INDEX, {}).attempts[day],
    ).toEqual(started.attempts[day]);
  });
  it("keeps stored dates and started answers when the shared catalog expands", () => {
    const original = [edition];
    const expanded = [...original, { ...edition, id: "new-journey" }];
    const started = openDaily(emptyDaily, day, false, original);
    started.attempts[day].game.text = "saved answer";
    expect(
      dailyJourney(day, undefined, expanded, { [day]: edition.id }).id,
    ).toBe(edition.id);
    expect(openDaily(started, day, false, expanded).attempts[day]).toEqual(
      started.attempts[day],
    );
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
  it("validates records while tolerating a removed historical ID", () => {
    expect(validJourneySchedule({ today: day, records: {} })).toBe(true);
    expect(
      validJourneySchedule({
        today: day,
        records: {
          [day]: {
            day,
            journeyId: "removed-id",
            source: "assigned",
            revision: 2,
          },
        },
      }),
    ).toBe(true);
    for (const value of [
      { today: "bad", records: {} },
      { today: day, records: [] },
      {
        today: day,
        records: {
          "2026-02-30": {
            day: "2026-02-30",
            journeyId: edition.id,
            source: "auto",
            revision: 1,
          },
        },
      },
      {
        today: day,
        records: {
          [day]: { day, journeyId: edition.id, source: "auto", revision: -1 },
        },
      },
    ])
      expect(validJourneySchedule(value)).toBe(false);
  });
  it("uses the same versioned date hash as the backend for the shared catalog", () => {
    expect(seededJourney("2026-10-05", JOURNEY_INDEX).id).toBe(
      "exceptions-to-the-rule-v1",
    );
    expect(seededJourney("2026-10-18", JOURNEY_INDEX).id).toBe(
      "the-vaccine-that-crossed-the-world-v1",
    );
    expect(seededJourney("2026-11-03", JOURNEY_INDEX).id).toBe(
      "far-from-everything",
    );
    expect(seededJourney("2027-01-01", JOURNEY_INDEX).id).toBe(
      "shared-neighbors-v1",
    );
    expect(
      dailyJourney("2027-01-01", undefined, JOURNEY_INDEX, {
        "2027-01-01": "removed-id",
      }).id,
    ).toBe(seededJourney("2027-01-01", JOURNEY_INDEX).id);
    expect(() =>
      dailyJourney("2026-10-05", undefined, JOURNEY_INDEX, {
        "2026-10-05": "removed-id",
      }),
    ).toThrow("Journey unavailable");
  });
});

it("includes every registered Journey in automatic picks while retaining started attempts", () => {
  const picked = new Set(
    Array.from(
      { length: 90 },
      (_, offset) =>
        seededJourney(
          new Date(Date.UTC(2027, 0, 1 + offset)).toISOString().slice(0, 10),
          JOURNEY_INDEX,
        ).id,
    ),
  );
  for (const { id } of JOURNEY_INDEX) expect(picked.has(id), id).toBe(true);
  const date = "2026-10-18";
  const old = openDaily(emptyDaily, date, false, JOURNEY_INDEX, {
    [date]: "try-not-to-click-russia-v1",
  });
  expect(openDaily(old, date, false, JOURNEY_INDEX, {}).attempts[date]).toEqual(
    old.attempts[date],
  );
});
