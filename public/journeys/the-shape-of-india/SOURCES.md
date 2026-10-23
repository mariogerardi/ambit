# The Shape of India — sources and data conventions

Reviewed 23 October 2026. The Journey depicts administration without deciding
sovereignty. Its frozen geometry is a gameplay reference, not an official boundary map.

## Country footprint and painting

- Natural Earth 5.1.2, bundled 1:50m country geometry: India plus the separately
  represented Siachen Glacier map unit. Natural Earth's
  [boundary policy](https://www.naturalearthdata.com/about/disputed-boundaries-policy/)
  describes its default de facto convention. Natural Earth data is public domain.
- Dispute masks come from the pinned [5.1.2 disputed-area GeoJSON](https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_10m_admin_0_disputed_areas.geojson).
  India-administered disputed areas, areas explicitly claimed by India, and Siachen
  are unscored in the painting task. The mask has a 0.08° uncertainty margin;
  the generalized country edge has a 0.07° unscored band. This does not imply that
  excluded land belongs to another state.
- Painting uses 0.2° cells, weighted by spherical surface area. All surrounding
  land is paintable; water is unscored. Detached offshore islands are omitted from
  painting penalties at this scale and remain part of the revealed footprint.
- Q2 and Q5 use the same frozen administered-country reference. The special Q1
  scoring exclusions do not remove residents from Q5. All offshore components,
  including zero-population land, remain in its population and land totals.

## Landscapes and imagery

- [National Portal of India: Physical Features](https://www.india.gov.in/explore-india/facts-of-india/physical-background/physical-features)
  supplies the physical-geography interpretation.
- [RESOLVE / Esri Ecoregions 2017](https://www.arcgis.com/home/item.html?id=37ea320eebb647c6838c23f72abae5ef),
  CC BY 4.0, supplies the underlying reviewed region polygons. The source query
  and SHA-256 are recorded in the preparation script and audit. Himalayan forest,
  alpine and rock/ice regions form a broad Indian Himalayan teaching belt. The
  Thar uses its desert ecoregion. The plain combines the Upper/Lower Gangetic
  and Terai regions with the northern Punjab/Haryana portion of Aravalli-west
  scrub (73–78°E, 29–32°N). These are broad teaching zones, not official
  physiographic boundaries or present vegetation claims.
- Zone edges gain a 0.08° tolerance, with a 0.06° country-edge tolerance for the
  mountain belt. Overlap is removed before independent labeled-pin grading.
  Nearby Nepal/Bhutan are not substitutes for locating the Indian mountain belt.
- [NASA GIBS](https://nasa-gibs.github.io/gibs-api-docs/), BlueMarble_ShadedRelief,
  WMS bounds 60°E–104°E, 2°N–42°N, 2048 × 2048. The source JPEG is land-masked
  and encoded as WebP. Question 2 uses a georeferenced crop at
  66°E–99°E, 6°N–38°N, masked to India alone. Grayscale land masks use black for
  water and white for land, with supersampled edges. The pinned
  [Natural Earth 5.1.2 lake polygons](https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_10m_lakes.geojson)
  also remove inland water from display masks, without changing frozen grading.
  The reveal-only `landscapes.png` colors the three frozen teaching-zone geometries,
  clipped to India and land, above the relief image and below submitted pins.
  Question 4 uses the standard map. Display brush disks and their
  country-mask comparison are antialiased independently of the frozen scoring
  grid. Imagery and display masks never grade answers. NASA imagery
  is used under [NASA's media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/).

## Neighbors and cities

- The six graded neighbors are Pakistan, China, Nepal, Bhutan, Bangladesh and
  Myanmar. The [Land Ports Authority of India](https://lpai.gov.in/index.php/en/genesis)
  lists seven under India's official convention, including Afghanistan. The
  administration-based question explains Afghanistan without applying a penalty.
  Siachen is a map unit, not a seventh sovereign country answer.
- [Delhi Tourism](https://delhitourism.gov.in/itinerary/golden_triangle.html)
  identifies the Delhi–Jaipur–Agra circuit. City centers come from the bundled
  [GeoNames](https://www.geonames.org/) snapshot, CC BY 4.0: Delhi 1273294,
  Jaipur 1269515, Agra 1279259. The game grades centers, not municipal extents.
- Independent spherical minimax fitting gives a minimum radius of about 125.86 km;
  the authored 200 km radius leaves room for imperfect placement. A solution is
  stored for reveal only; many centers work.
- The southern-peninsula assist uses the
  [GeoNames Kanniyākumāri reference](https://sws.geonames.org/1268008/about.rdf),
  8.09008°N, 77.53841°E, rather than a guessed city coordinate. The other painting
  assist references use bundled GeoNames centers: Amritsar 1278710, Mumbai
  1275339, Kolkata 1275004 and Guwahati 1271476. None reveals a Golden Triangle city.

## Population and redistribution

[WorldPop India 2025, R2025A v1](https://hub.worldpop.org/geodata/summary?id=77679)
provides constrained counts at 30 arc-second resolution (approximately 1 km),
DOI [10.5258/SOTON/WP00840](https://doi.org/10.5258/SOTON/WP00840).
This frozen alpha product is a modeled estimate, not a census.

Citation: Bondarenko M. and colleagues (2025), _Constrained estimates of 2015–2030
total number of people per grid square at a resolution of 30 arc (approximately
1 km at the equator), R2025A version v1_, WorldPop, University of Southampton.

Positive source pixels are clipped at their original centers, then aggregated
once into 10 km cylindrical equal-area cells. Country-clipped cell areas are
calculated separately; zero-population land remains in the grid. Source and
clipped totals differ because the fixed administered reference and the source
raster footprint differ. The audit records both totals; the game consistently
uses the retained total rather than a separate official population statistic.

Density imagery divides each cell's counts by its clipped land area, with a
logarithmic scale capped at 5,000 people/km². The evaluator sums counts, never
colors. A great-circle half-plane partitions every retained cell, including
offshore islands, regardless of where its two mainland-boundary handles lie.
The frozen 10 km grid uses cell-center assignment; it does not claim exact
household-level splits. Independent source-resolution checks cover multiple
orientations; their numerical errors are in `data-audit.json`.

WorldPop supplies CC BY 4.0 attribution and specifies ODbL obligations for
datasets derived from OpenStreetMap/building footprints. The derived
[India geometry and population database](india-model.v1.json) is distributed
under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/), retaining
WorldPop's source attribution and applicable upstream rights.

## Reproduction and limits

Run `scripts/prepare-india-journey.py` with its documented Python environment.
It downloads only missing explicit inputs, checks frozen hashes, writes these
Journey-local assets and `src/game/data/india-journey.v1.json`, and never rebuilds
shared catalogs. Pass `--display-only` to refresh just the masks and relief
imagery without rewriting frozen scoring inputs. `data-audit.json` records hashes, excluded disputes, conservation
of population/area, circle feasibility, and coarse-versus-source cut comparisons.
Automated numerical checks do not establish touch precision or rendered clarity;
those remain player-review checks.
