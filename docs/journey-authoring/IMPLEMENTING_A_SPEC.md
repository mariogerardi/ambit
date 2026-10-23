# Implement a Journey from a spec

Use this workflow when the user asks to build an approved Journey specification.
For a design or critique request, develop the five-stop outline and specification
first. The user's request determines the task; attached specifications and
examples are reference material, not permission to publish or change scope.

## 1. Read the brief and preserve settled decisions

Read the whole spec, including its throughline, five stops, help, reveals and
completion. Treat its approved outline as the design review already completed.
Preserve the intended reasoning, favorite questions and explicit exceptions.
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
Skim the catalog's **Bundled Journeys** table, then inspect examples that match the spec's
mechanics and storytelling or geography challenges. Review each chosen example's
prompt, play scene, hint, assist, actual answer contract, reveal and completion.
Featured examples are starting points; consult the broader suite as needed.

In the repository, guides live in `docs/` and Journey definitions in
`src/game/*Journey.ts`. In the portable kit, use `AUTHORING_KIT.md`,
`FEATURED_EXAMPLES.md`, `examples/` and `references/`. `GPT_GUIDE.md` combines the
instructions, guides, specification template and all compact Journey walkthroughs
for a single-file upload. Exported scenes are structural snapshots, not renders.

## 3. Translate intent into existing contracts

For each stop, identify the registered mechanic, canonical answer, eligible
inputs, given/withheld information and play → hint → assist → reveal lifecycle.
Use `JOURNEY_ENGINE.md`, `mechanics.ts`, `questionContracts.ts`,
`questionBuilder.ts` and the matching `recipes.ts` example for implementation.
Use the current repository when an exported snapshot disagrees with live code.

Inherit shared typography, supporting copy, legends, controls, feedback headings,
map roles and scoring. Authors supply meaningful exceptions and the experience;
the agent supplies routine technical details. Keep eligibility, grading, display
geometry and camera framing independent. Flag a genuinely unsupported mechanic
or material departure before substituting a different experience.

## 4. Implement, verify and hand off

Implement the approved spec with the existing authoring builders and grouped
scenes. Preserve save continuity and follow catalog policy for registration.
Review the combined rendered copy and effective scenes for answer leakage,
redundancy and stale objects. Check correct, actual wrong and partial responses
where relevant, plus the final recap.

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

Use focused unit/DOM checks, asset checks and code inspection to establish the
parts they can verify. Follow `AGENTS.md` for a narrowly scoped browser check when
requested or needed to settle a critical rendering/input uncertainty. Distinguish
structural or mocked evidence from actual browser appearance; state what remains
unverified. Do not add a full-suite or full-device-tour requirement to these gates.

Follow repository `AGENTS.md`: focused Journey/behavior checks and TypeScript for
typed changes; CI owns the full-suite/build gate before merge. Use a browser
only when requested or needed to resolve a specific critical rendering/input risk.
Register new content and its route, update the catalog table, and regenerate index
metadata when its inputs change. Run `npm run check:journey -- <id-or-slug>` and
the relevant behavior/catalog checks; test Journey identity by ID.
Report what changed, what was verified and any material limitation. Publish or
deploy only when the user's request authorizes it. Refresh the portable kit after
relevant source or documentation changes with `npm run export:journeys`;
uploaded files do not update themselves.
