# Where Is It Official? — revised implementation spec

Approved sequence: Arabic → Portuguese → Russian → Malay → Guaraní. Revised
November 3, 2026 following the user's six decisions. This supersedes conflicting
acceptance, assist and camera details in the original supplied brief.

Status: unregistered source-workbench draft, `where-is-it-official-v1`. No Daily
date, registration, push or deployment is authorized by this implementation.

## Player experience

Read an authentic expression in its native script, identify its language, then
select any qualifying country. One correct country suffices. National co-official
status and prescribed official governmental use count. The inclusive policy also
accepts the related standards described below; regional recognition alone does
not qualify. The short shared instruction makes that scope visible before play.

| Stop                                | Accepted network                                            | Assist field                                                  |
| ----------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| Arabic                              | 24 countries, including Palestine and Mali/Hassaniya        | Morocco, Egypt, Chad, Niger, Ethiopia, Kenya                  |
| Portuguese                          | Nine countries, including Equatorial Guinea and Timor-Leste | Portugal, Brazil, Angola, Namibia, Zambia, Zimbabwe           |
| Russian                             | Russia, Belarus, Kyrgyzstan, Kazakhstan                     | Russia, Belarus, Kazakhstan, Ukraine, Uzbekistan, Tajikistan  |
| Malay and related national standard | Malaysia, Brunei, Singapore, Indonesia                      | Malaysia, Brunei, Singapore, Indonesia, Thailand, Philippines |
| Guaraní                             | Paraguay, Bolivia                                           | Paraguay, Bolivia, Argentina, Brazil, Uruguay, Peru           |

All six-country assists mix valid and invalid options, preserve obvious anchors,
and leave the canonical answer sets unchanged. Hints/assists do not name the
language. Scoring remains 3 points per round, with 2/1 ceilings for hint/assist.
Wrong selections earn zero and show the full explanatory reveal.

## Shared presentation

- `textClue` provides selectable Unicode text, a language tag, direction, and
  reveal-only language name/English translation. Arabic's clue is RTL; captions
  are LTR. Shared typography wraps naturally with system script fallback.
- `selection: {type: "world"}` uses all supported ADM0 geography rather than the
  UN-member roster. Neutral whole-world selection has borders without a gold
  candidate pool, target framing, country-name disclosure or answer tint.
- `scenes.reveal.network` paints the complete accepted set simultaneously in
  explanatory context color. Only the submitted answer receives green/rose
  judgment. It is independent of eligibility, grading, and recap discoveries.
- Outcome headings use shared brief reactions; the language identity and cultural
  observations belong to the text clue's revealed caption and explanation.

Mali's Hassaniya distinction and Indonesia's distinct Bahasa Indonesia standard
are explained positively on reveal. Kazakhstan's official-government-use clause
is distinguished from the designation of Kazakh. Full country evidence and
qualifications live in [Sources](../../public/journeys/where-is-it-official/SOURCES.md).

## Motion and completion

Reveal all network countries before starting a short finite tour of one or two
regional views. Finish at a whole-globe overview, then use the same rotation as
Home/Explore. `scenes.reveal.orbit` appends the authored final focus when needed.
This uses the existing flyover path with a brief duration scale and a completion
handoff, not another animation system. Input interrupts both stages; reduced
motion shows the final static overview.

Completion makes one curated tour in round order and ends in overview rotation.
Accepted actual alternatives become reviewed discoveries; actual mistakes stay
rose. After a miss, one illustrative accepted solution can become a discovery,
without counting every explanatory country as a submitted answer. No fabricated
routes are drawn.

## Verification and remaining editorial review

Focused checks cover every accepted country, assisted eligibility/help ceilings,
neutral play and clue/source disclosure, simultaneous network coloring, selected
answer judgments, alternative-answer recap, save restoration, finite camera
completion/cancellation, and reduced motion. Native-script text is attested with
sources. Final native-speaker polish and real-device shaping/interaction remain
editorial/player review, distinct from unit/DOM and scene evidence.
