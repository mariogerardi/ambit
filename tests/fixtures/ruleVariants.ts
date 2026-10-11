// Engine coverage fixtures only; these are not authored or playable library questions.
import { SECOND_JOURNEY } from "./engine/secondJourney";
import { CAPITALS } from "../../src/game/quizData";
import type { Question } from "../../src/game/questions";
const amman = CAPITALS.find((c) => c.name === "Amman")!;
export const SECOND_VARIANTS: Question[] = [
  {
    ...SECOND_JOURNEY.rounds[1],
    id: "fixture:language-single",
    mode: "choice-single",
    count: 1,
    rule: { type: "official-languages", countryId: "wurl:CAN", match: "any" },
  },
  {
    ...SECOND_JOURNEY.rounds[2],
    id: "fixture:river-subset",
    count: 4,
    rule: { type: "physical-feature", featureId: "danube", match: "any" },
    selection: {
      type: "ids",
      ids: CAPITALS.filter((c) => c.continent === "EU").map((c) => c.countryId),
    },
  },
  {
    ...SECOND_JOURNEY.rounds[2],
    id: "fixture:mountain-all",
    count: 7,
    rule: { type: "physical-feature", featureId: "andes", match: "all" },
  },
  {
    ...SECOND_JOURNEY.rounds[3],
    id: "fixture:longitude",
    rule: {
      type: "capital-coordinate",
      referenceId: amman.id,
      direction: "east",
      continent: "EU",
    },
  },
  {
    ...SECOND_JOURNEY.rounds[4],
    id: "fixture:country-circle",
    rule: {
      type: "country-circle",
      circle: { center: { lat: 36.8065, lng: 10.1815 }, radiusKm: 1500 },
    },
  },
];
