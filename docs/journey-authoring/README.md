# Journey authoring: start here

Use this entry point when designing Journeys with ChatGPT and handing an approved
spec to Codex. Read the repository directly when available; exporting files is an
optional fallback. Ambit's sole human maintainer is the user. AI supplies the
research, copy and routine implementation choices; handoffs go to the user.

## Start a conversation

Give ChatGPT the repository and this path. A reusable starting prompt is:

> Read `docs/journey-authoring/README.md` in `mariogerardi/ambit` on `main`
> through GitHub. Follow its design workflow for this Journey idea: [idea].
> Read only relevant references and examples. Author the copy and produce a
> spec I can bring to Codex. Inherit shared defaults and flag only material
> open decisions or engine additions. Record the repository revision used.

Replace `main` with a published branch or commit when using work that has not
merged. Confirm the requested files/ref can actually be read. A search result,
repository URL or remembered conversation is not evidence that a file was read.
If the available tool cannot select or identify a revision, say so and record
the available branch/date instead; do not claim an exact revision was inspected.
Ask for missing access only when it blocks meaningful progress.

GitHub cannot expose unpushed local commits or uncommitted files. An accessible
repository is not necessarily the same checkout Codex is working in. Do not
switch silently to another branch or claim local checks from repository reading.

## ChatGPT: design and write the spec

1. Read [project instructions](PROJECT_INSTRUCTIONS.md),
   [shared defaults](JOURNEY_DEFAULTS.md) and the relevant sections of
   [Crafting](../JOURNEY_CRAFTING.md). Start with sections 1–3 for a new idea;
   consult help, reveal and completion sections as the design needs them.
2. Use [archetypes](JOURNEY_ARCHETYPES.md) and the
   [bundled catalog](../QUESTION_CATALOG.md#bundled-journeys) to locate the closest
   relevant Journey. Inspect its `src/game/*Journey.ts` definition and matching
   example in `src/game/recipes.ts` (construction examples may live in
   `src/game/constructionRecipes.ts`). Read one or two useful examples, not the whole suite.
3. Establish the premise and compact five-stop outline. AI supplies playable
   clues, player-facing copy, plausible alternatives, help and meaningful reveals.
   Research new factual claims and media provenance; mark material uncertainties.
4. Compare the intended experience with actual contracts: eligibility, valid
   alternatives, disclosure, help, reveal, camera endpoints and completion.
   [Engine](../JOURNEY_ENGINE.md) explains the boundaries; `src/game/mechanics.ts` and the
   recipe establish implemented support. A supported control does not prove every
   proposed combination works. Inherit defaults; specify only relevant exceptions.
5. Deliver one self-contained Markdown spec based on the
   [spec template](JOURNEY_SPEC_TEMPLATE.md). Retain settled decisions, acceptance
   rules, final copy, source URLs and material implementation differences. Include
   inspected paths/recipe IDs and revision when known. Ask the user to settle
   creative choices, not write routine copy or fill technical fields.

With repository-reading access only, do not ask the user to run setup or export
commands just to design a Journey. Generated `CAPABILITIES.*`, `GPT_GUIDE.md` and
`AUTHORING_KIT.md` live in ignored `artifacts/`; they are not committed source
files. Read the relevant recipe directly. Leave execution-dependent evidence or
novel feasibility questions for Codex and label them as unverified.
Do not fetch large geography assets merely to understand a mechanic; canonical
geometry/data validation belongs to implementation when needed.

## Handoff to the user, then Codex

The spec is the handoff artifact; the user can paste or attach it in Codex. A
downloadable file is convenient, not a reason to export the repository. Include:

- **Status and basis:** draft or approved, repository/ref/revision actually read,
  and any material access or evidence limitation.
- **Settled experience:** five stops, authored copy, answer acceptance, help,
  reveals, completion and deliberate departures from shared defaults.
- **Implementation fit:** relevant source/recipe references, authored data/assets,
  and genuinely new engineering or unresolved decisions. Group repeated mechanics.
- **Release scope:** registration authorized or deferred; publishing, pushing and
  deploying remain governed by the user's request.

Codex follows [Implementing a spec](IMPLEMENTING_A_SPEC.md) and repository
[AGENTS.md](../../AGENTS.md), checks the actual working revision and preserves
approved creative decisions. Recheck only relevant capability differences if the
repository has changed; do not restart the design. Complete implementation and
focused checks, then hand the result and review link directly to the user.
Reading source, running mocked tests and verifying real rendering are distinct
forms of evidence; report only what was actually established.

## Which document owns what?

| Source                                        | Responsibility                                                         |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| This page                                     | GitHub-first reading order and ChatGPT → user → Codex handoff.         |
| `PROJECT_INSTRUCTIONS.md`                     | Shared AI working instructions for repository and optional export use. |
| `JOURNEY_CRAFTING.md`                         | Editorial and player-experience standards.                             |
| `JOURNEY_DEFAULTS.md`                         | Inherited shared behavior and meaningful exception boundaries.         |
| `JOURNEY_ARCHETYPES.md`, catalog              | Finding relevant structures and current Journeys.                      |
| `JOURNEY_ENGINE.md`, current code/recipes     | Supported contracts, compositions and implementation boundaries.       |
| `JOURNEY_SPEC_TEMPLATE.md`, the approved spec | Recording and preserving the chosen design.                            |
| `IMPLEMENTING_A_SPEC.md`, `AGENTS.md`         | Local implementation, focused verification and handoff.                |

Do not treat historical review notes or individual examples as newer standards.
Code establishes implemented behavior when a summary disagrees; flag material
differences without silently replacing an approved task.

## Optional offline or uploaded context

If repository access is unavailable or a frozen local snapshot is specifically
useful, use the [portable kit](../JOURNEY_AUTHORING_KIT.md). The exporter remains
supported, but exporting, refreshing or uploading it is not a normal prerequisite
for GitHub-first authoring. Do not maintain a second set of hand-edited standards
inside generated files.
