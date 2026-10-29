import { afterEach, expect, it, vi } from "vitest";
import {
  assistedStudyAnswer,
  learningQueue,
  learningTarget,
  reviewBatch,
  shuffledReviewBatch,
} from "../src/study/learning";
import type { LearningTarget } from "../src/study/learning";
import {
  answerLabel,
  COUNTRIES,
  defaultSettings,
  emptyStudy,
  startLearningReview,
  studyComplete,
  studyReducer,
  validStudy,
} from "../src/study/engine";
import type {
  StudyPrompt,
  StudyRecord,
  StudySession,
} from "../src/study/engine";
import { createStudySave } from "../src/app/progressSaves";

const DAY = 86_400_000,
  start = Date.UTC(2026, 9, 1);
const prompt = (
  style: StudyPrompt["style"] = "typing",
  targetId = "wurl:CAN",
  topic: StudyPrompt["topic"] = "countries",
): StudyPrompt => ({
  targetId,
  topic,
  style,
  choices: style === "choices" ? [targetId, "wurl:BRA"] : [],
  ordinal: 0,
});
const record = (
  id: string,
  answeredAt: number,
  style: StudyPrompt["style"],
  correct = true,
  assisted = false,
): StudyRecord => ({
  id,
  finishedAt: answeredAt,
  session: {
    settings: defaultSettings,
    pool: [],
    deck: [],
    seed: 1,
    phase: "summary",
    text: "",
    choiceId: "",
    prompt: prompt(style),
    history: [
      {
        prompt: prompt(style),
        response: "Canada",
        correct,
        answeredAt,
        assisted,
      },
    ],
  },
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("shuffles the full review pool deterministically and extends the same prefix for longer reviews", () => {
  const history = COUNTRIES.slice(0, 30).map((country, index) => {
    const value = record(`country-${index}`, start, "typing");
    value.session.history[0].prompt.targetId = country.id;
    return value;
  });
  const items = learningQueue({ ...emptyStudy, history }, start);
  const ten = shuffledReviewBatch(items, 10);
  expect(shuffledReviewBatch([...items].reverse(), 10)).toEqual(ten);
  expect(shuffledReviewBatch(items, 20).slice(0, 10)).toEqual(ten);
  expect(ten.map((item) => item.key)).not.toEqual(
    items.slice(0, 10).map((item) => item.key),
  );
  expect(new Set(ten.map((item) => item.key)).size).toBe(10);
});

it("separates recognition, location and capital knowledge and canonicalizes country review pins", () => {
  expect(learningTarget(prompt("map")).key).not.toBe(
    learningTarget(prompt("typing")).key,
  );
  expect(learningTarget(prompt("pin", "wurl:CAN", "capitals")).key).not.toBe(
    learningTarget(prompt("typing", "wurl:CAN", "capitals")).key,
  );
  const p = {
    ...prompt("map"),
    topic: "places" as const,
    place: {
      id: "wurl:CAN",
      name: "Canada",
      lat: 50,
      lng: -100,
      regionId: "wurl:CAN",
    },
  };
  expect(learningTarget(p).key).toBe(learningTarget(prompt("pin")).key);
});
it("uses spaced varied evidence for confidence, and never graduates repeated guesses or assisted answers", () => {
  const records = [
    record("a", start, "typing"),
    record("b", start + DAY, "choices"),
    record("c", start + 2 * DAY, "typing"),
    record("d", start + 4 * DAY, "typing"),
  ];
  const queue = learningQueue(
    { ...emptyStudy, history: records },
    start + 5 * DAY,
  );
  expect(queue[0].confident).toBe(true);
  expect(queue[0].dueAt).toBeGreaterThan(start + 4 * DAY);
  expect(
    learningQueue({
      ...emptyStudy,
      history: records.map((r) => ({
        ...r,
        session: {
          ...r.session,
          history: r.session.history.map((a) => ({
            ...a,
            prompt: prompt("choices"),
          })),
        },
      })),
    })[0].confident,
  ).toBe(false);
  expect(
    learningQueue({
      ...emptyStudy,
      history: records.map((r) => ({
        ...r,
        session: {
          ...r.session,
          history: r.session.history.map((a) => ({ ...a, assisted: true })),
        },
      })),
    })[0].level,
  ).toBe(0);
});
it("deduplicates active/history snapshots, resets a forgotten skill, and ignores massed repetitions", () => {
  const old = record("same", start, "typing");
  expect(
    learningQueue({
      ...emptyStudy,
      history: [old, old],
      session: { ...old.session, id: old.id },
    })[0].attempts,
  ).toBe(1);
  const repeated = record("repeat", start + 1000, "typing");
  expect(
    learningQueue({ ...emptyStudy, history: [old, repeated] })[0].level,
  ).toBe(1);
  const miss = record("miss", start + DAY, "typing", false);
  const item = learningQueue(
    { ...emptyStudy, history: [old, miss] },
    start + DAY,
  )[0];
  expect(item.level).toBe(0);
  expect(item.dueAt).toBe(start + DAY);
  expect(reviewBatch([item], start + DAY)).toHaveLength(1);
  expect(reviewBatch([item], start)).toHaveLength(0);
});
it("treats labeled flag-location answers as assisted and keeps single-method evidence due for variety", () => {
  expect(
    assistedStudyAnswer(
      { ...defaultSettings, countryNames: true },
      prompt("map", "wurl:CAN", "flags"),
    ),
  ).toBe(true);
  expect(
    assistedStudyAnswer(
      { ...defaultSettings, countryNames: true },
      prompt("typing", "wurl:CAN", "flags"),
    ),
  ).toBe(false);
  const item = learningQueue({
    ...emptyStudy,
    history: [
      record("a", start, "typing"),
      record("b", start + DAY, "typing"),
      record("c", start + 2 * DAY, "typing"),
    ],
  })[0];
  expect(item.confident).toBe(false);
  expect(item.dueAt).toBe(start + 3 * DAY);
});
const target = (
  id: string,
  topic: StudyPrompt["topic"] = "countries",
): LearningTarget => ({
  ...learningTarget(prompt("typing", id, topic)),
  attempts: 0,
});
function correct(s: StudySession) {
  if (s.prompt.place)
    return studyReducer(
      studyReducer(s, {
        type: "pin",
        lat: s.prompt.place.lat,
        lng: s.prompt.place.lng,
      }),
      { type: "submit" },
    );
  if (s.prompt.style === "map")
    return studyReducer(s, { type: "pick", id: s.prompt.targetId });
  return studyReducer(
    studyReducer(
      s,
      s.prompt.style === "choices"
        ? { type: "choice", id: s.prompt.targetId }
        : { type: "text", value: answerLabel(s.prompt) },
    ),
    { type: "submit" },
  );
}
it("requeues a miss after other items, varies its mechanic, and retains exact progress through the save layer", () => {
  let s = startLearningReview(
    [target("wurl:CAN"), target("wurl:BRA"), target("wurl:JPN", "flags")],
    42,
  );
  expect(s.prompt.style).toBe("choices");
  expect(s.prompt.choices).toHaveLength(6);
  const wrong = s.prompt.choices.find((id) => id !== s.prompt.targetId)!;
  s = studyReducer(studyReducer(s, { type: "choice", id: wrong }), {
    type: "submit",
  });
  s = studyReducer(s, { type: "next" });
  expect(s.prompt.targetId).toBe("wurl:BRA");
  s = studyReducer(correct(s), { type: "next" });
  expect(s.prompt.targetId).toBe("wurl:JPN");
  s = studyReducer(correct(s), { type: "next" });
  expect(s.prompt.targetId).toBe("wurl:CAN");
  expect(s.prompt.style).toBe("typing");
  expect(
    validStudy({ version: 1, settings: defaultSettings, session: s }),
  ).toBe(true);
  // The real codec must retain queue order, mechanics and draft independently.
  const memory = new Map<string, string>();
  const storage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
    key: (i: number) => [...memory.keys()][i] ?? null,
    get length() {
      return memory.size;
    },
  };
  vi.stubGlobal("localStorage", storage);
  const save = createStudySave("review-test-user");
  save.save({
    ...emptyStudy,
    session: { ...s, id: "review-test", text: "Can" },
  });
  const loaded = save.load().session!;
  expect(loaded.learningReview).toEqual(s.learningReview);
  expect(loaded.text).toBe("Can");
  s = correct(loaded);
  expect(studyComplete(s)).toBe(true);
  expect(studyReducer(s, { type: "next" }).phase).toBe("summary");
});
it("mixes named-place pin review with recall questions and validates the result", () => {
  let s = startLearningReview([
    {
      key: "landmark/place-location",
      targetId: "landmark",
      topic: "places",
      skill: "place-location",
      attempts: 0,
      place: { id: "landmark", name: "Landmark", lat: 0, lng: 0, radiusKm: 50 },
    },
    target("wurl:CAN"),
  ]);
  expect(s.prompt.style).toBe("pin");
  s = correct(s);
  expect(s.history[0].correct).toBe(true);
  s = studyReducer(s, { type: "next" });
  expect(s.prompt.style).toBe("typing");
  s = correct(s);
  s = studyReducer(s, { type: "next" });
  expect(s.phase).toBe("summary");
  expect(
    validStudy({ ...emptyStudy, session: JSON.parse(JSON.stringify(s)) }),
  ).toBe(true);
});
it("bounds a difficult review while retaining unresolved evidence for a later batch", () => {
  let s = startLearningReview([target("wurl:CAN")], 42);
  for (let i = 0; i < 30; i++) {
    s = studyReducer(
      studyReducer(
        s,
        s.prompt.style === "choices"
          ? {
              type: "choice",
              id: s.prompt.choices.find((id) => id !== s.prompt.targetId)!,
            }
          : { type: "text", value: "wrong answer" },
      ),
      { type: "submit" },
    );
    s = studyReducer(s, { type: "next" });
  }
  expect(s.phase).toBe("summary");
  expect(s.history).toHaveLength(30);
  expect(s.learningReview!.pending).toHaveLength(1);
  expect(learningQueue({ ...emptyStudy, session: s })[0].level).toBe(0);
  expect(validStudy({ ...emptyStudy, session: s })).toBe(true);
});
it.each([10, 20, 50, 100] as const)(
  "finishes a selected %i-question review exactly, retaining the limit through save recovery",
  (count) => {
    let s = startLearningReview([target("wurl:CAN")], 42, count);
    const methods = new Set<string>();
    for (let index = 0; index < count; index++) {
      methods.add(s.prompt.style);
      s = correct(s);
      expect(studyComplete(s)).toBe(index === count - 1);
      if (index === 3) {
        const restored = JSON.parse(
          JSON.stringify({ ...emptyStudy, session: s }),
        );
        expect(validStudy(restored)).toBe(true);
        s = restored.session;
        expect(s.learningReview?.questionCount).toBe(count);
      }
      s = studyReducer(s, { type: "next" });
    }
    expect(s.phase).toBe("summary");
    expect(s.history).toHaveLength(count);
    expect(methods.size).toBeGreaterThan(1);
    expect(validStudy({ ...emptyStudy, session: s })).toBe(true);
    expect(
      validStudy({
        ...emptyStudy,
        session: {
          ...s,
          learningReview: { ...s.learningReview, questionCount: "20" },
        },
      }),
    ).toBe(false);
  },
);
it("rejects malformed review metadata and timestamps without corrupting other saves", () => {
  const s = startLearningReview([target("wurl:CAN")]);
  expect(
    validStudy({
      ...emptyStudy,
      session: {
        ...s,
        learningReview: {
          targets: [
            {
              ...target("wurl:CAN"),
              skill: "toString",
              key: "wurl:CAN/toString",
            },
          ],
          pending: [],
        },
      },
    }),
  ).toBe(false);
  expect(
    validStudy({
      ...emptyStudy,
      session: {
        ...s,
        learningReview: { ...s.learningReview, pending: ["unknown"] },
      },
    }),
  ).toBe(false);
  const answered = correct(s);
  expect(
    validStudy({
      ...emptyStudy,
      session: {
        ...answered,
        history: answered.history.map((answer) => ({
          ...answer,
          answeredAt: Infinity,
        })),
      },
    }),
  ).toBe(false);
});
