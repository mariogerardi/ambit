import type {
  ConstructionArea,
  Construction,
  ConstructionMode,
  ConstructionResult,
  ConstructionRule,
} from "./constructionTypes";
/** Shared authored and runtime data shapes. All dependencies are type-only. */
import type { QuestionScenes, PlayScene } from "./scenes";
import type { MECHANICS } from "./mechanics";
import type {
  Focus,
  PlaceFeature,
  RegionFeature,
  MapOverlay,
  PhysicalFeature,
} from "../geography/types";
import type { Capital } from "./quizData";
import type { GeographicCircle } from "./spatial";
import type { CountryRecall } from "./countryRecall";
import type { BorderGraph, Coordinate, CountryInterval } from "./reasoning";

export type AnswerMode =
  | ConstructionMode
  | "pin"
  | "compass-bearing"
  | "city-single"
  | "city-multiple"
  | "merged-region-single"
  | "map-single"
  | "map-multiple"
  | "number"
  | "slider"
  | "text"
  | "typed-regions"
  | "country-recall"
  | "ordered-countries"
  | "ordered-capitals"
  | "land-path"
  | "choice-single"
  | "choice-order"
  | "choice-match"
  | "choice-multiple";
export interface FactSource {
  name: string;
  url: string;
  reviewedOn: string;
}
export interface FlagDisplay {
  src: string;
  alt: string;
  label: string;
  caption?: string;
  /** A sourced motif crop, kept distinct from the full flag. */
  detail?: { src: string; alt: string };
}
export interface CountryFact {
  countryId: string;
  field: string;
  value: string;
  aliases?: string[];
  source: FactSource;
}
export type KnowledgeRule =
  | ConstructionRule
  | {
      type: "country-set-recall";
      ids: string[];
      /** Recognized answers using another geographic convention incur no error. */
      exceptions?: { id: string; message: string }[];
      assistOrder: string[];
    }
  | {
      type: "bearing-angle";
      origin: PlaceFeature;
      destination: PlaceFeature;
      /** Three ascending inclusive circular-error bands, in degrees. */
      tiers: { degrees: number; feedback: string }[];
    }
  | {
      type: "merged-region";
      targetId: string;
      memberIds: string[];
      hiddenAdjacencies: [string, string][];
    }
  | {
      type: "pin-distance";
      targetId: string;
      radiusKm: number;
      /** Ascending, inclusive distance tiers; all count as correct for now. */
      tiers?: { radiusKm: number; feedback: string }[];
    }
  | { type: "pin-inside"; ids: string[] }
  | { type: "place-ids"; ids: string[]; match?: "all" | "any" }
  | { type: "manual-text"; answers: string[] }
  | { type: "manual-number"; value: number }
  | {
      type: "numeric-range";
      value: number;
      tolerance: number;
      min: number;
      max: number;
      step: number;
      unit: string;
      /** Ascending inclusive error bands; optional 3 / 2 / 1 rewards. */
      tiers?: { tolerance: number; feedback: string }[];
    }
  | { type: "region-ids"; ids: string[]; match?: "all" | "any" }
  | { type: "choice-ids"; ids: string[]; ordered?: boolean }
  | { type: "slot-matches"; matches: { slotId: string; choiceId: string }[] }
  | { type: "capital-name"; countryId: string }
  | { type: "country-fact"; field: string; value: string }
  | { type: "text-fact"; countryId: string; field: string }
  | {
      type: "country-ids";
      ids: string[];
      ordered?: boolean;
      match?: "all" | "any";
    }
  | { type: "flag-country"; countryId: string }
  | { type: "territory-owner"; countryId: string }
  | { type: "feature-count"; featureId: string }
  | { type: "capital-order"; countryIds: string[] }
  | {
      type: "language-family";
      countryIds: string[];
      familyId: string;
      relation: "is" | "is-not";
    }
  | { type: "official-languages"; countryId: string; match: "all" | "any" }
  | { type: "physical-feature"; featureId: string; match: "all" | "any" }
  | {
      type: "capital-coordinate";
      referenceId: string;
      direction: "north" | "south" | "east" | "west";
      continent?: string;
    }
  | { type: "capital-circle"; circle: GeographicCircle }
  | {
      type: "country-circle";
      circle: GeographicCircle;
      officialLanguageId?: string;
    }
  | { type: "name-length"; letters: number; excludeIds: string[] }
  | { type: "shortest-borders"; from: string; to: string }
  | { type: "great-circle-order"; from: Coordinate; to: Coordinate };
export interface Question {
  /** Authored map states compiled by defineQuestion; legacy fields remain readable. */
  scenes?: QuestionScenes;
  id: string;
  label: string;
  /** Short, spoiler-free identity for Journey progress and recaps. */
  progressLabel?: string;
  /** Resolved destination used only in the completed receipt. */
  resolvedLabel?: string;
  topic: string;
  /** Short authoring label for the question library; the prompt is the player heading. */
  title: string;
  prompt: string;
  /** Brief, spoiler-safe context connecting this stop to the Journey. */
  leadIn?: string;
  /** A semantic clue first; an optional, separately requested change to the task display. */
  guidance?: {
    hint: string;
    /** Optional broad geographic clue, shown only once help is requested. */
    hintMap?: { regionIds: readonly string[]; focus?: Focus };
    assist?: {
      text: string;
      images?: {
        src: string;
        alt: string;
        caption: string;
        credit?: NonNullable<Question["feedbackImage"]>["credit"];
      }[];
      /** Display-only dial guide, measured clockwise from true north; may wrap through zero. */
      compassSector?: { start: number; end: number };
      /** Optional narrower regions to highlight in place of the hint regions. */
      regionIds?: readonly string[];
      /** Authored survivors, including every correct answer and plausible alternatives. */
      candidateIds?: string[];
      /** Broad search context, never a grading boundary or target-centered tolerance. */
      overlays?: MapOverlay[];
      /** Named reference places may help locate an unmarked target. */
      places?: PlaceFeature[];
      /** Display-only geography and framing for the assisted stage. */
      physicalFeatures?: PhysicalFeature[];
      /** Assistance may disclose political boundaries without changing eligibility. */
      borders?: boolean;
      focus?: Focus;
      /** A stronger ordering/matching assist may place and lock an authored card. */
      fixedSlots?: { index: number; id: string }[];
      /** A multiple-country assist may select and lock known answers. */
      fixedSelections?: string[];
    };
  };
  /** Optional reviewed example, disclosed only by an explicit reveal action. */
  constructionExample?: Construction;
  /** Country-clipped display footprint of a reviewed polygon example. */
  constructionExampleFootprint?: RegionFeature["geometry"];
  /** Visible edit footprint; a gesture starting outside it moves the globe. */
  constructionArea?: ConstructionArea;
  /** Neutral draft supplied before the first edit, e.g. a draggable circle. */
  constructionInitial?: Construction;
  instruction: string;
  inputLabel?: string;
  /** Two given compass observations supporting a location answer; headings are derived. */
  bearingIntersection?: {
    stations: [PlaceFeature, PlaceFeature];
    assist?: { stationId: string; halfWidthDegrees: number; reachKm: number };
  };
  mode: AnswerMode;
  rule: KnowledgeRule;
  count: number;
  selection:
    | { type: "neighbors"; of: string }
    | { type: "members"; excludeIds?: string[] }
    | { type: "ids"; ids: string[] }
    | { type: "none" };
  disclosure: {
    hoverNames: boolean;
    namedChoices: boolean;
    committedNames: boolean;
    previousVisits: boolean;
    /** Compass estimation can supply both endpoints; comparison paths remain reveal-only. */
    bearingDestination?: boolean;
  };
  commitment: "immediate" | "submit";
  /** One independently found country in a submitted two-country pair earns one point. */
  partialCredit?: "one-of-two";
  failure: "feedback" | "end-game";
  focus: Focus;
  /** Finite orientation sequence; reduced motion uses focus directly. */
  introViews?: Focus[];
  /** Optional camera reveal for questions linking geographically distant places. */
  feedbackFocus?: Focus;
  /** Finite reveal sequence; distant missed pins retain their comparison view. */
  feedbackViews?: Focus[];
  explanation: string;
  /** Optional praise matching the knowledge/skill, rather than the input widget. */
  correctFeedback?: string;
  /** Authored reaction for a miss; the reveal body supplies the explanation. */
  incorrectFeedback?: string;
  /** Full flags replace the clue image on reveal, with visible country labels. */
  feedbackFlags?: FlagDisplay[];
  /** Documentary image shown only after submission, with visible attribution. */
  feedbackImage?: {
    src: string;
    alt: string;
    caption: string;
    credit: {
      name: string;
      url: string;
      license: string;
      licenseUrl: string;
    };
  };
  /** Additional habitat or comparison photographs, each with its own attribution. */
  feedbackImages?: NonNullable<Question["feedbackImage"]>[];
  /** A clearly schematic explanation; never used as playable geography. */
  feedbackDiagram?:
    | {
        type: "river-banks";
        river: string;
        westBank: string;
        eastBank: string;
      }
    | { type: "earth-shape" };
  /** Source qualifications, separate from rules needed to answer. */
  qualification?: string;
  source: FactSource;
  /** Authored regions remain separate from canonical countries and border reasoning. */
  importedRegions?: RegionFeature[];
  /** Question-local render footprints; canonical geometry still grades answers. */
  displayGeometries?: Record<string, RegionFeature["geometry"]>;
  contextIds?: string[];
  /** An openly shown geographic answer pool; does not grant globe input. */
  candidateRegionIds?: string[];
  /** Feedback can reveal a different region from the highlighted clue. */
  feedbackContextIds?: string[];
  /** Known geographic setting remains context-colored, not answer-colored. */
  feedbackHintIds?: string[];
  sources?: FactSource[];
  /** Reviewed departures from shared visual defaults; reasons are audited, not blanket waivers. */
  visualExceptions?: Partial<
    Record<
      "open-search-background" | "natural-background" | "hidden-boundaries",
      string
    >
  >;
  map?: {
    /** Unrelated land is muted by default; a world search field must be deliberate. */
    background?: "muted" | "open-search";
    borders: boolean;
    /** Override reveal outlines, e.g. a single continent without internal borders. */
    feedbackBorders?: boolean;
    /** When present, only these regions receive outlines, including on feedback. */
    borderIds?: string[];
    /** Hover styling/inspection only; answering is derived from the answer mode. */
    hoverFeedback: boolean;
    muteOthers: boolean;
    /** Keep ordinary theme land colors when no region is an answer candidate. */
    neutralRegions?: boolean;
    revealOnCorrect?: boolean;
    revealOnAnswer?: boolean;
    candidates?: "highlighted" | "decorative" | "neutral";
    /** Anonymous area clues to name, with no globe selection or pending identity feedback. */
    candidateRole?: "clue";
    /** Withhold the name-to-shape mapping while named or typed answers are editable. */
    selectionFeedback?: "after-submit";
    /** City/physical answers can leave countries neutral on reveal. */
    feedbackRegions?: "neutral";
  };
  /** Optional play-only orientation for small, explicitly supplied area clues. */
  clueLocators?: { regionId: string; label: string; pulseOnly?: boolean }[];
  highlightParts?: {
    countryId: string;
    point: { lat: number; lng: number };
    /** Archipelagos can replace several simplified country components together. */
    points?: { lat: number; lng: number }[];
    /** Optional bundled source geometry, including islands omitted at world scale. */
    geometry?: RegionFeature["geometry"];
    /** Dark clues are reference territory, never a shortcut to choosing their owner. */
    tone?: "dark";
    /** Display name is revealed only after answering. */
    name?: string;
    /** Keep the highlighted fragment on feedback instead of restoring the owner. */
    reveal?: "part" | "part-and-owner";
  }[];
  /** Explicit false suppresses the typing shortcut; unavailable-globe fallback remains. */
  allowTyping?: boolean;
  places?: PlaceFeature[];
  feedbackPlaces?: PlaceFeature[];
  /** Short cartographic qualification shown beside the map. */
  mapCaption?: string;
  /** Display scale for a thematic raster; never used to grade answers. */
  rasterLegend?: { label: string; stops: { color: string; label: string }[] };
  feedbackMapCaption?: string;
  /** Reviewed physical context; omit answer-bearing features until feedback. */
  physicalFeatures?: PhysicalFeature[];
  feedbackPhysicalFeatures?: PhysicalFeature[];
  image?: {
    src: string;
    alt: string;
    feedbackAlt: string;
    /** Give documentary clues a larger, photo-first layout. */
    presentation?: "photo";
    /** Full visual context displayed alongside an enlarged clue. */
    context?: { src: string; alt: string };
  };
  choices?: {
    id: string;
    label: string;
    /** Documentary card photograph; captions are reserved for the reveal. */
    image?: NonNullable<Question["feedbackImage"]>;
    /** What this option depicts, independently of its grading ID. Never grants map input. */
    geographyIds?: string[];
  }[];
  /** Shuffle choice-button positions once per mounted question; IDs still grade. */
  shuffleChoices?: boolean;
  /** Directional captions for an ordering puzzle's slots. */
  orderLabels?: string[];
  /** Stable role identities; matching answers refer to IDs, not display order. */
  matchSlots?: {
    id: string;
    label: string;
    description?: string;
    image?: NonNullable<Question["feedbackImage"]>;
  }[];
  /** Filled answer slots with zero or one spare card. Dragging always swaps. */
  orderInitial?: string[];
  orderGroupLabel?: string;
  orderAsideLabel?: string;
  overlays?: MapOverlay[];
  /** Explanatory guides appear only after submission, never as playable clues. */
  feedbackOverlays?: MapOverlay[];
}
export interface Journey {
  /** Date this edition joined the catalog; drives Admin's newest-first view. */
  addedAt?: string;
  /** In-place answer-contract revision; no archived question definitions required. */
  saveRevision?: number;
  /** Receipt names for pre-revision answers, without restoring their grading rules. */
  legacyRoundLabels?: Record<string, string>;
  /** A revised edition replaces this ID for new attempts, while started saves keep it. */
  supersedes?: string;
  id: string;
  title: string;
  description: string;
  rounds: Question[];
  /** Authored geographic payoff, independent of generic answer-country flyovers. */
  completion?: {
    focus: Focus;
    /** Default cumulative; authored uses only the specified countries and places on the overview. */
    mapMode?: "cumulative" | "authored";
    /** Explicit country recap uses the same visited style as ordinary Journeys. */
    regionIds?: string[];
    /** Required by the authoring audit; also available as manual reduced-motion views. */
    views?: Focus[];
    /** Default true; false ends the completion tour at its last authored view. */
    loopViews?: boolean;
    physicalFeatures: PhysicalFeature[];
    overlays?: MapOverlay[];
    mapCaption?: string;
    mapAttribution?: { label: string; url: string };
    borders?: boolean;
    places: PlaceFeature[];
    caption?: string;
    /** Reviewed flag/motif comparison, shown only after the Journey ends. */
    flags?: FlagDisplay[];
    /** Offer a traditional overview plus manual review of one saved construction at a time. */
    constructionResults?: boolean;
    /** Start the completed map on this saved response; Overview remains available. */
    initialConstructionRoundId?: string;
    /** Resolved photo-and-distance recap for pin Journeys. */
    photoResults?: boolean;
    /** Expand saved responses in the completion receipt without changing the map. */
    answerReviews?: boolean;
  };
  mapAttribution?: { label: string; url: string };
  /** Keep previously visited display geography during subsequent camera travel. */
  retainMapDetails?: boolean;
}
export interface QuestionContext {
  regions: RegionFeature[];
  graph: BorderGraph;
  names: Map<string, string>;
  members: Set<string>;
  targets: Map<string, RegionFeature>;
  facts: CountryFact[];
  paths: Map<string, string[]>;
  borderGraphs: Map<Question, BorderGraph>;
  routes: Map<string, CountryInterval[]>;
  capitals: Capital[];
  choiceNames: Map<string, string>;
  solutions: Map<Question, string[]>;
  capitalMatches: Map<Question, Capital[]>;
}
export interface Response {
  recall?: CountryRecall;
  construction?: Construction;
  constructionResult?: ConstructionResult;
  pin?: { lat: number; lng: number };
  selectedIds: string[];
  text: string;
  ordered: string[];
}

/** Shared styling/context only; never inherit another question's answer contract. */
export type QuestionPresentation = Partial<
  Omit<
    Question,
    | "id"
    | "title"
    | "prompt"
    | "explanation"
    | "qualification"
    | "mode"
    | "rule"
    | "count"
    | "selection"
    | "commitment"
    | "partialCredit"
    | "choices"
    | "inputLabel"
    | "orderLabels"
    | "matchSlots"
    | "orderInitial"
    | "shuffleChoices"
    | "guidance"
    | "bearingIntersection"
    | "constructionExample"
    | "constructionExampleFootprint"
    | "constructionInitial"
  >
>;

type Rule<M extends AnswerMode> = Extract<
  KnowledgeRule,
  { type: (typeof MECHANICS)[M]["rules"][number] }
>;
type NoMapSelection = { selection: { type: "none" }; commitment: "submit" };
type MapSelection = {
  selection: Exclude<Question["selection"], { type: "none" }>;
};
type Single = { count: 1 };
type Choices = { choices: NonNullable<Question["choices"]> };
/** Discriminated authoring contracts; the engine's read model stays stable. */
export type QuestionContract =
  | ({
      mode: "country-recall";
      rule: Rule<"country-recall">;
      count: number;
      inputLabel: string;
    } & NoMapSelection)
  | ({
      mode: "geo-multipin";
      rule: Extract<ConstructionRule, { type: "labeled-region-pin-set" }>;
    } & Single &
      NoMapSelection)
  | ({
      mode: "geo-brush";
      rule: Extract<ConstructionRule, { type: "raster-overlap" }>;
    } & Single &
      NoMapSelection)
  | ({
      mode: "geo-circle";
      rule: Extract<
        ConstructionRule,
        { type: "point-coverage-max" | "island-coverage-max" }
      >;
    } & Single &
      NoMapSelection)
  | ({
      mode: "geo-trace";
      rule: Extract<ConstructionRule, { type: "line-following" }>;
    } & Single &
      NoMapSelection)
  | ({
      mode: "geo-polygon";
      rule: Extract<
        ConstructionRule,
        { type: "population-coverage-area-budget" }
      >;
    } & Single &
      NoMapSelection)
  | ({
      mode: "geo-cut";
      rule: Extract<ConstructionRule, { type: "population-balance" }>;
    } & Single &
      NoMapSelection)
  | ({
      mode: "merged-region-single";
      rule: Rule<"merged-region-single">;
      selection: { type: "ids"; ids: string[] };
      commitment: Question["commitment"];
    } & Single)
  | ({ mode: "compass-bearing"; rule: Rule<"compass-bearing"> } & Single &
      NoMapSelection)
  | ({ mode: "pin"; rule: Rule<"pin"> } & Single & NoMapSelection)
  | ({
      mode: "city-single";
      rule: Rule<"city-single">;
      selection: { type: "ids"; ids: string[] };
      commitment: Question["commitment"];
    } & Single)
  | {
      mode: "city-multiple";
      rule: Rule<"city-multiple">;
      selection: { type: "ids"; ids: string[] };
      commitment: "submit";
      count: number;
    }
  | ({
      mode: "map-single";
      rule: Rule<"map-single">;
      commitment: Question["commitment"];
    } & Single &
      MapSelection)
  | ({
      mode: "map-multiple";
      rule: Rule<"map-multiple">;
      commitment: "submit";
      count: number;
    } & MapSelection)
  | ({
      mode: "choice-single";
      rule: Rule<"choice-single">;
    } & Single &
      NoMapSelection &
      Choices)
  | ({
      mode: "choice-multiple";
      rule: Rule<"choice-multiple">;
      count: number;
    } & NoMapSelection &
      Choices)
  | ({
      mode: "choice-order";
      rule: Rule<"choice-order"> & { ordered: true };
      count: number;
    } & NoMapSelection &
      Choices)
  | ({
      mode: "choice-match";
      rule: Rule<"choice-match">;
      matchSlots: NonNullable<Question["matchSlots"]>;
      count: number;
    } & NoMapSelection &
      Choices)
  | ({
      mode: "text";
      rule: Rule<"text">;
      inputLabel: string;
    } & Single &
      NoMapSelection)
  | ({
      mode: "number";
      rule: Rule<"number">;
      inputLabel: string;
    } & Single &
      NoMapSelection)
  | ({
      mode: "slider";
      rule: Rule<"slider">;
      inputLabel: string;
    } & Single &
      NoMapSelection)
  | ({
      mode: "typed-regions";
      rule: Rule<"typed-regions">;
      inputLabel: string;
      count: number;
    } & NoMapSelection)
  | ({
      mode: "ordered-countries";
      rule: Rule<"ordered-countries">;
      count: number;
    } & NoMapSelection)
  | ({
      mode: "ordered-capitals";
      rule: Rule<"ordered-capitals">;
      count: number;
    } & NoMapSelection)
  | ({
      mode: "land-path";
      rule: Rule<"land-path">;
      count: number;
      commitment: "submit";
    } & MapSelection);
export type AuthoredQuestion = Omit<
  Question,
  "mode" | "rule" | "selection" | "commitment" | "count" | "focus"
> &
  QuestionContract &
  (
    | { focus: Question["focus"] }
    | {
        focus?: never;
        scenes: QuestionScenes & {
          play: PlayScene & { focus: Question["focus"] };
        };
      }
  );
