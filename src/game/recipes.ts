import { defineQuestion, definePresentation } from "./questionBuilder";
import { ANSWER_PLACES } from "./answerTargets";
import { capitalSource } from "./quizData";
import { mapSource } from "./countryFacts";
import { cityReference } from "./authoredPlaces";
import type { Question } from "./questionContracts";
const reference = (id: string) => cityReference(ANSWER_PLACES.get(id)!);
const base = definePresentation({
  label: "Recipe",
  topic: "authoring example",
  instruction: "",
  failure: "feedback",
  focus: { lat: 35, lng: -100, altitude: 1.4 },
  disclosure: {
    hoverNames: false,
    namedChoices: false,
    committedNames: false,
    previousVisits: false,
  },
  source: capitalSource,
  map: { borders: true, hoverFeedback: false, muteOthers: true },
  feedbackContextIds: [],
});
const africaSource = {
  name: "South African Government · national capitals",
  url: "https://www.gov.za/about-sa/south-africas-provinces",
  reviewedOn: "2026-10-11",
};
// Complete control examples, deliberately absent from the published Journey catalog.
// These demonstrate contracts; use the crafting guide to design an engaging task.
export const MECHANIC_RECIPES: Question[] = [
  defineQuestion({
    ...base,
    id: "recipe:merged-region-single",
    title: "merged-region-single example",
    prompt: "Tap the apparent territory containing two countries.",
    explanation:
      "This example dissolves the canonical Spain–Portugal border and restores both countries after submission.",
    mode: "merged-region-single",
    count: 1,
    commitment: "immediate",
    selection: {
      type: "ids",
      ids: [
        "wurl:FRA",
        "composite:recipe:iberia",
        "wurl:ITA",
        "wurl:MAR",
        "wurl:DZA",
      ],
    },
    rule: {
      type: "merged-region",
      targetId: "composite:recipe:iberia",
      memberIds: ["wurl:ESP", "wurl:PRT"],
      hiddenAdjacencies: [["wurl:ESP", "wurl:PRT"]],
    },
    guidance: {
      hint: "A peninsula may contain more than one country.",
      assist: {
        text: "Four territories remain.",
        candidateIds: [
          "wurl:FRA",
          "composite:recipe:iberia",
          "wurl:ITA",
          "wurl:MAR",
        ],
      },
    },
    scenes: {
      play: {
        focus: { lat: 38, lng: 3, altitude: 0.65 },
        map: {
          borders: true,
          hoverFeedback: false,
          muteOthers: true,
          candidates: "highlighted",
        },
      },
      reveal: { focus: { lat: 39.5, lng: -5.5, altitude: 0.34 } },
    },
    source: mapSource,
  }),
  defineQuestion({
    ...base,
    id: "recipe:pin",
    title: "pin example",
    prompt: "Drop a pin within 150 km of Canberra.",
    explanation:
      "This example demonstrates the answer contract; author a specific explanation for your Journey.",
    mode: "pin",
    count: 1,
    selection: {
      type: "none",
    },
    commitment: "submit",
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
    focus: {
      lat: -34,
      lng: 147,
      altitude: 0.55,
    },
    contextIds: ["wurl:AUS"],
    places: [reference("place:2172517")],
    feedbackPlaces: [reference("place:2172517")],
    guidance: {
      hint: "Look inland in southeastern Australia, between Sydney and Melbourne.",
      assist: {
        text: "Sydney and Melbourne are now marked as references.",
        places: [reference("place:2147714"), reference("place:2158177")],
      },
    },
  }),
  defineQuestion({
    ...base,
    id: "recipe:city-single",
    title: "city-single example",
    prompt: "Which marker is Canberra?",
    explanation:
      "This example demonstrates the answer contract; author a specific explanation for your Journey.",
    mode: "city-single",
    count: 1,
    selection: {
      type: "ids",
      ids: ["place:2172517", "place:2147714", "place:2158177"],
    },
    commitment: "submit",
    rule: {
      type: "place-ids",
      ids: ["place:2172517"],
    },
    focus: {
      lat: -34,
      lng: 147,
      altitude: 0.55,
    },
    contextIds: ["wurl:AUS"],
    guidance: {
      hint: "Look inland between the coastal cities.",
      assist: {
        text: "Two candidate markers remain.",
        candidateIds: ["place:2172517", "place:2147714"],
      },
    },
  }),
  defineQuestion({
    ...base,
    id: "recipe:city-multiple",
    title: "city-multiple example",
    prompt: "Select South Africa’s three traditional national capitals.",
    explanation:
      "This example demonstrates the answer contract; author a specific explanation for your Journey.",
    mode: "city-multiple",
    count: 3,
    selection: {
      type: "ids",
      ids: ["place:964137", "place:3369157", "place:1018725", "place:993800"],
    },
    commitment: "submit",
    rule: {
      type: "place-ids",
      ids: ["place:964137", "place:3369157", "place:1018725"],
    },
    guidance: {
      hint: "Parliament is on the southwest coast; the other two roles are inland.",
      assist: {
        text: "Four named cities remain; one is outside the traditional three-capital arrangement.",
      },
    },
    focus: {
      lat: -28.5,
      lng: 25,
      altitude: 0.42,
    },
    contextIds: ["wurl:ZAF"],
    source: africaSource,
    disclosure: {
      ...base.disclosure,
      namedChoices: true,
      hoverNames: true,
      committedNames: true,
    },
  }),
  defineQuestion({
    ...base,
    id: "recipe:map-single",
    title: "map-single example",
    prompt: "Select Canada on the globe.",
    explanation:
      "This example demonstrates the answer contract; author a specific explanation for your Journey.",
    mode: "map-single",
    count: 1,
    selection: {
      type: "ids",
      ids: ["wurl:CAN", "wurl:USA", "wurl:MEX"],
    },
    commitment: "immediate",
    rule: {
      type: "country-ids",
      ids: ["wurl:CAN"],
    },
    guidance: {
      hint: "Look north of the United States.",
      assist: {
        text: "Canada, the United States and Mexico are the equally styled candidates.",
      },
    },
    source: mapSource,
  }),
  defineQuestion({
    ...base,
    id: "recipe:map-multiple",
    title: "map-multiple example",
    prompt: "Select Canada and Mexico on the globe.",
    explanation:
      "This example demonstrates the answer contract; author a specific explanation for your Journey.",
    mode: "map-multiple",
    count: 2,
    selection: {
      type: "ids",
      ids: ["wurl:CAN", "wurl:USA", "wurl:MEX"],
    },
    commitment: "submit",
    rule: {
      type: "country-ids",
      ids: ["wurl:CAN", "wurl:MEX"],
    },
    guidance: {
      hint: "They lie on opposite sides of the United States.",
      assist: {
        text: "Canada is locked. Choose the other country.",
        fixedSelections: ["wurl:CAN"],
      },
    },
    source: mapSource,
  }),
  defineQuestion({
    ...base,
    id: "recipe:slider",
    title: "slider example",
    prompt: "Estimate the straight-line distance from London to Paris.",
    explanation:
      "The two city centres are roughly 350 km apart by great circle.",
    mode: "slider",
    count: 1,
    selection: { type: "none" },
    commitment: "submit",
    inputLabel: "Distance in kilometres",
    rule: {
      type: "numeric-range",
      value: 350,
      min: 0,
      max: 1000,
      step: 10,
      unit: "km",
      tolerance: 100,
      tiers: [
        { tolerance: 25, feedback: "Beautifully estimated." },
        { tolerance: 50, feedback: "A close estimate." },
        { tolerance: 100, feedback: "Within range." },
      ],
    },
    guidance: {
      hint: "Compare the gap to the width of southern England.",
      assist: { text: "The distance is between 250 and 450 km." },
    },
    scenes: {
      play: {
        focus: { lat: 50, lng: 1, altitude: 0.45 },
        places: [reference("place:2643743"), reference("place:2988507")],
      },
    },
    source: mapSource,
  }),
  defineQuestion({
    ...base,
    id: "recipe:number",
    title: "number example",
    prompt: "How many cities are named here: Canberra, Sydney and Melbourne?",
    explanation:
      "This example demonstrates the answer contract; author a specific explanation for your Journey.",
    mode: "number",
    count: 1,
    selection: {
      type: "none",
    },
    commitment: "submit",
    rule: {
      type: "manual-number",
      value: 3,
    },
    guidance: {
      hint: "Count each distinct city once.",
      assist: {
        text: "The three named cities are each separate places.",
      },
    },
    inputLabel: "Number of cities",
    source: mapSource,
  }),
  defineQuestion({
    ...base,
    id: "recipe:text",
    title: "text example",
    prompt: "What is the capital of Canada?",
    explanation:
      "This example demonstrates the answer contract; author a specific explanation for your Journey.",
    mode: "text",
    count: 1,
    selection: {
      type: "none",
    },
    commitment: "submit",
    rule: {
      type: "capital-name",
      countryId: "wurl:CAN",
    },
    guidance: {
      hint: "Look in eastern Ontario, near the border with Quebec.",
      assist: {
        text: "Ottawa, Toronto and Montreal are now marked as possibilities.",
      },
    },
    inputLabel: "Capital city",
    scenes: {
      play: {
        contextIds: ["wurl:CAN"],
        focus: { lat: 46, lng: -77, altitude: 0.7 },
      },
      assist: {
        places: [
          reference("place:6094817"),
          reference("place:6167865"),
          reference("place:6077243"),
        ],
      },
      reveal: {
        contextIds: ["wurl:CAN"],
        places: [reference("place:6094817")],
      },
    },
  }),
  defineQuestion({
    ...base,
    id: "recipe:typed-regions",
    title: "typed-regions example",
    prompt: "Name Canada and Mexico.",
    explanation:
      "This example demonstrates the answer contract; author a specific explanation for your Journey.",
    mode: "typed-regions",
    count: 2,
    selection: {
      type: "none",
    },
    commitment: "submit",
    rule: {
      type: "region-ids",
      ids: ["wurl:CAN", "wurl:MEX"],
    },
    guidance: {
      hint: "These are the northern and southern neighbors of the United States.",
      assist: {
        text: "The two country outlines are highlighted as context.",
      },
    },
    inputLabel: "Country",
    source: mapSource,
    scenes: {
      play: { contextIds: ["wurl:CAN", "wurl:MEX"] },
      reveal: { contextIds: ["wurl:CAN", "wurl:MEX"] },
    },
  }),
  defineQuestion({
    ...base,
    id: "recipe:ordered-countries",
    title: "ordered-countries example",
    prompt: "Order Canada, the United States and Mexico from north to south.",
    explanation:
      "This example demonstrates the answer contract; author a specific explanation for your Journey.",
    mode: "ordered-countries",
    count: 3,
    selection: {
      type: "none",
    },
    commitment: "submit",
    rule: {
      type: "country-ids",
      ids: ["wurl:CAN", "wurl:USA", "wurl:MEX"],
      ordered: true,
    },
    guidance: {
      hint: "Use their positions on the globe.",
      assist: {
        text: "Canada belongs at the northern end; Mexico at the southern end.",
      },
    },
    source: mapSource,
  }),
  defineQuestion({
    ...base,
    id: "recipe:ordered-capitals",
    title: "ordered-capitals example",
    prompt:
      "Enter the capitals of Canada, the United States and Mexico, in that order.",
    explanation:
      "This example demonstrates the answer contract; author a specific explanation for your Journey.",
    mode: "ordered-capitals",
    count: 3,
    selection: {
      type: "none",
    },
    commitment: "submit",
    rule: {
      type: "capital-order",
      countryIds: ["wurl:CAN", "wurl:USA", "wurl:MEX"],
    },
    guidance: {
      hint: "Recall the national capitals, not the best-known commercial cities.",
      assist: {
        text: "Think of the seats of federal government; the countries remain labelled in the slots.",
      },
    },
  }),
  defineQuestion({
    ...base,
    id: "recipe:choice-single",
    title: "choice-single example",
    prompt: "Which country has Ottawa as its capital?",
    explanation:
      "This example demonstrates the answer contract; author a specific explanation for your Journey.",
    mode: "choice-single",
    count: 1,
    selection: {
      type: "none",
    },
    commitment: "submit",
    rule: {
      type: "choice-ids",
      ids: ["canada"],
    },
    choices: [
      {
        id: "canada",
        label: "Canada",
      },
      {
        id: "usa",
        label: "United States",
      },
      {
        id: "mexico",
        label: "Mexico",
      },
    ],
    guidance: {
      hint: "Ottawa lies north of the United States.",
      assist: {
        text: "Two countries remain.",
        candidateIds: ["canada", "usa"],
      },
    },
  }),
  defineQuestion({
    ...base,
    id: "recipe:choice-multiple",
    title: "choice-multiple example",
    prompt: "Which two are national capitals?",
    explanation:
      "This example demonstrates the answer contract; author a specific explanation for your Journey.",
    mode: "choice-multiple",
    count: 2,
    selection: {
      type: "none",
    },
    commitment: "submit",
    rule: {
      type: "choice-ids",
      ids: ["ottawa", "canberra"],
    },
    choices: [
      {
        id: "sydney",
        label: "Sydney",
      },
      {
        id: "ottawa",
        label: "Ottawa",
      },
      {
        id: "toronto",
        label: "Toronto",
      },
      {
        id: "canberra",
        label: "Canberra",
      },
    ],
    guidance: {
      hint: "Canada and Australia each contribute one capital.",
      assist: {
        text: "Three cities remain.",
        candidateIds: ["ottawa", "canberra", "sydney"],
      },
    },
  }),
  defineQuestion({
    ...base,
    id: "recipe:choice-order",
    title: "choice-order example",
    prompt:
      "Place the three North American countries from north to south. Leave the spare aside.",
    explanation:
      "This example demonstrates the answer contract; author a specific explanation for your Journey.",
    mode: "choice-order",
    count: 3,
    selection: {
      type: "none",
    },
    commitment: "submit",
    rule: {
      type: "country-ids",
      ids: ["wurl:CAN", "wurl:USA", "wurl:MEX"],
      ordered: true,
    },
    orderLabels: ["North", "Middle", "South"],
    choices: [
      {
        id: "wurl:USA",
        label: "United States",
      },
      {
        id: "wurl:BRA",
        label: "Brazil",
      },
      {
        id: "wurl:MEX",
        label: "Mexico",
      },
      {
        id: "wurl:CAN",
        label: "Canada",
      },
    ],
    guidance: {
      hint: "One card belongs in South America.",
      assist: {
        text: "Canada is locked in the north.",
        fixedSlots: [{ index: 0, id: "wurl:CAN" }],
      },
    },
    source: mapSource,
  }),
  defineQuestion({
    ...base,
    id: "recipe:choice-match",
    title: "choice-match example",
    prompt:
      "Match South Africa’s traditional capital roles to cities. Leave one city aside.",
    explanation:
      "This example demonstrates the answer contract; author a specific explanation for your Journey.",
    mode: "choice-match",
    count: 3,
    selection: {
      type: "none",
    },
    commitment: "submit",
    rule: {
      type: "slot-matches",
      matches: [
        {
          slotId: "administration",
          choiceId: "place:964137",
        },
        {
          slotId: "parliament",
          choiceId: "place:3369157",
        },
        {
          slotId: "appeals",
          choiceId: "place:1018725",
        },
      ],
    },
    matchSlots: [
      {
        id: "administration",
        label: "National administration",
      },
      {
        id: "parliament",
        label: "Parliament",
      },
      {
        id: "appeals",
        label: "Supreme Court of Appeal",
      },
    ],
    focus: {
      lat: -28.5,
      lng: 25,
      altitude: 0.42,
    },
    contextIds: ["wurl:ZAF"],
    choices: [
      {
        id: "place:993800",
        label: "Johannesburg",
      },
      {
        id: "place:3369157",
        label: "Cape Town",
      },
      {
        id: "place:964137",
        label: "Pretoria",
      },
      {
        id: "place:1018725",
        label: "Bloemfontein",
      },
    ],
    source: africaSource,
    disclosure: {
      ...base.disclosure,
      namedChoices: true,
      hoverNames: true,
      committedNames: true,
    },
    scenes: {
      play: {
        places: [
          "place:964137",
          "place:3369157",
          "place:1018725",
          "place:993800",
        ].map(reference),
      },
      reveal: {
        places: [
          "place:964137",
          "place:3369157",
          "place:1018725",
          "place:993800",
        ].map(reference),
      },
    },
    guidance: {
      hint: "Parliament sits on the southwest coast.",
      assist: {
        text: "Cape Town is locked into Parliament.",
        fixedSlots: [{ index: 1, id: "place:3369157" }],
      },
    },
  }),
  defineQuestion({
    ...base,
    id: "recipe:land-path",
    title: "land-path example",
    prompt: "Connect Canada to Mexico through the fewest countries.",
    explanation:
      "This example demonstrates the answer contract; author a specific explanation for your Journey.",
    mode: "land-path",
    count: 3,
    selection: {
      type: "ids",
      ids: ["wurl:CAN", "wurl:USA", "wurl:MEX"],
    },
    commitment: "submit",
    rule: {
      type: "shortest-borders",
      from: "wurl:CAN",
      to: "wurl:MEX",
    },
    guidance: {
      hint: "The United States lies between the endpoints.",
      assist: {
        text: "Only the three relevant countries remain available.",
      },
    },
    source: mapSource,
  }),
];
