import type { QuestionScenes } from "./scenes";
import { mechanicFor, usesChoiceCards } from "./mechanics";
import { isSlotAnswer } from "./ordering";
import { validateQuestionContract } from "./questionBuilder";
import type {
  Focus,
  PlaceFeature,
  RegionFeature,
  MapOverlay,
  PhysicalFeature,
} from "../geography/types";
import {
  CAPITALS,
  LANGUAGES,
  OFFICIAL_LANGUAGES,
  OFFICIAL_LANGUAGE_COUNTRIES,
  FEATURES,
  COUNTRY_LANGUAGE_PROFILES,
} from "./quizData";
import type { Capital } from "./quizData";
import { inCircle, countryWithinCircle, longitudeDelta } from "./spatial";
import type { GeographicCircle } from "./spatial";
import roster from "./data/un-members.v1.json";
import { answerPlace, pinDistance, pinInside, validPin } from "./answerTargets";
export { cityIdForName } from "./answerTargets";
import { geoContains } from "d3-geo";
import { sphericalGeometry } from "../geography/sphericalGeometry.mjs";
import {
  buildBorderGraph,
  greatCircleCountries,
  isMinimumLandPath,
  shortestLandPath,
} from "./reasoning";
import type { BorderGraph, Coordinate, CountryInterval } from "./reasoning";

export type AnswerMode =
  | "pin"
  | "city-single"
  | "city-multiple"
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
    assist?: {
      text: string;
      /** Authored survivors, including every correct answer and plausible alternatives. */
      candidateIds?: string[];
      /** Broad search context, never a grading boundary or target-centered tolerance. */
      overlays?: MapOverlay[];
      /** Named reference places may help locate an unmarked target. */
      places?: PlaceFeature[];
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
    places: PlaceFeature[];
    caption?: string;
    /** Reviewed flag/motif comparison, shown only after the Journey ends. */
    flags?: FlagDisplay[];
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
export const normalizeAnswer = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export function countryIdForName(
  context: Pick<QuestionContext, "names"> &
    Partial<Pick<QuestionContext, "targets">>,
  value: string,
) {
  const normalized = normalizeAnswer(value);
  if (!normalized) return undefined;
  const aliases: Record<string, string[]> = {
    "wurl:COD": ["DR Congo", "DRC", "Congo Kinshasa"],
    "wurl:USA": ["USA", "United States of America"],
    "wurl:SWZ": ["eSwatini", "Swaziland"],
    "wurl:CIV": ["Ivory Coast"],
    "wurl:CPV": ["Cape Verde"],
    "wurl:TUR": ["Turkey", "Turkiye"],
  };
  for (const [id, name] of context.names)
    if (
      normalizeAnswer(name) === normalized ||
      [
        ...(aliases[id] ?? []),
        ...(context.targets?.get(id)?.aliases ?? []),
      ].some((alias) => normalizeAnswer(alias) === normalized)
    )
      return id;
}
export function createQuestionContext(
  regions: RegionFeature[],
  facts: CountryFact[],
  journey: Journey,
  base?: QuestionContext,
): QuestionContext {
  const memberNames = new Map(roster.members.map((m) => [m.id, m.name]));
  const context: QuestionContext = {
    regions,
    graph: base?.graph ?? buildBorderGraph(regions),
    names: new Map(regions.map((r) => [r.id, memberNames.get(r.id) ?? r.name])),
    members: base?.members ?? new Set(roster.members.map((m) => m.id)),
    targets: new Map(regions.map((r) => [r.id, r])),
    facts,
    paths: new Map(),
    borderGraphs: new Map(),
    routes: new Map(),
    capitals: CAPITALS,
    choiceNames: new Map(LANGUAGES.map((l) => [l.id, l.label])),
    solutions: new Map(),
    capitalMatches: new Map(),
  };
  for (const round of journey.rounds) {
    validateQuestionContract(round);
    for (const target of round.importedRegions ?? []) {
      context.targets.set(target.id, target);
      context.names.set(target.id, target.name);
    }
    if (usesChoiceCards(round) && (round.choices?.length ?? 0) > 6)
      throw Error(
        `Multiple-choice questions may have at most six choices: ${round.id}.`,
      );
    const survivors = round.guidance?.assist?.candidateIds;
    const fixedSelections = round.guidance?.assist?.fixedSelections;
    if (fixedSelections) {
      const expected = solutionIds(round, context);
      const eligible = selectableIds(round, context);
      if (
        round.mode !== "map-multiple" ||
        round.commitment !== "submit" ||
        !fixedSelections.length ||
        fixedSelections.length >= round.count ||
        new Set(fixedSelections).size !== fixedSelections.length ||
        fixedSelections.some(
          (id) => !expected.includes(id) || !eligible.includes(id),
        )
      )
        throw Error(`Invalid fixed selection assist: ${round.id}.`);
    }
    if (survivors) {
      const eligible = usesChoiceCards(round)
        ? (round.choices ?? []).map((choice) => choice.id)
        : selectableIds(round, context);
      const expected = solutionIds(round, context);
      if (
        new Set(survivors).size !== survivors.length ||
        survivors.some((id) => !eligible.includes(id)) ||
        expected.some((id) => !survivors.includes(id)) ||
        survivors.length <= responseCount(round, context)
      )
        throw Error(
          `Assist must preserve answers and plausible alternatives: ${round.id}.`,
        );
    }
    mechanicFor(round).validateContext?.(
      round,
      solutionIds(round, context),
      (message) => {
        throw Error(message);
      },
    );
    if (!isSlotAnswer(round) && round.guidance?.assist?.fixedSlots?.length)
      throw Error(`Fixed slots require a card-slot puzzle: ${round.id}.`);
    if (
      round.disclosure.namedChoices &&
      selectableIds(round, context).length > 6
    )
      throw Error(
        `Named multiple-choice questions may have at most six choices: ${round.id}.`,
      );
    for (const highlight of round.highlightParts ?? []) {
      const owner = regions.find((r) => r.id === highlight.countryId);
      const parts = owner
        ? owner.geometry.type === "Polygon"
          ? [owner.geometry.coordinates]
          : owner.geometry.coordinates
        : [];
      if (
        !parts.some((coordinates) =>
          geoContains(sphericalGeometry({ type: "Polygon", coordinates }), [
            highlight.point.lng,
            highlight.point.lat,
          ]),
        )
      )
        throw Error(
          `The highlighted territory is missing from the local map: ${round.id}.`,
        );
    }
    for (const choice of round.choices ?? [])
      context.choiceNames.set(choice.id, choice.label);
    if (round.rule.type === "shortest-borders") {
      // Regional routes use their own topology; never mix states into the
      // sovereign-country graph or allow shortcuts through foreign countries.
      const endpoints = round.rule;
      const origin = round.importedRegions?.find(
        (r) => r.id === endpoints.from,
      );
      const destination = round.importedRegions?.find(
        (r) => r.id === endpoints.to,
      );
      const graph =
        origin && destination && origin.parentId === destination.parentId
          ? buildBorderGraph(
              round.importedRegions!.filter(
                (r) => r.parentId === origin.parentId,
              ),
            )
          : context.graph;
      context.borderGraphs.set(round, graph);
      const path = shortestLandPath(graph, round.rule.from, round.rule.to);
      if (!path)
        throw Error("This Journey’s land route is unavailable in the map.");
      context.paths.set(round.id, path);
    }
    if (round.rule.type === "capital-order") {
      const ids = round.rule.countryIds;
      if (
        ids.length !== round.count ||
        ids.some((id) => !context.capitals.some((c) => c.countryId === id)) ||
        ids.slice(1).some((id, i) => !context.graph.get(ids[i])?.has(id))
      )
        throw Error(
          `The local capital route is incomplete or disconnected: ${round.id}.`,
        );
    }
    if (round.rule.type === "great-circle-order")
      context.routes.set(
        round.id,
        greatCircleCountries(regions, round.rule.from, round.rule.to),
      );
  }
  for (const round of journey.rounds) {
    if (round.mode === "pin") {
      if (
        round.count !== 1 ||
        round.commitment !== "submit" ||
        round.selection.type !== "none" ||
        !["pin-distance", "pin-inside"].includes(round.rule.type)
      )
        throw Error(`Invalid pin configuration for ${round.id}.`);
      if (
        round.rule.type === "pin-distance" &&
        (!answerPlace(round, round.rule.targetId) ||
          !validPin(answerPlace(round, round.rule.targetId)) ||
          !Number.isFinite(round.rule.radiusKm) ||
          round.rule.radiusKm <= 0 ||
          round.rule.radiusKm > 20020)
      )
        throw Error(
          `Missing pin location or invalid tolerance for ${round.id}.`,
        );
      if (round.rule.type === "pin-distance" && round.rule.tiers) {
        const { tiers, radiusKm } = round.rule;
        if (
          !tiers.length ||
          tiers.at(-1)!.radiusKm !== radiusKm ||
          tiers.some(
            (tier, index) =>
              !Number.isFinite(tier.radiusKm) ||
              tier.radiusKm <= (tiers[index - 1]?.radiusKm ?? 0) ||
              !tier.feedback.trim(),
          )
        )
          throw Error(`Invalid pin distance tiers for ${round.id}.`);
      }
      if (
        round.rule.type === "pin-inside" &&
        (!round.rule.ids.length ||
          round.rule.ids.some((id) => !context.targets.has(id)))
      )
        throw Error(`Missing pin area geometry for ${round.id}.`);
    } else if (
      round.rule.type === "pin-distance" ||
      round.rule.type === "pin-inside"
    ) {
      throw Error(`Pin rules require pin answers for ${round.id}.`);
    }
    if (round.mode.startsWith("city-")) {
      if (
        round.rule.type !== "place-ids" ||
        round.selection.type !== "ids" ||
        new Set(round.selection.ids).size !== round.selection.ids.length ||
        round.selection.ids.length < 2 ||
        round.selection.ids.some((id) => !answerPlace(round, id)) ||
        (round.mode === "city-single" && round.count !== 1)
      )
        throw Error(
          `City answers require distinct local city candidates for ${round.id}.`,
        );
    } else if (round.rule.type === "place-ids") {
      throw Error(`City rules require city answers for ${round.id}.`);
    }
    const expected = solutionIds(round, context);
    context.solutions.set(round, expected);
    if (
      round.mode === "typed-regions" &&
      (round.rule.type !== "region-ids" ||
        expected.length < round.count ||
        expected.some((id) => !context.targets.has(id)) ||
        (round.rule.match !== "any" && expected.length !== round.count))
    )
      throw Error(
        `The local typed region answer data is incomplete for ${round.id}.`,
      );
    if (
      round.mode.startsWith("map-") ||
      round.mode.startsWith("city-") ||
      usesChoiceCards(round)
    ) {
      const eligible = new Set(selectableIds(round, context));
      if (
        !expected.length ||
        expected.some((id) => !eligible.has(id)) ||
        expected.length < round.count
      )
        throw Error(`The local answer data is incomplete for ${round.id}.`);
      if (
        (round.rule.type === "official-languages" ||
          round.rule.type === "physical-feature" ||
          round.rule.type === "country-ids" ||
          round.rule.type === "region-ids" ||
          round.rule.type === "place-ids" ||
          round.rule.type === "choice-ids") &&
        (round.rule.type === "choice-ids" || round.rule.match !== "any") &&
        expected.length !== round.count
      )
        throw Error(
          `The required answer count is inconsistent for ${round.id}.`,
        );
    }
    if (round.rule.type === "capital-name") {
      const countryId = round.rule.countryId;
      if (!context.capitals.some((c) => c.countryId === countryId))
        throw Error(`The local capital answer is missing for ${round.id}.`);
    }
    if (
      round.rule.type === "capital-coordinate" &&
      !matchingCapitals(round, context).length
    )
      throw Error(`No local capital answers qualify for ${round.id}.`);
  }
  return context;
}
export function selectableIds(
  question: Question,
  context: QuestionContext,
): string[] {
  const selection = question.selection;
  if (usesChoiceCards(question))
    return (question.choices ?? []).map((c) => c.id);
  if (selection.type === "none") return [];
  if (selection.type === "ids") return selection.ids;
  if (selection.type === "neighbors")
    return [...(context.graph.get(selection.of) ?? [])];
  return [...context.members].filter(
    (id) => !selection.excludeIds?.includes(id),
  );
}
export function canSelect(
  question: Question,
  context: QuestionContext,
  id: string,
) {
  return selectableIds(question, context).includes(id);
}
export function solutionIds(
  question: Question,
  context: QuestionContext,
): string[] {
  const rule = question.rule;
  if (rule.type === "slot-matches")
    return (question.matchSlots ?? []).map(
      (slot) =>
        rule.matches.find((match) => match.slotId === slot.id)?.choiceId ?? "",
    );
  if (rule.type === "pin-distance") return [rule.targetId];
  if (rule.type === "pin-inside" || rule.type === "place-ids") return rule.ids;
  const cached = context.solutions.get(question);
  if (cached) return cached;
  if (
    rule.type === "flag-country" ||
    rule.type === "territory-owner" ||
    rule.type === "capital-name"
  )
    return [rule.countryId];
  if (rule.type === "capital-order") return rule.countryIds;
  if (rule.type === "feature-count") {
    if (!FEATURES[rule.featureId])
      throw Error("The local feature membership is missing.");
    return FEATURES[rule.featureId].countryIds;
  }
  if (rule.type === "language-family")
    return rule.countryIds.filter((id) => {
      const profile = COUNTRY_LANGUAGE_PROFILES[id];
      if (!profile)
        throw Error(`The local language family fact is missing: ${id}.`);
      return (profile.familyId === rule.familyId) === (rule.relation === "is");
    });
  if (rule.type === "official-languages")
    return OFFICIAL_LANGUAGES[rule.countryId] ?? [];
  if (rule.type === "physical-feature")
    return FEATURES[rule.featureId]?.countryIds ?? [];
  if (rule.type === "capital-coordinate" || rule.type === "capital-circle")
    return matchingCapitals(question, context).map((c) => c.countryId);
  if (rule.type === "country-circle") {
    const languageCountries = rule.officialLanguageId
      ? OFFICIAL_LANGUAGE_COUNTRIES[rule.officialLanguageId]
      : undefined;
    if (rule.officialLanguageId && !languageCountries)
      throw Error(
        "A complete reviewed country list for this official language is required before enabling its count question.",
      );
    return context.regions
      .filter(
        (r) =>
          context.members.has(r.id) &&
          (!languageCountries || languageCountries.countryIds.includes(r.id)) &&
          countryWithinCircle(r, rule.circle),
      )
      .map((r) => r.id);
  }
  if (rule.type === "country-fact")
    return context.facts
      .filter(
        (f) =>
          f.field === rule.field &&
          normalizeAnswer(f.value) === normalizeAnswer(rule.value),
      )
      .map((f) => f.countryId);
  if (rule.type === "text-fact") return [rule.countryId];
  if (rule.type === "manual-text" || rule.type === "manual-number") return [];
  if (
    rule.type === "country-ids" ||
    rule.type === "choice-ids" ||
    rule.type === "region-ids"
  )
    return rule.ids;
  if (rule.type === "name-length")
    return [...context.members].filter(
      (id) =>
        !rule.excludeIds.includes(id) &&
        context.names.get(id)?.length === rule.letters,
    );
  if (rule.type === "shortest-borders")
    return context.paths.get(question.id) ?? [];
  return (context.routes.get(question.id) ?? []).flatMap((interval) =>
    interval.id ? [interval.id] : [],
  );
}
export function responseCount(question: Question, context: QuestionContext) {
  if (question.mode === "land-path")
    return context.paths.get(question.id)?.length ?? question.count;
  return question.rule.type === "great-circle-order"
    ? solutionIds(question, context).length
    : question.count;
}
export function questionPrompt(question: Question, context: QuestionContext) {
  return question.prompt.replace(
    "{count}",
    String(responseCount(question, context)),
  );
}
export function canSubmit(
  question: Question,
  context: QuestionContext,
  response: Response,
) {
  return mechanicFor(question).canSubmit(question, response, {
    count: responseCount(question, context),
    eligible: selectableIds(question, context),
  });
}
export function isCorrect(
  question: Question,
  context: QuestionContext,
  response: Response,
) {
  const rule = question.rule,
    expected = solutionIds(question, context);
  const controlGrade = mechanicFor(question).grade;
  if (controlGrade)
    return controlGrade(question, context, response, expected, {
      count: responseCount(question, context),
      eligible: selectableIds(question, context),
    });
  if (rule.type === "pin-distance") {
    const distance = pinDistance(question, response);
    return distance !== undefined && distance <= rule.radiusKm + 1e-7;
  }
  if (rule.type === "pin-inside") return pinInside(question, context, response);
  if (
    question.mode.startsWith("city-") &&
    response.selectedIds.some((id) => !canSelect(question, context, id))
  )
    return false;
  if (rule.type === "manual-text")
    return rule.answers.some(
      (answer) => normalizeAnswer(answer) === normalizeAnswer(response.text),
    );
  if (rule.type === "manual-number")
    return response.text.trim() !== "" && Number(response.text) === rule.value;
  if (rule.type === "capital-name")
    return capitalForName(context, response.text)?.countryId === rule.countryId;
  if (rule.type === "capital-order")
    return (
      response.ordered.length === expected.length &&
      response.ordered.every(
        (value, i) => capitalForName(context, value)?.countryId === expected[i],
      )
    );
  if (rule.type === "feature-count")
    return (
      response.text.trim() !== "" && Number(response.text) === expected.length
    );
  if (rule.type === "capital-coordinate") {
    const capital = capitalForName(context, response.text);
    return (
      !!capital &&
      matchingCapitals(question, context).some((c) => c.id === capital.id)
    );
  }
  if (rule.type === "capital-circle" || rule.type === "country-circle")
    return (
      response.text.trim() !== "" &&
      Number(response.text) ===
        (rule.type === "capital-circle"
          ? matchingCapitals(question, context).length
          : expected.length)
    );
  if (rule.type === "text-fact") {
    const fact = context.facts.find(
      (f) => f.countryId === rule.countryId && f.field === rule.field,
    );
    return (
      !!fact &&
      [fact.value, ...(fact.aliases ?? [])].some(
        (value) => normalizeAnswer(value) === normalizeAnswer(response.text),
      )
    );
  }
  if (rule.type === "shortest-borders")
    return question.mode === "land-path"
      ? isMinimumLandPath(
          context.borderGraphs.get(question) ?? context.graph,
          response.selectedIds,
          rule.from,
          rule.to,
        )
      : response.text.trim() !== "" &&
          Number(response.text) ===
            (context.paths.get(question.id)?.length ?? 0) - 1;
  if (rule.type === "great-circle-order") {
    const ids = response.ordered.map((value) =>
      countryIdForName(context, value),
    );
    return (
      ids.length === expected.length && ids.every((id, i) => id === expected[i])
    );
  }
  if (question.mode === "typed-regions" && rule.type === "region-ids") {
    const ids = response.ordered.map((value) =>
      countryIdForName(context, value),
    );
    return (
      ids.length === question.count &&
      new Set(ids).size === ids.length &&
      (rule.match === "any" || ids.length === expected.length) &&
      ids.every((id) => id !== undefined && expected.includes(id))
    );
  }
  if (
    question.mode === "ordered-countries" &&
    rule.type === "country-ids" &&
    rule.ordered
  ) {
    const ids = response.ordered.map((value) =>
      countryIdForName(context, value),
    );
    return (
      ids.length === expected.length &&
      ids.every((id, index) => id === expected[index])
    );
  }
  if (
    response.selectedIds.length !== question.count ||
    new Set(response.selectedIds).size !== response.selectedIds.length
  )
    return false;
  if (
    (rule.type === "country-ids" ||
      rule.type === "region-ids" ||
      rule.type === "place-ids") &&
    rule.match !== "any" &&
    response.selectedIds.length !== expected.length
  )
    return false;
  if (
    (rule.type === "official-languages" || rule.type === "physical-feature") &&
    rule.match === "all" &&
    response.selectedIds.length !== expected.length
  )
    return false;
  return rule.type === "country-ids" && rule.ordered
    ? response.selectedIds.every((id, i) => id === expected[i])
    : response.selectedIds.every((id) => expected.includes(id));
}
export function committedNameVisible(
  question: Question,
  selectedIds: string[],
  id: string,
) {
  return (
    question.disclosure.hoverNames ||
    (question.disclosure.committedNames && selectedIds.includes(id))
  );
}
export function explanation(
  question: Question,
  context: QuestionContext,
  _selectedIds: string[],
  _correct: boolean,
) {
  if (question.rule.type === "shortest-borders") {
    const path = context.paths.get(question.id) ?? [];
    return `One shortest route: ${path.map((id) => context.names.get(id)).join(" → ")}.`;
  }
  if (question.explanation.trim()) return question.explanation;
  if (question.rule.type === "capital-coordinate") {
    const referenceId = question.rule.referenceId;
    const reference = context.capitals.find(
      (capital) => capital.id === referenceId,
    );
    return `The line follows ${reference?.name}’s latitude. Geography can surprise you when you compare places on the same globe.`;
  }
  if (question.rule.type === "capital-circle")
    return "The circle includes its boundary. Each country contributes one primary capital.";
  if (question.rule.type === "country-circle")
    return "All of each country’s land must fit inside the circle.";
  return "";
}

export function capitalForName(context: QuestionContext, value: string) {
  const normalized = normalizeAnswer(value);
  return normalized
    ? context.capitals.find((c) =>
        [c.name, ...c.aliases].some((a) => normalizeAnswer(a) === normalized),
      )
    : undefined;
}
export function matchingCapitals(question: Question, context: QuestionContext) {
  const cached = context.capitalMatches.get(question);
  if (cached) return cached;
  const rule = question.rule;
  if (rule.type === "capital-circle") {
    const matches = context.capitals.filter((c) => inCircle(c, rule.circle));
    context.capitalMatches.set(question, matches);
    return matches;
  }
  if (rule.type !== "capital-coordinate") return [];
  const reference = context.capitals.find((c) => c.id === rule.referenceId);
  if (!reference)
    throw Error("The reference capital is missing from the local data.");
  const matches = context.capitals.filter((c) => {
    if (rule.continent && c.continent !== rule.continent) return false;
    const delta =
      rule.direction === "north" || rule.direction === "south"
        ? c.lat - reference.lat
        : longitudeDelta(c.lng, reference.lng);
    if (Math.abs(delta + 180) < 1e-8) return false;
    return rule.direction === "north" || rule.direction === "east"
      ? delta > 1e-8
      : delta < -1e-8;
  });
  context.capitalMatches.set(question, matches);
  return matches;
}
