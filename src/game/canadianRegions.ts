import canadaData from "../../public/geography/can-adm1.v1.json";
import { catalogRegions, subdivisionKind } from "../geography/regions";
import type { RegionFeature } from "../geography/types";
export const CANADIAN_SUBDIVISIONS = catalogRegions(
  canadaData as RegionFeature[],
);
export const CANADIAN_TERRITORIES = CANADIAN_SUBDIVISIONS.filter(
  (r) => subdivisionKind(r) === "territory",
).map((r) => r.id);
export const CANADIAN_PROVINCES = CANADIAN_SUBDIVISIONS.filter(
  (r) => subdivisionKind(r) === "province",
);
