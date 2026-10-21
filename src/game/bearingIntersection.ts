import { geoDistance } from "d3-geo";
import type { Question } from "./questionContracts";
import { answerPlace } from "./answerTargets";
import {
  angularError,
  forwardBearingIntersections,
  greatCircleArc,
  initialBearing,
  normalizeBearing,
  validGeoPoint,
} from "./geodesic";
import { EARTH_KM } from "./spatial";
import type { MapOverlay } from "../geography/types";

export function intersectionReadings(question: Question) {
  const target =
    question.rule.type === "pin-distance" &&
    answerPlace(question, question.rule.targetId);
  if (!question.bearingIntersection || !target) return [];
  return question.bearingIntersection.stations.map((station) => {
    const bearing = initialBearing(station, target);
    return {
      station,
      bearing,
      displayed: normalizeBearing(Math.round(bearing)),
    };
  });
}

/** Validate the supplied observations, never using a camera or a previous answer. */
export function validateBearingIntersection(
  q: Question,
  fail: (message: string) => never,
) {
  const config = q.bearingIntersection;
  if (!config) return;
  if (q.mode !== "pin" || q.rule.type !== "pin-distance")
    return fail("bearing intersection requires a pin-distance answer");
  const rule = q.rule;
  const target = answerPlace(q, rule.targetId);
  if (
    !target ||
    !validGeoPoint(target) ||
    config.stations.length !== 2 ||
    new Set(config.stations.map((s) => s.id)).size !== 2 ||
    config.stations.some(
      (s) =>
        !s.id ||
        !s.name.trim() ||
        s.markerHidden ||
        s.labelHidden ||
        !validGeoPoint(s) ||
        s.id === target.id,
    )
  )
    return fail(
      "bearing intersection requires a canonical target and two distinct named stations",
    );
  const tiers = rule.tiers;
  if (
    !tiers ||
    tiers.length !== 3 ||
    tiers.at(-1)!.radiusKm !== rule.radiusKm ||
    tiers.some(
      (t, i) =>
        !Number.isFinite(t.radiusKm) ||
        t.radiusKm <= (tiers[i - 1]?.radiusKm ?? 0) ||
        !t.feedback.trim(),
    )
  )
    return fail(
      "bearing intersection requires three ascending distance tiers ending at its radius",
    );
  try {
    const readings = intersectionReadings(q);
    const angle = angularError(
      initialBearing(target, config.stations[0]),
      initialBearing(target, config.stations[1]),
    );
    if (Math.min(angle, 180 - angle) < 5)
      fail("bearing intersection geometry is nearly parallel");
    const solutions = forwardBearingIntersections(
      readings[0].station,
      readings[0].displayed,
      readings[1].station,
      readings[1].displayed,
    );
    if (
      solutions.length !== 1 ||
      geoDistance(
        [solutions[0].lng, solutions[0].lat],
        [target.lng, target.lat],
      ) *
        EARTH_KM >
        tiers[0].radiusKm
    )
      fail(
        "rounded bearings must have one forward intersection within the bullseye",
      );
    if (
      config.stations.some(
        (s) =>
          geoDistance([s.lng, s.lat], [target.lng, target.lat]) * EARTH_KM <=
          rule.radiusKm,
      )
    )
      fail("reference stations must remain outside the accepted answer radius");
    if (config.assist) {
      const { stationId, halfWidthDegrees, reachKm } = config.assist;
      const station = config.stations.find((s) => s.id === stationId);
      if (
        !q.guidance?.assist ||
        !station ||
        !Number.isFinite(halfWidthDegrees) ||
        halfWidthDegrees <= 0 ||
        halfWidthDegrees >= 90 ||
        !Number.isFinite(reachKm) ||
        reachKm >= Math.PI * EARTH_KM ||
        reachKm <=
          geoDistance([station.lng, station.lat], [target.lng, target.lat]) *
            EARTH_KM +
            rule.radiusKm
      )
        fail(
          "intersection assist requires one station, a broad sector and a reach beyond the answer region",
        );
    }
  } catch (error) {
    fail(
      error instanceof Error ? error.message : "Invalid intersection geometry",
    );
  }
}

export function intersectionOverlays(
  question: Question,
  reveal: boolean,
  assisted: boolean,
): MapOverlay[] {
  const readings = intersectionReadings(question);
  const target =
    question.rule.type === "pin-distance" &&
    answerPlace(question, question.rule.targetId);
  if (!readings.length || !target) return [];
  if (reveal)
    return readings.map(({ station }) => ({
      id: `intersection-ray:${question.id}:${station.id}`,
      type: "path",
      visualState: "hinted",
      coordinates: greatCircleArc(station, target),
      opacity: 0.85,
    }));
  const assist = question.bearingIntersection?.assist;
  if (!assisted || !assist) return [];
  const reading = readings.find((r) => r.station.id === assist.stationId)!;
  return [
    {
      id: `intersection-sector:${question.id}`,
      type: "bearing-sector",
      center: reading.station,
      bearing: reading.displayed,
      halfWidthDegrees: assist.halfWidthDegrees,
      radiusKm: assist.reachKm,
    },
  ];
}
