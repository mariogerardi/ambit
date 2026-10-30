import { definePresentation, defineQuestion } from "./questionBuilder";
import type {
  FactSource,
  FlagDisplay,
  Journey,
  Question,
} from "./questionContracts";
import type { Focus, PlaceFeature } from "../geography/types";
import { MAJOR_CITIES } from "../geography/places";
import { cityReference } from "./authoredPlaces";
import flagCatalog from "./data/flags.v1.json";

const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-29",
});
const countries = [
  ["MEX", "Mexico", "Eagle — Founding legend"],
  ["AND", "Andorra", "Cows — inherited heraldry"],
  ["BTN", "Bhutan", "Dragon — mythology and identity"],
  ["LKA", "Sri Lanka", "Lion — sovereignty"],
  ["BOL", "Bolivia", "Llama — native fauna and natural riches"],
] as const;
const mediaRoot = "/journeys/beasts-on-banners";
const detail = (number: number, stage: "original" | "clue") =>
  `${mediaRoot}/${String(number).padStart(2, "0")}-${stage}-detail.svg`;
const originalFull = (index: number) =>
  flagCatalog.flags.find(
    (flag) => flag.countryId === `wurl:${countries[index][0]}`,
  )!.src;
const detailAlts = [
  "Eagle clutching a serpent on a cactus in Mexico’s national emblem.",
  "Two red cows on gold in the lower-right quarter of Andorra’s coat of arms.",
  "Bhutan’s white thunder dragon holding jewels across yellow and orange.",
  "Sri Lanka’s golden lion holding an upright sword in its raised paw.",
  "A white llama beneath the mountains, beside wheat and a palm, in Bolivia’s coat of arms.",
];
const flags: FlagDisplay[] = countries.map(([, name, caption], index) => ({
  src: originalFull(index),
  alt: `${name === "Bolivia" ? "State" : "National"} flag of ${name}`,
  label: name,
  caption,
  ...(index === 2
    ? {}
    : {
        detail: { src: detail(index + 1, "original"), alt: detailAlts[index] },
      }),
}));
const focuses: Focus[] = [
  { lat: 23.91828, lng: -102.15712, altitude: 0.9 },
  { lat: 42.55, lng: 1.6, altitude: 0.08 },
  { lat: 27.4, lng: 90.4, altitude: 0.3 },
  { lat: 7.8, lng: 80.7, altitude: 0.3 },
  { lat: -17, lng: -64.8, altitude: 0.6 },
];
// Label anchors from the bundled Natural Earth country focus records. These
// name the reviewed areas without inventing city or answer markers.
const countryCenters = [
  [23.91828, -102.15712],
  [42.51129, 1.54024],
  [27.40861, 90.4126],
  [7.6316, 80.70516],
  [-16.67863, -64.69696],
];
const base = definePresentation({
  label: "Flag",
  topic: "animals on flags",
  instruction: "",
  failure: "feedback",
  disclosure: {
    hoverNames: false,
    namedChoices: true,
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
// INAH publishes this point in longitude/latitude order. It represents the
// ceremonial center, not an exact geographic claim about the legendary eagle.
const temploMayor: PlaceFeature = {
  id: "beasts:templo-mayor",
  name: "Templo Mayor · Mexico City",
  parentId: "wurl:MEX",
  lat: 19.434914,
  lng: -99.13145,
  kind: "other",
  sourceId: "inah:54175",
  labelFlexible: true,
};
const referenceCity = (id: string) =>
  cityReference(MAJOR_CITIES.find((p) => p.id === id)!);

function symbolQuestion(
  number: 2 | 3 | 4 | 5,
  data: {
    id: string;
    title: string;
    label: string;
    leadIn: string;
    prompt: string;
    answer: string;
    choices: NonNullable<Question["choices"]>;
    hint: string;
    assist: string;
    survivors: string[];
    explanation: string;
    alt: string;
    source: FactSource;
  },
) {
  const index = number - 1;
  const contextIds = [`wurl:${countries[index][0]}`];
  const modified = number !== 3;
  return defineQuestion({
    ...base,
    id: `beasts-${data.id}-v1`,
    title: data.title,
    label: data.label,
    progressLabel: countries[index][1],
    resolvedLabel: `${countries[index][1]} · ${data.label}`,
    leadIn: data.leadIn,
    prompt: data.prompt,
    mode: "choice-single",
    count: 1,
    selection: { type: "none" },
    commitment: "submit",
    rule: { type: "choice-ids", ids: [data.answer] },
    choices: data.choices,
    image: {
      src: modified ? detail(number, "clue") : originalFull(index),
      alt: data.alt,
      feedbackAlt: detailAlts[index],
      ...(modified
        ? {
            context: {
              src: `${mediaRoot}/${String(number).padStart(2, "0")}-clue.svg`,
              alt: `${countries[index][1]}’s flag, deliberately altered for this puzzle.`,
            },
          }
        : {}),
    },
    feedbackFlags: [flags[index]],
    correctFeedback: "Well spotted.",
    explanation: data.explanation,
    source: data.source,
    guidance: {
      hint: data.hint,
      assist: { text: data.assist, candidateIds: data.survivors },
    },
    scenes: {
      play: {
        contextIds,
        focus: focuses[index],
        ...(number === 2
          ? { clueLocators: [{ regionId: "wurl:AND", label: "Andorra" }] }
          : {}),
      },
      reveal: { contextIds, answerIds: [], focus: focuses[index] },
    },
  });
}

export const BEASTS_ON_BANNERS_JOURNEY: Journey = {
  id: "beasts-on-banners-v1",
  addedAt: "2026-10-29",
  saveRevision: 2,
  legacyRoundLabels: {
    "beasts-mexico-sign-v1": "Mexico City · a founding legend",
  },
  title: "Beasts on Banners",
  description:
    "Five creatures on five flags: uncover the legends, inherited emblems and living landscapes behind them.",
  completion: {
    flags,
    regionIds: countries.map(([code]) => `wurl:${code}`),
    focus: { lat: 5, lng: -85, altitude: 1.6 },
    views: [
      { lat: 5, lng: -85, altitude: 1.6 },
      { lat: 42.55, lng: 1.6, altitude: 0.55 },
      { lat: 17, lng: 85, altitude: 0.85 },
    ],
    physicalFeatures: [],
    places: countries.map(
      ([code, name], index): PlaceFeature => ({
        id: `beasts:country:${code}`,
        parentId: `wurl:${code}`,
        name,
        lat: countryCenters[index][0],
        lng: countryCenters[index][1],
        kind: "other",
        sourceId: "natural-earth:5.1.2",
        markerHidden: true,
        labelFlexible: true,
        priority: 90,
        visualState: "visited",
      }),
    ),
    caption:
      "Five animals, five different meanings. A founding eagle, inherited cows, a thunder dragon, a sword-bearing lion and a living Andean llama carry stories far beyond the natural world.",
  },
  rounds: [
    defineQuestion({
      ...base,
      id: "beasts-mexico-sign-v1",
      title: "The Sign",
      label: "Founding legend",
      progressLabel: "Mexico",
      resolvedLabel: "Mexico City · Founding legend",
      leadIn:
        "An eagle clutching a serpent atop a cactus marked the legendary founding place of Tenochtitlan.",
      prompt: "Place a pin where that ancient city once stood.",
      mode: "pin",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",
      rule: {
        type: "pin-distance",
        targetId: temploMayor.id,
        radiusKm: 300,
        tiers: [
          { radiusKm: 100, feedback: "Bullseye!" },
          { radiusKm: 200, feedback: "Very close." },
          { radiusKm: 300, feedback: "In range." },
        ],
      },
      image: {
        src: detail(1, "original"),
        alt: "Eagle, serpent and cactus in the central emblem of Mexico’s flag.",
        feedbackAlt: detailAlts[0],
        context: {
          src: originalFull(0),
          alt: "Mexico’s green, white and red flag with its central emblem.",
        },
      },
      feedbackFlags: [flags[0]],
      explanation:
        "According to Mexica tradition, an eagle perched on a cactus signaled where Tenochtitlan should be founded. The city rose among the waters of Lake Texcoco, and Mexico City eventually grew over its remains. Templo Mayor marks its former ceremonial center.",
      source: source(
        "INAH · Ancient settlement",
        "https://www.difusion.inah.gob.mx/images/guias/115_zona-arqueologica-templo-mayor.pdf",
      ),
      sources: [
        source(
          "INAH · Archaeological site record",
          "https://datos.inah.gob.mx/taxonomy/term/2025",
        ),
      ],
      guidance: {
        hint: "The Mexica established their city on an island in Lake Texcoco, within a high-altitude basin in central Mexico.",
        assist: {
          text: "Guadalajara and Oaxaca are marked as references. Look east of Guadalajara and northwest of Oaxaca, in the highland basin of central Mexico.",
        },
      },
      scenes: {
        play: {
          contextIds: ["wurl:MEX"],
          focus: focuses[0],
          places: [temploMayor],
        },
        assist: {
          places: [
            referenceCity("place:4005539"),
            referenceCity("place:3522507"),
          ],
        },
        reveal: {
          contextIds: ["wurl:MEX"],
          places: [temploMayor],
          focus: { lat: 19.434914, lng: -99.13145, altitude: 0.25 },
        },
      },
    }),
    symbolQuestion(2, {
      id: "andorra-heraldry",
      title: "A Curious Coat of Arms",
      label: "Inherited heraldry",
      leadIn: "One quarter of Andorra’s coat of arms has been tampered with.",
      prompt: "Which animals belong there?",
      answer: "andorra:cows",
      choices: [
        { id: "andorra:swans", label: "Four swans" },
        { id: "andorra:horses", label: "Three horses" },
        { id: "andorra:cows", label: "Two cows" },
        { id: "andorra:partridge", label: "A partridge in a pear tree" },
      ],
      alt: "Andorra’s coat of arms with a red question mark in its lower-right gold quarter.",
      hint: "The missing quarter belongs to Béarn’s historic coat of arms, one of the old heraldic connections preserved on Andorra’s shield. The animals are not a wildlife census.",
      assist:
        "Four swans and the partridge are ruled out. Choose between three horses and two cows.",
      survivors: ["andorra:horses", "andorra:cows"],
      explanation:
        "The pair comes from the old arms of Béarn, a historic territory north of the Pyrenees. Andorra’s four-part shield also recalls the Bishop of Urgell, Foix and Catalonia: its animals preserve a political history, rather than describe local fauna.",
      source: source(
        "Government of Andorra · Historic arms",
        "https://www.govern.ad/ca/l/4510908",
      ),
    }),
    symbolQuestion(3, {
      id: "bhutan-dragon",
      title: "The Dragon’s Roar",
      label: "Mythology and identity",
      leadIn: "The white dragon on Bhutan’s flag is called the Druk.",
      prompt:
        "Which natural phenomenon is associated with this mythical creature?",
      answer: "bhutan:thunder",
      choices: [
        { id: "bhutan:lightning", label: "Lightning" },
        { id: "bhutan:rain", label: "Monsoon rain" },
        { id: "bhutan:thunder", label: "Thunder" },
        { id: "bhutan:fire", label: "Fire" },
      ],
      alt: "White dragon with jewels across a yellow and orange background.",
      hint: "The Druk is closely associated with the powerful storms that sweep through Bhutan’s Himalayan valleys.",
      assist:
        "Monsoon rain and fire are ruled out. Choose between lightning and thunder.",
      survivors: ["bhutan:lightning", "bhutan:thunder"],
      explanation:
        "Bhutan is known as Druk Yul, the Land of the Thunder Dragon. Its white dragon represents the country’s identity, while the jewels in its claws signify wealth and perfection.",
      source: source(
        "Bhutan Ministry of Foreign Affairs · National symbols",
        "https://www.mfa.gov.bt/wp-content/uploads/2022/12/window-on-Bhutan-2022.pdf",
      ),
    }),
    symbolQuestion(4, {
      id: "sri-lanka-lion",
      title: "The Lion’s Missing Weapon",
      label: "Sovereignty",
      leadIn: "Something is missing from the golden lion on Sri Lanka’s flag.",
      prompt: "What does it normally hold in its raised paw?",
      answer: "sri-lanka:sword",
      choices: [
        { id: "sri-lanka:lotus", label: "A lotus" },
        { id: "sri-lanka:sword", label: "A sword" },
        { id: "sri-lanka:torch", label: "A torch" },
        { id: "sri-lanka:bow", label: "A bow" },
      ],
      alt: "Golden lion with a raised paw beside an empty space on maroon, with four corner leaves.",
      hint: "The lion has appeared on royal standards for centuries. The missing object expresses sovereignty and authority.",
      assist:
        "The lotus and torch are ruled out. Choose between a sword and a bow.",
      survivors: ["sri-lanka:sword", "sri-lanka:bow"],
      explanation:
        "Sri Lanka’s golden lion holds an upright sword symbolizing the nation’s sovereignty. The lion is associated with the Sinhalese people and predates the modern republic’s flag. The four bo leaves signify Buddhism and the virtues of loving-kindness, compassion, sympathetic joy and equanimity.",
      source: source(
        "Sri Lankan High Commission · National flag",
        "https://www.hc-wellington.gov.lk/pt/country-profile",
      ),
    }),
    symbolQuestion(5, {
      id: "bolivia-animal",
      title: "The Andean Animal",
      label: "Living wildlife",
      leadIn:
        "Bolivia’s coat of arms depicts the country’s natural riches, including an Andean animal standing beneath the mountains.",
      prompt: "Which camelid belongs in the missing space?",
      answer: "bolivia:llama",
      choices: [
        { id: "bolivia:alpaca", label: "Alpaca" },
        { id: "bolivia:llama", label: "Llama" },
        { id: "bolivia:vicuna", label: "Vicuña" },
        { id: "bolivia:guanaco", label: "Guanaco" },
      ],
      alt: "Mountain landscape in Bolivia’s coat of arms, with an empty patch of foreground beside wheat and a palm.",
      hint: "This domesticated Andean animal has long been used to carry goods across mountainous terrain.",
      assist:
        "Vicuña and guanaco are ruled out. Choose between llama and alpaca.",
      survivors: ["bolivia:alpaca", "bolivia:llama"],
      explanation:
        "Beneath the mountains of Potosí, Bolivia’s coat of arms depicts a llama alongside wheat and a palm. After mythical creatures and inherited emblems, this living Andean animal links a national symbol to the country’s landscapes and livelihoods.",
      source: source(
        "Bolivia · State symbols decree, articles 21 and 24",
        "https://www.lexivox.org/norms/BO-DS-N241.xhtml",
      ),
    }),
  ],
};
