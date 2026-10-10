# Explore data

Explore shares the mounted decorative globe with Home, Journey, and Study.
All runtime geography is local. External source links provide attribution;
the game does not fetch those pages or external geography APIs while playing.

## Data inventory

Counts and byte sizes below describe the checked-in assets on **October 10, 2026**.
These assets do not all load at startup.

| Data              | Coverage                                                             | Location/loading                                                                                         |
| ----------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| World map         | 242 Natural Earth map units; 563,784 bytes                           | [`world.v1.json`](../public/geography/world.v1.json), startup.                                           |
| Boundary manifest | 234 layers, including 232 ADM1 parent branches and New York ADM2     | [`manifest.json`](../public/geography/manifest.json), startup; child assets load on activation.          |
| Regional index    | 4,579 indexed subdivisions                                           | [`regions.v1.json`](../src/geography/data/regions.v1.json), names/IDs/hierarchy.                         |
| Country profiles  | 193 Study-roster countries                                           | [`country-info.v1.json`](../src/geography/data/country-info.v1.json), bundled.                           |
| Primary capitals  | One GeoNames record for each of 193 UN members                       | [`capitals.v1.json`](../src/game/data/capitals.v1.json), bundled.                                        |
| Major cities      | 2,234 display points                                                 | [`cities.v1.json`](../src/geography/data/cities.v1.json), bundled.                                       |
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

## Subdivisions and display geometry

Natural Earth v5.1.2 supplies the global Admin-1 coverage. Detailed U.S., Canadian,
Mexican, and Australian branches use geoBoundaries gbOpen snapshot `9469f09`.
The manifest retains per-layer provenance, checksums, sizes, and hierarchy.
Only an enabled country/child branch is fetched, with cached reuse and cancellation.

Prepared `displayGeometry` reconciles subdivision footprints with the parent map
outline. Missing cartographic edge strips are assigned to neighboring subdivisions
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

See [Development](DEVELOPMENT.md#prepared-data) for preparation order, caches,
and targeted regeneration. Rebuilding only base geography replaces the full
manifest; follow it with Explore preparation before release. Detailed licenses
and transformations live in [NOTICE.md](../NOTICE.md). Source hashes are checked
by preparation/tests; runtime loading performs structural validation rather than
cryptographic verification of every response.
