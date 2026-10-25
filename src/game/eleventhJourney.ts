import { cityReference } from "./authoredPlaces";
import { defineQuestion, definePresentation } from "./questionBuilder";
import type { Journey, FactSource } from "./questionContracts";
import { ANSWER_PLACES } from "./answerTargets";
import { capitalSource } from "./quizData";
import type { PlaceFeature } from "../geography/types";

const place = (id: string) => ANSWER_PLACES.get(id)!;
const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-11",
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
  title: "Not the Obvious City",
  description:
    "Fame, compromise, relocation and divided government: discover the decisions behind five unexpected capitals.",
  rounds: [
    defineQuestion({
      count: 1,
      selection: { type: "none" },
      commitment: "submit",

      ...base,
      id: "unexpected-turkey-capital",
      leadIn:
        "Begin in Türkiye, where the most familiar city can lead you astray.",
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
        "Ankara became Türkiye’s capital in 1923. Istanbul remained the famous city on the Bosporus, but fame and national government had different addresses.",
      source: source(
        "Türkiye Ministry of Culture and Tourism · 1923 chronology",
        "https://www.ktb.gov.tr/EN-103934/1923.html",
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
        "Cross to Australia, where Sydney and Melbourne competed to host the capital.",
      prompt: "Place a pin in Canberra, the city chosen instead.",
      guidance: {
        hint: "The capital is inland in southeastern Australia, between Sydney and Melbourne.",
        assist: {
          text: "Sydney and Melbourne are now marked. Look inland between them; Canberra itself is still unmarked. Land within 150 km of its center.",
        },
      },
      instruction: "",
      mode: "pin",
      rule: {
        type: "pin-distance",
        targetId: "place:2172517",
        radiusKm: 150,
        tiers: [
          { radiusKm: 50, feedback: "Bullseye!" },
          { radiusKm: 100, feedback: "Very close." },
          { radiusKm: 150, feedback: "In range." },
        ],
      },
      sources: [
        source(
          "National Capital Authority · Federation and the national capital",
          "https://www.nca.gov.au/education/canberras-history/federation-and-national-capital",
        ),
      ],
      explanation:
        "A purpose-built capital resolved the rivalry between Sydney and Melbourne. Its site also had to sit at least 100 miles from Sydney; the compromise did not require an exact midpoint.",
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
      leadIn:
        "Continue to Nigeria, where government moved from Lagos to Abuja in 1991.",
      prompt: "Which advantage helped make Abuja the preferred site?",
      choices: [
        {
          id: "abuja:rivalry",
          label: "A midpoint that settled a rivalry between major cities",
        },
        {
          id: "abuja:access",
          label: "A central site accessible from across the country",
        },
        {
          id: "abuja:infrastructure",
          label:
            "An established commercial hub with infrastructure already in place",
        },
        {
          id: "abuja:oil",
          label: "A location closer to the country’s southern oil fields",
        },
      ],
      rule: { type: "choice-ids", ids: ["abuja:access"] },
      correctFeedback: "Well done.",
      guidance: {
        hint: "Compare the two locations. What changes for people traveling to the seat of government?",
        assist: {
          text: "Two explanations remain: access from across the country, or a compromise between rival cities. Compare what each explanation claims.",
          candidateIds: ["abuja:access", "abuja:rivalry"],
        },
      },
      explanation:
        "The site-selection committee sought a central location with room to develop and easier access from every part of Nigeria. Abuja answered that national need; Lagos’s limited space and infrastructure pressures had made its dual federal and state role difficult.",
      source: source(
        "Federal Capital Development Authority · history of Abuja",
        "https://fcda.gov.ng/the-history-of-abuja/",
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
      leadIn: "Cross the Atlantic to Brazil for another purpose-built capital.",
      prompt: "Which marker is Brasília, the capital since 1960?",
      guidance: {
        hint: "Look near the middle of Brazil, away from the Atlantic coast.",
        assist: {
          text: "Three markers remain. Compare their distance from the Atlantic coast: the capital was built to draw government into the interior.",
          candidateIds: ["place:3469058", "place:3448439", "place:3470127"],
        },
      },
      instruction: "",
      mode: "city-single",
      rule: { type: "place-ids", ids: ["place:3469058"] },
      selection: { type: "ids", ids: BRAZIL_CITY_TARGETS },
      commitment: "submit",
      explanation:
        "Brasília became Brazil’s capital in 1960, when the seat of government moved from coastal Rio de Janeiro to a planned city in the interior.",
      source: source(
        "Presidency of Brazil · Law 3,273, capital transfer date",
        "https://www.planalto.gov.br/ccivil_03/leis/l3273.htm",
      ),
      sources: [
        source(
          "IPHAN · Brasília, a purpose-built capital",
          "https://www.gov.br/iphan/pt-br/superintendencias/distrito-federal/patrimonio-mundial",
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
      commitment: "submit",
      selection: { type: "none" },
      id: "unexpected-south-africa-capitals",
      leadIn:
        "Finish in South Africa, where government has more than one home.",
      progressLabel: "South Africa",
      resolvedLabel: "Pretoria, Cape Town & Bloemfontein",
      title: "Three cities, three roles.",
      label: "Three capitals",
      prompt:
        "Match the three traditional capital roles to their cities. One city will be left over.",
      mode: "choice-match",
      count: 3,
      matchSlots: [
        {
          id: "executive",
          label: "National administration",
        },
        { id: "legislative", label: "Parliament" },
        {
          id: "judicial",
          label: "Supreme Court of Appeal",
        },
      ],
      choices: [
        { id: "place:993800", label: "Johannesburg" },
        { id: "place:3369157", label: "Cape Town" },
        { id: "place:964137", label: "Pretoria" },
        { id: "place:1018725", label: "Bloemfontein" },
      ],
      rule: {
        type: "slot-matches",
        matches: [
          { slotId: "executive", choiceId: "place:964137" },
          { slotId: "legislative", choiceId: "place:3369157" },
          { slotId: "judicial", choiceId: "place:1018725" },
        ],
      },
      guidance: {
        hint: "Parliament sits in the southwestern coastal city. The other two capital roles are inland.",
        assist: {
          text: "Cape Town is locked into Parliament. Match the remaining two roles; one city still stays unused.",
          fixedSlots: [{ index: 1, id: "place:3369157" }],
        },
      },
      explanation:
        "Pretoria houses South Africa’s national administration, Cape Town its Parliament, and Bloemfontein its Supreme Court of Appeal. Johannesburg houses the Constitutional Court, adding another layer to a country whose government cannot be located with one capital marker.",
      source: source(
        "South African Government · three national capitals",
        "https://www.gov.za/about-sa/south-africas-provinces",
      ),
      sources: [
        source(
          "South African Government · Constitutional Court location",
          "https://www.gov.za/nr/about-government/contact-directory/judicial-institution/constitutional-court",
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
          places: [
            { ...referenceCity("place:964137"), name: "Pretoria" },
            { ...referenceCity("place:3369157"), name: "Cape Town" },
            {
              ...referenceCity("place:1018725"),
              name: "Bloemfontein",
            },
            {
              ...referenceCity("place:993800"),
              name: "Johannesburg",
            },
          ],
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
      "A capital can mark a new republic, settle a rivalry, improve national access or draw government inland. South Africa ends the story by sharing capital roles across three cities. The most familiar city is only the beginning of the question.",
  },
};
