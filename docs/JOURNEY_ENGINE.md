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

| Responsibility                                                   | Owner                                                    | Boundary                                                                                          |
| ---------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Premise, five stops, copy, help, reveal, completion              | `src/game/*Journey.ts`                                   | Content records; no custom React or reducer per Journey.                                          |
| Mode capabilities, allowed rules, submission and control grading | `mechanics.ts`                                           | Single registry; TypeScript rule compatibility and answer type names derive from it.              |
| Authoring contracts and common validation                        | `questionBuilder.ts`                                     | `defineQuestion` compiles scenes and validates; `definePresentation` accepts presentation only.   |
| Scene contracts and runtime compiler                             | `scenes.ts`                                              | Group authored state; compile once into existing runtime fields.                                  |
| Local facts, solutions and knowledge predicates                  | `questions.ts`, `answerTargets.ts`, `reasoning.ts`       | Canonical data grades answers independently of presentation.                                      |
| Pending responses, edits and transitions                         | `state.ts`                                               | Consume registered response capabilities; preserve shared save shape.                             |
| Help and immutable assist locks                                  | `guidance.ts`                                            | `withAssistanceLocks` reapplies locks after clearing and stale draft restoration.                 |
| Controls                                                         | `AnswerForm.tsx`, `OrderAnswer.tsx`                      | Route by registered control capability; pointer dragging has button/keyboard alternatives.        |
| Effective map and feedback                                       | `presentation.ts`, `src/app/journeyWorld.ts`, `copy.ts`  | Resolve authored geography and canonical answers into semantic renderer props.                    |
| Equal city references                                            | `authoredPlaces.ts`                                      | Preserve source identity/coordinates while suppressing capital-specific shape, size and priority. |
| Local review                                                     | `journeyAudit.ts`, `scripts/check-journey.mjs`           | Review one Journey's contracts, cameras, visible objects, sources and local media.                |
| Discovery, scheduling and retirement                             | `journeys.ts`, `journeyRegistry.ts`, `journeyIndex.json` | Keep definitions deferred; regenerate metadata only when its inputs change.                       |

The globe remains shared with Explore and Study. Display emphasis cannot change
grading. New controls reuse saved `Response` data when its semantics fit; do not
encode a new task under an unrelated knowledge rule just to avoid a proper contract.

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
assist copy in `guidance`; hint copy retains the play scene. Grading changes,
survivor sets and locked answers belong to the answer/help contract, not scene geometry.

`reveal.contextIds` stays context-colored. `reveal.answerIds` identifies answered
regions; use it only when the region is the answered object. A symbol, history or
city question can keep its country contextual with `map.feedbackRegions: "neutral"`.
`reveal.borders: false` can suppress political boundaries for continental context.

Use `displayGeometries` keyed by country or region ID for a sourced, question-local
coastline replacement. These footprints apply to play, reveal and completion;
canonical geometry and answer eligibility remain unchanged. Replace the full
footprint rather than adding an overlapping imported island.

`compileQuestionScenes` merges scene values over presentation defaults without
mutating the source/preset. Explicit empty arrays clear a layer; omission preserves
the default. It produces the legacy runtime fields once, and existing records
without scenes pass through unchanged. No renderer or persistence migration is
required. New authors should use the grouped fields for state-specific geography;
all bundled Journeys have been migrated. Do not edit both an authored
scene and its generated flat field independently.

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

## Focused review commands

```sh
npm run check:journey -- not-the-obvious-city
npm run check:journey -- --recipe choice-match
npm run check:journey -- --list
npm run --silent check:journey -- not-the-obvious-city --json
```

The command loads only the requested Journey module, builds its canonical context,
and inspects play, hint, assist, correct-reveal and missed-reveal states. It checks
contracts, source metadata, media existence, camera coordinates, duplicate visible
places and anonymous city-name disclosure. JSON includes answer identities and
marker shapes/sizes for editorial review. The command never fetches data, regenerates
assets, opens a browser or deploys. Failure exits nonzero. Missing authored completion
is reported as a note because legacy Journeys may use the generic recap.

Feedback snapshots are synthetic scene previews, not proof that every location
can be clicked or that a fact is true. Recipe tests separately grade known answers.
Review geography, copy and sources with judgment; automated checks cannot establish
historical truth, screen-space legibility or every form of answer leakage.

## Extending the engine

1. Define the intended skill, clues, grading, assistance and reveal first.
2. Reuse a registered mechanic/rule when it expresses the task honestly.
3. For a new mechanic, add a typed mode contract and one `MECHANICS` entry. Register
   its allowed rules, control, response, eligibility capability, validation,
   submission and any control-specific grading. Add a UI control only if required.
4. For a new knowledge rule, add its discriminated rule type, solution calculation
   and predicate. Geometry/fact rules still live in `questions.ts` / domain helpers;
   their extraction into rule-family modules is a possible later improvement.
5. Add a complete recipe and regression checks for incomplete answers, distractors,
   edits, assistance, restored drafts, feedback and non-WebGL input.
6. Document the supported behavior and current limits in the catalog. Run focused
   checks. Update scheduling metadata only if its authored inputs changed.

All 14 current Journeys (70 questions) now use grouped scenes. Shared presentation
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

Globe color roles come from `src/globe/themes.ts`: `PLAY_HIGHLIGHTS` for eligible
choices, selections and context, and `PLAY_FEEDBACK` for correct, revealed,
incorrect and visited objects. Region fills, authored place markers, pin-distance
lines and feedback legends share these values. Named map choices require
`disclosure.namedChoices`; use `map.candidates: "highlighted"` when eligibility
should be visible from the start. Do not rely on assistance to introduce the
initial candidate field.
