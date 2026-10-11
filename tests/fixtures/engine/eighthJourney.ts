import type { Journey, Question } from "../../../src/game/questions";
import { ANSWER_PLACES } from "../../../src/game/answerTargets";
import { US_STATES } from "../../../src/geography/usStates";
import { CAPITALS } from "../../../src/game/quizData";

const europe = [
  "place:2988507",
  "place:2950159",
  "place:2761369",
  "place:2267057",
  "place:3117735",
  "place:264371",
];
const australianCities = [
  "place:2147714",
  "place:2158177",
  "place:2174003",
  "place:2063523",
  "place:2078025",
  "place:2193733",
];
const base: Question = {
  id: "",
  title: "",
  label: "",
  topic: "locations",
  prompt: "",
  instruction: "",
  mode: "pin",
  rule: { type: "pin-inside", ids: [] },
  count: 1,
  selection: { type: "none" },
  commitment: "submit",
  failure: "feedback",
  disclosure: {
    hoverNames: false,
    namedChoices: false,
    committedNames: false,
    previousVisits: false,
  },
  focus: { lat: 20, lng: 0, altitude: 1.6 },
  map: { borders: false, hover: false, muteOthers: true, revealOnAnswer: true },
  explanation: "",
  source: {
    name: "Pinned local geography and GeoNames coordinates",
    url: "https://www.geonames.org/",
    reviewedOn: "2026-10-06",
  },
};
export const EIGHTH_JOURNEY: Journey = {
  id: "pins-and-cities-v1",
  title: "Pins and cities",
  description:
    "A city becomes more than a name once you can place it on the globe.",
  rounds: [
    {
      ...base,
      id: "pin-lima",
      progressLabel: "Lima",
      title: "A Pacific capital.",
      label: "Drop a pin",
      prompt: "Drop a pin within 150 km of Lima, Peru.",
      instruction: "",
      rule: { type: "pin-distance", targetId: "place:3936456", radiusKm: 150 },
      focus: { lat: -17, lng: -65, altitude: 1.15 },
      explanation: "Lima lies on Peru’s Pacific coast.",
    },
    {
      ...base,
      id: "city-paris",
      progressLabel: "Paris",
      title: "A city on the Seine.",
      label: "City",
      mode: "city-single",
      rule: { type: "place-ids", ids: ["place:2988507"] },
      selection: { type: "ids", ids: europe },
      commitment: "immediate",
      prompt: "Which of the six marked European capitals is Paris?",
      instruction: "",
      map: { borders: true, hover: false, muteOthers: true },
      focus: { lat: 47, lng: 8, altitude: 0.52 },
      explanation: "Paris sits on the Seine in northern France.",
    },
    {
      ...base,
      id: "pin-new-mexico",
      progressLabel: "New Mexico",
      title: "Inside the state.",
      label: "Drop a pin",
      prompt: "Place a pin anywhere inside New Mexico, USA.",
      instruction: "",
      rule: { type: "pin-inside", ids: ["wurl:USA-NM"] },
      importedRegions: US_STATES.filter((r) => r.id === "wurl:USA-NM"),
      focus: { lat: 39, lng: -102, altitude: 0.8 },
      explanation:
        "New Mexico is east of Arizona and west of Texas, directly north of Mexico.",
    },
    {
      ...base,
      id: "cities-north-of-rome",
      progressLabel: "North of Rome",
      title: "North of Rome.",
      label: "Cities",
      mode: "city-multiple",
      count: 3,
      rule: {
        type: "place-ids",
        ids: europe.filter(
          (id) =>
            ANSWER_PLACES.get(id)!.lat >
            CAPITALS.find((p) => p.countryId === "wurl:ITA")!.lat,
        ),
      },
      selection: { type: "ids", ids: europe },
      prompt: "Select the three marked capitals farther north than Rome.",
      instruction: "The line marks Rome’s latitude.",
      focus: { lat: 47, lng: 8, altitude: 0.52 },
      map: { borders: true, hover: false, muteOthers: true },
      disclosure: { ...base.disclosure, committedNames: true },
      overlays: [
        {
          id: "rome-latitude",
          type: "parallel",
          latitude: CAPITALS.find((p) => p.countryId === "wurl:ITA")!.lat,
        },
      ],
      explanation:
        "Paris, Berlin and Vienna lie north of Rome; Madrid, Lisbon and Athens lie south.",
    },
    {
      ...base,
      id: "city-sydney",
      progressLabel: "Sydney",
      title: "A harbor city.",
      label: "City",
      mode: "city-single",
      rule: { type: "place-ids", ids: ["place:2147714"] },
      selection: { type: "ids", ids: australianCities },
      commitment: "immediate",
      prompt:
        "Which of the six marked cities in Australia and New Zealand is Sydney?",
      instruction: "",
      focus: { lat: -33, lng: 145, altitude: 0.85 },
      map: { borders: true, hover: false, muteOthers: true },
      explanation:
        "Sydney is on Australia’s southeastern coast, northeast of Melbourne.",
    },
  ],
};
