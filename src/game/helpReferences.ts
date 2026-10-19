import { MAJOR_CITIES, DISPLAY_CAPITALS } from "../geography/places";
import type { PlaceFeature, PhysicalFeature } from "../geography/types";
import { areaLabel, cityReference } from "./authoredPlaces";
import context from "./data/journey-help-context.v1.json";

// GeoNames reference cities absent from the bundled major-city density sample.
// Coordinates are reference locations, never acceptance centers or grading data.
const additional: PlaceFeature[] = [
  ["2764359", "Linz", "AUT", 48.30639, 14.28611],
  ["738648", "Trabzon", "TUR", 41.005, 39.72694],
  ["6180550", "Whitehorse", "CAN", 60.71611, -135.05375],
  ["6185377", "Yellowknife", "CAN", 62.45411, -114.37739],
  ["5983720", "Iqaluit", "CAN", 63.74697, -68.51727],
  ["2073124", "Darwin", "AUS", -12.46113, 130.84185],
  ["3911925", "La Paz", "BOL", -16.5, -68.15],
].map((row) => {
  const [id, name, country, lat, lng] = row as [
    string,
    string,
    string,
    number,
    number,
  ];
  return {
    id: `place:${id}`,
    name,
    parentId: `wurl:${country}`,
    lat,
    lng,
    kind: "city",
    sourceId: `geonames:${id}`,
  };
});
const cities = [...DISPLAY_CAPITALS, ...MAJOR_CITIES, ...additional];
export function referenceCity(name: string, country?: string): PlaceFeature {
  const place = cities.find(
    (p) => p.name === name && (!country || p.parentId === `wurl:${country}`),
  );
  if (!place) throw Error(`Missing help reference city: ${name}`);
  return cityReference(place);
}
export function referenceLabel(
  name: string,
  lat: number,
  lng: number,
): PlaceFeature {
  return areaLabel({
    id: `help-label:${name}`,
    name,
    lat,
    lng,
    kind: "other",
    sourceId: "journey:geographic-reference",
    visualState: "hinted",
  });
}
export function referenceFeature(name: string): PhysicalFeature {
  const feature = context.features.find((f) => f.name === name);
  if (!feature) throw Error(`Missing reviewed help feature: ${name}`);
  return feature as PhysicalFeature;
}

export function referenceCountries(codes: string[]): PlaceFeature[] {
  return codes.map((code) => {
    const region = context.countries.find((r) => r.id === `wurl:${code}`);
    if (!region) throw Error(`Missing help country: ${code}`);
    return referenceLabel(region.name, region.focus.lat, region.focus.lng);
  });
}
