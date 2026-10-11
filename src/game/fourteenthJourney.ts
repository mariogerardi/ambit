import { defineQuestion } from "./questionBuilder";
import type { FactSource, Journey, Question } from "./questions";
import type { RegionFeature } from "../geography/types";
import islands from "./data/island-clues.v1.json";

const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-07",
});
const definitions = [
  {
    id: "andaman-nicobar",
    label: "Andaman & Nicobar",
    title: "Across the Bay of Bengal.",
    prompt:
      "The Andaman and Nicobar Islands are shown in darker yellow. Which country are they part of?",
    candidates: ["IND", "MMR", "BGD", "LKA", "IDN", "THA"],
    names: [
      "India",
      "Myanmar",
      "Bangladesh",
      "Sri Lanka",
      "Indonesia",
      "Thailand",
    ],
    focus: { lat: 15, lng: 90, altitude: 0.8 },
    feedbackFocus: { lat: 17, lng: 86, altitude: 0.85 },
    explanation:
      "The islands form a union territory, even though Southeast Asia looks like the more natural neighbor.",
    source: source(
      "Andaman and Nicobar Administration · union territory",
      "https://andamannicobar.gov.in/about",
    ),
  },
  {
    id: "bioko",
    label: "Bioko",
    title: "The coast can fool you.",
    prompt:
      "Bioko Norte and Bioko Sur share the island shown in darker yellow. Which country are these two provinces part of?",
    candidates: ["CMR", "NGA", "GAB", "STP", "GNQ", "BEN"],
    names: [
      "Cameroon",
      "Nigeria",
      "Gabon",
      "São Tomé and Príncipe",
      "Equatorial Guinea",
      "Benin",
    ],
    focus: { lat: 3.4, lng: 5.7, altitude: 0.52 },
    feedbackFocus: { lat: 2.5, lng: 9.2, altitude: 0.33 },
    explanation:
      "Bioko sits off Cameroon’s coast. The country it belongs to has its mainland territory farther south.",
    source: source(
      "Government of Equatorial Guinea · Bioko Norte and Bioko Sur",
      "https://www.guineaecuatorialpress.com/noticias/el_presidente_termina_su_gira_por_las_dos_primeras_provincias_de_la_zona_insular",
    ),
  },
  {
    id: "svalbard",
    label: "Svalbard",
    title: "Farther north than you think.",
    prompt:
      "The Arctic archipelago of Svalbard is shown in darker yellow. Which country has sovereignty over it?",
    candidates: ["RUS", "GBR", "CAN", "NOR", "ISL", "USA"],
    names: [
      "Russia",
      "United Kingdom",
      "Canada",
      "Norway",
      "Iceland",
      "United States",
    ],
    focus: { lat: 69, lng: -8, altitude: 1.2 },
    feedbackFocus: { lat: 72, lng: 17, altitude: 0.75 },
    explanation:
      "The Svalbard Treaty recognizes this sovereignty. Russian settlements don’t change which country the islands belong to.",
    source: source(
      "Norwegian Government · sovereignty over Svalbard",
      "https://www.regjeringen.no/en/documents/meld.-st.-32-20152016/id2499962/?ch=3",
    ),
  },
  {
    id: "galapagos",
    label: "Galápagos",
    title: "An ocean away.",
    prompt:
      "The Galápagos Islands are shown in darker yellow. Which country are they part of?",
    candidates: ["PAN", "PER", "CHL", "COL", "CRI", "ECU"],
    names: ["Panama", "Peru", "Chile", "Colombia", "Costa Rica", "Ecuador"],
    focus: { lat: -3, lng: -83, altitude: 0.95 },
    feedbackFocus: { lat: -1, lng: -85, altitude: 0.65 },
    explanation:
      "The island province sits roughly 1,000 km west of its country’s mainland.",
    source: source(
      "Galápagos National Park · the archipelago",
      "https://galapagos.gob.ec/donde-nos-encontramos/",
    ),
  },
  {
    id: "reunion",
    label: "Réunion",
    title: "A very distant neighbor.",
    prompt:
      "Réunion, the island shown in darker yellow near Mauritius and Madagascar, is part of which country?",
    candidates: ["MDG", "MUS", "FRA", "ZAF", "IND", "GBR"],
    names: [
      "Madagascar",
      "Mauritius",
      "France",
      "South Africa",
      "India",
      "United Kingdom",
    ],
    focus: { lat: -20, lng: 51, altitude: 0.7 },
    feedbackFocus: { lat: 8, lng: 29, altitude: 1.45 },
    explanation:
      "This overseas department lies near Mauritius and Madagascar, a long way from its country’s European mainland.",
    source: source(
      "French Ministry for Overseas Territories · Réunion",
      "https://www.outre-mer.gouv.fr/territoires/la-reunion",
    ),
  },
];

export const FOURTEENTH_JOURNEY: Journey = {
  id: "island-instincts-v1",
  title: "Island instincts",
  description:
    "Island-hop around the world and resist the nearest-coast guess. Five islands reveal how distance and belonging can disagree.",
  rounds: definitions.map((definition): Question => {
    const island = islands.islands.find(
      (island) => island.id === definition.id,
    )!;
    const candidates = definition.candidates.map((code) => `wurl:${code}`);
    return defineQuestion({
      id: `island-owner-${definition.id}`,
      label: "Island",
      progressLabel: definition.label,
      topic: "island ownership",
      title: definition.title,
      leadIn: {
        "andaman-nicobar": "Start in the Bay of Bengal.",
        bioko: "Cross to the Gulf of Guinea.",
        svalbard: "Head far north to the Arctic.",
        galapagos: "Cross to the eastern Pacific.",
        reunion: "Finish in the Indian Ocean.",
      }[definition.id],
      prompt: definition.prompt,
      instruction: "",
      mode: "map-single",
      rule: { type: "territory-owner", countryId: island.countryId },
      count: 1,
      selection: { type: "ids", ids: candidates },
      choices: candidates.map((id, i) => ({ id, label: definition.names[i] })),
      disclosure: {
        hoverNames: true,
        namedChoices: true,
        committedNames: true,
        previousVisits: false,
      },
      commitment: "immediate",
      failure: "feedback",
      focus: definition.focus,
      feedbackFocus: definition.feedbackFocus,
      highlightParts: [
        {
          countryId: island.countryId,
          point: island.points[0],
          points: island.points,
          geometry: island.geometry as RegionFeature["geometry"],
          name: definition.label,
          tone: "dark",
          reveal: "part-and-owner",
        },
      ],
      map: {
        borders: false,
        borderIds: [...candidates, `clue-part:${island.countryId}`],
        hoverFeedback: true,
        muteOthers: true,
        candidates: "highlighted",
      },
      explanation: definition.explanation,
      source: definition.source,
      sources: [source(islands.source, islands.sourceUrl)],
    });
  }),
};
