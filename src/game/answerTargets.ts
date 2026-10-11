import { geoContains, geoDistance } from "d3-geo";
import { sphericalGeometry } from "../geography/sphericalGeometry.mjs";
import { MAJOR_CITIES, DISPLAY_CAPITALS } from "../geography/places";
import { CAPITALS } from "./quizData";
import type { PlaceFeature } from "../geography/types";
import type { Question, QuestionContext, Response } from "./questions";

export const ANSWER_PLACES = new Map<string, PlaceFeature>(
  [...MAJOR_CITIES, ...DISPLAY_CAPITALS].map((p) => [
    p.id,
    { ...p, aliases: CAPITALS.find((c) => c.id === p.id)?.aliases },
  ]),
);
export function answerPlace(question: Question, id: string) {
  return question.places?.find((p) => p.id === id) ?? ANSWER_PLACES.get(id);
}
/** The point-selection control also supports summits and other authored places. */
export function pointAnswerNoun(question: Question) {
  const ids = question.selection.type === "ids" ? question.selection.ids : [];
  return ids.length &&
    ids.every((id) => answerPlace(question, id)?.kind === "mountain")
    ? "summit"
    : "city";
}
export function validPin(
  value: unknown,
): value is { lat: number; lng: number } {
  if (!value || typeof value !== "object") return false;
  const p = value as { lat?: number; lng?: number };
  return (
    typeof p.lat === "number" &&
    Number.isFinite(p.lat) &&
    Math.abs(p.lat) <= 90 &&
    typeof p.lng === "number" &&
    Number.isFinite(p.lng) &&
    Math.abs(p.lng) <= 180
  );
}
export function pinDistance(question: Question, response: Response) {
  if (question.rule.type !== "pin-distance" || !validPin(response.pin))
    return undefined;
  const p = answerPlace(question, question.rule.targetId);
  return p
    ? geoDistance([response.pin.lng, response.pin.lat], [p.lng, p.lat]) *
        6371.0088
    : undefined;
}
export function pinInside(
  question: Question,
  context: QuestionContext,
  response: Response,
) {
  if (question.rule.type !== "pin-inside" || !validPin(response.pin))
    return false;
  return question.rule.ids.some((id) => {
    const r = context.targets.get(id);
    return (
      !!r &&
      geoContains(sphericalGeometry(r.geometry), [
        response.pin!.lng,
        response.pin!.lat,
      ])
    );
  });
}
/** Resolve typing against the candidate pool, never silently pick an ambiguous name. */
export function cityIdForName(question: Question, value: string) {
  const normalized = normalize(value);
  const ids = question.selection.type === "ids" ? question.selection.ids : [];
  const matches = ids.filter((id) => {
    const place = answerPlace(question, id);
    const capital = CAPITALS.find((p) => p.id === id);
    return (
      !!place &&
      [place.name, ...(place.aliases ?? []), ...(capital?.aliases ?? [])].some(
        (name) => normalize(name) === normalized,
      )
    );
  });
  return matches.length === 1 ? matches[0] : undefined;
}
function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
