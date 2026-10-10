import type { CountryFact, FactSource } from "./questions";
export const mapSource: FactSource = {
  name: "Natural Earth · map data",
  url: "https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/",
  reviewedOn: "2026-10-04",
};
export const COUNTRY_FACTS: CountryFact[] = [
  {
    countryId: "wurl:NAM",
    field: "capital",
    value: "Windhoek",
    source: {
      name: "Khomas Regional Council · Windhoek",
      url: "https://karasrc.gov.na/web/khomasrc/home",
      reviewedOn: "2026-10-04",
    },
  },
  {
    countryId: "wurl:PER",
    field: "capital",
    value: "Lima",
    source: {
      name: "Peru INEI · Lima",
      url: "https://www.inei.gob.pe/media/MenuRecursivo/publicaciones_digitales/Est/Lib1936/libro.pdf",
      reviewedOn: "2026-10-04",
    },
  },
];
