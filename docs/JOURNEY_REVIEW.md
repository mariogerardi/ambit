# Journey review and retained rotation

Owner decisions recorded October 10, 2026. These replace the preliminary review.
The active daily rotation now contains **nine concepts**. Six packs are scrapped
from that rotation; their definitions remain loadable for existing saves and
source material. The four-letter idea from Journey 1 can be reused later.

## Editorial decisions

| #   | Journey                  | Decision                            | Next work                                                                                                                       |
| --- | ------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The long way home        | Scrap                               | Save the four-letter idea for another daily.                                                                                    |
| 2   | Beyond borders           | Rework                              | Keep questions 1–4. Connect the Canadian flag/languages pair to the Andes and latitude questions; replace the finale if needed. |
| 3   | Across the Silk Roads    | Scrap                               | Remove from the active daily rotation.                                                                                          |
| 4   | Around the Mediterranean | Rework                              | Keep the challenge; establish a journey around the sea in the introduction and feedback.                                        |
| 5   | North America by name    | Rework, lighter edition implemented | Ask for one Canadian territory and one U.S. state bordering Mexico. Make the north-to-south-to-east route explicit.             |
| 6   | Worlds within worlds     | Scrap                               | Too demanding as a daily pack.                                                                                                  |
| 7   | Borrowed names           | Scrap                               | Remove from the active daily rotation.                                                                                          |
| 8   | Pins and cities          | Scrap                               | Remove from the active daily rotation.                                                                                          |
| 9   | Shared neighbors         | Keep                                | Preserve all five pins: deducing a country does not make its irregular footprint or location easy to pin. This is the premise.  |
| 10  | Around the Ring of Fire  | Rework                              | Keep the questions; make the Pacific itinerary clearer.                                                                         |
| 11  | Not the obvious city     | Keep, strengthen thread             | Preserve the challenge; frame each stop as a reason the familiar city is not the capital.                                       |
| 12  | Exceptions to the rule   | Rework                              | Preserve the individual questions; connect the exceptions into one developing idea.                                             |
| 13  | The Z trail              | Scrap                               | Remove from the active daily rotation.                                                                                          |
| 14  | Island instincts         | Keep                                | Preserve the repeated ownership-versus-location quirk. Mechanic repetition is intentional.                                      |
| 15  | On Russia's doorstep     | Keep                                | Preserve the borderless pin challenge and current difficulty.                                                                   |

## Crafting principles for this pass

A throughline can be a geographic itinerary, a shared surprise, or one distinctive
mechanic used five times. Variety is not a requirement. Repeated mechanics work
when each stop develops the premise: unfamiliar outlines in Shared neighbors,
misleading island locations in Island instincts, and borderless placement around
Russia in On Russia's doorstep.

Copy should establish that premise before play and reinforce it in the reveals.
A generic regional title does not by itself connect five unrelated questions.
Keep worthwhile difficulty; reduce response burden where specifically requested.
Do not replace favorite questions merely to manufacture a more uniform pack.

The maintained repository guide is [Question catalog and authoring](QUESTION_CATALOG.md).
No separate Journey crafting guide was present in the repository during this pass.

## Changes already implemented

The Mediterranean, Ring of Fire, Not the obvious city, and Exceptions introductions
now state their intended connection more clearly. Their questions remain intact;
the deeper feedback and finale work below is still for discussion.

North America has a new `north-america-v2` edition. Question 1 accepts any one
Canadian territory. Question 3 accepts any one U.S. state bordering Mexico,
including postal abbreviations. Its introduction explains the geographic route.
The v1 edition and original round IDs remain readable for saved results.

Question information lives in a question-mark button in the top-right question
row. Sources expand inside its popover; reporting opens the existing feedback
form. Study's cog retains session actions, not question reporting.

Daily selection uses the explicit retained-ID list in
[`journeyRotation.ts`](../src/game/journeyRotation.ts), independently of the complete
loadable archive. Existing attempts stay pinned to their edition. New selections
repeat the nine retained packs by local calendar date from October 5, 2026;
reshuffling dates was explicitly accepted. Adding archived editions no longer
changes the active rotation. Admin's local override remains device-specific.

## Salvage proposals to discuss

- **Beyond borders:** the first pair already connects national identity and
  language. The Andes and latitude questions can develop borders that cross
  landscapes and assumptions, but that may still be too broad. First write a
  one-sentence premise that genuinely explains all four; then choose a fifth
  question that pays it off. Avoid a title-only repair.
- **Mediterranean:** frame a trip between the shores of one sea: Spain's regional
  languages, an Italian island, Libya's capital, former Yugoslav republics, then
  a coastline count bringing the whole sea together. The descriptions and reveals
  should carry the itinerary without adding hint-heavy instructions.
- **Ring of Fire:** Japan → its northern island → Indonesia → the Pacific-facing
  Andes → New Zealand. Tie each reveal to the Pacific rim; don't imply every
  question is asking about volcanoes.
- **Not the obvious city:** Ankara, Canberra, Abuja, Brasília, then South Africa's
  split capitals. Develop the reasons capitals depart from expectations, with the
  last question challenging the assumption that there must be just one.
- **Exceptions:** longest-border intuition → landlocked neighbors → hemispheres
  → a lost coastline → a capital below sea level. A possible premise is “five ways
  a familiar map rule breaks.” Needs an introduction and a deliberate final reveal,
  not a claim that the questions form a continuous physical itinerary.

These are directions, not implemented question replacements or a fresh fact check.

## Daily publication proposal

The nine-pack cycle is usable for friends now after deployment, but repeats every
nine days. Before advertising a permanent daily, polish the retained packs and
add enough new five-question Journeys for a 14-day opening run. Keep the four
mechanic-led packs intact and alternate them with itineraries and surprise packs.

Publish an explicit date-to-edition calendar for that opening run. Keep one scored
attempt, five questions, score out of five, and completion-gated friend totals.
Admin overrides only affect the current device and should not be used to publish a
shared daily. Decide together whether reset stays at local midnight or becomes a
single worldwide reset before promising synchronized launch times.

Three possible new directions: follow one river through five discoveries; use
five counterintuitive latitude/distance comparisons; or return to four-letter
places with a simpler unifying mechanic. Draft and verify each pack together
before implementation.

Friends currently exposes completion and total scores, not per-question outcomes.
The five-row recap would need outcome-only data gated on accepted friendship and
both players finishing the same date and edition; guesses should remain private.
Competitive minigames will need authoritative scoring beyond today's client-graded
synced saves.
