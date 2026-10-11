import type { Polygon, MultiPolygon } from "geojson";
export type AdminLevel = "ADM0" | "ADM1" | "ADM2" | "ADM3" | "ADM4" | "ADM5";
export type VisualState =
  | "default"
  | "hover"
  | "selectable"
  | "selected"
  | "correct"
  | "answer"
  | "incorrect"
  | "visited"
  | "disabled"
  | "hinted"
  | "clue";
export interface Focus {
  lat: number;
  lng: number;
  altitude?: number;
}
export interface RegionFeature {
  aliases?: string[];
  attribution?: string;
  sourceUrl?: string;
  id: string;
  name: string;
  localType?: string;
  level: AdminLevel;
  parentId?: string;
  geometry: Polygon | MultiPolygon;
  /** Reconciled display footprint; canonical geometry remains authoritative. */
  displayGeometry?: Polygon | MultiPolygon | null;
  /** Build-time proof that these sibling display footprints cover their parent. */
  displayPartition?: { id: string; members: number };
  /** Render-only parent coverage beneath its subdivisions; never an answer target. */
  displayBase?: boolean;
  /** Render-only: the complete loaded branch replaces this backing surface. */
  displayCovered?: boolean;
  focus: Focus;
  sourceId: string;
}
export interface PlaceFeature {
  /** Authored answer markers use semantic colors independently of countries. */
  visualState?: VisualState;
  answerTarget?: boolean;
  labelHidden?: boolean;
  /** Authored context can try alternate anchors without becoming an answer target. */
  labelFlexible?: boolean;
  /** Label-only geographic context must never create a city/capital marker. */
  markerHidden?: boolean;
  hoverName?: string;
  aliases?: string[];
  /** Pinned source place population; display importance, not metro population. */
  population?: number;
  /** Display-only importance for non-city context labels. */
  priority?: number;
  id: string;
  name: string;
  kind:
    | "pin"
    | "city"
    | "town"
    | "capital"
    | "landmark"
    | "other"
    | "river"
    | "landform"
    | "mountain"
    | "ocean";
  parentId?: string;
  lat: number;
  lng: number;
  sourceId: string;
}
export interface RouteFeature {
  id: string;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  visualState?: VisualState;
}
export type MapOverlay =
  | {
      id: string;
      type: "circle";
      center: { lat: number; lng: number };
      radiusKm: number;
      shade?: boolean;
    }
  | { id: string; type: "parallel"; latitude: number }
  | { id: string; type: "meridian"; longitude: number };
export interface BoundaryLayerManifest {
  key: string;
  level: AdminLevel;
  parentId?: string;
  assetUrl: string;
  source: string;
  sourceVersion: string;
  license: string;
  attribution: string;
  generatedAt: string;
  sourceUrl?: string;
  features?: number;
  bytes?: number;
}
export interface LoadEvent {
  key: string;
  status: "loading" | "cached" | "loaded" | "aborted" | "failed";
  bytes?: number;
  durationMs?: number;
}

export interface PhysicalFeature {
  id: string;
  kind: "river" | "mountain" | "landform" | "ocean";
  name: string;
  lat: number;
  lng: number;
  rank: number;
  paths?: number[][][];
  /** Alternate anchors inside a large feature, used to keep its name in regional views. */
  labelAnchors?: number[][];
}
