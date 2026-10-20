/** Resolve and validate canonical data, eligibility and expected answers before play. */
import type {
  CountryFact,
  Journey,
  Question,
  QuestionContext,
} from "./questionContracts";
import type { RegionFeature } from "../geography/types";
import { mechanicFor, usesChoiceCards } from "./mechanics";
import { compositeRegion } from "./compositeRegions";
import { isSlotAnswer } from "./ordering";
import { validateQuestionContract } from "./questionBuilder";
import {
  CAPITALS,
  LANGUAGES,
  OFFICIAL_LANGUAGES,
  OFFICIAL_LANGUAGE_COUNTRIES,
  FEATURES,
  COUNTRY_LANGUAGE_PROFILES,
} from "./quizData";
import { inCircle, countryWithinCircle, longitudeDelta } from "./spatial";
import roster from "./data/un-members.v1.json";
import { normalizeAnswer } from "./answerNames";
export {
  normalizeAnswer,
  countryIdForName,
  capitalForName,
} from "./answerNames";
import { answerPlace, validPin } from "./answerTargets";
import { geoContains } from "d3-geo";
import { sphericalGeometry } from "../geography/sphericalGeometry.mjs";
import {
  buildBorderGraph,
  greatCircleCountries,
  shortestLandPath,
} from "./reasoning";

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
    for (const id of round.candidateRegionIds ?? [])
      if (!context.targets.has(id))
        throw Error(`Unknown candidate geography (${round.id}): ${id}`);
    if (round.rule.type === "merged-region") {
      const rule = round.rule;
      if (context.targets.has(rule.targetId))
        throw Error(`Duplicate composite target: ${rule.targetId}`);
      const actual = rule.memberIds
        .flatMap((a, index) =>
          rule.memberIds
            .slice(index + 1)
            .filter((b) => context.graph.get(a)?.has(b))
            .map((b) => [a, b].sort().join("|")),
        )
        .sort();
      const authored = rule.hiddenAdjacencies
        .map((pair) => [...pair].sort().join("|"))
        .sort();
      const reached = new Set([rule.memberIds[0]]);
      for (let pass = 0; pass < rule.memberIds.length; pass++)
        for (const [a, b] of rule.hiddenAdjacencies)
          if (reached.has(a) || reached.has(b)) {
            reached.add(a);
            reached.add(b);
          }
      if (
        actual.join() !== authored.join() ||
        reached.size !== rule.memberIds.length ||
        round.selection.type !== "ids" ||
        round.selection.ids.some(
          (id) =>
            id !== rule.targetId &&
            !regions.some(
              (region) => region.id === id && region.level === "ADM0",
            ),
        )
      )
        throw Error(
          `Invalid canonical composite adjacency or candidates: ${round.id}`,
        );
      context.targets.set(rule.targetId, compositeRegion(regions, round));
      context.names.set(
        rule.targetId,
        rule.memberIds.map((id) => context.names.get(id)).join(" + "),
      );
    }
    for (const choice of round.choices ?? [])
      if (
        choice.id.startsWith("wurl:") &&
        !context.targets.has(choice.id) &&
        !choice.geographyIds?.length
      )
        throw Error(`Unknown country choice ${choice.id} for ${round.id}.`);
    for (const choice of round.choices ?? [])
      for (const id of choice.geographyIds ?? [])
        if (
          !context.targets.has(id) &&
          !answerPlace(round, id) &&
          !round.feedbackPlaces?.some((place) => place.id === id)
        )
          throw Error(`Missing choice geography ${id} for ${round.id}.`);
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
    }
    if (round.mode.startsWith("city-")) {
      // Shape and rule compatibility are already checked by the builder.
      const ids = round.selection.type === "ids" ? round.selection.ids : [];
      if (
        new Set(ids).size !== ids.length ||
        ids.length < 2 ||
        ids.some((id) => !answerPlace(round, id))
      )
        throw Error(
          `City answers require distinct local city candidates for ${round.id}.`,
        );
    }
    const expected = solutionIds(round, context);
    context.solutions.set(round, expected);
    if (
      round.mode === "typed-regions" &&
      round.rule.type === "region-ids" &&
      (expected.length < round.count ||
        expected.some((id) => !context.targets.has(id)) ||
        (round.rule.match !== "any" && expected.length !== round.count))
    )
      throw Error(
        `The local typed region answer data is incomplete for ${round.id}.`,
      );
    if (
      round.mode === "merged-region-single" ||
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
  const ids =
    selection.type === "ids"
      ? selection.ids
      : selection.type === "neighbors"
        ? [...(context.graph.get(selection.of) ?? [])]
        : [...context.members].filter(
            (id) => !selection.excludeIds?.includes(id),
          );
  return mechanicFor(question).mapSelection === "regions"
    ? ids.filter((id) => !question.contextIds?.includes(id))
    : ids;
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
  if (rule.type === "merged-region") return [rule.targetId];
  if (rule.type === "text-fact") return [rule.countryId];
  if (
    rule.type === "manual-text" ||
    rule.type === "manual-number" ||
    rule.type === "numeric-range"
  )
    return [];
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
