import { geoBounds } from "d3-geo";
import type { Focus } from "../geography/types";
import { sphericalGeometry } from "../geography/sphericalGeometry.mjs";
import { comparisonFocus } from "../globe/camera";
import type { Question, QuestionContext } from "./questionContracts";
import { selectableIds } from "./questionPreparation";

const cache = new WeakMap<
  QuestionContext,
  WeakMap<Question, Map<boolean, Focus>>
>();

/** Fit the entire input field, independently of solutions, guesses and camera history. */
export function selectionFocus(
  question: Question,
  context: QuestionContext,
  assisted = false,
): Focus {
  let questions = cache.get(context);
  if (!questions) cache.set(context, (questions = new WeakMap()));
  let stages = questions.get(question);
  if (!stages) questions.set(question, (stages = new Map()));
  const cached = stages.get(assisted);
  if (cached) return cached;
  const survivors = assisted
    ? question.guidance?.assist?.candidateIds
    : undefined;
  const regions = selectableIds(question, context)
    .filter((id) => !survivors || survivors.includes(id))
    .flatMap((id) => {
      const region = context.targets.get(id);
      return region ? [region] : [];
    });
  if (!regions.length) return question.focus;
  const [[west, south], [east, north]] = geoBounds({
    type: "GeometryCollection",
    geometries: regions.map((region) => sphericalGeometry(region.geometry)),
  });
  if (![west, south, east, north].every(Number.isFinite)) return question.focus;
  // D3 preserves the shorter dateline-crossing interval as west > east.
  const span = east < west ? east + 360 - west : east - west;
  const longitude = (value: number) => ((value + 540) % 360) - 180;
  const middle = longitude(west + span / 2);
  const latitude = (south + north) / 2;
  const focus =
    span >= 180 || north - south >= 150
      ? { lat: latitude, lng: middle, altitude: 2.2 }
      : comparisonFocus(
          [south, latitude, north].flatMap((lat) =>
            [west, middle, east].map((lng) => ({ lat, lng })),
          ),
          undefined,
          40,
        );
  stages.set(assisted, focus);
  return focus;
}
