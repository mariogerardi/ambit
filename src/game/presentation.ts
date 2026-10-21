import { capitalForName, countryIdForName } from "./answerNames";
import { answerPlace, pinInside, responsePlaceForName } from "./answerTargets";
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
import {
  answerItems,
  acceptsAlternatives,
  responseIds,
} from "./answerPresentation";
import { pinBands } from "./pinPresentation";
import { interiorAnchor } from "../geography/interiorAnchor";
import { presentJourneyPlace, cityReference } from "./authoredPlaces";
import { reviewedBearing } from "./compassBearing";
import { mechanicFor } from "./mechanics";

export function questionPlaces(
  question: Question,
  context: QuestionContext | undefined,
  phase: GameState["phase"],
  responseText = "",
  correct = false,
  response?: GameState,
): PlaceFeature[] {
  return resolveQuestionPlaces(
    question,
    context,
    phase,
    responseText,
    correct,
    response,
  ).map(presentJourneyPlace);
}

function resolveQuestionPlaces(
  question: Question,
  context: QuestionContext | undefined,
  phase: GameState["phase"],
  responseText = "",
  correct = false,
  response?: GameState,
): PlaceFeature[] {
  if (phase === "home" || phase === "finished") return [];
  if (question.rule.type === "bearing-angle") {
    const reveal = phase === "feedback" || phase === "failed";
    const snapshot = response && reviewedBearing(question, response);
    const origin = snapshot?.origin ?? question.rule.origin;
    const destination = snapshot?.destination ?? question.rule.destination;
    const references = (question.places ?? [])
      .filter((p) => p.id !== origin.id && p.id !== destination.id)
      .map(cityReference);
    return [
      cityReference(origin),
      ...references,
      ...(reveal
        ? [
            {
              ...destination,
              displayRole: undefined,
              visualState: correct ? ("correct" as const) : ("answer" as const),
              answerTarget: false,
            },
            ...(question.feedbackPlaces ?? []).filter(
              (p) => p.id !== origin.id && p.id !== destination.id,
            ),
          ]
        : []),
    ];
  }
  const items =
    context && response ? answerItems(question, context, response) : [];
  const projectPlaces = (places: PlaceFeature[]) =>
    places.map((place) => {
      const item = items.find((item) => item.geographyIds.includes(place.id));
      if (!item) return place;
      const reveal = phase === "feedback" || phase === "failed";
      // Existing marker visibility is authored; mapping never introduces a hidden marker.
      return {
        ...place,
        visualState:
          reveal ||
          question.mode === "choice-match" ||
          question.map?.candidates === "highlighted"
            ? item.state
            : place.visualState,
        markerBadge:
          question.mode === "choice-match" && item.slot !== undefined
            ? String(item.slot + 1)
            : place.markerBadge,
      };
    });
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
        markerBadge: assigned >= 0 ? String(assigned + 1) : undefined,
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
    const result: PlaceFeature[] = (
      question.bearingIntersection
        ? question.bearingIntersection.stations.map(cityReference)
        : (question.places ?? [])
    ).filter(
      (place) =>
        (place.markerHidden || place.displayRole === "reference") &&
        (question.rule.type !== "pin-distance" ||
          place.id !== question.rule.targetId),
    );
    if (response?.pin)
      result.push({
        id: `pin:${question.id}:guess`,
        name: "",
        labelHidden: true,
        kind: "pin",
        sourceId: "player",
        ...response.pin,
        visualState: reveal ? (correct ? "correct" : "incorrect") : "selected",
        accuracyBand:
          reveal && correct
            ? pinBands(question, response).find((band) => band.achieved)
            : undefined,
      });
    if (reveal && question.rule.type === "pin-distance") {
      const target = answerPlace(question, question.rule.targetId);
      if (target)
        result.push({
          ...target,
          ...question.feedbackPlaces?.find((place) => place.id === target.id),
          kind: "pin",
          markerRole: "target",
          markerSize: 30,
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
  if (
    phase === "feedback" &&
    context &&
    question.rule.type === "capital-order"
  ) {
    const expected = question.rule.countryIds;
    const supplied = (response?.ordered ?? []).map((name) =>
      responsePlaceForName(question, context, name),
    );
    const capitals = new Map(
      [
        ...expected.map((id) =>
          context.capitals.find((c) => c.countryId === id),
        ),
        ...supplied,
      ]
        .filter((capital) => !!capital)
        .map((capital) => [capital.id, capital]),
    );
    return [...capitals.values()].map<PlaceFeature>((capital) => {
      const slot = supplied.findIndex((place) => place?.id === capital.id);
      return {
        ...capital,
        visualState:
          slot >= 0
            ? context.capitals.find((p) => p.countryId === expected[slot])
                ?.id === capital.id
              ? "correct"
              : "incorrect"
            : "answer",
        markerBadge: slot >= 0 ? String(slot + 1) : undefined,
      };
    });
  }
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
    const submitted =
      question.rule.type === "capital-coordinate"
        ? responsePlaceForName(question, context, responseText)
        : undefined;
    return [
      ...new Map(
        [
          ...(question.places ?? []).map((place) => ({
            ...place,
            visualState: place.visualState ?? ("hinted" as const),
          })),
          ...reveal.map((place) => ({
            ...place,
            visualState:
              accepted?.id === place.id
                ? ("correct" as const)
                : ("answer" as const),
          })),
          ...(submitted && !correct
            ? [{ ...submitted, visualState: "incorrect" as const }]
            : []),
        ].map((place) => [place.id, place]),
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
    const places = question.feedbackPlaces ?? question.places ?? [];
    const submitted = responsePlaceForName(question, context, responseText);
    const result = places.map((place) => ({
      ...place,
      visualState:
        place.id === targetId
          ? correct
            ? ("correct" as const)
            : ("answer" as const)
          : !correct && place.id === submitted?.id
            ? ("incorrect" as const)
            : place.visualState,
    }));
    if (
      !correct &&
      submitted &&
      !result.some((place) => place.id === submitted.id)
    )
      result.push({ ...submitted, visualState: "incorrect" });
    return result;
  }
  return phase === "feedback"
    ? projectPlaces(
        (question.feedbackPlaces ?? question.places ?? []).map<PlaceFeature>(
          (place) =>
            question.mode.startsWith("choice-") &&
            place.answerTarget &&
            items.some((item) => item.geographyIds.includes(place.id))
              ? { ...place, visualState: "answer" }
              : place,
        ),
      )
    : projectPlaces(
        question.mode === "choice-match"
          ? (question.places ?? []).map((place) => ({
              ...place,
              visualState: "selectable" as const,
            }))
          : (question.places ?? []),
      );
}

export function questionMapPresentation(
  question: Question,
  phase: GameState["phase"],
  correct = false,
  helpStage?: "hinted" | "assisted",
) {
  const recap = phase === "home" || phase === "finished";
  const reveal =
    phase === "feedback" &&
    (question.map?.revealOnAnswer ||
      (correct && question.map?.revealOnCorrect));
  return {
    borders:
      phase === "playing" &&
      helpStage === "assisted" &&
      question.guidance?.assist?.borders !== undefined
        ? question.guidance.assist.borders
        : phase === "feedback" && question.map?.feedbackBorders !== undefined
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
      phase === "playing" ||
      ((phase === "feedback" || phase === "finished") && !!highlight.reveal),
  );
  // An imported reveal is available to the answer checker, but must not leave
  // an identifying outline in the playable map before the answer is committed.
  const imported = (question.importedRegions ?? []).filter((region) => {
    if (
      question.mode === "pin" &&
      phase === "playing" &&
      !question.contextIds?.includes(region.id) &&
      !(
        helpStage === "assisted" &&
        question.guidance?.assist?.regionIds?.includes(region.id)
      )
    )
      return false;
    if (
      phase !== "playing" ||
      (!question.feedbackContextIds?.includes(region.id) &&
        !question.feedbackHintIds?.includes(region.id))
    )
      return true;
    const mapTarget =
      ["map-single", "map-multiple", "land-path"].includes(question.mode) &&
      question.selection.type === "ids" &&
      question.selection.ids.includes(region.id);
    const choiceTarget =
      question.map?.candidates === "highlighted" &&
      question.choices?.some((choice) =>
        choice.geographyIds?.includes(region.id),
      );
    return (
      question.contextIds?.includes(region.id) || mapTarget || choiceTarget
    );
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
        phase === "feedback" || phase === "finished"
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
  const wholeWorld =
    question.selection.type === "members" &&
    mechanicFor(question).mapSelection === "regions";
  const states: Record<string, VisualState> = Object.fromEntries(
    [...context.regions, ...(question.importedRegions ?? [])].map((r) => [
      r.id,
      game.phase === "playing" &&
      (question.map?.background === "open-search" ||
        (wholeWorld &&
          question.map?.candidates === "neutral" &&
          context.members.has(r.id)))
        ? "surface"
        : question.map?.neutralRegions
          ? "default"
          : "disabled",
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
              : wholeWorld && question.map?.candidates === "neutral"
                ? "surface"
                : question.map?.candidates === "decorative"
                  ? "surface"
                  : "disabled";
    for (const id of question.candidateRegionIds ?? [])
      if (context.targets.has(id))
        states[id] =
          question.map?.candidateRole === "clue" ? "clue" : "selectable";
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
      for (const id of game.help[question.id] === "assisted"
        ? (question.guidance?.assist?.regionIds ??
          question.guidance?.hintMap?.regionIds ??
          [])
        : (question.guidance?.hintMap?.regionIds ?? []))
        if (id in states) states[id] = "hinted";
    if (game.phase === "playing" && game.help?.[question.id] === "assisted")
      for (const id of selectableIds(question, context))
        if (context.targets.has(id)) {
          if (!candidateAvailable(question, game, id)) states[id] = "disabled";
          else if (
            question.mode.startsWith("map-") &&
            question.guidance?.assist?.candidateIds
          )
            states[id] = "selectable";
        }
    if (
      !question.mode.startsWith("choice-") &&
      question.map?.selectionFeedback !== "after-submit"
    )
      for (const id of game.selectedIds)
        if (
          context.targets.has(id) &&
          !(
            mechanicFor(question).mapSelection === "regions" &&
            question.contextIds?.includes(id)
          )
        )
          states[id] =
            question.commitment === "immediate" && question.count > 1
              ? "correct"
              : "selected";
    for (const highlight of question.highlightParts ?? [])
      states[highlightedPartId(highlight.countryId)] =
        highlight.tone === "dark"
          ? "clue"
          : game.selectedIds.includes(highlight.countryId)
            ? "selected"
            : "hinted";
    for (const item of answerItems(
      question,
      context,
      blindFeedback ? { ...game, phase: "playing" } : game,
    ))
      for (const id of item.geographyIds)
        if (
          context.targets.has(id) &&
          (states[id] === "selectable" ||
            states[id] === "clue" ||
            states[id] === "selected" ||
            question.map?.candidates === "highlighted")
        )
          // A named or typed answer must not identify an anonymous candidate shape.
          // Elimination remains independent of pending selection and never reveals the pick.
          states[id] =
            question.map?.selectionFeedback === "after-submit"
              ? item.eliminated
                ? "disabled"
                : question.map.candidateRole === "clue"
                  ? "clue"
                  : "selectable"
              : item.state;
    return states;
  }
  const expected = solutionIds(question, context);
  for (const id of question.feedbackHintIds ?? question.contextIds ?? [])
    if (context.targets.has(id)) states[id] = "hinted";
  // Once a location is revealed, its containing area supplies orientation, not a grade.
  for (const place of questionPlaces(
    question,
    context,
    game.phase,
    game.text,
    !!game.answers.at(-1)?.correct,
    game,
  ))
    if (
      place.parentId &&
      context.targets.has(place.parentId) &&
      !place.markerHidden &&
      ["correct", "answer", "incorrect"].includes(place.visualState ?? "") &&
      place.displayRole !== "explanation"
    )
      states[place.parentId] = "hinted";
  if (question.map?.feedbackRegions === "neutral") return states;
  const placeAnswer =
    question.mode.startsWith("city-") ||
    question.mode === "ordered-capitals" ||
    question.mode === "compass-bearing" ||
    ["capital-name", "capital-coordinate", "capital-circle"].includes(
      question.rule.type,
    );
  if (!placeAnswer)
    for (const id of expected)
      if (context.targets.has(id))
        // A count's qualifying set or shortest route is its geographic solution.
        // Supporting context stays blue; no per-area selection symbols are added.
        states[id] =
          question.mode === "number" && game.answers.at(-1)?.correct
            ? "correct"
            : "answer";
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
  // Explicit reveal geography is solution evidence, not a proxy for the player's grade.
  for (const id of question.feedbackContextIds ?? [])
    if (context.targets.has(id))
      states[id] = question.mode === "number" ? "hinted" : "answer";
  if (
    !placeAnswer &&
    question.mode !== "pin" &&
    question.mode !== "land-path" &&
    question.mode !== "number"
  )
    for (const item of answerItems(question, context, game))
      for (const id of item.geographyIds)
        if (
          context.targets.has(id) &&
          (item.state !== "disabled" || states[id] !== "hinted")
        )
          states[id] = item.state;
  for (const highlight of question.highlightParts ?? [])
    if (highlight.reveal) {
      const owner = states[highlight.countryId];
      const namedPartAnswered =
        question.mode === "choice-single" && !!game.answers.at(-1)?.correct;
      const knownContext =
        question.mode.startsWith("map-") &&
        (question.feedbackHintIds ?? question.contextIds)?.includes(
          highlight.countryId,
        ) &&
        !expected.includes(highlight.countryId) &&
        !question.feedbackContextIds?.includes(highlight.countryId);
      states[highlightedPartId(highlight.countryId)] = knownContext
        ? "hinted"
        : owner === "correct" || namedPartAnswered
          ? "correct"
          : "answer";
      if (highlight.reveal === "part") states[highlight.countryId] = "disabled";
    }
  return states;
}

// Required revealed solutions survive a miss. Alternative-answer tasks retain
// the accepted picks or one canonical example, rather than the entire valid pool.
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
    const review: GameState = {
      ...answer,
      phase: "feedback",
      roundIndex: journey.rounds.indexOf(question),
      answers: [answer],
    };
    const example =
      acceptsAlternatives(question) && question.mode !== "number"
        ? new Set(
            answer.correct
              ? responseIds(question, context, review)
              : solutionIds(question, context).slice(0, question.count),
          )
        : undefined;
    for (const [id, state] of Object.entries(
      questionVisualStates(question, context, review),
    ))
      if (
        (state === "correct" || state === "answer") &&
        (!example || example.has(id) || id.startsWith("clue-part:"))
      )
        states[id] = "visited";
    // Choice IDs and merged targets need their graded depiction, not raw save IDs.
    if (question.mode !== "ordered-capitals")
      for (const item of answerItems(question, context, review))
        if (item.state === "incorrect")
          for (const id of item.geographyIds)
            if (context.targets.has(id)) mistakes.add(id);
    // The containing country is orientation for an answered city, even on a miss.
    for (const place of questionPlaces(
      question,
      context,
      "feedback",
      answer.text,
      answer.correct,
      review,
    ))
      if (
        place.parentId &&
        context.names.has(place.parentId) &&
        !place.markerHidden &&
        place.sourceId !== "player" &&
        ["correct", "answer", "incorrect"].includes(place.visualState ?? "")
      )
        states[place.parentId] = "visited";
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
      ...(question.highlightParts ?? []).map((part) => part.countryId),
      ...answer.selectedIds,
    ])
      if (context.names.has(id)) states[id] = "visited";
    if (question.rule.type === "capital-coordinate") {
      const capital = capitalForName(context, answer.text);
      if (capital && answer.correct) states[capital.countryId] = "visited";
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
          if (question.mode === "ordered-countries" && expected[i] !== id)
            mistakes.add(id);
        }
      });
    if (question.mode !== "map-multiple")
      for (const id of question.mode === "land-path" && answer.correct
        ? answer.selectedIds
        : expected.filter((id) => !example || example.has(id)))
        if (context.names.has(id)) states[id] = "visited";
    if (!answer.correct)
      for (const id of answer.selectedIds)
        if (question.mode === "land-path" || !expected.includes(id))
          if (context.targets.has(id)) mistakes.add(id);
  }
  for (const id of mistakes) states[id] = "incorrect";
  return states;
}

/** Completion keeps discoveries and actual mistakes independently of custom decoration. */
export function journeyDiscoveryPlaces(
  journey: Journey,
  context: QuestionContext,
  answers: Answer[],
): PlaceFeature[] {
  const places = new Map<string, PlaceFeature>();
  for (const answer of answers) {
    const index = journey.rounds.findIndex(
      (question) => question.id === answer.roundId,
    );
    if (index < 0) continue;
    const question = journey.rounds[index];
    const game: GameState = {
      ...answer,
      phase: "feedback",
      roundIndex: index,
      answers: [answer],
    };
    for (const place of questionPlaces(
      question,
      context,
      "feedback",
      answer.text,
      answer.correct,
      game,
    )) {
      const mistake = place.visualState === "incorrect";
      if (
        place.markerRole === "annotation" ||
        (place.sourceId === "player" && !mistake) ||
        (!["correct", "answer", "incorrect"].includes(
          place.visualState ?? "",
        ) &&
          place.displayRole !== "explanation")
      )
        continue;
      const original = answerPlace(question, place.id);
      const previous = places.get(place.id);
      places.set(
        place.id,
        presentJourneyPlace({
          ...place,
          kind:
            place.sourceId === "player"
              ? "pin"
              : (original?.kind ??
                (place.kind === "pin" ? "landmark" : place.kind)),
          visualState:
            mistake || previous?.visualState === "incorrect"
              ? "incorrect"
              : "visited",
          displayRole: undefined,
          markerRole: undefined,
          markerBadge: undefined,
          accuracyBand: undefined,
          answerTarget: false,
        }),
      );
    }
    for (const highlight of question.highlightParts ?? [])
      if (highlight.reveal && highlight.name) {
        const id = `discovery:${question.id}:${highlight.countryId}`;
        places.set(id, {
          id,
          name: highlight.name,
          ...highlight.point,
          kind: "other",
          sourceId: "journey",
          markerHidden: true,
          visualState: "visited",
        });
      }
  }
  return [...places.values()];
}

/** A non-color response cue on political geography; never a new answer surface. */
export function questionRegionMarkers(
  question: Question,
  context: QuestionContext,
  game: GameState,
): PlaceFeature[] {
  if (
    !["playing", "feedback", "failed"].includes(game.phase) ||
    question.rule.type === "merged-region" ||
    question.mode === "pin" ||
    question.mode === "land-path"
  )
    return [];
  const states = questionVisualStates(question, context, game);
  const visible = new Map(
    questionRegions(context.regions, question, game.phase)
      .filter(
        (region) =>
          region.displayGeometry !== null &&
          !region.displayBase &&
          !region.displayCovered,
      )
      .map((region) => [region.id, region]),
  );
  return Object.entries(states).flatMap(([id, state]) => {
    if (
      !visible.has(id) ||
      !["selected", "correct", "incorrect", "answer"].includes(state)
    )
      return [];
    const region = visible.get(id);
    if (!region) return [];
    // A clue fragment and its owner can share emphasis, but represent one answer.
    if (
      id.startsWith("clue-part:") &&
      region.parentId &&
      ["selected", "correct", "incorrect", "answer"].includes(
        states[region.parentId],
      )
    )
      return [];
    if (question.mode === "number") return [];
    const anchor = interiorAnchor(region);
    return [
      {
        id: `response:${id}`,
        name: "",
        kind: "other" as const,
        lat: anchor.lat,
        lng: anchor.lng,
        annotationRadius: anchor.clearance,
        sourceId: "journey-response",
        visualState: state,
        labelHidden: true,
        markerRole: "annotation" as const,
        markerSize: 30,
        markerBadge:
          state === "selected" || state === "correct"
            ? "✓"
            : state === "incorrect"
              ? "×"
              : "◎",
      },
    ];
  });
}
