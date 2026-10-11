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
export const JOURNEYS = [
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
];
export function journeyPath(id: string) {
  const paths: Record<string, string> = {
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
