import type { Journey, Question } from "./questionContracts";
import type { RegionFeature } from "../geography/types";
import { MECHANICS } from "./mechanics";
import { auditJourney } from "./journeyAudit";
import { supportsPartialPreview } from "./authoringReview";
import { acceptsAlternatives } from "./answerPresentation";
import { isWholeGlobeSearch } from "./presentation";

/** Compare declared experience policies, never infer support from a mode name alone. */
export function experiencePolicies(question: Question, journey: Journey) {
  const assist = question.guidance?.assist;
  return {
    eligibility: `${question.selection.type}; candidate styling ${question.map?.candidates ?? "renderer default"}`,
    answer: `${acceptsAlternatives(question) ? "accepted alternatives" : "rule-defined answer"}; ${question.count} response items; ${question.commitment} commitment; partial credit ${!!question.partialCredit}`,
    disclosure: `choice names ${question.disclosure.namedChoices}; hover names ${question.disclosure.hoverNames}; native text ${!!question.textClue}`,
    assistance: `hint ${!!question.guidance}; assist ${!!assist}; narrowed pool ${assist?.candidateIds?.length ?? "none"}; locked selections ${assist?.fixedSelections?.length ?? 0}; locked slots ${assist?.fixedSlots?.length ?? 0}`,
    reveal: `explanatory network ${!!question.feedbackNetwork}; reveal-only translation ${!!question.textClue}; reference places ${question.feedbackPlaces?.length ?? 0}`,
    playCamera:
      question.playFraming === "selection"
        ? "fit all selectable region outlines; assist fits survivors"
        : isWholeGlobeSearch(question)
          ? "shared random continental view, or preserve suitable rotation; stop on interaction"
          : question.introViews?.length
            ? "authored finite introduction"
            : "authored framing",
    revealCamera: question.feedbackReturnToSelection
      ? "return to actual selection, including a miss"
      : question.feedbackOrbit
        ? "finite tour, then world rotation"
        : question.feedbackViews?.length
          ? "authored finite tour"
          : "authored or answer-derived focus",
    completion: `${journey.completion?.mapMode ?? "cumulative"} recap; ${journey.completion && !journey.completion.views?.length ? "static authored focus" : journey.completion?.orbit ? "finite tour, then world rotation" : "flyover loop until interaction"}`,
  };
}

/** A single-question sandbox exercises the real reveal and completion lifecycle. */
export function recipeJourney(question: Question): Journey {
  const focus = question.feedbackFocus ?? question.focus;
  return {
    id: question.id,
    title: question.title,
    description:
      "Executable mechanic composition; replace its demonstration copy and data when authoring.",
    rounds: [question],
    dailyEligible: false,
    completion: {
      mapMode: "cumulative",
      // City answers grade locations; their containing regions remain context.
      ...(question.mode.startsWith("city-")
        ? { contextIds: question.contextIds }
        : {}),
      focus,
      views: question.feedbackViews?.length ? question.feedbackViews : [focus],
      physicalFeatures: [],
      places: [],
      caption:
        "Recipe completion: inspect retained answers, mistakes and reference geography.",
    },
  };
}

/** Generated from live contracts and reducer audits; no separate capability registry. */
export function authoringCapabilities(
  journeys: Journey[],
  recipes: Question[],
  regions: RegionFeature[],
) {
  return recipes.map((question) => {
    const mechanic = MECHANICS[question.mode];
    const sandbox = recipeJourney(question);
    const experience = experiencePolicies(question, sandbox);
    const audit = auditJourney(sandbox, regions, undefined, {
      allowDeprecated: !!mechanic.deprecated,
    });
    const requires = [
      "Reviewed clue/reveal copy and sources",
      "Explicit eligible inputs and disclosure",
      question.playFraming === "selection"
        ? "A bounded eligible region pool; camera framing is derived"
        : "Camera framing for the declared reference/candidate area",
    ];
    if (mechanic.mapSelection === "places" || mechanic.response === "pin")
      requires.push("Canonical place records or reviewed coordinates");
    if (mechanic.response === "construction")
      requires.push(
        "Canonical grading geometry/grid, independently of display geometry",
      );
    if (question.textClue)
      requires.push(
        "Attested native-script text, language/direction metadata and a reveal-only translation",
      );
    if (question.feedbackNetwork)
      requires.push(
        "A sourced explanatory region set, independent of submitted-answer grading",
      );
    if (
      question.image ||
      question.feedbackImage ||
      question.feedbackFlags?.length
    )
      requires.push("Local media, credits and answer-safe clue captions");
    return {
      id: question.id,
      title: question.title,
      mode: question.mode,
      control: mechanic.control,
      response: mechanic.response,
      mapSelection: mechanic.mapSelection,
      allowedRules: mechanic.rules,
      demonstratedRule: question.rule.type,
      experience,
      deprecation: mechanic.deprecated,
      availability: mechanic.deprecated
        ? "deprecated: do not use for new Journeys"
        : !mechanic.visible
          ? "internal: product decision required"
          : audit.errors.length
            ? "needs repair"
            : "reusable with authored content",
      features: {
        hint: !!question.guidance,
        assist: !!question.guidance?.assist,
        partialOrLowerTier: supportsPartialPreview(question),
        partialCredit: question.partialCredit,
        namedChoices: question.disclosure.namedChoices,
        hoverNames: question.disclosure.hoverNames,
        commitment: question.commitment,
        nativeText: !!question.textClue,
        explanatoryNetwork: !!question.feedbackNetwork,
        overviewRotation: !!question.feedbackOrbit,
        returnToSelection: !!question.feedbackReturnToSelection,
        selectionFraming: question.playFraming === "selection",
      },
      requires,
      limits: [
        ...(mechanic.deprecated ? [mechanic.deprecated.reason] : []),
        "Evidence applies to this composition, not every combination allowed by the mode.",
        "Custom history/data and geographic scope need separate review.",
        "Reducer/scene checks do not certify factual accuracy, camera fit, label layout or WebGL rendering.",
        ...(!supportsPartialPreview(question)
          ? [
              "No automatic partial/lower-tier fixture; use a captured answer when needed.",
            ]
          : []),
      ],
      evidence: {
        kind: "structural and reducer simulation",
        stages: audit.questions[0]?.states.map((state) => state.stage) ?? [],
        completion: audit.errors.length === 0,
        errors: audit.errors,
        warnings: audit.warnings,
        registry: "src/game/mechanics.ts",
        recipe: "src/game/recipes.ts",
        checks: [
          "tests/authoring-capabilities.test.ts",
          "tests/journey-authoring.test.tsx",
        ],
      },
      examples: journeys.flatMap((journey) =>
        journey.rounds
          .filter(
            (round) =>
              round.mode === question.mode &&
              round.rule.type === question.rule.type,
          )
          .map((round) => {
            const example = experiencePolicies(round, journey);
            return {
              journeyId: journey.id,
              questionId: round.id,
              experience: example,
              policyDifferences: (
                Object.keys(experience) as (keyof typeof experience)[]
              ).filter((key) => experience[key] !== example[key]),
              note: "Same mode and rule; policy comparison does not certify content, geography or rendering.",
            };
          }),
      ),
      auditCommand: `npm run check:journey -- --recipe ${question.id.replace(/^recipe:/, "")}`,
      preview: `/review/journeys.html?recipe=${encodeURIComponent(question.id.replace(/^recipe:/, ""))}`,
    };
  });
}
