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

| Stop                 | Task                                                                                       | Play and help                                                                                                                                                                                                                                              | Reveal                                                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Through the Building | Select Chongqing from five named Chinese city markers using the Liziba photograph.         | All city names appear from entry and remain visible through hint/assist. The southwest-China opening and river hint remain; assist leaves Chongqing/Chengdu.                                                                                               | Retain the actual wrong pick and explain the station/building's shared design.                                                                                        |
| The Deep End         | Select Ukraine, the country containing Kyiv's Arsenalna, from six country candidates.      | Named Hongyancun entrance, then Europe/western Russia; intro duration scaled to 0.4 (about six seconds). The exact approved copy names Hongyancun's widely regarded world record and Arsenalna's former record. Assist leaves Ukraine, Belarus and Poland. | Show the Ukraine result and contextual Arsenalna marker. Russia is a distractor, never a correct answer.                                                              |
| Above Sea Level      | Estimate the Quito Metro line's approximate elevation with a 0–5,000 m slider, 50 m steps. | The copy centers the world's highest metro line running entirely underground. Quito/Ecuador supply location context. Hint adds Andean scale; assist gives 2,000–4,000 m, including incorrect estimates.                                                    | Compare with the operator's approximate 2,850 m line elevation and explain underground versus below sea level.                                                        |
| Ghost Stations       | Type Berlin from its metro's guarded Cold War ghost stations.                              | Immediate text input; borderless Europe view with the existing European country surfaces filled in the shared reference color; no separate overlay, label or small-country locator rings. Assist frames Germany closely without marking Berlin.            | Restore political borders and show Berlin's outcome-aware marker: correct green/check or cyan solution after a miss.                                                  |
| Between Continents   | Pin Marmaray with Istanbul and Bosphorus named.                                            | Global search over ordinary theme country colors, initially facing the Americas. Hint retains the view. Assist highlights Türkiye and frames a broad Türkiye/Black Sea region; input remains global and the target hidden.                                 | Preserve actual pin versus approximate target, accuracy bands and schematic crossing. Accepted pins receive the Bosphorus approach; misses retain comparison framing. |

On November 11, 2026, the user approved showing Q1 city names from entry,
shortening Q2's entrance, refocusing Q3 on the railway, repairing Q4's reference
and outcome presentation, ordinary theme colors and a regional assist for Q5,
and shared larger landmark-reference typography. After previewing the colored
continent footprint, the user explicitly chose to remove the Europe overlay
entirely. The user then requested color inside the existing geographic borders,
so the canonical European country surfaces supply the background reference fill,
without individual small-country rings. Germany is outlined on assist. Q2 was then explicitly revised
to a single Ukraine answer, with this exact question:

> Chongqing’s Hongyancun is widely regarded as the world’s deepest metro station. Kyiv’s Arsenalna held that record before it. Select the country home to that European station.

These decisions supersede the initial anonymous-city, two-country Q2,
city-altitude, persistent-continent-fill and camera-free Q5 assistance designs.
Shared skill-specific reactions and existing scoring bands remain in use.

## Acceptance, cameras and completion

All responses remain editable until Submit. Shared three-point rounds and
hint/assist ceilings of two/one apply. Q2 is a single-country round with no partial credit.
Q3's target is 2,850 m with inclusive ±200/500/900 m bands. Q5's illustrative
target is 41.021° N, 29.000° E with inclusive 50/150/300 km bands. Grading does not
use display geometry or camera framing.

Q2 uses explicit regional framing rather than fitting Russia's entire outline.
Its final intro stop equals its play focus. Reduced motion uses that playable
endpoint; globe interaction interrupts the tour. Q5 assistance now has a broad authored regional focus without selection framing;
the hint retains the world view and neither stage changes pin eligibility.

Completion remains cumulative and retains actual map mistakes. Chongqing,
Berlin and the Marmaray target are resolved points; Quito and the Arsenalna
station marker remain contextual references. China, Ecuador and Germany are
context countries, not graded country answers; Ukraine retains its
country-answer role; an actual Russia selection is a mistake. There is no Europe backdrop in completion and no line
joining the five stories. One finite recap ends in shared world rotation;
reduced motion uses the static world endpoint. The local Marmaray schematic
remains as explanatory context. Numeric and typed mistakes remain in saved
response review without invented map locations.

## Implementation fit and packaged dependencies

All five controls reuse existing contracts: `city-single`/`place-ids`,
`map-single`/`country-ids`, `slider`/`numeric-range`,
`text`/`capital-name` for canonical Berlin aliases and outcome projection, and `pin`/`pin-distance`. City candidates reuse the shared city-selection lifecycle with names disclosed.
Grouped scenes and the shared camera owner provide entrance/reveal tours. Small
shared support adds intro-only pacing and noninteractive background-region fills;
authored landmark reference typography
now matches city references across Journeys.
Completion is authored against `journeyDiscoveryPlaces`/`journeyWorld` semantics.

| Source/package path                         | Repository destination                        | Status                                                                   |
| ------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------ |
| `MIND_THE_GAP_SPEC.md`                      | `docs/journey-authoring/MIND_THE_GAP_SPEC.md` | Bundled; revised with approved decisions and integration notes.          |
| `src/game/mindTheGapJourney.ts`             | Same path                                     | Bundled; adapted to current contracts and shared reactions.              |
| `src/game/data/mind-the-gap-europe.v1.json` | Same path                                     | Original handoff geometry retained in source; overlay removed from play. |
| Commons Liziba photograph                   | `public/journeys/mind-the-gap/liziba.v1.jpg`  | Local unchanged 1280px thumbnail; CC BY-SA 4.0.                          |
| Media provenance                            | `src/game/data/mind-the-gap-media.v1.json`    | Added download URL, credit, license and checksum.                        |
| Source qualifications                       | `public/journeys/mind-the-gap/SOURCES.md`     | Added factual evidence, geography limitations and attribution.           |

Review at `/review/journeys.html?module=mindTheGapJourney.ts`. The direct-module
audit and focused Journey tests cover effective scenes, grading, help and mixed
completion. TypeScript and any narrow real-render checks are recorded in the
implementation handoff; reading source or passing mocked checks does not establish
rendered appearance. The supplied Europe data lacks an exact upstream release or
reproduction script; the Marmaray target/path remain explicitly approximate.

## Initial-draft verification — November 11, 2026

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

That initial draft remained unregistered and did not change shared engine code,
the catalog index, scheduling or save schema. This revision adds the shared
presentation support described above; catalog, scheduling and save schema remain unchanged. The Marmaray sketch is illustrative and the supplied
Europe footprint is not canonical grading data.

## Revision verification

Focused checks cover the revised Journey and affected camera, authoring-contract
and label/locator owners. New regressions exercise named candidates,
Ukraine-only grading, Berlin correct/missed symbols, clearing the background fill,
Q5's regional help framing, intro pace, readable landmark-reference labels across themes, and background fills without
small-country locators, answer eligibility or completion discoveries.
The focused checks and TypeScript passed; the direct-module audit reports zero
errors and zero warnings. Narrow desktop Chrome/WebGL checks confirmed Q2's
revised copy and final framing, Berlin's green correct marker, Q5's ordinary land
colors and regional assist movement, and the final Q4 country-surface fill without
small-country rings. Camera pacing and reduced-motion behavior were checked in
automated tests. No full desktop/mobile walkthrough was performed.
