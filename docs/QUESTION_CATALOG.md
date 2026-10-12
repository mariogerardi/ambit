# Journey catalog and question authoring

The bundled catalog contains **15 current Journeys and 75 questions**, with eleven active
daily concepts, reviewed against the code on October 12, 2026. Each Journey has
five rounds. Admin’s shared calendar assigns any bundled Journey to a date for
everyone; unassigned dates use the automatic rotation. Direct practice routes are Admin-only; Admin’s “Preview five questions” opens the selected Journey. Chasing the sun and Down the Danube are ready for date assignments and
have not been added to the automatic rotation. Same Hour, Different Worlds is also
available for preview and date assignments without joining the rotation. Same Name, Different Place is also available without joining the rotation. There is no current in-app authoring
or AI generator. Previously published local packs are read-only compatibility data.

## Bundled Journeys

| #   | Title                       | Practice route                        | Definition                                                   |
| --- | --------------------------- | ------------------------------------- | ------------------------------------------------------------ |
| 1   | Beyond the maple leaf       | `/journey/beyond-the-maple-leaf`      | [canadaJourney.ts](../src/game/canadaJourney.ts)             |
| 2   | Around the Mediterranean    | `/journey/mediterranean`              | [fourthJourney.ts](../src/game/fourthJourney.ts)             |
| 3   | Shared neighbors            | `/journey/shared-neighbors`           | [ninthJourney.ts](../src/game/ninthJourney.ts)               |
| 4   | Along the Andes             | `/journey/along-the-andes`            | [andesJourney.ts](../src/game/andesJourney.ts)               |
| 5   | Not the obvious city        | `/journey/not-the-obvious-city`       | [eleventhJourney.ts](../src/game/eleventhJourney.ts)         |
| 6   | Island instincts            | `/journey/island-instincts`           | [fourteenthJourney.ts](../src/game/fourteenthJourney.ts)     |
| 7   | North America by name       | `/journey/north-america`              | [northAmericaJourney.ts](../src/game/northAmericaJourney.ts) |
| 8   | Latitude surprises          | `/journey/latitude-surprises`         | [latitudeJourney.ts](../src/game/latitudeJourney.ts)         |
| 9   | Around the Ring of Fire     | `/journey/ring-of-fire`               | [tenthJourney.ts](../src/game/tenthJourney.ts)               |
| 10  | Exceptions to the rule      | `/journey/exceptions-to-the-rule`     | [twelfthJourney.ts](../src/game/twelfthJourney.ts)           |
| 11  | On Russia’s doorstep        | `/journey/try-not-to-click-russia`    | [fifteenthJourney.ts](../src/game/fifteenthJourney.ts)       |
| 12  | Chasing the sun             | `/journey/chasing-the-sun`            | [sunFlagsJourney.ts](../src/game/sunFlagsJourney.ts)         |
| 13  | Down the Danube             | `/journey/down-the-danube`            | [danubeJourney.ts](../src/game/danubeJourney.ts)             |
| 14  | Same Hour, Different Worlds | `/journey/same-hour-different-worlds` | [sameHourJourney.ts](../src/game/sameHourJourney.ts)         |
| 15  | Same Name, Different Place  | `/journey/same-name-different-place`  | [sharedNamesJourney.ts](../src/game/sharedNamesJourney.ts)   |

Home displays TODAY'S JOURNEY, its title/description, progress, and the appropriate
Play/Resume/View result action. The daily rotation uses device-local midnight and
cycles the eleven retained concepts from October 5, 2026, using the explicit IDs in
[`journeyRotation.ts`](../src/game/journeyRotation.ts). See
[Journey review](JOURNEY_REVIEW.md) for the keep/scrap decisions. Results use Home/Study as primary exits,
with daily replay secondary and available only to admins. A results flyover follows answer stops in round order and
loops; player interaction or reduced motion interrupts it.

The Russia-neighbor Journey asks for pins in Finland, North Korea, Mongolia,
Georgia, and Estonia. Broad playable cameras are deliberately centered outside
the answer; borders, names, and markers remain hidden until submission.

## Answer modes

Counts below refer to the 75 current questions, not every possible engine pairing.
The type and rule contracts live in [`questionContracts.ts`](../src/game/questionContracts.ts);
user-facing type names live in [`questionTypes.ts`](../src/game/questionTypes.ts).

| Mode                | Control                 | Questions |
| ------------------- | ----------------------- | --------: |
| `pin`               | Drop a pin              |        16 |
| `city-single`       | Single city pick        |         4 |
| `city-multiple`     | Multiple city picks     |         0 |
| `map-single`        | Single country pick     |        12 |
| `map-multiple`      | Multiple country picks  |         6 |
| `number`            | Number                  |         2 |
| `text`              | Free response           |        10 |
| `typed-regions`     | Typed region names      |         3 |
| `ordered-countries` | Ordered country names   |         0 |
| `ordered-capitals`  | Ordered capital names   |         0 |
| `choice-single`     | Single choice           |        18 |
| `choice-multiple`   | Multiple choices        |         3 |
| `choice-order`      | Order cards with spares |         0 |
| `choice-match`      | Match cards to roles    |         1 |

`land-path` remains an internal supported mode/evaluator, with no playable catalog
example or supported authoring recipe. Multiple-choice questions are capped at six
options. The numeric counter supports nonnegative integers with explicit +/-
controls and direct typing; a new numeric rule should respect that UI contract.

Map picking is derived from the answer mode; `map.hoverFeedback` controls hover
presentation, independently of answer eligibility. Muted countries may have a
disabled visual style while the `selectDisabled` path still permits eligible
answers. Use disclosure settings to hide names, not hover settings to disable
the intended control. Author typed recall as `mode: "text"` with an immediately
visible input. `allowTyping: false` suppresses a globe-only question's typing
shortcut while retaining the unavailable-WebGL fallback.

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
this supported behavior. The Andes finale continues south to Bahía Inútil in
Tierra del Fuego and asks which animal breeds there in the wild. The hint points
to differences between Arctic and southern wildlife; assist leaves penguins and
puffins. A documentary colony photograph and the king-penguin marker appear only
after submission. The Aconcagua round accepts pins within 450 km of
the summit by distance alone, with inclusive tiers at 150, 300 and 450 km. All tiers
earn one correct answer; tier-specific praise and concentric rings appear on reveal.
`pin-distance.tiers` is optional, ordered from smallest to largest radius, and must
end at the rule's `radiusKm`. Questions without tiers keep their single-radius behavior.
The finale hides prior landmarks; the full results tour includes the colony.

## Knowledge rules and data scope

A rule describes correctness independently of its answer control:

| Family                 | Rule IDs                                                                                               | Authority/limits                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Authored answers       | `manual-text`, `manual-number`, `choice-ids`, `slot-matches`, `country-ids`, `region-ids`, `place-ids` | Reviewed explicit answers, aliases, and membership sets; `manual-number` is supported.                  |
| Pin placement          | `pin-inside`, `pin-distance`                                                                           | Canonical local region containment or authored place/radius, with units and tolerance reviewed.         |
| Country facts/names    | `country-fact`, `text-fact`, `name-length`                                                             | Sourced fact context or the explicit common-English-name UN roster.                                     |
| Capitals/flags         | `capital-name`, `capital-order`, `flag-country`                                                        | Bundled capital/flag records; capital-order checks the specified route.                                 |
| Geographic reasoning   | `shortest-borders`, `great-circle-order`                                                               | Shared-edge canonical topology and spherical route intersections, not roads or travel permissions.      |
| Reviewed relationships | `territory-owner`, `feature-count`, `language-family`, `official-languages`, `physical-feature`        | Curated sets/profiles, not universal relationships inferred from display metadata.                      |
| Spatial predicates     | `capital-coordinate`, `capital-circle`, `country-circle`                                               | Pinned coordinates, geodesic disks, and full country geometry. `country-circle` has no bundled example. |

There are 25 declared knowledge-rule variants. Support for a rule does not imply
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
4. Register the Journey and route in [`journeys.ts`](../src/game/journeys.ts), and
   add its rounds to [`questionCatalog.ts`](../src/game/questionCatalog.ts).
   Runtime lazy discovery covers files ending in `Journey.ts`;
   keep that naming pattern or update discovery deliberately.
5. Regenerate `npm run prepare:journeys` when definitions or registration change
   index metadata. Run only the relevant tests and TypeScript for typed changes,
   following [AGENTS.md](../AGENTS.md). Update table/counts when content changes;
   do not regenerate geography or run a full build for routine copy edits.
   Authorized releases use the normal CI checks and supported nonblocking deployment.

The month calendar highlights scheduled dates and previews pending selections
before publication. Automatic dates show the actual rotation title. Admin can
navigate months, jump to today, enter a date directly, or restore automatic
rotation for an assigned day.

All 15 current Journeys (75 questions) author grouped play/assist/reveal scenes.
There are no archived runtime editions. The revised sun Journey keeps
`chasing-the-sun-v2` and its `supersedes` alias so previously published original-ID
assignments resolve to the current edition. The original ID is retired: save
recovery drops its old attempts while preserving progress on retained Journeys.
The index generator includes only current definitions.

Adding a bundled edition does not change the active rotation. Editing the explicit
rotation list does change which editions subsequent dates select.
Retained attempts remain pinned to their stored Journey. Removed editions are
absent from Admin and practice routes. Their IDs are recorded
only for save recovery: discard their attempts and overrides, while preserving
retained progress and protecting unavailable custom packs. Evaluator fixtures in
`tests/fixtures/engine` provide isolated rule coverage and are never runtime
Journey content. Do not treat the index as an independently authored source.

## Crafting a daily

See [Journey crafting](JOURNEY_CRAFTING.md) for the full editorial and interaction
review. Answer validation alone does not verify that globe taps are enabled or
that clue and reveal displays support the task. Review inherited map settings
whenever changing answer modes, and make borderless difficulty explicit.

A throughline may be an itinerary, a shared surprise, or a distinctive mechanic
repeated across five questions. Do not require varied controls for their own sake.
Shared neighbors uses irregular country footprints, Island instincts repeats
ownership-versus-location surprises, and On Russia’s doorstep repeats borderless
pin placement. Establish the premise in the introduction and develop it in the
reveals; preserve useful difficulty and favorite questions. Use a short, spoiler-safe
`leadIn` alongside the prompt to make geographic movement or the developing idea
explicit. Use On Russia’s doorstep as the model: a short directional cue such as
“Head west again, this time to the Caucasus.” Keep detailed geographic context in
the reveal, rather than adding a second paragraph before every question.

Journey feedback uses Study’s answer-card layout, showing the correct answer
rather than the incorrect guess. For questions accepting multiple valid answers,
a successful answer is shown canonically; a miss shows one labelled correct
example or set. Keep the explanation to a short insight beneath that answer.
Do not begin by repeating the answer, listing all alternatives, or narrating the
interface. Numeric border questions can show one useful shortest route.

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

`contextIds` highlights known setting geography during play. `feedbackHintIds`
retains context-colored geography on reveal; `feedbackContextIds` identifies
answer-colored regions. Explicitly separate these when the answer is a symbol or
historical fact rather than the country whose flag is shown.
`map.feedbackBorders: false` suppresses political outlines on reveal when the
subject is a whole continent, without changing borders during the question.

`map.feedbackRegions: "neutral"` keeps land neutral when the answer is a city or
physical feature; supply its answer marker separately in `feedbackPlaces`.
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
`image` is a separate clue contract and remains visible during play and feedback.
Record asset provenance and license notices; do not put an answer-revealing photo
in the clue field.

`resolvedLabel` replaces a spoiler-safe step label only in the answered completion
receipt. `Journey.completion` authors a static focus, physical features, stop
markers, and optional caption instead of the default answer-country flyover.
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

`guidance.hint` is an authored semantic clue. An optional `guidance.assist` supplies
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
Results show help counts and per-round annotations without subtracting points.

Around the Mediterranean now follows Gibraltar → Sicily → Tripoli → the Adriatic
→ the hidden Suez entrance, using map-single, choice-single, text, map-multiple and pin controls.
All five rounds have authored hints and assists. The Suez pin uses a 150 km
acceptance radius and inclusive 50/100/150 km accuracy bands, all worth one correct
answer. Completion and canal geometry are authored separately from grading.

The Mediterranean opening now has six equally styled, named country candidates
across Africa and Europe, keeping the gateway name until reveal. Q4’s six
candidates are Slovenia, Croatia, Bosnia and Herzegovina, Montenegro, Albania
and Greece; the deciding condition is former Yugoslav republic membership.
