import { SECOND_JOURNEY } from "./secondJourney";
import { CAPITALS, capitalSource } from "./quizData";
import { mapSource } from "./countryFacts";
import type { Journey, Question } from "./questions";

const base: Question = {
  ...SECOND_JOURNEY.rounds[0],
  image: undefined,
  source: mapSource,
  map: { borders: true, hover: false, muteOthers: true, revealOnAnswer: true },
};
export const ANDES_JOURNEY: Journey = {
  id: "along-the-andes-v1",
  title: "Along the Andes",
  description:
    "Follow South America’s mountain spine: a highland capital, a lake shared by two countries, a towering peak, and a narrow Pacific finish.",
  rounds: [
    {
      ...SECOND_JOURNEY.rounds[2],
      id: "andes-country-trio-v1",
      leadIn: "First, find three countries along the mountain spine.",
      explanation:
        "The range crosses seven countries along South America’s western side. National borders don’t stop the mountains.",
    },
    {
      ...base,
      id: "andes-quito-v1",
      label: "Capital",
      topic: "highland cities",
      title: "A capital in the mountains.",
      leadIn: "Start our southward trip in Ecuador’s highlands.",
      prompt: "What is the capital of Ecuador?",
      mode: "text",
      inputLabel: "Capital city",
      commitment: "submit",
      selection: { type: "none" },
      rule: { type: "capital-name", countryId: "wurl:ECU" },
      contextIds: ["wurl:ECU"],
      focus: { lat: -2, lng: -77, altitude: 0.7 },
      feedbackPlaces: [
        CAPITALS.find((capital) => capital.countryId === "wurl:ECU")!,
      ],
      explanation:
        "The city sits high in the Andes, along the slopes of Pichincha volcano.",
      source: {
        name: "UNESCO · City of Quito",
        url: "https://whc.unesco.org/en/list/2",
        reviewedOn: "2026-10-11",
      },
      sources: [capitalSource],
    },
    {
      ...base,
      id: "andes-titicaca-v1",
      label: "Lake",
      topic: "lakes and borders",
      title: "Two shores, one lake.",
      leadIn: "Continue south to the Altiplano, where water crosses a border.",
      prompt: "Which two countries share Lake Titicaca?",
      mode: "map-multiple",
      count: 2,
      commitment: "submit",
      rule: { type: "country-ids", ids: ["wurl:PER", "wurl:BOL"] },
      selection: {
        type: "ids",
        ids: CAPITALS.filter((capital) => capital.continent === "SA").map(
          (capital) => capital.countryId,
        ),
      },
      disclosure: { ...base.disclosure, hoverNames: true },
      contextIds: undefined,
      focus: { lat: -16, lng: -67, altitude: 1.1 },
      places: [
        {
          id: "clue:titicaca",
          name: "Lake Titicaca",
          kind: "other",
          lat: -15.8,
          lng: -69.3,
          sourceId: "unesco:5080",
        },
      ],
      explanation:
        "The lake spans their border high on the Altiplano, between Andean ranges.",
      source: {
        name: "UNESCO · Lake Titicaca",
        url: "https://whc.unesco.org/en/tentativelists/5080",
        reviewedOn: "2026-10-11",
      },
    },
    {
      ...base,
      id: "andes-aconcagua-v1",
      label: "Peak",
      topic: "mountains",
      title: "The highest stop.",
      leadIn: "Farther south, the mountain chain reaches its highest point.",
      prompt:
        "Which country contains Aconcagua, the highest mountain in the Americas?",
      rule: { type: "country-ids", ids: ["wurl:ARG"] },
      contextIds: undefined,
      focus: { lat: -28, lng: -65, altitude: 1.1 },
      explanation:
        "The peak rises in Mendoza province, close to the Chilean border.",
      source: {
        name: "Government of Mendoza · Aconcagua Provincial Park",
        url: "https://actividadesanp.mendoza.gov.ar/anp/reservas/PARQUEACONCAGUA",
        reviewedOn: "2026-10-11",
      },
    },
    {
      ...base,
      id: "andes-chile-pin-v1",
      label: "Drop a pin",
      topic: "mountains and coastlines",
      title: "Down to the Pacific side.",
      leadIn: "Cross to the Pacific side for one last landing.",
      prompt: "Drop a pin inside Chile.",
      mode: "pin",
      commitment: "submit",
      rule: { type: "pin-inside", ids: ["wurl:CHL"] },
      selection: { type: "none" },
      disclosure: { ...base.disclosure, committedNames: false },
      contextIds: undefined,
      focus: { lat: -34, lng: -67, altitude: 1.15 },
      map: {
        borders: false,
        hover: false,
        muteOthers: true,
        revealOnAnswer: true,
      },
      explanation:
        "A long, narrow strip of land lies between the mountains and the Pacific. Knowing the name is only half the pin challenge.",
      source: mapSource,
    },
  ],
};
