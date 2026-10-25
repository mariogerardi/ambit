# Explore data

Explore shares the mounted decorative globe with Home, Journey, and Study.
All runtime geography is local. External source links provide attribution;
the game does not fetch those pages or external geography APIs while playing.

## Data inventory

Counts and byte sizes below describe the checked-in assets on **October 22, 2026**.
These assets do not all load at startup.

| Data              | Coverage                                                             | Location/loading                                                                                         |
| ----------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| World map         | 242 Natural Earth map units; 2,074,376 bytes                         | [`world.v1.json`](../public/geography/world.v1.json), startup.                                           |
| Boundary manifest | 234 layers, including 232 ADM1 parent branches and New York ADM2     | [`manifest.json`](../public/geography/manifest.json), startup; child assets load on activation.          |
| Regional index    | 4,579 indexed subdivisions                                           | [`regions.v1.json`](../src/geography/data/regions.v1.json), names/IDs/hierarchy.                         |
| Country profiles  | All 242 map units, with source-dependent field coverage              | [`country-info.v1.json`](../src/geography/data/country-info.v1.json), bundled.                           |
| Primary capitals  | One GeoNames record for each of 193 UN members                       | [`capitals.v1.json`](../src/game/data/capitals.v1.json), bundled.                                        |
| Major cities      | 2,234 shared display points; 2,506 Explore city/capital entities     | [`cities.v1.json`](../src/geography/data/cities.v1.json), bundled.                                       |
| Physical features | Rivers, ranges, deserts/landforms, and marine names; 2,508,063 bytes | [`physical.v1.json`](../public/geography/physical.v1.json), fetched on first activation.                 |
| Flags             | 193 local country SVGs plus authored clue artwork                    | [`flags metadata`](../sources/flags.metadata.json) and [`quiz metadata`](../sources/quiz.metadata.json). |
| Language labels   | English expansions for every country-info language tag               | [`language-names.v1.json`](../src/geography/data/language-names.v1.json), bundled.                       |

The detailed U.S. asset has 56 source units and is 1,024,960 bytes; the state set
used by questions distinguishes 50 states plus D.C. New York's 62 counties occupy
180,952 bytes. Counts refer to source catalog entries, not a universal definition
of countries or administrative levels. See [catalog policy](CATALOG_POLICY.md).

## Country details and names

GeoNames `countryInfo.txt` supplies area, population, currency, and reported
languages. Natural Earth supplies continent/subregion names. **Population is an
undated source estimate**: download/snapshot date does not imply a census year.
City populations describe source places, not comparable metropolitan areas.
They determine display prominence, not a reliable global population ranking.

Explore profiles and search cover the full map catalog independently of the
193-country Study roster. Search also includes selectable subdivisions in the
currently loaded regional branch and matches their aliases. Where GeoNames has no matching independent profile,
Natural Earth supplies geographic context and, when available, a population
estimate with its source year. Missing fields are omitted. Non-roster capital
strings are labeled **Listed capital**, with a note explaining source conventions;
they do not assert an administrative seat or resolve disputed status. Shared ISO
seeds never copy a parent country's profile into a separate map unit.
`npm run prepare:profiles` updates profiles and language names from checksum-checked
local inputs without regenerating geography.

Explore uses **Country / territory** as a shared heading, independently of quiz
eligibility. Profile richness reflects source coverage: Jersey has its own
GeoNames country-info record, while Somaliland uses the more limited Natural
Earth fallback. Expanding a fallback profile requires separately reviewed sources;
it must not inherit another map unit's facts.

GeoNames language tags describe reported spoken languages, not official status.
Reviewed official-language facts in [`quizData.ts`](../src/game/quizData.ts) have
separate limited coverage and take precedence where applicable. Missing official
facts must not be interpreted as a negative classification.

Bundled language names avoid runtime browser differences between two- and
three-letter codes. Preparation retains regional qualifiers and source group
names, combining the pinned GeoNames ISO list with preparation-time English
locale names. Metadata is in [`languages.metadata.json`](../sources/languages.metadata.json).

Capital snapshots retain one primary GeoNames capital per eligible country,
excluding secondary governmental seats. Source conventions, including disputed
Jerusalem, are retained explicitly; this is not adjudication of constitutional
capital roles. Authored questions involving multiple seats need reviewed facts.

Explore has a separate city selection catalog in the same city snapshot. Its
2,506 entities cover the full map catalog where pinned GeoNames records are
available, including 233 matched capital relationships. A profile's capital name
becomes clickable only after an unambiguous populated-place match; an explicitly
listed city district retains its district label. Missing matches stay plain text.
The original 193 quiz capitals and shared major-city pool remain unchanged.

Explore city parents follow containment in the checksum-pinned Natural Earth
source, with a valid source-country fallback for coastal coordinates outside
its generalized coastline. Existing/source capital relationships take precedence
at generalized border points. Kosovo's GeoNames `XKX` code explicitly maps to its
stable `wurl:NE-KOS` identity. Hargeysa and Borama belong to Somaliland's Explore
listing while retaining Somalia as their GeoNames source grouping. City cards
explain differing source groupings rather than silently discarding them. These
are catalog conventions, not sovereignty determinations.

Capital and major-city buttons open a city card and frame its point; visible
map markers open the same card. Cards show source capital roles, population
estimates with scope qualifications, coordinates, and GeoNames attribution.
**Back to country/territory** restores the country card and its framing. City
framing uses a wider regional view around the selected point. The
selected city's marker and name remain visible even with contextual city layers
off; the containing country becomes reference context. New country selections
and mode changes clear the city selection. No city polygons are invented.

`python3 scripts/prepare-cities.py` (using the interpreter reported by
`check:env`) invokes the offline Node helper `prepare-explore-cities.mjs` after
checking the cached GeoNames inputs. Preparation updates city data and metadata
only; it does not regenerate geography, change quiz rosters, or fetch runtime data.

## Subdivisions and display geometry

Natural Earth v5.1.2 supplies the global Admin-1 coverage. Detailed U.S., Canadian,
Mexican, and Australian branches use geoBoundaries gbOpen snapshot `9469f09`.
The manifest retains per-layer provenance, checksums, sizes, and hierarchy.
Only an enabled country/child branch is fetched, with cached reuse and cancellation.

Country `displayGeometry` retains 75% of the pinned source detail using weighted
simplification with shape preservation. Canonical answer geometry retains the
existing 16% setting. Subdivision display footprints are reconciled against the
denser country outlines. Missing cartographic edge strips are assigned to neighboring subdivisions
and merged; complete branches can replace the parent backing surface. This avoids
false extra regions and doubled exterior outlines while retaining canonical
source geometry for answers.

U.S. and Canadian display land excludes the five Great Lakes using the checked-in
[`great-lakes.geojson`](../scripts/great-lakes.geojson) subset of Natural Earth
v5.1.2 1:10m lakes. The same masking flows into descendants, including Michigan
and New York counties. Water masking is display-only; it does not redefine legal
jurisdictions. Small regions remain generalized and should be reviewed at close zoom.

## Physical features and place display

Rivers use the finer Natural Earth 1:10m centerlines. Physical landforms combine
1:10m and 1:110m geography-region sources; marine anchors use 1:110m marine regions.
The exact inputs are in [`explore-checksums.json`](../sources/explore-checksums.json).
These are cartographic context, not automatic country-membership facts.
Reviewed Andes, Danube, and other question sets remain separate.

Physical snapshots carry a content revision, validated against bundled metadata
and used in local fetch URLs. River drawing and label visibility use importance
and zoom. Large landforms have alternate regional anchors. Country, capital,
major-city, and physical labels use visibility/overlap budgets; hidden or culled
labels are not missing source records. Authored answer markers can bypass ordinary
context filtering, including capital feedback with hints disabled.

## Views and preparation

Country search/taps select and frame a country. **Zoom to country** and **Zoom to
region** reframe it; **Clear selection** clears the selection state. Independent
settings control names, markers, subdivisions, and physical context. **Make this
my default view** stores orientation/zoom locally; active question framing and
Study scope take precedence over an unrestricted default view.

Small map units receive anonymous rings when their projected land area is too
small to read. Rings accept direct map selection, with larger touch targets, and
disappear as zoom makes the land readable. They honor eligibility, hidden-name
rules, the horizon and question-panel occlusion. Feedback rings retain outcome
colors even when selection is disabled. Coordinate and construction inputs do
not receive these country-selection affordances. Nearby targets can be separated
by zooming in; rings never alter canonical geometry or grading.
Ordinary rings are thin and subdued, roughly 6 pixels across at wide zooms and
up to 11 pixels as the camera approaches. Selected and feedback rings are slightly
larger and stronger. Touch hit areas remain generous independently of visible
size. Foreshortening at the horizon does not by itself qualify a broad country
for a small-place locator. Screen annotations project on the globe’s own render
frame after camera matrix updates, keeping rotation, damping, flyovers and mobile
resizes synchronized. Context city dots use smaller symbols than authored game
targets, with a modest size distinction for large cities.

Ordinary country fills use a committed six-color assignment based on shared
boundary edges in the shipped world geometry, including enclave holes; point
contacts do not count. `npm run prepare:map-colors` updates this assignment
without changing geography. Geography preparation also refreshes it. Semantic
selection, context and feedback colors take precedence over base map colors.

See [Development](DEVELOPMENT.md#prepared-data) for preparation order, caches,
and targeted regeneration. Rebuilding only base geography replaces the full
manifest; follow it with Explore preparation before release. Detailed licenses
and transformations live in [NOTICE.md](../NOTICE.md). Source hashes are checked
by preparation/tests; runtime loading performs structural validation rather than
cryptographic verification of every response.
