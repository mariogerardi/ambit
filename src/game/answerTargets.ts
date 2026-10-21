import { normalizeAnswer } from "./answerNames";
import { geoContains, geoDistance } from "d3-geo";
import { sphericalGeometry } from "../geography/sphericalGeometry.mjs";
import { MAJOR_CITIES, DISPLAY_CAPITALS } from "../geography/places";
import { CAPITALS } from "./quizData";
import type { PlaceFeature } from "../geography/types";
import type { Question, QuestionContext, Response } from "./questionContracts";

export const ANSWER_PLACES = new Map<string, PlaceFeature>(
  [...MAJOR_CITIES, ...DISPLAY_CAPITALS].map((p) => [
    p.id,
    { ...p, aliases: CAPITALS.find((c) => c.id === p.id)?.aliases },
  ]),
);
export function answerPlace(question: Question, id: string) {
  if (question.rule.type === "bearing-angle") {
    if (question.rule.origin.id === id) return question.rule.origin;
    if (question.rule.destination.id === id) return question.rule.destination;
  }
  return question.places?.find((p) => p.id === id) ?? ANSWER_PLACES.get(id);
}
/** Display lookup only: never turn an unknown or ambiguous typed name into a coordinate. */
export function responsePlaceForName(
  question: Question,
  context: QuestionContext,
  value: string,
): PlaceFeature | undefined {
  const normalized = normalizeAnswer(value);
  if (!normalized) return undefined;
  const matches = (places: PlaceFeature[]) =>
    new Map(
      places
        .filter(
          (p) =>
            ["city", "capital"].includes(p.kind) &&
            [p.name, ...(p.aliases ?? [])].some(
              (name) => normalizeAnswer(name) === normalized,
            ),
        )
        .map((p) => [p.id, p]),
    );
  const authored = matches([
    ...(question.places ?? []),
    ...(question.guidance?.assist?.places ?? []),
    ...(question.feedbackPlaces ?? []),
  ]);
  const candidates = authored.size
    ? authored
    : matches([...context.capitals, ...ANSWER_PLACES.values()]);
  if (candidates.size === 1) return [...candidates.values()][0];
  if (question.rule.type === "capital-name") {
    const country = question.rule.countryId;
    const local = [...candidates.values()].filter(
      (p) => p.parentId === country,
    );
    if (local.length === 1) return local[0];
  }
  return undefined;
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
/** The innermost containing tier wins, with the same boundary tolerance as grading. */
export function pinDistanceTier(question: Question, response: Response) {
  if (question.rule.type !== "pin-distance") return undefined;
  const distance = pinDistance(question, response);
  return distance === undefined
    ? undefined
    : question.rule.tiers?.find((tier) => distance <= tier.radiusKm + 1e-7);
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
  const normalized = normalizeAnswer(value);
  const ids = question.selection.type === "ids" ? question.selection.ids : [];
  const matches = ids.filter((id) => {
    const place = answerPlace(question, id);
    const capital = CAPITALS.find((p) => p.id === id);
    return (
      !!place &&
      [place.name, ...(place.aliases ?? []), ...(capital?.aliases ?? [])].some(
        (name) => normalizeAnswer(name) === normalized,
      )
    );
  });
  return matches.length === 1 ? matches[0] : undefined;
}
