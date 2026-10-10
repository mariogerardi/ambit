import type { FactSource, Journey, Question } from "./questions";
import { ANSWER_PLACES } from "./answerTargets";
import { capitalSource } from "./quizData";

const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-07",
});
const place = (id: string) => ANSWER_PLACES.get(id)!;
const base: Question = {
  id: "",
  label: "",
  topic: "Z places",
  title: "",
  prompt: "",
  instruction: "",
  explanation: "",
  mode: "text",
  rule: { type: "manual-text", answers: [] },
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
  focus: { lat: 0, lng: 20, altitude: 1.3 },
  map: { borders: true, hover: false, muteOthers: true },
  source: capitalSource,
};
export const THIRTEENTH_JOURNEY: Journey = {
  id: "the-z-trail-v1",
  title: "The Z trail",
  description:
    "Follow one letter through cities, rivers, and changing country names across continents.",
  rounds: [
    {
      ...base,
      id: "z-zurich-pin",
      label: "Drop a pin",
      title: "Z marks the spot.",
      prompt:
        "Zürich is Switzerland’s largest city. Drop a pin within 60 km of it.",
      instruction: "",
      mode: "pin",
      rule: { type: "pin-distance", targetId: "place:2657896", radiusKm: 60 },
      contextIds: ["wurl:CHE"],
      focus: { lat: 46.8, lng: 8.3, altitude: 0.48 },
      feedbackFocus: { lat: 47.1, lng: 8, altitude: 0.25 },
      map: {
        borders: false,
        borderIds: ["wurl:CHE"],
        hover: false,
        muteOthers: true,
      },
      feedbackPlaces: [place("place:2661552")],
      explanation:
        "Zürich lies in northern Switzerland, at the northern end of Lake Zürich. Bern, to its southwest, is Switzerland’s federal city: the biggest city and the seat of government are different places.",
      source: source(
        "Switzerland Tourism · Zürich",
        "https://www.myswitzerland.com/en-us/destinations/zuerich/",
      ),
      sources: [
        source(
          "Swiss Federal Department of Foreign Affairs · Bern’s federal-city role",
          "https://www.aboutswitzerland.eda.admin.ch/en/political-system",
        ),
        capitalSource,
      ],
    },
    {
      ...base,
      id: "z-zagreb-capital",
      label: "Capital",
      title: "Behind the postcard.",
      prompt: "What is Croatia’s capital, inland near the Slovenian border?",
      instruction: "",
      inputLabel: "Capital city",
      rule: { type: "capital-name", countryId: "wurl:HRV" },
      contextIds: ["wurl:HRV"],
      focus: { lat: 44.8, lng: 16.2, altitude: 0.45 },
      feedbackFocus: { lat: 45.5, lng: 16, altitude: 0.3 },
      feedbackPlaces: [place("place:3186886")],
      explanation:
        "Zagreb is Croatia’s capital, in the north of the country and inland from the Adriatic coast.",
      source: source(
        "Croatian National Tourist Board · Zagreb, the capital of Croatia",
        "https://www.htz.hr/sites/default/files/2023-09/Dobro%20do%C5%A1li%20u%20Zagreb%20-%20ENG.pdf",
      ),
      sources: [capitalSource],
    },
    {
      ...base,
      id: "z-zambia-zimbabwe-river",
      label: "River",
      title: "Two Zs. One river.",
      prompt:
        "Which river runs along the border between Zambia and Zimbabwe and plunges over Victoria Falls?",
      instruction: "",
      mode: "choice-single",
      rule: { type: "choice-ids", ids: ["river:zambezi"] },
      choices: [
        "Limpopo",
        "Congo",
        "Zambezi",
        "Nile",
        "Orange",
        "Okavango",
      ].map((name) => ({ id: `river:${name.toLowerCase()}`, label: name })),
      contextIds: ["wurl:ZMB", "wurl:ZWE"],
      map: {
        borders: false,
        borderIds: ["wurl:ZMB", "wurl:ZWE"],
        hover: false,
        muteOthers: true,
      },
      focus: { lat: -16.8, lng: 28.7, altitude: 0.72 },
      feedbackFocus: { lat: -17.5, lng: 27, altitude: 0.36 },
      feedbackPlaces: [
        {
          id: "reveal:z-victoria-falls",
          name: "Victoria Falls · Zambezi",
          kind: "landmark",
          lat: -17.92453,
          lng: 25.85539,
          sourceId: "unesco:509",
          priority: 100,
        },
      ],
      explanation:
        "The Zambezi. It forms a long stretch of the Zambia–Zimbabwe border, including Victoria Falls, also known as Mosi-oa-Tunya. The falls are shared by both countries.",
      source: source(
        "UNESCO · Mosi-oa-Tunya / Victoria Falls",
        "https://whc.unesco.org/en/list/509",
      ),
      sources: [
        source(
          "Zambia Tourism · Zambezi border geography",
          "https://www.zambiatourism.com/destinations/rivers/zambezi/",
        ),
      ],
    },
    {
      ...base,
      id: "z-zanzibar-union",
      label: "Union",
      title: "Two names become one.",
      prompt:
        "Tanganyika united with Zanzibar in 1964. What present-day country did they form?",
      instruction: "",
      inputLabel: "Country",
      rule: {
        type: "manual-text",
        answers: [
          "Tanzania",
          "United Republic of Tanzania",
          "The United Republic of Tanzania",
        ],
      },
      contextIds: ["wurl:TZA"],
      feedbackContextIds: ["wurl:TZA"],
      highlightParts: [
        {
          countryId: "wurl:TZA",
          point: { lat: -6.15, lng: 39.3 },
          name: "Unguja",
        },
      ],
      map: { borders: false, hover: false, muteOthers: true },
      focus: { lat: -6, lng: 39.2, altitude: 0.3 },
      feedbackFocus: { lat: -6, lng: 35.6, altitude: 0.62 },
      feedbackPlaces: [
        { ...place("place:148730"), name: "Zanzibar City" },
        place("place:160196"),
      ],
      explanation:
        "Tanzania. Tanganyika and Zanzibar united on April 26, 1964. The modern name combines elements of both names. Zanzibar includes Unguja, Pemba, and smaller islands; the clue highlighted Unguja alone.",
      source: source(
        "Tanzanian Embassy · Union Day booklet",
        "https://www.jp.tzembassy.go.tz/uploads/UNION_DAY_Booklet_26.04.2023.pdf",
      ),
      sources: [
        source(
          "Tanzanian High Commission · Tanzania’s name",
          "https://www.tanzrepdelhi.com/about.html",
        ),
      ],
    },
    {
      ...base,
      id: "z-zaire-country",
      label: "Former name",
      title: "A name from an old atlas.",
      prompt:
        "Which present-day African country was called Zaire from 1971 to 1997?",
      instruction: "",
      mode: "map-single",
      rule: { type: "country-ids", ids: ["wurl:COD"] },
      selection: { type: "members" },
      map: {
        borders: true,
        hover: true,
        muteOthers: true,
        candidates: "neutral",
      },
      focus: { lat: 0, lng: 22, altitude: 1.5 },
      feedbackFocus: { lat: -3, lng: 23, altitude: 0.8 },
      feedbackPlaces: [place("place:2314302")],
      explanation:
        "The Democratic Republic of the Congo, whose capital is Kinshasa. The name Zaire was replaced in May 1997. It is a different country from the Republic of the Congo, its smaller neighbor to the west.",
      source: source(
        "United Nations · Democratic Republic of the Congo name change",
        "https://www.un.org/fr/about-us/member-states/democratic-republic-of-the-congo",
      ),
      sources: [capitalSource],
    },
  ],
};
