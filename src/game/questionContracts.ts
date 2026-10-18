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
import type { BorderGraph, Coordinate, CountryInterval } from "./reasoning";

export type AnswerMode =
  | "pin"
  | "city-single"
  | "city-multiple"
  | "merged-region-single"
  | "map-single"
  | "map-multiple"
  | "number"
  | "text"
  | "typed-regions"
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
  | { type: "region-ids"; ids: string[]; match?: "all" | "any" }
  | { type: "choice-ids"; ids: string[] }
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
      focus?: Focus;
      /** A stronger ordering/matching assist may place and lock an authored card. */
      fixedSlots?: { index: number; id: string }[];
      /** A multiple-country assist may select and lock known answers. */
      fixedSelections?: string[];
    };
  };
  instruction: string;
  inputLabel?: string;
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
  };
  commitment: "immediate" | "submit";
  failure: "feedback" | "end-game";
  focus: Focus;
  /** Optional camera reveal for questions linking geographically distant places. */
  feedbackFocus?: Focus;
  explanation: string;
  /** Optional praise matching the knowledge/skill, rather than the input widget. */
  correctFeedback?: string;
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
  /** Feedback can reveal a different region from the highlighted clue. */
  feedbackContextIds?: string[];
  /** Known geographic setting remains context-colored, not answer-colored. */
  feedbackHintIds?: string[];
  sources?: FactSource[];
  map?: {
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
    /** City/physical answers can leave countries neutral on reveal. */
    feedbackRegions?: "neutral";
  };
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
  choices?: { id: string; label: string }[];
  /** Shuffle choice-button positions once per mounted question; IDs still grade. */
  shuffleChoices?: boolean;
  /** Directional captions for an ordering puzzle's slots. */
  orderLabels?: string[];
  /** Stable role identities; matching answers refer to IDs, not display order. */
  matchSlots?: { id: string; label: string; description?: string }[];
  /** Filled answer slots plus one implicit distractor. Dragging always swaps. */
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
  /** Omitted means unlisted, so registration alone never changes daily picks. */
  availability?: "pool" | "unlisted";
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
    /** Explicit country recap uses the same visited style as ordinary Journeys. */
    regionIds?: string[];
    /** Separate views for widely dispersed destinations; never implies a connecting route. */
    views?: Focus[];
    physicalFeatures: PhysicalFeature[];
    overlays?: MapOverlay[];
    mapCaption?: string;
    mapAttribution?: { label: string; url: string };
    borders?: boolean;
    places: PlaceFeature[];
    caption?: string;
    /** Reviewed flag/motif comparison, shown only after the Journey ends. */
    flags?: FlagDisplay[];
    /** Resolved photo-and-distance recap for pin Journeys. */
    photoResults?: boolean;
  };
  mapAttribution?: { label: string; url: string };
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
    | "choices"
    | "inputLabel"
    | "orderLabels"
    | "matchSlots"
    | "orderInitial"
    | "shuffleChoices"
    | "guidance"
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
      mode: "merged-region-single";
      rule: Rule<"merged-region-single">;
      selection: { type: "ids"; ids: string[] };
      commitment: "submit";
    } & Single)
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
