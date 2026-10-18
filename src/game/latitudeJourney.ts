import { defineQuestion } from "./questionBuilder";
import { CAPITALS, capitalSource } from "./quizData";
import type { Journey, Question } from "./questionContracts";

const comparisons = [
  {
    id: "africa-amman",
    reference: "Amman",
    continent: "AF",
    direction: "north",
    leadIn: "Start above Amman’s latitude.",
    prompt: "Name an African capital city farther north than Amman, Jordan.",
    focus: { lat: 22, lng: 22, altitude: 1.5 },
    explanation:
      "Africa’s Mediterranean coast reaches above this line. A continent’s reputation can mislead your sense of latitude.",
  },
  {
    id: "europe-ottawa",
    reference: "Ottawa",
    continent: "EU",
    direction: "south",
    leadIn: "Cross the Atlantic to Europe.",
    prompt: "Name a European capital city farther south than Ottawa, Canada.",
    focus: { lat: 46, lng: 12, altitude: 1.4 },
    explanation:
      "Many European capitals sit below this line. Familiar maps don’t always make that obvious.",
  },
  {
    id: "asia-rome",
    reference: "Rome",
    continent: "AS",
    direction: "north",
    leadIn: "Follow Rome’s latitude into Asia.",
    prompt: "Name an Asian capital city farther north than Rome, Italy.",
    focus: { lat: 40, lng: 82, altitude: 1.5 },
    explanation:
      "The capitals of Kazakhstan, Kyrgyzstan, and Mongolia all lie above the line.",
  },
  {
    id: "south-america-pretoria",
    reference: "Pretoria",
    continent: "SA",
    direction: "south",
    leadIn: "Head south to compare two continents.",
    prompt:
      "Name a South American capital city farther south than Pretoria, South Africa.",
    focus: { lat: -24, lng: -63, altitude: 1.4 },
    explanation:
      "South America reaches farther south than Africa. Three national capitals lie below this line.",
  },
  {
    id: "oceania-buenos-aires",
    reference: "Buenos Aires",
    continent: "OC",
    direction: "south",
    leadIn: "Finish across the Pacific.",
    prompt:
      "Name a capital city in Oceania farther south than Buenos Aires, Argentina.",
    focus: { lat: -25, lng: 162, altitude: 1.6 },
    explanation:
      "Australia’s and New Zealand’s capitals both sit below the reference line. Five continents, one way to rethink the map.",
  },
] as const;

export const LATITUDE_JOURNEY: Journey = {
  id: "latitude-surprises-v1",
  addedAt: "2026-10-11",
  availability: "pool",
  title: "Latitude surprises",
  description:
    "Take one latitude line around the world at a time. Across five continents, familiar cities turn out to be farther north—or south—than you expect.",
  rounds: comparisons.map((comparison): Question => {
    const reference = CAPITALS.find(
      (capital) => capital.name === comparison.reference,
    )!;
    return defineQuestion({
      mode: "text",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",

      qualification:
        "We compare one primary capital per UN member state using GeoNames coordinates, downloaded in October 2026.",
      topic: "latitude",
      disclosure: {
        hoverNames: false,
        namedChoices: false,
        committedNames: false,
        previousVisits: false,
      },
      failure: "feedback",
      id: `latitude-${comparison.id}-v1`,
      title: `Compare with ${comparison.reference}.`,
      label: "Latitude",
      progressLabel: {
        AF: "Africa",
        EU: "Europe",
        AS: "Asia",
        SA: "South America",
        OC: "Oceania",
      }[comparison.continent],
      leadIn: comparison.leadIn,
      prompt: comparison.prompt,
      instruction: `The line marks ${comparison.reference}’s latitude.`,
      inputLabel: "Capital city",
      rule: {
        type: "capital-coordinate",
        referenceId: reference.id,
        continent: comparison.continent,
        direction: comparison.direction,
      },
      explanation: comparison.explanation,
      source: capitalSource,
      scenes: {
        play: {
          places: [reference],
          contextIds: [reference.countryId],
          focus: comparison.focus,
          overlays: [
            {
              id: `line:${comparison.id}`,
              type: "parallel",
              latitude: reference.lat,
            },
          ],
        },
      },
    });
  }),
};
