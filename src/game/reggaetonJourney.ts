import { areaLabel, cityReference, explanationPlace } from "./authoredPlaces";
import { ANSWER_PLACES } from "./answerTargets";
import { geoDistance } from "d3-geo";
import { EARTH_KM } from "./spatial";
import { definePresentation, defineQuestion } from "./questionBuilder";
import type { FactSource, Journey } from "./questionContracts";
import type {
  Focus,
  MapOverlay,
  PhysicalFeature,
  PlaceFeature,
} from "../geography/types";
import canalContext from "./data/reggaeton-context.v1.json";

const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-19",
});
const folkways = source(
  "Smithsonian Folkways · Caribbean exchange and reggae en español",
  "https://slides.com/smithsonianfolkways/music-of-puerto-rico-09-notes/fullscreen",
);
const loopHistory = source(
  "Wayne Marshall · Dembow: A Loop History",
  "https://daily.redbullmusicacademy.com/2013/07/dembow-a-loop-history/",
);
const raids = source(
  "Raquel Z. Rivera · Policing Morality (1996)",
  "https://www.marxists.org/history/etol/newspape/atc/2425.html",
);
const migration = source(
  "Library of Congress · Puerto Rican migration and New York",
  "https://www.loc.gov/classroom-materials/immigration/puerto-rican-cuban/migrating-to-a-new-land/",
);
const territory = source(
  "USAGov · U.S. territories",
  "https://www.usa.gov/visit-territories",
);
const colombianScene = source(
  "El Colombiano · Four generations of Medellín reggaetón",
  "https://www.elcolombiano.com/cultura/historia-del-regatonen-medellin-jbalvin-karol-g-maluma-CM21696037",
);
const relocationSource = source(
  "Nicky Jam · rebuilding his career in Colombia",
  "https://www.univision.com/musica/reggaeton/nicky-jam-hubiera-terminado-en-cenizas",
);
const geographySource = source(
  "Natural Earth · physical geography",
  "https://www.naturalearthdata.com/downloads/10m-physical-vectors/",
);
const locationSource = (id: string, name: string) =>
  source(`GeoNames · ${name}`, `https://www.geonames.org/${id}/`);
const city = (id: string, name?: string): PlaceFeature => {
  const place = ANSWER_PLACES.get(`place:${id}`);
  if (!place) throw Error(`Missing reggaetón place: ${id}`);
  return { ...cityReference(place), ...(name ? { name } : {}) };
};
const localCity = (
  id: string,
  name: string,
  parentId: string,
  lat: number,
  lng: number,
) =>
  cityReference({
    id: `place:${id}`,
    sourceId: `geonames:${id}`,
    kind: "city",
    name,
    parentId,
    lat,
    lng,
  });
const label = (
  id: string,
  name: string,
  lat: number,
  lng: number,
  kind: PlaceFeature["kind"] = "ocean",
) =>
  areaLabel({
    id: `reggaeton:label:${id}`,
    name,
    lat,
    lng,
    kind,
    sourceId: "authored-area-label:2026-10-19",
    visualState: "hinted",
  });
const kingston = city("3489854");
const colon = localCity("3712076", "Colón", "wurl:PAN", 9.36025, -79.90019);
const panamaCity = city("3703443", "Panama City");
const newYork = city("5128581", "New York City");
const freeport = localCity(
  "5117949",
  "Freeport",
  "wurl:USA",
  40.6576,
  -73.58318,
);
const sanJuan = localCity(
  "4568127",
  "San Juan",
  "wurl:PRI",
  18.46633,
  -66.10572,
);
const medellin = city("3674962");
const nyCandidates = [
  city("4930956"),
  city("5110629"),
  newYork,
  city("4560349"),
  city("5206379"),
];
const canal: PhysicalFeature = canalContext.canal as PhysicalFeature;
const caribbean = label("caribbean", "Caribbean Sea", 11.5, -79.3);
const pacific = label("pacific", "Pacific Ocean", 7.8, -80.3);
const relocation: MapOverlay = {
  id: "reggaeton:nicky-jam-relocation",
  type: "path",
  dashed: true,
  coordinates: [
    [sanJuan.lng, sanJuan.lat],
    [medellin.lng, medellin.lat],
  ],
};
const relocationKm =
  Math.round(
    (geoDistance([sanJuan.lng, sanJuan.lat], [medellin.lng, medellin.lat]) *
      EARTH_KM) /
      100,
  ) * 100;
const panamaFocus: Focus = { lat: 9, lng: -80.2, altitude: 0.25 };
const canalFocus: Focus = { lat: 9.15, lng: -79.8, altitude: 0.16 };
const nyFocus: Focus = { lat: 41.4, lng: -75.4, altitude: 0.55 };
const freeportFocus: Focus = {
  lat: freeport.lat,
  lng: freeport.lng,
  altitude: 0.06,
};
const sanJuanFocus: Focus = {
  lat: sanJuan.lat,
  lng: sanJuan.lng,
  altitude: 0.12,
};
const diasporaFocus: Focus = { lat: 29, lng: -70, altitude: 1.2 };
const medellinFocus: Focus = {
  lat: medellin.lat,
  lng: medellin.lng,
  altitude: 0.2,
};
const connectionFocus: Focus = { lat: 12.4, lng: -70.8, altitude: 0.85 };
const base = definePresentation({
  instruction: "",
  failure: "feedback",
  disclosure: {
    hoverNames: false,
    namedChoices: false,
    committedNames: false,
    previousVisits: false,
  },
  map: {
    borders: true,
    hoverFeedback: false,
    muteOthers: true,
    revealOnAnswer: true,
    feedbackRegions: "neutral",
  },
});
const pinTiers = (bullseye: number, close: number, outer: number) => [
  { radiusKm: bullseye, feedback: "Bullseye!" },
  { radiusKm: close, feedback: "Very close." },
  { radiusKm: outer, feedback: "In range." },
];

export const REGGAETON_JOURNEY: Journey = {
  id: "the-sound-of-somewhere-reggaeton",
  title: "The Reggaetón Route",
  addedAt: "2026-10-19",
  saveRevision: 3,
  legacyRoundLabels: {
    "reggaeton-01-jamaica": "Jamaica · Kingston",
    "reggaeton-04-underground": "San Juan · the underground",
    "reggaeton-05-medellin": "Medellín · the Colombian scene",
  },
  description:
    "From Puerto Rico's underground to Colombian pop, trace reggaetón through Caribbean migration, Spanish-language reggae and an unexpected New York studio. A rhythm changes as people carry it between places.",
  mapAttribution: {
    label: "Natural Earth · public domain",
    url: "https://www.naturalearthdata.com/about/terms-of-use/",
  },
  rounds: [
    defineQuestion({
      ...base,
      id: "reggaeton-01-jamaica",
      // Keep stored round IDs stable across the editorial revision.
      title: "An Island Underground",
      label: "Underground",
      progressLabel: "An island underground",
      resolvedLabel: "Puerto Rico · San Juan",
      topic: "reggaeton",
      leadIn:
        "In Puerto Rico, DJs and rappers built an underground mixtape scene, mixing hip-hop with Jamaican dancehall.",
      prompt: "Find Puerto Rico on the globe.",
      instruction: "Tap the island.",
      mode: "map-single",
      count: 1,
      selection: {
        type: "ids",
        ids: ["wurl:CUB", "wurl:HTI", "wurl:JAM", "wurl:DOM", "wurl:PRI"],
      },
      commitment: "immediate",
      rule: { type: "country-ids", ids: ["wurl:PRI"] },
      guidance: {
        hint: "Look in the Greater Antilles. Puerto Rico is smaller than Cuba and Hispaniola, and lies farther east.",
        assist: {
          text: "Cuba and Jamaica are ruled out. Look just east of Hispaniola, the larger island shared by Haiti and the Dominican Republic.",
          candidateIds: ["wurl:PRI", "wurl:HTI", "wurl:DOM"],
        },
      },
      explanation:
        "San Juan's DJs, including Playero and Negro, mixed dancehall and hip-hop into tapes for local rappers. They circulated through parties and shops; police seizures in 1995 brought the underground into public controversy. The rhythms had already travelled far. Follow their roots across the Caribbean.",
      source: loopHistory,
      sources: [raids, folkways, locationSource("4568127", "San Juan")],
      scenes: {
        play: {
          focus: { lat: 20, lng: -74, altitude: 0.75 },
          map: {
            borders: true,
            hoverFeedback: true,
            candidates: "highlighted",
            feedbackRegions: undefined,
          },
        },
        reveal: {
          focus: sanJuanFocus,
          borders: true,
          answerIds: ["wurl:PRI"],
          places: [explanationPlace(sanJuan)],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "reggaeton-02-colon",
      title: "Across the Caribbean",
      label: "Coast",
      progressLabel: "Across the Caribbean",
      resolvedLabel: "Colón · reggae en español",
      topic: "reggaeton",
      leadIn:
        "Caribbean migration connected Jamaica with Panama long before Puerto Rico's mixtapes. Workers and their families settled around Colón, near the canal's Caribbean entrance.",
      prompt: "Drop a pin on that coast, as close to Colón as you can.",
      instruction: "",
      mode: "pin",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",
      rule: {
        type: "pin-distance",
        targetId: colon.id,
        radiusKm: 45,
        tiers: pinTiers(15, 30, 45),
      },
      guidance: {
        hint: "The Caribbean is on the north side of this part of the isthmus; the Pacific is to the south. The canal's Caribbean entrance is northwest of its Pacific entrance.",
        assist: {
          text: "Panama City is now marked on the Pacific side, and the two seas are labelled. Search northwest across the isthmus for the Caribbean entrance.",
        },
      },
      explanation:
        "In Afro-Panamanian communities, Jamaican reggae and dancehall took on Spanish lyrics. Renato, Nando Boom and El General carried reggae en español to new listeners. Colón faces the Caribbean; the canal crosses to the Pacific. The recording story next takes us north.",
      feedbackMapCaption:
        "Panama Canal · course between the locks; sea entrances not shown.",
      source: folkways,
      sources: [locationSource("3712076", "Colón"), geographySource],
      scenes: {
        play: {
          focus: panamaFocus,
          views: [{ lat: 14, lng: -78, altitude: 0.9 }, panamaFocus],
          contextIds: ["wurl:PAN", "wurl:JAM", "wurl:PRI"],
          places: [colon, kingston, sanJuan],
        },
        assist: { places: [panamaCity, caribbean, pacific] },
        reveal: {
          focus: canalFocus,
          views: [
            { lat: colon.lat, lng: colon.lng, altitude: 0.08 },
            canalFocus,
          ],
          places: [colon, panamaCity, kingston, sanJuan, caribbean, pacific],
          physicalFeatures: [canal],
          contextIds: ["wurl:PAN", "wurl:JAM", "wurl:PRI"],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "reggaeton-03-new-york",
      title: "The Unexpected Studio",
      label: "Studio",
      progressLabel: "The unexpected studio",
      resolvedLabel: "New York · Freeport",
      topic: "reggaeton",
      leadIn:
        "Near New York City, a Long Island studio brought Jamaican and Panamanian musicians together to record an influential version of the dembow loop.",
      prompt: "Which marker is New York City?",
      instruction: "",
      mode: "city-single",
      count: 1,
      selection: { type: "ids", ids: nyCandidates.map((place) => place.id) },
      commitment: "submit",
      rule: { type: "place-ids", ids: [newYork.id] },
      guidance: {
        hint: "Long Island extends east from New York Harbor. Find the city around the harbor at the island's western end, rather than an inland city or a port farther up the coast.",
        assist: {
          text: "Montréal is now marked to the north and the Atlantic is labelled offshore. Trace the coast to the harbor beside the long island extending east.",
        },
      },
      explanation:
        "In Freeport, Philip Smart's HC&F studio brought those musicians together. Dennis Thompson reworked a rhythm for Nando Boom; an instrumental version became a widely reused loop in Puerto Rico. The island's underground was making something new from recordings that crossed languages and borders.",
      source: loopHistory,
      sources: [
        source(
          "HC&F · Philip Smart and Freeport studio history",
          "https://artistagraph.com/studios/hc-f-studio",
        ),
        locationSource("5117949", "Freeport"),
        locationSource("5128581", "New York City"),
      ],
      scenes: {
        play: {
          focus: nyFocus,
          contextIds: ["wurl:USA", "wurl:JAM", "wurl:PAN", "wurl:PRI"],
          places: [...nyCandidates, kingston, colon, sanJuan],
        },
        assist: {
          places: [
            city("6077243"),
            label("atlantic", "Atlantic Ocean", 39, -71),
          ],
        },
        reveal: {
          focus: freeportFocus,
          views: [
            { lat: newYork.lat, lng: newYork.lng, altitude: 0.09 },
            freeportFocus,
          ],
          places: [...nyCandidates, freeport, kingston, colon, sanJuan],
          contextIds: ["wurl:USA", "wurl:JAM", "wurl:PAN", "wurl:PRI"],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "reggaeton-04-underground",
      title: "Two Shores of One Scene",
      label: "Diaspora",
      progressLabel: "Two shores of one scene",
      resolvedLabel: "Puerto Rico · U.S. territory",
      topic: "reggaeton",
      leadIn:
        "People and recordings moved between New York's Puerto Rican communities and the island, connecting hip-hop with the underground.",
      prompt:
        "What is Puerto Rico's political relationship to the United States?",
      mode: "choice-single",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",
      rule: {
        type: "choice-ids",
        ids: ["reggaeton:territory"],
      },
      shuffleChoices: true,
      choices: [
        {
          id: "reggaeton:independent",
          label: "An independent country",
        },
        {
          id: "reggaeton:territory",
          label: "A U.S. territory",
        },
        {
          id: "reggaeton:state",
          label: "A U.S. state",
        },
        {
          id: "reggaeton:district",
          label: "A U.S. federal district",
        },
      ],
      guidance: {
        hint: "Puerto Rico has its own local government, but people born there are U.S. citizens.",
        assist: {
          text: "It is part of the United States. Choose between state and territory.",
          candidateIds: ["reggaeton:territory", "reggaeton:state"],
        },
      },
      explanation:
        "Puerto Rico is a U.S. territory, and people born there are U.S. citizens. Migration linked the island with New York and hip-hop. Reggaetón grew through those exchanges, reaching international pop through hits such as Daddy Yankee's Gasolina. Its next generation would also find a home in Colombia.",
      source: territory,
      sources: [
        migration,
        loopHistory,
        source(
          "Library of Congress · Puerto Rico and U.S. citizenship",
          "https://guides.loc.gov/puerto-rico-research-guide",
        ),
      ],
      scenes: {
        play: {
          focus: diasporaFocus,
          contextIds: ["wurl:PRI", "wurl:JAM", "wurl:PAN", "wurl:USA"],
          places: [sanJuan, kingston, colon, newYork],
        },
        reveal: {
          focus: diasporaFocus,
          contextIds: ["wurl:PRI", "wurl:JAM", "wurl:PAN", "wurl:USA"],
          places: [sanJuan, kingston, colon, newYork],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "reggaeton-05-medellin",
      title: "A New Home for the Beat",
      label: "Crossover",
      progressLabel: "A new home for the beat",
      resolvedLabel: "San Juan–Medellín · 1,700 km",
      topic: "reggaeton",
      leadIn:
        "As reggaetón reached international audiences, Nicky Jam rebuilt his career in Medellín, Colombia.",
      prompt:
        "Roughly how far apart are San Juan and Medellín in a straight line?",
      instruction: "",
      inputLabel: "Distance in kilometres",
      mode: "slider",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",
      rule: {
        type: "numeric-range",
        value: relocationKm,
        min: 0,
        max: 5000,
        step: 50,
        unit: "km",
        tolerance: 500,
        tiers: [
          { tolerance: 100, feedback: "Beautifully estimated." },
          { tolerance: 300, feedback: "A close estimate." },
          { tolerance: 500, feedback: "Within range." },
        ],
      },
      guidance: {
        hint: "This crosses much of the Caribbean, but it is shorter than an Atlantic crossing. Both cities are marked; compare the gap with the size of the surrounding countries.",
        assist: {
          text: "A 1,000 km scale circle now surrounds San Juan. Use that radius as a ruler for the gap to Medellín, then adjust your estimate.",
        },
      },
      explanation:
        "In Medellín, Nicky Jam found listeners for his earlier music and developed a more melodic sound. J Balvin, Karol G, Maluma and the city's producers expanded reggaetón's pop reach. Shaped by Caribbean exchange, the rhythm was finding new voices—and listeners around the world.",
      feedbackMapCaption: `San Juan–Medellín · about ${relocationKm.toLocaleString("en-US")} km by great circle`,
      source: colombianScene,
      sources: [
        relocationSource,
        source(
          "The Washington Post · Nicky Jam's melodic reinvention in Colombia",
          "https://www.washingtonpost.com/entertainment/interactive/2024/reggaeton-dembow-evolution-timeline/",
        ),
        locationSource("3674962", "Medellín"),
        geographySource,
      ],
      scenes: {
        play: {
          focus: connectionFocus,
          views: [
            { lat: sanJuan.lat, lng: sanJuan.lng, altitude: 0.3 },
            connectionFocus,
          ],
          contextIds: [
            "wurl:COL",
            "wurl:PRI",
            "wurl:JAM",
            "wurl:PAN",
            "wurl:USA",
          ],
          places: [medellin, sanJuan, kingston, colon, newYork],
        },
        assist: {
          overlays: [
            {
              id: "reggaeton:distance-scale",
              type: "circle",
              center: { lat: sanJuan.lat, lng: sanJuan.lng },
              radiusKm: 1000,
            },
          ],
        },
        reveal: {
          focus: connectionFocus,
          views: [medellinFocus, connectionFocus],
          places: [medellin, sanJuan, kingston, colon, newYork],
          contextIds: [
            "wurl:COL",
            "wurl:PRI",
            "wurl:JAM",
            "wurl:PAN",
            "wurl:USA",
          ],
          overlays: [relocation],
        },
      },
    }),
  ],
  completion: {
    focus: { lat: 23, lng: -75, altitude: 1.2 },
    views: [
      sanJuanFocus,
      { lat: kingston.lat, lng: kingston.lng, altitude: 0.22 },
      canalFocus,
      { lat: newYork.lat, lng: newYork.lng, altitude: 0.18 },
      diasporaFocus,
      medellinFocus,
      { lat: 23, lng: -75, altitude: 1.2 },
    ],
    regionIds: ["wurl:PRI"],
    borders: true,
    physicalFeatures: [canal],
    overlays: [relocation],
    places: [kingston, colon, newYork, sanJuan, medellin].map((place) => ({
      ...place,
      displayRole: undefined,
      visualState: "visited",
    })),
    mapCaption:
      "Puerto Rico–Medellín · Nicky Jam's career move within a wider network of musical exchange",
    caption:
      "Puerto Rican mixtapes drew on Jamaican dancehall, Panamanian reggae en español and recordings made near New York. Medellín added new voices and pop possibilities. Migration and collaboration kept transforming the sound: reggaetón evolved as people made it their own.",
  },
};
