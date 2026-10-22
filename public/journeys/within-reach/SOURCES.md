# Within Reach: whole islands

Reviewed October 22, 2026. The whole-island edition visits Boston Harbor, the
Isles of Scilly, Singapore’s Southern Islands, the Hauraki Gulf and the Cyclades.
A named blue island counts only if its entire sourced shoreline fits inside the
circle. Label positions never grade answers. There are no landing markers.

## Sources and attribution

**© OpenStreetMap contributors**, [Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/):
[OpenStreetMap copyright and attribution](https://www.openstreetmap.org/copyright).
Directed coastlines and island-name features were retrieved October 21–22, 2026
through Overpass and the primary OSM map API. Per-site database timestamps,
source IDs, versions and coordinates are preserved in the
[frozen source database](osm-source.v1.json.gz).

Hauraki island names also use [GeoNames](https://www.geonames.org/), specifically
the [New Zealand export](https://download.geonames.org/export/dump/NZ.zip), retrieved
October 22, 2026, under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Name anchors were matched to OSM island footprints; the extract and its upstream
checksum are included in the frozen source bundle. The National Park Service’s
[Raccoon](https://www.nps.gov/boha/learn/historyculture/facts-racc.htm) and
[Sheep](https://www.nps.gov/boha/learn/historyculture/facts-shee.htm) factsheets
supply two supplementary Boston name anchors, preserved in the source configuration.

Public-domain Natural Earth 5.1.2 country footprints supply 1:10 million context
shores around the local fields and the bundled country geometry farther away.
The [frozen context shores](context-shores.v1.json.gz) preserve the upstream URL,
version and checksum. Download the [derived database](map-data.v1.json.gz),
distributed under ODbL 1.0 with GeoNames attribution and its CC BY 4.0 license
applying to the incorporated names.

## Island fields and transformations

All named closed islands meeting the configured area threshold in each field
are eligible. These are charted puzzle fields, rather than claims to count every
intertidal rock or the entire geographic extent of a loosely bounded archipelago.
The fields include the main inhabited islands and many smaller neighbors.
Scilly replaces Stockholm so individual whole shores remain legible.

| Field              | Named islands | Minimum area (km²) | Circle radius (km) | Maximum | Scoring counts |
| ------------------ | ------------: | -----------------: | -----------------: | ------: | -------------- |
| Boston Harbor      |            30 |              0.002 |                4.5 |      16 | 16 / 14 / 11   |
| Isles of Scilly    |            39 |              0.005 |              3.675 |      19 | 19 / 17 / 14   |
| Southern Singapore |            27 |              0.002 |                  7 |      19 | 19 / 17 / 14   |
| Hauraki Gulf       |            46 |               0.01 |               25.2 |      24 | 24 / 22 / 19   |
| Cyclades           |           134 |               0.02 |                 35 |      42 | 42 / 40 / 37   |

Singapore’s field excludes the neighboring Indonesian islands southeast across
the strait. Its local names retain Pulau Satumu and Pulau Biola rather than their
English translations. Physically joined shores share one footprint: the combined
St John’s–Lazarus shape receives one label and counts once.

Review boxes, minimum areas, aliases and supplementary name anchors live in
`sources/within-reach.locations.json`. Mainland-attached former islands,
peninsulas, clipped islands and tiny rocks remain context. For example, Boston’s
park inventory includes peninsulas, while this puzzle uses physical island shores.
Northern Aotea has an additional reviewed source box to preserve its full coast.

Preparation polygonizes directed OSM coastlines, where land lies to the left.
For each island, gnomonic projection yields an exact spherical convex hull of the
unsimplified source shore. A geodesic cap smaller than a hemisphere contains the
whole island exactly when it contains every hull vertex. These canonical hulls
and a source revision grade answers independently of rendering.

Separate display shores use topology-preserving simplification at 8–65 m in
latitude according to view scale. Eligible islands remain visible regardless of
size and are partitioned out of the background, preventing duplicate highlights.
Tiny background skerries are omitted. Shared canonical country geometry stays
unchanged. Reached detailed coastlines remain loaded during subsequent flights.
Coasts represent the source snapshot, rather than a claim about any particular tide.

## Circle benchmarks and reproduction

For every source hull vertex, the preparation script constructs a circumscribed
spherical polygon around the allowed center cap. Intersecting these gives an
outer feasible-center domain for each island. The arrangement’s maximum overlap
is an upper bound on the possible count. An independently checked exact spherical
witness must attain that bound before preparation accepts it. Interior face
samples supply three attainable count bands; each example has clearance from the
limiting shoreline. Radii are calibrated near their authored sizes to avoid
fragile maximum fits. The audit records bounds and sample margins.

Three points require the maximum count. One or two fewer islands earn two
points; three to five fewer earn one; six or more fewer earn zero. The question
panel shows only the best-possible count. Each question's result and individual
review show its exact count ranges and point symbols; the completion overview
omits the table. No zero-point cutoff message is displayed. Help caps
remain two points for a hint and one for an assist. Existing submitted metrics
and earned points remain frozen when grading bands change.

Any center achieving the count receives the same grade; the example is one best
fit rather than a location players must reproduce. Circle size stays fixed.
Only key islands have smaller, fixed-anchor labels; every eligible island can
pulse once on arrival or on request. The assist outlines three islands from one
optimal fit in gold. Circles, text anchors, pulses and assist outlines share the
shore shell to prevent close-view parallax.

Run `scripts/prepare-within-reach.py` offline with Python >=3.11, Shapely 2.1.2
and NumPy to rebuild only this Journey. It does not regenerate shared geography.
[data-audit.json](data-audit.json) and `sources/within-reach.metadata.json` record
counts, source checksums, radii, upper bounds and scoring-example clearances.

## Editorial sources

- Boston Harbor Islands Partnership: [island history and habitats](https://www.bostonharborislands.org/about-the-park/).
- Visit Isles of Scilly: [uninhabited islands](https://www.visitislesofscilly.com/explore/uninhabited-islands/).
- Singapore Land Authority: [St John’s, Lazarus and Kusu](https://www.sla.gov.sg/properties/management-of-state-land-and-property/visiting-the-sla-managed-islands).
- New Zealand Department of Conservation: [Hauraki Gulf islands](https://www.doc.govt.nz/parks-and-recreation/places-to-go/auckland/hauraki-gulf-marine-park/hauraki-gulf-islands/).
- Greek National Tourism Organisation: [the Cyclades and Delos](https://www.visitgreece.gr/islands/cyclades).
