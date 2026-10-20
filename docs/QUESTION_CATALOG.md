# Journey catalog and question authoring

The bundled catalog is keyed by stable Journey IDs; registration order has no
meaning. Each Journey has five rounds. Admin can assign any bundled Journey to
any date. Journeys marked `pool` are eligible for automatic selection; those
marked `unlisted` can still be assigned and previewed. Direct practice routes are
Admin-only. There is no current in-app authoring or AI generator. Follow
[Crafting a Journey](JOURNEY_CRAFTING.md) for current authoring standards and
[JOURNEY_ENGINE.md](JOURNEY_ENGINE.md) for implementation details. This catalog
records supported capabilities; capability alone does not make a format the
recommended product behavior. Previously
published local packs are read-only compatibility data.

## Bundled Journeys

| Title                       | Practice route                        | Definition                                                       |
| --------------------------- | ------------------------------------- | ---------------------------------------------------------------- |
| Beyond the maple leaf       | `/journey/beyond-the-maple-leaf`      | [canadaJourney.ts](../src/game/canadaJourney.ts)                 |
| Around the Mediterranean    | `/journey/mediterranean`              | [fourthJourney.ts](../src/game/fourthJourney.ts)                 |
| Shared neighbors            | `/journey/shared-neighbors`           | [ninthJourney.ts](../src/game/ninthJourney.ts)                   |
| Along the Andes             | `/journey/along-the-andes`            | [andesJourney.ts](../src/game/andesJourney.ts)                   |
| Not the obvious city        | `/journey/not-the-obvious-city`       | [eleventhJourney.ts](../src/game/eleventhJourney.ts)             |
| Island instincts            | `/journey/island-instincts`           | [fourteenthJourney.ts](../src/game/fourteenthJourney.ts)         |
| A Continent in Pieces       | `/journey/north-america`              | [northAmericaJourney.ts](../src/game/northAmericaJourney.ts)     |
| Latitude surprises          | `/journey/latitude-surprises`         | [latitudeJourney.ts](../src/game/latitudeJourney.ts)             |
| Pacific Landfalls           | `/journey/ring-of-fire`               | [tenthJourney.ts](../src/game/tenthJourney.ts)                   |
| Exceptions to the rule      | `/journey/exceptions-to-the-rule`     | [twelfthJourney.ts](../src/game/twelfthJourney.ts)               |
| On Russia’s doorstep        | `/journey/try-not-to-click-russia`    | [fifteenthJourney.ts](../src/game/fifteenthJourney.ts)           |
| Chasing the sun             | `/journey/chasing-the-sun`            | [sunFlagsJourney.ts](../src/game/sunFlagsJourney.ts)             |
| Down the Danube             | `/journey/down-the-danube`            | [danubeJourney.ts](../src/game/danubeJourney.ts)                 |
| Same Hour, Different Worlds | `/journey/same-hour-different-worlds` | [sameHourJourney.ts](../src/game/sameHourJourney.ts)             |
| Same Name, Different Place  | `/journey/same-name-different-place`  | [sharedNamesJourney.ts](../src/game/sharedNamesJourney.ts)       |
| Missing Borders             | `/journey/missing-borders`            | [missingBordersJourney.ts](../src/game/missingBordersJourney.ts) |
| Across the Divide           | `/journey/across-the-divide`          | [acrossDivideJourney.ts](../src/game/acrossDivideJourney.ts)     |

Home displays TODAY'S JOURNEY, its title/description, progress, and the appropriate
Play/Resume/View result action. Daily dates change at midnight in New York.
Unassigned future dates show a provisional, seeded choice from the `pool`
Journeys; a date becomes permanent when it is locked or assigned. The previous
rotation is preserved only for cutover history in
[`legacy-journey-rotation.json`](../scripts/legacy-journey-rotation.json). See the historical
[Journey review](JOURNEY_REVIEW.md) for earlier keep/scrap decisions; current IDs,
availability and routes come from `journeyIndex.json`. Results use Home/Study as primary exits,
with replay available only on practice routes. Daily and Archive results retain the
saved run for all players, including admins; Admin Tools provides the separate
explicit current-day reset. A results flyover follows answer stops in round order and
loops; player interaction or reduced motion interrupts it.

The Russia-neighbor Journey asks for pins in Finland, North Korea, Mongolia,
Georgia, and Estonia. Broad playable cameras are deliberately centered outside
the answer; borders, names, and markers remain hidden until submission.

## Answer modes

The modes below describe supported controls, not catalog totals.
The type and rule contracts live in [`questionContracts.ts`](../src/game/questionContracts.ts);
user-facing type names live in [`questionTypes.ts`](../src/game/questionTypes.ts).

| Mode                   | Control                    |
| ---------------------- | -------------------------- |
| `pin`                  | Drop a pin                 |
| `city-single`          | Single city pick           |
| `city-multiple`        | Multiple city picks        |
| `merged-region-single` | Single anonymous territory |
| `map-single`           | Single country pick        |
| `map-multiple`         | Multiple country picks     |
| `number`               | Number                     |
| `text`                 | Free response              |
| `typed-regions`        | Typed region names         |
| `ordered-countries`    | Ordered country names      |
| `ordered-capitals`     | Ordered capital names      |
| `choice-single`        | Single choice              |
| `choice-multiple`      | Multiple choices           |
| `choice-order`         | Order cards with spares    |
| `choice-match`         | Match cards to roles       |

`land-path` remains an internal supported mode/evaluator, with an executable
`recipe:land-path` example and no playable catalog question. Inspect it with
`npm run check:journey -- --recipe land-path`; introducing it into the product
requires an explicit design decision. Multiple-choice questions are capped at six
options. The numeric counter supports nonnegative integers with explicit +/-
controls and direct typing; a new numeric rule should respect that UI contract.

Map picking is derived from the answer mode and canonical candidate pool.
`journeyWorld.selectableRegionIds` restricts region answers independently of fill;
`map.hoverFeedback` controls hover presentation. References in `contextIds` are
excluded from region-answer eligibility. Use `scenes.play.candidateRegionIds` for
an openly shown geographic pool independent of the input method, and use
`choices[].geographyIds` to link button identities to reviewed depictions. Neither
field enables globe input. Whole-world recall and pin placement use the neutral
search surface, not the finite-candidate gold. Use disclosure settings to hide
names, not hover settings to disable the intended control. Author typed recall as `mode: "text"` with an immediately
visible input. `allowTyping: false` suppresses a globe-only question's typing
shortcut while retaining the unavailable-WebGL fallback.

`merged-region-single` asks for one apparent territory with hidden internal
country boundaries. A `merged-region` rule declares a Journey-scoped synthetic
`targetId`, canonical `memberIds`, and every internal `hiddenAdjacencies` pair.
Use explicit candidates excluding the individual members, immediate commitment,
anonymous disclosure and equally highlighted candidate fills. One territory tap
commits the answer; a restored unsubmitted draft remains a draft until re-tapped. Preparation checks
canonical land adjacency and connectivity. The bundled shared-edge polygons are
dissolved into one fill, outline and hit target during play; grading uses only the
submitted target ID. Outer edges, mapped islands and enclave holes are preserved.
Reveal restores canonical polygons and their names immediately, including with
reduced motion. No extra boundary dataset, sovereignty change or DMZ overlay is
introduced. Selection happens directly on the globe, without letters, country
names or silhouette buttons during play. This mechanic currently requires WebGL
and pointer/touch input. Assist preserves existing selections and otherwise
narrows to four targets. Completion restores all eleven solution countries,
uses five views without route lines in the existing flyover. Actual WebGL/mobile fidelity remains distinct from automated
geometry and DOM checks.

`choice-match` pairs distinct `choices` cards with labelled `matchSlots` roles.
A `slot-matches` rule declares `{ slotId, choiceId }` pairs by stable identity;
array order in the rule is irrelevant. Each role receives one unique card, with
optional spare cards. Responses use the existing `ordered` slots, and
`assist.fixedSlots` can lock a correct pairing. `orderAsideLabel` can name the card
tray (for example, Countries). Dragging and button placement share
`OrderAnswer` with ordering; matching has its own two-column layout, instructions,
answer summary, grading contract, and per-role map feedback. It works without WebGL.
Do not encode city/role matching as ordered `country-ids`.

`shuffleChoices: true` randomizes ordinary choice-button positions once while a
question is mounted. Hint/assist rerenders preserve those positions; grading uses
IDs. Do not infer answers from visual card order.

`choice-order` stores candidate IDs in `Response.ordered`, with a
`country-ids` rule marked `ordered: true`. It supports spare/distractor cards,
mouse/touch dragging, button placement, and authored `assist.fixedSlots` locks.
There is no current catalog example; focused ordering-control tests retain coverage.
`assist.fixedSelections` can lock correct unordered picks, preserve existing picks,
and keep the anchors selected after clearing. Focused tests retain coverage of
this supported behavior. The current authoring standard commits single-country and merged-territory
answers immediately; pins and multi-answer selections retain confirmation.
The engine supports additional commitment configurations for compatibility and
reviewed extensions. Do not copy those configurations into new content merely
because validation permits them. See [the shared input rules](JOURNEY_CRAFTING.md#5-give-the-globe-purposeful-question-state-information).

Distance-pin rules support inclusive `tiers`, ordered by increasing radius and
ending exactly at `radiusKm`. The field remains optional at the engine/API level
for compatibility. Current Journey authoring requires three bands: bullseye,
close, and within range. Choose inner radii for the task; never enlarge acceptance
just to add bands. All accepted bands count as one correct answer; the current
point rewards are 3 / 2 / 1, capped at two after a hint or one after an assist.
Colors and praise do not define point weights. Territory-inside pins use canonical
containment and have no invented distance tiers. See
[pin design standards](JOURNEY_CRAFTING.md#4-design-the-answer-method-and-distractors-intentionally)
and `pinPresentation.ts` for labels and feedback.

## Knowledge rules and data scope

A rule describes correctness independently of its answer control:

| Family                 | Rule IDs                                                                                                                | Authority/limits                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Authored answers       | `manual-text`, `manual-number`, `choice-ids`, `slot-matches`, `country-ids`, `region-ids`, `place-ids`, `merged-region` | Reviewed explicit answers, aliases, and membership sets; `manual-number` is supported.                  |
| Pin placement          | `pin-inside`, `pin-distance`                                                                                            | Canonical local region containment or authored place/radius, with units and tolerance reviewed.         |
| Country facts/names    | `country-fact`, `text-fact`, `name-length`                                                                              | Sourced fact context or the explicit common-English-name UN roster.                                     |
| Capitals/flags         | `capital-name`, `capital-order`, `flag-country`                                                                         | Bundled capital/flag records; capital-order checks the specified route.                                 |
| Geographic reasoning   | `shortest-borders`, `great-circle-order`                                                                                | Shared-edge canonical topology and spherical route intersections, not roads or travel permissions.      |
| Reviewed relationships | `territory-owner`, `feature-count`, `language-family`, `official-languages`, `physical-feature`                         | Curated sets/profiles, not universal relationships inferred from display metadata.                      |
| Spatial predicates     | `capital-coordinate`, `capital-circle`, `country-circle`                                                                | Pinned coordinates, geodesic disks, and full country geometry. `country-circle` has no bundled example. |

There are 26 declared knowledge-rule variants. Support for a rule does not imply
complete factual coverage or that every mode/rule combination is valid.
[`createQuestionContext`](../src/game/questionPreparation.ts) prepares and validates the
required targets/answers. Inspect an existing question with the same rule before
adding a new combination.

**Languages can already be used in questions.** Official-language, language-family,
and reviewed choice rules have examples, but coverage is curated. Spoken-language
lists in Explore are not official-language lists; incomplete lists cannot support
an exhaustive “all countries with language X” question.

**Population questions can be authored with reviewed answers**, using explicit
country/choice sets, numbers, or text. There is no general population-comparison
rule or reviewed time-series dataset. Explore's undated population estimates are
not safe evidence for a current-year ranking. Supply a dated source, population
measure, units, rounding/tolerance, and tie policy; add a versioned dataset and
predicate if the question should be computed rather than fixed.

Not the obvious city develops five capital decisions: typed recall in Türkiye,
a Canberra pin, interpreting Abuja's relocation, anonymous Brasília markers, and
South Africa's three traditional capital roles. Türkiye's assist marks Ankara,
Konya and Kayseri with identical city styling. Nigeria's known locations are
visible before answering the explanation question. Matching labels the judicial
role with the Supreme Court of Appeal so Johannesburg's Constitutional Court
remains a fair, explicitly explained distractor. Completion compares capitals
with famous, rival and former cities through closer authored views.

See [Journey engine and extension contracts](JOURNEY_ENGINE.md) for the code paths,
a matching example, and the checklist for adding reusable mechanics.

New questions can group state-specific geography in `scenes.play`, `scenes.assist`
and `scenes.reveal`. `defineQuestion` compiles those records into the existing
runtime fields; older Journeys remain compatible. The mechanic registry in
`mechanics.ts` owns rule compatibility, control/response capabilities, validation
hooks and submission. Complete executable examples live in `recipes.ts` and are
excluded from the published catalog. Use `npm run check:journey -- <id-or-slug>`
for focused local review, or `--recipe <answer-mode>` to inspect a control example.

Current Journeys and recipes import their types from `questionContracts.ts`.
Keep authored content in the builder/scenes pattern; answer resolution belongs to
`questionPreparation.ts`, grading to `questionEvaluation.ts`, and player-facing
text to `questionText.ts`. `questions.ts` remains a compatibility import surface.

## Add or change a Journey

1. Define five `Question` records and a `Journey` in `src/game/`. Use stable,
   unique IDs; changing an existing ID affects saved progress. Set an editorial
   Journey title/description and short question labels, with the actual `prompt`
   as the visible question heading.
2. Choose mode, rule, count, selection eligibility, disclosure, commitment, and
   failure behavior independently. Add required targets, facts, prepared regional
   geometry, places, or overlays. Extend [`COUNTRY_FACTS`](../src/game/countryFacts.ts)
   or reviewed [`quizData.ts`](../src/game/quizData.ts) relationships when needed.
3. Set a permitted playable `focus`, optional feedback focus, explanation, and
   `source`/`sources` with review dates. A camera, label, flag alt text, or highlighted
   candidate set must not reveal an answer that the question intends to hide.
   Audit the Journey title/description, lead-ins, instructions, and input labels
   alongside each prompt, including earlier reveals that could solve later stops.
   The shared question help keeps sources locked until submission because a source
   title or destination page can reveal the answer.
4. Register the Journey and route in [`journeys.ts`](../src/game/journeys.ts).
   [`questionCatalog.ts`](../src/game/questionCatalog.ts) derives its rounds from
   `JOURNEYS` automatically; do not maintain a second list.
   Runtime lazy discovery covers files ending in `Journey.ts`;
   keep that naming pattern or update discovery deliberately.
5. Regenerate `npm run prepare:journeys` when definitions or registration change
   index metadata. Run relevant checks while authoring, TypeScript for typed changes,
   and `npm run check:catalog` before pushing catalog changes, following
   [AGENTS.md](../AGENTS.md). Update the table when titles/routes/registration change;
   do not regenerate geography or run a full build for routine copy edits.
   Authorized releases use the normal CI checks and supported nonblocking deployment.

The month calendar highlights scheduled dates and previews pending selections
before publication. Automatic dates show either a locked choice or a provisional
preview. Admin can navigate months, jump to today, enter a date directly, or
restore the automatic choice for today or a future assigned day.

Current Journeys author grouped play/assist/reveal scenes.
There are no archived runtime editions. The revised sun Journey keeps
`chasing-the-sun-v2` and its `supersedes` alias so previously published original-ID
assignments resolve to the current edition. The original ID is retired: save
recovery drops its old attempts while preserving progress on retained Journeys.
The index generator includes only current definitions.

Adding a bundled edition defaults to `unlisted` and changes no automatic date.
Opting it into the pool can change provisional future dates, while locked dates
remain fixed.
Retained attempts remain pinned to their stored Journey. Removed editions are
absent from Admin and practice routes. Their IDs are recorded
only for save recovery: discard their attempts and overrides, while preserving
retained progress and retaining unavailable custom packs as hidden attempts.
Evaluator fixtures in
`tests/fixtures/engine` provide isolated rule coverage and are never runtime
Journey content. Do not treat the index as an independently authored source.

## Crafting a daily

See [Journey crafting](JOURNEY_CRAFTING.md) for the full editorial and interaction
review. Answer validation alone does not verify that globe taps are enabled or
that clue and reveal displays support the task. Review inherited map settings
whenever changing answer modes, and make borderless difficulty explicit.

Use the compact five-stop outline and review checklist in the crafting guide.
The input format should fit the task; repeated mechanics and varied controls are
both supported. `leadIn` is optional context joined to `prompt`, not a second
heading. The shared control owns commitment notices; do not repeat them in
`instruction`.

Feedback displays the canonical answer once, with a short explanation. Submitted
mistakes can be reviewed without listing unused distractors. Assignment controls
retain role/position identity; accepted alternatives are distinct from missed
required answers. At completion, purple denotes reviewed discoveries, including
solutions revealed after misses. Actual mistaken areas, cities, assignments and
pins remain red; containing countries do not inherit a city's grade. Custom
completion decoration cannot overwrite a mistake. The maintained rules are in
[the visual grammar](JOURNEY_CRAFTING.md#5-give-the-globe-purposeful-question-state-information)
and [reveal design](JOURNEY_CRAFTING.md#8-design-the-reveal-before-declaring-the-question-finished).

## Review checklist

- Keep the prompt central. Use authored `title` for internal identity; add
  instructions only for exceptional rules, units, ordering, or tolerances.
- State the country/territory convention, primary-capital convention, or relevant
  date when it affects the answer. Accept reviewed aliases and distinguish
  boundary contact from shared-edge adjacency.
- Keep eligibility separate from correct answers. Hide future progress labels
  until a stage is active/completed; avoid cached tooltips leaking old disclosure.
- Use canonical geometry for grading, display footprints for presentation, and
  source links for attribution. Do not fetch unchecked facts during gameplay.
- After submission, reveal useful geography and reasoning. Sources and reporting belong in the question-mark popover in the top-right
  question row; avoid repeating the question as an answer recap.

Reviewed facts, explanations, source links, and disclosure settings live with the
Journey definitions linked above. Use those definitions and the current guides
when maintaining content.

## Authored map narrative and completion

Questions may supply `physicalFeatures` during play and add
`feedbackPhysicalFeatures` after submission. Route Journeys should explicitly
include previously traveled segments in each stop's context; side reveals are
not automatically accumulated. Use stable, distinct IDs for fixed geometry.
`mapCaption` / `feedbackMapCaption` qualify partial or local features.

Prefer grouped scenes: `scenes.play.contextIds` declares established references;
`scenes.play.candidateRegionIds` declares a visible area pool; noninteractive
name/button pools use `scenes.play.map.candidateRole: "clue"` with
`selectionFeedback: "after-submit"` and no hover emphasis;
`scenes.play.clueLocators` optionally supplies already-given labels and small-area
orientation for visible region IDs. Never put a withheld name/target in a locator.
`scenes.reveal.contextIds` supplies supporting geography and
`scenes.reveal.answerIds` identifies actual solution areas. The compiler maps
reveal fields to `feedbackHintIds` and `feedbackContextIds` respectively. These
flat fields are the runtime read model, not a second authoring source. For numeric
area counts and border crossings, actual solution areas use green after a correct
count and teal after a miss, without per-area selection symbols or connecting
lines. Supporting reference geography stays blue; an abstract number does not
grade unrelated regions. For other supporting illustrations use
`explanationPlace` or `displayRole: "explanation"`.

Use `cityReference` for established city points and `areaLabel` for area names
without city dots. Bare territory symbols are placed in the displayed interior
and fit available screen space; they are not point-answer markers or hit targets.
Do not author arbitrary marker sizes or hex colors to repair a shared role.
`map.feedbackBorders: false` suppresses political outlines on reveal when the
subject is a whole continent, without changing borders during the question.

`map.feedbackRegions: "neutral"` suppresses area grading while retaining declared
references. Revealed city/place answers also promote their containing geography
as reference, never as a graded country answer. Supply the actual location in
`scenes.reveal.places` (compiled to `feedbackPlaces`).
`labelFlexible` allows explanatory place labels to use alternate screen anchors
without making them playable answer targets. A `feedbackDiagram` of type
`river-banks` explains bank relationships schematically without claiming sourced
urban geometry; `earth-shape` compares center distance with sea-level height using
an explicitly exaggerated schematic. `correctFeedback` overrides widget-derived praise when needed.

`feedbackFlags` supplies a reveal-only comparison of bundled national flags,
with `src`, `alt`, and visible country `label` for each flag. It replaces the
clue image on feedback. An optional `detail` (`src`, `alt`) enlarges a reviewed
motif; `caption` explains its meaning. `image.context` retains the full flag as
secondary context when the clue itself is a motif crop. Chasing the sun uses it for Argentina and Uruguay;
its Philippine reveal stays on the Philippines, and its authored completion
visits the six flag countries across the five stops. `completion.flags` uses the
same comparison contract after the Journey ends. `scripts/prepare-sun-details.py`
crops only the already-reviewed local flag vectors; it does not refresh the flag catalog.

`feedbackImage` supplies reveal-only documentary media with `src`, `alt`,
`caption`, and `credit` (`name`, source `url`, `license`, `licenseUrl`). It is
rendered only after submission, including after an incorrect answer. Pre-answer
`image` is a separate pre-answer clue contract; it may remain during feedback
unless reveal media such as `feedbackFlags` replaces it. Record asset provenance and license notices; do not put an answer-revealing photo
in the clue field.

`resolvedLabel` replaces a spoiler-safe step label only in the answered completion
receipt. `Journey.completion` authors focus, optional ordered flyover views, physical
features, labels, stop markers and a caption. It augments reviewed discoveries
and retained mistakes; it does not replace them. With no custom completion, the
shared recap derives the discoveries and uses the default answer-stop tour.
`Journey.mapAttribution` supplies required on-map source credits.

`npm run prepare:journey-map` regenerates the Danube context from the reviewed,
local OSM route and Natural Earth snapshots. It retains source vertices, preserves
junctions and river mouths, and ships a matching downloadable ODbL database.
[NOTICE](../NOTICE.md#danube-journey-river-route) records provenance and licensing.
The broader editorial rules are in [Crafting a Journey](JOURNEY_CRAFTING.md).

Journey and Study answer footers share `QuestionActions`, with help on the left
and submission on the right. Immediate-answer questions keep their original
commitment without an extra submit step. Questions without authored help retain
the disabled placeholder. Help is authored per round, not inferred from its answer.

`guidance.hint` is an authored semantic clue. Optional `guidance.hintMap`
adds reference `regionIds` and/or broad framing at the hint stage; it does not
change the answer contract. Across the Divide demonstrates this supported path.
An optional `guidance.assist` supplies
separate copy, surviving `candidateIds`, named reference `places`, and/or broad
search `overlays`. The first
request reveals the hint; the button then changes from “Need a hint?” with a bulb
to “Need an assist?” with a lifebuoy, in a different color. After all available
help is used it remains visible and disabled. Assists never modify the rule or
grading tolerance. Eliminated choices cannot be newly selected through the map,
buttons, or typing; existing selections are preserved and can still be removed.

`GameState.help` records each round’s strongest stage (`hinted` or `assisted`).
Older saves can omit it. The daily save codec validates round IDs and stages,
merges help monotonically within the same run, and keeps new replays independent.
Results show help counts and point rewards. Help caps a question at two points
for a hint or one for an assist; see `points.ts` and the crafting guide.

Around the Mediterranean now follows Gibraltar → Sicily → Tripoli → the Adriatic
→ the hidden Suez entrance, using map-single, choice-single, text, map-multiple and pin controls.
All five rounds have authored hints and assists. The Suez pin uses a 150 km
acceptance radius and inclusive 50/100/150 km accuracy bands, worth 3/2/1 points
before help ceilings while each accepted band still counts as one correct answer. Completion and canal geometry are authored separately from grading.

The Mediterranean opening now has six equally styled, named country candidates
across Africa and Europe, keeping the gateway name until reveal. Q4’s six
candidates are Slovenia, Croatia, Bosnia and Herzegovina, Montenegro, Albania
and Greece; the deciding condition is former Yugoslav republic membership.
