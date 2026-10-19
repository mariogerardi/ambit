# Historical record: Same Name, Different Place — implementation review

> Historical record of the October 2026 work described below. Retained for the
> decisions, provenance and verification scope at that time; it is not current
> authoring policy, a current catalog inventory, or a fresh browser/deployment check.
> References below to “current,” “now,” palettes, tolerances and question sequences
> describe that earlier work and may have been superseded. For current behavior use
> [Crafting a Journey](../JOURNEY_CRAFTING.md),
> [the catalog](../QUESTION_CATALOG.md),
> [the engine guide](../JOURNEY_ENGINE.md), and the linked current definitions.

Implemented locally on October 12, 2026 as `same-name-different-place-v1`,
with the five specified stops: Congo, London, Tripoli, the unnamed Caucasus
country, and Victoria Falls. Production deployment was authorized after the
user's four presentation corrections; shared date assignments remain separate.

Admin preview route: `/journey/same-name-different-place`.
The development-only read-only review entry also accepts
`/review/journeys.html?journey=same-name-different-place`.

## Verified locally

- Journey contract audit and TypeScript check pass.
- Focused Journey, registration, guidance, scene and camera tests pass.
- Anonymous city markers use equal styling; assists preserve both Thames
  candidates and show the actual connected Thames and Lake St. Clair geometry.
  The initial candidates are Kingston, Ottawa, London and Chatham; revision 2
  clears obsolete Buffalo drafts while preserving earned results and receipts.
- The Caucasus question has no answer name in its visible or accessible
  pre-answer content, including hint, assist and pending selection.
- Zambia and Zimbabwe are contextual, and Zambezi linework is present from play.
- The 40, 80 and 120 km tiers are inclusive; a pin 1 m beyond 120 km fails,
  including after assistance. All accepted tiers earn one point.
- The grading point is OpenStreetMap node 299131927 at the Main Falls lip,
  also a vertex of the mapped Main Falls cliff. It is not the town or UNESCO
  property centroid. Both distant city references and the Lake Kariba shoreline
  are outside 120 km.
- Source snapshots, licenses and checksums are documented in `NOTICE.md` and
  `sources/shared-names-map.metadata.json`. No photographs are included.
- Georgia's existing U.S. state polygon is hidden during the question and
  highlighted purple in completion, alongside the country.
- Both Tripoli markers turn green on a correct semantic answer and dark green
  on a miss; their countries retain contextual color.
- The Caucasus assist reduces the candidate field without identifying a
  coastline or named neighbor.
- Lakes use the Andes treatment: opaque blue surfaces and shoreline paths.
- The final reveal frames Victoria Falls and the whole of Lake Victoria together.
  Desktop and narrow viewport projection checks cover both; these are automated
  camera checks, not a rendered browser inspection.

## Remaining rendered acceptance checks

Managed browser access failed; native Chrome was being used interactively, so
UI automation was stopped. Automated scene/DOM tests are not rendered WebGL QA.
Remaining desktop and narrow/mobile checks:

- Four initial London candidates (including Ottawa), equal pickability of
  London/Chatham, named Toronto/Detroit references, and Thames assist legibility.
- Suppressed Caucasus hover names and actual polygon taps.
- Visible continuous Zambezi linework and coordinate pin input through it.
- Congo capital-label separation, both Tripolis, feedback transitions, and
  completion views with reduced motion.

Natural Earth rivers/lakes are generalized cartography, not detailed surveyed
waterfall or gorge relief. Photos are omitted. The U.S. state uses the pinned
Explore boundary, with its own labeled completion view.
