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
