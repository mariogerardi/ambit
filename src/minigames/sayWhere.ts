import languages from "../../sources/say-where/say-where-languages.json";
import expressions from "../../sources/say-where/say-where-expressions.json";
import { comparisonFocus } from "../globe/camera";
import type { Focus } from "../geography/types";
import { defineQuestion } from "../game/questionBuilder";
import type {
  FactSource,
  Journey,
  QuestionContext,
} from "../game/questionContracts";
import type { NeighborPair } from "./sharedNeighbors";
import { neighborDeck } from "./sharedNeighbors";

export const SAY_WHERE_RESEARCH = { languages, expressions };
export const SAY_WHERE_POLICY =
  "National official or co-official status, or legally prescribed national government use, qualifies. Widespread spoken use alone does not.";
export const SAY_WHERE_HELD: Record<string, string> = {
  "sw-ms-01": "Cross-language applicability to Indonesian remains unresolved.",
  "sw-id-01": "Cross-language applicability to Malay remains unresolved.",
  "sw-hi-01":
    "The Sanskrit-derived wording also needs a Nepali-language acceptance review.",
};
const extraSources: Record<string, FactSource[]> = {
  vi: [
    {
      reviewedOn: "2026-11-11",
      name: "Vietnam Government · Law 64/2025/QH15, Article 7(1)",
      url: "https://xaydungchinhsach.chinhphu.vn/toan-van-luat-so-64-2025-qh15-ban-hanh-van-ban-quy-pham-phap-luat-119250311155839688.htm",
    },
  ],
  hi: [
    {
      reviewedOn: "2026-11-11",
      name: "Fiji Government · World Hindi Conference address",
      url: "https://www.fiji.gov.fj/he-president-ratu-wiliame-katonivere-at-the-opening-of-the-12th-world-hindi-conference/",
    },
  ],
  fa: [
    {
      reviewedOn: "2026-11-11",
      name: "University of Chicago · national varieties of Persian",
      url: "https://mes.uchicago.edu/languages/persian-language-program",
    },
    {
      reviewedOn: "2026-11-11",
      name: "Afghanistan Ministry of Foreign Affairs · official languages",
      url: "https://mfa.gov.af/en/background/",
    },
    {
      reviewedOn: "2026-11-11",
      name: "Tajikistan Ministry of Foreign Affairs · Constitution, Article 2",
      url: "https://www.mid.tj/index.php/en/main/tajikistan/constitution",
    },
  ],
};
const sharedSources: FactSource[] = [
  {
    reviewedOn: "2026-11-11",
    name: "Malaysian Federal Territories Mufti · Malay use of lama tidak bertemu",
    url: "https://www.muftiwp.gov.my/ar/artikel/al-kafi-li-al-fatawi/5951-al-kafi-1990-benarkah-terdapat-larangan-memeluk-sahabatnya-apabila-bertemu",
  },
  {
    reviewedOn: "2026-11-11",
    name: "Little Heritage House, Malaysia · Selamat Makan menu",
    url: "https://littleheritagehouse.com.my/wp-content/uploads/2020/10/CMCO-Tiffin-Carrier-Set_Complete-2.pdf",
  },
];
const broadened: Record<string, string[]> = {
  hi: ["IND", "FJI"],
  fa: ["IRN", "AFG", "TJK"],
};
const names: Record<string, string> = {
  fa: "Persian · Farsi, Dari and Tajik varieties",
};
export interface SayWherePair extends NeighborPair {
  languageId: string;
  language: string;
  expression: (typeof expressions)[number];
  answerIds: string[];
  sources: FactSource[];
  qualification: string;
}
const acceptedCountries = (id: string) =>
  broadened[id] ?? languages.find((l) => l.id === id)!.qualifying_country_codes;

const clueFingerprint = (text: string) => {
  let hash = 2166136261;
  for (const char of text)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16);
};

/** Research is preserved verbatim; reviewed acceptance changes live separately here. */
export function sayWherePairs(): SayWherePair[] {
  return expressions
    .filter((e) => !SAY_WHERE_HELD[e.id])
    .map((expression) => {
      const language = languages.find((l) => l.id === expression.language_id)!;
      const shared = ["sw-id-02", "sw-id-03"].includes(expression.id);
      const codes = shared
        ? [...new Set([...acceptedCountries("ms"), ...acceptedCountries("id")])]
        : acceptedCountries(language.id);
      const answerIds = codes.map((code) => `wurl:${code}`);
      return {
        id: `say-where-v1:${expression.id}:${codes.join("+")}:${clueFingerprint(expression.native_text)}`,
        // Compatibility with the shared round/deck envelope; these are not play clues.
        countries: [answerIds[0], answerIds[0]],
        answer: answerIds[0],
        answerIds,
        languageId: language.id,
        language: shared
          ? "Malay / Indonesian"
          : (names[language.id] ?? language.language_name),
        expression,
        sources: [
          {
            reviewedOn: expression.source_checked_on,
            name: expression.authenticity_source.title,
            url: expression.authenticity_source.url,
          },
          ...language.country_evidence.map((e) => ({
            reviewedOn: language.status_checked_on,
            name: e.source.title,
            url: e.source.url,
          })),
          ...(extraSources[language.id] ?? []),
          ...(shared ? sharedSources : []),
          ...(shared
            ? languages
                .find((l) => l.id === "ms")!
                .country_evidence.map((e) => ({
                  reviewedOn: language.status_checked_on,
                  name: e.source.title,
                  url: e.source.url,
                }))
            : []),
        ].filter(
          (s, i, all) => all.findIndex((other) => other.url === s.url) === i,
        ),
        qualification: shared
          ? "This wording is attested in Malay and Indonesian. Countries qualifying through either language are accepted."
          : language.id === "fa"
            ? "The sample is Iranian Persian. The accepted Persian network includes the related national varieties Dari in Afghanistan and Tajik Persian in Tajikistan; their everyday wording and writing systems differ."
            : language.id === "hi"
              ? "The sample is standard Hindi. Fiji also qualifies through officially recognized Hindi; the everyday Fiji Hindi variety differs."
              : language.id === "vi"
                ? "Vietnamese is constitutionally the national language, and Article 7(1) of Law 64/2025/QH15 requires its use in legal normative documents."
                : language.id === "ru"
                  ? "Kazakhstan qualifies through officially authorized government use under Article 9(2) of its 2026 constitution."
                  : language.id === "nl"
                    ? "Belgium's co-official languages have territorially regulated use. Regional-only recognition in otherwise nonqualifying countries does not count."
                    : language.id === "it"
                      ? "Vatican City qualifies through Italian's official working use; this is distinct from Latin in the Holy See."
                      : SAY_WHERE_POLICY,
      };
    });
}

/** Each cycle visits every language once; its expressions rotate independently. */
export function sayWhereDeck(
  pairs: SayWherePair[],
  seed: number,
  cycle: number,
): SayWherePair[] {
  const groups = new Map<string, SayWherePair[]>();
  for (const pair of pairs)
    groups.set(pair.languageId, [...(groups.get(pair.languageId) ?? []), pair]);
  const chosen = [...groups.values()].map(
    (group) => group[(seed + cycle) % group.length],
  );
  return neighborDeck(chosen, seed, cycle);
}
export const sayWhereRoundCount = (pairs: NeighborPair[]) =>
  new Set((pairs as SayWherePair[]).map((p) => p.languageId)).size;

/** Regional stops describe the revealed network, independently of the player's guess. */
function sayWhereViews(pair: SayWherePair, context: QuestionContext): Focus[] {
  switch (pair.languageId) {
    case "pt":
      return [
        { lat: 5, lng: -20, altitude: 2 },
        { lat: -4, lng: 20, altitude: 1.5 },
        { lat: -9, lng: 125, altitude: 0.8 },
      ];
    case "ru":
      return [{ lat: 50, lng: 65, altitude: 1.6 }];
    case "nl":
      return [
        { lat: 51, lng: 5, altitude: 0.8 },
        { lat: 5, lng: -55, altitude: 0.8 },
      ];
    case "hi":
      return [
        { lat: 22, lng: 79, altitude: 1 },
        { lat: -18, lng: 178, altitude: 0.8 },
      ];
    default: {
      const focus = comparisonFocus(
        pair.answerIds.map((id) => context.targets.get(id)!.focus),
      );
      return [{ ...focus, altitude: Math.max(0.8, focus.altitude ?? 0.8) }];
    }
  }
}

export function sayWhereJourney(
  pair: SayWherePair,
  context: QuestionContext,
): Journey {
  const countries = new Intl.ListFormat("en", {
    style: "long",
    type: "conjunction",
  }).format(
    pair.answerIds.map((id) =>
      id === "wurl:VAT"
        ? "Vatican City"
        : id === "wurl:NLD"
          ? "the Netherlands"
          : context.names.get(id)!,
    ),
  );
  const language =
    pair.languageId === "fa"
      ? "Persian"
      : pair.languageId === "sw"
        ? "Swahili"
        : pair.languageId === "el"
          ? "Modern Greek"
          : pair.language.replace(" / ", " or ");
  const views = sayWhereViews(pair, context);
  return {
    id: "minigame-say-where",
    title: "Say Where?",
    description: "Read the expression. Find where its language is official.",
    rounds: [
      defineQuestion({
        id: pair.id,
        label: "An expression, a world of answers",
        title: "Say Where?",
        topic: "official languages",
        prompt:
          "Select a sovereign country where this language is used officially.",
        instruction:
          "National official/co-official status or legally prescribed government use counts.",
        mode: "map-single",
        rule: { type: "country-ids", ids: pair.answerIds, match: "any" },
        count: 1,
        selection: { type: "world" },
        commitment: "submit",
        failure: "feedback",
        disclosure: {
          hoverNames: false,
          namedChoices: false,
          committedNames: false,
          previousVisits: false,
        },
        textClue: {
          text: pair.expression.native_text,
          lang: pair.expression.language_tag,
          dir: pair.expression.direction as "ltr" | "rtl",
          reveal: {
            language: pair.language,
            translation: pair.expression.english_translation,
          },
        },
        explanation: `${language} is used officially in ${countries}.`,
        qualification: pair.qualification,
        source: pair.sources[0],
        sources: pair.sources.slice(1),
        map: {
          borders: true,
          hoverFeedback: false,
          muteOthers: false,
          candidates: "neutral",
        },
        scenes: {
          play: {
            focus: { lat: 12, lng: 24, altitude: 2.2 },
            contextIds: [],
            places: [],
            overlays: [],
          },
          reveal: {
            focus: views[0],
            views,
            returnToSelection: false,
            network: {
              regionIds: pair.answerIds,
              label: "Qualifying countries",
            },
          },
        },
      }),
    ],
  };
}
