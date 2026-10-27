# Journey specification

**Status:** draft / approved for implementation\
**Journey:** title; ID and source file if known\
**Authoring basis:** live repository revision, or exported-kit revision/date and known limitations\
**Registration:** defer / authorize (see Catalog impact)

Specify the **approved player experience**. Do not replicate the engine's
implementation guide. The implementing agent resolves routine IDs, types, styles,
files and shared UI conventions from the current repository. Leave irrelevant
fields blank; an approved spec need not fill every template cell. Use
`IMPLEMENTING_A_SPEC.md` for the coding handoff.

**Decision status:** Approved player-facing tasks, clues, assistance, reveals,
scoring exceptions and explicit exclusions are **locked**. Distinguish **verified**
engine behavior (checked against current source), **proposed** technical designs,
**to verify** claims based on an older kit or uncertain implementation, and
**open** material decisions. Label uncertainties where they matter, not every
routine detail. Do not reopen locked creative decisions without a material reason.

## Whole Journey

- **Premise and throughline:** What connects all five stops and what will the player discover?
- **Opening, rhythm and finale:** Route, repeated mechanic or varied interactions; intentional pacing.
- **Continuity:** What carries forward geographically or conceptually?
- **Preserve when revising:** Existing identity and approved questions; omit for a new Journey.
- **Standards and exceptions:** Follow `JOURNEY_CRAFTING.md`; state intentional departures.
- **Open material decisions:** None, or list only decisions that could change the experience or scope.

| Stop / destination | Task and intended skill | Given / withheld clues | Hint / assist | Reveal / reason to belong |
| ------------------ | ----------------------- | ---------------------- | ------------- | ------------------------- |
| 1                  |                         |                        |               |                           |
| 2                  |                         |                        |               |                           |
| 3                  |                         |                        |               |                           |
| 4                  |                         |                        |               |                           |
| 5                  |                         |                        |               |                           |

### Implementation fit — after approving the outline

Map each distinct interaction to the closest known recipe. For a familiar sequel,
a one-sentence statement that all five reuse the existing mechanic is sufficient.
A portable-kit claim is **to verify** until checked against current code. This is
a lightweight feasibility check, **not** a reason to replace a locked gameplay idea.

| Stop(s) | Existing recipe or proposed interaction | New data/assets | Engine addition | Verified / kit / to verify |
| ------- | --------------------------------------- | --------------- | --------------- | -------------------------- |
|         |                                         |                 |                 |                            |

If a genuinely new interaction could invalidate a major assumption, resolve that
specific feasibility risk before implementing the entire Journey. Skip separate
feasibility work for routine reuse.

## Round specification — repeat for each stop

Be concise with existing mechanics. Expand new or unusual scoring, geography and
presentation only as needed to preserve the intended experience.

- **Identity:** Stable ID when editing, progress label safe from spoilers, and
  resolved receipt label where needed.
- **Copy:** Optional lead-in, one clear prompt, and only exceptional instructions.
  The shared control combines instructions and commitment notices in one 14px
  supporting paragraph and generates distance/slider bullseye text. Do not repeat
  generic controls, accuracy bands or pin-movement instructions. Review combined
  rendered copy; avoid instructions tied to palette shades.
- **Answer action:** What the player does, count/order, immediate versus submit
  commitment, and any early-ending rule. Supply an exact registered mode only if
  verified; otherwise specify the player interaction and mark internal names as
  proposed. Current single-country/merged-territory taps commit immediately;
  pins and multi-answer selections confirm.
- **Answer contract and grading:** Canonical answers, aliases, eligible inputs,
  distractors and their plausible mistakes, tolerances, partial credit, failure
  cases and exceptions. Give IDs when known; do not invent them. State the facts,
  dates, boundary policies or source conventions that affect correctness. Inherit
  standard scoring and help rules unless a departure is explicitly approved.
- **Play scene:** Camera intent (coordinates only if reviewed); reference regions,
  interactable objects, labels, borders, physical features, overlays and media.
  Explicitly identify withheld answers and why the remaining task is fair.
- **Hint:** Exact text and the geographic understanding it provides.
- **Assist:** Exact text, new reference/selection state and the decision that
  remains meaningful after help.
- **Reveal and feedback:** Brief reaction to the earned result, explanatory text,
  answer and actual miss/partial display, camera and what persists afterward.
- **Evidence:** Factual/geometry/media URLs, actual review dates, provenance,
  alt text, licenses and credits. Mark unverified claims.

### Inherited grading conventions

Distance pins need an acceptance radius and three inclusive 3/2/1 bands ending
at that radius; free **Accuracy** information exposes them before submission.
Keep supplied point references outside the acceptance area. Territory-inside
pins use canonical containment, not distance tiers, and earn three points.
Accepted pins still count as one correct answer. Hints cap points at two, assists
at one, using `min` rather than cumulative deductions. The five rounds total
15 points; variable weights and timers require separate design. For an exception,
spell out its boundaries and interaction with help, correctness and saved state.

### Visual contract — detailed only when needed

For a **reused mechanic**, reference its existing recipe and specify only scene
content, intentional deviations, withheld clues, help/reveal differences and
unusual result cases. Do not inventory inherited UI elements.

For a **new or complex interaction**, track meaningful geographic objects/groups
through play, hint, assist, reveal and completion. Display geometry, role,
inspection and answer eligibility are independent; visible does not mean tappable.

| Object / identity | Geometry | Role; inspection / input / none | Play → hint → assist → reveal → completion / removal |
| ----------------- | -------- | ------------------------------- | ---------------------------------------------------- |
|                   |          |                                 |                                                      |

Follow the shared visual semantics: gold for selectable globe land; blue for
reference context and noninteractive area-name/button clues (using
`map.candidateRole: "clue"`, deferred selection feedback and no hover emphasis).
Use shared point styles, area symbols and palettes, not per-Journey color hacks.
Supplied tiny clues may use a play-only locator for an already named place, but
never leak withheld target markers, labels, footprints or coordinates. Preserve
submitted wrong answers and labeled slots. Recap discoveries are purple and actual
mistakes red (mistakes take precedence); pin/city errors grade the location, not
the containing country. Give exceptional overlays, markers and tooltips explicit
removal/restoration points. Illustrative examples do not receive the player's grade.

## Completion

The shared UI supplies the score-dependent heading and point orbs. Author the
Journey-specific geographic payoff rather than a fixed result heading.

- **Payoff and caption:**
- **Map and saved outcomes:** Geographic context, discoveries, actual mistakes,
  relevant labels and deliberate custom scenes.
- **Camera:** Static focus or ordered flyover; no false connecting routes.
- **Media and attribution:**

## Implementation handoff

- **Approved scope:** Locked player decisions and explicit exclusions; the
  approved five-stop outline is authoritative.
- **Technical suggestions:** Relevant examples/recipes and any proposed data,
  rule, input or rendering contract. Validate against the live repository; adapt
  implementation details without quietly changing the experience.
- **Required additions / risks:** The smallest verified engine extension (if any)
  and unresolved material correctness, fairness, data, licensing or compatibility
  issue. Ordinary file/ID choices are delegated to the implementing agent.

### Catalog impact

- **Identity:** Stable Journey ID, added date and route when known.
- **Registration decision:** **Defer / Authorize.** Registered Journeys enter the
  automatic Daily pool; the current engine has **no unlisted status**. If deferred,
  arrange isolated review instead of claiming registration will remain hidden.
  Approval to implement does not itself authorize deployment.
- **Existing dates and saves:** Identify superseded/removed IDs and affected
  assignments. Preserve locked dates, started attempts and completed receipts;
  specify answer-contract revisions, retirement and recovery behavior as needed.
- **Metadata:** Regenerate the index only when its inputs change. Registered
  round catalog entries derive automatically; account for the backend catalog
  when shipping the change.
- **Deployment:** Not authorized unless explicitly requested.

### Verification and handoff

- **Required acceptance:** Record only Journey-specific invariants (e.g., fair
  grading, clue disclosure, genuine wrong/partial states and save restoration).
  Inherit the six acceptance gates in `IMPLEMENTING_A_SPEC.md` rather than copying
  them into this spec.
- **Illustrative cases (optional):** A few scenarios clarifying novel behavior;
  examples are not a requirement to generate a test per case.
- **Focused checks:** `npm run check:journey -- <id-or-slug>`, relevant
  behavior/catalog checks and TypeScript for typed changes. Verify real wrong
  submissions and recap precedence when affected; empty synthetic misses are
  insufficient. CI owns full-suite/build gates. Browser checks only if requested
  or needed for a critical unresolved input/rendering risk; distinguish mocked
  checks from real-browser evidence.
- **Authoring kit:** Refresh after relevant source/docs changes and replace
  uploaded copies; a snapshot is not current source or rendered verification.
- **Handoff report:** What changed, verified results and material limitations.
