import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  dailyJourney,
  dateOrdinal,
  emptyDaily,
  localDateKey,
  millisecondsToMidnight,
  openDaily,
  setDailyPuzzle,
  validDaily,
} from "../src/app/daily";
import { readSave, writeSave } from "../src/app/storage";
import { CANADA_JOURNEY } from "../src/game/canadaJourney";
import { dailyJourney as resolveDaily } from "../src/app/dailyProgress";
import { JOURNEY_INDEX } from "../src/game/journeyRegistry";
import { ACROSS_DIVIDE_JOURNEY } from "../src/game/acrossDivideJourney";
import {
  COUNTRIES,
  FLAGS,
  answerLabel,
  defaultSettings,
  emptyStudy,
  settingsError,
  startStudy,
  studyPool,
  studyPrompt,
  studyReducer,
  studyStates,
  validStudy,
} from "../src/study/engine";
import type {
  StudySettings,
  StudyStyle,
  StudyTopic,
} from "../src/study/engine";
import metadata from "../sources/flags.metadata.json";
import { SurfaceGesture } from "../src/globe/gesture";
afterEach(() => vi.unstubAllGlobals());
describe("New York daily schedule and persistence", () => {
  it("uses New York calendar days and stable pool choices", () => {
    expect(localDateKey(new Date("2026-10-06T03:59:00Z"))).toBe("2026-10-05");
    expect(millisecondsToMidnight(new Date("2026-10-06T03:59:59Z"))).toBe(1000);
    const choices = Array.from({ length: 11 }, (_, index) =>
      dailyJourney(`2026-10-${String(index + 5).padStart(2, "0")}`).id,
    );
    expect(new Set(choices).size).toBeGreaterThan(1);
    expect(choices.every((id, index) => index === 0 || id !== choices[index - 1])).toBe(true);
    expect(choices.every((id) => JOURNEY_INDEX.find((entry) => entry.id === id)?.availability === "pool")).toBe(true);
    expect(() => dateOrdinal("2026-02-30")).toThrow();
    expect(dateOrdinal("2026-11-02") - dateOrdinal("2026-11-01")).toBe(1);
  });
  it("persists admin choices, archives progress, restores it when switching back, and resets the choice at midnight", () => {
    const date = "2026-10-05";
    const started = openDaily(
      setDailyPuzzle(emptyDaily, date, CANADA_JOURNEY.id),
      date,
    );
    started.attempts[date].game.text = "saved input";
    const switched = setDailyPuzzle(started, date, ACROSS_DIVIDE_JOURNEY.id);
    expect(switched.archivedAttempts?.[`${date}/${CANADA_JOURNEY.id}`]?.game.text).toBe("saved input");
    const selected = openDaily(switched, date);
    expect(selected.attempts[date].journeyId).toBe(ACROSS_DIVIDE_JOURNEY.id);
    expect(dailyJourney("2026-10-06", selected).availability).toBe("pool");
    const restored = setDailyPuzzle(selected, date, CANADA_JOURNEY.id);
    expect(restored.attempts[date].game.text).toBe("saved input");
    expect(validDaily(JSON.parse(JSON.stringify(restored)))).toBe(true);
    expect(validDaily({ ...restored, overrides: { [date]: "unknown" } })).toBe(
      false,
    );
    expect(() => setDailyPuzzle(restored, date, "unknown")).toThrow();
    expect(
      validDaily({
        ...restored,
        overrides: { "2026-02-30": CANADA_JOURNEY.id },
      }),
    ).toBe(false);
  });
  it("uses an explicit assignment without changing other dates", () => {
    const before = resolveDaily("2026-11-11", undefined, JOURNEY_INDEX).id;
    expect(resolveDaily("2026-11-10", undefined, JOURNEY_INDEX, { "2026-11-10": ACROSS_DIVIDE_JOURNEY.id }).id).toBe(ACROSS_DIVIDE_JOURNEY.id);
    expect(resolveDaily("2026-11-11", undefined, JOURNEY_INDEX).id).toBe(before);
  });
  it("pins an attempt through midnight, resumes it, and allows unrestricted replays", () => {
    const started = openDaily(emptyDaily, "2026-10-05");
    const persisted = JSON.parse(JSON.stringify(started));
    expect(validDaily(persisted)).toBe(true);
    expect(dailyJourney("2026-10-06").availability).toBe("pool");
    expect(persisted.activeDate).toBe("2026-10-05");
    const nextDay = openDaily(persisted, "2026-10-06");
    expect(Object.keys(nextDay.attempts)).toHaveLength(2);
    expect(openDaily(nextDay, "2026-10-05").attempts["2026-10-05"]).toBe(
      nextDay.attempts["2026-10-05"],
    );
    expect(
      openDaily(nextDay, "2026-10-05", true).attempts["2026-10-05"].game
        .answers,
    ).toEqual([]);
  });
  it("handles corrupted, blocked, and quota-exhausted storage without losing in-memory gameplay", () => {
    const getItem = vi.fn(() => "{broken");
    const setItem = vi.fn(() => {
      throw Error("quota");
    });
    vi.stubGlobal("localStorage", { getItem, setItem });
    expect(readSave("daily", emptyDaily, validDaily).value).toBe(emptyDaily);
    expect(writeSave("daily", openDaily(emptyDaily, "2026-10-05"))).toBe(false);
    getItem.mockImplementation(() => {
      throw Error("blocked");
    });
    expect(readSave("daily", emptyDaily, validDaily).available).toBe(false);
    expect(validDaily({ version: 2, attempts: {} })).toBe(false);
    const broken = openDaily(emptyDaily, "2026-10-05");
    broken.attempts["2026-10-05"].game.roundIndex = 999;
    expect(validDaily(broken)).toBe(false);
  });
});
describe("Study recall engine", () => {
  it("limits all, continental, and custom pools to the 193-country local roster", () => {
    expect(studyPool(defaultSettings)).toHaveLength(193);
    const asia = studyPool({
      ...defaultSettings,
      scope: "continent",
      continent: "AS",
    });
    expect(asia).toContain("wurl:TJK");
    expect(asia).not.toContain("wurl:CAN");
    expect(
      studyPool({
        ...defaultSettings,
        scope: "custom",
        countryIds: ["wurl:CAN", "wurl:CAN", "not-a-country"],
      }),
    ).toEqual(["wurl:CAN"]);
    expect(settingsError({ ...defaultSettings, topics: [] })).toBeDefined();
    expect(
      settingsError({
        ...defaultSettings,
        scope: "custom",
        countryIds: ["wurl:CAN"],
        styles: { ...defaultSettings.styles, countries: "choices" },
      }),
    ).toBeDefined();
  });
  it("exhausts shuffled targets without repeats and rotates mixed topics evenly", () => {
    let session = startStudy(
      {
        ...defaultSettings,
        topics: ["countries", "capitals", "flags"],
        length: "continuous",
      },
      123,
    );
    const targets: string[] = [],
      topics: string[] = [];
    for (let i = 0; i < 194; i++) {
      targets.push(session.prompt.targetId);
      topics.push(session.prompt.topic);
      if (session.prompt.style === "map")
        session = studyReducer(session, {
          type: "pick",
          id: session.prompt.targetId,
        });
      else {
        session = studyReducer(session, {
          type: "text",
          value: answerLabel(session.prompt),
        });
        session = studyReducer(session, { type: "submit" });
      }
      session = studyReducer(session, { type: "next" });
    }
    expect(new Set(targets.slice(0, 193)).size).toBe(193);
    expect(topics.slice(0, 6)).toEqual([
      "countries",
      "capitals",
      "flags",
      "countries",
      "capitals",
      "flags",
    ]);
  });
  it.each(["map", "typing", "choices"] as StudyStyle[])(
    "supports all topics using %s answers with immediate map picks and explicit submissions",
    (style) => {
      for (const topic of ["countries", "capitals", "flags"] as StudyTopic[]) {
        let session = startStudy(
          {
            ...defaultSettings,
            topics: [topic],
            styles: { ...defaultSettings.styles, [topic]: style },
          },
          22,
        );
        if (style === "map")
          session = studyReducer(session, {
            type: "pick",
            id: session.prompt.targetId,
          });
        else if (style === "choices") {
          session = studyReducer(session, {
            type: "choice",
            id: session.prompt.targetId,
          });
          expect(session.phase).toBe("playing");
          session = studyReducer(session, { type: "submit" });
        } else {
          session = studyReducer(session, {
            type: "text",
            value: answerLabel(session.prompt),
          });
          expect(session.phase).toBe("playing");
          session = studyReducer(session, { type: "submit" });
        }
        expect(session.phase).toBe("feedback");
        expect(session.history[0].correct).toBe(true);
      }
    },
  );
  it("rejects typed names already given by named-country map prompts", () => {
    const session = startStudy(defaultSettings, 4);
    expect(studyReducer(session, { type: "submit" })).toBe(session);
    const typed = studyReducer(session, {
      type: "text",
      value: answerLabel(session.prompt),
    });
    const answered = studyReducer(typed, { type: "submit" });
    expect(typed).toBe(session);
    expect(answered).toBe(session);
    expect(
      studyReducer(session, { type: "pick", id: session.prompt.targetId })
        .phase,
    ).toBe("feedback");
  });
  it("draws at most six distinct choice answers entirely from the selected pool", () => {
    for (const count of [2, 5, 8, 193]) {
      const ids = COUNTRIES.slice(0, count).map((c) => c.id);
      const settings: StudySettings = {
        ...defaultSettings,
        topics: ["flags"],
        scope: "custom",
        countryIds: ids,
        styles: { ...defaultSettings.styles, flags: "choices" },
      };
      const prompt = startStudy(settings, 42).prompt;
      expect(prompt.choices).toHaveLength(Math.min(6, count));
      expect(new Set(prompt.choices).size).toBe(prompt.choices.length);
      expect(prompt.choices.every((id) => ids.includes(id))).toBe(true);
      expect(prompt.choices).toContain(prompt.targetId);
    }
  });
  it("keeps clue names hidden and uses the semantic colors for right, wrong, and unselected answers", () => {
    const session = startStudy({ ...defaultSettings, topics: ["flags"] }, 7);
    expect(studyPrompt(session.prompt)).not.toContain(
      answerLabel(session.prompt),
    );
    const wrong = session.pool.find((id) => id !== session.prompt.targetId)!;
    const feedback = studyReducer(session, { type: "pick", id: wrong });
    expect(studyStates(feedback)[wrong]).toBe("incorrect");
    expect(studyStates(feedback)[session.prompt.targetId]).toBe("answer");
    expect(
      studyStates(feedback)[
        session.pool.find(
          (id) => id !== wrong && id !== session.prompt.targetId,
        )!
      ],
    ).toBe("disabled");
    const right = studyReducer(session, {
      type: "pick",
      id: session.prompt.targetId,
    });
    expect(studyStates(right)[session.prompt.targetId]).toBe("correct");
  });
  it("ends finite sessions, supports misses without fatal errors, and persists unfinished sessions", () => {
    let session = startStudy(
      {
        ...defaultSettings,
        length: 10,
        styles: { ...defaultSettings.styles, countries: "typing" },
      },
      4,
    );
    for (let i = 0; i < 10; i++) {
      session = studyReducer(session, {
        type: "text",
        value: i % 2 ? answerLabel(session.prompt) : "wrong",
      });
      session = studyReducer(session, { type: "submit" });
      session = studyReducer(session, { type: "next" });
    }
    expect(session.phase).toBe("summary");
    expect(session.history.filter((a) => a.correct)).toHaveLength(5);
    expect(
      validStudy(JSON.parse(JSON.stringify({ ...emptyStudy, session }))),
    ).toBe(true);
    expect(
      validStudy({ ...emptyStudy, session: { ...session, deck: ["bad-id"] } }),
    ).toBe(false);
  });
});
describe("local flag coverage and clue safety", () => {
  it("has native-proportion, title-free, checksummed local artwork for every eligible country", () => {
    expect(FLAGS.size).toBe(193);
    expect(metadata.flags).toHaveLength(193);
    for (const country of COUNTRIES) {
      const flag = metadata.flags.find((f) => f.countryId === country.id)!;
      expect(FLAGS.get(country.id)).toBe(flag.src);
      const bytes = readFileSync(`public${flag.src}`),
        svg = bytes.toString();
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        flag.sha256,
      );
      expect(svg).not.toMatch(
        /<(?:\w+:)?(?:title|desc|script)\b|aria-label|aria-labelledby|(?:href|src)="https?:/i,
      );
      if (flag.viewBox) expect(svg).toContain(`viewBox="${flag.viewBox}"`);
      expect(flag.sourceUrl).toContain(metadata.commit);
    }
  });
});
describe("home surface activation guard", () => {
  it("allows land/water taps once and rejects drag, pinch, and canceled input", () => {
    const gesture = new SurfaceGesture();
    gesture.down(1, 10, 10);
    gesture.up(1, 18, 10);
    expect(gesture.consume()).toBe(true);
    expect(gesture.consume()).toBe(false);
    gesture.down(1, 10, 10);
    gesture.move(1, 19, 10);
    gesture.up(1, 10, 10);
    expect(gesture.consume()).toBe(false);
    gesture.down(1, 10, 10);
    gesture.down(2, 20, 20);
    gesture.up(1, 10, 10);
    gesture.up(2, 20, 20);
    expect(gesture.consume()).toBe(false);
    gesture.down(1, 10, 10);
    gesture.cancel();
    expect(gesture.consume()).toBe(false);
  });
});

it.each([
  ["2026-03-08T05:00:00Z", "2026-03-09T04:00:00Z", 23],
  ["2026-11-01T04:00:00Z", "2026-11-02T05:00:00Z", 25],
  ["2026-10-14T04:00:00Z", "2026-10-15T04:00:00Z", 24],
] as const)("handles New York DST at %s", (start, end, hours) => {
  expect(millisecondsToMidnight(new Date(start))).toBe(hours * 3600000);
  const boundary = new Date(end);
  expect(localDateKey(new Date(boundary.getTime() - 1))).not.toBe(
    localDateKey(boundary),
  );
  expect(millisecondsToMidnight(new Date(boundary.getTime() - 1))).toBe(1);
});
it("uses the same daily date across device offsets", () => {
  expect(localDateKey(new Date("2026-10-14T05:59:59+02:00"))).toBe(
    "2026-10-13",
  );
  expect(localDateKey(new Date("2026-10-14T00:00:00-04:00"))).toBe(
    "2026-10-14",
  );
  expect(localDateKey(new Date("2026-10-14T13:00:00+09:00"))).toBe(
    "2026-10-14",
  );
});
