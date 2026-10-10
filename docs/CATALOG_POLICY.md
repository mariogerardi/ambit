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
56 entries including territories; Explore and state-based Journey questions
restrict the indexed state set to 50 states and Washington, D.C.

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
containing region; they do not imply a globally available city polygon.
Geographic adjacency means shared boundary edges, not point contact or permission
to cross a border. Simplified geometry and source territorial conventions constrain
all calculations and need review for ambiguous new questions.

See [Explore data](EXPLORE_DATA.md), [question authoring](QUESTION_CATALOG.md),
and [attribution](../NOTICE.md) for source-specific scope and maintenance.
