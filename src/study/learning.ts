import roster from "../game/data/un-members.v1.json";
import type {
  StudyPrompt,
  StudySave,
  StudySettings,
  StudyStyle,
} from "./engine";
import type { StudyPlaceTarget } from "./placeReview";
import { isPlaceTopic } from "./placeTopics";

export const LEARNING_METHODS = {
  "country-location": ["map", "pin"],
  "country-name": ["choices", "typing"],
  "flag-country": ["choices", "typing"],
  "flag-location": ["map", "pin"],
  "capital-name": ["choices", "typing", "map"],
  "capital-location": ["pin"],
  "place-location": ["pin"],
  "city-country": ["map"],
  "city-name": ["choices", "typing"],
  "city-location": ["pin"],
  "landmark-country": ["map"],
  "landmark-name": ["choices", "typing"],
  "landmark-location": ["pin"],
} as const;
export type LearningSkill = keyof typeof LEARNING_METHODS;
export type LearningMethod = Exclude<StudyStyle, "mixed">;
export const REVIEW_LENGTHS = [10, 20, 50, 100] as const;
export type ReviewQuestionCount = (typeof REVIEW_LENGTHS)[number];
export interface LearningTarget {
  key: string;
  targetId: string;
  topic: StudyPrompt["topic"];
  skill: LearningSkill;
  attempts: number;
  place?: StudyPlaceTarget;
}
export interface LearningRun {
  /** Absent in older saves, which finish when their queue is cleared. */
  questionCount?: ReviewQuestionCount;
  targets: LearningTarget[];
  pending: string[];
}
export interface LearningItem extends LearningTarget {
  level: number;
  dueAt: number;
  lastQualifiedAt?: number;
  methods: LearningMethod[];
  days: string[];
  confident: boolean;
}
const members = new Set(roster.members.map((country) => country.id));
const MINUTE = 60_000,
  DAY = 86_400_000;
// A conservative product heuristic: evidence is rebuilt from retained answers.
const INTERVALS = [0, 10 * MINUTE, DAY, 3 * DAY, 7 * DAY, 21 * DAY];
export function learningTarget(
  prompt: StudyPrompt,
): Omit<LearningTarget, "attempts"> {
  if (isPlaceTopic(prompt.topic)) {
    const skill =
      `${prompt.topic === "cities" ? "city" : "landmark"}-${prompt.style === "map" ? "country" : prompt.style === "pin" ? "location" : "name"}` as LearningSkill;
    return {
      key: `${prompt.targetId}/${skill}`,
      targetId: prompt.targetId,
      topic: prompt.topic,
      skill,
      place: prompt.place,
    };
  }
  const countryPlace =
    prompt.place?.regionId && members.has(prompt.place.regionId);
  const targetId = countryPlace ? prompt.place!.regionId! : prompt.targetId;
  const topic = countryPlace ? "countries" : prompt.topic;
  const skill: LearningSkill = countryPlace
    ? "country-location"
    : prompt.place
      ? "place-location"
      : topic === "countries"
        ? prompt.style === "map" || prompt.style === "pin"
          ? "country-location"
          : "country-name"
        : topic === "flags"
          ? prompt.style === "map" || prompt.style === "pin"
            ? "flag-location"
            : "flag-country"
          : prompt.style === "pin"
            ? "capital-location"
            : "capital-name";
  return {
    key: `${targetId}/${skill}`,
    targetId,
    topic,
    skill,
    ...(prompt.place && !countryPlace ? { place: prompt.place } : {}),
  };
}
export function assistedStudyAnswer(
  settings: StudySettings,
  prompt: StudyPrompt,
) {
  if (prompt.place)
    return (
      isPlaceTopic(prompt.topic) &&
      prompt.style === "map" &&
      settings.countryNames
    );
  if (prompt.topic === "flags")
    return (
      (prompt.style === "map" || prompt.style === "pin") &&
      settings.countryNames
    );
  if (prompt.topic === "countries") return settings.countryNames;
  return (
    settings.capitalNames || (prompt.style === "pin" && settings.capitalMarkers)
  );
}
export function validAnswerTime(value: unknown) {
  return (
    value === undefined ||
    (typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 0 &&
      Number.isFinite(new Date(value).getTime()))
  );
}
/** Deduplicate session snapshots before aggregating; opening history creates no evidence. */
export function learningQueue(
  save: StudySave,
  now = Date.now(),
): LearningItem[] {
  const sessions = new Map<
    string,
    { session: NonNullable<StudySave["session"]>; time: number }
  >();
  for (const record of save.history ?? []) {
    const previous = sessions.get(record.id);
    if (
      !previous ||
      record.session.history.length > previous.session.history.length
    )
      sessions.set(record.id, {
        session: record.session,
        time: record.finishedAt,
      });
  }
  if (save.session) {
    const id = save.session.id ?? `legacy-study-${save.session.seed}`;
    const previous = sessions.get(id);
    if (
      !previous ||
      save.session.history.length > previous.session.history.length
    )
      sessions.set(id, { session: save.session, time: now });
  }
  const events = [...sessions].flatMap(([id, { session, time }]) =>
    session.history.map((answer, index) => ({
      id,
      answer,
      settings: session.settings,
      time: answer.answeredAt ?? time,
      index,
    })),
  );
  events.sort(
    (a, b) => a.time - b.time || a.id.localeCompare(b.id) || a.index - b.index,
  );
  const items = new Map<string, LearningItem>();
  const seen = new Set<string>();
  for (const { id, answer, settings, time, index } of events) {
    const identity = learningTarget(answer.prompt);
    const eventKey = `${id}/${answer.prompt.ordinal}/${index}`;
    if (seen.has(eventKey)) continue;
    seen.add(eventKey);
    const item = items.get(identity.key) ?? {
      ...identity,
      attempts: 0,
      level: 0,
      dueAt: time,
      methods: [],
      days: [],
      confident: false,
    };
    item.attempts++;
    if (!answer.correct) {
      item.level = 0;
      item.dueAt = time;
      item.lastQualifiedAt = undefined;
      item.methods = [];
      item.days = [];
    } else if (
      !(answer.assisted ?? assistedStudyAnswer(settings, answer.prompt))
    ) {
      const separated =
        item.lastQualifiedAt === undefined ||
        time - item.lastQualifiedAt >= 5 * MINUTE;
      if (separated) {
        // Recognition alone stays at the first interval; recall/location advances it.
        item.level =
          answer.prompt.style === "choices"
            ? Math.max(item.level, 1)
            : Math.min(item.level + 1, 5);
        item.lastQualifiedAt = time;
        if (!item.methods.includes(answer.prompt.style))
          item.methods.push(answer.prompt.style);
        const day = new Date(time).toISOString().slice(0, 10);
        if (!item.days.includes(day)) item.days.push(day);
        item.dueAt =
          time +
          (answer.prompt.style === "choices"
            ? Math.min(INTERVALS[item.level], DAY)
            : INTERVALS[item.level]);
      }
    } else if (!item.level) item.dueAt = time + MINUTE;
    const variety =
      LEARNING_METHODS[item.skill].length === 1 || item.methods.length >= 2;
    item.confident = item.level >= 3 && item.days.length >= 2 && variety;
    if (!item.confident && item.level >= 3)
      item.dueAt = Math.min(item.dueAt, time + DAY);
    items.set(item.key, item);
  }
  return [...items.values()].sort(
    (a, b) => a.dueAt - b.dueAt || a.key.localeCompare(b.key),
  );
}
export function reviewBatch(
  items: LearningItem[],
  now = Date.now(),
  ahead = false,
  limit = 10,
): LearningTarget[] {
  return items
    .filter((item) => ahead || item.dueAt <= now)
    .slice(0, limit)
    .map(({ key, targetId, topic, skill, attempts, place }) => ({
      key,
      targetId,
      topic,
      skill,
      attempts,
      ...(place ? { place } : {}),
    }));
}
/** Same retained answers produce the same selection, independent of input order. */
export function shuffledReviewBatch(
  items: LearningItem[],
  limit: number,
): LearningTarget[] {
  const ordered = [...items].sort((a, b) => a.key.localeCompare(b.key));
  let seed = 2166136261;
  for (const item of ordered)
    for (const character of `${item.key}:${item.attempts};`)
      seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0;
  for (let index = ordered.length - 1; index > 0; index--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const other = seed % (index + 1);
    [ordered[index], ordered[other]] = [ordered[other], ordered[index]];
  }
  return reviewBatch(ordered, 0, true, limit);
}
export const learningSkillLabel = (skill: LearningSkill) =>
  ({
    "country-location": "Country locations",
    "country-name": "Country recognition",
    "flag-country": "Flag recognition",
    "flag-location": "Flags on the globe",
    "capital-name": "Capital names",
    "capital-location": "Capital locations",
    "place-location": "Place locations",
    "city-country": "Cities and countries",
    "city-name": "City recognition",
    "city-location": "City locations",
    "landmark-country": "Landmarks and countries",
    "landmark-name": "Landmark recognition",
    "landmark-location": "Landmark locations",
  })[skill];
