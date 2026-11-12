# Say Where? — minigame

Status: local implementation on `feat/say-where`; not pushed or deployed.

## Player experience

Read an idiom or saying in its original script. Select any one qualifying
sovereign country on the globe, then Check answer. Selection remains editable
until submission. Language names, English translations, accepted-country lists
and source labels appear only on reveal. The demo reveal places the language just
above the native expression and a small italic literal gloss just below it.
In-game reveals group “Literal translation” and “Meaning” beneath the expression;
the meaning is not a separate sentence in answer feedback. The information icon
beside the game menu holds the general qualification rule throughout play; after submission it
also holds the current expression’s language notes and all sources. Right-to-left
scripts retain their language/direction metadata through the shared `TextClue`
component.

Each correct round earns one correct answer. Three misses end the run after its
last reveal; Finish game ends early. Resume, replay, independent account-scoped
local saves, high scores, result sharing and the persistent globe reuse the
existing minigame shell. No hints, timers or border-game customization are added.
Language mistakes do not create misleading country-location Study exercises.

The deck visits every language once per seeded cycle and rotates through that
language's expressions on later cycles. The current entry orientation is retained
and pulled back to the normal globe view before rotation. Picking pauses motion;
reveal tours the accepted countries in regional groups, including after a miss.
The submitted country remains marked without controlling the reveal camera.
The full qualifying network is visible after submission; an actual correct
selection receives its correct color. Completion retains actual selections/misses
and one illustrative
solution after a miss, not every explanatory country as a discovery. Reduced
motion uses the shared static framing and manual demo controls.

## Content and approved acceptance policy

The expanded supplied ZIP contains 27 languages, 108 expressions and country-level
evidence. Its four files are preserved byte-for-byte in `sources/say-where/`,
including all original uncertainty flags. The original phrasebook edition is
recoverable at the revision recorded in `metadata.json`; v1 holds applied to
different wording and do not carry over merely because an ID was reused. The user
approved integrating the full expanded collection with targeted status checks.
`src/minigames/sayWhere.ts` and `eligibility-review.json` keep acceptance decisions
separate from the original research flags.

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
- Five reviewed Malay/Indonesian shared proverbs (`sw-id-01` through `sw-id-04`
  and `sw-ms-02`) accept Malaysia, Brunei, Singapore and Indonesia. New
  dictionary, library and linguistic-research evidence supports the related
  forms; old phrasebook-specific source links are not reused.
- Italian includes Vatican City (`wurl:VAT`), with working-language status
  distinguished from Latin in the Holy See. Existing small-country picking applies.
- The handoff's sovereign-country pilot excludes constituent/dependent territories
  and regional-only recognition. No automatic UN-roster filtering replaces it.

The current live pool contains **all 108 expressions across all 27 languages**,
as requested. Supplied country lists are starting answer sets, with reviewed
adjustments recorded separately in `eligibility-review.json`. French additionally
accepts Mali, Burkina Faso and Niger through designated working-language status,
and Mauritius through constitutionally authorized parliamentary use. Flagged
Spanish, German, Swedish and Czech status cases remain eligible under the
existing government-use rule, supported by the linked national authorities.
Other wording/meaning and cross-language uncertainties are recorded, not treated
as resolved by importing the dataset.
Full follow-up evidence is in [the research review](../../sources/say-where/REVIEW.md).
Native/fluent-speaker review is not claimed; original review flags remain intact.

## Integration and verification

`SayWherePair` carries the expression, accepted country IDs and reveal sources.
The existing minigame controller adds editable `map-single` submission. A seeded
language deck supplies balanced cycles; saved-run signatures include the expression
text fingerprint and full accepted network. Country IDs are checked through the
canonical question context. Country display geometry never changes grading.

The fifth menu card and four evaluated demo examples use the shared tour. Demo
framing briefly focuses a representative region containing accepted countries;
this is demonstration-only, and live play keeps its neutral whole-globe entry.
The demo moves directly from question to full answer, skipping the intermediate
selection phase. The expression appears above the instruction; the reveal
replaces the instruction with its literal translation and language. Resuming a
paused tour rejoins the example
nearest the current globe orientation. The game roster scrolls horizontally inside
the panel width, with smooth navigation, a hidden native scrollbar and edge fades
only where more tabs are offscreen. Reduced motion uses immediate scrolling.
Starting a game commits its run and navigation in the same React transition so
the departing menu does not flash Resume game. Expressions use unboxed typography
with room to wrap; mobile caption space follows longer content. Country
feedback is generated dynamically with natural list punctuation. A new SVG result
illustration is rendered through all four existing theme palettes. The score/save
namespace
is `say-where`, with scoring policy version `v1`. No backend, Journey catalog or
Daily assignment changes are required.

Focused verification covers linked research, all accepted countries,
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
