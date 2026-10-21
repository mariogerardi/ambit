import type { KnowledgeRule, Question, Response } from "./questionContracts";
import type { PlaceFeature } from "../geography/types";
import { angularError, initialBearing, normalizeBearing } from "./geodesic";

export type BearingRule = Extract<KnowledgeRule, { type: "bearing-angle" }>;
export interface BearingResult {
  version: 1;
  origin: PlaceFeature;
  destination: PlaceFeature;
  chosen: number;
  target: number;
  error: number;
  tier: number | null;
  feedback: string;
}
/** Reuse the response register, while retaining a separate angular grading contract. */
export function bearingValue(response: Response) {
  const text = response.text.trim();
  const value = Number(text);
  return /^\d{1,3}$/.test(text) &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 360
    ? normalizeBearing(value)
    : undefined;
}
export function bearingResult(
  question: Question,
  response: Response,
): BearingResult | undefined {
  if (question.rule.type !== "bearing-angle") return;
  const chosen = bearingValue(response);
  if (chosen === undefined) return;
  const { origin, destination, tiers } = question.rule;
  const target = initialBearing(origin, destination);
  const error = angularError(chosen, target);
  const index = tiers.findIndex((tier) => error <= tier.degrees + 1e-7);
  return {
    version: 1,
    origin: { ...origin },
    destination: { ...destination },
    chosen,
    target,
    error,
    tier: index < 0 ? null : index,
    feedback: index < 0 ? "Off course." : tiers[index].feedback,
  };
}
export function reviewedBearing(
  question: Question,
  response: Response & {
    bearing?: BearingResult;
    answers?: { roundId: string; bearing?: BearingResult }[];
  },
) {
  return (
    response.bearing ??
    response.answers?.find((a) => a.roundId === question.id)?.bearing ??
    bearingResult(question, response)
  );
}
export const formatBearing = (degrees: number) =>
  `${String(normalizeBearing(Math.round(degrees))).padStart(3, "0")}°`;
export const bearingTierLabel = (tier: number | null) =>
  tier === 0
    ? "Bullseye"
    : tier === 1
      ? "Close"
      : tier === 2
        ? "Within range"
        : "Outside range";
export function bearingReceipt(result: BearingResult) {
  return `${formatBearing(result.chosen)} chosen · ${formatBearing(result.target)} correct · ${result.error.toFixed(2)}° error · ${bearingTierLabel(result.tier)}`;
}

/** Validate frozen evidence structurally, without consulting a changed question. */
export function validBearingResult(value: unknown): value is BearingResult {
  if (!value || typeof value !== "object") return false;
  const v = value as BearingResult;
  try {
    initialBearing(v.origin, v.destination);
  } catch {
    return false;
  }
  const place = (p: PlaceFeature) =>
    p &&
    typeof p.id === "string" &&
    !!p.id.trim() &&
    typeof p.name === "string" &&
    !!p.name.trim() &&
    typeof p.sourceId === "string" &&
    [
      "city",
      "capital",
      "town",
      "landmark",
      "other",
      "mountain",
      "landform",
      "ocean",
      "river",
    ].includes(p.kind) &&
    Number.isFinite(p.lat) &&
    Math.abs(p.lat) <= 90 &&
    Number.isFinite(p.lng) &&
    Math.abs(p.lng) <= 180;
  return (
    v.version === 1 &&
    !!place(v.origin) &&
    !!place(v.destination) &&
    Number.isInteger(v.chosen) &&
    v.chosen >= 0 &&
    v.chosen < 360 &&
    Number.isFinite(v.target) &&
    v.target >= 0 &&
    v.target < 360 &&
    Number.isFinite(v.error) &&
    v.error >= 0 &&
    v.error <= 180 &&
    Math.abs(angularError(v.chosen, v.target) - v.error) < 1e-7 &&
    (v.tier === null ||
      (Number.isInteger(v.tier) && v.tier >= 0 && v.tier <= 2)) &&
    typeof v.feedback === "string" &&
    !!v.feedback.trim()
  );
}
