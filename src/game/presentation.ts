import { capitalForName, countryIdForName } from "./answerNames";
import { answerPlace, pinInside } from "./answerTargets";
import { REGIONAL_INDEX, exploreBoundaries } from "../geography/regions";
import type { VisualState } from "../geography/types";
import type { Journey, Question, QuestionContext } from "./questionContracts";
import {
  solutionIds,
  matchingCapitals,
  selectableIds,
} from "./questionPreparation";
import type { PlaceFeature, RegionFeature } from "../geography/types";
import { geoContains } from "d3-geo";
import { sphericalGeometry } from "../geography/sphericalGeometry.mjs";
import type { Answer, GameState } from "./state";
import { compositeRegion } from "./compositeRegions";
import { candidateAvailable } from "./guidance";

export function questionPlaces(
  question: Question,
  context: QuestionContext | undefined,
  phase: GameState["phase"],
  responseText = "",
  correct = false,
  response?: GameState,
): PlaceFeature[] {
  if (phase === "home" || phase === "finished") return [];
  if (
    question.mode === "choice-match" &&
    context &&
    (phase === "feedback" || phase === "failed")
  ) {
    const expected = solutionIds(question, context);
    return (question.feedbackPlaces ?? question.places ?? []).map((place) => {
      const assigned = response?.ordered.indexOf(place.id) ?? -1;
      return {
        ...place,
        visualState:
          assigned >= 0
            ? expected[assigned] === place.id
              ? "correct"
              : "incorrect"
            : expected.includes(place.id)
              ? "answer"
              : (place.visualState ?? "hinted"),
      };
    });
  }
  if (question.rule.type === "merged-region" && context) {
    if (phase !== "feedback" && phase !== "failed") return [];
    if (question.feedbackPlaces) return question.feedbackPlaces;
    return question.rule.memberIds.map((id): PlaceFeature => {
      const region = context.targets.get(id)!;
      return {
        id: `territory-label:${id}`,
        name: context.names.get(id)!,
        kind: "other",
        sourceId: "journey",
        markerHidden: true,
        lat: region.focus.lat,
        lng: region.focus.lng,
        visualState: correct ? "correct" : "answer",
      };
    });
  }
  if (question.mode === "pin") {
    const reveal = phase === "feedback" || phase === "failed";
    const result: PlaceFeature[] = (question.places ?? []).filter(
      (place) =>
        place.markerHidden &&
        (question.rule.type !== "pin-distance" ||
          place.id !== question.rule.targetId),
    );
    if (response?.pin)
      result.push({
        id: `pin:${question.id}:guess`,
        name: "Your pin",
        kind: "pin",
        sourceId: "player",
        ...response.pin,
        visualState: reveal ? (correct ? "correct" : "incorrect") : "selected",
      });
    if (reveal && question.rule.type === "pin-distance") {
      const target = answerPlace(question, question.rule.targetId);
      if (target)
        result.push({
          ...target,
          ...question.feedbackPlaces?.find((place) => place.id === target.id),
          kind: "pin",
          visualState: "answer",
        });
    }
    if (reveal)
      for (const place of question.feedbackPlaces ?? [])
        if (!result.some((p) => p.id === place.id)) result.push(place);
    return result;
  }
  if (question.mode.startsWith("city-") && context) {
    const reveal = phase === "feedback" || phase === "failed";
    const expected = solutionIds(question, context);
    return [
      ...(reveal
        ? (question.feedbackPlaces ?? question.places ?? [])
        : (question.places ?? [])
      ).filter((place) => !selectableIds(question, context).includes(place.id)),
      ...selectableIds(question, context).flatMap((id) => {
        if (!reveal && response && !candidateAvailable(question, response, id))
          return [];
        const place = answerPlace(question, id);
        if (!place) return [];
        const selected = response?.selectedIds.includes(id);
        const feedback = reveal
          ? question.feedbackPlaces?.find((p) => p.id === id)
          : undefined;
        const named =
          reveal ||
          question.disclosure.namedChoices ||
          (selected && question.disclosure.committedNames);
        const displayName = feedback?.name ?? place.name;
        return [
          {
            ...place,
            answerTarget: true,
            priority: feedback?.priority ?? place.priority,
            // Anonymous city markers never carry hidden labels into the renderer.
            name: named ? displayName : "",
            labelHidden: !named,
            hoverName:
              named || question.disclosure.hoverNames ? displayName : undefined,
            visualState: (reveal
              ? selected
                ? expected.includes(id)
                  ? "correct"
                  : "incorrect"
                : expected.includes(id)
                  ? "answer"
                  : (feedback?.visualState ?? "disabled")
              : selected
                ? "selected"
                : "selectable") as VisualState,
          },
        ];
      }),
    ];
  }
  if (phase === "feedback" && context && question.rule.type === "capital-order")
    return question.rule.countryIds.flatMap((id) => {
      const capital = context.capitals.find((c) => c.countryId === id);
      return capital ? [capital] : [];
    });
  if (
    phase === "feedback" &&
    context &&
    (question.rule.type === "capital-coordinate" ||
      question.rule.type === "capital-circle")
  ) {
    const accepted =
      question.rule.type === "capital-coordinate" && correct
        ? capitalForName(context, responseText)
        : undefined;
    const reveal = accepted ? [accepted] : matchingCapitals(question, context);
    return [
      ...new Map(
        [...(question.places ?? []), ...reveal].map((c) => [c.id, c]),
      ).values(),
    ];
  }
  if (
    phase === "feedback" &&
    context &&
    question.rule.type === "capital-name"
  ) {
    const countryId = question.rule.countryId;
    const targetId = context.capitals.find(
      (capital) => capital.countryId === countryId,
    )?.id;
    return (question.feedbackPlaces ?? question.places ?? []).map((place) =>
      place.id === targetId
        ? {
            ...place,
            visualState: correct ? ("correct" as const) : ("answer" as const),
          }
        : place,
    );
  }
  return phase === "feedback"
    ? (question.feedbackPlaces ?? question.places ?? []).map<PlaceFeature>(
        (place) =>
          question.mode.startsWith("choice-") && place.answerTarget
            ? { ...place, visualState: correct ? "correct" : "answer" }
            : place,
      )
    : (question.places ?? []);
}

export function questionMapPresentation(
  question: Question,
  phase: GameState["phase"],
  correct = false,
) {
  const recap = phase === "home" || phase === "finished";
  const reveal =
    phase === "feedback" &&
    (question.map?.revealOnAnswer ||
      (correct && question.map?.revealOnCorrect));
  return {
    borders:
      phase === "feedback" && question.map?.feedbackBorders !== undefined
        ? question.map.feedbackBorders
        : recap || !!reveal || question.map?.borders !== false,
    hover: recap || !!reveal || question.map?.hoverFeedback !== false,
    muteOthers:
      !recap &&
      !reveal &&
      !!question.map?.muteOthers &&
      (phase === "playing" || question.map?.revealOnCorrect === true),
  };
}

export const highlightedPartId = (countryId: string) =>
  `clue-part:${countryId}`;

/** Dark island clues must not turn a tap into the (hidden) owner's country ID. */
export function regionAnswerId(
  question: Question,
  region: RegionFeature,
): string | undefined {
  if (
    question.rule.type === "merged-region" &&
    question.rule.memberIds.includes(region.id)
  )
    return question.rule.targetId;
  if (!region.id.startsWith("clue-part:")) return region.id;
  if (
    question.highlightParts?.some(
      (part) => part.countryId === region.parentId && part.tone === "dark",
    )
  )
    return undefined;
  return region.parentId ?? region.id;
}
const regionVariants = new WeakMap<
  RegionFeature[],
  WeakMap<Question, Map<string, RegionFeature[]>>
>();
// A display fragment is never a country identity. During the clue only, separate
// the selected component so the rest of its owner's territory stays neutral.
export function questionRegions(
  regions: RegionFeature[],
  question: Question,
  phase: GameState["phase"],
  helpStage?: "hinted" | "assisted",
) {
  if (question.rule.type === "merged-region" && phase === "playing") {
    // Help changes candidate states, not the composite boundary geometry.
    let variants = regionVariants.get(regions);
    const cached = variants?.get(question)?.get(phase);
    if (cached) return cached;
    const memberIds = question.rule.memberIds;
    const result = [
      ...regions.filter((region) => !memberIds.includes(region.id)),
      compositeRegion(regions, question),
    ];
    if (!variants) regionVariants.set(regions, (variants = new WeakMap()));
    variants.set(question, new Map([[phase, result]]));
    return result;
  }
  const cacheKey = `${phase}:${helpStage ?? ""}`;
  const highlights = (question.highlightParts ?? []).filter(
    (highlight) =>
      phase === "playing" || (phase === "feedback" && !!highlight.reveal),
  );
  // An imported reveal is available to the answer checker, but must not leave
  // an identifying outline in the playable map before the answer is committed.
  const imported = (question.importedRegions ?? []).filter((region) => {
    if (
      question.mode === "pin" &&
      phase === "playing" &&
      !question.contextIds?.includes(region.id) &&
      !(helpStage === "assisted" &&
        question.guidance?.assist?.regionIds?.includes(region.id))
    )
      return false;
    if (
      phase !== "playing" ||
      !question.feedbackContextIds?.includes(region.id)
    )
      return true;
    const mapTarget =
      ["map-single", "map-multiple", "land-path"].includes(question.mode) &&
      question.selection.type === "ids" &&
      question.selection.ids.includes(region.id);
    return question.contextIds?.includes(region.id) || mapTarget;
  });
  const displays = Object.entries(question.displayGeometries ?? {});
  if (!highlights.length && !imported.length && !displays.length)
    return regions;
  let variants = regionVariants.get(regions);
  const cached = variants?.get(question)?.get(cacheKey);
  if (cached) return cached;
  const regionalIds = new Set(REGIONAL_INDEX.map((r) => r.id));
  const canonical = imported.filter((r) => regionalIds.has(r.id));
  const layers = [...new Set(canonical.map((r) => r.parentId))]
    .map((parent) => canonical.filter((r) => r.parentId === parent))
    .sort((a, b) => a[0].level.localeCompare(b[0].level));
  const result = [
    ...exploreBoundaries(regions, layers),
    ...imported.filter((r) => !regionalIds.has(r.id)),
  ];
  for (const [id, displayGeometry] of displays) {
    const index = result.findIndex((r) => r.id === id);
    if (index < 0)
      throw Error(`The display geometry's region is missing: ${id}`);
    result[index] = { ...result[index], displayGeometry };
  }
  for (const highlight of highlights) {
    const index = result.findIndex((r) => r.id === highlight.countryId);
    if (index < 0)
      throw Error("The highlighted territory's country is missing.");
    const owner = result[index];
    const parts =
      owner.geometry.type === "Polygon"
        ? [owner.geometry.coordinates]
        : owner.geometry.coordinates;
    const points = highlight.points ?? [highlight.point];
    const selectedParts = parts.filter((coordinates) =>
      points.some((point) =>
        geoContains(sphericalGeometry({ type: "Polygon", coordinates }), [
          point.lng,
          point.lat,
        ]),
      ),
    );
    if (!selectedParts.length)
      throw Error("The highlighted territory is missing from the local map.");
    const remaining = parts.filter((part) => !selectedParts.includes(part));
    const fragment: RegionFeature = {
      ...owner,
      id: highlightedPartId(owner.id),
      name:
        phase === "feedback"
          ? (highlight.name ?? "Highlighted territory")
          : "Highlighted territory",
      parentId: owner.id,
      focus: highlight.point,
      geometry:
        highlight.geometry ??
        (selectedParts.length === 1
          ? { type: "Polygon", coordinates: selectedParts[0] }
          : { type: "MultiPolygon", coordinates: selectedParts }),
    };
    result.splice(
      index,
      1,
      ...(remaining.length
        ? [
            {
              ...owner,
              geometry: {
                type: "MultiPolygon" as const,
                coordinates: remaining,
              },
            },
          ]
        : []),
      fragment,
    );
  }
  if (!variants) regionVariants.set(regions, (variants = new WeakMap()));
  let phases = variants.get(question);
  if (!phases) variants.set(question, (phases = new Map()));
  phases.set(cacheKey, result);
  return result;
}

export function questionVisualStates(
  question: Question,
  context: QuestionContext,
  game: GameState,
) {
  const states: Record<string, VisualState> = Object.fromEntries(
    [...context.regions, ...(question.importedRegions ?? [])].map((r) => [
      r.id,
      question.map?.neutralRegions ? "default" : "disabled",
    ]),
  );
  if (game.phase === "home") return {};
  if (question.rule.type === "merged-region") {
    if (game.phase === "playing") {
      for (const id of selectableIds(question, context))
        states[id] = candidateAvailable(question, game, id)
          ? "selectable"
          : "disabled";
      for (const id of game.selectedIds) states[id] = "selected";
    } else {
      for (const id of question.rule.memberIds)
        states[id] = game.answers.at(-1)?.correct ? "correct" : "answer";
      for (const id of game.selectedIds)
        if (id !== question.rule.targetId) states[id] = "incorrect";
    }
    return states;
  }
  const blindFeedback =
    game.phase === "feedback" &&
    question.map?.revealOnCorrect &&
    !question.map.revealOnAnswer &&
    !game.answers.at(-1)?.correct;
  if (game.phase === "playing" || blindFeedback) {
    // Muting unrelated land must not disable explicitly highlighted candidates.
    if (
      question.selection.type !== "none" &&
      (!question.map?.muteOthers || question.map.candidates === "highlighted")
    )
      for (const id of selectableIds(question, context))
        if (context.targets.has(id))
          states[id] =
            question.selection.type === "neighbors" ||
            question.map?.candidates === "highlighted"
              ? "selectable"
              : "default";
    if (question.disclosure.previousVisits)
      for (const answer of game.answers)
        for (const id of answer.selectedIds)
          if (context.members.has(id) && states[id] !== "disabled")
            states[id] = "visited";
    // Context is a set of equally important clues. Array position carries no role.
    for (const id of question.contextIds ?? [])
      if (!question.highlightParts?.some((part) => part.countryId === id))
        states[id] = "hinted";
    if (game.phase === "playing" && game.help?.[question.id])
      for (const id of
        game.help[question.id] === "assisted"
          ? (question.guidance?.assist?.regionIds ??
            question.guidance?.hintMap?.regionIds ?? [])
          : (question.guidance?.hintMap?.regionIds ?? []))
        if (id in states) states[id] = "hinted";
    if (game.phase === "playing" && game.help?.[question.id] === "assisted")
      for (const id of selectableIds(question, context))
        if (context.targets.has(id)) {
          if (!candidateAvailable(question, game, id)) states[id] = "disabled";
          else if (question.mode.startsWith("map-")) states[id] = "selectable";
        }
    if (!question.mode.startsWith("choice-"))
      for (const id of game.selectedIds)
        if (context.targets.has(id))
          states[id] =
            question.commitment === "immediate" ? "correct" : "selected";
    if (question.rule.type === "official-languages" && game.selectedIds.length)
      states[question.rule.countryId] = "selected";
    for (const highlight of question.highlightParts ?? [])
      states[highlightedPartId(highlight.countryId)] =
        highlight.tone === "dark"
          ? "clue"
          : game.selectedIds.length
            ? "selected"
            : "hinted";
    return states;
  }
  const expected = solutionIds(question, context);
  for (const id of question.feedbackHintIds ?? [])
    if (context.targets.has(id)) states[id] = "hinted";
  if (question.map?.feedbackRegions === "neutral") return states;
  // A pin question's outlined clues stay yellow on reveal; they are not answers.
  if (question.mode === "pin")
    for (const id of question.contextIds ?? [])
      if (question.map?.borderIds?.includes(id) && !expected.includes(id))
        states[id] = "hinted";
  for (const id of expected) if (context.names.has(id)) states[id] = "answer";
  if (question.rule.type === "pin-inside")
    for (const id of expected) {
      if (
        pinInside(
          { ...question, rule: { type: "pin-inside", ids: [id] } },
          context,
          game,
        )
      )
        states[id] = "correct";
    }
  if (question.rule.type === "official-languages")
    states[question.rule.countryId] = game.answers.at(-1)?.correct
      ? "correct"
      : "answer";
  for (const id of question.feedbackContextIds ??
    (["choice-ids", "manual-text", "manual-number"].includes(question.rule.type)
      ? (question.contextIds ?? [])
      : []))
    states[id] = game.answers.at(-1)?.correct ? "correct" : "answer";
  const mistakes = new Set<string>();
  for (const id of game.selectedIds)
    if (context.targets.has(id)) {
      states[id] = expected.includes(id) ? "correct" : "incorrect";
      if (!expected.includes(id)) mistakes.add(id);
    }
  if (
    question.mode === "typed-regions" ||
    question.mode === "ordered-countries" ||
    question.mode === "ordered-capitals" ||
    question.mode === "choice-order"
  )
    game.ordered.forEach((value, i) => {
      const id =
        question.mode === "choice-order"
          ? value
          : question.mode === "ordered-capitals"
            ? capitalForName(context, value)?.countryId
            : countryIdForName(context, value);
      if (!id) return;
      const correct =
        question.mode === "typed-regions"
          ? expected.includes(id)
          : expected[i] === id;
      states[id] = correct ? "correct" : "incorrect";
      if (!correct) mistakes.add(id);
    });
  if (question.mode === "text") {
    const capital = capitalForName(context, game.text);
    if (capital)
      states[capital.countryId] = game.answers.at(-1)?.correct
        ? "correct"
        : "incorrect";
    else if (game.answers.at(-1)?.correct)
      for (const id of expected)
        if (context.targets.has(id)) states[id] = "correct";
  }
  for (const highlight of question.highlightParts ?? [])
    if (highlight.reveal) {
      const owner = states[highlight.countryId];
      const namedPartAnswered =
        question.mode === "choice-single" && !!game.answers.at(-1)?.correct;
      const knownContext =
        question.mode.startsWith("map-") &&
        question.feedbackHintIds?.includes(highlight.countryId) &&
        !expected.includes(highlight.countryId) &&
        !question.feedbackContextIds?.includes(highlight.countryId);
      states[highlightedPartId(highlight.countryId)] = knownContext
        ? "hinted"
        : owner === "correct" || namedPartAnswered
          ? "correct"
          : "answer";
      if (highlight.reveal === "part") states[highlight.countryId] = "disabled";
    }
  for (const id of mistakes) states[id] = "incorrect";
  return states;
}

// Context countries and written-answer geography are part of the journey too.
// A multiple-pick rule contributes only the actual picks, not every valid answer.
export function journeyVisitedStates(
  journey: Journey,
  context: QuestionContext,
  answers: Answer[],
) {
  const states: Record<string, VisualState> = {};
  const mistakes = new Set<string>();
  for (const answer of answers) {
    const question = journey.rounds.find((q) => q.id === answer.roundId);
    if (!question) continue;
    if (question.rule.type === "merged-region") {
      for (const id of question.rule.memberIds) states[id] = "visited";
      continue;
    }
    if (
      question.mode.startsWith("city-") ||
      question.rule.type === "pin-distance"
    ) {
      for (const id of [
        ...solutionIds(question, context),
        ...answer.selectedIds,
      ]) {
        const parent = answerPlace(question, id)?.parentId;
        if (parent && context.names.has(parent)) states[parent] = "visited";
      }
    }
    if (question.rule.type === "pin-inside")
      for (const id of question.rule.ids) states[id] = "visited";
    for (const id of [
      ...(question.contextIds ?? []),
      ...(question.feedbackContextIds ?? []),
      ...answer.selectedIds,
    ])
      if (context.names.has(id)) states[id] = "visited";
    if (question.rule.type === "capital-coordinate") {
      const capital = capitalForName(context, answer.text);
      if (capital && answer.correct) states[capital.countryId] = "visited";
      else if (capital) mistakes.add(capital.countryId);
      continue;
    }
    const expected = solutionIds(question, context);
    if (question.mode === "typed-regions") {
      for (const value of answer.ordered) {
        const id = countryIdForName(context, value);
        if (!id || !context.targets.has(id)) continue;
        states[id] = "visited";
        if (!expected.includes(id)) mistakes.add(id);
      }
      continue;
    }
    if (
      question.mode === "ordered-capitals" ||
      question.mode === "ordered-countries"
    )
      answer.ordered.forEach((value, i) => {
        const id =
          question.mode === "ordered-capitals"
            ? capitalForName(context, value)?.countryId
            : countryIdForName(context, value);
        if (id && context.members.has(id)) {
          states[id] = "visited";
          if (expected[i] !== id) mistakes.add(id);
        }
      });
    if (question.mode !== "map-multiple")
      for (const id of question.mode === "land-path" && answer.correct
        ? answer.selectedIds
        : expected)
        if (context.names.has(id)) states[id] = "visited";
    if (!answer.correct)
      for (const id of answer.selectedIds)
        if (question.mode === "land-path" || !expected.includes(id))
          if (context.targets.has(id)) mistakes.add(id);
  }
  for (const id of mistakes) states[id] = "incorrect";
  return states;
}
