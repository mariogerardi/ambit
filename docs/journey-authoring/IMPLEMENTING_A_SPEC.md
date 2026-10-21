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

Follow repository `AGENTS.md`: focused Journey/behavior checks and TypeScript for
typed changes; CI owns the full-suite/build gate before merge. Use a browser
only when requested or needed to resolve a specific critical rendering/input risk.
Report what changed, what was verified and any material limitation. Publish or
deploy only when the user's request authorizes it. Refresh the portable kit after
relevant source or documentation changes; uploaded files do not update themselves.
