import { WITHIN_REACH_JOURNEY } from "./withinReachJourney";
import { DRAWING_SAHARA_JOURNEY } from "./drawingSaharaJourney";
import { SILK_ROAD_INTERSECTIONS_JOURNEY } from "./silkRoadIntersectionsJourney";
import { VACCINE_EXPEDITION_JOURNEY } from "./vaccineExpeditionJourney";
import { MISSING_BORDERS_JOURNEY } from "./missingBordersJourney";
import { DANUBE_JOURNEY } from "./danubeJourney";
import { SHARED_NAMES_JOURNEY } from "./sharedNamesJourney";
import { SAME_HOUR_JOURNEY } from "./sameHourJourney";
import { SUN_FLAGS_JOURNEY } from "./sunFlagsJourney";
import { CANADA_JOURNEY } from "./canadaJourney";
import { ANDES_JOURNEY } from "./andesJourney";
import { LATITUDE_JOURNEY } from "./latitudeJourney";
import { NORTH_AMERICA_JOURNEY } from "./northAmericaJourney";
import { FIFTEENTH_JOURNEY } from "./fifteenthJourney";
import { FOURTEENTH_JOURNEY } from "./fourteenthJourney";
import { TWELFTH_JOURNEY } from "./twelfthJourney";
import { ELEVENTH_JOURNEY } from "./eleventhJourney";
import { TENTH_JOURNEY } from "./tenthJourney";
import { NINTH_JOURNEY } from "./ninthJourney";
import { FOURTH_JOURNEY } from "./fourthJourney";
import { ACROSS_DIVIDE_JOURNEY } from "./acrossDivideJourney";
import { FAR_FROM_EVERYTHING_JOURNEY } from "./farFromEverythingJourney";
import { REGGAETON_JOURNEY } from "./reggaetonJourney";
export const JOURNEYS = [
  WITHIN_REACH_JOURNEY,
  DRAWING_SAHARA_JOURNEY,
  SILK_ROAD_INTERSECTIONS_JOURNEY,
  VACCINE_EXPEDITION_JOURNEY,
  REGGAETON_JOURNEY,
  FAR_FROM_EVERYTHING_JOURNEY,
  ACROSS_DIVIDE_JOURNEY,
  CANADA_JOURNEY,
  FOURTH_JOURNEY,
  NINTH_JOURNEY,
  ANDES_JOURNEY,
  ELEVENTH_JOURNEY,
  FOURTEENTH_JOURNEY,
  NORTH_AMERICA_JOURNEY,
  LATITUDE_JOURNEY,
  TENTH_JOURNEY,
  TWELFTH_JOURNEY,
  FIFTEENTH_JOURNEY,
  SUN_FLAGS_JOURNEY,
  DANUBE_JOURNEY,
  SAME_HOUR_JOURNEY,
  SHARED_NAMES_JOURNEY,
  MISSING_BORDERS_JOURNEY,
];
export function journeyPath(id: string) {
  const paths: Record<string, string> = {
    [WITHIN_REACH_JOURNEY.id]: "/journey/within-reach",
    [DRAWING_SAHARA_JOURNEY.id]: "/journey/drawing-the-sahara",
    [SILK_ROAD_INTERSECTIONS_JOURNEY.id]: "/journey/where-the-silk-roads-met",
    [VACCINE_EXPEDITION_JOURNEY.id]:
      "/journey/the-vaccine-that-crossed-the-world",
    [REGGAETON_JOURNEY.id]: "/journey/the-sound-of-somewhere-reggaeton",
    [FAR_FROM_EVERYTHING_JOURNEY.id]: "/journey/far-from-everything",
    [ACROSS_DIVIDE_JOURNEY.id]: "/journey/across-the-divide",
    [MISSING_BORDERS_JOURNEY.id]: "/journey/missing-borders",
    [SHARED_NAMES_JOURNEY.id]: "/journey/same-name-different-place",
    [SAME_HOUR_JOURNEY.id]: "/journey/same-hour-different-worlds",
    [DANUBE_JOURNEY.id]: "/journey/down-the-danube",
    [SUN_FLAGS_JOURNEY.id]: "/journey/chasing-the-sun",
    [CANADA_JOURNEY.id]: "/journey/beyond-the-maple-leaf",
    [ANDES_JOURNEY.id]: "/journey/along-the-andes",
    [LATITUDE_JOURNEY.id]: "/journey/latitude-surprises",
    [NORTH_AMERICA_JOURNEY.id]: "/journey/north-america",
    [FIFTEENTH_JOURNEY.id]: "/journey/try-not-to-click-russia",
    [FOURTEENTH_JOURNEY.id]: "/journey/island-instincts",
    [TWELFTH_JOURNEY.id]: "/journey/exceptions-to-the-rule",
    [ELEVENTH_JOURNEY.id]: "/journey/not-the-obvious-city",
    [TENTH_JOURNEY.id]: "/journey/ring-of-fire",
    [NINTH_JOURNEY.id]: "/journey/shared-neighbors",
    [FOURTH_JOURNEY.id]: "/journey/mediterranean",
  };
  return paths[id] ?? "/";
}
