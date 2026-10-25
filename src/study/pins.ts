import { geoContains, geoDistance } from "d3-geo";
import { sphericalGeometry } from "../geography/sphericalGeometry.mjs";
import { US_STATES } from "../geography/usStates";
import { CAPITALS } from "../game/quizData";
import type { RegionFeature } from "../geography/types";
import type { StudyAnswer, StudyPrompt } from "./engine";
import type { StudyPlaceTarget } from "./placeReview";

export const CAPITAL_PIN_RADIUS_KM = 50;
export const isStudyPinPrompt = (prompt: StudyPrompt) =>
  !!prompt.place || prompt.style === "pin";
export const validStudyPin = (
  pin: unknown,
): pin is { lat: number; lng: number } => {
  if (!pin || typeof pin !== "object" || !("lat" in pin) || !("lng" in pin))
    return false;
  return (
    typeof pin.lat === "number" &&
    typeof pin.lng === "number" &&
    Number.isFinite(pin.lat) &&
    Number.isFinite(pin.lng) &&
    Math.abs(pin.lat) <= 90 &&
    Math.abs(pin.lng) <= 180
  );
};
export function studyPinTarget(
  prompt: StudyPrompt,
  regions: RegionFeature[],
): StudyPlaceTarget | undefined {
  if (prompt.place) return prompt.place;
  if (prompt.style !== "pin") return;
  if (prompt.topic === "capitals") {
    const capital = CAPITALS.find((c) => c.countryId === prompt.targetId);
    return capital
      ? {
          id: capital.id,
          name: capital.name,
          lat: capital.lat,
          lng: capital.lng,
          radiusKm: CAPITAL_PIN_RADIUS_KM,
        }
      : undefined;
  }
  const region = regions.find((r) => r.id === prompt.targetId);
  return region
    ? { id: region.id, name: region.name, ...region.focus, regionId: region.id }
    : undefined;
}
export function gradeStudyPin(
  target: StudyPlaceTarget,
  pin: { lat: number; lng: number },
  regions: RegionFeature[],
) {
  const region = target.regionId
    ? [...regions, ...US_STATES].find((r) => r.id === target.regionId)
    : undefined;
  if (target.regionId && !region) return;
  const km =
    geoDistance([target.lng, target.lat], [pin.lng, pin.lat]) * 6371.0088;
  const correct = region
    ? geoContains(sphericalGeometry(region.geometry), [pin.lng, pin.lat])
    : target.radiusKm !== undefined
      ? km <= target.radiusKm
      : Math.round(1000 * Math.exp(-Math.max(0, km - 1) / 1500)) >= 500;
  const containing =
    region && !correct
      ? regions.find((r) =>
          geoContains(sphericalGeometry(r.geometry), [pin.lng, pin.lat]),
        )
      : undefined;
  return {
    correct,
    response: region
      ? correct
        ? target.name
        : (containing?.name ?? `Outside ${target.name}`)
      : `${Math.round(km).toLocaleString()} km from ${target.name}`,
  };
}
export function studyPinFeedback(answer: StudyAnswer, targetName: string) {
  const region =
    !!answer.prompt.place?.regionId ||
    (answer.prompt.style === "pin" && answer.prompt.topic !== "capitals");
  if (region) {
    if (answer.correct) return `Your pin is inside ${targetName}.`;
    return answer.response !== "Pin placed" &&
      !answer.response.startsWith("Outside ")
      ? `Your pin landed in ${answer.response}.`
      : `Your pin is outside ${targetName}.`;
  }
  return `Your pin is ${answer.response.replace(/ km away$/, ` km from ${targetName}`)}.`;
}
