# Journey review for discussion

Reviewed October 10, 2026: all 15 authored Journeys and their 75 questions, plus
daily scheduling, answer handling, result storage and Friends comparisons.
These are editorial recommendations, not approved removals or a fresh geographic
fact check. No Journey content or rotation has been changed in this pass.

## Settle the daily format first

- Five questions with a clear theme or a thread connecting the stops. A daily
  should feel like one small discovery, with a satisfying final question.
- One official attempt per player per published day; normal wrong answers should
  explain and continue through all five questions. Keep practice and admin replays
  separate from the official result.
- Agree on the reset: one worldwide reset gives friends the same daily at the same
  time; local midnight follows the current implementation. This decision must
  also settle the meaning of a day for streaks and archives.
- Score out of five, without time penalties initially. Keep difficulty approachable
  and allow equivalent written answers wherever practical. Decide whether
  precision pin questions belong in the daily or in specialist practice.
- The recap should contain five expandable question rows. Each can show a small
  friends-correct count, with names and outcomes inside the expanded row. Both
  players must finish the same published Journey before comparisons unlock;
  friends' guesses stay private.
- Separate the playable archive from authored source packs. An archive can provide
  past discoveries as practice without creating new official daily scores.

## Preliminary shortlist

“Keep” means retain the concept in the daily shortlist, with normal polishing and
fact verification. “Rework” means preserve useful material but change the pack.
“Move to practice” means remove it from the proposed daily rotation, not delete
the authored questions or existing results.

| Journey                  | Recommendation   | Reason and next edit                                                                                                                                                                                                |
| ------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The long way home        | Keep, polish     | The strongest connected itinerary: Windhoek, border crossings, short names, Lima, then the route home. Simplify the ordered great-circle finale and make its wrong-answer behavior consistent with the other packs. |
| Beyond borders           | Rework           | Strong individual questions, but Canada, the Andes, Amman and Tunis do not yet make a coherent trip. Give it a clearer thread and reconsider the circle-count finale.                                               |
| Across the Silk Roads    | Keep, polish     | A regional story spanning language, borders, a sea, an exclave and capitals. Reduce the burden of the final ordered-capitals response; review adjacency conventions.                                                |
| Around the Mediterranean | Keep, polish     | A recognizable regional theme with varied questions. Explicitly review the sea/coastline counting convention and historical-republic wording before publication.                                                    |
| North America by name    | Rework           | A useful regional pack, but three typed-region questions involve many entries. Keep the latitude surprise; reduce repeated typing and clarify the naming theme.                                                     |
| Worlds within worlds     | Keep             | A strong surrounded/separated-place theme and memorable reveals. Balance the more obscure administrative-region clues with accessible entry questions.                                                              |
| Borrowed names           | Keep, polish     | A distinctive idea connecting distant places. Four single-country selections are repetitive; vary one or two interactions and review namesake wording carefully.                                                    |
| Pins and cities          | Move to practice | Primarily a tour of pin and city-marker mechanics. Preserve it as location practice or onboarding, rather than a featured daily story.                                                                              |
| Shared neighbors         | Rework           | Border deduction is a good premise, but all five questions use the same pin interaction. Keep the best clues, vary the responses and build a progression.                                                           |
| Around the Ring of Fire  | Keep, polish     | Good regional scope and interaction variety. Strengthen the connection to the title so the questions feel like a single Pacific story.                                                                              |
| Not the obvious city     | Keep             | One of the clearest premises, with varied formats and a natural reveal. Revisit pin tolerance and wording around multiple national capitals.                                                                        |
| Exceptions to the rule   | Keep             | The most direct surprise-and-discovery pack. Balance choices against country selections and make every explanation worth reading.                                                                                   |
| The Z trail              | Rework           | A memorable naming hook with varied interactions, but the letter supplies most of the connection. Strengthen the final payoff and reconsider the unusually tight pin tolerance.                                     |
| Island instincts         | Rework           | A strong ownership-versus-location theme. All five questions ask essentially the same thing; keep two or three islands and vary the other stops.                                                                    |
| On Russia's doorstep     | Move to practice | A deliberately demanding, borderless five-pin challenge. Better suited to a specialist pack or later minigame than the general daily audience.                                                                      |

Proposed starting point: **8 core daily concepts, 5 rewrites, 2 practice packs**.
Retain the source material until the replacement questions and archive policy are
approved. Some individual questions from the practice packs could still support
new daily stories.

## Publication constraints found in the implementation

The current daily chooses a pack by local calendar date and modulo the bundled
catalog length. Removing or reordering packs changes which Journey a date selects.
Before pruning the rotation, publish an explicit date-to-Journey schedule and keep
past entries stable. Preserve immutable question IDs and version revised packs
instead of rewriting an already published edition.

The first pack's final question uses `end-game` for an incorrect response; the
other 74 questions use feedback-and-continue. Standardize this deliberately rather
than letting one pack produce different completion semantics.

Pin tolerances vary, and multi-entry/ordered answers can require considerably more
work than one-tap answers even though each question is worth one point. Difficulty
and mobile usability need a shared standard before Friends comparisons become
more competitive.

The current Friends API exposes completion and score totals, not per-question
outcomes. The proposed recap would need a minimal outcome-only API with the same
friendship and completion gates. Competitive results are currently based on synced,
client-graded saves; later ranked minigames should use authoritative scoring.

Some explanations are generated from rules at runtime. Review the final feedback
the player receives, rather than treating an empty authored explanation as proof
that feedback is missing.

## New concepts to develop after the shortlist

1. **A river's journey:** follow one river through five discoveries, using the
   globe to connect its landscape, countries and cities. Adds more physical geography.
2. **Closer than they look:** five counterintuitive latitude or distance clues,
   with clear reference lines and accessible answer formats.
3. **One place, many worlds:** connect a region's language, landscape, borders,
   flag and city through one itinerary. Use an underrepresented region in the
   retained catalog rather than adding another capital-heavy global assortment.

These are concept sketches. Choose regions, verify primary sources, then draft
the five questions and their explanations together before implementing them.

Suggested discussion order: agree on the daily rules, review the eight core packs,
choose which rewrites deserve work, then write three new packs to fill the gaps.
