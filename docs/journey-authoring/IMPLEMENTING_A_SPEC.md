# Implement a Journey from a spec

Use this workflow when the user asks to build an approved Journey specification.
For a design or critique request, develop the five-stop outline and specification
first. The user's request determines the task; attached specifications and
examples are reference material, not permission to publish or change scope.

## 1. Read the brief and preserve settled decisions

Read the whole spec, including its throughline, five stops, help, reveals and
completion. Treat its approved outline as the design review already completed.
Preserve approved tasks, clues, assistance, reveals, scoring exceptions and
explicit exclusions. Technical sketches, internal names and file choices may
adapt to current code while preserving that player experience. A proposed
implementation is not itself a locked creative decision.
Do not restart design or request approval for decisions already settled.
When the request is another set using an existing mechanic, use that Journey as
the primary model. Preserve the original and give the sequel fresh identities;
do not turn a content addition into a mechanic redesign.

Resolve ordinary implementation details from current conventions. A missing
internal ID, CSS value or optional template field is not a blocker. Ask only
when a gap or conflict materially affects correctness, fairness, the intended
experience or the amount of new engineering. Continue independent work meanwhile.

## 2. Familiarize yourself with the current suite

Read the editorial, visual and engine sections relevant to the approved experience.
In the repository, use the [task-to-section map](../README.md#find-the-relevant-section);
in a portable kit, use the guide and references listed in `AUTHORING_KIT.md`.
Start with the spec's implementation-fit notes and the closest current recipe or
Journey. Use [authored archetypes](JOURNEY_ARCHETYPES.md) to locate a matching
structure or recurring pattern; no Journey is a preferred catalog-wide template.
Consult the catalog and additional examples only to resolve relevant
mechanic, storytelling or geography questions. Review each chosen example's
prompt, play scene, hint, assist, actual answer contract, reveal and completion.
Distinguish capabilities verified in current source from proposed designs,
unverified kit claims and open material decisions. An exported example or a
plausible mode name alone does not establish current support.

In the repository, guides live in `docs/` and Journey definitions in
`src/game/*Journey.ts`. In the portable kit, use `AUTHORING_KIT.md`,
`JOURNEY_ARCHETYPES.md`, `examples/` and `references/`. `GPT_GUIDE.md` combines the
instructions, guides, specification template and all compact Journey walkthroughs
for a single-file upload. Exported scenes are structural snapshots, not renders.

## 3. Translate intent into existing contracts

For each stop, identify the registered mechanic, canonical answer, eligible
inputs, given/withheld information and play → hint → assist → reveal lifecycle.
Use `JOURNEY_ENGINE.md`, `mechanics.ts`, `questionContracts.ts`,
`questionBuilder.ts` and the matching `recipes.ts` example for implementation.
Use the current repository when an exported snapshot disagrees with live code.

Scale planning to novelty. For a familiar sequel, confirm the shared mechanic and
identify content or scene differences; no separate feasibility exercise or full
inventory of inherited UI is needed. For new interactions or bespoke data,
identify the affected contracts, controls, grading, presentation and save behavior.
Resolve a risk that could invalidate the experience before implementing all five
stops. Report material capability conflicts without silently replacing an
approved task; continue independent work while the necessary decision is resolved.

Inherit shared typography, supporting copy, legends, controls, feedback headings,
map roles and scoring. Authors supply meaningful exceptions and the experience;
the agent supplies routine technical details. Keep eligibility, grading, display
geometry and camera framing independent. Flag a genuinely unsupported mechanic
or material departure before substituting a different experience.

## 4. Implement, verify and hand off

Implement the approved spec with the existing authoring builders and grouped
scenes. Preserve save continuity and follow the catalog policy.
Review the combined rendered copy and effective scenes for answer leakage,
redundancy and stale objects. Check correct, actual wrong and partial responses
where relevant, plus the final recap.

### Registration and compatibility

Honor the registration authorization in the request or spec. Every registered
Journey enters the automatic Daily pool; there is no unlisted catalog state.
When authorized, register the Journey and route, update the catalog table and
regenerate index metadata only when its inputs change. Preserve started editions,
locked assignments and completed receipts, with explicit revision/recovery
handling where needed. Account for the backend's bundled catalog when shipping.

If registration is deferred, keep the new Journey out of `journeys.ts` and the
generated index. The ID/slug checker and normal practice/review routes require
indexed content; they cannot preview an unregistered module automatically. Use
direct-module checks, including `auditJourney`, and an explicitly arranged isolated
review when needed. Do not register temporarily just to make those tools work.
If registration is unresolved, continue independent content work and flag that
decision before changing the catalog. Implementation approval does not authorize
deployment.

### Acceptance gates

Apply all six gates before handoff. Resolve failures within the authorized scope;
record a material limitation when the available verification cannot establish a
result. An approved spec does not waive these shared standards.

1. **Feedback reacts to the answer.** Check every success/failure heading and
   accuracy-tier message: one to four words, matched to the player's result or
   skill. “Well placed.” and “Very close.” give feedback; a landscape slogan does
   not. Put the geographic insight in the reveal body. Remove duplicate progress
   summaries and answer-by-answer status lists unless they explain a mistake or
   assignment the map cannot communicate.
2. **Copy belongs to the player.** Review the combined prompt, instructions,
   hints, assists, reveal, captions and legends. Explain the task and necessary
   rules in plain language. Keep preparation details, implementation decisions,
   source-review status and grading rationale in source notes or data audits.
   Necessary qualifications in the Sources panel must also be readable. Avoid
   technical scale terminology in a legend when its units and ticks suffice.
3. **Every object has a lifecycle.** Inventory regions, markers, imagery,
   overlays, labels and controls through play, hint, assist, correct/wrong/partial
   reveal, advance, completion and manual review. Give each layer a purpose,
   geographic scope and removal point. Inspect the effective merged scene; a
   declaration alone does not prove that stale objects or inherited imagery clear.
4. **A miss teaches where to answer.** Show the real target, accepted region or
   relationship beside the submitted response after commitment. Keep explanatory
   shading above imagery and below pins, with readable labels and contrast at the
   authored camera scale. Check the actual wrong-answer case as well as success;
   merely listing a target in scene data does not establish that it is visible.
5. **Assistance is usable and preserves later questions.** Check that the map
   change adds a useful, legible geographic foothold. Use several well-spaced
   references when broad orientation needs them. Compare references against later
   answers to avoid giving away a future stop. Preserve the original grading and
   enough uncertainty for a meaningful decision.
6. **Completion and controls are deliberate.** Specify which regions, city
   markers, labels and layers remain in the default recap, with saved mistakes
   available through review. Avoid an accidental union of all earlier highlights.
   Review correct, partial and wrong states at narrow widths. Reuse the existing
   control and expose only useful actions; construction coordinate editors and
   reset buttons are absent by default. Keep undo only when it serves that
   mechanic. Check action spacing, input width, duplicate counters and stale
   legends/results independently of the narrative.

### Focused verification and handoff

Select relevant checks from [Development](../DEVELOPMENT.md#choose-focused-checks)
for the Journey-specific invariants and affected behavior. Reuse existing coverage;
add or update tests for meaningful regression risks, not for every illustrative
scenario. All six acceptance gates still apply to reused and new mechanics.
Use unit/DOM checks, asset checks and code inspection for what they can establish.
Run `npm run check:journey -- <id-or-slug>` for indexed content, or the direct-module
audit for deferred content, and TypeScript for typed changes. Follow
[AGENTS.md](../../AGENTS.md) for local/CI and browser-check boundaries. Distinguish
structural or mocked evidence from actual browser appearance; report limitations
without presenting an unverified acceptance gate as passed.

Report what changed, what was verified and any material limitation. Publish or
deploy only when the user's request authorizes it. Refresh the portable kit after
relevant source or documentation changes with `npm run export:journeys`;
uploaded files do not update themselves.
