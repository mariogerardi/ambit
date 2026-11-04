import { cityReference } from "./authoredPlaces";
import { defineQuestion, definePresentation } from "./questionBuilder";
import type { Journey, FactSource } from "./questionContracts";
import { ANSWER_PLACES } from "./answerTargets";
import { capitalSource } from "./quizData";
import type { PlaceFeature } from "../geography/types";

const place = (id: string) => ANSWER_PLACES.get(id)!;
const source = (
  name: string,
  url: string,
  reviewedOn = "2026-10-11",
): FactSource => ({
  name,
  url,
  reviewedOn,
});
export const BRAZIL_CITY_TARGETS = [
  "3469058",
  "3451190",
  "3448439",
  "3450554",
  "3470127",
  "3663517",
].map((id) => `place:${id}`);
export const SOUTH_AFRICA_CITY_TARGETS = [
  "964137",
  "3369157",
  "1018725",
  "993800",
  "1007311",
].map((id) => `place:${id}`);
export const SOUTH_AFRICA_CAPITAL_TARGETS = SOUTH_AFRICA_CITY_TARGETS.slice(
  0,
  3,
);
// These are references, not answer targets: capitals must look like other cities.
const referenceCity = (id: string) => cityReference(place(id));
export const TURKEY_ASSIST_CITIES = ["323786", "306571", "308464"].map((id) =>
  referenceCity(`place:${id}`),
);
const base = definePresentation({
  label: "Capital",
  topic: "capital geography",
  instruction: "",
  failure: "feedback",
  disclosure: {
    hoverNames: false,
    namedChoices: false,
    committedNames: false,
    previousVisits: false,
  },
  focus: { lat: 20, lng: 0, altitude: 1.3 },
  map: {
    borders: true,
    hoverFeedback: false,
    muteOthers: true,
    feedbackRegions: "neutral",
  },
  feedbackContextIds: [],
  source: capitalSource,
});

export const ELEVENTH_JOURNEY: Journey = {
  id: "not-the-obvious-city-v1",
  addedAt: "2026-10-10",
  saveRevision: 2,
  title: "Not the Obvious City",
  description:
    "Why do capitals end up where they do? Explore independence, compromise, relocation and shared government through five capital choices.",
  rounds: [
    defineQuestion({
      count: 1,
      selection: { type: "none" },
      commitment: "submit",

      ...base,
      id: "unexpected-turkey-capital",
      leadIn:
        "Istanbul’s imperial landmarks make it an easy guess, but Türkiye’s modern government is based inland.",
      progressLabel: "Türkiye",
      resolvedLabel: "Ankara",
      label: "Famous city",
      title: "The famous distraction.",
      prompt: "What is Türkiye’s capital?",
      guidance: {
        hint: "Look inland to the Anatolian plateau. This city became the capital as the republic was founded in 1923.",
        assist: {
          text: "Ankara, Konya and Kayseri are now marked as three inland possibilities. Type the city that is the national capital.",
        },
      },
      instruction: "",
      inputLabel: "Capital city",
      mode: "text",
      rule: { type: "capital-name", countryId: "wurl:TUR" },
      explanation:
        "Türkiye’s national assembly met in Ankara during the independence struggle. The city became the capital in October 1923, linking the new republic to its inland political centre. Istanbul retained its imperial landmarks and commercial importance.",
      source: source(
        "Türkiye Ministry of Culture and Tourism · first National Assembly",
        "https://www.ktb.gov.tr/EN-103958/ankara---independence-war-museum-1stturkish-grand-national-assembly-building.html",
        "2026-11-03",
      ),
      sources: [capitalSource],
      scenes: {
        play: {
          focus: { lat: 39, lng: 34, altitude: 0.82 },
          contextIds: ["wurl:TUR"],
        },
        assist: { places: TURKEY_ASSIST_CITIES },
        reveal: {
          focus: { lat: 40.4, lng: 31, altitude: 0.38 },
          contextIds: ["wurl:TUR"],
          places: [
            {
              ...place("place:323786"),
              name: "Ankara",
              visualState: "answer",
              priority: 100,
            },
            {
              ...place("place:745044"),
              name: "Istanbul",
              visualState: "hinted",
              priority: 90,
            },
          ],
        },
      },
    }),
    defineQuestion({
      count: 1,
      selection: { type: "none" },
      commitment: "submit",

      ...base,
      id: "unexpected-canberra-pin",
      progressLabel: "Australia",
      resolvedLabel: "Canberra",
      title: "Find Canberra.",
      label: "Planned capital",
      leadIn:
        "Sydney and Melbourne competed to host Australia’s federal capital. A new inland city was chosen between them.",
      prompt: "Place a pin in Canberra.",
      guidance: {
        hint: "The capital is inland in southeastern Australia, between Sydney and Melbourne.",
        assist: {
          text: "Sydney and Melbourne are marked. Look inland between them.",
        },
      },
      instruction: "",
      mode: "pin",
      rule: {
        type: "pin-distance",
        targetId: "place:2172517",
        radiusKm: 200,
        tiers: [
          { radiusKm: 100, feedback: "Bullseye!" },
          { radiusKm: 150, feedback: "Very close." },
          { radiusKm: 200, feedback: "In range." },
        ],
      },
      sources: [
        source(
          "National Capital Authority · siting and naming Canberra",
          "https://www.nca.gov.au/education/canberras-history/siting-and-naming-canberra",
          "2026-11-03",
        ),
      ],
      explanation:
        "Canberra was planned as a new federal capital in New South Wales. The Constitution required a site at least 100 miles from Sydney, while Parliament met in Melbourne until its new home was ready. The compromise created a distinct seat of government between the rival cities.",
      scenes: {
        play: {
          focus: { lat: -34, lng: 147, altitude: 0.55 },
          contextIds: ["wurl:AUS"],
          map: {
            borders: false,
            borderIds: ["wurl:AUS"],
            hoverFeedback: false,
            muteOthers: true,
            feedbackRegions: "neutral",
          },
        },
        assist: {
          places: [
            { ...place("place:2147714"), visualState: "hinted", priority: 95 },
            { ...place("place:2158177"), visualState: "hinted", priority: 95 },
          ],
        },
        reveal: {
          contextIds: ["wurl:AUS"],
          focus: { lat: -35.3, lng: 148.5, altitude: 0.4 },
          places: [
            {
              ...place("place:2172517"),
              name: "Canberra",
              priority: 100,
            },
            {
              ...place("place:2147714"),
              name: "Sydney",
              visualState: "hinted",
              priority: 90,
            },
            {
              ...place("place:2158177"),
              name: "Melbourne",
              visualState: "hinted",
              priority: 90,
            },
          ],
        },
      },
    }),
    defineQuestion({
      ...base,
      mode: "choice-single",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",
      id: "unexpected-abuja",
      shuffleChoices: true,
      progressLabel: "Nigeria",
      resolvedLabel: "Abuja",
      label: "Capital move",
      title: "Why move inland?",
      leadIn: "Nigeria moved its capital from Lagos to Abuja in 1991.",
      prompt: "Which advantage helped make Abuja the choice?",
      choices: [
        {
          id: "abuja:rivalry",
          label: "A midpoint between two competing cities",
        },
        {
          id: "abuja:access",
          label: "A central location with room to develop",
        },
        {
          id: "abuja:infrastructure",
          label: "An established coastal business and transport hub",
        },
        {
          id: "abuja:oil",
          label: "A location beside the Niger Delta’s oil fields",
        },
      ],
      rule: { type: "choice-ids", ids: ["abuja:access"] },
      correctFeedback: "Well done.",
      guidance: {
        hint: "Compare coastal Lagos with inland Abuja. Which location could serve people arriving from across Nigeria?",
        assist: {
          text: "Two explanations remain. Decide whether the move served the whole country or settled a contest between two cities.",
          candidateIds: ["abuja:access", "abuja:rivalry"],
        },
      },
      explanation:
        "Lagos served as both a state capital and the federal capital, putting pressure on limited land and infrastructure. The site-selection panel sought a spacious, central location accessible from across Nigeria. Abuja gave the federal government room to build a new capital inland.",
      source: source(
        "Federal Capital Development Authority · history of Abuja",
        "https://fcda.gov.ng/the-history-of-abuja/",
        "2026-11-03",
      ),
      sources: [
        source(
          "NNPC · production in coastal Nigeria and the Niger Delta",
          "https://www.nnpcgroup.com/nnpc-e-and-p-limited-nepl",
        ),
        source(
          "World Bank · Abuja’s capital relocation",
          "https://documents.worldbank.org/curated/en/929431468063249516/pdf/SFG1989-RP-P103499-Box394881B-PUBLIC-Disclosed-3-28-2016.pdf",
        ),
      ],
      scenes: {
        play: {
          contextIds: ["wurl:NGA"],
          focus: { lat: 7.8, lng: 5.3, altitude: 0.4 },
          places: [
            referenceCity("place:2352778"),
            referenceCity("place:2332459"),
          ],
        },
        reveal: {
          contextIds: ["wurl:NGA"],
          places: [
            { ...referenceCity("place:2352778"), name: "Abuja" },
            { ...referenceCity("place:2332459"), name: "Lagos" },
          ],
        },
      },
    }),
    defineQuestion({
      count: 1,

      ...base,
      id: "unexpected-brasilia-marker",
      progressLabel: "Brazil",
      resolvedLabel: "Brasília",
      title: "Find Brasília.",
      label: "New capital",
      leadIn: "In 1960, Brazil gave its federal government a new home.",
      prompt: "Which marker is Brasília, the capital since 1960?",
      guidance: {
        hint: "Look on the central plateau, south of the Amazon and west of the southeastern coastal cities.",
        assist: {
          text: "Three markers remain. Compare how far inland each sits from Brazil’s southeastern coast.",
          candidateIds: ["place:3469058", "place:3448439", "place:3470127"],
        },
      },
      instruction: "",
      mode: "city-single",
      rule: { type: "place-ids", ids: ["place:3469058"] },
      selection: { type: "ids", ids: BRAZIL_CITY_TARGETS },
      commitment: "submit",
      explanation:
        "Rio de Janeiro had been the capital since 1763. In 1960, the seat of government moved to Brasília, planned on the central plateau. Moving political power inland put a longstanding ambition to develop Brazil’s interior onto the map.",
      source: source(
        "Presidency of Brazil · Law 3,273, capital transfer date",
        "https://www.planalto.gov.br/ccivil_03/leis/l3273.htm",
      ),
      sources: [
        source(
          "Brazilian Senate · the creation of Brasília",
          "https://www.senado.gov.br/noticias/especiais/brasilia50anos/not02.asp",
          "2026-11-03",
        ),
      ],
      scenes: {
        play: {
          contextIds: ["wurl:BRA"],
          focus: { lat: -13, lng: -54, altitude: 1.05 },
        },
        reveal: {
          contextIds: ["wurl:BRA"],
          focus: { lat: -15, lng: -51, altitude: 0.82 },
          places: [
            {
              ...place("place:3469058"),
              name: "Brasília",
              priority: 100,
            },
            {
              ...place("place:3451190"),
              name: "Rio de Janeiro",
              visualState: "hinted",
              priority: 90,
            },
          ],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "unexpected-south-africa-capitals",
      leadIn:
        "Finish in South Africa, where national government has homes in several cities.",
      progressLabel: "South Africa",
      resolvedLabel: "Pretoria, Cape Town & Bloemfontein",
      title: "More than one capital.",
      label: "Shared government",
      prompt: "Select South Africa’s three traditional capital cities.",
      mode: "city-multiple",
      count: 3,
      commitment: "submit",
      selection: { type: "ids", ids: SOUTH_AFRICA_CITY_TARGETS },
      rule: { type: "place-ids", ids: SOUTH_AFRICA_CAPITAL_TARGETS },
      disclosure: {
        ...base.disclosure,
        namedChoices: true,
        hoverNames: true,
        committedNames: true,
      },
      guidance: {
        hint: "One capital is coastal; the other two are inland.",
        assist: {
          text: "Four cities remain. Parliament meets in the city on the southwestern coast; find the other two capitals inland.",
          candidateIds: SOUTH_AFRICA_CITY_TARGETS.filter(
            (id) => id !== "place:1007311",
          ),
        },
      },
      explanation:
        "Pretoria houses the national administration, Cape Town Parliament, and Bloemfontein the Supreme Court of Appeal. Johannesburg hosts the Constitutional Court. South Africa’s traditional three-capital arrangement shares government functions across the country rather than concentrating them in one city.",
      source: source(
        "South African Government · national capitals and Constitutional Court",
        "https://www.gov.za/about-sa/south-africa-glance-1",
        "2026-11-03",
      ),
      sources: [
        source(
          "South African Government · provinces and capital functions",
          "https://www.gov.za/about-sa/south-africas-provinces",
        ),
      ],
      scenes: {
        play: {
          places: SOUTH_AFRICA_CITY_TARGETS.map(referenceCity),
          contextIds: ["wurl:ZAF"],
          focus: { lat: -28.5, lng: 25, altitude: 0.42 },
        },
        reveal: {
          contextIds: ["wurl:ZAF"],
          places: SOUTH_AFRICA_CITY_TARGETS.map(referenceCity),
        },
      },
    }),
  ],
  completion: {
    focus: { lat: -15, lng: 25, altitude: 1.8 },
    regionIds: ["wurl:TUR", "wurl:AUS", "wurl:NGA", "wurl:BRA", "wurl:ZAF"],
    views: [
      { lat: 40.4, lng: 31, altitude: 0.38 },
      { lat: -35.3, lng: 148.5, altitude: 0.45 },
      { lat: 7.8, lng: 5.3, altitude: 0.4 },
      { lat: -19, lng: -45, altitude: 0.5 },
      { lat: -28.5, lng: 25, altitude: 0.42 },
    ],
    physicalFeatures: [],
    places: [
      ...[
        ["323786", "Ankara"],
        ["2172517", "Canberra"],
        ["2352778", "Abuja"],
        ["3469058", "Brasília"],
        ["964137", "Pretoria"],
        ["3369157", "Cape Town"],
        ["1018725", "Bloemfontein"],
      ].map(
        ([id, name]): PlaceFeature => ({
          ...place(`place:${id}`),
          name,
          kind: "capital",
          visualState: "visited",
          priority: 100,
          labelFlexible: true,
        }),
      ),
      ...[
        ["745044", "Istanbul"],
        ["2147714", "Sydney"],
        ["2158177", "Melbourne"],
        ["2332459", "Lagos"],
        ["3451190", "Rio de Janeiro"],
      ].map(([id, name]) => ({
        ...referenceCity(`place:${id}`),
        name,
        priority: 80,
      })),
    ],
    caption:
      "These capitals reflect different political choices: an inland centre for a new republic, a compromise between rivals, room for government to grow, and a move toward the interior. South Africa completes the picture with government functions shared among three traditional capitals.",
  },
};
