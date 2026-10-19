# Journey engine and authoring contracts

Use [Crafting a Journey](JOURNEY_CRAFTING.md) to design the experience and the
[question catalog](QUESTION_CATALOG.md) to choose supported facts and formats.
This guide explains how to implement that design without adding Journey-specific
controls or renderer branches. [AGENTS.md](../AGENTS.md) governs verification and releases.

## Start a new question

1. Agree on a five-stop outline and the skill at each stop.
2. Find the matching mode in [`mechanics.ts`](../src/game/mechanics.ts), then read
   its complete example in [`recipes.ts`](../src/game/recipes.ts). Recipes cover
   every registered mode, including internal land-path and unused catalog modes.
3. Copy the presentation pattern and declare a fresh `defineQuestion` contract:
   identity, prompt, rule, eligibility, count, commitment, disclosure, help and sources.
   Do not inherit an entire finished question as a presentation preset.
4. Author play, assist and reveal geography in `scenes`. Author completion separately.
5. Run the focused review command, then relevant behavior tests and TypeScript.
   Publish only when deployment is authorized.

Recipes are executable control examples, not finished editorial puzzles. Their
simple tasks and generic explanations must be replaced with the Journey's premise,
reasoning and reviewed sources. They are tested but deliberately absent from the
published catalog, scheduling index and runtime discovery.

## Responsibilities

| Responsibility                                                   | Owner                                                       | Boundary                                                                                                     |
| ---------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Premise, five stops, copy, help, reveal, completion              | `src/game/*Journey.ts`                                      | Content records; no custom React or reducer per Journey.                                                     |
| Mode capabilities, allowed rules, submission and control grading | `mechanics.ts`                                              | Single registry; TypeScript rule compatibility and answer type names derive from it.                         |
| Authored and runtime data contracts                              | `questionContracts.ts`                                      | Type-only question/rule/response/context shapes, presentation presets and discriminated authoring contracts. |
| Authoring entry point and common validation                      | `questionBuilder.ts`                                        | `defineQuestion` compiles scenes and validates; `definePresentation` accepts presentation only.              |
| Scene contracts and runtime compiler                             | `scenes.ts`                                                 | Group authored state; compile once into existing runtime fields.                                             |
| Canonical preparation and answer resolution                      | `questionPreparation.ts`                                    | Validate local data/help, resolve candidates and solutions, prepare paths and own context caches.            |
| Submission readiness and knowledge predicates                    | `questionEvaluation.ts`, `answerTargets.ts`, `reasoning.ts` | Consume canonical answers and registered control grading independently of presentation.                      |
| Pending responses, edits and transitions                         | `state.ts`                                                  | Consume registered response capabilities; preserve shared save shape.                                        |
| Help and immutable assist locks                                  | `guidance.ts`                                               | `withAssistanceLocks` reapplies locks after clearing and stale draft restoration.                            |
| Controls                                                         | `AnswerForm.tsx`, `OrderAnswer.tsx`                         | Route by registered control capability; pointer dragging has button/keyboard alternatives.                   |
| Effective map and feedback                                       | `presentation.ts`, `src/app/journeyWorld.ts`, `copy.ts`     | Resolve authored geography and canonical answers into semantic renderer props.                               |
| Equal city references                                            | `authoredPlaces.ts`                                         | Preserve source identity/coordinates while suppressing capital-specific shape, size and priority.            |
| Local review                                                     | `journeyAudit.ts`, `scripts/check-journey.mjs`              | Review one Journey's contracts, cameras, visible objects, sources and local media.                           |
| Discovery, scheduling and retirement                             | `journeys.ts`, `journeyRegistry.ts`, `journeyIndex.json`    | Keep definitions deferred; regenerate metadata only when its inputs change.                                  |

The globe remains shared with Explore and Study. Display emphasis cannot change
grading. New controls reuse saved `Response` data when its semantics fit; do not
encode a new task under an unrelated knowledge rule just to avoid a proper contract.

`questions.ts` preserves existing type/function imports as a compatibility facade.
Current Journeys, recipes, controls and runtime modules import their actual owner
directly. Prompt/disclosure/feedback text belongs to `questionText.ts`; shared name
and alias matching belongs to the lightweight `answerNames.ts`. Contracts have no
runtime dependencies; preparation does not import evaluation. Evaluation uses the
prepared context and preparation's answer/name resolvers, never camera positions,
colors or display footprints. `questionBuilder.ts` also preserves its authoring
type exports, so existing Journey definitions do not need an import migration.

Structural checks (mode/rule agreement, cardinality, commitment and selection
shape) run in the builder, including when preparation receives a raw record.
Preparation adds data checks: target availability, canonical geometry, radius/tier
bounds, valid routes, complete solutions and honest help. Keep these checks in
their respective owners rather than repeating structural validation in both.

## Explicit scenes

Inside an otherwise complete `defineQuestion` record:

```ts
scenes: {
  play: {
    contextIds: ["wurl:TUR"],
    focus: { lat: 39, lng: 34, altitude: 0.82 },
  },
  assist: {
    places: [ankara, konya, kayseri].map(cityReference),
  },
  reveal: {
    contextIds: ["wurl:TUR"],
    focus: { lat: 40.4, lng: 31, altitude: 0.38 },
    places: [ankara, istanbul],
  },
},
```

The place variables above stand for reviewed bundled records; the full examples
resolve concrete IDs. A scene can contain places, regions, overlays, physical
features or framing appropriate to its stage. `scenes.assist` requires authored
assist copy in `guidance` and can add physical features and a focus alongside
places/overlays. `scenes.assist.borders` (or `guidance.assist.borders`) can
reveal political boundaries without changing eligibility or grading. Established
reference areas retain their blue outlines even when other boundaries are hidden.
Hint copy normally retains the play scene;
`guidance.hintMap` can add reference region emphasis and/or a focus when authored.
Across the Divide demonstrates this hint-stage support. There is no separate
`scenes.hint` object.
Assist layers are merged with play geography and removed when feedback begins;
an assist focus frames the surviving candidates without changing eligibility.
Grading changes, survivor sets and locked answers belong to the answer/help
contract, not scene geometry.

`scenes.play.clueLocators` accepts `{ regionId, label }` annotations for supplied
reference/candidate areas or highlighted fragments (`clue-part:<countryId>`).
The builder requires a unique supplied area and a nonempty authored label; it does
not infer an island or owner's name. Keep withheld names out of these labels.
`journeyWorld` exposes locators only during play. `globe/clueLocators.ts` measures
the projected display footprint, so sparse archipelagos and small areas receive
the same treatment below 1,600 square screen pixels: a two-cycle blue pulse and
a persistent leader/name callout. It avoids the horizon, viewport edges, question
panel and other labels, creates no hit target, and is removed when play ends.
Reduced motion retains only the static callout. These are orientation cues, not
accuracy rings, grading geometry, or answer disclosure. Island instincts shows
the pattern; use the same shared annotation rather than per-question city dots
or thick white borders.

For named-choice or typed-region questions that test identification of anonymous geography, author
`scenes.play.map.selectionFeedback: "after-submit"` and use
`map.candidateRole: "clue"` for noninteractive area pools. Blue clue fills remain uniform
while buttons or text fields track pending answers. Typed names must not preview
their locations before submission. Map selection colors and area symbols
appear only in feedback, preserving the name-to-shape task. Keep hover names and
map interaction disabled for this pattern. Other questions retain normal pending
map feedback; eligibility and grading are unchanged.

`reveal.contextIds` stays context-colored. `reveal.answerIds` identifies answered
regions; use it only when the region is the answered object. A symbol, history or
city question can keep its country contextual with `map.feedbackRegions: "neutral"`.
`reveal.borders: false` can suppress political boundaries for continental context.

Use `displayGeometries` keyed by country or region ID for a sourced, question-local
coastline replacement. These footprints apply to play, reveal and completion;
canonical geometry and answer eligibility remain unchanged. Replace the full
footprint rather than adding an overlapping imported island.

Completion can author `overlays`, `borders`, `mapCaption` and `mapAttribution` separately from
the last round. A `texture` overlay is a transparent equirectangular image covering
the globe (−180° at the left edge, north at the top); `opacity` controls its strength.
It never participates in picking or grading. A `path` overlay supports a sourced
or explicitly schematic geographic guide, with optional dashes and opacity.

`compileQuestionScenes` merges scene values over presentation defaults without
mutating the source/preset. An explicit empty array replaces that scene's inherited
field; omission preserves the default. At runtime, reveal overlays and physical
features augment the play layers, so an empty reveal array does not remove a play
layer. Completion owns its layers separately and can clear them with empty arrays.
The compiler produces the legacy runtime fields once, and existing records
without scenes pass through unchanged. No renderer or persistence migration is
required. New authors should use the grouped fields for state-specific geography;
all bundled Journeys have been migrated. Do not edit both an authored
scene and its generated flat field independently.

## Standards and supported capabilities

[Crafting a Journey](JOURNEY_CRAFTING.md) owns current authoring standards. The
registry and contracts describe a wider supported API, including compatibility
and internal recipes. In particular:

- Current single-country and merged-territory questions commit immediately;
  pins and multi-answer selections confirm. Editable commitment in the registry
  describes engine support, not permission to introduce a different convention.
- Distance tiers remain optional in the schema; current authored Journeys use
  three inclusive bands ending at the unchanged acceptance radius.
- `land-path` has a complete internal recipe, but no current published question.
- A disclosed geographic pool need not be map-selectable. Input comes from the
  mode/selection contract; reference areas are excluded from region answers.

## Matching example

Matching shares card movement with ordering but has a distinct rule and named roles.
The relevant fields in a complete question are:

```ts
mode: "choice-match",
selection: { type: "none" },
commitment: "submit",
count: 3,
choices: [
  { id: "city:pretoria", label: "Pretoria" },
  { id: "city:cape-town", label: "Cape Town" },
  { id: "city:bloemfontein", label: "Bloemfontein" },
  { id: "city:johannesburg", label: "Johannesburg" },
],
matchSlots: [
  { id: "executive", label: "National administration" },
  { id: "legislative", label: "Parliament" },
  { id: "judicial", label: "Supreme Court of Appeal" },
],
rule: {
  type: "slot-matches",
  matches: [
    { slotId: "executive", choiceId: "city:pretoria" },
    { slotId: "legislative", choiceId: "city:cape-town" },
    { slotId: "judicial", choiceId: "city:bloemfontein" },
  ],
},
```

This excerpt uses illustrative card IDs; real map references use bundled place IDs.
Matching itself can use any reviewed card identities. Role labels appear inside
empty slots. Placed cards retain a compact role caption. Both columns have equal
width; narrow screens stack them.

Rules are keyed by role ID. `Response.ordered` stores cards in displayed slot
order; expected cards are derived from role identities. Rule array order therefore
does not change the pairings. Each role needs one unique card; spare cards stay
unused. Current contracts allow two to six cards, with no many-to-one matching or
partial credit. A correct matching response earns one answer.

`assist.fixedSlots` uses displayed slot indices. Update it when changing role
order; context validation rejects a wrong lock. Lock fewer than all roles so a
real decision remains. South Africa locks Cape Town while retaining three cards
for two roles. Clearing and restoring drafts preserve the lock.

The Supreme Court of Appeal wording makes Johannesburg a fair distractor despite
its Constitutional Court. Keep that nuance in the reveal, not extra map-label copy.
See the current South Africa question for reviewed primary sources.

## Composite territory example

`merged-region-single` has a distinct `merged-region` rule and reuses the shared
selected-ID response and map control. See its executable recipe and
[Missing Borders](../src/game/missingBordersJourney.ts). Canonical preparation
validates member connectivity, the complete internal adjacency set, candidate
availability and meaningful assist survivors. `compositeRegions.ts` dissolves
exact directed shared edges in the bundled country topology and caches the
result; this is not a general union for arbitrary overlapping/imported polygons.
No geography is regenerated. Presentation replaces member surfaces with one
anonymous composite during play and restores the original polygons on reveal.
Globe picking selects one synthetic ID; grading never uses the dissolved geometry.
The current control requires WebGL and pointer/touch input, without letter labels
or silhouette button alternatives. Names, original member outlines and typing remain
unavailable before submission. The current reveal is immediate, with identical
reduced-motion behavior. Completion uses the existing automatic flyover; reduced
motion shows the authored completion focus.

## Focused review commands

```sh
npm run check:journey -- not-the-obvious-city
npm run check:journey -- --recipe choice-match
npm run check:journey -- --all
npm run check:journey -- --list
npm run --silent check:journey -- not-the-obvious-city --json
```

The command loads the requested Journey module (or every indexed definition with
`--all`), builds its canonical context,
and inspects play, hint, assist, correct-reveal and missed-reveal states. Correct
and missed samples run through the reducer with actual responses; the audit also
checks their completed recaps for lost required solutions and mistakes. It also
probes editable named/typed answers against anonymous geography and reports the
question ID, help stage, and choice when a pending response leaks its location. It checks
contracts, source metadata, media existence, camera coordinates, duplicate visible
places and anonymous city-name disclosure. JSON includes answer identities and
base marker shapes/sizes, shared rule definitions, and accepted authored exceptions
with their reasons for editorial review. These are not projected symbol
sizes or a simulation of role-specific glyphs; actual annotation/target rendering
and depth still belong to the renderer. Samples are representative, not exhaustive:
partial assignments, repeated objects, and alternate spellings still need focused
behavior coverage. An unavailable missed sample is reported as a warning rather
than replaced with an empty response carrying a fabricated grade. It never fetches data, regenerates
assets, opens a browser or deploys. Failure exits nonzero. Missing authored completion
is reported as a note because legacy Journeys may use the generic recap.

The consistency check has two levels: mechanic-independent role rules in
`journeyVisualRules.ts`, and narrow authored exceptions reviewed against those
rules. `visualExceptions` maps `hidden-boundaries`, `open-search-background`, or
`natural-background` to a nonempty reason. Unsupported or stale entries fail;
exceptions never disable unrelated rules. The catalog sweep applies the same
checks to play, hint, assist, both reveal outcomes and completion retention. Independent role fixtures
exercise map, choice, typing, number and pin inputs, including broken examples.
See the crafting guide for the editorial decisions behind these exceptions.

Unrelated geography defaults to muted regardless of input mode.
`scenes.play.map.background: "open-search"` deliberately shows a broad neutral
search surface; it requires an `open-search-background` reason.
`map.candidates: "neutral"` declares the equivalent whole-world country candidate
field. `map.neutralRegions: true` uses ordinary political map colors and requires
a `natural-background` reason. Boundary hiding that removes candidate outlines
requires a `hidden-boundaries` reason; reference outlines remain mandatory.
Reference area strokes use `playColors()["context-outline"]`, separate from the
light blue point accent, with tested contrast against the reference fill and muted land.
Clue area strokes share that thin, dark blue treatment. Both retain a small
clearance above subdivision caps and depth testing. In play, only selectable or
open-search candidate land receives the amber hover outline and warm hover fill;
references, clues and committed answer colors stay steady.

Exported scene previews are synthetic; audit submissions exercise the reducer.
Neither proves that every location can be clicked or that a fact is true.
Recipe tests separately grade known answers.
Review geography, copy and sources with judgment; automated checks cannot establish
historical truth, screen-space legibility or every form of answer leakage.

## Answer roles and presentation

`answerPresentation.ts` resolves response identities, slot assignments, assistance
provenance, and outcome states independently of their colors. A choice may declare
`geographyIds` to link its stable grading ID to one or more region/place depictions.
These links do not make a button question answerable by tapping the map. Preparation
validates the depicted identities; grading continues to use the original choice IDs.

Use `map.candidates: "highlighted"` to disclose a candidate field. A link alone
must not introduce hidden markers, names, or boundaries. Context stays contextual
through selection and reveal unless explicitly cleared or itself answered. Imported
regions appearing only in reveal context stay hidden during play. City results belong
to their markers, not their parent countries. Numeric and abstract responses must not
promote background countries to correct answers. Use reveal `answerIds` for actual
solution areas; use `contextIds` and explanatory places for supporting geography.

Feedback shows the canonical answer once. Simple answers review only submitted
mistakes, without listing unused choices. Role/position assignments retain their
slot review. Legends explain competing answer states; ordinary context and
background geography do not need legend entries. Unchosen valid alternatives
are labelled separately from required answers.
Region response badges are annotations and never intercept picking. The palettes
in `src/theme/playColors.ts` share role meanings across globe, controls and legends,
with values adapted for Paper; physical/thematic layers retain their own meaning.

The editorial fundamentals live in [Crafting a Journey, section 5](JOURNEY_CRAFTING.md#5-give-the-globe-purposeful-question-state-information).
The implementation keeps those decisions independent:

- `contextIds` supplies established references and excludes those regions from
  map-answer eligibility. `candidateRegionIds` supplies an openly shown area pool
  independently of the input control. Scenes compile both fields, and preparation
  validates candidate geography. Whole-world country candidates and explicitly
  authored open pin searches use neutral `surface`; pin input alone leaves
  unrelated land muted. Finite globe answer fields use `selectable`. Area pools
  supplied for name/button answers use `map.candidateRole: "clue"` with deferred
  selection feedback and no hover emphasis. They render as blue `clue` shapes;
  preparation rejects this role on globe-selection mechanics.
- `authoredPlaces.ts` supplies `cityReference`, `areaLabel`, and
  `explanationPlace`. `displayRole` distinguishes a supporting illustration from
  a graded location; `markerHidden` makes a label anchor without inventing a point.
  A choice grades a point only when its answer identity is linked to that point;
  an abstract reason or meaning does not grade illustrative cities.
  Authored city points share one style and size. Canonical location records remain
  unchanged for grading, names, and aliases.
- `interiorAnchor.ts` supplies a cached interior point and clearance on the main
  displayed landmass. `areaSymbols.ts` projects that clearance through the current
  camera. Bare area symbols shrink with usable screen space and disappear below
  legibility; they never become hit targets. A fragment and owner share one answer
  identity. For numeric area counts and border crossings, the qualifying set or
  demonstrated route uses green after a correct count and teal after a miss;
  supporting reference areas stay blue. Numeric reveals do not add per-area
  selection symbols or center-to-center travel lines.
- Reference outlines have a small physical lift and drawing-order advantage over
  ordinary geography, while retaining depth testing. Border graphs and ordered
  lists never manufacture center-to-center travel paths. Great-circle comparisons,
  pin error measurements, and reviewed physical paths retain meaningful lines.
- Matching locations retain slot numbers during feedback. Revealed point answers
  promote containing geography as context. `journeyDiscoveryPlaces` retains reviewed
  point discoveries in generic and custom recaps; custom scenes add framing and
  context. Unrelated geography stays muted; mistakes retain their separate status.
  Recap mistakes use graded answer identities, including linked choice geography,
  merged-region picks, city assignments, and submitted pins. Incorrect status wins
  over custom completion decoration; a revealed solution remains a discovery even
  after the player misses it. Authored reference or explanation points cannot
  demote reviewed discoveries back to context. City and pin mistakes do not grade their containing
  countries. A known wrong typed city remains a red point even when it is not a
  capital; display lookup prefers authored cities and rejects ambiguous or unknown
  names without inventing coordinates. This lookup never changes grading.
  Required solutions persist after omissions. For questions accepting alternatives,
  retain the accepted response, or a canonical example after a miss, rather than
  promoting the entire valid pool. Revealed named clue fragments persist as geometry
  and label anchors, including multiple fragments belonging to the same country.
  Generic flyover stops prefer authored `feedbackFocus` to a containing country's
  mainland. The answer control owns commitment notices; authored copy must not
  repeat them.

Bundled single-country and merged-territory questions declare immediate commitment.
Legacy unsubmitted selections remain drafts until the player taps an answer again;
restoring them never assigns a grade. Disclosure, canonical grading, and saved
response shapes are independent of these presentation rules.

`pinPresentation.ts` supplies display-only accuracy bands. Distance pins show a
crosshair target, a distinct submitted pin, labelled radii, and the achieved band.
Rings and accuracy coloring appear only after commitment. Overlays live under one
persistent renderer layer; question changes remove and dispose its inactive
children, including when leaving a Journey. Existing acceptance
radii, all-or-nothing grades, points, and saved responses remain unchanged: an
accepted pin still earns one correct answer, regardless of its visual band.
Missed distance pins use a shared adaptive overview when both locations fit on the
visible globe. Feedback provides explicit **Show your pin** and **Show answer**
camera controls for pin tasks; extremely distant or antipodal locations keep the
answer framing and rely on those separate views. These controls change only the
camera, never the submitted response. Nearby and correct pins preserve authored
framing.
Tier points, Journey weights, and historical assessment snapshots require a
separate scoring contract; do not infer points from colors or band positions.

## Extending the engine

1. Define the intended skill, clues, grading, assistance and reveal first.
2. Reuse a registered mechanic/rule when it expresses the task honestly.
3. For a new mechanic, add a typed mode contract and one `MECHANICS` entry. Register
   its allowed rules, control, response, eligibility capability, validation,
   submission and any control-specific grading. Add a UI control only if required.
4. For a new knowledge rule, add its discriminated rule type in
   `questionContracts.ts`, its answer calculation in `questionPreparation.ts`
   and its predicate in `questionEvaluation.ts` / domain helpers. Rule-family
   extraction is a possible later improvement; do not combine preparation and grading.
5. Add a complete recipe and regression checks for incomplete answers, distractors,
   edits, assistance, restored drafts, feedback and non-WebGL input.
6. Document the supported behavior and current limits in the catalog. Run focused
   checks. Update scheduling metadata only if its authored inputs changed.

Current Journeys use grouped scenes. Shared presentation
presets can still supply defaults; scene overrides compile into the renderer's
existing fields. This is one engine and one current catalog, without archived
runtime definitions. Isolated evaluator fixtures are test data, not playable
Journey archives.

Edit current Journeys in place during authoring. If an edition is deliberately
removed, delete its definition and index entry, record its ID in
`retiredJourneys.ts`, and verify save recovery preserves retained progress.
A `supersedes` alias may remain to resolve previously published assignments to
the current edition; it does not require keeping the old questions loadable.

For an in-place change to answer contracts, increment `Journey.saveRevision` and
provide `legacyRoundLabels` for changed answers, keeping stored round IDs stable.
New submissions capture their receipt label. Save decoding/opening upgrades old
attempts once: submitted grades remain intact, obsolete unsubmitted drafts and
unused help are cleared, and already graded feedback advances to the next stop.
Completed results retain their original receipt names; replay starts the current
revision. The same upgrade runs for synced and archived attempt registers, so a
stale device cannot restore an obsolete draft. This metadata stores receipt
names only, not archived questions or old grading rules.

`src/theme/playColors.ts` owns semantic palette values through `playColors(theme)`.
`src/globe/themes.ts` adapts them to region fills/outlines and re-exports the common
`PLAY_HIGHLIGHTS`/`PLAY_FEEDBACK` aliases. Reference land uses `context-land`;
point/outline reference accents use `hinted`. Open search uses `surface`, distinct
from finite-candidate `selectable` and muted background `disabled`. Do not assume
one context hex is used on every surface. UI, places, paths, rings and legends
consume these roles with theme adaptations.

Named map alternatives require `disclosure.namedChoices`. Use
`map.candidates: "highlighted"` for a disclosed map-candidate field, and
`candidateRegionIds` for a visible area pool independent of input. Use
`map.candidateRole: "clue"` for a noninteractive area pool; reserve gold land for
available globe answers. Eligibility still comes from the mechanic, never a
color. Do not rely on help to introduce an initially required candidate field.
