import snapshot from "./data/cities.v1.json";
import { CAPITALS } from "../game/quizData";
import type { PlaceFeature } from "./types";

/** Display metadata only; the authored quiz's primary-capital records stay intact. */
export const DISPLAY_CAPITALS = CAPITALS.map((capital) => ({
  ...capital,
  name:
    (snapshot.capitalNames as Record<string, string>)[capital.id] ??
    capital.name,
  population: (snapshot.capitalPopulations as Record<string, number>)[
    capital.id
  ],
}));
export const MAJOR_CITIES: PlaceFeature[] = snapshot.cities.map((row) => {
  const [id, name, parentId, lat, lng, population] = row as [
    string,
    string,
    string,
    number,
    number,
    number,
  ];
  return {
    id: `place:${id}`,
    name,
    parentId,
    lat,
    lng,
    population,
    kind: "city",
    sourceId: `geonames:${id}`,
  };
});

export interface ExploreCity extends PlaceFeature {
  sourceCountryCode: string;
  sourceCountryName: string;
  sourceCountryId: string;
  sourceFeatureCode: string;
  /** Source capital relationships, independent of the containing map unit. */
  capitalOf: string[];
}
export const EXPLORE_CITIES: ExploreCity[] = snapshot.explore.cities.map(
  (row) => {
    const [
      id,
      name,
      parentId,
      lat,
      lng,
      population,
      sourceCountryCode,
      capitalOf,
      sourceCountryName,
      sourceCountryId,
      sourceFeatureCode,
    ] = row as [
      string,
      string,
      string,
      number,
      number,
      number,
      string,
      string[],
      string,
      string,
      string,
    ];
    return {
      id: `place:${id}`,
      name,
      parentId,
      lat,
      lng,
      population,
      sourceCountryCode,
      sourceCountryName,
      sourceCountryId,
      sourceFeatureCode,
      capitalOf,
      kind: capitalOf.length ? "capital" : "city",
      sourceId: `geonames:${id}`,
    };
  },
);
export const EXPLORE_CITY_BY_ID = new Map(
  EXPLORE_CITIES.map((city) => [city.id, city]),
);
export const EXPLORE_CAPITALS = EXPLORE_CITIES.filter(
  (city) => city.capitalOf.length,
);
export const EXPLORE_MAJOR_CITIES = EXPLORE_CITIES.filter(
  (city) => !city.capitalOf.length,
);
export function exploreCapital(countryId: string) {
  const id = (snapshot.explore.capitalLinks as Record<string, string>)[
    countryId
  ];
  return EXPLORE_CITY_BY_ID.get(id);
}
