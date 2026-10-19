import {
  referenceCity,
  referenceFeature,
  referenceLabel,
} from "./helpReferences";
import { defineQuestion } from "./questionBuilder";
import type { Journey, Question } from "./questionContracts";

const destinations = [
  {
    code: "FIN",
    guidance: {
      hint: "Look east of Sweden and north of the Gulf of Finland.",
      assist: {
        text: "Stockholm and Saint Petersburg are now marked, with the Gulf of Finland labeled. Estimate your landing north of the gulf.",
        places: [
          referenceCity("Stockholm"),
          referenceCity("Saint Petersburg"),
          referenceLabel("Gulf of Finland", 59.8, 26),
        ],
        focus: { lat: 61, lng: 25, altitude: 0.85 },
      },
    },
    name: "Finland",
    focus: { lat: 57, lng: 41, altitude: 1.15 },
    explanation:
      "Finland lies between Sweden and Russia, with the Gulf of Finland along its southern edge. This northern corner of Europe begins our exploration of a much larger neighborhood.",
  },
  {
    code: "PRK",
    guidance: {
      hint: "Look on the northern half of the Korean Peninsula, between China and South Korea.",
      assist: {
        text: "Seoul and Changchun are now marked outside the target country. Estimate a landing between them.",
        places: [referenceCity("Seoul"), referenceCity("Changchun")],
        focus: { lat: 40, lng: 126, altitude: 0.65 },
      },
    },
    name: "North Korea",
    focus: { lat: 46, lng: 123, altitude: 1.15 },
    explanation:
      "North Korea meets Russia along a short stretch of the Tumen River near the coast. A country associated with the Korean Peninsula also belongs to Russia’s Pacific neighborhood.",
  },
  {
    code: "MNG",
    guidance: {
      hint: "Look in the broad inland space south of Russia and north of China.",
      assist: {
        text: "Irkutsk and Beijing are now marked outside the target country. Search inland between the two references.",
        places: [referenceCity("Irkutsk"), referenceCity("Beijing")],
        focus: { lat: 46, lng: 108, altitude: 1.1 },
      },
    },
    name: "Mongolia",
    focus: { lat: 40, lng: 113, altitude: 1.15 },
    explanation:
      "Mongolia lies between Russia and China, far from any ocean shore. After a narrow coastal meeting, Russia’s southern neighborhood opens into a broad inland country.",
  },
  {
    code: "GEO",
    guidance: {
      hint: "Look just east of the Black Sea and south of the Greater Caucasus.",
      assist: {
        text: "Trabzon and Baku are now marked. Use the eastern Black Sea shore and the Greater Caucasus to locate Georgia between them.",
        places: [referenceCity("Trabzon"), referenceCity("Baku")],
        physicalFeatures: [
          referenceFeature("Black Sea"),
          referenceFeature("Caucasus Mountains"),
        ],
        focus: { lat: 42, lng: 42, altitude: 0.75 },
      },
    },
    name: "Georgia",
    focus: { lat: 38, lng: 36, altitude: 1.15 },
    explanation:
      "Georgia faces the eastern Black Sea, with the Greater Caucasus along its northern side. Mountains, rather than a peninsula or open inland expanse, frame this part of Russia’s neighborhood.",
  },
  {
    code: "EST",
    guidance: {
      hint: "Look on the southern side of the Gulf of Finland, north of Latvia.",
      assist: {
        text: "Helsinki and Riga are now marked, with the Gulf of Finland labeled. Estimate the landing between the gulf and Latvia.",
        places: [
          referenceCity("Helsinki"),
          referenceCity("Riga"),
          referenceLabel("Gulf of Finland", 59.8, 26),
        ],
        focus: { lat: 58, lng: 25, altitude: 0.65 },
      },
    },
    name: "Estonia",
    focus: { lat: 54, lng: 38, altitude: 1.15 },
    explanation:
      "Estonia lies south of the Gulf of Finland, across the water from our first stop. We end near where we began, after following Russia’s neighbors across a continent.",
  },
];

export const FIFTEENTH_JOURNEY: Journey = {
  id: "try-not-to-click-russia-v1",
  addedAt: "2026-10-10",
  availability: "pool",
  title: "On Russia’s doorstep",
  description:
    "From the Baltic to the Pacific, Russia meets neighbors of very different shapes and sizes. Find five of them using coastlines and geography, with political borders hidden.",
  rounds: destinations.map(
    ({ code, name, focus, explanation, guidance }): Question =>
      defineQuestion({
        id: `russia-neighbor-${code.toLowerCase()}`,
        visualExceptions: {
          "open-search-background":
            "The target footprint is withheld; the map is an unrestricted search field.",
          "hidden-boundaries":
            "Estimate the named neighbor’s footprint from coastlines without political borders or names.",
        },
        label: "Neighbor",
        resolvedLabel: name,
        progressLabel: name,
        topic: "Russia’s neighbors",
        title: `Try not to click Russia: ${name}`,
        prompt: `Drop a pin inside ${name}.`,
        leadIn: {
          FIN: "Start on the western side of the giant neighbor.",
          PRK: "Jump east to its short border near the Pacific.",
          MNG: "Move inland to a broad landlocked neighbor.",
          GEO: "Head west again, this time to the Caucasus.",
          EST: "Circle back toward the Baltic for our final landing.",
        }[code],
        instruction:
          "Country borders are hidden. Estimate the country’s location and place a pin.",
        mode: "pin",
        rule: { type: "pin-inside", ids: [`wurl:${code}`] },
        count: 1,
        selection: { type: "none" },
        disclosure: {
          hoverNames: false,
          namedChoices: false,
          committedNames: false,
          previousVisits: false,
        },
        commitment: "submit",
        failure: "feedback",
        focus,
        guidance,
        explanation,
        source: {
          name: "Natural Earth · country boundaries",
          url: "https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/",
          reviewedOn: "2026-10-09",
        },
        scenes: {
          play: {
            map: {
              background: "open-search",
              borders: false,
              hoverFeedback: false,
              muteOthers: true,
              revealOnAnswer: true,
            },
          },
        },
      }),
  ),
  completion: {
    focus: { lat: 56, lng: 80, altitude: 1.65 },
    views: [
      { lat: 64, lng: 26, altitude: 0.7 },
      { lat: 40, lng: 127, altitude: 0.6 },
      { lat: 46, lng: 104, altitude: 0.9 },
      { lat: 42, lng: 44, altitude: 0.55 },
      { lat: 59, lng: 25, altitude: 0.5 },
    ],
    physicalFeatures: [],
    places: [],
    caption:
      "A northern gulf, a short river frontier, an inland expanse, and a mountain range: Russia’s neighbors span far more than one kind of border. Our return to the Baltic closes a neighborhood stretching across a continent.",
  },
};
