import { referenceCity } from "./helpReferences";
import { defineQuestion, definePresentation } from "./questionBuilder";
import { CANADIAN_PROVINCES } from "./canadianRegions";
import { CAPITALS, LANGUAGES, capitalSource, languageSource } from "./quizData";
import type { Journey } from "./questionContracts";

const base = definePresentation({
  label: "Languages",
  topic: "official languages",
  instruction: "",
  disclosure: {
    hoverNames: false,
    namedChoices: false,
    committedNames: true,
    previousVisits: false,
  },
  failure: "feedback",
  focus: { lat: 55, lng: -95, altitude: 1.5 },
  source: capitalSource,
  contextIds: ["wurl:CAN"],
  map: { borders: true, hoverFeedback: false, muteOthers: true },
});
const regionsSource = {
  name: "Government of Canada · Canada’s regions",
  url: "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/discover-canada/read-online/canadas-regions.html",
  reviewedOn: "2026-10-11",
};
export const CANADA_JOURNEY: Journey = {
  id: "beyond-the-maple-leaf-v1",
  addedAt: "2026-10-11",
  title: "Beyond the maple leaf",
  description:
    "Begin with a familiar flag, then look beyond it: two official languages, a bilingual province, a capital between communities, and a northern ocean shore.",
  rounds: [
    defineQuestion({
      mode: "map-single",
      rule: { type: "flag-country", countryId: "wurl:CAN" },
      count: 1,
      selection: { type: "members" },
      commitment: "immediate",

      title: "A flag, a place.",
      label: "Flag",
      topic: "flags",
      prompt: "Which country flies this flag?",
      instruction: "",
      disclosure: {
        hoverNames: false,
        namedChoices: false,
        committedNames: true,
        previousVisits: false,
      },
      failure: "feedback",
      source: {
        name: "Government of Canada · national flag",
        url: "https://www.canada.ca/en/canadian-heritage/services/flag-canada-description.html",
        reviewedOn: "2026-10-05",
      },
      image: {
        src: "/flags/clue-01.svg",
        alt: "Flag clue: red side panels and an eleven-point red maple leaf on white.",
        feedbackAlt: "National flag of Canada",
      },
      id: "canada-maple-flag-v1",
      resolvedLabel: "Canada",
      guidance: {
        hint: "Look for a large North American country with both Atlantic and Pacific shores.",
        assist: {
          text: "Three North American candidates remain. Compare their shapes without country labels.",
          candidateIds: ["wurl:CAN", "wurl:USA", "wurl:MEX"],
          focus: { lat: 38, lng: -102, altitude: 1.2 },
        },
      },
      leadIn: "Start with a familiar flag.",
      explanation:
        "The maple leaf brings one country instantly to mind. Its shared symbol is our starting point; the languages and places behind it tell a more varied story.",
      scenes: {
        play: {
          focus: { lat: 14, lng: 24, altitude: 1.65 },
          map: { candidates: "neutral" },
        },
      },
    }),
    defineQuestion({
      mode: "choice-multiple",
      rule: { type: "official-languages", countryId: "wurl:CAN", match: "all" },
      count: 2,
      selection: { type: "none" },
      commitment: "submit",

      title: "One country, two languages.",
      label: "Languages",
      topic: "official languages",
      prompt: "Which two languages are official at Canada’s federal level?",
      instruction: "",
      disclosure: {
        hoverNames: false,
        namedChoices: false,
        committedNames: true,
        previousVisits: false,
      },
      failure: "feedback",
      source: languageSource,
      choices: LANGUAGES,
      id: "canada-federal-languages-v1",
      resolvedLabel: "English and French",
      guidance: {
        hint: "Think about the communities along the St. Lawrence and the language shared with most of the neighboring United States.",
        assist: {
          text: "Four languages remain. Choose the two with federal official status, rather than every language widely spoken here.",
          candidateIds: [
            "language:eng",
            "language:fra",
            "language:spa",
            "language:deu",
          ],
        },
      },
      leadIn:
        "One flag represents a country with two federal official languages.",
      explanation:
        "English and French have equal status in federal institutions. But the language story changes as we move from the country as a whole to its individual provinces.",
      scenes: {
        play: {
          focus: { lat: 55, lng: -95, altitude: 1.5 },
          contextIds: ["wurl:CAN"],
          map: { borders: true, hoverFeedback: false, muteOthers: true },
        },
      },
    }),
    defineQuestion({
      mode: "choice-single",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",

      ...base,
      id: "canada-bilingual-province-v1",
      resolvedLabel: "New Brunswick",
      guidance: {
        hint: "Look east of Quebec, toward the Maritime provinces. Official bilingual status is different from having many bilingual residents.",
        assist: {
          text: "Quebec, New Brunswick, and Nova Scotia remain. Compare the three provinces.",
          candidateIds: ["province:qc", "province:nb", "province:ns"],
          focus: { lat: 47, lng: -65, altitude: 0.65 },
        },
      },
      label: "Province",
      topic: "official languages",
      title: "Two voices on the Atlantic coast.",
      leadIn: "Follow those two languages east to the Maritime provinces.",
      prompt:
        "Which Canadian province is officially bilingual in English and French?",
      rule: { type: "choice-ids", ids: ["province:nb"] },
      choices: [
        { id: "province:qc", geographyIds: ["wurl:CAN-QB"], label: "Quebec" },
        { id: "province:on", geographyIds: ["wurl:CAN-ON"], label: "Ontario" },
        {
          id: "province:nb",
          geographyIds: ["wurl:CAN-NB"],
          label: "New Brunswick",
        },
        {
          id: "province:ns",
          geographyIds: ["wurl:CAN-NS"],
          label: "Nova Scotia",
        },
        { id: "province:mb", geographyIds: ["wurl:CAN-MB"], label: "Manitoba" },
        {
          id: "province:nl",
          geographyIds: ["wurl:CAN-NL"],
          label: "Newfoundland and Labrador",
        },
      ],
      importedRegions: CANADIAN_PROVINCES,
      explanation:
        "New Brunswick is the only province where English and French are both official. A province’s legal language status is different from the languages its residents happen to speak.",
      source: {
        name: "Government of New Brunswick · basic facts",
        url: "https://www.gnb.ca/en/admin/about-nb/basic-facts.html",
        reviewedOn: "2026-10-11",
      },
      scenes: {
        play: {
          contextIds: [],
          candidateRegionIds: [
            "wurl:CAN-QB",
            "wurl:CAN-ON",
            "wurl:CAN-NB",
            "wurl:CAN-NS",
            "wurl:CAN-MB",
            "wurl:CAN-NL",
          ],
          map: {
            borders: true,
            hoverFeedback: false,
            muteOthers: true,
            revealOnAnswer: true,
            candidates: "highlighted",
            candidateRole: "clue",
            selectionFeedback: "after-submit",
          },
          focus: { lat: 54, lng: -96, altitude: 1.1 },
        },
        reveal: {
          answerIds: ["wurl:CAN-NB"],
          focus: { lat: 46.5, lng: -66.5, altitude: 0.45 },
        },
      },
    }),
    defineQuestion({
      count: 1,
      selection: { type: "none" },
      commitment: "submit",

      ...base,
      id: "canada-ottawa-v1",
      resolvedLabel: "Ottawa",
      guidance: {
        hint: "The capital sits on a river between Ontario and Quebec.",
        assist: {
          text: "Toronto and Montréal are now marked. Look northeast of Toronto and west of Montréal; the capital’s name begins with O.",
          places: [referenceCity("Toronto"), referenceCity("Montréal")],
          focus: { lat: 45, lng: -77, altitude: 0.45 },
        },
      },
      label: "Capital",
      topic: "capitals",
      title: "Back to the federal seat.",
      leadIn: "Turn inland to the meeting of Ontario and Quebec.",
      prompt: "What is the capital of Canada?",
      mode: "text",
      inputLabel: "Capital city",
      rule: { type: "capital-name", countryId: "wurl:CAN" },
      choices: undefined,
      explanation:
        "Ottawa sits in Ontario beside Quebec, on the river between them. The federal government’s home lies at a meeting of provinces, rather than in either Toronto or Montréal.",
      source: regionsSource,
      scenes: {
        play: { focus: { lat: 53, lng: -96, altitude: 1.1 } },
        reveal: {
          places: [
            CAPITALS.find((capital) => capital.countryId === "wurl:CAN")!,
          ],
        },
      },
    }),
    defineQuestion({
      mode: "choice-single",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",

      ...base,
      id: "canada-arctic-shore-v1",
      resolvedLabel: "Arctic Ocean",
      guidance: {
        hint: "Think of the polar waters beyond Canada’s northern islands.",
        assist: {
          text: "Three oceans remain. The line marks 80°N to help you orient the northern shore.",
          candidateIds: ["ocean:arctic", "ocean:atlantic", "ocean:pacific"],
          overlays: [{ id: "help:canada:80n", type: "parallel", latitude: 80 }],
          focus: { lat: 76, lng: -100, altitude: 0.9 },
        },
      },
      label: "Ocean",
      topic: "coastlines",
      title: "The northern edge.",
      leadIn: "Leave the capital for the country’s far northern edge.",
      prompt: "Which ocean borders Canada to the north?",
      rule: { type: "choice-ids", ids: ["ocean:arctic"] },
      choices: [
        { id: "ocean:pacific", label: "Pacific Ocean" },
        { id: "ocean:atlantic", label: "Atlantic Ocean" },
        { id: "ocean:arctic", label: "Arctic Ocean" },
        { id: "ocean:indian", label: "Indian Ocean" },
        { id: "ocean:southern", label: "Southern Ocean" },
      ],
      explanation:
        "The northern islands open onto the Arctic Ocean. With the Atlantic to the east and the Pacific to the west, Canada’s three ocean shores stretch far beyond the familiar maple leaf.",
      source: regionsSource,
      scenes: {
        play: { focus: { lat: 73, lng: -105, altitude: 1.05 } },
        reveal: {
          places: [
            {
              id: "ocean:arctic",
              name: "Arctic Ocean",
              kind: "ocean",
              lat: 85,
              lng: -105,
              markerHidden: true,
              displayRole: "explanation",
              sourceId: "journey:canada-ocean-label",
              priority: 100,
            },
          ],
        },
      },
    }),
  ],
  completion: {
    focus: { lat: 62, lng: -95, altitude: 1.2 },
    regionIds: ["wurl:CAN", ...CANADIAN_PROVINCES.map((region) => region.id)],
    views: [
      { lat: 62, lng: -95, altitude: 1.2 },
      { lat: 46.5, lng: -66.5, altitude: 0.45 },
      { lat: 45.4, lng: -75.7, altitude: 0.4 },
      { lat: 73, lng: -105, altitude: 1.05 },
    ],
    physicalFeatures: [],
    places: [],
    caption:
      "A maple leaf, two federal languages, a bilingual province, a riverside capital, and three ocean shores: Canada’s familiar outline holds more than one story of belonging.",
  },
};
