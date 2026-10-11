# Journey review and retained rotation

Owner decisions recorded October 10–11, 2026. The active daily rotation now
contains **eleven five-question Journeys and 55 questions**. Six original packs
were scrapped; Beyond borders was split into three new packs, and North America
was replaced by its revised edition. All eight obsolete editions have now been
removed from the runtime catalog, Admin, practice routes, and the playground.
Saved attempts and overrides for those editions are discarded without disturbing
retained progress. They cannot be resumed or loaded again.

## Editorial decisions

| #   | Journey                  | Decision and implemented work                                                                                                                                                           |
| --- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The long way home        | Scrap; save the four-letter idea for another daily.                                                                                                                                     |
| 2   | Beyond borders           | Split: Canadian flag/languages seed Beyond the maple leaf; the Andes question seeds Along the Andes; the Amman latitude question seeds Latitude surprises. Each now has five questions. |
| 3   | Across the Silk Roads    | Scrap from daily rotation.                                                                                                                                                              |
| 4   | Around the Mediterranean | Keep the challenge; copy now follows Spain, Italy, Libya, the Adriatic, then the whole sea.                                                                                             |
| 5   | North America by name    | Revised edition asks for one Canadian territory and one U.S. state bordering Mexico. Context connects north, south, a border route, and directional names.                              |
| 6   | Worlds within worlds     | Scrap; too demanding for this daily rotation.                                                                                                                                           |
| 7   | Borrowed names           | Scrap from daily rotation.                                                                                                                                                              |
| 8   | Pins and cities          | Scrap from daily rotation.                                                                                                                                                              |
| 9   | Shared neighbors         | Keep all five pins. The premise explicitly connects deducing countries to the challenge of locating their irregular footprints.                                                         |
| 10  | Around the Ring of Fire  | Keep; copy follows Japan, its northern island, Indonesia, Pacific-facing Andes, and New Zealand.                                                                                        |
| 11  | Not the obvious city     | Keep; each stop develops why the famous city is not the capital, ending with the three-capital exception.                                                                               |
| 12  | Exceptions to the rule   | Keep; context joins five misleading assumptions about borders, landlocked neighbors, hemispheres, a lost coast, and elevation.                                                          |
| 13  | The Z trail              | Scrap from daily rotation.                                                                                                                                                              |
| 14  | Island instincts         | Keep the repeated ownership-versus-location quirk; brief context makes the island hops explicit.                                                                                        |
| 15  | On Russia’s doorstep     | Keep the difficulty and borderless pins; context follows a loop around Russia’s neighbors.                                                                                              |

## The three new drafts

- **Beyond the maple leaf:** Canadian flag → federal official languages → New
  Brunswick’s bilingual status → Ottawa → Arctic Ocean. Familiar national identity
  becomes a geographic trip from the east coast through the federal capital to
  the northern shore.
- **Along the Andes:** choose three Andean countries → Quito → the countries
  sharing Lake Titicaca → Aconcagua’s country → a pin inside Chile. The chain
  carries the player south, across the Altiplano, and onto the Pacific side.
- **Latitude surprises:** African capitals north of Amman → European capitals
  south of Ottawa → Asian capitals north of Rome → South American capitals south
  of Pretoria → Oceanian capitals south of Buenos Aires. Repeated comparisons are
  the premise; each reference line has multiple verified answers in the local
  primary-capital dataset.

New facts have primary-source links and review dates in their definitions.
New Brunswick uses imported province boundaries and reveals the province rather
than highlighting all of Canada. Lake Titicaca now offers six named choices,
requires two selections, and reveals its location after submission.
The existing four seed questions retain their reviewed answer rules. The original
Beyond borders edition has been removed.

## Copy and feedback

All 55 active questions received a copy review. Most itineraries now include a
brief, spoiler-safe `leadIn` above the prompt. The latest pass reduces these to
short directional cues, following On Russia’s doorstep; richer detail belongs in
the reveal. Shared neighbors establishes its
repeated pin challenge in the introduction instead of adding narration to every
stop. Repeated mechanics remain intentional.

Journey feedback uses Study’s answer-card layout and shows only the correct
answer, not the player’s incorrect guess. Successful alternative answers are
shown canonically; misses receive one clearly labelled valid answer or set.
A short explanation follows without opening by repeating that answer. For
example, the Chile reveal explains the lost Bolivian coastline in two sentences.
Shortest-border questions retain one useful route rather than a long recap.

Sources and reporting remain in the question-mark popover. Study’s cog retains
session actions. The maintained crafting guide is
[Question catalog and authoring](QUESTION_CATALOG.md).

## Daily selection and publication

[`journeyRotation.ts`](../src/game/journeyRotation.ts) contains the explicit
retained-ID list, aligned with the complete runtime catalog. New selections repeat
these eleven packs by device-local date from October 5, 2026. Date reshuffling was
explicitly accepted. Retained attempts remain pinned to their saved edition;
admin overrides remain local to the current device.

The cycle is usable for friends after deployment and repeats every eleven days.
An explicit publication calendar, a longer opening run, and a synchronized global
reset remain future decisions. Current behavior still uses local midnight, one
scored attempt, five questions, score out of five, and completion-gated friend
totals. Do not describe the local admin override as shared publication.

Friends currently exposes completion and total scores, not per-question outcomes.
The five-row recap would need outcome-only data gated on accepted friendship and
both players finishing the same date and edition; guesses should remain private.
Competitive minigames will need authoritative scoring beyond today’s client-graded
synced saves.
