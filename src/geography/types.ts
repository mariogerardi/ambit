import type {
  GridShape,
  Construction,
  ConstructionArea,
} from "../game/constructionTypes";
import type { Polygon, MultiPolygon } from "geojson";
export type AdminLevel = "ADM0" | "ADM1" | "ADM2" | "ADM3" | "ADM4" | "ADM5";
export type VisualState =
  | "default"
  /** Undisclosed land available for coordinate pin placement. */
  | "surface"
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
  /** Explore inspection stays visible independently of contextual label budgets. */
  inspectionSelected?: boolean;
  /** Display intent is independent of location kind, eligibility, and correctness. */
  displayRole?: "reference" | "explanation";
  /** Available interior radius in radians, for screen-fitting area symbols. */
  annotationRadius?: number;
  /** Read-only response badge; never changes picking eligibility or grading. */
  markerBadge?: string;
  /** Fade a newly introduced authored marker on the render clock. */
  fadeInMs?: number;
  /** Drop a newly introduced pin into its anchored position. */
  dropInMs?: number;
  /** One screen-space ripple beneath a newly placed pin. */
  placementPulse?: boolean;
  markerRole?: "target" | "annotation" | "start" | "finish";
  accuracyBand?: { index: number; count: number };
  /** Authored answer markers use semantic colors independently of countries. */
  visualState?: VisualState;
  answerTarget?: boolean;
  labelHidden?: boolean;
  /** Authored context can try alternate anchors without becoming an answer target. */
  labelFlexible?: boolean;
  /** Keep local map labels on the shore shell with a fixed geographic anchor. */
  surfaceAligned?: boolean;
  /** Display-only text size multiplier. */
  labelScale?: number;
  /** Compact monospaced labels for numeric map annotations. */
  labelTypography?: "numeric";
  /** Label-only geographic context must never create a city/capital marker. */
  markerHidden?: boolean;
  /** Authored reveal marker diameter, including texture padding, in screen pixels. */
  markerSize?: number;
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
  accuracyBand?: { index: number; count: number };
  id: string;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  visualState?: VisualState;
}
export type MapOverlay =
  | {
      id: string;
      type: "paint";
      bounds: [number, number, number, number];
      strokes: Extract<Construction, { kind: "brush" }>["strokes"];
      mask: NonNullable<ConstructionArea["mask"]>;
      targetMask?: NonNullable<ConstructionArea["mask"]>;
      coverage: "paint" | "inside" | "outside" | "missed";
      visualState: "selected" | "correct" | "answer" | "incorrect" | "visited";
      opacity: number;
    }
  | {
      id: string;
      type: "raster-patch";
      /** Place explanatory shading above base imagery. */
      foreground?: boolean;
      bounds: [number, number, number, number];
      assetUrl: string;
      opacity: number;
    }
  | {
      id: string;
      type: "cells";
      mask?: { assetUrl: string; bounds: [number, number, number, number] };
      prominent?: boolean;
      grid: GridShape;
      indices: number[];
      visualState:
        | "selected"
        | "correct"
        | "answer"
        | "incorrect"
        | "visited"
        | "hinted";
      opacity?: number;
    }
  | {
      id: string;
      type: "bearing-sector";
      center: { lat: number; lng: number };
      bearing: number;
      halfWidthDegrees: number;
      radiusKm: number;
    }
  | {
      id: string;
      type: "circle";
      center: { lat: number; lng: number };
      radiusKm: number;
      shade?: boolean;
      visualState?: "selected" | "correct" | "answer" | "incorrect" | "visited";
      /** Reveal-only accuracy bands share the pin's display palette. */
      accuracyBand?: { index: number; count: number };
      /** Fade a newly introduced accuracy ring on the render clock. */
      fadeInMs?: number;
      active?: boolean;
    }
  | { id: string; type: "parallel"; latitude: number }
  | { id: string; type: "meridian"; longitude: number }
  | {
      id: string;
      type: "path";
      /** Draw above translucent construction fills. */
      foreground?: boolean;
      /** Local decorative shore paths share the map shell. */
      surfaceAligned?: boolean;
      visualState?:
        | "selected"
        | "correct"
        | "answer"
        | "incorrect"
        | "visited"
        | "hinted"
        | "corridor";
      coordinates: number[][];
      /** Draw the path once on reveal; omitted for reduced motion. */
      reveal?: { durationMs: number; delayMs?: number };
      /** Noninteractive direction and along-path annotation. */
      arrowhead?: boolean;
      label?: string;
      dashed?: boolean | "dotted";
      /** Match a scored pin's tier color on its connector. */
      accuracyBand?: { index: number; count: number };
      opacity?: number;
      /** Fade explanatory context toward overview strength as the camera pulls back. */
      opacityByAltitude?: { near: number; far: number; opacity: number };
    }
  | {
      id: string;
      type: "texture";
      /** Transparent equirectangular image: west/east −180°/+180°, north at top. */
      assetUrl: string;
      opacity: number;
    };
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
  /** Display-only extent/shoreline; never enters political picking or grading. */
  geometry?: Polygon | MultiPolygon;
  color?: string;
  fillOpacity?: number;
  lineWidth?: number;
  lineOpacity?: number;
  /** Elevation-derived ink replaces the filled footprint and its outline. */
  relief?: {
    ridges: number[][][];
    hachures: number[][][];
    highlights: number[][][];
    /** Closed pictorial face rings, anchored in reviewed terrain; not range fills. */
    lightFaces?: number[][][];
    darkFaces?: number[][][];
    /** Offline whole-symbol exclusions for question-specific feature clearance. */
    clearances?: Record<
      string,
      Partial<
        Record<
          "ridges" | "hachures" | "highlights" | "lightFaces" | "darkFaces",
          number[]
        >
      >
    >;
  };
  /** Alternate anchors inside a large feature, used to keep its name in regional views. */
  labelAnchors?: number[][];
}
