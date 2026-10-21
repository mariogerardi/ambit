# Journey specification

Status: draft / approved for implementation
Authoring-kit revision / generated date / local-change indicator:
Journey being created or edited (title, ID, source file):

Record the intended experience and settled decisions. Fill technical identifiers
only when known; the implementing agent resolves routine details from current
examples and shared conventions. Optional blanks do not invalidate an otherwise
approved spec. Use `IMPLEMENTING_A_SPEC.md` for the implementation handoff.

## Whole Journey

- **Premise and throughline:**
- **What to preserve in a facelift:**
- **Opening, rhythm and finale:**
- **Continuity / accumulated discoveries:**
- **Standards:** follow the current crafting guide; label any requested departure
  from current interaction, visual or scoring standards as a design decision.
- **Engine additions required:** none, or explicitly describe them.
- **Unresolved decisions:** none, or list them.

| Stop / destination | Task and intended skill | Given / withheld clues | Hint / assist | Reveal / reason to belong |
| ------------------ | ----------------------- | ---------------------- | ------------- | ------------------------- |
| 1                  |                         |                        |               |                           |
| 2                  |                         |                        |               |                           |
| 3                  |                         |                        |               |                           |
| 4                  |                         |                        |               |                           |
| 5                  |                         |                        |               |                           |

## Round specification — repeat for each of the five rounds

- **Identity:** stable ID when editing, label, spoiler-safe progress label and
  resolved receipt label where needed.
- **Copy:** optional lead-in, prompt, exceptional interaction instruction only.
  Leave the instruction empty if the prompt/control already conveys the action.
  The shared control combines instructions and commitment notices in one 14px
  supporting paragraph. It derives distance/slider bullseye copy from the rule;
  do not repeat notices, band numbers or pin movement instructions. Review the
  complete rendered copy. Do not refer to palette shades such as “darker yellow.”
- **Mechanic:** exact registered mode; count, order, immediate/submit commitment,
  failure behavior. Current single-country/merged-territory taps commit immediately;
  pins and multi-answer selections confirm. Distinguish engine capabilities from
  the authoring standard; identify proposed departures explicitly.
- **Answer contract:** canonical answers, accepted aliases, eligible candidates,
  distractors and the mistaken reasoning each represents. Identify IDs when known;
  do not invent bundled IDs. State conventions/dates that affect correctness.
- **Pin questions:** point-distance versus territory-inside. Distance pins need an
  acceptance radius and three inclusive accuracy bands ending at that radius;
  territory-inside pins use canonical containment without invented distance tiers.
  Choose useful inner radii; the shared bullseye line and free **Accuracy**
  information expose the bands before submission. Keep supplied point
  references outside the acceptance zone. Standard distance tiers earn 3/2/1
  points; accepted pins still count as one correct answer. Territory-inside pins
  earn three points. Hint/assist ceilings are two/one, applied with `min`, not an
  additional deduction. All five questions currently total 15 points; variable
  weights and timers require separate design.
- **Play scene:** camera intent (coordinates only if reviewed), contextual regions,
  selectable objects, labels, borders, overlays, physical features and media.
  State what is deliberately hidden and why the player still has a fair task.
- **Hint:** exact player-facing copy and the new understanding it supplies.
- **Assist:** exact copy, surviving candidates, reference markers/overlays and
  locked selections/slots if applicable. Explain the decision that remains.
- **Reveal:** correct-answer display, explanation, correct/miss differences,
  camera, map roles, borders, flags/images/diagrams, and what persists afterward.
- **Evidence:** factual and geometry source URLs, review date, media alt text,
  provenance and license/credit requirements. Mark unverified claims explicitly.

### Visual contract — repeat for each round

List every meaningful object or equally treated group. Geometry, role and input
are independent; a displayed candidate does not automatically accept a globe tap.
Gold land denotes globe answer choices. Noninteractive name/button area pools use
blue clue styling, `map.candidateRole: "clue"`, deferred selection feedback and no
hover emphasis. Established references remain a separate blue context role.
Use the shared roles, point styles, area symbols and palettes from the crafting
guide rather than prescribing per-question colors or marker sizes.

| Object / stable identity | Geometry / representation   | Role during play                                    | Inspection / answer input / none | Play → hint → assist → reveal → completion |
| ------------------------ | --------------------------- | --------------------------------------------------- | -------------------------------- | ------------------------------------------ |
|                          | area / point / line / label | reference / candidate / open search / withheld clue |                                  |                                            |

- **Given and withheld:** distinguish a reference from the place to be found.
  For tiny supplied clues, specify a play-only locator label already given in the
  prompt, or generic wording if the name is withheld. Use the shared size-based
  pulse/callout, never a city marker, owner label or withheld target locator.
  Explain deliberately hidden boundaries/features. Show area-selection outlines;
  do not expose a withheld pin target's footprint or coordinate.
- **Outcome cases:** specify correct, actual wrong, and partial set/assignment
  feedback where supported. Keep matching slot identity. Supporting illustrations
  do not receive the player's grade.
- **Recap:** discoveries become purple; actual mistakes remain red, with mistake
  precedence if the same object is also discovered elsewhere. A city/pin mistake
  grades the location, not its containing country. Custom scenes retain these roles.
- **Lifecycle:** what is removed on reveal, advance, exit, replay and restored draft?
  Avoid stale overlays, markers, tooltips or selections.

## Completion

The closing heading follows earned points and the orbs come from shared UI.
Author the Journey's caption and visual payoff rather than a fixed score headline.

- **Payoff and caption:**
- **Map:** regions, stop markers, physical context, labels and color roles.
- **Camera:** static focus / ordered flyover views; no false connecting routes.
- **Media and attribution:**

## Implementation handoff

### Catalog impact

- **Stable Journey ID and added date:**
- **Availability:** `unlisted` by default; explain any decision to enter the `pool`.
- **Assignments and locked dates:** list references to a superseded or removed ID.
- **Save continuity:** preserve the pinned edition of started attempts; identify
  any answer-contract revision, retirement or recovery handling.
- **Metadata:** regenerate the index only when its inputs change. Round catalog
  entries derive from registered Journeys automatically.

- **Approved scope / material decisions:**
- **Existing mechanic recipes and examples to consult:**
- **Implementation owners:** contracts/builder for authored content; preparation
  for canonical answer resolution; evaluation for grading. List engine changes only
  when required; presentation and camera edits do not change answer acceptance.
- **Affected Journey registration / metadata:**
- **Save strategy:** edit current Journey; identify changes to answer contracts and
  required save-revision handling. Preserve completed receipts as agreed.
- **Focused verification:** Journey audit, relevant behavior checks and TypeScript
  for typed changes. Check actual wrong responses, partial assignments, repeated
  objects and recap precedence when affected; empty synthetic misses are insufficient.
  Run `npm run check:catalog` before pushing catalog changes; test identities by ID.
  Browser testing only when explicitly requested or for a specific unresolved
  rendering/input risk. Record actual versus automated verification separately.
- **Authoring handoff:** refresh the kit after relevant source/docs changes and
  replace uploaded copies. Record remaining limitations; a snapshot is not a live
  repository or proof of rendered quality.
- **Deployment:** not authorized unless separately requested.
