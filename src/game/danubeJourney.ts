import type { FactSource, Journey, Question } from "./questions";
import { CAPITALS, capitalSource } from "./quizData";
import { mapSource } from "./countryFacts";
import type { PhysicalFeature, PlaceFeature } from "../geography/types";
import mapContext from "./data/danube-context.v1.json";

const segments = mapContext.segments as Record<string, PhysicalFeature[]>;
const landmark = (
  id: string,
  name: string,
  lat: number,
  lng: number,
): PlaceFeature => ({
  id: `danube:${id}`,
  name,
  lat,
  lng,
  kind: "other",
  sourceId: "danube:reviewed-context",
});

const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-11",
});
const riverSource = source(
  "Natural Earth · river centerlines",
  "https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/",
);
const vienna = CAPITALS.find((capital) => capital.countryId === "wurl:AUT")!;
const budapest = CAPITALS.find((capital) => capital.countryId === "wurl:HUN")!;
const basinSource = source(
  "ICPDR · the Danube River Basin",
  "https://www.icpdr.org/danube-basin/danube-river-basin",
);
const base: Question = {
  id: "",
  title: "",
  label: "River",
  topic: "the Danube",
  prompt: "",
  instruction: "",
  explanation: "",
  mode: "choice-single",
  rule: { type: "choice-ids", ids: [] },
  count: 1,
  selection: { type: "none" },
  commitment: "submit",
  failure: "feedback",
  disclosure: {
    hoverNames: false,
    namedChoices: true,
    committedNames: false,
    previousVisits: false,
  },
  focus: { lat: 47, lng: 18, altitude: 1.1 },
  map: { borders: true, hover: false, muteOthers: true, revealOnAnswer: true },
  source: basinSource,
};

export const DANUBE_JOURNEY: Journey = {
  id: "down-the-danube-v1",
  title: "Down the Danube",
  description:
    "Follow a river that can vanish underground, divide a city, and squeeze between mountains. Five stops carry us from its upper reaches to the sea.",
  rounds: [
    {
      ...base,
      id: "danube-underground-detour-v1",
      label: "Detour",
      title: "The river takes a shortcut.",
      leadIn:
        "In southern Germany, some Danube water disappears underground and resurfaces at a spring.",
      prompt: "Which other river system does that water join?",
      rule: { type: "choice-ids", ids: ["river:rhine"] },
      choices: [
        { id: "river:elbe", label: "Elbe" },
        { id: "river:rhone", label: "Rhône" },
        { id: "river:rhine", label: "Rhine" },
        { id: "river:oder", label: "Oder" },
      ],
      contextIds: ["wurl:DEU"],
      feedbackContextIds: [],
      physicalFeatures: segments.upper,
      feedbackPhysicalFeatures: segments.rhine,
      feedbackPlaces: [landmark("seepage", "Danube seepage", 47.936, 8.76635)],
      focus: { lat: 48, lng: 9, altitude: 1 },
      feedbackFocus: { lat: 47.9, lng: 8.7, altitude: 0.23 },
      explanation:
        "Limestone caves carry it to the Aach spring, then toward Lake Constance and a different drainage basin. We stay with the Danube above ground.",
      source: source(
        "UNESCO Global Geopark Swabian Alb · Danube seepage",
        "https://www.geopark-alb.de/en/experience-geopark/journey-into-earths-history/detail/the-danube-seepage",
      ),
      sources: [
        riverSource,
        source(
          "Town of Aach · the spring’s drainage",
          "https://www.aach.de/de/Unsere-Stadt/Aachquelle",
        ),
      ],
    },
    {
      ...base,
      id: "danube-vienna-pin-v1",
      label: "Drop a pin",
      title: "The first capital downstream.",
      leadIn: "Follow the river east into Austria.",
      prompt: "Drop a pin in Vienna.",
      instruction: "Land within 80 km of the city center.",
      mode: "pin",
      rule: { type: "pin-distance", targetId: vienna.id, radiusKm: 80 },
      disclosure: { ...base.disclosure, namedChoices: false },
      focus: { lat: 48, lng: 13, altitude: 1.2 },
      feedbackFocus: { lat: vienna.lat, lng: vienna.lng, altitude: 0.65 },
      feedbackPhysicalFeatures: segments.vienna,
      map: {
        borders: true,
        hover: false,
        muteOthers: true,
        revealOnAnswer: true,
      },
      explanation:
        "The river runs through the eastern side of the city. Continue downstream: this is only the first capital on our route.",
      source: source(
        "City of Vienna · Danube Island",
        "https://www.wien.gv.at/en/environment/danube-island",
      ),
      sources: [capitalSource, riverSource],
    },
    {
      ...base,
      id: "danube-two-banks-city-v1",
      label: "Two banks",
      title: "A city made across the river.",
      leadIn: "Downstream, Buda and Pest face each other across the river.",
      prompt: "What capital brings the two banks together?",
      mode: "text",
      inputLabel: "Capital city",
      rule: { type: "capital-name", countryId: "wurl:HUN" },
      focus: { lat: 47, lng: 19, altitude: 1.1 },
      feedbackPlaces: [
        // Labels sit within the two districts, staggered for narrow screens.
        {
          ...landmark("buda", "Buda", 47.535, 19),
          markerHidden: true,
          priority: 1000,
        },
        {
          ...landmark("pest", "Pest", 47.46, 19.14),
          markerHidden: true,
          priority: 1000,
        },
      ],
      feedbackPhysicalFeatures: segments.budapest.map((feature) => ({
        ...feature,
        // The question establishes the river; leave label space to its banks.
        labelAnchors: [],
      })),
      feedbackFocus: { lat: budapest.lat, lng: 19.053, altitude: 0.012 },
      explanation:
        "The river separates Buda on the west bank from Pest on the east. Their 1873 union also included Óbuda: the familiar name leaves one founding town out.",
      source: source(
        "Óbuda municipality · the 1873 city union",
        "https://obuda.hu/pest-buda-es-obuda-egyesitesenek-150-evfordulojat-unnepeljuk-november-17-budapest-napja/",
      ),
      sources: [
        capitalSource,
        riverSource,
        source(
          "Budapest’s official tourism guide · the two banks",
          "https://www.budapestinfo.hu/en/top-sights",
        ),
      ],
    },
    {
      ...base,
      id: "danube-iron-gates-border-v1",
      label: "Gorge",
      title: "A river between two countries.",
      leadIn: "Travel southeast into the Iron Gates gorge.",
      prompt: "Which two countries border this stretch of the Danube?",
      instruction:
        "Tap both countries on the globe. The blue line marks the gorge.",
      mode: "map-multiple",
      count: 2,
      selection: { type: "members" },
      map: {
        borders: true,
        hover: true,
        muteOthers: true,
        candidates: "neutral",
        revealOnAnswer: true,
      },
      physicalFeatures: segments.gorge,
      rule: { type: "country-ids", ids: ["wurl:SRB", "wurl:ROU"] },
      disclosure: {
        ...base.disclosure,
        namedChoices: false,
        committedNames: true,
      },
      focus: { lat: 44.6, lng: 22, altitude: 0.55 },
      explanation:
        "Dams at the gorge generate power, but block an ancient upstream route for sturgeon. The river is a border for people and a corridor for fish.",
      source: source(
        "ICPDR · restoring fish migration at the Iron Gates",
        "https://www.icpdr.org/tasks-topics/tasks/river-basin-management/sturgeon-conservation/we-pass-facilitating-fish-migration",
      ),
      sources: [mapSource, riverSource],
    },
    {
      ...base,
      id: "danube-delta-sea-v1",
      label: "Delta",
      title: "One river becomes many channels.",
      leadIn: "Finish where the river fans into a delta.",
      prompt: "Which sea does the Danube flow into?",
      rule: { type: "choice-ids", ids: ["sea:black"] },
      choices: [
        { id: "sea:adriatic", label: "Adriatic Sea" },
        { id: "sea:baltic", label: "Baltic Sea" },
        { id: "sea:black", label: "Black Sea" },
        { id: "sea:caspian", label: "Caspian Sea" },
        { id: "sea:aegean", label: "Aegean Sea" },
        { id: "sea:north", label: "North Sea" },
      ],
      focus: { lat: 43, lng: 22, altitude: 1.8 },
      feedbackPhysicalFeatures: [...segments.delta, ...segments.sea],
      feedbackPlaces: [
        {
          id: "danube:delta",
          name: "Danube Delta",
          kind: "other",
          lat: 45.2,
          lng: 29.5,
          sourceId: "icpdr:river-basin",
        },
      ],
      feedbackFocus: { lat: 44, lng: 32, altitude: 0.65 },
      explanation:
        "Three main branches spread into a maze of channels, lakes, and wetlands. Our above-ground route ends here; the opening detour eventually reaches the North Sea instead.",
      sources: [riverSource],
    },
  ],
};
