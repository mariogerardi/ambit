// Offline audit policy. This module is used by tests and authoring tools, not player rendering.
import type { Question, QuestionContext } from "./questionContracts";
import type { journeyWorld } from "../app/journeyWorld";
import { regionBorderVisible } from "../globe/outlines";
import { pinDistance, pinInside } from "./answerTargets";
import type { GameState } from "./state";
import { answerItems } from "./answerPresentation";
import { mechanicFor } from "./mechanics";

export const SHARED_VISUAL_RULES = {
  "background-role":
    "Background appearance follows authored geography roles, independently of answer input.",
  "reference-role":
    "Established references remain blue, outlined, and ineligible as region answers.",
  "area-boundaries":
    "Candidates and revealed answer areas retain visible boundaries.",
  "pending-identity":
    "Editable names must not reveal anonymous geography before submission.",
  "clue-role":
    "Anonymous shapes supplied for naming remain blue and noninteractive before submission.",
  "clue-locator":
    "Supplied area locators retain authored labels during play and clear when play ends.",
  "bearing-disclosure":
    "Compass play retains its given endpoints and withholds outgoing comparison paths; destinations are concealed unless explicitly supplied.",
  "pin-reference":
    "Supplied reference points cannot themselves earn a correct pin.",
  "point-answer-role":
    "Explanatory points cannot be graded by an unrelated abstract choice.",
  "review-retention":
    "Required revealed solutions and actual mistakes survive completion.",
} as const;
export type VisualException = {
  questionId: string;
  rule: string;
  reason: string;
};
export function auditVisualExceptions(q: Question) {
  const errors: string[] = [],
    accepted: VisualException[] = [];
  const applicable = {
    "open-search-background": q.map?.background === "open-search",
    "natural-background": q.map?.neutralRegions === true,
    "hidden-boundaries": q.map?.borders === false,
  };
  for (const [rule, reason] of Object.entries(q.visualExceptions ?? {})) {
    if (
      !Object.hasOwn(applicable, rule) ||
      typeof reason !== "string" ||
      !reason.trim() ||
      !applicable[rule as keyof typeof applicable]
    )
      errors.push(`Invalid or stale visual exception: ${q.id} / ${rule}`);
    else accepted.push({ questionId: q.id, rule, reason });
  }
  for (const rule of ["open-search-background", "natural-background"] as const)
    if (applicable[rule] && !accepted.some((e) => e.rule === rule))
      errors.push(
        `[background-role] Authored reason required: ${q.id} / ${rule}`,
      );
  return { errors, accepted };
}

export function auditVisualScene(
  q: Question,
  context: QuestionContext,
  game: GameState,
  world: ReturnType<typeof journeyWorld>,
) {
  const errors: string[] = [];
  const live = game.phase === "playing";
  if (live && q.rule.type === "bearing-angle") {
    const { origin, destination } = q.rule;
    if (
      !world.places.some(
        (p) => p.id === origin.id && p.visualState === "hinted",
      ) ||
      (q.disclosure.bearingDestination
        ? !world.places.some(
            (p) => p.id === destination.id && p.visualState === "hinted",
          )
        : world.places.some(
            (p) =>
              p.id === destination.id ||
              (Math.abs(p.lat - destination.lat) < 1e-8 &&
                Math.abs(p.lng - destination.lng) < 1e-8),
          )) ||
      world.overlays?.some(
        (o) =>
          o.id.startsWith("bearing-route:") ||
          o.id.startsWith("bearing-guess:"),
      ) ||
      world.selectableRegionIds.length ||
      world.regionNames !== "none"
    )
      errors.push(
        `[bearing-disclosure] Origin missing or concealed destination/path disclosed: ${q.id}`,
      );
  }
  for (const clue of q.clueLocators ?? [])
    if (
      live &&
      !world.clueLocators.some(
        (locator) =>
          locator.region.id === clue.regionId && locator.label === clue.label,
      )
    )
      errors.push(
        `[clue-locator] Supplied area locator missing or renamed: ${q.id} / ${clue.regionId}`,
      );
  if (!live && world.clueLocators.length)
    errors.push(`[clue-locator] Locator survived play: ${q.id}`);
  if (live && mechanicFor(q).mapSelection === "none")
    for (const [id, state] of Object.entries(world.states))
      if (["selectable", "selected"].includes(state))
        errors.push(
          `[clue-role] Noninteractive area uses selection styling: ${q.id} / ${id}`,
        );
  if (live && q.map?.candidateRole === "clue")
    for (const id of q.candidateRegionIds ?? [])
      if (
        !["clue", "disabled"].includes(world.states[id]) ||
        world.selectableRegionIds?.includes(id)
      )
        errors.push(`[clue-role] Naming clue changed role: ${q.id} / ${id}`);
  if (!live && q.mode.startsWith("choice-")) {
    const depicted = new Set(
      answerItems(q, context, game).flatMap((item) => item.geographyIds),
    );
    for (const place of world.places)
      if (
        !place.markerHidden &&
        place.markerRole !== "annotation" &&
        ["correct", "answer", "incorrect"].includes(place.visualState ?? "") &&
        !depicted.has(place.id)
      )
        errors.push(
          `[point-answer-role] Unbound point graded: ${q.id} / ${place.id}`,
        );
  }
  const hidden =
    live &&
    q.map?.borders === false &&
    !!q.visualExceptions?.["hidden-boundaries"]?.trim();
  const references = live
    ? [
        ...(q.contextIds ?? []),
        ...(game.help?.[q.id] === "assisted"
          ? (q.guidance?.assist?.regionIds ??
            q.guidance?.hintMap?.regionIds ??
            [])
          : game.help?.[q.id]
            ? (q.guidance?.hintMap?.regionIds ?? [])
            : []),
      ]
    : [];
  for (const id of references) {
    // Highlight fragments have their own visible geometry and clue role.
    if (q.highlightParts?.some((p) => p.countryId === id)) continue;
    if (
      world.states[id] !== "hinted" ||
      world.selectableRegionIds?.includes(id)
    )
      errors.push(`[reference-role] Reference changed role: ${q.id} / ${id}`);
  }
  for (const region of world.regions) {
    if (
      region.displayGeometry === null ||
      region.displayBase ||
      region.displayCovered
    )
      continue;
    const state = world.states[region.id];
    const boundary = regionBorderVisible(region, world);
    if (state === "hinted" && !boundary)
      errors.push(
        `[reference-role] Reference outline missing: ${q.id} / ${region.id}`,
      );
    if (
      [
        "selectable",
        "clue",
        "surface",
        "selected",
        "correct",
        "answer",
        "incorrect",
      ].includes(state) &&
      !boundary &&
      !hidden
    )
      errors.push(
        `[area-boundaries] Boundary missing without an authored exception: ${q.id} / ${region.id}`,
      );
    if (
      live &&
      state === "surface" &&
      q.map?.background !== "open-search" &&
      q.map?.candidates !== "neutral" &&
      q.map?.candidates !== "decorative"
    )
      errors.push(
        `[background-role] Undeclared open search surface: ${q.id} / ${region.id}`,
      );
  }
  if (live && q.mode === "pin")
    for (const place of world.places) {
      if (
        place.markerHidden ||
        place.kind === "pin" ||
        place.sourceId === "player"
      )
        continue;
      const guess = { ...game, pin: { lat: place.lat, lng: place.lng } };
      if (
        q.rule.type === "pin-inside"
          ? pinInside(q, context, guess)
          : q.rule.type === "pin-distance" &&
            (pinDistance(q, guess) ?? Infinity) <= q.rule.radiusKm
      )
        errors.push(
          `[pin-reference] Reference lies inside the accepted target: ${q.id} / ${place.name}`,
        );
    }
  return errors;
}
