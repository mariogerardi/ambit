import { describe, it, expect } from "vitest";
import {
  defaultSettings,
  emptyStudy,
  startStudy,
  studyReducer,
  studyPreferences,
  validSettings,
  countryName,
  studyComplete,
  validStudy,
} from "../src/study/engine";
import type { StudySession, StudySettings } from "../src/study/engine";
function answer(s: StudySession, right = true) {
  if (s.prompt.style === "map")
    return studyReducer(s, {
      type: "pick",
      id: right
        ? s.prompt.targetId
        : s.pool.find((id) => id !== s.prompt.targetId)!,
    });
  if (s.prompt.style === "choices")
    return studyReducer(
      studyReducer(s, {
        type: "choice",
        id: right
          ? s.prompt.targetId
          : s.prompt.choices.find((id) => id !== s.prompt.targetId)!,
      }),
      { type: "submit" },
    );
  return studyReducer(
    studyReducer(s, {
      type: "text",
      value: right ? countryName(s.prompt.targetId) : "wrong",
    }),
    { type: "submit" },
  );
}
describe("Study flexibility and ephemeral sessions", () => {
  it("keeps preferences but abandons the saved attempt, including legacy attempts", () => {
    const settings = {
      ...defaultSettings,
      revisitMissed: true,
      choiceCount: 3 as const,
    };
    const session = startStudy(settings, 42);
    const save = { ...emptyStudy, settings, session };
    expect(studyPreferences(save)).toEqual({ version: 1, settings });
    expect(save.session).toBe(session);
  });
  it.each([2, 3, 4, 5, 6] as const)(
    "offers %i choices with distinct answers",
    (choiceCount) => {
      const s = startStudy(
        {
          ...defaultSettings,
          styles: { ...defaultSettings.styles, countries: "choices" },
          choiceCount,
        },
        31,
      );
      expect(s.prompt.choices).toHaveLength(choiceCount);
      expect(new Set(s.prompt.choices).size).toBe(choiceCount);
      expect(s.prompt.choices).toContain(s.prompt.targetId);
    },
  );
  it("mixes concrete answer formats deterministically and omits choices from a one-country pool", () => {
    const settings: StudySettings = {
      ...defaultSettings,
      styles: { ...defaultSettings.styles, countries: "mixed" },
      length: "continuous",
    };
    let s = startStudy(settings, 31);
    const styles = new Set();
    for (let i = 0; i < 30; i++) {
      styles.add(s.prompt.style);
      s = studyReducer(answer(s), { type: "next" });
    }
    expect(styles).toEqual(new Set(["map", "typing", "choices"]));
    settings.scope = "custom";
    settings.countryIds = ["wurl:CAN"];
    s = startStudy(settings, 31);
    for (let i = 0; i < 10; i++) {
      expect(s.prompt.style).not.toBe("choices");
      s = studyReducer(answer(s), { type: "next" });
    }
  });
  it("revisits the same topic and target after two intervening prompts and clears it when learned", () => {
    const settings: StudySettings = {
      ...defaultSettings,
      topics: ["countries", "flags"],
      styles: { ...defaultSettings.styles, countries: "map", flags: "map" },
      revisitMissed: true,
    };
    let s = startStudy(settings, 15);
    const missed = s.prompt;
    s = studyReducer(answer(s, false), { type: "next" });
    expect(s.prompt.ordinal).toBe(1);
    s = studyReducer(answer(s), { type: "next" });
    s = studyReducer(answer(s), { type: "next" });
    expect(s.prompt.ordinal).toBe(3);
    expect(s.prompt.targetId).toBe(missed.targetId);
    expect(s.prompt.topic).toBe(missed.topic);
    s = answer(s);
    expect(s.reviews).toEqual([]);
  });
  it("accepts legacy preferences and rejects unsupported option counts", () => {
    const { choiceCount: _, revisitMissed: __, ...legacy } = defaultSettings;
    expect(validSettings(legacy)).toBe(true);
    expect(validSettings({ ...legacy, choiceCount: 7 })).toBe(false);
    expect(validSettings({ ...legacy, choiceCount: "3" })).toBe(false);
    expect(validSettings({ ...legacy, revisitMissed: "yes" })).toBe(false);
    expect(validSettings({ ...legacy, perTopicMethods: true })).toBe(true);
    expect(validSettings({ ...legacy, perTopicMethods: "yes" })).toBe(false);
  });
  it("covers every country/topic pair exactly once, then finishes without reshuffling", () => {
    const settings: StudySettings = {
      ...defaultSettings,
      scope: "custom",
      countryIds: ["wurl:CAN", "wurl:BRA", "wurl:JPN"],
      topics: ["countries", "flags"],
      styles: { countries: "map", capitals: "map", flags: "map" },
      length: "all",
    };
    let s = startStudy(settings, 15);
    expect(startStudy(settings, 15)).toEqual(s);
    const seen: string[] = [];
    for (let i = 0; i < 6; i++) {
      expect(s.phase).toBe("playing");
      seen.push(`${s.prompt.targetId}/${s.prompt.topic}`);
      s = answer(s);
      expect(studyComplete(s)).toBe(i === 5);
      expect(validStudy({ version: 1, settings, session: s })).toBe(true);
      s = studyReducer(s, { type: "next" });
    }
    expect(new Set(seen)).toEqual(
      new Set(
        settings.countryIds.flatMap((id) =>
          settings.topics.map((topic) => `${id}/${topic}`),
        ),
      ),
    );
    expect(s.phase).toBe("summary");
    expect(s.history).toHaveLength(6);
    expect(s.remaining).toEqual([]);
    expect(validSettings(settings)).toBe(true);
    expect(
      validStudy({
        version: 1,
        settings,
        session: { ...s, remaining: ["wurl:CAN/not-a-topic"] },
      }),
    ).toBe(false);
    expect(
      validStudy({
        version: 1,
        settings,
        session: { ...s, remaining: ["wurl:CAN/flags/extra"] },
      }),
    ).toBe(false);
  });
  it("keeps the coverage queue intact when revisiting a missed answer", () => {
    const settings: StudySettings = {
      ...defaultSettings,
      length: "all",
      revisitMissed: true,
    };
    let s = startStudy(settings, 15);
    const missed = s.prompt;
    s = studyReducer(answer(s, false), { type: "next" });
    s = studyReducer(answer(s), { type: "next" });
    const remaining = s.remaining;
    s = studyReducer(answer(s), { type: "next" });
    expect(s.prompt.targetId).toBe(missed.targetId);
    expect(s.remaining).toBe(remaining);
    s = studyReducer(answer(s), { type: "next" });
    expect(s.remaining).toEqual(remaining!.slice(1));
  });
});
