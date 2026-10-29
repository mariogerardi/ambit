import { afterEach, expect, it, vi } from "vitest";
import {
  answerLabel,
  defaultSettings,
  emptyStudy,
  startLearningReview,
  startStudy,
  studyReducer,
  settingsError,
  studyComplete,
  validStudy,
} from "../src/study/engine";
import type {
  StudySession,
  StudySettings,
  StudyStyle,
} from "../src/study/engine";
import { STUDY_PLACES, studyPlace } from "../src/study/placeTopics";
import type { PlaceTopic } from "../src/study/placeTopics";
import { STUDY_PATHS } from "../src/study/paths";
import { learningTarget } from "../src/study/learning";
import { createStudySave } from "../src/app/progressSaves";

function answer(session: StudySession, right = true) {
  const { prompt } = session;
  if (prompt.style === "map")
    return studyReducer(session, {
      type: "pick",
      id: right
        ? (prompt.place?.countryId ?? prompt.targetId)
        : session.pool.find(
            (id) => id !== (prompt.place?.countryId ?? prompt.targetId),
          )!,
    });
  if (prompt.style === "pin") {
    const target = prompt.place!;
    return studyReducer(
      studyReducer(session, {
        type: "pin",
        lat: right ? target.lat : -target.lat,
        lng: right ? target.lng : target.lng + (target.lng > 0 ? -150 : 150),
      }),
      { type: "submit" },
    );
  }
  if (prompt.style === "choices")
    return studyReducer(
      studyReducer(session, {
        type: "choice",
        id: right
          ? prompt.targetId
          : prompt.choices.find((id) => id !== prompt.targetId)!,
      }),
      { type: "submit" },
    );
  return studyReducer(
    studyReducer(session, {
      type: "text",
      value: right ? answerLabel(prompt, prompt.targetId) : "wrong answer",
    }),
    { type: "submit" },
  );
}
function settings(topic: PlaceTopic, method: StudyStyle): StudySettings {
  return {
    ...defaultSettings,
    topics: [topic],
    autoAdvance: false,
    styles: { ...defaultSettings.styles, [topic]: method },
  };
}
afterEach(() => vi.unstubAllGlobals());

it.each(["cities", "landmarks"] as const)(
  "grades %s by country, exact location and name and restores all methods",
  (topic) => {
    for (const style of ["map", "pin", "typing", "choices"] as const) {
      const value = settings(topic, style);
      const session = startStudy(value, 42);
      expect(studyPlace(session.prompt.targetId)?.topic).toBe(topic);
      expect(validStudy({ ...emptyStudy, settings: value, session })).toBe(
        true,
      );
      const correct = answer(session);
      expect(correct.history.at(-1)?.correct, `${topic}/${style}`).toBe(true);
      expect(answer(session, false).history.at(-1)?.correct).toBe(false);
      expect(
        validStudy(
          JSON.parse(
            JSON.stringify({
              ...emptyStudy,
              settings: value,
              session: correct,
            }),
          ),
        ),
      ).toBe(true);
      if (style === "choices") {
        expect(
          new Set(
            session.prompt.choices.map((id) => answerLabel(session.prompt, id)),
          ).size,
        ).toBe(session.prompt.choices.length);
      }
    }
  },
);
it("keeps city location grading separate from country containment and rejects altered target coordinates", () => {
  const value = settings("cities", "pin");
  const session = startStudy(value, 42);
  const target = session.prompt.place!;
  const miss = studyReducer(
    studyReducer(session, {
      type: "pin",
      lat: target.lat + 1,
      lng: target.lng,
    }),
    { type: "submit" },
  );
  expect(miss.history[0].correct).toBe(false);
  for (const patch of [{ lat: target.lat + 1 }, { regionId: target.countryId }])
    expect(
      validStudy({
        ...emptyStudy,
        settings: value,
        session: {
          ...session,
          prompt: { ...session.prompt, place: { ...target, ...patch } },
        },
      }),
    ).toBe(false);
});
it("runs every curated pack to completion with eligible targets and valid saved answers", () => {
  expect(STUDY_PATHS).toHaveLength(10);
  expect(new Set(STUDY_PATHS.map((pack) => pack.id)).size).toBe(10);
  for (const pack of STUDY_PATHS) {
    expect(settingsError(pack.settings), pack.id).toBeUndefined();
    let session = startStudy(pack.settings, 42);
    for (let i = 0; i < Number(pack.settings.length); i++) {
      expect(
        validStudy({ ...emptyStudy, settings: pack.settings, session }),
        pack.id,
      ).toBe(true);
      session = answer(session);
      expect(session.history.at(-1)?.correct, pack.id).toBe(true);
      session = studyReducer(session, { type: "next" });
    }
    expect(studyComplete(session), pack.id).toBe(true);
    expect(
      validStudy({ ...emptyStudy, settings: pack.settings, session }),
      pack.id,
    ).toBe(true);
  }
});
it("retains city and landmark learning skills, rotates compatible review methods, and accepts reordered saved metadata", () => {
  for (const topic of ["cities", "landmarks"] as const) {
    for (const style of ["map", "pin", "typing"] as const) {
      const session = startStudy(settings(topic, style), 42);
      const target = { ...learningTarget(session.prompt), attempts: 0 };
      const run = startLearningReview([target], 51, 10);
      const recovered = JSON.parse(
        JSON.stringify({ ...emptyStudy, session: run }),
      );
      recovered.session.learningReview.targets[0].place = Object.fromEntries(
        Object.entries(target.place!).reverse(),
      );
      expect(validStudy(recovered), `${topic}/${style}`).toBe(true);
      expect(answer(run).history[0].correct).toBe(true);
      const next = studyReducer(answer(run), { type: "next" });
      if (style === "typing")
        expect(next.prompt.style).not.toBe(run.prompt.style);
      expect(learningTarget(next.prompt).key).toBe(target.key);
    }
  }
});
it("round-trips new topic methods and active drafts through the independent save registers", () => {
  const entries = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
    key: (i: number) => [...entries.keys()][i] ?? null,
    get length() {
      return entries.size;
    },
  });
  const value = {
    ...settings("cities", "typing"),
    topics: ["cities", "landmarks"] as PlaceTopic[],
    styles: {
      ...defaultSettings.styles,
      cities: "typing" as const,
      landmarks: "pin" as const,
    },
    perTopicMethods: true,
  };
  const session = studyReducer(startStudy(value, 42), {
    type: "text",
    value: "draft",
  });
  createStudySave().save({ ...emptyStudy, settings: value, session });
  const restored = createStudySave().load();
  expect(restored.settings).toEqual(value);
  expect(restored.session?.text).toBe("draft");
  expect(restored.session?.prompt).toEqual(session.prompt);
  expect(validStudy(restored)).toBe(true);
  expect(
    validStudy({ ...emptyStudy, session: startStudy(defaultSettings, 42) }),
  ).toBe(true);
});
it("covers selected city/landmark pairs once in a complete pass", () => {
  const city = STUDY_PLACES.find((place) => place.topic === "cities")!;
  const landmark = STUDY_PLACES.find((place) => place.topic === "landmarks")!;
  const value: StudySettings = {
    ...defaultSettings,
    topics: ["cities", "landmarks"],
    length: "all",
    styles: {
      ...defaultSettings.styles,
      cities: "typing",
      landmarks: "typing",
    },
    autoAdvance: false,
  };
  const targets = [city, landmark].map((place) => ({
    targetId: place.id,
    topic: place.topic,
  }));
  let session = startStudy(value, 42, targets);
  for (let i = 0; i < 2; i++)
    session = studyReducer(answer(session), { type: "next" });
  expect(session.history.map(({ prompt }) => prompt.targetId).sort()).toEqual(
    targets.map((target) => target.targetId).sort(),
  );
  expect(studyComplete(session)).toBe(true);
  expect(validStudy({ ...emptyStudy, settings: value, session })).toBe(true);
});
