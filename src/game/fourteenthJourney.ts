import { referenceFeature } from "./helpReferences";
import { defineQuestion } from "./questionBuilder";
import type { FactSource, Journey, Question } from "./questionContracts";
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
    guidance: {
      hint: "The owner’s mainland lies across the Bay of Bengal, rather than immediately east of the islands.",
      assist: {
        text: "India, Bangladesh, and Myanmar remain. Compare their mainland positions across the Bay of Bengal.",
        candidateIds: ["wurl:IND", "wurl:BGD", "wurl:MMR"],
        physicalFeatures: [referenceFeature("Bay of Bengal")],
        focus: { lat: 16, lng: 90, altitude: 1.05 },
      },
    },
    label: "Andaman & Nicobar",
    title: "Across the Bay of Bengal.",
    prompt:
      "The Andaman and Nicobar Islands are highlighted. Which country are they part of?",
    candidates: ["IND", "MMR", "BGD", "LKA", "IDN", "THA"],
    names: [
      "India",
      "Myanmar",
      "Bangladesh",
      "Sri Lanka",
      "Indonesia",
      "Thailand",
    ],
    focus: { lat: 12, lng: 92, altitude: 0.65 },
    feedbackFocus: { lat: 17, lng: 86, altitude: 0.85 },
    explanation:
      "These islands belong to India as a union territory, across the Bay of Bengal from much of its mainland. Their closeness to Southeast Asia does not determine their political home.",
    source: source(
      "Andaman and Nicobar Administration · union territory",
      "https://andamannicobar.gov.in/about",
    ),
  },
  {
    id: "bioko",
    guidance: {
      hint: "The same country also has mainland territory farther south along Africa’s coast.",
      assist: {
        text: "Equatorial Guinea, Cameroon, and Gabon remain. Compare the island with their mainland coasts.",
        candidateIds: ["wurl:GNQ", "wurl:CMR", "wurl:GAB"],
        focus: { lat: 2, lng: 10, altitude: 0.55 },
      },
    },
    label: "Bioko",
    title: "The coast can fool you.",
    prompt:
      "Bioko Norte and Bioko Sur share the highlighted island. Which country are these two provinces part of?",
    candidates: ["CMR", "NGA", "GAB", "STP", "GNQ", "BEN"],
    names: [
      "Cameroon",
      "Nigeria",
      "Gabon",
      "São Tomé and Príncipe",
      "Equatorial Guinea",
      "Benin",
    ],
    focus: { lat: 3.4, lng: 7, altitude: 0.45 },
    feedbackFocus: { lat: 2.5, lng: 9.2, altitude: 0.33 },
    explanation:
      "Bioko sits off Cameroon’s coast, but belongs to Equatorial Guinea. That country is divided between islands and a mainland territory farther south: the nearest coast is not the whole story.",
    source: source(
      "Government of Equatorial Guinea · Bioko Norte and Bioko Sur",
      "https://www.guineaecuatorialpress.com/noticias/el_presidente_termina_su_gira_por_las_dos_primeras_provincias_de_la_zona_insular",
    ),
  },
  {
    id: "svalbard",
    guidance: {
      hint: "A country can have settlements here without having sovereignty over the archipelago.",
      assist: {
        text: "Norway, Russia, and Iceland remain. Russian settlements can be found on these islands, but a settlement’s nationality need not decide sovereignty.",
        candidateIds: ["wurl:NOR", "wurl:RUS", "wurl:ISL"],
        focus: { lat: 72, lng: 15, altitude: 1.3 },
      },
    },
    label: "Svalbard",
    title: "Farther north than you think.",
    prompt:
      "The Arctic archipelago of Svalbard is highlighted. Which country has sovereignty over it?",
    candidates: ["RUS", "GBR", "CAN", "NOR", "ISL", "USA"],
    names: [
      "Russia",
      "United Kingdom",
      "Canada",
      "Norway",
      "Iceland",
      "United States",
    ],
    focus: { lat: 73, lng: 7, altitude: 1.05 },
    feedbackFocus: { lat: 72, lng: 17, altitude: 0.75 },
    explanation:
      "The Svalbard Treaty recognizes Norwegian sovereignty. Russian settlements are part of the archipelago’s story, but they do not make its islands Russian territory.",
    source: source(
      "Norwegian Government · sovereignty over Svalbard",
      "https://www.regjeringen.no/en/documents/meld.-st.-32-20152016/id2499962/?ch=3",
    ),
  },
  {
    id: "galapagos",
    guidance: {
      hint: "The islands lie close to the Equator, west of mainland South America.",
      assist: {
        text: "Ecuador, Colombia, and Peru remain. The Equator is now shown for comparison.",
        candidateIds: ["wurl:ECU", "wurl:COL", "wurl:PER"],
        overlays: [
          {
            id: "help:galapagos:equator",
            type: "parallel" as const,
            latitude: 0,
          },
        ],
        focus: { lat: -3, lng: -82, altitude: 1.05 },
      },
    },
    label: "Galápagos",
    title: "An ocean away.",
    prompt:
      "The Galápagos Islands are highlighted. Which country are they part of?",
    candidates: ["PAN", "PER", "CHL", "COL", "CRI", "ECU"],
    names: ["Panama", "Peru", "Chile", "Colombia", "Costa Rica", "Ecuador"],
    focus: { lat: -2, lng: -85, altitude: 0.8 },
    feedbackFocus: { lat: -1, lng: -85, altitude: 0.65 },
    explanation:
      "Roughly 1,000 km of Pacific water separates this Ecuadorian province from the mainland. Here, belonging spans an ocean gap rather than a shared land boundary.",
    source: source(
      "Galápagos National Park · the archipelago",
      "https://galapagos.gob.ec/donde-nos-encontramos/",
    ),
  },
  {
    id: "reunion",
    guidance: {
      hint: "Its political connection reaches to Europe, despite its Indian Ocean location.",
      assist: {
        text: "France, the United Kingdom, and Madagascar remain. Geographic closeness alone does not settle ownership.",
        candidateIds: ["wurl:FRA", "wurl:GBR", "wurl:MDG"],
      },
    },
    label: "Réunion",
    title: "A very distant neighbor.",
    prompt:
      "Réunion, the highlighted island near Mauritius and Madagascar, is part of which country?",
    candidates: ["MDG", "MUS", "FRA", "ZAF", "IND", "GBR"],
    names: [
      "Madagascar",
      "Mauritius",
      "France",
      "South Africa",
      "India",
      "United Kingdom",
    ],
    focus: { lat: -20, lng: 52, altitude: 0.6 },
    feedbackFocus: { lat: 8, lng: 29, altitude: 1.45 },
    explanation:
      "Réunion is an overseas department of France, near Mauritius and Madagascar. Our final island belongs to a country whose European mainland is on the other side of Africa.",
    source: source(
      "French Ministry for Overseas Territories · Réunion",
      "https://www.outre-mer.gouv.fr/territoires/la-reunion",
    ),
  },
];

export const FOURTEENTH_JOURNEY: Journey = {
  id: "island-instincts-v1",
  addedAt: "2026-10-10",
  title: "Island Instincts",
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
      resolvedLabel: `${definition.label} · ${definition.names[candidates.indexOf(island.countryId)]}`,
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
      guidance: definition.guidance,
      explanation: definition.explanation,
      source: definition.source,
      sources: [source(islands.source, islands.sourceUrl)],
      scenes: {
        play: {
          clueLocators: [
            {
              regionId: `clue-part:${island.countryId}`,
              label: definition.label,
            },
          ],
          focus: definition.focus,
          map: {
            borders: false,
            borderIds: [...candidates, `clue-part:${island.countryId}`],
            hoverFeedback: true,
            muteOthers: true,
            candidates: "highlighted",
          },
        },
        reveal: { focus: definition.feedbackFocus },
      },
    });
  }),
  completion: {
    focus: { lat: 12, lng: 45, altitude: 1.9 },
    views: definitions.map((definition) => definition.feedbackFocus),
    physicalFeatures: [],
    places: [],
    caption:
      "Across bays, open ocean, and the Arctic, these islands show why the nearest mainland is only part of the story. Distance, settlements, and political belonging do not always point to the same country.",
  },
};
