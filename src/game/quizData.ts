import snapshot from "./data/capitals.v1.json";
import type { PlaceFeature } from "../geography/types";
import type { FactSource } from "./questions";
export interface Capital extends PlaceFeature {
  countryId: string;
  continent: string;
  aliases: string[];
  role: string;
}
export const CAPITALS: Capital[] = snapshot.capitals.map((c) => ({
  ...c,
  kind: "capital",
  parentId: c.countryId,
}));
export const capitalSource: FactSource = {
  name: "GeoNames · pinned primary capital coordinates",
  url: "https://www.geonames.org/",
  reviewedOn: "2026-10-05",
};
export const languageSource: FactSource = {
  name: "Government of Canada · official languages",
  url: "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/discover-canada/read-online/canadian-symbols.html",
  reviewedOn: "2026-10-05",
};
export const LANGUAGES = [
  ["eng", "English"],
  ["fra", "French"],
  ["spa", "Spanish"],
  ["por", "Portuguese"],
  ["deu", "German"],
  ["nld", "Dutch"],
].map(([code, label]) => ({ id: `language:${code}`, label }));
// Only reviewed national-official relationships are queried. This is not a
// worldwide spoken-language database; regional/territorial status is separate.
export const OFFICIAL_LANGUAGES: Record<string, string[]> = {
  "wurl:CAN": ["language:eng", "language:fra"],
};
export const languageFamilySource: FactSource = {
  name: "Encyclopaedia Iranica · Central Asian language families",
  url: "https://www.iranicaonline.org/articles/central-asia-xiv/",
  reviewedOn: "2026-10-05",
};
export const tajikSource: FactSource = {
  name: "Encyclopaedia Iranica · Tajik Persian",
  url: "https://www.iranicaonline.org/articles/tajik-ii-tajiki-persian/",
  reviewedOn: "2026-10-05",
};
// This reviewed subset describes the titular national language, not every
// language spoken in a country or a claim about exclusive language use.
export const COUNTRY_LANGUAGE_PROFILES: Record<
  string,
  {
    language: string;
    familyId: string;
    familyLabel: string;
    branch?: string;
    source: FactSource;
  }
> = {
  "wurl:KAZ": {
    language: "Kazakh",
    familyId: "family:turkic",
    familyLabel: "Turkic",
    source: languageFamilySource,
  },
  "wurl:KGZ": {
    language: "Kyrgyz",
    familyId: "family:turkic",
    familyLabel: "Turkic",
    source: languageFamilySource,
  },
  "wurl:TKM": {
    language: "Turkmen",
    familyId: "family:turkic",
    familyLabel: "Turkic",
    source: languageFamilySource,
  },
  "wurl:UZB": {
    language: "Uzbek",
    familyId: "family:turkic",
    familyLabel: "Turkic",
    source: languageFamilySource,
  },
  "wurl:TJK": {
    language: "Tajik",
    familyId: "family:indo-european",
    familyLabel: "Indo-European",
    branch: "Iranian",
    source: tajikSource,
  },
};
// Country-language facts are partial. Compound counts require a separately
// reviewed complete positive index so missing facts never silently mean "no".
export const OFFICIAL_LANGUAGE_COUNTRIES: Record<
  string,
  { countryIds: string[]; source: FactSource }
> = {};
export const FEATURES: Record<
  string,
  { name: string; countryIds: string[]; source: FactSource }
> = {
  mediterranean: {
    name: "Mediterranean Sea",
    countryIds: [
      "ALB",
      "DZA",
      "BIH",
      "HRV",
      "CYP",
      "EGY",
      "FRA",
      "GRC",
      "ISR",
      "ITA",
      "LBN",
      "LBY",
      "MLT",
      "MCO",
      "MNE",
      "MAR",
      "SVN",
      "ESP",
      "SYR",
      "TUN",
      "TUR",
      "PSE",
    ].map((c) => `wurl:${c}`),
    source: {
      name: "UNEP/MAP · Mediterranean coastal countries",
      url: "https://www.unep.org/unepmap/who-we-are/contracting-parties",
      reviewedOn: "2026-10-05",
    },
  },
  caspian: {
    name: "Caspian Sea",
    countryIds: ["AZE", "IRN", "KAZ", "RUS", "TKM"].map((c) => `wurl:${c}`),
    source: {
      name: "UNEP · five Caspian littoral states",
      url: "https://www.unep.org/news-and-stories/press-release/caspian-littoral-states-agree-start-neighbourhood-watch-environment",
      reviewedOn: "2026-10-05",
    },
  },
  andes: {
    name: "The Andes",
    countryIds: ["ARG", "BOL", "CHL", "COL", "ECU", "PER", "VEN"].map(
      (c) => `wurl:${c}`,
    ),
    source: {
      name: "UN Environment · Andean countries",
      url: "https://www.unep.org/news-and-stories/news/andean-countries-strike-regional-approach-climate-adaptation",
      reviewedOn: "2026-10-05",
    },
  },
  danube: {
    name: "The Danube main river",
    countryIds: [
      "DEU",
      "AUT",
      "SVK",
      "HUN",
      "HRV",
      "SRB",
      "ROU",
      "BGR",
      "MDA",
      "UKR",
    ].map((c) => `wurl:${c}`),
    source: {
      name: "ICPDR · main river and basin",
      url: "https://www.icpdr.org/maps-data/maps",
      reviewedOn: "2026-10-05",
    },
  },
};
