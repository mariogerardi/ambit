import type { GeoPoint } from "./geodesic";
import type { RegionFeature, PlaceFeature } from "../geography/types";

export interface ConstructionArea {
  name: string;
  geometry: RegionFeature["geometry"];
  mask?: { assetUrl: string; bounds: [number, number, number, number] };
}
export type ConstructionMode =
  | "geo-brush"
  | "geo-multipin"
  | "geo-circle"
  | "geo-trace"
  | "geo-polygon"
  | "geo-cut";
export interface GridShape {
  west: number;
  south: number;
  east: number;
  north: number;
  columns: number;
  rows: number;
  equalArea: boolean;
}
/** Sparse cells: index, count/target fraction, country-clipped land area in km². */
export interface ConstructionGrid extends GridShape {
  id: string;
  label: string;
  sourceUrl: string;
  revision: string;
  cells: [number, number, number][];
}
export type Construction = { version: 1 } & (
  | { kind: "pins"; pins: Record<string, GeoPoint> }
  | {
      kind: "brush";
      strokes: { points: GeoPoint[]; radiusKm: number; erase: boolean }[];
    }
  | { kind: "circle"; center: GeoPoint }
  | { kind: "trace" | "polygon" | "cut"; points: GeoPoint[] }
);
export interface ConstructionBand {
  feedback: string;
}
export interface ConstructionIsland {
  id: string;
  name: string;
  focus: GeoPoint;
  /** Display importance when nearby island labels compete for space. */
  priority?: number;
  /** Omit secondary island names without changing eligibility. */
  labelHidden?: boolean;
  /** Exact spherical convex hull of the sourced shore; never a display simplification. */
  boundary: GeoPoint[];
}
export type ConstructionRule =
  | {
      type: "labeled-region-pin-set";
      sourceRevision: string;
      slots: {
        id: string;
        label: string;
        geometry: RegionFeature["geometry"];
        example: GeoPoint;
      }[];
      tiers: (ConstructionBand & { count: number })[];
    }
  | {
      type: "island-coverage-max";
      radiusKm: number;
      candidates: ConstructionIsland[];
      sourceRevision: string;
      maximum: number;
      tiers: (ConstructionBand & { count: number })[];
    }
  | {
      type: "raster-overlap";
      grid: ConstructionGrid;
      brushRadiusKm: number;
      /** Human-readable subject for overlap results; defaults to dunes. */
      targetLabel?: string;
      /** Display-only target footprint; never used for grading. */
      targetMask?: NonNullable<ConstructionArea["mask"]>;
      tiers: (ConstructionBand & { f1: number; precision: number })[];
    }
  | {
      type: "point-coverage-max";
      radiusKm: number;
      candidates: PlaceFeature[];
      /** Plural noun used in accuracy and results; defaults to capitals. */
      pointLabel?: string;
      /** Target names may be given while their coordinates remain withheld. */
      hideCandidatesUntilReveal?: boolean;
      maximum: number;
      tiers: (ConstructionBand & { count: number })[];
    }
  | {
      type: "line-following";
      reference: GeoPoint[];
      sourceRevision: string;
      tiers: (ConstructionBand & {
        coverage: number;
        referenceKm: number;
        strokeKm: number;
      })[];
    }
  | {
      type: "population-coverage-area-budget";
      grid: ConstructionGrid;
      minVertices: number;
      maxVertices: number;
      tiers: (ConstructionBand & { population: number; area: number })[];
    }
  | {
      type: "population-balance";
      grid: ConstructionGrid;
      boundary: GeoPoint[];
      tiers: (ConstructionBand & { error: number })[];
    };
export interface ConstructionResult {
  version: 1;
  kind: Construction["kind"];
  sourceRevision: string;
  tier: number | null;
  feedback: string;
  metrics: { label: string; value: number; unit: string }[];
  containedIds?: string[];
}
export const CONSTRUCTION_MODES: ConstructionMode[] = [
  "geo-brush",
  "geo-multipin",
  "geo-circle",
  "geo-trace",
  "geo-polygon",
  "geo-cut",
];
