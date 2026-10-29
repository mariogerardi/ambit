import { validAnswerTime } from "./learning";
import type { RegionFeature } from "../geography/types";
import { isRecord } from "../app/storage";
import type { StudyAction, StudySession } from "./engine";
import { gradeStudyPin, validStudyPin } from "./pins";

export interface StudyPlaceTarget {
  id: string;
  name: string;
  lat: number;
  lng: number;
  regionId?: string;
  /** Context only; distance, not the country's boundary, grades a city/landmark pin. */
  countryId?: string;
  sourceUrl?: string;
  radiusKm?: number;
}
export const validStudyPlace = (value: unknown): value is StudyPlaceTarget =>
  isRecord(value) &&
  typeof value.id === "string" &&
  !!value.id &&
  typeof value.name === "string" &&
  !!value.name &&
  typeof value.lat === "number" &&
  Number.isFinite(value.lat) &&
  Math.abs(value.lat) <= 90 &&
  typeof value.lng === "number" &&
  Number.isFinite(value.lng) &&
  Math.abs(value.lng) <= 180 &&
  (value.regionId === undefined || typeof value.regionId === "string") &&
  (value.countryId === undefined || typeof value.countryId === "string") &&
  (value.radiusKm === undefined ||
    (typeof value.radiusKm === "number" &&
      Number.isFinite(value.radiusKm) &&
      value.radiusKm > 0)) &&
  (value.sourceUrl === undefined ||
    (typeof value.sourceUrl === "string" &&
      /^https?:\/\//.test(value.sourceUrl)));

export function drawPlaceReview(
  session: StudySession,
  ordinal: number,
): StudySession {
  const target = session.placeReview!.find(
    (p) => p.id === session.remaining![0],
  )!;
  return {
    ...session,
    phase: "playing",
    pin: undefined,
    prompt: {
      targetId: target.id,
      topic: "places",
      style: "map",
      choices: [],
      ordinal,
      place: target,
    },
    remaining: session.remaining!.slice(1),
  };
}
export function reducePlaceReview(
  session: StudySession,
  action: StudyAction,
  regions: RegionFeature[],
): StudySession {
  if (session.phase !== "playing") return session;
  if (action.type === "pin") {
    if (!validStudyPin(action)) return session;
    return { ...session, pin: { lat: action.lat, lng: action.lng } };
  }
  if (action.type !== "submit" || !session.pin) return session;
  const target = session.prompt.place!,
    pin = session.pin;
  const result = gradeStudyPin(target, pin, regions);
  if (!result) return session;
  return {
    ...session,
    phase: "feedback",
    history: [
      ...session.history,
      {
        prompt: session.prompt,
        response: result.response,
        pin,
        correct: result.correct,
      },
    ],
  };
}

export function validPlaceReview(value: Record<string, unknown>): boolean {
  if (
    !Array.isArray(value.placeReview) ||
    !value.placeReview.length ||
    !value.placeReview.every(validStudyPlace)
  )
    return false;
  const targets = value.placeReview as StudyPlaceTarget[],
    ids = targets.map((t) => t.id);
  const prompt = (p: unknown) =>
    isRecord(p) &&
    p.topic === "places" &&
    p.style === "map" &&
    Array.isArray(p.choices) &&
    !p.choices.length &&
    Number.isInteger(p.ordinal) &&
    Number(p.ordinal) >= 0 &&
    validStudyPlace(p.place) &&
    targets.some(
      (t) =>
        t.id === p.targetId &&
        ["id", "name", "lat", "lng", "regionId", "sourceUrl", "radiusKm"].every(
          (key) => Reflect.get(t, key) === Reflect.get(p.place as object, key),
        ),
    );
  const pin = (p: unknown) =>
    p === undefined ||
    (isRecord(p) && validStudyPlace({ id: "pin", name: "Pin", ...p }));
  return (
    (value.id === undefined || typeof value.id === "string") &&
    value.challengeId === undefined &&
    value.learningReview === undefined &&
    new Set(ids).size === ids.length &&
    Array.isArray(value.pool) &&
    JSON.stringify(value.pool) === JSON.stringify(ids) &&
    Array.isArray(value.remaining) &&
    new Set(value.remaining).size === value.remaining.length &&
    value.remaining.every((id) => ids.includes(String(id))) &&
    Array.isArray(value.deck) &&
    !value.deck.length &&
    typeof value.seed === "number" &&
    Number.isFinite(value.seed) &&
    isRecord(value.settings) &&
    value.settings.length === "all" &&
    prompt(value.prompt) &&
    pin(value.pin) &&
    ["playing", "feedback", "summary"].includes(String(value.phase)) &&
    typeof value.text === "string" &&
    typeof value.choiceId === "string" &&
    Array.isArray(value.history) &&
    value.history.every(
      (a) =>
        isRecord(a) &&
        prompt(a.prompt) &&
        validAnswerTime(a.answeredAt) &&
        (a.assisted === undefined || typeof a.assisted === "boolean") &&
        typeof a.correct === "boolean" &&
        typeof a.response === "string" &&
        a.pin !== undefined &&
        pin(a.pin),
    ) &&
    (value.phase !== "feedback" || value.history.length > 0)
  );
}
