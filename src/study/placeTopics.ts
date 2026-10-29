import { MAJOR_CITIES } from "../geography/places";
import landmarks from "../minigames/landmarks.v1.json";
import roster from "../game/data/un-members.v1.json";
import type { StudyPlaceTarget } from "./placeReview";

export type PlaceTopic = "cities" | "landmarks";
export const isPlaceTopic = (topic: unknown): topic is PlaceTopic =>
  topic === "cities" || topic === "landmarks";
export interface CatalogPlace extends StudyPlaceTarget {
  topic: PlaceTopic;
  countryId: string;
  photo?: {
    src: string;
    author: string;
    url: string;
    license: string;
    licenseUrl: string;
  };
}
const members = new Set(roster.members.map((country) => country.id));
export const STUDY_PLACES: CatalogPlace[] = [
  ...MAJOR_CITIES.filter((city) => members.has(city.parentId!)).map(
    (city): CatalogPlace => ({
      id: city.id,
      name: city.name,
      lat: city.lat,
      lng: city.lng,
      countryId: city.parentId!,
      topic: "cities",
      radiusKm: 50,
      sourceUrl: `https://www.geonames.org/${city.sourceId.split(":")[1]}`,
    }),
  ),
  ...landmarks.landmarks
    .filter((landmark) => members.has(landmark.countryId))
    .map(
      (landmark): CatalogPlace => ({
        id: `landmark:${landmark.id}`,
        name: landmark.name,
        lat: landmark.lat,
        lng: landmark.lng,
        countryId: landmark.countryId,
        topic: "landmarks",
        radiusKm: 50,
        sourceUrl: landmark.sourceUrl,
        photo: landmark.photo,
      }),
    ),
];
const byId = new Map(STUDY_PLACES.map((place) => [place.id, place]));
export const studyPlace = (id: string) => byId.get(id);
export function placeTarget(place: CatalogPlace): StudyPlaceTarget {
  const { id, name, lat, lng, countryId, radiusKm, sourceUrl } = place;
  return { id, name, lat, lng, countryId, radiusKm, sourceUrl };
}
