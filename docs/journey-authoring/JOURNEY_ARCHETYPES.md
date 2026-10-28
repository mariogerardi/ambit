# Authored Journey archetypes

Use this guide to find an existing structure before implementing a Journey.
Archetypes describe how five stops develop an experience; they are not answer
modes, a ranking of Journeys, or additional engine APIs. A Journey can combine
structures. Examples establish current implementation patterns, not exceptions
to [Crafting](../JOURNEY_CRAFTING.md) or automatic editorial approval.

Start with the approved task and skill. Read the relevant pattern below, then the
closest current Journey's answer contract, effective scenes, help and completion.
Find its mechanic in `src/game/mechanics.ts` and its executable example in
`src/game/recipes.ts`. Preserve approved creative decisions; use the
[implementation workflow](IMPLEMENTING_A_SPEC.md) for acceptance and verification.
Do not add an archetype field to runtime content or read every example by default.

## Find a structure

| Structure                                     | What advances across the five stops                                                         | Current examples                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Repeated geographic deduction                 | The same relationship appears in different geographic forms.                                | Shared Neighbors / II; Island Instincts                                       |
| Altered-map recognition                       | Removing a boundary changes a familiar outline; the reveal restores its constituent places. | Missing Borders / II                                                          |
| A route with successive discoveries           | Moving forward changes the role or significance of the connecting feature.                  | Down the Danube; Around the Mediterranean; The Vaccine That Crossed the World |
| Comparisons across places                     | One comparison reveals different physical, political or cultural relationships.             | Latitude Surprises; Same Hour, Different Worlds; Same Name, Different Place   |
| Geography explains a human or natural outcome | Each place contributes another cause, adaptation or connection.                             | Made in China; Not the Obvious City; Small Wonders                            |
| Recognition followed by location              | A photograph or other clue identifies a feature, then the player locates it.                | Across the Divide                                                             |
| Spatial construction and observation          | The player makes shapes that expose a geographic pattern.                                   | Within Reach; Drawing the Sahara; The Shape of India                          |

These are navigation aids across the catalog. They do not nominate preferred
Journeys. For another structure, use the catalog rather than forcing a match.

## Repeated geographic deduction

**Reuse:** `ninthJourney.ts` and `sharedNeighborsTwoJourney.ts` show supplied
country pairs and a `pin` / `pin-inside` answer. `fourteenthJourney.ts` instead
uses country selection to distinguish political belonging from proximity.
Keep the relationship and response consistent; change the geography and what the
reveal helps the player notice. A sequel needs fresh identities, not a new mode.

**Development boundaries:** For shared neighbors, verify the complete intersection
of the two countries' adjacency sets, then grade canonical containment. Clue
outlines, country boundaries and the answer footprint have different disclosure
roles. Help supplies indirect references while retaining a meaningful landing
decision. Copying the original's country IDs or assist references is not reuse.

**Payoff and checks:** Explain the particular inland reach, peninsula or frontier
that makes each connection interesting. Use the original/sequel tests as models
for uniqueness, containment and withheld geography. Do not require new controls
or continuous difficulty escalation to justify five stops.

## Altered-map recognition

**Reuse:** `missingBordersJourney.ts` and `missingBordersTwoJourney.ts` use
`merged-region-single`. A synthetic selectable territory represents canonical
member countries; current authoring commits a tap immediately. Reveal the real
countries and their restored internal borders.

**Development boundaries:** Reuse composite-territory contracts and the shared
renderer. Declare all hidden internal adjacencies and verify connected membership.
Author the regional search field and alternatives deliberately. A sequel can
change the scale and countries without changing input or grading.

**Payoff and checks:** The altered shape should be observable, rather than solved
by a disclosed name. Help retains alternatives. Inspect selection, hidden-border
presentation, restoration and completion through the existing original/sequel
coverage; do not grade a display-only outline.

## A route with successive discoveries

**Reuse:** `danubeJourney.ts` connects varied questions through a river;
`vaccineExpeditionJourney.ts` repeats `compass-bearing` between historical
milestones. Route is a narrative structure, not a requirement to add a path input,
automatic relay or new response format.

**Development boundaries:** Select each stop's existing mechanic independently.
Give the player free orientation along the supplied route without disclosing the
withheld answer. Earlier discoveries may become later references deliberately.
Only draw a historical route when the evidence supports that geometry; a modern
great-circle comparison does not reconstruct a voyage.

**Payoff and checks:** Each question moves onward or develops a new consequence.
Reserve retrospective synthesis for completion. Check cross-stop disclosure and
route/feature persistence as well as the individual answer contracts. Preserve
necessary historical context while removing repeated movement instructions.

## Comparisons across places

**Reuse:** `latitudeJourney.ts` repeats a north/south comparison with typed
answers; `sameHourJourney.ts` compares civil clocks using several familiar
controls. `sharedNamesJourney.ts` develops different relationships behind shared
names. One theme need not imply one grading rule.

**Development boundaries:** Define the deciding distinction and all accepted
alternatives explicitly. Latitude, civil time, political identity and etymology
are separate facts. Labels or reference lines may supply orientation without
supplying a capital name or withheld identity. Civil-time and historical claims
need their own source conventions and qualifications.

**Payoff and checks:** Explain why the apparent relationship holds or fails.
Completion can juxtapose discoveries without drawing a fictitious travel route.
Reuse answer/alias and disclosure coverage appropriate to the chosen controls.

## Geography explains an outcome

**Reuse:** `madeInChinaJourney.ts` combines existing place selection and choice
questions around resources, terrain and connections. `eleventhJourney.ts`
explores capital decisions; `smallWondersJourney.ts` connects animals to habitats.
The common structure is a question about why a place matters, not a fixed list
of answer modes.

**Development boundaries:** Give enough geographic evidence for the intended
inference. A supplied location can be reference context while the answer concerns
its role. Photos and terrain are clues or explanations, not canonical grading
geometry. Distinguish plausible comparison sites from documented historical sites.

**Payoff and checks:** Match the task to the causal idea. A distance or bearing
question needs a reason to belong beyond offering another control. Review
distractors, media disclosure and actual wrong-answer reveals. Existing Journey
examples remain subject to this editorial judgment; their presence does not
certify every question's fit.

## Recognition followed by location

**Reuse:** `acrossDivideJourney.ts` uses photo clues and `pin` / `pin-distance`.
Reuse the shared control, accuracy information, help ceilings and saved pin review.

**Development boundaries:** Research identity, location, photography and rights
separately. Pre-answer alt text, captions and links must preserve the intended
recognition task. Set reviewed distance bands appropriate to the search scale;
basic reference geography and assistance must make estimation meaningful.

**Payoff and checks:** After commitment, name the feature and explain its setting
beside the actual submitted pin. Check media existence/credits, target coordinates,
tiers and disclosure; a photograph's presence does not prove recognizability.

## Spatial construction and observation

**Reuse:** `withinReachJourney.ts` repeats `geo-circle` using whole-island
containment (`island-coverage-max`, `recipe:geo-circle-islands`); this differs
from point coverage in `recipe:geo-circle`. `drawingSaharaJourney.ts` and
`shapeOfIndiaJourney.ts` combine
existing construction controls. Consult the actual rule and the matching examples
in `constructionRecipes.ts`, through `recipes.ts`, rather than assuming all
questions sharing a control have the same grading.

**Development boundaries:** Distinguish ordinary scene/content changes from new
canonical geography, raster preparation or calibration. State what counts: whole
islands, points, painted area, traced length or modeled residents. Display imagery
provides evidence; frozen geometry or grids determine grades. Verify authored
optima and accepted alternatives independently of an attractive sample drawing.

**Payoff and checks:** The result should explain a pattern such as settlement
concentration or island spacing. Repeated construction can reduce control learning;
five different shapes require deliberate pacing. Use focused construction/rule
coverage and the Journey's data invariants. A structural sample cannot establish
visual clarity, geographic calibration or actual touch/GPU behavior.

## Compositions and genuinely new work

An archetype does not prove a proposed implementation exists. For example,
`silkRoadIntersectionsJourney.ts` adds two supplied bearings to an existing
distance pin; `recipe:bearing-intersection` demonstrates the composition. It does
not create a separate answer mode or record surveyed caravan routes.

Classify proposed work using the engine's
[extension cost guidance](../JOURNEY_ENGINE.md#extension-cost-audit): existing
content, a new scene composition, a new grading rule, or a new input/response.
Verify against current code and resolve only material feasibility risks. Use the
normal focused checks; archetypes do not add a second acceptance checklist.
