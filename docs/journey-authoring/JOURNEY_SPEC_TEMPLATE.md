# Journey specification

Status: draft / approved for implementation
Authoring-kit revision:
Journey being created or edited (title, ID, source file):

## Whole Journey

- **Premise and throughline:**
- **What to preserve in a facelift:**
- **Opening, rhythm and finale:**
- **Continuity / accumulated discoveries:**
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
- **Mechanic:** exact registered mode; count, order, immediate/submit commitment,
  failure behavior. If proposed, mark it as an engine addition.
- **Answer contract:** canonical answers, accepted aliases, eligible candidates,
  distractors and the mistaken reasoning each represents. Identify IDs when known;
  do not invent bundled IDs. State conventions/dates that affect correctness.
- **Pin questions:** point-distance versus territory-inside, acceptance radius,
  inclusive accuracy tiers, feedback and points. Help preserves acceptance.
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

## Completion

- **Payoff and caption:**
- **Map:** regions, stop markers, physical context, labels and color roles.
- **Camera:** static focus / ordered flyover views; no false connecting routes.
- **Media and attribution:**

## Implementation handoff

### Catalog impact

- **Stable Journey ID and added date:**
- **Availability:** `unlisted` by default; explain any decision to enter the `pool`.
- **Assignments and locked dates:** list references to a superseded or removed ID.
- **Save continuity:** preserve started attempts and identify any retirement or recovery change.
- **Verification:** run `npm run check:catalog` for a catalog change; use IDs in tests.

- **Approved scope / material decisions:**
- **Existing mechanic recipes and examples to consult:**
- **Implementation owners:** contracts/builder for authored content; preparation
  for canonical answer resolution; evaluation for grading. List engine changes only
  when required; presentation and camera edits do not change answer acceptance.
- **Affected Journey registration / metadata:**
- **Save strategy:** edit current Journey; identify changes to answer contracts and
  required save-revision handling. Preserve completed receipts as agreed.
- **Focused verification:** Journey audit, relevant behavior checks and TypeScript.
  Browser testing only for a specific unresolved rendering/input risk.
- **Deployment:** not authorized unless separately requested.
