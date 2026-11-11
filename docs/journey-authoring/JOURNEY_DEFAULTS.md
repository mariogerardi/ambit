# Shared Journey defaults

These are inherited implementation conventions, not fields the user must specify
again. AI authors the copy and resolves routine presentation choices. Apply a
documented exception when the approved experience needs it; existing examples
alone do not override the current standards. Code establishes actual behavior.

## Inherit before adding an exception

| Concern                | Inherited behavior                                                                                                                                                                               | Owner / extension boundary                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Question copy          | Optional meaningful context, one task, shared supporting instructions and result reactions. AI supplies the words.                                                                               | `JOURNEY_CRAFTING.md`, `questionText.ts`, `QuestionSupport.tsx`. Change content before adding UI.     |
| Typography             | Shared question/context hierarchy, marker labels and native-text rendering. Translation captions use the bundled editorial italic; longer Latin/Cyrillic clues are compact, Arabic larger.       | `TextClue.tsx`, `game.css`, `fonts.css`. Reuse shared styles rather than Journey-specific CSS.        |
| Commitment and scoring | Single-country picks, pins and multiple selections remain editable until explicit submission. Three points per round, hint ceiling two, assist ceiling one. Distance bands remain authored data. | Question contracts, `mechanics.ts`, `points.ts`. New scoring is a deliberate extension.               |
| Help                   | Keep the canonical answer rule; add references, narrow a candidate pool or lock supported responses through existing assist contracts.                                                           | `guidance.ts`, question preparation/evaluation. Help is not a second grading rule.                    |
| Geographic roles       | Keep input eligibility, clue disclosure, canonical grading and display geography independent. Explanatory network countries do not all become player discoveries.                                | `presentation.ts`, `answerPresentation.ts`, `journeyWorld.ts`. Use semantic roles, not custom colors. |
| Completion             | Cumulative discoveries and actual mistakes, with the shared result UI. An authored map can intentionally replace the cumulative scene.                                                           | `journeyWorld.ts`, `completion.mapMode`. Authored recap geography is content.                         |

## Choose presentation by role

Reuse a Journey's interaction structure; inherit appearance from this guide and
the shared helpers/tokens. A published Journey may deliberately use optional
badges, sizes or camera exceptions. Its presence is not a recommendation to copy
those treatments. Omit optional overrides unless the approved experience needs
them; use `authoredPlaces.ts` and `globe/symbols.ts` for shared point styles.

| Object                         | Default presentation                                                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Anonymous selectable locations | Equal plain candidate markers; no names, hover names or letter badges before commitment. Use `cityReference` for equal city shapes and `GLOBE_SYMBOLS.candidate` for candidate size. |
| Named selectable locations     | The same shared markers, with names disclosed by the question's disclosure policy. Capital status must not give away a candidate's role.                                             |
| Explanatory geographic areas   | Existing footprints or `areaLabel` anchors without invented city dots; explanatory context does not receive the player's grade.                                                      |
| Revealed locations             | Disclosed names and shared result symbols; preserve the actual wrong selection alongside the solution.                                                                               |
| Completion                     | Reuse canonical place identities, retain discoveries and actual mistakes, and distinguish explanatory context. Avoid nearby duplicate annotations for the same place.                |

Letter/number badges are an exception when the task needs to refer to lettered
objects or show an ordering. Ordinary anonymous selection does not need them.
For an executable plain-marker lifecycle, use `recipe:anonymous-city-selection`
in `src/game/recipes.ts`; its sandbox includes correct/missed reveals and cumulative
completion. Made in China's A/B/C markers are an optional Journey-specific
treatment, not the anonymous-selection default. Existing content is not restyled
automatically by these authoring conventions.

## Camera rules by stage

- **Bounded country/territory search:** prefer
  `scenes.play: { framing: "selection" }` to derive the view from all eligible
  outlines. No hand-entered focus is needed. Assistance fits the surviving pool;
  explicit help framing takes precedence. Full outlines and dateline crossings
  count; sets too broad for one hemisphere use a world overview. Use authored
  framing for a deliberate reference/clue composition. Existing questions adopt
  the policy explicitly rather than having authored views silently replaced.
- **Question entry:** a neutral whole-world country search without authored map
  clues or intro views starts at a random continental view and rotates. Preserve
  an already suitable rotating world view. Interaction stops rotation; explicit
  geographic clues retain their framing. `isWholeGlobeSearch` owns eligibility.
- **Round reveal:** ordinary authored tours are finite. In grouped scenes, a
  single-country explanatory network defaults to returning to the actual selected
  country, including a miss. `returnToSelection: false` opts out;
  `reveal.orbit: true` explicitly requests a world-rotation endpoint instead.
  Other mechanics retain their existing answer/authored framing.
- **Completion:** the normal recap flyover loops until map interaction. An
  authored `completion.orbit: true` makes one finite tour followed by shared
  Home/Explore rotation. No visible stop button is required.
- **Reduced motion:** use the static endpoint; never require motion to understand
  the question or reveal. Input cancels active tours and rotation handoffs.

The shared camera owner is `useCameraOrchestration.ts`; grouped scenes compile in
`scenes.ts`. Do not copy camera effects into a Journey. Declare content-specific
tour stops and meaningful deviations from these policies only.

## Find a complete reusable experience

Run `npm run check:journey -- --capabilities` (add `--json` for structured output).
Add `--recipe <name>` to inspect just the relevant composition without auditing
or loading the full capability catalog.
Each executable recipe reports eligibility, answer/commitment policy, disclosure,
assistance, explanatory reveal, entry/reveal camera and sandbox completion.
Related published examples report their own policies and differences from the
recipe, including their actual completion policy.

Match these policies to the proposed experience before opening more source.
Compare only the relevant recipe and example; matching a mode and rule is a
starting point. Same policies do not establish identical data, geometry or visual
quality. Audits exercise contracts and reducer scenes, not real rendered behavior.

Classify the remaining work as content/data, a scene composition, a grading rule,
or a new input/response. Record only material differences in the spec's existing
implementation-fit section; do not create a second feasibility report or demand
that the user fill in inherited behavior.
