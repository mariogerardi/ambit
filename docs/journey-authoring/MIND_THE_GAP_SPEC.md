# Mind the Gap — implementation spec

**Status:** approved experience, implemented as an unregistered workbench draft.  
**Journey:** `mind-the-gap-v1`, `src/game/mindTheGapJourney.ts`.  
**Basis:** original handoff ZIP authored against `9062d0445c60bd7ec504c3bae0d2698c568ae44a`; integrated on `feat/mind-the-gap` after `7a4c854`, November 11, 2026.  
**Registration:** deferred; `dailyEligible: false`. No catalog activation, push, merge, Daily assignment or deployment is authorized.

## Approved sequence and decisions

Five independent urban-rail discoveries connect buildings, depth, altitude,
political division and water. These are not stops on one continuous railway.
The supplied module is adapted rather than replaced; final ordinary copy and
contracts live in the module.

| Stop                 | Task                                                                                                                    | Play and help                                                                                                                                                                                                                                                                                                 | Reveal                                                                                                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Through the Building | Select Chongqing from five anonymous Chinese city markers, using the Liziba photograph.                                 | Southwestern China is supplied in the opening. Hint adds the Jialing/Yangtze relationship. Assist leaves Chongqing/Chengdu anonymous and asks the player to use the hillside setting; no direct city name or east/west answer.                                                                                | Name all candidates; retain the actual wrong pick; explain that building and station were designed together.                                                                        |
| The Deep End         | Select Ukraine and Russia from six country candidates, given Arsenalna in Kyiv and Admiralteyskaya in Saint Petersburg. | Finite entrance begins at named Hongyancun in Chongqing, then travels to the authored Europe/western-Russia view. Hongyancun is named in the question. European station markers and depths remain hidden until reveal; their names are already supplied. Hint adds orientation; assist leaves four countries. | Mark both country results independently and add contextual station markers/depths.                                                                                                  |
| Above Sea Level      | Estimate Quito's approximate urban-average elevation with a 0–5,000 m slider, 50 m steps.                               | Quito/Ecuador are references on entry. Hint supplies high-Andean scale. Assist gives 2,000–4,000 m, which includes incorrect estimates; it does not repeat an already-present Ecuador highlight.                                                                                                              | Compare estimate with 2,850 m and show the achieved accuracy band.                                                                                                                  |
| Ghost Stations       | Type Berlin from the Cold War clue.                                                                                     | Immediate text input; a single translucent, noninteractive Europe footprint over uniformly muted land; no political borders, country colors or answer marker. Hint retains framing. Assist highlights Germany without marking Berlin.                                                                         | Restore political borders and reveal Berlin. The translucent Europe footprint intentionally persists as context during reveal, then clears on advance.                              |
| Between Continents   | Pin the Marmaray crossing, with Istanbul and Bosphorus named.                                                           | World view starts over the Americas. Free worldwide rotation/zoom/pin placement; no target marker. Hint stays textual. Assist highlights Türkiye without a camera move.                                                                                                                                       | Preserve actual pin versus approximate target, distance bands and schematic crossing. Accepted pins receive the finite Bosphorus approach; misses retain shared comparison framing. |

The user approved the Q1 foothold/softer-assist direction, the Q3 broader assist,
and the Q2 Hongyancun-to-Europe entrance on November 11, 2026. Preserve those
choices. Success reactions use shared skill-specific defaults; slider and pin
accuracy tiers use brief reactions rather than thematic slogans.

## Acceptance, cameras and completion

All responses remain editable until Submit. Shared three-point rounds and
hint/assist ceilings of two/one apply. Q2 gives one point for one correct country.
Q3's target is 2,850 m with inclusive ±200/500/900 m bands. Q5's illustrative
target is 41.021° N, 29.000° E with inclusive 50/150/300 km bands. Grading does not
use display geometry or camera framing.

Q2 uses explicit regional framing rather than fitting Russia's entire outline.
Its final intro stop equals its play focus. Reduced motion uses that playable
endpoint; globe interaction interrupts the tour. Q5 help has no authored focus
and does not opt into selection framing.

Completion remains cumulative and retains actual map mistakes. Chongqing,
Berlin and the Marmaray target are resolved points; Quito and the two deep
station markers remain contextual references. China, Ecuador and Germany are
context countries, not graded country answers; Ukraine/Russia retain their
country-answer roles. There is no Europe backdrop in completion and no line
joining the five stories. One finite recap ends in shared world rotation;
reduced motion uses the static world endpoint. The local Marmaray schematic
remains as explanatory context. Numeric and typed mistakes remain in saved
response review without invented map locations.

## Implementation fit and packaged dependencies

All five controls reuse existing contracts: `city-single`/`place-ids`,
`map-multiple`/`country-ids` with `one-of-two`, `slider`/`numeric-range`,
`text`/`manual-text`, and `pin`/`pin-distance`. Anonymous candidates follow
`recipe:anonymous-city-selection`; grouped scenes and the shared camera owner
provide the entrance/reveal tours. No new engine or UI behavior is introduced.
Completion is authored against `journeyDiscoveryPlaces`/`journeyWorld` semantics.

| Source/package path                         | Repository destination                        | Status                                                          |
| ------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------- |
| `MIND_THE_GAP_SPEC.md`                      | `docs/journey-authoring/MIND_THE_GAP_SPEC.md` | Bundled; revised with approved decisions and integration notes. |
| `src/game/mindTheGapJourney.ts`             | Same path                                     | Bundled; adapted to current contracts and shared reactions.     |
| `src/game/data/mind-the-gap-europe.v1.json` | Same path                                     | Bundled; unchanged display-only handoff geometry.               |
| Commons Liziba photograph                   | `public/journeys/mind-the-gap/liziba.v1.jpg`  | Local unchanged 1280px thumbnail; CC BY-SA 4.0.                 |
| Media provenance                            | `src/game/data/mind-the-gap-media.v1.json`    | Added download URL, credit, license and checksum.               |
| Source qualifications                       | `public/journeys/mind-the-gap/SOURCES.md`     | Added factual evidence, geography limitations and attribution.  |

Review at `/review/journeys.html?module=mindTheGapJourney.ts`. The direct-module
audit and focused Journey tests cover effective scenes, grading, help and mixed
completion. TypeScript and any narrow real-render checks are recorded in the
implementation handoff; reading source or passing mocked checks does not establish
rendered appearance. The supplied Europe data lacks an exact upstream release or
reproduction script; the Marmaray target/path remain explicitly approximate.

## Verification — November 11, 2026

- Pinned Node 24.21.0 / npm 11.19.0 environment check passed.
- Direct-module Journey audit: zero errors and zero warnings; local media found.
- Seven focused reducer/DOM cases cover anonymous markers, Q2 partial answers,
  inclusive altitude bands, help ceilings, immediate typing, global pin misses
  and a mixed-result recap. Affected cases were rechecked after corrections.
- TypeScript `--noEmit`, focused formatting checks and `git diff --check` passed.
- Narrow desktop Chrome/WebGL inspection confirmed the local photo and anonymous
  markers, named Hongyancun entrance and final European frame, uniform borderless
  Europe and assisted Germany, and Q5's world-scale entry and accepted-pin reveal.
  The browser check caught and corrected country colors showing through Europe.
  Help camera invariance and missed/partial/completion cases were verified by
  automated scene checks; no full desktop/mobile walkthrough was performed.

The content remains unregistered. No shared engine code, catalog index, scheduling
or save schema changed. The Marmaray sketch is illustrative and the supplied
Europe footprint is not canonical grading data.
