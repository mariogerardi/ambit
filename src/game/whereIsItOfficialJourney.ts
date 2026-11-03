import { definePresentation, defineQuestion } from "./questionBuilder";
import type { FactSource, Journey } from "./questionContracts";
import type { Focus } from "../geography/types";

const countries = (...codes: string[]) => codes.map((code) => `wurl:${code}`);
const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-11-03",
});
const assets = "/journeys/where-is-it-official/";
const world: Focus = { lat: 12, lng: -28, altitude: 2.2 };
export const OFFICIAL_LANGUAGE_NETWORKS = {
  Arabic: countries(
    "EGY",
    "DZA",
    "BHR",
    "TCD",
    "COM",
    "DJI",
    "IRQ",
    "JOR",
    "KWT",
    "LBN",
    "LBY",
    "MRT",
    "MAR",
    "OMN",
    "QAT",
    "SAU",
    "SOM",
    "SDN",
    "SYR",
    "TUN",
    "ARE",
    "YEM",
    "PSE",
    "MLI",
  ),
  Portuguese: countries(
    "PRT",
    "BRA",
    "AGO",
    "MOZ",
    "CPV",
    "GNB",
    "STP",
    "GNQ",
    "TLS",
  ),
  Russian: countries("RUS", "BLR", "KGZ", "KAZ"),
  Malay: countries("MYS", "BRN", "SGP", "IDN"),
  Guaraní: countries("PRY", "BOL"),
};
const base = definePresentation({
  label: "Official languages",
  topic: "Language and geography",
  instruction: "National official status counts.",
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
const tour = (
  language: keyof typeof OFFICIAL_LANGUAGE_NETWORKS,
  overview: Focus,
  views: Focus[],
) => ({
  play: { focus: world, contextIds: [], places: [], overlays: [] },
  reveal: {
    focus: overview,
    views,
    returnToSelection: true,
    contextIds: [],
    network: {
      regionIds: OFFICIAL_LANGUAGE_NETWORKS[language],
      label: "Official-language network",
    },
    places: [],
    overlays: [],
    physicalFeatures: [],
  },
});

// Source-workbench draft. Registration, scheduling and release remain separate.
export const WHERE_IS_IT_OFFICIAL_JOURNEY: Journey = {
  id: "where-is-it-official-v1",
  dailyEligible: false,
  addedAt: "2026-11-03",
  saveRevision: 1,
  title: "Where Is It Official?",
  description:
    "Five expressions, five languages, and a world of possible answers. Find one country; discover the wider connections.",
  mapAttribution: {
    label: "Natural Earth",
    url: "https://www.naturalearthdata.com/about/terms-of-use/",
  },
  rounds: [
    defineQuestion({
      ...base,
      id: "official-01-arabic",
      title: "A Familiar Script",
      progressLabel: "A Familiar Script",
      resolvedLabel: "Arabic · across regions",
      mode: "map-single",
      count: 1,
      commitment: "immediate",
      selection: { type: "world" },
      allowTyping: false,
      rule: {
        type: "country-ids",
        ids: OFFICIAL_LANGUAGE_NETWORKS.Arabic,
        match: "any",
      },
      textClue: {
        text: "الصبر مفتاح الفرج",
        lang: "ar",
        dir: "rtl",
        reveal: {
          language: "Arabic",
          translation: "Patience is the key to relief.",
        },
      },
      leadIn:
        "One expression can belong to a language used far beyond one country’s borders.",
      prompt: "Find a country where this language is official:",
      explanation:
        "Arabic connects North Africa and Southwest Asia with countries farther south, including Chad, Djibouti, Comoros and Somalia. Mali’s official languages include Hassaniya Arabic, a different variety from the Standard Arabic used in this proverb.",
      guidance: {
        hint: "This script is read from right to left. Look across North Africa and Southwest Asia.",
        assist: {
          text: "Six African countries are highlighted. Several give this language official status.",
          candidateIds: countries("MAR", "EGY", "TCD", "NER", "ETH", "KEN"),
        },
      },
      source: source(
        "UN Peacemaker · constitutional language provisions",
        "https://peacemaker.un.org/en/documents/table-provisions-arab-constitutions",
      ),
      sources: [
        source(
          "Mali Constitution · Article 31",
          "https://www.wipo.int/wipolex/en/legislation/details/22754",
        ),
        source(
          "UK PCGN · Mali official languages (2025 text)",
          "https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/1186430/Mali_toponymic_factfile-updated_2018.pdf",
        ),
        source(
          "Birzeit University · Arabic proverb attestation",
          "https://sina.birzeit.edu/qabas/lemma/2020148100",
        ),
      ],
      qualification:
        "The accepted Arabic umbrella includes Hassaniya in Mali. Somalia constitutionally recognizes Arabic as its second language; Sudan provides for official government use. Palestine uses the supported wurl:PSE map unit. Country evidence and these distinctions are documented in Sources.",
      scenes: tour("Arabic", { lat: 20, lng: 30, altitude: 2.2 }, [
        { lat: 22, lng: 8, altitude: 0.9 },
        { lat: 27, lng: 46, altitude: 0.85 },
      ]),
    }),
    defineQuestion({
      ...base,
      id: "official-02-portuguese",
      title: "Across Oceans",
      progressLabel: "Across Oceans",
      resolvedLabel: "Portuguese · across oceans",
      mode: "map-single",
      count: 1,
      commitment: "immediate",
      selection: { type: "world" },
      allowTyping: false,
      rule: {
        type: "country-ids",
        ids: OFFICIAL_LANGUAGE_NETWORKS.Portuguese,
        match: "any",
      },
      textClue: {
        text: "Às vezes, uma pequena mudança faz toda a diferença.",
        lang: "pt",
        reveal: {
          language: "Portuguese",
          translation: "Sometimes a small change makes all the difference.",
        },
      },
      leadIn: "Familiar-looking letters can open onto a much larger geography.",
      prompt: "Find a country where this language is official:",
      explanation:
        "Portuguese has official status in nine countries across four continents: Portugal, Brazil, six African countries and Timor-Leste. Maritime empire and colonization carried the language across oceans; independent states later made their own choices about its place in national life.",
      guidance: {
        hint: "This is a Romance language whose official reach expanded far beyond Europe by sea.",
        assist: {
          text: "Portugal, Brazil and four African countries remain in the candidate field. Several qualify.",
          candidateIds: countries("PRT", "BRA", "AGO", "NAM", "ZMB", "ZWE"),
        },
      },
      source: source(
        "Turismo de Portugal · nine CPLP member states",
        "https://www.turismodeportugal.pt/en/quem_somos/cooperacao-internacional/Pages/cplp-comunidade-dos-paises-de-lingua-portuguesa.aspx",
      ),
      sources: [
        source(
          "Timor-Leste Ministry of Education · official languages",
          "https://moe.gov.tl/en/national-curriculum/",
        ),
        source(
          "CPT · expression in contemporary use",
          "https://www.cpt.com.br/dicas-cursos-cpt/5-dicas-para-evitar-impasses-nas-negociacoes",
        ),
      ],
      qualification:
        "Equatorial Guinea qualifies through legal official status. The source expression is excerpted from a longer sentence. Macau’s regional status falls outside the country-level answer set.",
      scenes: tour("Portuguese", { lat: 5, lng: 60, altitude: 2.2 }, [
        { lat: -12, lng: -48, altitude: 0.95 },
        { lat: 2, lng: 8, altitude: 1.15 },
      ]),
    }),
    defineQuestion({
      ...base,
      id: "official-03-russian",
      title: "Beyond the Alphabet",
      progressLabel: "Beyond the Alphabet",
      resolvedLabel: "Russian · across borders",
      mode: "map-single",
      count: 1,
      commitment: "immediate",
      selection: { type: "world" },
      allowTyping: false,
      rule: {
        type: "country-ids",
        ids: OFFICIAL_LANGUAGE_NETWORKS.Russian,
        match: "any",
      },
      textClue: {
        text: "Не всё получается с первого раза.",
        lang: "ru",
        reveal: {
          language: "Russian",
          translation: "Not everything works on the first try.",
        },
      },
      leadIn:
        "An alphabet can cross languages and borders; official status is another clue.",
      prompt: "Find a country where this language is official:",
      explanation:
        "Russian has national legal standing beyond Russia. Belarus recognizes it alongside Belarusian, and Kyrgyzstan gives it official-language status. Kazakhstan names Kazakh as its official language and expressly provides for Russian’s official use in state and local institutions.",
      guidance: {
        hint: "Cyrillic is used by several languages. This Slavic language has national legal standing beyond its largest-speaking country.",
        assist: {
          text: "Compare Russia, Belarus, Kazakhstan, Ukraine, Uzbekistan and Tajikistan. Some qualify under the national-status rule.",
          candidateIds: countries("RUS", "BLR", "KAZ", "UKR", "UZB", "TJK"),
        },
      },
      source: source(
        "Kazakhstan · 2026 Constitution, Article 9",
        "https://www.gov.kz/org/maslikhat-ulken-naryn/press/news/details/1187713?lang=en",
      ),
      sources: [
        source(
          "Kyrgyz Republic · Constitution, Article 13",
          "https://www.gov.kg/ru/p/constitution",
        ),
        source(
          "Belarus · Constitution, Article 17",
          "https://wwwex.ilo.org/dyn/natlex2/natlex2/files/download/47034/BLR-47034.pdf",
        ),
        source(
          "Repeat · contemporary expression",
          "https://www.repeat.ru/article/kak-nachat-zanimatsya-sportom-i-sdelat-ehto-privychkoj",
        ),
      ],
      qualification:
        "Kazakhstan qualifies through constitutionally prescribed official governmental use. The original sentence uses ё explicitly; the contemporary source prints е and a question mark, an ordinary orthographic/punctuation variant.",
      scenes: tour("Russian", { lat: 40, lng: 65, altitude: 2.2 }, [
        { lat: 54, lng: 37, altitude: 0.9 },
        { lat: 44, lng: 73, altitude: 0.8 },
      ]),
    }),
    defineQuestion({
      ...base,
      id: "official-04-malay",
      title: "Familiar Letters, Unfamiliar Words",
      progressLabel: "Familiar Letters",
      resolvedLabel: "Malay · related national standards",
      mode: "map-single",
      count: 1,
      commitment: "immediate",
      selection: { type: "world" },
      allowTyping: false,
      rule: {
        type: "country-ids",
        ids: OFFICIAL_LANGUAGE_NETWORKS.Malay,
        match: "any",
      },
      textClue: {
        text: "Bagai aur bergantung ke tebing, bagai tebing bergantung ke aur.",
        lang: "ms",
        reveal: {
          language: "Malay",
          translation:
            "As bamboo depends on the riverbank, so the riverbank depends on bamboo.",
        },
      },
      leadIn:
        "The alphabet may look familiar, but these words offer a new puzzle.",
      prompt: "Find a country where this language is official:",
      explanation:
        "Malay links Malaysia, Brunei and Singapore across the South China Sea. Indonesia’s official national standard, Bahasa Indonesia, developed from Malay and is accepted here too. Singapore recognizes Malay alongside English, Mandarin and Tamil: one small country belongs to several official-language networks.",
      guidance: {
        hint: "Think of maritime Southeast Asia and closely related languages with different national names.",
        assist: {
          text: "Compare Malaysia, Brunei, Singapore, Indonesia, Thailand and the Philippines. Several qualify, including a related national standard.",
          candidateIds: countries("MYS", "BRN", "SGP", "IDN", "THA", "PHL"),
        },
      },
      source: source(
        "Malaysia language authority · proverb",
        "https://prpm.dbp.gov.my/Cari1?d=112548&keyword=bagai+aur+dengan+tebing",
      ),
      sources: [
        source(
          "Malaysia government · official language",
          "https://www.malaysia.gov.my/en/government/kenali-malaysia/official-language",
        ),
        source(
          "Brunei Information Department · official language",
          "https://www.information.gov.bn/Pages/AboutBrunei.aspx",
        ),
        source(
          "Singapore Constitution · Article 153A",
          "https://sso.agc.gov.sg/Act/CONS1963?Phrase=Official+Languages&ProvIds=pr153A-&ViewType=Within&WiAl=1",
        ),
        source(
          "Indonesia language agency · development from Malay",
          "https://badanbahasa.kemendikdasmen.go.id/artikel-detail/854/bahasa-sebagai-pemersatu-bangsa",
        ),
      ],
      qualification:
        "The generous acceptance policy includes Indonesia’s distinct national standard; it does not rename Indonesia’s official language as Bahasa Melayu.",
      scenes: tour("Malay", { lat: 8, lng: 109, altitude: 2.2 }, [
        { lat: 3, lng: 103, altitude: 0.42 },
        { lat: 3, lng: 114, altitude: 0.48 },
      ]),
    }),
    defineQuestion({
      ...base,
      id: "official-05-guarani",
      title: "Words That Remain",
      progressLabel: "Words That Remain",
      resolvedLabel: "Guaraní · living recognition",
      mode: "map-single",
      count: 1,
      commitment: "immediate",
      selection: { type: "world" },
      allowTyping: false,
      rule: {
        type: "country-ids",
        ids: OFFICIAL_LANGUAGE_NETWORKS["Guaraní"],
        match: "any",
      },
      textClue: {
        text: "Amáke ñandetuja ñanerakate’ỹ ñande rekove rehe.",
        lang: "gn",
        reveal: {
          language: "Guaraní",
          translation: "The older we grow, the more we value life.",
        },
      },
      leadIn:
        "This final expression belongs to a language whose story long predates today’s borders.",
      prompt: "Find a country where this language is official:",
      explanation:
        "Guaraní joins two neighboring countries through different national arrangements. Paraguay recognizes it alongside Spanish; Bolivia includes it among its constitutionally official Indigenous languages. An enduring spoken tradition is reflected in both a bilingual national framework and a much larger multilingual one.",
      guidance: {
        hint: "This is an Indigenous language of South America, used in everyday life and recognized by national law.",
        assist: {
          text: "Six countries in central South America remain. Two neighbors give this language national official status.",
          candidateIds: countries("PRY", "BOL", "ARG", "BRA", "URY", "PER"),
        },
      },
      source: source(
        "Domingo Aguilera Jiménez · Ñe’ẽnga II",
        "https://www.portalguarani.com/639_domingo_aguilera_jimenez/1619_ne_7868nga_ii__dichos_populares_paraguayos_2005__por_domingo_aguilera_jimenez.html",
      ),
      sources: [
        source(
          "Paraguay Constitution · Article 140",
          "https://www.diputados.gov.py/pdf/ConstitucionNacional_2024.pdf",
        ),
        source(
          "Bolivia Constitution · Article 5",
          "https://www.senapi.gob.bo/normativas/constitucion-politica-del-estado/constitucion-politica-del-estado-plurinacional-de-bolivia",
        ),
      ],
      qualification:
        "The Guaraní saying and its Spanish meaning are attested together; English is a meaning-based translation. Argentina’s regional recognition is outside this national-level rule.",
      scenes: tour("Guaraní", { lat: -15, lng: -50, altitude: 2.2 }, [
        { lat: -20, lng: -60, altitude: 0.7 },
      ]),
    }),
  ],
  completion: {
    focus: { lat: 8, lng: 30, altitude: 2.2 },
    orbit: true,
    mapMode: "cumulative",
    places: [],
    physicalFeatures: [],
    overlays: [],
    views: [
      { lat: 22, lng: 30, altitude: 1.15 },
      { lat: -6, lng: -20, altitude: 1.5 },
      { lat: 45, lng: 60, altitude: 1.15 },
      { lat: 2, lng: 110, altitude: 1.15 },
      { lat: -20, lng: -60, altitude: 1.1 },
      { lat: 8, lng: 30, altitude: 2.2 },
    ],
    mapAttribution: {
      label: "Language evidence and geographic data",
      url: assets + "SOURCES.md",
    },
    caption:
      "Five expressions connect places through regional ties, ocean crossings, neighboring states and living Indigenous traditions. Each chosen country is one doorway into a wider linguistic geography.",
  },
};
