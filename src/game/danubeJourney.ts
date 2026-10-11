import { defineQuestion, definePresentation } from "./questionBuilder";
import type { FactSource, Journey } from "./questions";
import { CAPITALS, capitalSource } from "./quizData";
import { mapSource } from "./countryFacts";
import type { PhysicalFeature, PlaceFeature } from "../geography/types";
import mapContext from "./data/danube-context.v1.json";

const segments = mapContext.segments as Record<string, PhysicalFeature[]>;
const stages = ["upper", "vienna", "budapest", "gorge", "lower", "delta"];
const route = (through: string) =>
  stages
    .slice(0, stages.indexOf(through) + 1)
    .flatMap((stage) => segments[stage]);
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
  labelFlexible: true,
});

const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-11",
});
const riverSource = source(
  "OpenStreetMap contributors · connected Danube river route",
  "https://www.openstreetmap.org/relation/89652",
);
const vienna = CAPITALS.find((capital) => capital.countryId === "wurl:AUT")!;
const budapest = CAPITALS.find((capital) => capital.countryId === "wurl:HUN")!;
const basinSource = source(
  "ICPDR · the Danube River Basin",
  "https://www.icpdr.org/danube-basin/danube-river-basin",
);
const base = definePresentation({
  label: "River",
  topic: "the Danube",
  instruction: "",
  failure: "feedback",
  disclosure: {
    hoverNames: false,
    namedChoices: true,
    committedNames: false,
    previousVisits: false,
  },
  focus: { lat: 47, lng: 18, altitude: 1.1 },
  map: {
    borders: true,
    hoverFeedback: false,
    muteOthers: true,
    revealOnAnswer: true,
  },
  source: basinSource,
  mapCaption: "Danube · route so far",
});

export const DANUBE_JOURNEY: Journey = {
  id: "down-the-danube-v1",
  title: "Down the Danube",
  description:
    "Follow a river that can vanish underground, divide a city, and squeeze between mountains. Five stops carry us from its upper reaches to the sea.",
  mapAttribution: {
    label: "© OpenStreetMap contributors",
    url: "https://www.openstreetmap.org/copyright",
  },
  completion: {
    focus: { lat: 46.7, lng: 19.2, altitude: 0.5 },
    physicalFeatures: [
      ...route("delta"),
      ...segments.branches,
      ...segments.sea,
    ],
    places: [
      landmark("seepage", "Danube seepage", 47.936, 8.76635),
      { ...vienna, labelFlexible: true },
      { ...budapest, labelFlexible: true },
      landmark("iron-gates", "Iron Gates", 44.65, 22.3),
      landmark("delta", "Danube Delta", 45.15, 29.6),
    ],
    caption:
      "From the upper river to the Black Sea: five stops, one continuous journey.",
  },
  rounds: [
    defineQuestion({
      mode: "choice-single",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",

      ...base,
      id: "danube-underground-detour-v1",
      label: "Detour",
      resolvedLabel: "Danube seepage",
      correctFeedback: "Nice connection.",
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
      feedbackMapCaption: "Danube route so far · local Rhine context",
      feedbackPlaces: [landmark("seepage", "Danube seepage", 47.936, 8.76635)],
      focus: { lat: 48, lng: 9.4, altitude: 0.28 },
      feedbackFocus: { lat: 47.9, lng: 8.7, altitude: 0.14 },
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
    }),
    defineQuestion({
      count: 1,
      selection: { type: "none" },
      commitment: "submit",

      ...base,
      id: "danube-vienna-pin-v1",
      label: "Capital",
      resolvedLabel: "Vienna",
      title: "The first capital downstream.",
      leadIn: "Follow the river east into Austria.",
      prompt: "Drop a pin in Vienna.",
      instruction: "Land within 50 km of the city center.",
      mode: "pin",
      rule: { type: "pin-distance", targetId: vienna.id, radiusKm: 50 },
      disclosure: { ...base.disclosure, namedChoices: false },
      focus: { lat: 48.3, lng: 14.5, altitude: 0.26 },
      feedbackFocus: { lat: vienna.lat, lng: vienna.lng, altitude: 0.16 },
      physicalFeatures: route("upper"),
      feedbackPhysicalFeatures: segments.vienna,
      map: {
        borders: true,
        hoverFeedback: false,
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
    }),
    defineQuestion({
      count: 1,
      selection: { type: "none" },
      commitment: "submit",

      ...base,
      id: "danube-two-banks-city-v1",
      label: "Two banks",
      resolvedLabel: "Budapest",
      title: "A city made across the river.",
      leadIn: "Downstream, Buda and Pest face each other across the river.",
      prompt: "What capital brings the two banks together?",
      mode: "text",
      inputLabel: "Capital city",
      rule: { type: "capital-name", countryId: "wurl:HUN" },
      focus: { lat: 47.4, lng: 18, altitude: 0.26 },
      physicalFeatures: route("vienna"),
      feedbackPlaces: [
        {
          ...budapest,
          visualState: "answer",
          labelFlexible: true,
          priority: 1000,
        },
      ],
      feedbackPhysicalFeatures: segments.budapest,
      feedbackFocus: { lat: budapest.lat, lng: budapest.lng, altitude: 0.16 },
      feedbackDiagram: {
        type: "river-banks",
        river: "Danube",
        westBank: "Buda",
        eastBank: "Pest",
      },
      map: { ...base.map!, feedbackRegions: "neutral" },
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
    }),
    defineQuestion({
      selection: { type: "none" },
      commitment: "submit",

      ...base,
      id: "danube-iron-gates-border-v1",
      label: "Gorge",
      resolvedLabel: "Iron Gates",
      correctFeedback: "Exactly right.",
      title: "A river between two countries.",
      leadIn: "Travel southeast into the Iron Gates gorge.",
      prompt: "Which two countries border this stretch of the Danube?",
      instruction: "Choose both countries.",
      mode: "choice-multiple",
      count: 2,
      choices: [
        { id: "wurl:HUN", label: "Hungary" },
        { id: "wurl:SRB", label: "Serbia" },
        { id: "wurl:BGR", label: "Bulgaria" },
        { id: "wurl:ROU", label: "Romania" },
        { id: "wurl:CRO", label: "Croatia" },
        { id: "wurl:SVK", label: "Slovakia" },
      ],
      physicalFeatures: route("gorge"),
      rule: { type: "country-ids", ids: ["wurl:SRB", "wurl:ROU"] },
      focus: { lat: 44.9, lng: 21.1, altitude: 0.23 },
      feedbackFocus: { lat: 44.8, lng: 22, altitude: 0.18 },
      feedbackPlaces: [landmark("iron-gates", "Iron Gates", 44.65, 22.3)],
      explanation:
        "Dams at the gorge generate power, but block an ancient upstream route for sturgeon. The river is a border for people and a corridor for fish.",
      source: source(
        "ICPDR · restoring fish migration at the Iron Gates",
        "https://www.icpdr.org/tasks-topics/tasks/river-basin-management/sturgeon-conservation/we-pass-facilitating-fish-migration",
      ),
      sources: [mapSource, riverSource],
    }),
    defineQuestion({
      mode: "choice-single",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",

      ...base,
      id: "danube-delta-sea-v1",
      label: "Delta",
      resolvedLabel: "Danube Delta",
      correctFeedback: "Exactly right.",
      title: "One river becomes many channels.",
      leadIn: "Follow the lower river toward its delta.",
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
      focus: { lat: 45, lng: 26.1, altitude: 0.24 },
      physicalFeatures: route("lower"),
      feedbackPhysicalFeatures: [
        ...segments.delta,
        ...segments.branches,
        ...segments.sea,
      ],
      feedbackMapCaption: "Danube · full route to the sea",
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
      feedbackFocus: { lat: 44.9, lng: 30.3, altitude: 0.22 },
      explanation:
        "Three main branches spread into a maze of channels, lakes, and wetlands. Our above-ground route ends here; the opening detour eventually reaches the North Sea instead.",
      sources: [riverSource],
    }),
  ],
};
