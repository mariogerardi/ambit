# Portable Journey authoring kit

Use the exporter to give ChatGPT or another AI current Journey context without
asking it to explore the whole repository. It makes ordinary Markdown files using
local code and docs; it does not call an AI, download data, change Journey content,
start a browser or deploy anything.

```sh
npm run export:journeys
```

The output is `artifacts/journey-authoring-kit/`, which is ignored by Git.

## Start small, then consult relevant references

| Export                     | Purpose                                                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AUTHORING_KIT.md`         | Game overview, editorial sections copied from the crafting guide, generated mechanic capabilities, semantic map colors and all current Journey references.                     |
| `PROJECT_INSTRUCTIONS.md`  | Instructions to paste into a ChatGPT Project or other AI workspace.                                                                                                            |
| `JOURNEY_SPEC_TEMPLATE.md` | Record the approved design for implementation, including scenes, help, answer contracts, completion and sources.                                                               |
| `FEATURED_EXAMPLES.md`     | One upload containing the preferred examples: Andes, Chasing the sun (flags), Mediterranean and Not the obvious city.                                                          |
| `examples/*.md`            | Every current Journey individually, including copy, rules, candidates, help, effective stage changes, sources, media descriptions and completion. Load only relevant examples. |
| `references/*.md`          | Full crafting guide, engine, architecture, question catalog and geographic policy. Consult as needed rather than loading all at once.                                          |
| `manifest.json`            | Repository revision, local-change indicator, highlighted IDs, and SHA-256 hashes/sizes of inputs and outputs.                                                                  |

Create one conversation per Journey. Start with the authoring kit, add relevant
examples, and keep settled decisions in the specification rather than relying on
conversation history. Give the approved specification to a coding agent with
access to the current repository.

The crafting guide owns authoring standards; the catalog/engine references explain
supported APIs, and the specification records the design. Generated capability
metadata can include compatibility/internal behavior that is not the recommended
standard. Historical review notes are not exported as current policy.

The highlights identify our most complete experiences, not a compulsory template.
The 17 current Journeys are the reviewed reference set for new authoring; the
four highlighted examples are convenient starting points. Preserve their
established contracts and styles when proposing new content. Fresh local changes
still need player review; neither a source snapshot nor automated checks certify
every rendered view. Proposed point scoring is separate product work and is not
part of the current one-correct-answer scoring contract.
The kit encourages consulting other Journeys for repeated mechanics, different
structures and unusual geography. Edit
[`scripts/journey-export.config.json`](../scripts/journey-export.config.json) to
maintain the preferred examples and their reasons. For a one-off selection:

```sh
npm run export:journeys -- --highlight along-the-andes --highlight down-the-danube
```

## Fresh architecture review

```sh
npm run export:journeys -- --include-code
```

This adds `SOURCE_REVIEW.md`, containing fresh `App.tsx`, `GameShell.tsx`,
`AnswerForm.tsx`, `questions.ts`, its separate contracts/preparation/evaluation
modules, `questionBuilder.ts` and `GlobeView.tsx`.
It also includes the app's extracted Journey/geography loading, player-progress,
Study presentation, camera orchestration and Home-panel modules, so reviewing the shell does not hide
its delegated behavior.
The `code/` tree includes those files, engine/scene/help/control references,
the app's Journey/geography loading, player-progress, Study presentation and camera hooks,
executable recipes and all current Journey definitions. It also includes response
identity/review, pin-band and palette helpers, territory-anchor/symbol fitting,
region interaction and overlay owners, so the visual grammar is reviewable. `questionSeeds.ts` no
longer exists; presentation presets and explicit contracts are the current pattern.
The source review is intentionally separate from the compact editorial kit.

Copied source files are review material, not a standalone runnable repository.
Dependencies, binary media, screenshots and large data files are not exported.
Copied documentation retains repository-relative source links; use those paths
to find implementation references or the original repository. Structural scene
snapshots use engine functions but do not render the globe or fully simulate
typed/pin responses, prior-round choices, actual wrong selections, completed
recaps or label collisions. Examples show authored completion configuration, not a
simulation of its merged discoveries/mistakes. Marker sizes are authored maxima;
projected territory symbols may shrink or hide in the actual view. Geometry summaries
must never be used to reconstruct grading boundaries. Source metadata records
earlier review; the exporter does not independently verify facts.

## Refresh and verify

Re-run after relevant code or documentation changes. Check `manifest.json` for
`generatedAt`, the repository revision, local-change indicator and source hashes;
a copied or uploaded kit does not update when this repository changes. Palette
values are generated from `playColors(theme)` for every current theme; candidate
appearance is distinct from canonical input eligibility. The exporter fails on a
stale Journey index, unknown highlighted Journey, missing source/recipe or a new
mechanic without an author-facing description. If requested, update the index
using `npm run prepare:journeys`, then retry. It never regenerates source data itself.

`--out artifacts/<directory>` selects a different output folder. The exporter
refreshes only files owned by a previous export, removes stale owned files and
refuses to overwrite unrelated files or follow output symlinks. Artifacts are local
snapshots; commit the exporter and maintained docs rather than its generated output.

## What to upload after a refresh

Replace the previous uploaded copies of `AUTHORING_KIT.md` and
`FEATURED_EXAMPLES.md` with the new files. Paste the refreshed
`PROJECT_INSTRUCTIONS.md` into the project's instructions. Keep
`JOURNEY_SPEC_TEMPLATE.md` available for recording approved designs, and add
individual `examples/*.md` or references only when relevant. `SOURCE_REVIEW.md`
is optional for engine/architecture work; ordinary puzzle design does not need it.
The folder includes all current examples so you can consult more than the highlights.

Run the scoped exporter checks with:

```sh
npm run test:journey-export
```
