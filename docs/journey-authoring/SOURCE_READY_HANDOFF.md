# Implementation-ready Journey handoff

After the design is settled, ChatGPT supplies a short brief and a draft Journey
module using the existing repository contracts. This moves content/code authoring
into the design conversation; Codex integrates and validates it. There is no new
JSON schema, importer or second authoring language.

## Deliver two artifacts

1. **Brief:** use `JOURNEY_SPEC_TEMPLATE.md` for the premise, five-stop outline,
   approved acceptance exceptions, source basis, relevant recipes, material gaps
   and release scope. Reference the module for detailed copy and configuration;
   do not duplicate every string and field in prose.
2. **Module:** provide `<name>Journey.ts`, intended for `src/game/`, exporting one
   typed `Journey` with five `defineQuestion` rounds. Supply all ordinary content
   and configuration. If separate attachments are unavailable, include the module
   in one clearly labeled TypeScript fence in the brief, with its intended path.

The user can bring these directly to Codex. Approval of the experience does not
certify the generated code; a technical mistake is not permission to redesign the
Journey. No extra user code-review or copywriting step is required.

## Read the exact target before generating

Read the relevant current `src/game/questionContracts.ts` types (`Journey`,
`AuthoredQuestion`, the chosen rule), `questionBuilder.ts`, and the matching
recipe in `recipes.ts` or `constructionRecipes.ts`. Use the closest existing
Journey for file/import conventions. Read `scenes.ts` only for scene details the
example does not establish. Keep the repository/ref/revision actually inspected
in the brief; do not assume an uploaded example or remembered API is current.
Repository reading is enough to author a proposed module; do not request local
setup to generate it. If neither live source nor supplied context establishes
the necessary contracts, deliver the usable brief and disclose that limitation
instead of inventing code or making the user author it.

Reuse `defineQuestion`, `definePresentation` for shared presentation, and grouped
scenes. Ordinary presentation follows `JOURNEY_DEFAULTS.md`. Imports and fields
must exist in the inspected source; do not invent a mode, helper or option to
make the draft look complete. Do not add React components, CSS or engine changes
inside the content module.

## Populate the existing fields

This is a content checklist, not a replacement schema. Current TypeScript types
and the selected recipe determine the exact required fields and variants.

| Content                         | Put it in the module                                                                                                                                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Journey identity                | Exported `Journey`: `id`, `title`, `description`, `rounds`; use inspected metadata conventions. New drafts use `dailyEligible: false`. Preserve existing identities/revisions when editing.          |
| Round identity and presentation | `id`, `title`, spoiler-safe progress/resolved labels when useful, and shared `label`, `topic`, disclosure/map settings through `definePresentation`.                                                 |
| Player action and grading       | Exact existing `mode`, `count`, `commitment`, `selection`, `allowTyping` and `rule` variant. Include all qualifying alternatives, coordinates, tolerances and inclusive bands required by that rule. |
| Final copy                      | Optional meaningful `leadIn`, `prompt`, necessary `instruction`, `explanation`, feedback overrides only when needed, and readable acceptance qualifications.                                         |
| Help                            | `guidance.hint`, `guidance.assist.text` and the recipe's supported references, candidates or locks. Keep the canonical rule unchanged.                                                               |
| Geography and media             | Canonical IDs/place records, existing overlays/features/media, and grouped `scenes.play`, `scenes.assist`, `scenes.reveal` as appropriate. Keep eligible inputs separate from explanatory geography. |
| Native text or special clues    | Existing clue contracts such as `textClue`, with actual Unicode, language/direction metadata and reveal-only translation. Use only the contracts the composition needs.                              |
| Evidence                        | Actual `source`/`sources` records and qualifications; use real URLs and genuine review dates. Keep longer provenance notes in the brief or a companion source note.                                  |
| Completion                      | Geographic payoff/caption and the existing `completion` contract: focus, views, recap mode, retained objects and meaningful camera exceptions. Inherit result headings and controls.                 |

Use canonical identities found in inspected sources; plausible country/place names
are not proof of supported IDs. Research factual acceptance independently of code.
Mark unverified coordinates, aliases, IDs, assets or factual claims in the brief
so Codex can resolve them without re-deriving the whole design. Do not manufacture
citations or dates, embed large geometry payloads, or claim absent media exists.
New asset paths and required preparation must be explicit implementation notes.

For a supported composition, provide the whole module rather than ellipses,
“repeat for other rounds,” empty help, TODO content or type-check suppressions.
When an approved stop needs unsupported behavior, preserve it in the brief and
describe the smallest proposed extension. Supply supported portions honestly as
a partial draft if useful; label completeness accurately. Do not substitute an
easier task, guess grading geometry or invent an API to fill that gap.

## Codex: integrate and validate, preserving the design

- Read the brief and supplied module together. Approved creative decisions govern;
  generated TypeScript is a proposed implementation. Use judgment checkpoints
  for material conflicts; repair ordinary technical errors autonomously.
- Inspect relevant imports/contracts and identified gaps. Adapt the supplied
  module to current source instead of regenerating it from the prose or surveying
  the catalog again. Recheck changed dependencies when the source basis differs.
- Place the module at the intended path, confirm canonical identities, resolve
  required data/assets and source gaps, then run TypeScript and focused checks.
  For an unregistered draft, use
  `npm run check:journey -- --module src/game/<name>Journey.ts` and review at
  `/review/journeys.html?module=<name>Journey.ts`.
- Follow `IMPLEMENTING_A_SPEC.md` for grading/disclosure/save risks, registration
  and handoff. Source generation does not establish compile, audit or visual
  success. Report what actually ran and any material remaining limitation.

Registration and release still follow the user's authorization. A draft module
does not authorize catalog activation, a push or deployment. Do not register
temporarily just to preview it.
