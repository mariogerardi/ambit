import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StudyHistory } from "../src/study/StudyHistory";
import {
  archiveStudy,
  leaveStudy,
  studyPreferences,
  defaultSettings,
  startStudy,
  studyReducer,
  validStudy,
} from "../src/study/engine";
import { studyScopeFocus } from "../src/study/scopeFocus";
import type { RegionFeature } from "../src/geography/types";
const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];

describe("Study history and scope framing", () => {
  it("shows dated results newest first and distinguishes completed sessions from early finishes", () => {
    let session = startStudy(
      { ...defaultSettings, length: 10, autoAdvance: false },
      42,
    );
    session = studyReducer(session, {
      type: "pick",
      id: session.prompt.targetId,
    });
    const partial = studyReducer(session, { type: "finish" });
    while (session.history.length < 10) {
      session = studyReducer(session, { type: "next" });
      session = studyReducer(session, {
        type: "pick",
        id: session.prompt.targetId,
      });
    }
    const completed = studyReducer(session, { type: "next" });
    const records = [
      { id: "old", finishedAt: 1000, session: partial },
      { id: "new", finishedAt: 2000, session: completed },
    ];
    const html = renderToStaticMarkup(
      createElement(StudyHistory, {
        records,
        onBack() {},
        onView() {},
        onStart() {},
      }),
    );
    expect(html.indexOf("10 / 10 correct")).toBeLessThan(
      html.indexOf("1 / 1 correct"),
    );
    expect(html).toContain("Completed");
    expect(html).toContain("Ended early");
    expect(html).toContain(new Date(2000).toISOString());
    expect(html).toContain("View results");
    expect(html).toContain("Replay session from");
    expect(records.map((record) => record.id)).toEqual(["old", "new"]);
  });
  it("archives answers once, persists results without an active attempt and preserves the old result on replay", () => {
    const settings = {
      ...defaultSettings,
      scope: "custom" as const,
      countryIds: ["wurl:CAN", "wurl:BRA"],
      autoAdvance: false,
    };
    let session = startStudy(settings, 42);
    session = studyReducer(session, {
      type: "pick",
      id: session.prompt.targetId,
    });
    const save = archiveStudy({ version: 1, settings, session });
    const saved = leaveStudy(save);
    expect(saved.session).toBeUndefined();
    expect(saved.history).toHaveLength(1);
    expect(saved.history![0].session.phase).toBe("summary");
    expect(saved.history![0].session.history[0].correct).toBe(true);
    expect(leaveStudy(save).history).toBe(saved.history);
    expect(studyPreferences(save).history).toBe(saved.history);
    expect(validStudy(JSON.parse(JSON.stringify(saved)))).toBe(true);
    const replay = startStudy(saved.history![0].session.settings, 43);
    expect(replay.history).toEqual([]);
    expect(saved.history![0].session.history).toHaveLength(1);
    expect(
      validStudy({
        ...saved,
        history: [{ ...saved.history![0], finishedAt: "bad" }],
      }),
    ).toBe(false);
    expect(
      validStudy({
        ...saved,
        history: [{ ...saved.history![0], session: replay }],
      }),
    ).toBe(false);
  });
  it("does not create empty history records", () => {
    const save = {
      version: 1 as const,
      settings: defaultSettings,
      session: startStudy(defaultSettings, 42),
    };
    expect(leaveStudy(save)).toEqual({ version: 1, settings: defaultSettings });
  });
  it("uses stable continental framing and fits custom countries across the dateline", () => {
    expect(
      studyScopeFocus(
        { ...defaultSettings, scope: "continent", continent: "AS" },
        regions,
        1.85,
      ),
    ).toMatchObject({ lat: 35, lng: 90 });
    expect(
      studyScopeFocus(
        { ...defaultSettings, scope: "continent", continent: "AF" },
        regions,
        1.85,
      ),
    ).toMatchObject({ lat: 3, lng: 20 });
    const pacific = studyScopeFocus(
      {
        ...defaultSettings,
        scope: "custom",
        countryIds: ["wurl:FJI", "wurl:TON"],
      },
      regions,
      1.85,
    )!;
    expect(Math.abs(pacific.lng)).toBeGreaterThan(150);
    expect(pacific.altitude).toBeGreaterThanOrEqual(0.65);
    expect(pacific.altitude).toBeLessThanOrEqual(1.85);
    expect(studyScopeFocus(defaultSettings, regions, 1.85)).toBeUndefined();
  });
});
