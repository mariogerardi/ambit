# Journey catalog and question authoring

The bundled catalog contains **13 current Journeys and 65 questions**, with eleven active
daily concepts, reviewed against the code on October 11, 2026. Each Journey has
five rounds. Admin’s shared calendar assigns any bundled Journey to a date for
everyone; unassigned dates use the automatic rotation. Direct practice routes and
`/playground` are Admin-only. Chasing the sun and Down the Danube are ready for date assignments and
have not been added to the automatic rotation. There is no current in-app authoring
or AI generator. Previously published local packs are read-only compatibility data.

## Bundled Journeys

| #   | Title                    | Practice route                     | Definition                                                   |
| --- | ------------------------ | ---------------------------------- | ------------------------------------------------------------ |
| 1   | Beyond the maple leaf    | `/journey/beyond-the-maple-leaf`   | [canadaJourney.ts](../src/game/canadaJourney.ts)             |
| 2   | Around the Mediterranean | `/journey/mediterranean`           | [fourthJourney.ts](../src/game/fourthJourney.ts)             |
| 3   | Shared neighbors         | `/journey/shared-neighbors`        | [ninthJourney.ts](../src/game/ninthJourney.ts)               |
| 4   | Along the Andes          | `/journey/along-the-andes`         | [andesJourney.ts](../src/game/andesJourney.ts)               |
| 5   | Not the obvious city     | `/journey/not-the-obvious-city`    | [eleventhJourney.ts](../src/game/eleventhJourney.ts)         |
| 6   | Island instincts         | `/journey/island-instincts`        | [fourteenthJourney.ts](../src/game/fourteenthJourney.ts)     |
| 7   | North America by name    | `/journey/north-america`           | [northAmericaJourney.ts](../src/game/northAmericaJourney.ts) |
| 8   | Latitude surprises       | `/journey/latitude-surprises`      | [latitudeJourney.ts](../src/game/latitudeJourney.ts)         |
| 9   | Around the Ring of Fire  | `/journey/ring-of-fire`            | [tenthJourney.ts](../src/game/tenthJourney.ts)               |
| 10  | Exceptions to the rule   | `/journey/exceptions-to-the-rule`  | [twelfthJourney.ts](../src/game/twelfthJourney.ts)           |
| 11  | On Russia’s doorstep     | `/journey/try-not-to-click-russia` | [fifteenthJourney.ts](../src/game/fifteenthJourney.ts)       |
| 12  | Chasing the sun          | `/journey/chasing-the-sun`         | [sunFlagsJourney.ts](../src/game/sunFlagsJourney.ts)         |
| 13  | Down the Danube          | `/journey/down-the-danube`         | [danubeJourney.ts](../src/game/danubeJourney.ts)             |

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

Counts below refer to the 65 current questions, not every possible engine pairing.
The type and rule contracts live in [`questions.ts`](../src/game/questions.ts);
user-facing type names live in [`questionTypes.ts`](../src/game/questionTypes.ts).

| Mode                | Control                 | Questions |
| ------------------- | ----------------------- | --------: |
| `pin`               | Drop a pin              |        15 |
| `city-single`       | Single city pick        |         1 |
| `city-multiple`     | Multiple city picks     |         1 |
| `map-single`        | Single country pick     |        10 |
| `map-multiple`      | Multiple country picks  |         5 |
| `number`            | Number                  |         2 |
| `text`              | Free response           |        10 |
| `typed-regions`     | Typed region names      |         3 |
| `ordered-countries` | Ordered country names   |         0 |
| `ordered-capitals`  | Ordered capital names   |         0 |
| `choice-single`     | Single choice           |        15 |
| `choice-multiple`   | Multiple choices        |         3 |
| `choice-order`      | Order cards with spares |         0 |

`land-path` remains an internal supported mode/evaluator, with no playable catalog
example or playground selector. Multiple-choice questions are capped at six
options. The numeric counter supports nonnegative integers with explicit +/-
controls and direct typing; a new numeric rule should respect that UI contract.

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

| Family                 | Rule IDs                                                                                        | Authority/limits                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Authored answers       | `manual-text`, `manual-number`, `choice-ids`, `country-ids`, `region-ids`, `place-ids`          | Reviewed explicit answers, aliases, and membership sets; `manual-number` is supported.                  |
| Pin placement          | `pin-inside`, `pin-distance`                                                                    | Canonical local region containment or authored place/radius, with units and tolerance reviewed.         |
| Country facts/names    | `country-fact`, `text-fact`, `name-length`                                                      | Sourced fact context or the explicit common-English-name UN roster.                                     |
| Capitals/flags         | `capital-name`, `capital-order`, `flag-country`                                                 | Bundled capital/flag records; capital-order checks the specified route.                                 |
| Geographic reasoning   | `shortest-borders`, `great-circle-order`                                                        | Shared-edge canonical topology and spherical route intersections, not roads or travel permissions.      |
| Reviewed relationships | `territory-owner`, `feature-count`, `language-family`, `official-languages`, `physical-feature` | Curated sets/profiles, not universal relationships inferred from display metadata.                      |
| Spatial predicates     | `capital-coordinate`, `capital-circle`, `country-circle`                                        | Pinned coordinates, geodesic disks, and full country geometry. `country-circle` has no bundled example. |

There are 24 declared knowledge-rule variants. Support for a rule does not imply
complete factual coverage or that every mode/rule combination is valid.
[`createQuestionContext`](../src/game/questions.ts) prepares and validates the
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
5. Run `npm run prepare:journeys`, then `npm test` and `npm run build`. Add focused
   checks for new answer behavior, disclosure, ambiguous geography, and metadata.
   Update this catalog table/counts when adding/removing content.

The month calendar highlights scheduled dates and previews pending selections
before publication. Automatic dates show the actual rotation title. Admin can
navigate months, jump to today, enter a date directly, or restore automatic
rotation for an assigned day.

The revised sun Journey uses `chasing-the-sun-v2`, with `supersedes` pointing to
its original ID. New attempts resolve published original-ID assignments to the
revised edition; started attempts keep their saved ID, questions, and scores.
A compatibility-only original definition remains loadable for those saves, but
has no practice route and is excluded from Admin choices and the playground.
The index generator includes both current and compatibility metadata; the current
question catalog contains only 65 questions.

Adding a bundled edition does not change the active rotation. Editing the explicit
rotation list does change which editions subsequent dates select.
Retained attempts remain pinned to their stored Journey. Removed editions are
absent from Admin, practice routes, and the playground. Their IDs are recorded
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

`map.feedbackRegions: "neutral"` keeps land neutral when the answer is a city or
physical feature; supply its answer marker separately in `feedbackPlaces`.
`labelFlexible` allows explanatory place labels to use alternate screen anchors
without making them playable answer targets. A `feedbackDiagram` of type
`river-banks` explains bank relationships schematically without claiming sourced
urban geometry; `earth-shape` compares center distance with sea-level height using
an explicitly exaggerated schematic. `correctFeedback` overrides widget-derived praise when needed.

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
the disabled placeholder; only **Not the obvious city** currently supplies help.

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
