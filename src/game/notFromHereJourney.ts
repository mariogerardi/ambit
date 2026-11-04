/**
 * Not From Here — source-ready Journey draft.
 * Intended path: src/game/notFromHereJourney.ts
 * Source basis: mariogerardi/ambit main @ ef8cc99404fd44f299306f038bffbac063666afd
 * Authored 2026-11-03; adapted locally from the supplied module.
 * Unregistered; structural verification is recorded with the companion brief.
 */
import { areaLabel, cityReference } from "./authoredPlaces";
import { definePresentation, defineQuestion } from "./questionBuilder";
import type { FactSource, Journey } from "./questionContracts";
import type { PlaceFeature } from "../geography/types";

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
  "Royal Botanic Gardens, Kew · Wickham's 1876 seed shipment from Santarém",
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
const portCandidates: PlaceFeature[] = [jeddah, mocha, aden].map(
  (place, index) => ({
    ...place,
    markerBadge: "ABC"[index],
    labelHidden: true,
    hoverName: "",
  }),
);
// City reveals retain the candidate badges so names can be matched to A/B/C.
const namedPorts: PlaceFeature[] = portCandidates.map((place) => ({
  ...place,
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
  parentId: "wurl:FRA",
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
  markerSize: 22,
};
const mauritiusReference = areaLabel({
  id: "not-from-here:mauritius-reference",
  name: "Mauritius",
  kind: "landform",
  lat: -20.3,
  lng: 57.58333,
  sourceId: "geonames:934292",
  visualState: "hinted",
});
const titicacaRevealed = areaLabel({
  id: "not-from-here:lake-titicaca-label",
  name: "Lake Titicaca",
  kind: "landform",
  lat: -15.9,
  lng: -69.35,
  sourceId: "not-from-here:descriptive-lake-anchor",
  visualState: "hinted",
});
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
      leadIn:
        "New Zealand made the kiwifruit famous, but its first seeds arrived from overseas in 1904.",
      prompt: "Which country did those seeds come from?",
      mode: "map-single",
      count: 1,
      commitment: "immediate",
      selection: { type: "world" },
      allowTyping: false,
      rule: { type: "country-ids", ids: ["wurl:CHN"] },
      correctFeedback: "Found its roots.",
      incorrectFeedback: "Not the origin.",
      guidance: {
        hint: "The plant originally grew in temperate East Asian forests, long before the marketing name existed.",
        assist: {
          text: "Three East Asian countries are now highlighted. Which one supplied the seeds?",
          candidateIds: ["wurl:CHN", "wurl:JPN", "wurl:KOR"],
        },
      },
      explanation:
        "China. Mary Isabel Fraser brought kiwifruit seeds to New Zealand in 1904 after visiting China. The fruit was long marketed as Chinese gooseberry; New Zealand exporters adopted the name 'kiwifruit' in 1959. Its globally familiar identity came much later than the plant itself.",
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
        reveal: {
          focus: { lat: 8, lng: 130, altitude: 1.7 },
          views: [
            { lat: 33, lng: 110, altitude: 0.85 },
            { lat: -39, lng: 173, altitude: 0.8 },
          ],
          network: {
            regionIds: ["wurl:CHN", "wurl:NZL"],
            label: "Kiwifruit · native home and adopted identity",
          },
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
      incorrectFeedback: "Not that pair.",
      guidance: {
        hint: "This high-altitude basin lies between a Pacific-facing Andean country and a landlocked neighbor.",
        assist: {
          text: "Four Andean countries remain highlighted. Two share the lake's shores.",
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
      ],
      scenes: {
        play: {
          // Continental orientation, intentionally NOT centered on Lake Titicaca.
          focus: { lat: -19, lng: -61, altitude: 1.28 },
          contextIds: [],
          places: [],
          overlays: [],
        },
        reveal: {
          focus: { lat: -16.5, lng: -69.6, altitude: 0.45 },
          places: [titicacaRevealed],
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
      leadIn:
        "Coffee crossed from northeastern Africa to Arabia. One port near the southern end of the Red Sea gave its name to a lasting part of coffee vocabulary.",
      prompt: "Which marked port is it?",
      mode: "city-single",
      count: 1,
      commitment: "submit",
      selection: { type: "ids", ids: [jeddah.id, mocha.id, aden.id] },
      allowTyping: false,
      rule: { type: "place-ids", ids: [mocha.id] },
      correctFeedback: "Found the port.",
      incorrectFeedback: "Different port.",
      guidance: {
        hint: "Look for a port on the Arabian side of the Red Sea, not one facing the open Gulf of Aden.",
        assist: {
          text: "Only the two southern ports remain. Which one faces the Red Sea itself?",
          candidateIds: [mocha.id, aden.id],
        },
      },
      explanation:
        "Mocha, on Yemen's Red Sea coast, was an important export port for coffee grown in Yemen's highlands. The coffee plant's African origins and the later cultivation and export networks around Yemen are different stages in its history. The port's name still echoes through coffee vocabulary.",
      qualification:
        "The three markers represent modern GeoNames populated-place centers, not surveyed historic docks. The clue concerns the historic trading port, not the ingredients of modern mocha-flavored drinks.",
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
          focus: { lat: 16.3, lng: 42.3, altitude: 0.5 },
          places: namedPorts,
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
      leadIn:
        "Vanilla was cultivated in Mexico long before a breakthrough in growing it happened on Réunion, a French island east of Madagascar and southwest of Mauritius.",
      prompt: "Place a pin as close to Réunion as you can.",
      mode: "pin",
      count: 1,
      commitment: "submit",
      selection: { type: "none" },
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
        hint: "Réunion is a compact volcanic island in the southwestern Indian Ocean, much smaller than Madagascar.",
        assist: {
          text: "Mauritius is now marked for reference. Search southwest of it for the separate island of Réunion.",
          places: [mauritiusReference],
          focus: { lat: -20.5, lng: 54.5, altitude: 0.46 },
        },
      },
      explanation:
        "In 1841, Edmond Albius, an enslaved 12-year-old on Réunion, devised a practical method of hand-pollinating vanilla flowers. His innovation helped vanilla cultivation flourish far outside its Mesoamerican history, including in Madagascar. He received no financial reward for the discovery.",
      qualification:
        "Vanilla planifolia was domesticated in Mesoamerica and has a broader native range than modern Mexico. This distance question uses Réunion's GeoNames geographic center, not the precise place Albius worked. The three inclusive accuracy tiers accept nearby pins over water as well as on the island.",
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
          focus: { lat: -19.2, lng: 51.5, altitude: 0.78 },
          contextIds: [],
          places: [reunionTarget],
          overlays: [],
          map: { feedbackRegions: "neutral" },
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
      title: "A Seed's Long Journey",
      progressLabel: "Rubber",
      resolvedLabel: "Rubber · Santarém to Kew",
      leadIn:
        "In 1876, thousands of Brazilian rubber-tree seeds left Santarém, an Amazon River port, bound for Britain and Kew Gardens.",
      prompt:
        "From Santarém, set the initial compass bearing of the shortest path toward London.",
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
        hint: "The destination is much farther north, as well as east. On a globe, the shortest course doesn't hold a fixed eastward heading.",
        assist: {
          text: "The dial now highlights north through east. Use the two locations to refine your departure direction.",
          compassSector: { start: 0, end: 90 },
        },
      },
      mapCaption:
        "Find the starting direction of the shortest path, not a ship's historical course.",
      feedbackMapCaption:
        "The great-circle comparison is not a reconstruction of the 1876 voyage.",
      explanation:
        "The shortest great-circle route starts northeast from Santarém. In 1876 Henry Wickham shipped tens of thousands of rubber-tree seeds from this Amazon port to Kew Gardens. Seedlings were sent onward to Sri Lanka, helping establish an Asian plantation industry far from the tree's Brazilian home. The compass line compares two places; it does not trace Wickham's ship.",
      qualification:
        "Santarém and London are modern city reference points. The historical port of departure was Santarém, not the mouth of the Amazon; London stands for Kew Gardens rather than a surveyed ship arrival dock. Initial bearing is approximately 32° true using these GeoNames centers.",
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
    focus: { lat: 8, lng: 15, altitude: 2.2 },
    views: [
      { lat: 20, lng: 125, altitude: 1.35 },
      { lat: -18, lng: -68, altitude: 0.85 },
      { lat: 14, lng: 43, altitude: 0.75 },
      { lat: -20, lng: 54, altitude: 0.76 },
      { lat: 24, lng: -25, altitude: 1.5 },
      { lat: 8, lng: 15, altitude: 2.2 },
    ],
    regionIds: [],
    physicalFeatures: [],
    overlays: [],
    places: [
      recapArea("kiwi-china", "Kiwifruit · China", 33, 109),
      recapArea("kiwi-nz", "Kiwifruit · New Zealand", -40, 173),
      recapArea("potato-andes", "Potatoes · Andes", -15.9, -69.35),
      recapArea("potato-ireland", "Potatoes · Ireland", 53, -8),
      recapArea("coffee-ethiopia", "Coffee · Ethiopia", 8.7, 39),
      recapArea("coffee-yemen", "Coffee · Yemen", 13.3, 43.25),
      recapArea("vanilla-mexico", "Vanilla · Mexico", 19.4, -97),
      recapArea("vanilla-reunion", "Vanilla · Réunion", -21.1, 55.6),
      recapArea("rubber-brazil", "Rubber · Brazil", -2.44, -54.71),
      recapArea("rubber-britain", "Rubber · Kew", 51.5, -0.28),
      recapArea("rubber-sri-lanka", "Rubber · Sri Lanka", 7.5, 80.8),
    ],
    mapCaption:
      "Paired labels show geographic associations, not exact original harvest sites or travel routes.",
    caption:
      "From Chinese vines and Andean fields to Red Sea trade, an Indian Ocean innovation and an Amazon seed shipment: familiar products gained new identities far from where their stories began. The map recalls five separate connections, not one continuous voyage.",
  },
};
