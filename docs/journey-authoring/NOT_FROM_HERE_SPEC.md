# Not From Here — source-ready Journey brief

**Decision status:** Five-stop player experience **approved** in the current design conversation. TypeScript module **proposed**, not technically validated.  
**Journey:** `Not From Here` · `not-from-here-v1` · `src/game/notFromHereJourney.ts`  
**Companion:** [`src/game/notFromHereJourney.ts`](../../src/game/notFromHereJourney.ts) (complete five-round draft; authoritative for final player copy, help, grading and scene configuration).  
**Authoring basis:** Public `mariogerardi/ambit`, `main` at **`ef8cc99404fd44f299306f038bffbac063666afd`**, inspected 2026-11-03 through the GitHub connector. The working checkout may differ; unpushed work is unavailable.  
**Registration:** **DEFER**. New Journey is `dailyEligible:false`. Do not register, schedule, push, publish or deploy on the strength of this handoff.

## Premise and rhythm

Five familiar products became closely associated with places far from their original homes. The player discovers that geographic identity can come from domestication, trade, naming, cultivation and technological change. The rhythm moves from a recognizable origin surprise (kiwi), through regional geography (potato), a coastal-trade puzzle (coffee), island navigation (vanilla), and a globe-based great-circle finale (rubber). These are **five independent histories**, not one cargo route.

**Core presentation constraint (locked):** The player already has a rotatable, zoomable globe and ordinary political boundaries. Do **not** highlight, outline, label, focus tightly on, or otherwise visually identify a withheld answer in the play scene. A cited feature, such as Lake Titicaca, is **not** automatically drawn just because it appears in the prompt. Orient broadly; save targeted geographic storytelling for hint, assist and reveal.

| Stop              | Task, mechanic and reasoning                                                                                                                        | Given / withheld in play                                                                                                                               | Help and discovery                                                                                                                  | Reveal                                                                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **1 · Kiwifruit** | Select **China** on globe (`map-single`, immediate). Establish the familiar-name/original-home mismatch.                                            | Player knows New Zealand made kiwi famous; 1904 seed arrival. Ordinary world map; **China and New Zealand not highlighted**.                           | East Asian habitat hint; assist offers China, Japan and South Korea as equivalent visual candidates.                                | China → New Zealand, Mary Isabel Fraser, _Chinese gooseberry_, 1959 rebranding.                                                     |
| **2 · Potatoes**  | Select **Peru and Bolivia** (`map-multiple`, submit); identify the two countries around Lake Titicaca.                                              | Andes and lake named in text; **no lake marker, footprint, country outlines singled out, or target-centered camera**. South America presented broadly. | High-altitude/landlocked-neighbor clue; assisted field Peru, Bolivia, Chile, Ecuador.                                               | Lake Titicaca named **only on reveal**; origin and agricultural diversity explained.                                                |
| **3 · Coffee**    | Pick **Mocha**, Yemen, from three identically styled **anonymous port markers** (`city-single`, submit). Read the southern Red Sea coast.           | Candidate ports are Jeddah, Mocha and Aden, but only badges **A/B/C** are initially visible. No country or port names disclosed by hover.              | Coastline distinction; assist leaves Mocha and Aden as viable-looking southern alternatives.                                        | Real names of the three ports, and the Ethiopian highlands ↔ Yemen trade relationship.                                             |
| **4 · Vanilla**   | Drop a distance pin **near Réunion** (`pin`, submit). Find a small island relative to Madagascar and Mauritius.                                     | Island name and relative location in prompt; **no target pin, label or hint footprint**, even though Réunion is visible in the globe geography.        | Volcanic-island hint; assist labels **Mauritius**, not Réunion.                                                                     | Réunion marker, 1841 hand-pollination work of Edmond Albius, and eventual production beyond Mesoamerica.                            |
| **5 · Rubber**    | Set **initial compass bearing from Santarém, Brazil, toward London** (`compass-bearing`, submit). Reason about the shortest great-circle direction. | Two neutral city endpoints. **No correct path or sector pre-revealed**. Historical shipment and Kew connection provided.                               | Distinguish great-circle bearing from eastward flat-map intuition; assist shows 0–90° sector, still leaving a genuine angle choice. | Northeast initial bearing (~32°); 1876 seed transfer and Kew → Sri Lanka link. Reveal line is **not** the historical ship's course. |

The TypeScript module supplies the actual prompts, descriptions, qualifications, feedback, per-round camera states, optional help, completion and sources. This brief intentionally does not duplicate every text or configuration field.

## Grading and acceptance decisions

- **Q1:** Exact canonical country `wurl:CHN`; an immediate tap commits. Open world selection rather than a narrowed candidate field. `allowTyping:false` keeps the globe as the primary input.
- **Q2:** Exact unordered pair `wurl:PER` + `wurl:BOL`; submit together. `partialCredit:"one-of-two"` earns **one point** for exactly one independently correct selection, following the current engine's convention. Do not accept other Andean countries simply because wild potato species grow there: the prompt concerns **countries sharing Lake Titicaca**.
- **Q3:** `place:78751` **Mocha** accepted; distractors `place:105343` **Jeddah**, `place:415189` **Aden**. IDs and coordinates verified against GeoNames records. Disable typing. No aliases besides the single target place identity are needed: the challenge is selecting the correct fixed marker, not recalling its spelling.
- **Q4:** GeoNames Réunion center (-21.1, 55.6), authored `not-from-here:reunion-center` identity. Three **inclusive** distance bands: **25 km → 3**, **50 km → 2**, **90 km → 1**; outside 90 km misses. This is a **near-island distance task**, not strict island polygon containment; within-range sea pins can qualify. No new geography or bespoke grading is assumed.
- **Q5:** Modern reference centers Santarém (-2.44306, -54.70833), London (51.50853, -0.12574). Approximate true initial bearing **32.46°**, checked independently from those coordinates. Existing angular bands **8° → 3**, **18° → 2**, **35° → 1**; outside 35° misses. Endpoints are known; the resulting great-circle route is withheld until reveal.

**Inherited:** Five questions, 15 possible points, hint ceiling 2 and assist ceiling 1 without changing correctness; normal immediate/submit conventions, actual wrong-answer geography retained, correct/partial/miss feedback, and standard reveal/recap controls. No timers or new scoring.

## Existing-engine implementation fit

| Round | Verified code / recipe                                                                                               | Scope and outstanding work                                                                                                                                                                   |
| ----- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `recipes.ts` `recipe:map-single`; `whereIsItOfficialJourney.ts` whole-world neutral answer search                    | Reuse. Need actual play-state disclosure check.                                                                                                                                              |
| 2     | `recipes.ts` `recipe:map-multiple`; `questionContracts.ts` pair partial credit                                       | Reuse. Withhold lake until reveal; audit both right, one right, neither right.                                                                                                               |
| 3     | `recipes.ts` `recipe:city-single`; `madeInChinaJourney.ts` anonymous marked candidates                               | Reuse using three sourced GeoNames `PlaceFeature`s; confirm badges and names stay anonymous in play and reveal correctly.                                                                    |
| 4     | `recipes.ts` `recipe:pin`; `smallWondersJourney.ts` location-distance bands                                          | Reuse; target included in `places` for `answerPlace` distance resolution, with `markerHidden:true` + `labelHidden:true` before reveal. **Actual hidden state needs workbench verification.** |
| 5     | `recipes.ts` `recipe:compass-bearing`; `vaccineExpeditionJourney.ts`; `smallWondersJourney.ts` disclosed destination | Reuse; verify the two supplied reference endpoints, direction and reveal without prematurely drawing the great-circle line.                                                                  |

**Source dependencies inspected:** `questionContracts.ts`, `questionBuilder.ts`, `mechanics.ts`, `scenes.ts`, `answerTargets.ts`, `questionPreparation.ts`, `authoredPlaces.ts`, `recipes.ts`, and the two closest question examples. **No new asset paths, custom geometry files or new engine APIs** are assumed. Small informational recap labels and the Lake Titicaca reveal label are explicit authored display anchors, not pretended canonical place IDs.

## Factual provenance (reviewed 2026-11-03)

1. **Kiwi:** NZ History, https://nzhistory.govt.nz/chinese-gooseberry-becomes-kiwifruit ; Zespri, https://www.zespri.com/en-NZ/zespri-history — China; Fraser's 1904 introduction; 1959 rebranding.
2. **Potato:** International Potato Center, https://cipotato.org/potato/native-potato-varieties/ and https://cipotato.org/genebankcip/potato-wild/ — Titicaca basin between present-day Peru and Bolivia; domestication approximately eight millennia ago.
3. **Coffee:** _Archives of Natural History_, https://doi.org/10.3366/anh.2015.0283 — coffee cultivation and historic export via Mocha. GeoNames coordinates: https://www.geonames.org/78751/mocha.html , https://www.geonames.org/105343/jeddah.html , https://www.geonames.org/415189/aden.html . Distinguish African botanical origins from Yemen's later cultivation/export history.
4. **Vanilla:** Smithsonian Gardens, https://gardens.si.edu/exhibitions/connective-power-of-orchids/section-4-orchid-innovation-the-vanilla-orchid/ ; https://www.si.edu/object/vanilla-planifolia%3Aofeo-sg_2007-0281B ; GeoNames Réunion https://www.geonames.org/935317/reunion.html . Acknowledge broader native range than a single present-day state and Albius's enslavement and lack of compensation.
5. **Rubber:** Kew, https://www.kew.org/read-and-watch/michael-palin-on-hooker ; Oxford Herbaria, https://herbaria.plants.ox.ac.uk/bol/plants400/Profiles/GH/Hevea ; GeoNames Santarém https://www.geonames.org/3389353/santarem.html and London https://www.geonames.org/2643743/london.html . **Factual correction:** Santarém was the documented 1876 seed-shipment port; it is on the Amazon, not near its mouth. This improves precision without altering the approved compass mechanic.

## Reveal, completion and material risks

**Reveal contract:** Each response shows the actual target and selected mistake where present; never make a wrong port/pin appear geographically correct. Q1's China–New Zealand network remains explanatory (not two player-selected answers). Q2's lake label is reveal-only. Q3's anonymous markers become named after commitment. Q4's Réunion center is revealed after pin grading. Q5's great-circle path is mathematical, not a claimed 1876 route.

**Completion:** The module uses a cumulative recap with flyover views and independently paired annotation labels for the five subjects. It avoids one invented five-product trade itinerary and preserves submitted discoveries/mistakes. Annotation positions are **approximate regional map labels**, not archival collection coordinates; the recap caption says so.

**Checks Codex must actually establish, not assume passed:**

- Q1–Q2 neutral, fully usable globe and no accidental answer disclosure from camera, candidate styling or hover.
- Q2 candidate eligibility, one-of-two partial credit, actual incorrect/partial reveal and saved-state behavior.
- Q3 equal anonymous badges A/B/C at the actual locations, no hover-name leakage, correct `place-ids` lookup, and legible Mocha–Aden separation at the selected camera level.
- Q4 source target hidden in play while still resolvable for `pin-distance`; reference Mauritius shown only on assist; all three band boundaries behave as declared.
- Q5 source/destination visibility, true bearing near 32°, 0–90° assist sector, graded incorrect angle and no implied historical shipping path.
- Recap: contextual labels do not masquerade as earned answers; genuine wrong answers remain visible; no stale port labels or hidden target objects carry between rounds.

**Current evidence limitations:** This draft was written using live, inspected public source and factual sources, but **no local TypeScript, `check:journey` audit, actual globe rendering, accessibility review or browser walkthrough has been run**. This is the precise boundary for the source-ready experiment. No engine extension is identified; visual/camera differences remain **to verify**.

## Codex handoff — integrate, don't reconstruct

Read this brief **and** `notFromHereJourney.ts`; follow `docs/journey-authoring/IMPLEMENTING_A_SPEC.md` and `AGENTS.md` on your local revision. Preserve the approved five player tasks and disclosure constraints. Adapt the supplied module for current contracts, correct factual/data mistakes if any, and run focused TypeScript and Journey checks. **Do not regenerate the Journey from this prose or redesign its five questions.** Report which module edits were necessary (API/ID/data/asset/disclosure/other) so the source-ready workflow can be evaluated for reconstruction and usage cost. Do not add unrelated tests or perform a default browser walkthrough; use the workbench for targeted visual risks.

Use:

```sh
npm run check:journey -- --module src/game/notFromHereJourney.ts
```

Workbench: `/review/journeys.html?module=notFromHereJourney.ts`

Keep this an unregistered draft. Do **not** add it to the catalog, assign a Daily date, push or deploy without a new explicit instruction.

## Local integration record — 2026-11-03

Inspected and adapted against `origin/main` at
`ef8cc99404fd44f299306f038bffbac063666afd`, exactly matching the handoff basis.
Implementation branch: `feat/not-from-here`. The original Downloads attachments
remain unchanged. This repository copy preserves the approved experience above;
the following notes supersede its pre-integration evidence limitations.

**Integration:** Copied the supplied five-round module into `src/game/` and kept
its identities, canonical answers, coordinates, scoring bands, help, cameras,
explanations and cumulative completion. No catalog/index edits or new assets.
Canonical country IDs resolve in the shipped world; the five city records and
Réunion center agree with the cited GeoNames records. The supplied historical
sources were checked, including the coffee paper's DOI/metadata and Smithsonian's
Albius account. Sources/qualifications are locked during play by `GameShell`/`QuestionHelp`, so
their answer names and bearing figure cannot leak through the information menu.
Modern reference centers and illustrative recap anchors remain
explicitly distinguished from historical sites/routes.

**Corrections:** The supplied Q2 combination of `selection: world` and one-of-two
credit compiled, but the existing credit helper silently required an explicit ID
pool. A small helper correction supports world selection while respecting excluded
and contextual countries; the canonical answer and open search stay unchanged.
The initial audit warned that no partial sample was available; the corrected
module now produces one. Q4's strongest feedback became “Precisely placed.”:
“Right on the island.” incorrectly implied containment despite the approved
near-island distance rule (and exceeded the four-word feedback convention).
Q3's reveal configuration now deliberately retains A/B/C beside the real names;
the city renderer inherits candidate badges and does not apply a reveal-only
`markerBadge: undefined` override. Anonymous play and actual wrong-port grading
remain unchanged. All supplied fields exist; no new API or asset was needed.

**Focused evidence:** Pinned Node 24.21.0/npm 11.19.0 runtime preflight; TypeScript;
direct-module Journey audit (five questions, no errors or warnings); four focused
integration tests plus five existing Small Wonders partial-credit cases. Checks
cover neutral play, help survivors, pending port anonymity, correct/wrong/partial
reveals, partial-credit save round trips, all inclusive pin boundaries, reference
separation, ~32.46° true bearing, angular rewards, stage cleanup and actual recap
mistakes. The audit's wrong-pair sample contains one correct answer; the dedicated
tests additionally exercise neither-correct submissions. These are reducer/data
checks, not WebGL rendering or browser verification. Mocha/Aden label separation,
small-island legibility and narrow-screen appearance remain visually unverified.

**Clarifications:** “Lake Titicaca named only on reveal” means the map label: its
name intentionally appears in the approved prompt. “Paired” recap annotations
allow the supplied three-point rubber association (Brazil, Kew, Sri Lanka).
Neither wording required changing gameplay or asking for a new design decision.

**Workflow result:** The source-ready module removed the need to author five
questions, help stages, reveals and completion from prose. Work consisted of
integration, targeted corrections and focused validation. 490 of the supplied module’s 524 lines (93.5%) remain exactly unchanged,
including the effect of repository formatting; comparative token/cost savings are not measurable
without a prose-only baseline, and this environment exposes no billing/token
usage report for the task. No registration, scheduling, push or deployment.

Review locally at `/review/journeys.html?module=notFromHereJourney.ts`.
