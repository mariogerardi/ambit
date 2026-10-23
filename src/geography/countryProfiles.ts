import snapshot from "./data/country-info.v1.json";

export interface CountryProfile {
  continent: string;
  subregion: string;
  areaKm2?: number | null;
  population?: number | null;
  populationYear?: number;
  populationSource?: string;
  listedCapital?: string | null;
  currencyCode?: string;
  currencyName?: string;
  languages: string[];
}
export const COUNTRY_PROFILES: Record<string, CountryProfile> =
  snapshot.countries;
