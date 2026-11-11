/**
 * Not From Here — source-ready Journey draft.
 * Intended path: src/game/notFromHereJourney.ts
 * Source basis: mariogerardi/ambit main @ ef8cc99404fd44f299306f038bffbac063666afd
 * Authored 2026-11-03; adapted locally from the supplied module.
 * Unregistered; structural verification is recorded with the companion brief.
 */
import { areaLabel, cityReference } from "./authoredPlaces";
import { definePresentation, defineQuestion } from "./questionBuilder";
import type { FactSource, Journey, Question } from "./questionContracts";
import type { Focus, PhysicalFeature, PlaceFeature } from "../geography/types";
import andesGeography from "./data/andes-context.v1.json";
import media from "./data/not-from-here-media.v1.json";
import { GLOBE_SYMBOLS } from "../globe/symbols";

// Product photographs use the existing Small Wonders photo/reveal composition.
const photo = (key: keyof typeof media) => {
  const { src, alt, caption, credit } = media[key];
  const image: NonNullable<Question["image"]> = {
    src,
    alt,
    feedbackAlt: alt,
    presentation: "photo",
  };
  return { image, feedbackImage: { src, alt, caption, credit } };
};

const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-11-03",
});

const kiwiHistory = source(
  "New Zealand History · Chinese gooseberry becomes kiwifruit",
  "https://nzhistory.govt.nz/chinese-gooseberry-becomes-kiwifruit",
);
const potatoHistory = source(
  "International Potato Center · native potato varieties and Lake Titicaca",
  "https://cipotato.org/potato/native-potato-varieties/",
);
const coffeeHistory = source(
  "Archives of Natural History · coffee cultivation and trade in Yemen",
  "https://doi.org/10.3366/anh.2015.0283",
);
const vanillaHistory = source(
  "Smithsonian Gardens · Edmond Albius and vanilla pollination",
  "https://gardens.si.edu/exhibitions/connective-power-of-orchids/section-4-orchid-innovation-the-vanilla-orchid/",
);
const rubberHistory = source(
  "Royal Botanic Gardens, Kew · Wickham’s 1876 seed shipment from Santarém",
  "https://www.kew.org/read-and-watch/michael-palin-on-hooker",
);

// These are GeoNames point records, not invented locations. Keeping them local
// permits city selection even when a small town is absent from bundled cities.
const mocha = cityReference({
  id: "place:78751",
  name: "Mocha",
  kind: "city",
  parentId: "wurl:YEM",
  lat: 13.31814,
  lng: 43.24991,
  sourceId: "geonames:78751",
});
const jeddah = cityReference({
  id: "place:105343",
  name: "Jeddah",
  kind: "city",
  parentId: "wurl:SAU",
  lat: 21.49012,
  lng: 39.18624,
  sourceId: "geonames:105343",
});
const aden = cityReference({
  id: "place:415189",
  name: "Aden",
  kind: "city",
  parentId: "wurl:YEM",
  lat: 12.77957,
  lng: 45.03852,
  sourceId: "geonames:415189",
});
const portCandidates: PlaceFeature[] = [jeddah, mocha, aden].map((place) => ({
  ...place,
  markerSize: GLOBE_SYMBOLS.candidate,
  labelHidden: true,
  hoverName: "",
}));
// Names and result symbols appear only after commitment.
const namedPorts: PlaceFeature[] = portCandidates.map((place) => ({
  ...place,
  markerBadge: undefined,
  labelHidden: false,
  hoverName: place.name,
}));

// The rule needs this target in `places` for distance grading. The play object
// deliberately has neither a visible marker nor a name label. Its reveal twin
// is explicitly visible; check both effective stages in the workbench.
const reunionTarget: PlaceFeature = {
  id: "not-from-here:reunion-center",
  name: "Réunion",
  kind: "landform",
  // Sovereignty belongs in the copy, not a highlight of all French land.
  lat: -21.1,
  lng: 55.6,
  sourceId: "geonames:935317",
  markerHidden: true,
  labelHidden: true,
  visualState: "surface",
  answerTarget: false,
};
const reunionRevealed: PlaceFeature = {
  ...reunionTarget,
  markerHidden: false,
  labelHidden: false,
  visualState: "answer",
  answerTarget: true,
};
const mauritiusReference = areaLabel({
  id: "not-from-here:mauritius-reference",
  name: "Mauritius",
  kind: "landform",
  lat: -20.3,
  lng: 57.58333,
  sourceId: "geonames:934292",
  visualState: "hinted",
  labelScale: 1.3,
});
// Reuse the reviewed Andes water geometry, exclusively after commitment.
const titicacaRevealed: PhysicalFeature = {
  ...(andesGeography.lake as PhysicalFeature),
  fillOpacity: 1,
};
const coffeeHighlands = [
  areaLabel({
    id: "not-from-here:ethiopian-highlands",
    name: "Ethiopian highlands",
    kind: "landform",
    lat: 9,
    lng: 39,
    sourceId: "not-from-here:regional-coffee-annotation",
    visualState: "hinted",
    labelScale: 1.3,
  }),
  areaLabel({
    id: "not-from-here:yemeni-highlands",
    name: "Yemeni highlands",
    kind: "landform",
    lat: 15.6,
    lng: 44.2,
    sourceId: "not-from-here:regional-coffee-annotation",
    visualState: "hinted",
    labelScale: 1.3,
  }),
];
const santarem = cityReference({
  id: "place:3389353",
  name: "Santarém",
  kind: "city",
  parentId: "wurl:BRA",
  lat: -2.44306,
  lng: -54.70833,
  sourceId: "geonames:3389353",
});
const london = cityReference({
  id: "place:2643743",
  name: "London",
  kind: "city",
  parentId: "wurl:GBR",
  lat: 51.50853,
  lng: -0.12574,
  sourceId: "geonames:2643743",
});

const southAmerica: Focus = { lat: -19, lng: -61, altitude: 1.28 };
// Frames fitted to the full assist candidate outlines, independent of answers.
const eastAsianCandidates: Focus = { lat: 39.629, lng: 109.48, altitude: 1.47 };
const andeanCandidates: Focus = { lat: -27.72, lng: -74.516, altitude: 1.35 };

// Recap anchors indicate regions and relationships, not claimed original
// collection sites, shipping routes or separately graded discoveries.
const recapArea = (
  id: string,
  name: string,
  lat: number,
  lng: number,
): PlaceFeature =>
  areaLabel({
    id: `not-from-here:recap:${id}`,
    name,
    kind: "other",
    lat,
    lng,
    sourceId: "not-from-here:recap-annotation",
    visualState: "hinted",
    labelScale: 1.3,
  });

const base = definePresentation({
  label: "Origins",
  topic: "the geography of introduced plants and products",
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
    muteOthers: false,
    candidates: "neutral",
  },
});

// New, unregistered edition. The approved gameplay is represented here;
// registration and scheduling have deliberately not been requested.
export const NOT_FROM_HERE_JOURNEY: Journey = {
  id: "not-from-here-v1",
  title: "Not From Here",
  description:
    "Five familiar products with surprising origins. Trace how geography, trade and invention gave them new homes.",
  addedAt: "2026-11-03",
  saveRevision: 1,
  dailyEligible: false,
  rounds: [
    defineQuestion({
      ...base,
      id: "not-from-here-01-kiwifruit",
      label: "Kiwifruit",
      title: "The False Passport",
      progressLabel: "Kiwifruit",
      resolvedLabel: "Kiwifruit · China to New Zealand",
      ...photo("kiwi"),
      leadIn:
        "New Zealand made the kiwifruit famous, but its first seeds arrived from overseas in 1904.",
      prompt: "Select the country those seeds came from.",
      mode: "map-single",
      count: 1,
      commitment: "submit",
      selection: { type: "world" },
      allowTyping: false,
      rule: { type: "country-ids", ids: ["wurl:CHN"] },
      correctFeedback: "Found its roots.",
      guidance: {
        hint: "The plant originally grew in temperate East Asian forests, long before the marketing name existed.",
        assist: {
          text: "Three East Asian countries are now highlighted. Which one supplied the seeds?",
          candidateIds: ["wurl:CHN", "wurl:JPN", "wurl:KOR"],
        },
      },
      explanation:
        "Mary Isabel Fraser brought kiwifruit seeds from China to New Zealand in 1904. The fruit was long marketed as Chinese gooseberry; New Zealand exporters adopted the name “kiwifruit” in 1959. Its globally familiar identity came much later than the plant itself.",
      source: kiwiHistory,
      sources: [
        source(
          "Zespri · early New Zealand kiwifruit history",
          "https://www.zespri.com/en-NZ/zespri-history",
        ),
      ],
      scenes: {
        play: {
          focus: { lat: 10, lng: 0, altitude: 2.2 },
          contextIds: [],
          places: [],
          overlays: [],
        },
        assist: { focus: eastAsianCandidates },
        reveal: {
          focus: { lat: 8, lng: 130, altitude: 1.7 },
          views: [
            { lat: 33, lng: 110, altitude: 0.85 },
            { lat: -39, lng: 173, altitude: 0.8 },
            { lat: 8, lng: 130, altitude: 1.7 },
          ],
          contextIds: ["wurl:NZL"],
          answerIds: ["wurl:CHN"],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "not-from-here-02-potatoes",
      label: "Potatoes",
      title: "Before Ireland",
      progressLabel: "Potatoes",
      resolvedLabel: "Potatoes · Peru and Bolivia",
      ...photo("potato"),
      leadIn:
        "Long before potatoes became an Irish staple, they were domesticated in the Andes near Lake Titicaca.",
      prompt: "Select the two present-day countries that share the lake.",
      mode: "map-multiple",
      count: 2,
      commitment: "submit",
      selection: { type: "world" },
      allowTyping: false,
      rule: { type: "country-ids", ids: ["wurl:PER", "wurl:BOL"] },
      partialCredit: "one-of-two",
      correctFeedback: "Both shores found.",
      guidance: {
        hint: "This high-altitude basin lies between a Pacific-facing Andean country and a landlocked neighbor.",
        assist: {
          text: "Four Andean countries are highlighted. Two share the lake’s shores.",
          candidateIds: ["wurl:PER", "wurl:BOL", "wurl:CHL", "wurl:ECU"],
        },
      },
      explanation:
        "Peru and Bolivia share Lake Titicaca. Farmers around its high-altitude basin began domesticating potatoes roughly 8,000 years ago. Andean cultivation created thousands of varieties long before potatoes spread to Europe and eventually became inseparable from Irish food history.",
      source: potatoHistory,
      sources: [
        source(
          "International Potato Center · primary origin around the Titicaca basin",
          "https://cipotato.org/genebankcip/potato-wild/",
        ),
        source(
          "Natural Earth · reviewed Lake Titicaca shoreline",
          "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_lakes.geojson",
        ),
      ],
      scenes: {
        play: {
          // Continental orientation, intentionally NOT centered on Lake Titicaca.
          focus: southAmerica,
          // An authored introduction keeps the continental view with world input.
          views: [southAmerica],
          contextIds: [],
          places: [],
          overlays: [],
        },
        assist: { focus: andeanCandidates },
        reveal: {
          focus: { lat: -15.8, lng: -69.3, altitude: 0.2 },
          physicalFeatures: [titicacaRevealed],
          answerIds: ["wurl:PER", "wurl:BOL"],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "not-from-here-03-coffee",
      label: "Coffee",
      title: "The Port of Mocha",
      progressLabel: "Coffee",
      resolvedLabel: "Coffee · Mocha, Yemen",
      ...photo("coffee"),
      leadIn:
        "Coffee crossed from northeastern Africa to Arabia. One of these ports gave its name to a familiar coffee drink.",
      prompt: "Select that port.",
      mode: "city-single",
      count: 1,
      commitment: "submit",
      selection: { type: "ids", ids: [jeddah.id, mocha.id, aden.id] },
      allowTyping: false,
      rule: { type: "place-ids", ids: [mocha.id] },
      correctFeedback: "Found the port.",
      guidance: {
        hint: "Look for a port on the Arabian side of the Red Sea, not one facing the open Gulf of Aden.",
        assist: {
          text: "Only the two southern ports remain. Which one faces the Red Sea itself?",
          candidateIds: [mocha.id, aden.id],
        },
      },
      explanation:
        "Mocha, on Yemen’s Red Sea coast, exported coffee grown in Yemen’s highlands. Coffee’s origins in the Ethiopian highlands and its later cultivation and trade through Yemen helped give it a global reach. The port’s name still echoes through coffee vocabulary.",
      qualification:
        "The markers locate present-day towns and cities rather than historical docks.",
      source: coffeeHistory,
      sources: [
        source("GeoNames · Mocha", "https://www.geonames.org/78751/mocha.html"),
        source(
          "GeoNames · Jeddah",
          "https://www.geonames.org/105343/jeddah.html",
        ),
        source("GeoNames · Aden", "https://www.geonames.org/415189/aden.html"),
      ],
      scenes: {
        play: {
          focus: { lat: 16.3, lng: 42.3, altitude: 0.52 },
          contextIds: [],
          places: portCandidates,
          overlays: [],
          map: { feedbackRegions: "neutral" },
        },
        reveal: {
          focus: { lat: 14.5, lng: 42.5, altitude: 0.75 },
          views: [
            { lat: 13.2, lng: 44, altitude: 0.24 },
            { lat: 14.5, lng: 42.5, altitude: 0.75 },
          ],
          places: [...namedPorts, ...coffeeHighlands],
          contextIds: ["wurl:ETH", "wurl:YEM"],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "not-from-here-04-vanilla",
      label: "Vanilla",
      title: "An Island Breakthrough",
      progressLabel: "Vanilla",
      resolvedLabel: "Vanilla · Réunion",
      ...photo("vanilla"),
      leadIn:
        "Vanilla was cultivated in Mexico long before a young innovator on Réunion found a way to pollinate its flowers by hand.",
      prompt: "Place a pin as close to Réunion as you can.",
      mode: "pin",
      count: 1,
      commitment: "submit",
      selection: { type: "none" },
      visualExceptions: {
        "open-search-background":
          "A regional island search needs a neutral land surface; Réunion’s target, label and accuracy rings remain hidden until commitment.",
      },
      rule: {
        type: "pin-distance",
        targetId: reunionTarget.id,
        radiusKm: 90,
        tiers: [
          { radiusKm: 25, feedback: "Precisely placed." },
          { radiusKm: 50, feedback: "Very close." },
          { radiusKm: 90, feedback: "In range." },
        ],
      },
      guidance: {
        hint: "Réunion is a small volcanic island in the southwestern Indian Ocean, east of Madagascar.",
        assist: {
          text: "Mauritius is now marked for reference. Search southwest of it for the separate island of Réunion.",
          places: [mauritiusReference],
          focus: { lat: -20.5, lng: 54.5, altitude: 0.46 },
        },
      },
      explanation:
        "In 1841, Edmond Albius, an enslaved 12-year-old on Réunion, devised a practical method of hand-pollinating vanilla flowers. His innovation helped vanilla cultivation flourish far outside its Mesoamerican history, including in Madagascar. He received no financial reward for the discovery.",
      qualification:
        "Vanilla’s history in Mesoamerica extends beyond modern Mexico. Pins are measured from Réunion’s geographic center and can score over nearby water.",
      source: vanillaHistory,
      sources: [
        source(
          "Smithsonian Institution · Vanilla planifolia native range and history",
          "https://www.si.edu/object/vanilla-planifolia%3Aofeo-sg_2007-0281B",
        ),
        source(
          "GeoNames · Réunion",
          "https://www.geonames.org/935317/reunion.html",
        ),
        source(
          "GeoNames · Mauritius",
          "https://www.geonames.org/934292/republic-of-mauritius.html",
        ),
      ],
      scenes: {
        play: {
          focus: { lat: 10, lng: 75, altitude: 2.2 },
          contextIds: [],
          places: [reunionTarget],
          overlays: [],
          map: { background: "open-search", feedbackRegions: "neutral" },
        },
        reveal: {
          focus: { lat: -21, lng: 55.7, altitude: 0.35 },
          places: [reunionRevealed, mauritiusReference],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "not-from-here-05-rubber",
      label: "Rubber",
      title: "A Seed’s Long Journey",
      progressLabel: "Rubber",
      resolvedLabel: "Rubber · Santarém to Kew",
      ...photo("rubber"),
      leadIn:
        "In 1876, thousands of Brazilian rubber-tree seeds left Santarém, an Amazon River port, bound for Britain and Kew Gardens.",
      prompt:
        "From Santarém, set the starting compass bearing of the shortest path toward London.",
      mode: "compass-bearing",
      count: 1,
      commitment: "submit",
      selection: { type: "none" },
      disclosure: { ...base.disclosure!, bearingDestination: true },
      rule: {
        type: "bearing-angle",
        origin: santarem,
        destination: london,
        tiers: [
          { degrees: 8, feedback: "Right on course." },
          { degrees: 18, feedback: "A close heading." },
          { degrees: 35, feedback: "Within range." },
        ],
      },
      guidance: {
        hint: "The destination is much farther north, as well as east. On a globe, the shortest course doesn’t hold a fixed eastward heading.",
        assist: {
          text: "The dial now highlights north through east. Use the two locations to refine your departure direction.",
          compassSector: { start: 0, end: 90 },
        },
      },
      feedbackMapCaption:
        "The solid line is a great-circle comparison, not the ship’s historical course.",
      explanation:
        "The shortest great-circle path starts northeast from Santarém. Henry Wickham’s 1876 shipment carried tens of thousands of rubber-tree seeds to Kew Gardens. Seedlings went on to Sri Lanka, helping establish an Asian plantation industry far from the tree’s Brazilian home.",
      qualification:
        "The endpoints are modern city centers; London represents nearby Kew Gardens.",
      source: rubberHistory,
      sources: [
        source(
          "Oxford University Herbaria · rubber seeds, Kew and Sri Lanka",
          "https://herbaria.plants.ox.ac.uk/bol/plants400/Profiles/GH/Hevea",
        ),
        source(
          "GeoNames · Santarém",
          "https://www.geonames.org/3389353/santarem.html",
        ),
        source(
          "GeoNames · London",
          "https://www.geonames.org/2643743/london.html",
        ),
      ],
      scenes: {
        play: {
          focus: { lat: 27, lng: -30, altitude: 1.65 },
          contextIds: [],
          places: [],
          overlays: [],
          map: { feedbackRegions: "neutral" },
        },
        reveal: {
          focus: { lat: 27, lng: -30, altitude: 1.6 },
          views: [
            { lat: -2.45, lng: -54.7, altitude: 0.75 },
            { lat: 28, lng: -30, altitude: 1.55 },
            { lat: 51.5, lng: -0.12, altitude: 0.75 },
          ],
          contextIds: ["wurl:BRA", "wurl:GBR"],
        },
      },
    }),
  ],
  completion: {
    mapMode: "cumulative",
    focus: { lat: -40, lng: 173, altitude: 0.85 },
    views: [
      { lat: 33, lng: 109, altitude: 0.85 },
      { lat: -40, lng: 173, altitude: 0.85 },
      { lat: -16, lng: -69, altitude: 0.6 },
      { lat: 53, lng: -4, altitude: 0.5 },
      { lat: 14.5, lng: 42.5, altitude: 0.75 },
      { lat: 19.4, lng: -97, altitude: 0.55 },
      { lat: -20.7, lng: 56.3, altitude: 0.3 },
      { lat: -2.44, lng: -54.71, altitude: 0.65 },
      { lat: 24, lng: -25, altitude: 1.8 },
      { lat: 7.5, lng: 80.8, altitude: 0.5 },
      { lat: -40, lng: 173, altitude: 0.85 },
    ],
    regionIds: [],
    contextIds: [
      "wurl:NZL",
      "wurl:IRL",
      "wurl:ETH",
      "wurl:YEM",
      "wurl:MEX",
      "wurl:BRA",
      "wurl:GBR",
      "wurl:LKA",
    ],
    physicalFeatures: [
      { ...titicacaRevealed, name: "Potatoes · Lake Titicaca" },
    ],
    overlays: [],
    places: [
      {
        ...recapArea("kiwi-china", "Kiwifruit · China", 33, 109),
        visualState: "visited",
      },
      recapArea("kiwi-nz", "Kiwifruit · New Zealand", -40, 173),
      recapArea("potato-ireland", "Potatoes · Ireland", 53, -8),
      { ...coffeeHighlands[0], name: "Coffee · Ethiopian highlands" },
      {
        ...mocha,
        name: "Coffee · Mocha, Yemen",
        visualState: "visited",
        displayRole: undefined,
      },
      recapArea("vanilla-mexico", "Vanilla · Mexico", 19.4, -97),
      {
        ...areaLabel(reunionRevealed),
        name: "Vanilla · Réunion",
        labelScale: 1.3,
        visualState: "visited",
        displayRole: undefined,
        answerTarget: false,
      },
      { ...santarem, name: "Rubber · Santarém" },
      {
        ...london,
        name: "Rubber · London (Kew)",
        visualState: "visited",
        displayRole: undefined,
      },
      recapArea("rubber-sri-lanka", "Rubber · Sri Lanka", 7.5, 80.8),
    ],
    mapCaption:
      "Rubber’s arc is a great-circle comparison, not the 1876 voyage. Other labels mark regional associations.",
    caption:
      "A new name, generations of cultivation, a trading port, an ingenious technique and a seed shipment: five different forces helped familiar products find new homes and identities.",
  },
};
