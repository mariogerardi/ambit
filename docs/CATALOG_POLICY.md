# Geographic catalog policy

## Map units and playable countries

Explore exposes **242 map units** from Natural Earth 5.1.2's 1:50m Admin-0 asset.
They include dependent territories and disputed units. This is an inspection
catalog, not a statement that there are 242 sovereign countries.

Study and country-name questions use a separate explicit roster of **193 UN
members** in [`un-members.v1.json`](../src/game/data/un-members.v1.json).
Journey questions can deliberately use a different reviewed set, such as prepared
subdivisions, but must state the relevant convention. Do not infer eligibility
from renderer feature types, ISO codes, or whatever happens to be highlighted.

Natural Earth geometry and source classifications are retained without silently
merging dependent/disputed map units into their sovereign parent. The
[`catalog mapping`](../sources/catalog-mapping.json) preserves source `NE_ID`,
ADM0 code, ISO seed, sovereign name, classification, and boundary notes separately
from Ambit's identity. Display names and IDs do not assert political status.

## Stable identities

World IDs use the snapshot's `ISO_A3_EH` when unique, or for the matching primary
ADM0 unit. Other units use `wurl:NE-<ADM0 code>`:

| ID            | Map unit                                     |
| ------------- | -------------------------------------------- |
| `wurl:NE-CYN` | Northern Cyprus                              |
| `wurl:NE-KAS` | Siachen Glacier                              |
| `wurl:NE-KOS` | Kosovo, without an ISO seed in this snapshot |
| `wurl:NE-SOL` | Somaliland                                   |
| `wurl:NE-ATC` | Ashmore and Cartier Islands                  |
| `wurl:NE-IOA` | Indian Ocean Territories                     |

The last two share the source ISO seed `AUS` with Australia; independent IDs avoid
replacing its feature. Western Sahara, Taiwan, and Palestine retain their own
source metadata and geometry too.

Subdivision IDs are established during preparation, not inferred from display
names at runtime. U.S. geoBoundaries IDs map to subdivision-derived IDs such as
`wurl:USA-NY`; New York counties use committed county-FIPS mappings. Queens source
ID `52423323B86897144494159` maps to `wurl:USA-NY-36081`. The U.S. source layer has
56 entries including territories. Explore indexes 50 states and Washington, D.C.;
the `US_STATES` Journey pool contains the 50 states only. D.C. is classified as a
federal district, not a state. Include it explicitly when a reviewed task calls
for the broader set; never infer the Journey pool from the source layer count.

The worldwide regional catalog combines Natural Earth and detailed geoBoundaries
branches. The [manifest](../public/geography/manifest.json) specifies available
layers and parents; [`regions.v1.json`](../src/geography/data/regions.v1.json)
indexes names and hierarchy. The current loader accepts ADM0–ADM5, while shipped
layers cover ADM0, ADM1, and New York ADM2. A local label such as county does not,
by itself, establish an administrative level.

Review ID mappings when changing a source snapshot. Never regenerate identities
from feature order or mutable names: saves, authored questions, parent references,
and caches depend on them. The original bootstrap mapping generator is not an
authority for replacing committed mappings.

## Geometry and places

WGS84 GeoJSON coordinates use `[longitude, latitude]`. App camera/point objects
use named `lat`/`lng` fields. Preserve multipart and antimeridian geometry.
Canonical `geometry` drives answer validation and connectivity; `displayGeometry`
is an optional cartographic footprint. Parent reconciliation and Great Lakes
masking improve the map without changing jurisdictional grading geometry.

Camera framing fits geometry and permitted clue/scope, rather than assuming the
focus point is a legal centroid or correct answer. Point places may reference a
containing region; they do not imply a globally available city polygon. Area-name
anchors use labels without invented city dots. Area response symbols use a
cached interior point and clearance derived from display geometry; this does
not change grading or camera framing. See the
[visual grammar](JOURNEY_CRAFTING.md#5-give-the-globe-purposeful-question-state-information)
for shared representation and lifecycle rules.
Geographic adjacency means shared boundary edges, not point contact or permission
to cross a border. Simplified geometry and source territorial conventions constrain
all calculations and need review for ambiguous new questions.

Shared Neighbors includes exclave and overseas border relationships by default.
Its optional mainland filter builds an eligibility graph from each country's
largest land component, retaining all components for Indonesia and Malaysia so
their ordinary archipelagic borders remain eligible. Canonical geometry still
grades pins. Country exclusions remove clues and answers from the puzzle pool;
Missing Borders exclusions remove prospective merged members, while surrounding
map context remains visible. Missing Borders region filtering uses the physical
shared boundary's nearest bundled capital continent, so overseas borders follow
their local region rather than the sovereign country's capital.
That continent also bounds the selectable answer pool for each round. Regional
search further narrows the eligible countries to the local view; continent-wide
search includes that continent's countries and territories. Country membership
uses the bundled capital continent, with nearest-capital fallback for territories
and Greenland assigned to North America. Point checks prevent remote components
of a composite from accepting selections outside the round's search area.

Missing Borders excludes small merged members by default. This is a geometric
size rule, not a political classification of “micronations”: countries with less
than 2,500 km² of canonical spherical area are excluded from merged answers.
Luxembourg remains eligible. Surrounding small territories may still appear as
context and selectable distractors. Players can disable the filter.

Border Run uses eligible countries only, including as transit nodes. Its topology
tracks each connected polygon component separately, so a route cannot jump between
peninsular Malaysia and Borneo, between Indonesian islands, or between metropolitan
France and French Guiana. Exclusions remove every component of the country before
shortest-path computation. Unreachable and directly adjacent pairs are omitted.
Reveals number real shared-edge crossings, with a pulse at the final crossing.
The interior corridor is retained for camera fitting; it is not drawn on the map.

Pinpoint uses the existing GeoNames/capital snapshots, a curated 60-landmark
Wikidata coordinate snapshot, canonical country geometry and bundled US-state
geometry. Each landmark retains its source entity and revision. The 58 locally
bundled Commons photos retain individual credits and licenses in
`public/minigames/pinpoint/SOURCES.json`, including reviewed corrections where
metadata confuses a photograph's license with that of the depicted building.
`scripts/prepare-pinpoint.py` prepares only that minigame catalog. Point locations
score distance; countries and states score containment, never distance to an
arbitrary centroid. Categories are randomized, then countries are drawn before
places, with repeat-country avoidance where possible. Places repeat only after
the selected category's pool is exhausted. No live image or location API is used
by the game. All four minigame previews use map illustrations drawn from the
bundled geographic geometry.

See [Explore data](EXPLORE_DATA.md), [question authoring](QUESTION_CATALOG.md),
and [attribution](../NOTICE.md) for source-specific scope and maintenance.
