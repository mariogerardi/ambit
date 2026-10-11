# Journey review and retained rotation

Owner decisions recorded October 10–11, 2026. The active daily rotation now
contains **eleven five-question Journeys and 55 questions**. The additional
**Chasing the sun** edition brings the available catalog to **12 Journeys and 60
questions**, ready for a shared date assignment without reshuffling that cycle. Six original packs
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

Sources and reporting remain in the question-mark popover. Sources are shown only
after submission, so source titles and linked pages cannot spoil a live question. Study’s cog retains
session actions. The maintained crafting guide is
[Question catalog and authoring](QUESTION_CATALOG.md).

## Daily selection and publication

[`journeyRotation.ts`](../src/game/journeyRotation.ts) contains the explicit eleven
rotation IDs. Unassigned dates repeat these packs by device-local date from
October 5, 2026. Admin’s shared calendar publishes date assignments for everyone
and can select any of the twelve bundled editions. Saving uses revision checks
to prevent concurrent edits overwriting one another. Retained attempts remain
pinned to their saved edition. The calendar can restore a date to automatic
rotation; no dates were assigned during this editorial pass.

Current behavior uses local midnight, one scored attempt, five questions, score
out of five, and completion-gated friend totals. Players cannot start old dates;
Admin can preview bundled content through practice routes. A synchronized global
reset remains a future decision.

Friends currently exposes completion and total scores, not per-question outcomes.
The five-row recap would need outcome-only data gated on accepted friendship and
both players finishing the same date and edition; guesses should remain private.
Competitive minigames will need authoritative scoring beyond today’s client-graded
synced saves.

## Supplemental-copy spoiler audit · October 11, 2026

Reviewed every question in all twelve available Journeys: the home-card title and
introduction, question lead-in, instruction, input label, image alt text, and
question-help sources. Correct answers and explanatory reveals remain after
submission. Named destinations in pin prompts are intentional: finding their
location is the task. Geographic direction is retained as useful context without
stating hidden answers.

| Journey                  | Audit result                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------ |
| Beyond the maple leaf    | Removed “Canada” from the introduction before the opening flag question.                               |
| Around the Mediterranean | Five stops checked; supplemental copy does not state the hidden answers.                               |
| Shared neighbors         | Five stops checked; the repeated pin premise stays in the introduction.                                |
| Along the Andes          | Five stops checked; route cues do not name the capitals or requested sets.                             |
| Not the obvious city     | Five stops checked; country context does not name the requested capitals.                              |
| Island instincts         | Five stops checked; island direction preserves the map challenge.                                      |
| North America by name    | Five stops checked; regional context does not list the requested answers.                              |
| Latitude surprises       | Five stops checked; reference cities define latitude, not the accepted answers.                        |
| Around the Ring of Fire  | Removed “Japan” from the introduction before the opening flag question.                                |
| Exceptions to the rule   | Five stops checked; exceptional facts remain in the reveals.                                           |
| On Russia’s doorstep     | Five stops checked; named destinations are intentional pin tasks.                                      |
| Chasing the sun          | Five new stops checked; alt text describes visible art without stating month, ray count, or symbolism. |

Source titles revealed several answers (including Sicily, New Brunswick, and
Abuja). The shared help now withholds source names and links until answering;
reporting stays available throughout. Regression tests cover that boundary and
canonical-answer leaks in supplemental copy. Manual review also covers accepted
alternative answers and indirect wording that literal matching cannot assess.

## Chasing the sun

A five-stop route uses history, observation, symbolism, and geographic placement:
Argentina’s Sun of May → count Uruguay’s sixteen alternating rays → recognize
Kazakhstan’s grain-shaped rays → place Japan’s red disc on the globe → interpret
Malawi’s rising sun. Short directional cues connect the stops; insights stay in
the reveals instead of repeating the correct-answer card.

Primary references, reviewed October 11, 2026:

- [Buenos Aires City Government: Sun of May](https://buenosaires.gob.ar/gcaba_historico/noticias/dia-de-la-bandera-como-debe-representarse-el-sol-de-mayo-en-la-insignia).
- [Canelones government: national flag history](https://www.imcanelones.gub.uy/noticias/182o-aniversario-del-primer-pabellon-nacional) and [Argentina government: national flag design](https://www.argentina.gob.ar/pais/simbolos/bandera).
- [President of Kazakhstan: flag symbolism](https://www.akorda.kz/en/state_symbols/kazakhstan_flag).
- [Web Japan: national flag and anthem](https://web-japan.org/factsheet/en/pdf/11NFlagAnthem.pdf).
- [Embassy of Malawi in Cairo: national flag](https://www.malawiembassycairo.org/about-malawi).

The enlarged Uruguay sun is a viewport crop of the existing attributed flag SVG,
not a new drawing. The edition is available in Admin’s calendar and playground;
the eleven-pack automatic cycle is unchanged.
