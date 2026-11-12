# Say Where? — initial minigame

Status: local implementation on `feat/say-where`; not pushed or deployed.

## Player experience

Read a short expression in its original script. Select any one qualifying
sovereign country on the globe, then Check answer. Selection remains editable
until submission. Language names, English translations, accepted-country lists
and source labels appear only on reveal. Right-to-left scripts retain their
language/direction metadata through the shared `TextClue` component.

Each correct round earns one correct answer. Three misses end the run after its
last reveal; Finish game ends early. Resume, replay, independent account-scoped
local saves, high scores, result sharing and the persistent globe reuse the
existing minigame shell. No hints, timers or border-game customization are added.
Language mistakes do not create misleading country-location Study exercises.

The deck visits every language once per seeded cycle and rotates through that
language's expressions on later cycles. The current entry orientation is retained
and pulled back to the normal globe view before rotation. Picking pauses motion;
reveal frames the actual submitted country, including a miss. The full qualifying
network is visible after submission; an actual correct selection receives its
correct color. Completion retains actual selections/misses and one illustrative
solution after a miss, not every explanatory country as a discovery. Reduced
motion uses the shared static framing and manual demo controls.

## Content and approved acceptance policy

The supplied ZIP contains 17 languages, 51 expressions and country-level evidence.
Its three files are preserved byte-for-byte in `sources/say-where/`, including
all original uncertainty flags. They are research records, not an automatically
approved answer key. `src/minigames/sayWhere.ts` supplies reviewed acceptance
changes and explicit holds separately.

On November 11, 2026 the user approved national official/co-official status or
explicitly authorized national government use, including constitutionally
designated national languages where legislation establishes their use in national
government functions. National recognition or widespread spoken use alone is
insufficient. The user requested research into broader country sets before
including disputed varieties/shared expressions.

- Vietnamese qualifies in Vietnam through constitutional national-language status
  and Article 7(1) of Law 64/2025/QH15, prescribing Vietnamese in legal normative
  documents. This does not automatically qualify every national language.
- Russian in Kazakhstan qualifies through Article 9(2) of its 2026 constitution;
  Dutch in Belgium qualifies through national co-officiality with territorial use.
- Hindi accepts India and Fiji. Fiji's government explicitly identifies Hindi as
  official; the standard Hindi samples do not assert identical everyday Fiji Hindi.
- Persian accepts Iran, Afghanistan and Tajikistan under an explicitly disclosed
  broad Persian-varieties policy. University of Chicago describes Iranian, Afghan
  and Tajik national varieties; national official-status evidence is retained.
  An Iranian colloquial sample is not claimed to be the usual wording everywhere.
- `sw-id-02` and `sw-id-03` accept the union of Malay and Indonesian countries:
  Malaysia, Brunei, Singapore and Indonesia. Malaysian primary usage attests the
  shared strings alongside their supplied Indonesian phrase source.
- Italian includes Vatican City (`wurl:VAT`), with working-language status
  distinguished from Latin in the Holy See. Existing small-country picking applies.
- The handoff's sovereign-country pilot excludes constituent/dependent territories
  and regional-only recognition. No automatic UN-roster filtering replaces it.

The initial live pool contains **48 expressions across all 17 languages**. Three
original candidates remain on hold: `sw-ms-01`, `sw-id-01` (unresolved cross-language
applicability), and `sw-hi-01` (Sanskrit-derived wording also requiring Nepali
acceptance research). Nothing is invented or silently rewritten to fill these gaps.
Full follow-up evidence is in [the research review](../../sources/say-where/REVIEW.md).
Native/fluent-speaker review is not claimed; original review flags remain intact.

## Integration and verification

`SayWherePair` carries the expression, accepted country IDs and reveal sources.
The existing minigame controller adds editable `map-single` submission. A seeded
language deck supplies balanced cycles; saved-run signatures include the expression
text fingerprint and full accepted network. Country IDs are checked through the
canonical question context. Country display geometry never changes grading.

The fifth menu card and four evaluated demo examples use the shared tour. Demo
question framing is independent of the answer. A new SVG result illustration is
rendered through all four existing theme palettes. The new score/save namespace
is `say-where`, with scoring policy version `v1`. No backend, Journey catalog or
Daily assignment changes are required.

Focused verification covers linked research, holds, all accepted countries,
shared-language unions, deterministic balanced decks, disclosure, RTL metadata,
editable submission, three strikes, save isolation, reload/resume, replay, actual
misses in completion and shared-game compatibility. Verification results and any
rendering limitations belong in the implementation handoff; DOM/mocked globe
checks do not establish actual GPU appearance.

Initial implementation checks passed: the Say Where? data/engine and DOM shell
cases, shared minigame grading/save/review/settings/high-score compatibility,
menu demo/tour checks, and all four themed sharing assets. TypeScript `--noEmit`
and `git diff --check` passed. The existing dev server serves the new local route.
No actual browser/WebGL or mobile rendering verification was performed; the shell
checks use the mocked globe. No push, merge or deployment was performed.
