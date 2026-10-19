import { referenceCity, referenceLabel } from "./helpReferences";
import { defineQuestion, definePresentation } from "./questionBuilder";
import type { FactSource, Journey } from "./questionContracts";
import { CAPITALS, capitalSource } from "./quizData";
import { mapSource } from "./countryFacts";
import type { PhysicalFeature, PlaceFeature } from "../geography/types";
import mapContext from "./data/danube-context.v1.json";
import gorgeRelief from "./data/iron-gates-relief.v1.json";

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
  addedAt: "2026-10-11",
  availability: "pool",
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
      { ...landmark("delta", "Danube Delta", 45.15, 29.6), markerHidden: true },
    ],
    caption:
      "A hidden diversion, two capitals, a mountain gorge, and a delta: the Danube reaches the Black Sea through landscapes that divide people, connect cities, and carry life downstream.",
  },
  rounds: [
    defineQuestion({
      mode: "choice-single",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",

      ...base,
      id: "danube-underground-detour-v1",
      guidance: {
        hint: "The diverted water heads toward Lake Constance instead of continuing east with the Danube.",
        assist: {
          text: "Lake Constance is now labeled. The Rhine and Rhône remain; which system receives that lake’s outflow?",
          candidateIds: ["river:rhine", "river:rhone"],
          places: [referenceLabel("Lake Constance", 47.65, 9.3)],
          focus: { lat: 47.5, lng: 9, altitude: 0.7 },
        },
      },
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
      feedbackMapCaption: "Danube route so far · local Rhine context",
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
      scenes: {
        play: {
          contextIds: ["wurl:DEU"],
          physicalFeatures: segments.upper,
          focus: { lat: 48, lng: 9.4, altitude: 0.28 },
        },
        reveal: {
          answerIds: [],
          physicalFeatures: segments.rhine,
          places: [landmark("seepage", "Danube seepage", 47.936, 8.76635)],
          focus: { lat: 47.9, lng: 8.7, altitude: 0.14 },
        },
      },
    }),
    defineQuestion({
      count: 1,
      selection: { type: "none" },
      commitment: "submit",

      ...base,
      id: "danube-vienna-pin-v1",
      guidance: {
        hint: "Look in eastern Austria, downstream from Linz and south of Brno.",
        assist: {
          text: "Linz and Brno are now marked. Follow the Danube east of Linz and look south of Brno.",
          places: [referenceCity("Linz"), referenceCity("Brno")],
          focus: { lat: 48.3, lng: 15.6, altitude: 0.65 },
        },
      },
      label: "Capital",
      resolvedLabel: "Vienna",
      title: "The first capital downstream.",
      leadIn: "Follow the river east into Austria.",
      prompt: "Drop a pin in Vienna.",
      instruction:
        "Within 50 km counts. Aim for the 15 km bullseye; 30 km and 50 km also count.",
      mode: "pin",
      rule: {
        type: "pin-distance",
        targetId: vienna.id,
        radiusKm: 50,
        tiers: [
          { radiusKm: 15, feedback: "Bullseye!" },
          { radiusKm: 30, feedback: "Very close." },
          { radiusKm: 50, feedback: "In range." },
        ],
      },
      disclosure: { ...base.disclosure, namedChoices: false },
      explanation:
        "The river runs through the eastern side of the city. Continue downstream: this is only the first capital on our route.",
      source: source(
        "City of Vienna · Danube Island",
        "https://www.wien.gv.at/en/environment/danube-island",
      ),
      sources: [capitalSource, riverSource],
      scenes: {
        play: {
          focus: { lat: 48.3, lng: 14.5, altitude: 0.26 },
          contextIds: ["wurl:AUT"],
          physicalFeatures: route("upper"),
          map: {
            borders: true,
            hoverFeedback: false,
            muteOthers: true,
            revealOnAnswer: true,
          },
        },
        reveal: {
          focus: { lat: vienna.lat, lng: vienna.lng, altitude: 0.16 },
          physicalFeatures: segments.vienna,
        },
      },
    }),
    defineQuestion({
      count: 1,
      selection: { type: "none" },
      commitment: "submit",

      ...base,
      id: "danube-two-banks-city-v1",
      guidance: {
        hint: "Look downstream of Austria and Slovakia, where the river runs through Hungary.",
        assist: {
          text: "Hungary is now highlighted and Bratislava marked upstream. Continue southeast along the Danube; combine the two bank names in the clue.",
          regionIds: ["wurl:HUN"],
          places: [referenceCity("Bratislava")],
          focus: { lat: 47.7, lng: 18, altitude: 0.65 },
        },
      },
      label: "Two banks",
      resolvedLabel: "Budapest",
      title: "A city made across the river.",
      leadIn: "Downstream, Buda and Pest face each other across the river.",
      prompt: "What capital brings the two banks together?",
      mode: "text",
      inputLabel: "Capital city",
      rule: { type: "capital-name", countryId: "wurl:HUN" },
      feedbackDiagram: {
        type: "river-banks",
        river: "Danube",
        westBank: "Buda",
        eastBank: "Pest",
      },
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
      scenes: {
        play: {
          focus: { lat: 47.4, lng: 18, altitude: 0.26 },
          physicalFeatures: route("vienna"),
          map: { ...base.map!, feedbackRegions: "neutral" },
        },
        reveal: {
          places: [
            {
              ...budapest,
              visualState: "answer",
              labelFlexible: true,
              priority: 1000,
            },
          ],
          physicalFeatures: segments.budapest,
          focus: { lat: budapest.lat, lng: budapest.lng, altitude: 0.16 },
        },
      },
    }),
    defineQuestion({
      selection: { type: "none" },
      commitment: "submit",

      ...base,
      id: "danube-iron-gates-border-v1",
      guidance: {
        hint: "This gorge is downstream of Hungary, where the Danube cuts between mountain ranges.",
        assist: {
          text: "Mountain relief is now shown around the marked gorge. Serbia, Romania, Bulgaria, and Hungary remain; choose two.",
          candidateIds: ["wurl:SRB", "wurl:ROU", "wurl:BGR", "wurl:HUN"],
          physicalFeatures: [
            {
              id: "danube:iron-gates-terrain",
              name: "",
              kind: "mountain",
              lat: 44.8,
              lng: 22.3,
              rank: 2,
              labelAnchors: [],
              relief: gorgeRelief,
            },
          ],
          focus: { lat: 44.8, lng: 22, altitude: 0.65 },
        },
      },
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
        // Retain the choice ID so saved answers still resolve; map its canonical geography.
        { id: "wurl:CRO", label: "Croatia", geographyIds: ["wurl:HRV"] },
        { id: "wurl:SVK", label: "Slovakia" },
      ],
      rule: { type: "country-ids", ids: ["wurl:SRB", "wurl:ROU"] },
      explanation:
        "Dams at the gorge generate power, but block an ancient upstream route for sturgeon. The river is a border for people and a corridor for fish.",
      source: source(
        "ICPDR · restoring fish migration at the Iron Gates",
        "https://www.icpdr.org/tasks-topics/tasks/river-basin-management/sturgeon-conservation/we-pass-facilitating-fish-migration",
      ),
      sources: [
        mapSource,
        riverSource,
        source(
          "Mapzen Terrain Tiles · elevation-derived relief",
          "https://registry.opendata.aws/terrain-tiles/",
        ),
      ],
      scenes: {
        play: {
          map: { selectionFeedback: "after-submit", candidateRole: "clue" },
          candidateRegionIds: [
            "wurl:HUN",
            "wurl:SRB",
            "wurl:BGR",
            "wurl:ROU",
            "wurl:HRV",
            "wurl:SVK",
          ],
          places: [landmark("iron-gates", "Iron Gates", 44.65, 22.3)],
          physicalFeatures: route("gorge"),
          focus: { lat: 44.9, lng: 21.1, altitude: 0.23 },
        },
        reveal: {
          focus: { lat: 44.8, lng: 22, altitude: 0.18 },
          places: [landmark("iron-gates", "Iron Gates", 44.65, 22.3)],
        },
      },
    }),
    defineQuestion({
      mode: "choice-single",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",

      ...base,
      id: "danube-delta-sea-v1",
      guidance: {
        hint: "Follow the river east across the lower Balkans, toward the coast beyond Romania.",
        assist: {
          text: "The Black, Aegean, and Caspian seas remain. Use the river’s eastward progress to identify its outlet; sea names stay hidden on the map.",
          candidateIds: ["sea:black", "sea:aegean", "sea:caspian"],
          focus: { lat: 42, lng: 35, altitude: 1.35 },
        },
      },
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
      feedbackMapCaption: "Danube · full route to the sea",
      explanation:
        "Three main branches spread into a maze of channels, lakes, and wetlands. Our above-ground route ends here; the opening detour eventually reaches the North Sea instead.",
      sources: [riverSource],
      scenes: {
        play: {
          focus: { lat: 45, lng: 26.1, altitude: 0.24 },
          physicalFeatures: route("lower"),
        },
        reveal: {
          physicalFeatures: [
            ...segments.delta,
            ...segments.branches,
            ...segments.sea,
          ],
          places: [
            {
              id: "danube:delta",
              markerHidden: true,
              displayRole: "explanation",
              name: "Danube Delta",
              kind: "other",
              lat: 45.2,
              lng: 29.5,
              sourceId: "icpdr:river-basin",
            },
          ],
          focus: { lat: 44.9, lng: 30.3, altitude: 0.22 },
        },
      },
    }),
  ],
};
