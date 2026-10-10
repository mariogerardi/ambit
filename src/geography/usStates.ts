import usData from "../../public/geography/usa-adm1.v1.json";
import { catalogRegions, subdivisionKind } from "./regions";
import type { RegionFeature } from "./types";

// Use the same pinned geometry as Explore. State abbreviations are answer
// aliases only; the map does not disclose them during a blind question.
export const US_STATES = catalogRegions(usData as RegionFeature[])
  .filter((r) => subdivisionKind(r) === "state")
  .map((r) => ({
    ...r,
    aliases: [...(r.aliases ?? []), r.id.split("-").at(-1)!],
  }));
