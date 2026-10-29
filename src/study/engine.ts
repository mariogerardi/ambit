import {
  LEARNING_METHODS,
  REVIEW_LENGTHS,
  assistedStudyAnswer,
  learningTarget,
  validAnswerTime,
} from "./learning";
import type {
  LearningRun,
  LearningTarget,
  ReviewQuestionCount,
} from "./learning";
import {
  CAPITAL_DISTRACTORS,
  capitalChoicePool,
  capitalChoiceName,
  validCapitalChoice,
  hasCountryCityDistractors,
} from "./distractors";
import type { CapitalDistractors } from "./distractors";
import roster from "../game/data/un-members.v1.json";
import flagCatalog from "../game/data/flags.v1.json";
import { CAPITALS } from "../game/quizData";
import { countryIdForName, normalizeAnswer } from "../game/answerNames";
import { isRecord, strings } from "../app/storage";
import type { VisualState } from "../geography/types";
import type { RegionFeature } from "../geography/types";
import {
  drawPlaceReview,
  reducePlaceReview,
  validPlaceReview,
  validStudyPlace,
} from "./placeReview";
import type { StudyPlaceTarget } from "./placeReview";
import {
  isPlaceTopic,
  placeTarget,
  STUDY_PLACES,
  studyPlace,
} from "./placeTopics";
import {
  gradeStudyPin,
  isStudyPinPrompt,
  studyPinTarget,
  validStudyPin,
} from "./pins";
export const COUNTRIES = roster.members;
export const FLAGS = new Map(
  flagCatalog.flags.map((f) => [f.countryId, f.src]),
);
export const TOPICS = [
  "countries",
  "capitals",
  "flags",
  "cities",
  "landmarks",
] as const;
export type StudyTopic = (typeof TOPICS)[number];
export type StudyStyle = "map" | "pin" | "typing" | "choices" | "mixed";
type PromptStyle = Exclude<StudyStyle, "mixed">;
export interface StudySettings {
  topics: StudyTopic[];
  scope: "all" | "continent" | "custom";
  continent: string;
  countryIds: string[];
  styles: Record<"countries" | "capitals" | "flags", StudyStyle> &
    Partial<Record<"cities" | "landmarks", StudyStyle>>;
  perTopicMethods?: boolean;
  borders: boolean;
  countryNames: boolean;
  capitalMarkers: boolean;
  capitalNames: boolean;
  length: 10 | 20 | 50 | "continuous" | "all";
  autoAdvance: boolean;
  choiceCount?: 2 | 3 | 4 | 5 | 6;
  capitalDistractors?: CapitalDistractors;
  revisitMissed?: boolean;
}
export const defaultSettings: StudySettings = {
  topics: ["countries"],
  scope: "all",
  continent: "AF",
  countryIds: [],
  styles: { countries: "map", capitals: "typing", flags: "map" },
  borders: true,
  countryNames: false,
  capitalMarkers: false,
  capitalNames: false,
  length: 20,
  autoAdvance: true,
  choiceCount: 6,
  capitalDistractors: "study",
  revisitMissed: false,
};
export interface StudyPrompt {
  targetId: string;
  topic: StudyTopic | "places";
  place?: StudyPlaceTarget;
  style: PromptStyle;
  choices: string[];
  ordinal: number;
}
export interface StudyAnswer {
  answeredAt?: number;
  assisted?: boolean;
  pin?: { lat: number; lng: number };
  prompt: StudyPrompt;
  response: string;
  selectedId?: string;
  correct: boolean;
}
export type StudyReviewTarget = Pick<StudyPrompt, "targetId" | "topic">;

/** The latest answer to a country/topic pair decides whether it needs review. */
export function missedStudyAnswers(session: StudySession): StudyAnswer[] {
  const latest = new Map<string, StudyAnswer>();
  for (const answer of session.history)
    latest.set(`${answer.prompt.targetId}/${answer.prompt.topic}`, answer);
  return [...latest.values()].filter((answer) => !answer.correct);
}
export interface StudySession {
  learningReview?: LearningRun;
  placeReview?: StudyPlaceTarget[];
  pin?: { lat: number; lng: number };
  id?: string;
  challengeId?: string;
  settings: StudySettings;
  pool: string[];
  deck: string[];
  seed: number;
  prompt: StudyPrompt;
  phase: "playing" | "feedback" | "summary";
  text: string;
  choiceId: string;
  history: StudyAnswer[];
  reviews?: { targetId: string; topic: StudyTopic; due: number }[];
  /** Country/topic pairs left in a single complete pass. */
  remaining?: string[];
  /** Exact country/topic coverage, retained when replaying a targeted review. */
  coverage?: StudyReviewTarget[];
}
export interface StudySave {
  version: 1;
  settings: StudySettings;
  session?: StudySession;
  history?: StudyRecord[];
}
export interface StudyRecord {
  id: string;
  finishedAt: number;
  session: StudySession;
}
export const STUDY_KEY = "wurl.study.v1";
export const emptyStudy: StudySave = { version: 1, settings: defaultSettings };
const countryNames = new Map(COUNTRIES.map((c) => [c.id, c.name]));
const memberIds = new Set(COUNTRIES.map((c) => c.id));
export const countryName = (id: string) =>
  COUNTRIES.find((c) => c.id === id)?.name ?? id;
export const capitalOf = (id: string) =>
  CAPITALS.find((c) => c.countryId === id)!;
export function studyPool(settings: StudySettings): string[] {
  return COUNTRIES.filter(
    (c) =>
      (settings.scope === "all" ||
        (settings.scope === "custom"
          ? settings.countryIds.includes(c.id)
          : capitalOf(c.id).continent === settings.continent)) &&
      !(
        settings.topics.includes("capitals") &&
        settings.styles.capitals === "choices" &&
        settings.capitalDistractors === "countryCities" &&
        !hasCountryCityDistractors(c.id)
      ),
  ).map((c) => c.id);
}
export function usesPerTopicMethods(settings: StudySettings) {
  return (
    settings.perTopicMethods ??
    new Set(settings.topics.map((topic) => studyStyle(settings, topic))).size >
      1
  );
}
export const studyStyle = (settings: StudySettings, topic: StudyTopic) =>
  settings.styles[topic] ?? "pin";
export function studyTopicPool(
  settings: StudySettings,
  topic: StudyTopic,
): string[] {
  const countries = studyPool(settings);
  return isPlaceTopic(topic)
    ? STUDY_PLACES.filter(
        (place) => place.topic === topic && countries.includes(place.countryId),
      ).map((place) => place.id)
    : countries;
}
export function studyTargets(settings: StudySettings): StudyReviewTarget[] {
  const core = settings.topics.filter((topic) => !isPlaceTopic(topic));
  return [
    ...studyPool(settings).flatMap((targetId) =>
      core.map((topic) => ({ targetId, topic })),
    ),
    ...settings.topics.filter(isPlaceTopic).flatMap((topic) =>
      studyTopicPool(settings, topic).map((targetId) => ({
        targetId,
        topic,
      })),
    ),
  ];
}
const validTopicTarget = (
  id: string,
  topic: StudyTopic,
  countries: string[],
) =>
  isPlaceTopic(topic)
    ? studyPlace(id)?.topic === topic &&
      countries.includes(studyPlace(id)!.countryId)
    : countries.includes(id);
export function settingsError(settings: StudySettings): string | undefined {
  if (!settings.topics.length) return "Choose at least one topic.";
  const pool = studyPool(settings);
  if (
    settings.topics.some(
      (topic) => isPlaceTopic(topic) && !studyTopicPool(settings, topic).length,
    )
  )
    return "This area has no listed places for one of your topics. Choose a wider area or another topic.";
  if (!pool.length)
    return settings.capitalDistractors === "countryCities" &&
      settings.topics.includes("capitals") &&
      settings.styles.capitals === "choices"
      ? "Choose a country with another listed city, or change the multiple-choice answer options."
      : "Choose at least one country.";
  if (
    settings.topics.some(
      (topic) =>
        studyStyle(settings, topic) === "choices" &&
        (topic === "capitals"
          ? pool.some((id) => capitalChoicePool(settings, pool, id).length < 2)
          : studyTopicPool(settings, topic).length < 2),
    )
  )
    return "Include at least two countries for multiple choice.";
}
function random(seed: number) {
  return (Math.imul(1664525, seed) + 1013904223) >>> 0;
}
function shuffle(
  values: string[],
  seed: number,
): { values: string[]; seed: number } {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    seed = random(seed);
    const j = seed % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return { values: copy, seed };
}
function draw(
  session: Omit<StudySession, "prompt">,
  ordinal: number,
): StudySession {
  let { deck, seed } = session;
  if (!deck.length && session.settings.length !== "all") {
    const shuffled = shuffle(session.pool, seed);
    deck = shuffled.values;
    seed = shuffled.seed;
  }
  const review = session.settings.revisitMissed
    ? session.reviews?.find((r) => r.due <= ordinal)
    : undefined;
  const pair =
    session.settings.length === "all"
      ? session.remaining?.[0]?.split("/")
      : undefined;
  let targetId = review?.targetId ?? pair?.[0] ?? deck[0];
  const topic =
    review?.topic ??
    (pair?.[1] as StudyTopic | undefined) ??
    session.settings.topics[ordinal % session.settings.topics.length];
  const rest = review || isPlaceTopic(topic) ? deck : deck.slice(1);
  const topicPool = studyTopicPool(session.settings, topic);
  if (isPlaceTopic(topic) && !review && !pair) {
    const recent = new Set(
      session.history
        .filter((answer) => answer.prompt.topic === topic)
        .slice(-Math.max(0, topicPool.length - 1))
        .map((answer) => answer.prompt.targetId),
    );
    const available = topicPool.filter((id) => !recent.has(id));
    const next = shuffle(available.length ? available : topicPool, seed);
    targetId = next.values[0];
    seed = next.seed;
  }
  let style = studyStyle(session.settings, topic);
  if (style === "mixed") {
    seed = random(seed);
    const available: PromptStyle[] = (
      topic === "capitals"
        ? capitalChoicePool(session.settings, session.pool, targetId).length < 2
        : topicPool.length < 2
    )
      ? isPlaceTopic(topic)
        ? ["map", "typing", "pin"]
        : ["map", "typing"]
      : isPlaceTopic(topic)
        ? ["map", "typing", "choices", "pin"]
        : ["map", "typing", "choices"];
    style = available[seed % available.length];
  }
  let choices: string[] = [];
  if (style === "choices") {
    // Distinct display answers, including countries whose primary capitals share a name.
    const label = (id: string) =>
      normalizeAnswer(
        isPlaceTopic(topic)
          ? studyPlace(id)!.name
          : topic === "capitals"
            ? capitalChoiceName(id)!
            : countryName(id),
      );
    const seen = new Set([label(targetId)]);
    const shuffled = shuffle(
      (topic === "capitals"
        ? capitalChoicePool(session.settings, session.pool, targetId)
        : topicPool
      ).filter((id) => id !== targetId),
      seed,
    );
    seed = shuffled.seed;
    const distractors = shuffled.values
      .filter((id) => {
        const key = label(id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, (session.settings.choiceCount ?? 6) - 1);
    const options = shuffle([targetId, ...distractors], seed);
    choices = options.values;
    seed = options.seed;
  }
  return {
    ...session,
    seed,
    deck: rest,
    remaining:
      session.settings.length === "all" && !review
        ? session.remaining?.slice(1)
        : session.remaining,
    phase: "playing",
    text: "",
    choiceId: "",
    pin: undefined,
    prompt: {
      targetId,
      topic,
      style,
      choices,
      ordinal,
      ...(isPlaceTopic(topic)
        ? { place: placeTarget(studyPlace(targetId)!) }
        : {}),
    },
  };
}
function drawLearning(session: StudySession, ordinal: number): StudySession {
  const savedRun = session.learningReview!;
  const run =
    savedRun.questionCount && !savedRun.pending.length
      ? { ...savedRun, pending: savedRun.targets.map((target) => target.key) }
      : savedRun;
  const target = run.targets.find((item) => item.key === run.pending[0])!;
  const methods = LEARNING_METHODS[target.skill];
  const attempts = session.history.filter(
    (answer) => learningTargetKey(answer.prompt) === target.key,
  ).length;
  const style =
    methods[
      (target.attempts + run.targets.indexOf(target) + attempts) %
        methods.length
    ];
  const next = {
    ...session,
    learningReview: { ...run, pending: run.pending.slice(1) },
    text: "",
    choiceId: "",
    pin: undefined,
    phase: "playing" as const,
  };
  if (target.place && !isPlaceTopic(target.topic))
    return {
      ...next,
      prompt: {
        targetId: target.targetId,
        topic: "places",
        style: "pin",
        place: target.place,
        choices: [],
        ordinal,
      },
    };
  const generated = draw(
    {
      ...next,
      settings: {
        ...next.settings,
        length: "all",
        styles: { ...next.settings.styles, [target.topic]: style },
      },
      remaining: [`${target.targetId}/${target.topic}`],
    },
    ordinal,
  );
  return {
    ...generated,
    settings: session.settings,
    remaining: [],
    learningReview: next.learningReview,
  };
}
function learningTargetKey(prompt: StudyPrompt) {
  return learningTarget(prompt).key;
}
export function startLearningReview(
  targets: LearningTarget[],
  seed = Date.now() >>> 0,
  questionCount?: ReviewQuestionCount,
): StudySession {
  if (
    !targets.length ||
    targets.length > 100 ||
    (questionCount !== undefined && !REVIEW_LENGTHS.includes(questionCount)) ||
    new Set(targets.map((item) => item.key)).size !== targets.length ||
    !targets.every(validLearningTarget)
  )
    throw Error("Choose valid review items.");
  const settings = {
    ...defaultSettings,
    topics: [...TOPICS],
    scope: "all" as const,
    length: "all" as const,
    autoAdvance: false,
    revisitMissed: false,
  };
  return drawLearning(
    {
      settings,
      pool: studyPool(settings),
      deck: [],
      seed,
      remaining: [],
      history: [],
      phase: "playing",
      text: "",
      choiceId: "",
      prompt: {
        targetId: "",
        topic: "countries",
        style: "map",
        choices: [],
        ordinal: 0,
      },
      learningReview: {
        ...(questionCount !== undefined ? { questionCount } : {}),
        targets: structuredClone(targets),
        pending: targets.map((item) => item.key),
      },
    },
    0,
  );
}
function validLearningTarget(value: unknown): value is LearningTarget {
  if (
    !isRecord(value) ||
    typeof value.key !== "string" ||
    typeof value.targetId !== "string" ||
    !Number.isSafeInteger(value.attempts) ||
    Number(value.attempts) < 0 ||
    !Object.hasOwn(LEARNING_METHODS, String(value.skill))
  )
    return false;
  if (value.key !== `${value.targetId}/${value.skill}`) return false;
  const skill = String(value.skill);
  if (isPlaceTopic(value.topic)) {
    const place = studyPlace(String(value.targetId));
    const savedPlace = value.place;
    return (
      !!place &&
      place.topic === value.topic &&
      skill.startsWith(`${value.topic === "cities" ? "city" : "landmark"}-`) &&
      validStudyPlace(savedPlace) &&
      savedPlace.regionId === undefined &&
      Object.entries(placeTarget(place)).every(
        ([key, expected]) =>
          savedPlace[key as keyof typeof savedPlace] === expected,
      )
    );
  }
  if (skill === "place-location")
    return (
      value.topic === "places" &&
      validStudyPlace(value.place) &&
      value.place.id === value.targetId
    );
  return (
    memberIds.has(value.targetId) &&
    value.place === undefined &&
    value.topic ===
      (skill.startsWith("country")
        ? "countries"
        : skill.startsWith("flag")
          ? "flags"
          : "capitals")
  );
}
function validLearningRun(value: unknown): value is LearningRun {
  return (
    isRecord(value) &&
    Array.isArray(value.targets) &&
    value.targets.length > 0 &&
    value.targets.length <= 100 &&
    (value.questionCount === undefined ||
      (typeof value.questionCount === "number" &&
        REVIEW_LENGTHS.some((count) => count === value.questionCount))) &&
    value.targets.every(validLearningTarget) &&
    new Set(value.targets.map((item) => item.key)).size ===
      value.targets.length &&
    strings(value.pending) &&
    new Set(value.pending).size === value.pending.length &&
    value.pending.every((key) =>
      (value.targets as LearningTarget[]).some((item) => item.key === key),
    )
  );
}
function reviewAnswer(
  session: StudySession,
  updated: StudySession,
): StudySession {
  if (session.history.length === updated.history.length) return updated;
  const answer = {
    ...updated.history.at(-1)!,
    answeredAt: Date.now(),
    assisted: assistedStudyAnswer(session.settings, session.prompt),
  };
  let run = updated.learningReview;
  if (run && !answer.correct) {
    const key = learningTargetKey(answer.prompt);
    const pending = run.pending.filter((item) => item !== key);
    pending.splice(Math.min(2, pending.length), 0, key);
    run = { ...run, pending };
  }
  return {
    ...updated,
    history: [...updated.history.slice(0, -1), answer],
    ...(run ? { learningReview: run } : {}),
  };
}
export function startPlaceStudy(targets: StudyPlaceTarget[]): StudySession {
  const places = [...new Map(targets.map((t) => [t.id, t])).values()];
  if (!places.length || !places.every(validStudyPlace))
    throw Error("Choose valid places to review.");
  return drawPlaceReview(
    {
      settings: { ...defaultSettings, length: "all", autoAdvance: false },
      pool: places.map((p) => p.id),
      placeReview: places,
      remaining: places.map((p) => p.id),
      deck: [],
      seed: Date.now() >>> 0,
      phase: "playing",
      text: "",
      choiceId: "",
      history: [],
      prompt: {
        targetId: "",
        topic: "places",
        style: "map",
        choices: [],
        ordinal: 0,
      },
    },
    0,
  );
}
export function startStudy(
  settings: StudySettings,
  seed = Date.now() >>> 0,
  targets?: StudyReviewTarget[],
): StudySession {
  const error = settingsError(settings);
  if (error) throw Error(error);
  if (
    targets &&
    (settings.length !== "all" ||
      !targets.length ||
      targets.some(
        ({ targetId, topic }) =>
          !validTopicTarget(
            targetId,
            topic as StudyTopic,
            studyPool(settings),
          ) || !settings.topics.includes(topic as StudyTopic),
      ))
  )
    throw Error("Choose valid places and topics for review.");
  const coverage =
    settings.length === "all"
      ? shuffle(
          targets
            ? [
                ...new Set(
                  targets.map(({ targetId, topic }) => `${targetId}/${topic}`),
                ),
              ]
            : studyTargets(settings).map(
                ({ targetId, topic }) => `${targetId}/${topic}`,
              ),
          seed,
        )
      : undefined;
  return draw(
    {
      settings: structuredClone(settings),
      pool: studyPool(settings),
      deck: [],
      seed: coverage?.seed ?? seed,
      remaining: coverage?.values,
      ...(targets
        ? {
            coverage: [
              ...new Map(
                targets.map((t) => [
                  `${t.targetId}/${t.topic}`,
                  { targetId: t.targetId, topic: t.topic },
                ]),
              ).values(),
            ],
          }
        : {}),
      phase: "playing",
      text: "",
      choiceId: "",
      history: [],
    },
    0,
  );
}
export type StudyPreferencesValue = Pick<
  StudySettings,
  | "borders"
  | "countryNames"
  | "capitalMarkers"
  | "capitalNames"
  | "autoAdvance"
  | "revisitMissed"
>;

export type StudyAction =
  | { type: "pin"; lat: number; lng: number }
  | { type: "preferences"; value: StudyPreferencesValue }
  | { type: "text"; value: string }
  | { type: "choice"; id: string }
  | { type: "pick"; id: string }
  | { type: "submit" }
  | { type: "next" }
  | { type: "finish" };
export function studyComplete(session: StudySession) {
  if (session.learningReview?.questionCount !== undefined)
    return session.history.length >= session.learningReview.questionCount;
  if (session.learningReview)
    return (
      session.history.length >= 30 ||
      (!session.learningReview.pending.length &&
        session.history.at(-1)?.prompt.ordinal === session.prompt.ordinal)
    );
  return session.settings.length === "all"
    ? !session.remaining?.length &&
        session.history.at(-1)?.prompt.ordinal === session.prompt.ordinal
    : typeof session.settings.length === "number" &&
        session.history.length >= session.settings.length;
}
export function studyReducer(
  session: StudySession,
  action: StudyAction,
  regions: RegionFeature[] = [],
): StudySession {
  if (action.type === "preferences")
    return { ...session, settings: { ...session.settings, ...action.value } };
  if (action.type === "finish") return { ...session, phase: "summary" };
  if (action.type === "next") {
    if (session.phase !== "feedback") return session;
    if (studyComplete(session)) return { ...session, phase: "summary" };
    if (session.learningReview)
      return drawLearning(session, session.prompt.ordinal + 1);
    return session.placeReview
      ? drawPlaceReview(session, session.prompt.ordinal + 1)
      : draw(session, session.prompt.ordinal + 1);
  }
  if (session.placeReview || session.prompt.topic === "places")
    return reviewAnswer(session, reducePlaceReview(session, action, regions));
  if (session.phase !== "playing") return session;
  if (action.type === "pin")
    return session.prompt.style === "pin" && validStudyPin(action)
      ? { ...session, pin: { lat: action.lat, lng: action.lng } }
      : session;
  if (action.type === "text")
    return canTypeStudyAnswer(session.prompt)
      ? { ...session, text: action.value }
      : session;
  if (
    action.type === "submit" &&
    !canTypeStudyAnswer(session.prompt) &&
    session.prompt.style === "map"
  )
    return session;
  if (action.type === "choice")
    return session.prompt.choices.includes(action.id)
      ? { ...session, choiceId: action.id }
      : session;
  if (
    action.type === "pick" &&
    (session.prompt.style !== "map" || !session.pool.includes(action.id))
  )
    return session;
  if (action.type !== "pick" && action.type !== "submit") return session;
  const { targetId, topic, style } = session.prompt;
  let selectedId: string | undefined,
    response = "";
  let pinResult: ReturnType<typeof gradeStudyPin>;
  if (style === "pin") {
    if (!session.pin) return session;
    const target = studyPinTarget(session.prompt, regions);
    pinResult = target && gradeStudyPin(target, session.pin, regions);
    if (!pinResult) return session;
    response = pinResult.response;
  } else if (action.type === "pick") {
    selectedId = action.id;
    response = countryName(action.id);
  } else if (style === "choices") {
    if (!session.choiceId) return session;
    selectedId = session.choiceId;
    response = answerLabel(session.prompt, selectedId);
  } else {
    response = session.text.trim();
    if (!response) return session;
    if (style === "map" || (!isPlaceTopic(topic) && topic !== "capitals"))
      selectedId =
        countryIdForName(
          {
            names: new Map(
              session.pool.map((id) => [id, countryNames.get(id)!]),
            ),
          },
          response,
        ) ??
        session.pool.find(
          (id) => normalizeAnswer(id.slice(5)) === normalizeAnswer(response),
        );
  }
  const correct = pinResult
    ? pinResult.correct
    : isPlaceTopic(topic) && style === "map"
      ? selectedId === session.prompt.place?.countryId
      : isPlaceTopic(topic) && style === "typing"
        ? normalizeAnswer(response) ===
          normalizeAnswer(session.prompt.place!.name)
        : selectedId
          ? selectedId === targetId
          : topic === "capitals" &&
            style !== "map" &&
            [capitalOf(targetId).name, ...capitalOf(targetId).aliases].some(
              (a) => normalizeAnswer(a) === normalizeAnswer(response),
            );
  return reviewAnswer(session, {
    ...session,
    phase: "feedback",
    reviews: session.settings.revisitMissed
      ? [
          ...(session.reviews ?? []).filter(
            (r) => r.targetId !== targetId || r.topic !== topic,
          ),
          ...(!correct
            ? [{ targetId, topic, due: session.prompt.ordinal + 3 }]
            : []),
        ]
      : [],
    history: [
      ...session.history,
      {
        prompt: session.prompt,
        response,
        selectedId,
        correct,
        ...(style === "pin" ? { pin: session.pin } : {}),
      },
    ],
  });
}
export function answerLabel(prompt: StudyPrompt, id = prompt.targetId): string {
  if (isPlaceTopic(prompt.topic))
    return prompt.style === "map"
      ? countryName(prompt.place!.countryId!)
      : (studyPlace(id)?.name ?? id);
  if (prompt.place) return prompt.place.name;
  return prompt.topic === "capitals" && prompt.style !== "map"
    ? (capitalChoiceName(id) ?? id)
    : countryName(id);
}
export const canTypeStudyAnswer = (prompt: StudyPrompt) =>
  !isStudyPinPrompt(prompt) &&
  !(
    (prompt.topic === "countries" || prompt.topic === "places") &&
    prompt.style === "map"
  );
export function studyPrompt(prompt: StudyPrompt): string {
  if (isPlaceTopic(prompt.topic) && prompt.place)
    return prompt.style === "map"
      ? `Find the country containing ${prompt.place.name}.`
      : prompt.style === "pin"
        ? `Place a pin at ${prompt.place.name}.`
        : prompt.topic === "cities"
          ? "Which major city is marked?"
          : "Which landmark is shown?";
  if (prompt.place)
    return `Place a pin ${prompt.place.regionId ? "inside" : "at"} ${prompt.place.name}.`;
  const name = countryName(prompt.targetId),
    capital = capitalOf(prompt.targetId).name;
  if (prompt.style === "pin")
    return prompt.topic === "capitals"
      ? `Place a pin at the capital of ${name}.`
      : prompt.topic === "flags"
        ? "Place a pin inside the country that flies this flag."
        : `Place a pin inside ${name}.`;
  if (prompt.topic === "flags") return "Which country flies this flag?";
  if (prompt.topic === "capitals")
    return prompt.style === "map"
      ? `Find the country whose capital is ${capital}.`
      : `What is the capital of ${name}?`;
  return prompt.style === "map"
    ? `Find ${name}.`
    : "Which country is highlighted?";
}
export function studyStates(
  session: StudySession,
): Record<string, VisualState> {
  if (session.placeReview || session.prompt.style === "pin")
    return {
      ...Object.fromEntries(COUNTRIES.map((c) => [c.id, "surface" as const])),
      ...(session.phase === "feedback" &&
      (session.prompt.place?.regionId || session.prompt.style === "pin")
        ? {
            [session.prompt.place?.regionId ??
            session.prompt.place?.countryId ??
            session.prompt.targetId]: session.history.at(-1)?.correct
              ? ("correct" as const)
              : ("answer" as const),
          }
        : {}),
    };
  const states: Record<string, VisualState> = Object.fromEntries(
    COUNTRIES.map((c) => [c.id, "disabled"]),
  );
  if (session.phase === "playing") {
    if (session.prompt.style === "map")
      session.pool.forEach((id) => (states[id] = "selectable"));
    else if (session.prompt.topic !== "flags")
      states[session.prompt.place?.countryId ?? session.prompt.targetId] =
        "selected";
  } else if (session.phase === "feedback") {
    const answer = session.history.at(-1)!;
    states[session.prompt.place?.countryId ?? session.prompt.targetId] =
      answer.correct ? "correct" : "answer";
    if (
      !answer.correct &&
      answer.selectedId &&
      memberIds.has(answer.selectedId)
    )
      states[answer.selectedId] = "incorrect";
  } else {
    session.history.forEach(
      (a) =>
        (states[a.prompt.place?.countryId ?? a.prompt.targetId] = "correct"),
    );
    for (const answer of missedStudyAnswers(session))
      states[answer.prompt.place?.countryId ?? answer.prompt.targetId] =
        "incorrect";
  }
  return states;
}
export function validSettings(value: unknown): value is StudySettings {
  return (
    isRecord(value) &&
    Array.isArray(value.topics) &&
    value.topics.length <= TOPICS.length &&
    new Set(value.topics).size === value.topics.length &&
    value.topics.every((t) => TOPICS.includes(t)) &&
    ["all", "continent", "custom"].includes(String(value.scope)) &&
    ["AF", "AS", "EU", "NA", "SA", "OC"].includes(String(value.continent)) &&
    strings(value.countryIds) &&
    value.countryIds.every((id) => memberIds.has(id)) &&
    isRecord(value.styles) &&
    TOPICS.every(
      (t) =>
        (isPlaceTopic(t) &&
          (value.styles as Record<string, unknown>)[t] === undefined) ||
        ["map", "pin", "typing", "choices", "mixed"].includes(
          String((value.styles as Record<string, unknown>)[t]),
        ),
    ) &&
    [
      "borders",
      "countryNames",
      "capitalMarkers",
      "capitalNames",
      "autoAdvance",
    ].every((k) => typeof value[k] === "boolean") &&
    [10, 20, 50, "continuous", "all"].includes(
      value.length as number | string,
    ) &&
    (value.capitalDistractors === undefined ||
      (typeof value.capitalDistractors === "string" &&
        Object.hasOwn(CAPITAL_DISTRACTORS, value.capitalDistractors))) &&
    (value.choiceCount === undefined ||
      ([2, 3, 4, 5, 6].includes(Number(value.choiceCount)) &&
        typeof value.choiceCount === "number")) &&
    (value.revisitMissed === undefined ||
      typeof value.revisitMissed === "boolean") &&
    (value.perTopicMethods === undefined ||
      typeof value.perTopicMethods === "boolean")
  );
}
function validPrompt(value: unknown, pool: string[]): value is StudyPrompt {
  if (isRecord(value) && isPlaceTopic(value.topic)) {
    const place = studyPlace(String(value.targetId));
    return (
      !!place &&
      place.topic === value.topic &&
      pool.includes(place.countryId) &&
      validStudyPlace(value.place) &&
      value.place.regionId === undefined &&
      ["id", "name", "lat", "lng", "countryId", "radiusKm", "sourceUrl"].every(
        (key) =>
          Reflect.get(value.place as object, key) ===
          Reflect.get(placeTarget(place), key),
      ) &&
      ["map", "pin", "typing", "choices"].includes(String(value.style)) &&
      strings(value.choices) &&
      value.choices.length <= 6 &&
      new Set(value.choices).size === value.choices.length &&
      value.choices.every(
        (id) =>
          studyPlace(id)?.topic === value.topic &&
          pool.includes(studyPlace(id)!.countryId),
      ) &&
      (value.style === "choices"
        ? value.choices.length >= 2 && value.choices.includes(place.id)
        : value.choices.length === 0) &&
      Number.isInteger(value.ordinal) &&
      Number(value.ordinal) >= 0
    );
  }
  return (
    isRecord(value) &&
    typeof value.targetId === "string" &&
    pool.includes(value.targetId) &&
    TOPICS.includes(value.topic as StudyTopic) &&
    value.place === undefined &&
    ["map", "pin", "typing", "choices"].includes(String(value.style)) &&
    strings(value.choices) &&
    value.choices.length <= 6 &&
    new Set(value.choices).size === value.choices.length &&
    value.choices.every((id) =>
      value.topic === "capitals" && value.style === "choices"
        ? validCapitalChoice(id)
        : pool.includes(id),
    ) &&
    (value.style !== "choices" ||
      (value.choices.length >= 2 && value.choices.includes(value.targetId))) &&
    Number.isInteger(value.ordinal) &&
    Number(value.ordinal) >= 0
  );
}
function validLearningPrompt(
  value: unknown,
  pool: string[],
  run: LearningRun,
): value is StudyPrompt {
  if (!isRecord(value)) return false;
  const target = run.targets.find(
    (item) => item.key === learningTargetKey(value as unknown as StudyPrompt),
  );
  if (!target || !LEARNING_METHODS[target.skill].includes(value.style as never))
    return false;
  if (!target.place || isPlaceTopic(target.topic))
    return validPrompt(value, pool);
  return (
    value.topic === "places" &&
    value.style === "pin" &&
    validStudyPlace(value.place) &&
    ["id", "name", "lat", "lng", "regionId", "sourceUrl", "radiusKm"].every(
      (key) =>
        Reflect.get(value.place as object, key) ===
        Reflect.get(target.place!, key),
    ) &&
    Array.isArray(value.choices) &&
    !value.choices.length &&
    Number.isInteger(value.ordinal) &&
    Number(value.ordinal) >= 0
  );
}
function validSessionPrompt(
  value: unknown,
  pool: string[],
  run: unknown,
): value is StudyPrompt {
  return run
    ? validLearningPrompt(value, pool, run as LearningRun)
    : validPrompt(value, pool);
}
export function validStudy(value: unknown): value is StudySave {
  if (!isRecord(value) || value.version !== 1 || !validSettings(value.settings))
    return false;
  if (
    value.history !== undefined &&
    (!Array.isArray(value.history) ||
      value.history.some(
        (record) =>
          !isRecord(record) ||
          typeof record.id !== "string" ||
          typeof record.finishedAt !== "number" ||
          !Number.isFinite(new Date(record.finishedAt).getTime()) ||
          !isRecord(record.session) ||
          record.session.phase !== "summary" ||
          !validStudy({
            version: 1,
            settings: record.session.settings,
            session: record.session,
          }),
      ))
  )
    return false;
  if (value.session === undefined) return true;
  const s = value.session;
  if (isRecord(s) && s.placeReview !== undefined)
    return validSettings(s.settings) && validPlaceReview(s);
  return (
    isRecord(s) &&
    (s.id === undefined || typeof s.id === "string") &&
    (s.challengeId === undefined ||
      (typeof s.challengeId === "string" &&
        /^[a-f0-9-]{36}$/.test(s.challengeId))) &&
    (s.learningReview === undefined || validLearningRun(s.learningReview)) &&
    validSettings(s.settings) &&
    !settingsError(s.settings) &&
    strings(s.pool) &&
    s.pool.length > 0 &&
    JSON.stringify(s.pool) === JSON.stringify(studyPool(s.settings)) &&
    strings(s.deck) &&
    new Set(s.deck).size === s.deck.length &&
    s.deck.every((id) => (s.pool as string[]).includes(id)) &&
    (s.settings.length !== "all" ||
      (strings(s.remaining) &&
        new Set(s.remaining).size === s.remaining.length &&
        s.remaining.every((pair) => {
          const [id, topic] = pair.split("/");
          return (
            validTopicTarget(id, topic as StudyTopic, s.pool as string[]) &&
            (s.settings as StudySettings).topics.includes(
              topic as StudyTopic,
            ) &&
            pair === `${id}/${topic}`
          );
        }))) &&
    Number.isInteger(s.seed) &&
    (s.learningReview
      ? validLearningPrompt(s.prompt, s.pool, s.learningReview as LearningRun)
      : validPrompt(s.prompt, s.pool)) &&
    (s.coverage === undefined ||
      (Array.isArray(s.coverage) &&
        s.coverage.length > 0 &&
        s.settings.length === "all" &&
        s.coverage.every(
          (target) =>
            isRecord(target) &&
            validTopicTarget(
              String(target.targetId),
              target.topic as StudyTopic,
              s.pool as string[],
            ) &&
            (s.settings as StudySettings).topics.includes(
              target.topic as StudyTopic,
            ),
        ))) &&
    ["playing", "feedback", "summary"].includes(String(s.phase)) &&
    typeof s.text === "string" &&
    typeof s.choiceId === "string" &&
    (s.pin === undefined || validStudyPin(s.pin)) &&
    Array.isArray(s.history) &&
    s.history.every(
      (a) =>
        isRecord(a) &&
        validSessionPrompt(a.prompt, s.pool as string[], s.learningReview) &&
        validAnswerTime(a.answeredAt) &&
        (a.assisted === undefined || typeof a.assisted === "boolean") &&
        typeof a.correct === "boolean" &&
        typeof a.response === "string" &&
        (a.pin === undefined || validStudyPin(a.pin)) &&
        (a.prompt.style !== "pin" || a.pin !== undefined) &&
        (a.selectedId === undefined ||
          (a.prompt.style === "choices"
            ? a.prompt.choices
            : (s.pool as string[])
          ).includes(String(a.selectedId))),
    ) &&
    (s.phase !== "feedback" || s.history.length > 0)
  );
}

/** Salvage supported saves record by record; unknown versions stay untouched. */
export function recoverStudy(value: unknown): StudySave | undefined {
  if (!isRecord(value) || value.version !== 1) return;
  const settings = { ...defaultSettings };
  if (isRecord(value.settings))
    for (const key of [...Object.keys(defaultSettings), "perTopicMethods"]) {
      const candidate = { ...settings, [key]: value.settings[key] };
      if (validSettings(candidate)) Object.assign(settings, candidate);
    }
  const history = Array.isArray(value.history)
    ? value.history.filter((record): record is StudyRecord =>
        validStudy({ version: 1, settings, history: [record] }),
      )
    : [];
  const unique = [...new Map(history.map((r) => [r.id, r])).values()];
  const session =
    isRecord(value.session) &&
    validStudy({ version: 1, settings, session: value.session })
      ? (value.session as unknown as StudySession)
      : undefined;
  return {
    version: 1,
    settings,
    ...(unique.length ? { history: unique } : {}),
    ...(session ? { session } : {}),
  };
}

/** Old one-pass records can recover their intended coverage from their queue
 * and recorded prompts, without adding new country/topic combinations. */
export function studyReplayTargets(
  session: StudySession,
): StudyReviewTarget[] | undefined {
  if (session.settings.length !== "all") return;
  return (
    session.coverage ?? [
      ...new Map(
        [
          ...session.history.map((a) => a.prompt),
          session.prompt,
          ...(session.remaining ?? []).map((pair) => {
            const [targetId, topic] = pair.split("/");
            return { targetId, topic: topic as StudyTopic };
          }),
        ].map(({ targetId, topic }) => [
          `${targetId}/${topic}`,
          { targetId, topic },
        ]),
      ).values(),
    ]
  );
}

/** Drop an active attempt only when explicitly replacing/ending its setup. */
export function studyPreferences(save: StudySave): StudySave {
  return {
    version: 1,
    settings: { ...save.settings },
    ...(save.history?.length ? { history: save.history } : {}),
  };
}

export function archiveStudy(save: StudySave): StudySave {
  const session = save.session;
  if (
    !session?.history.length ||
    save.history?.some((r) => r.id === session.id)
  )
    return save;
  const id = session.id ?? crypto.randomUUID();
  const completed = { ...session, id, phase: "summary" as const };
  return {
    ...save,
    session: completed,
    history: [
      { id, finishedAt: Date.now(), session: completed },
      ...(save.history ?? []),
    ],
  };
}
export function leaveStudy(save: StudySave): StudySave {
  return studyPreferences(archiveStudy(save));
}
