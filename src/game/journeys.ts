import { FIFTEENTH_JOURNEY } from "./fifteenthJourney";
import { FOURTEENTH_JOURNEY } from "./fourteenthJourney";
import { THIRTEENTH_JOURNEY } from "./thirteenthJourney";
import { TWELFTH_JOURNEY } from "./twelfthJourney";
import { ELEVENTH_JOURNEY } from "./eleventhJourney";
import { TENTH_JOURNEY } from "./tenthJourney";
import { NINTH_JOURNEY } from "./ninthJourney";
import { EIGHTH_JOURNEY } from "./eighthJourney";
import { JOURNEY } from "./journey";
import { SECOND_JOURNEY } from "./secondJourney";
import { THIRD_JOURNEY } from "./thirdJourney";
import { FOURTH_JOURNEY } from "./fourthJourney";
import { FIFTH_JOURNEY } from "./fifthJourney";
import { SIXTH_JOURNEY } from "./sixthJourney";
import { SEVENTH_JOURNEY } from "./seventhJourney";
export const JOURNEYS = [
  JOURNEY,
  SECOND_JOURNEY,
  THIRD_JOURNEY,
  FOURTH_JOURNEY,
  FIFTH_JOURNEY,
  SIXTH_JOURNEY,
  SEVENTH_JOURNEY,
  EIGHTH_JOURNEY,
  NINTH_JOURNEY,
  TENTH_JOURNEY,
  ELEVENTH_JOURNEY,
  TWELFTH_JOURNEY,
  THIRTEENTH_JOURNEY,
  FOURTEENTH_JOURNEY,
  FIFTEENTH_JOURNEY,
];
export function journeyPath(id: string) {
  if (id === FIFTEENTH_JOURNEY.id) return "/journey/try-not-to-click-russia";
  if (id === FOURTEENTH_JOURNEY.id) return "/journey/island-instincts";
  if (id === THIRTEENTH_JOURNEY.id) return "/journey/the-z-trail";
  if (id === TWELFTH_JOURNEY.id) return "/journey/exceptions-to-the-rule";
  if (id === ELEVENTH_JOURNEY.id) return "/journey/not-the-obvious-city";
  if (id === TENTH_JOURNEY.id) return "/journey/ring-of-fire";
  return id === NINTH_JOURNEY.id
    ? "/journey/shared-neighbors"
    : id === EIGHTH_JOURNEY.id
      ? "/journey/pins-and-cities"
      : id === SEVENTH_JOURNEY.id
        ? "/journey/borrowed-names"
        : id === SIXTH_JOURNEY.id
          ? "/journey/enclosed-territories"
          : id === FIFTH_JOURNEY.id
            ? "/journey/north-america"
            : id === FOURTH_JOURNEY.id
              ? "/journey/mediterranean"
              : id === THIRD_JOURNEY.id
                ? "/journey/silk-roads"
                : id === SECOND_JOURNEY.id
                  ? "/journey/beyond-borders"
                  : "/journey/long-way-home";
}
