# Ambit attribution and source notices

This file records provenance and transformations for the shipped assets. The
current product uses decorative geography; the Earth JPEG and hand-entered demo
point below remain legacy assets. Preserve original source notices and this file
when redistributing. The full file is not automatically copied by Vite; see
[Release readiness](docs/RELEASE_READINESS.md#static-hosting-contract) for the
publication handoff and [Explore data](docs/EXPLORE_DATA.md) for current scope.

## Fonts

Newsreader by Production Type and Manrope by Mikhail Sharanda are distributed by
[Google Fonts](https://github.com/google/fonts) under the SIL Open Font License
1.1. The locally hosted variable WOFF2 fonts cover Latin and Latin Extended;
Newsreader includes its true italic and optical-size axis. Font files and their
original license notices are in `public/fonts/`. Manrope Bold is used for
the wordmark.

The application credits these sources in **World credits**. Keep those credits when redistributing the application and retain this file with the assets.

## Earth texture

Earth Day Map, 2K, by **Solar System Scope / INOVE**, based on NASA imagery. Source: https://www.solarsystemscope.com/textures/. Download: https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg.

Licensed under **Creative Commons Attribution 4.0 International**: https://creativecommons.org/licenses/by/4.0/ (legal text: https://creativecommons.org/licenses/by/4.0/legalcode). Redistribution and adaptation are permitted with attribution and license notice. The shipped JPEG is unchanged. Its snapshot, SHA-256, size, and attribution are recorded in `sources/texture.metadata.json`.

## World boundaries

**Made with Natural Earth**, version **5.1.2**, 1:50m Admin-0 countries. Natural Earth releases its vector and raster data into the **public domain**: https://www.naturalearthdata.com/about/terms-of-use/.

Exact input: https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_countries.geojson. The Natural Earth GitHub repository is maintained by a Natural Earth contributor and publishes the project’s release snapshots.

Transformations: Mapshaper topology-aware weighted simplification retaining 16% of vertices with `keep-shapes`; coordinate rounding to 0.00001°; source properties extracted to the canonical mapping; source geometry converted into WURL region records; camera focus derived with curated demo centers. All 242 map units remain present.

## Journey time-zone map

The transparent completion map in `public/geography/time-zones.v1.png` is a
Produced Work derived from **Timezone Boundary Builder 2026e**, using
**© OpenStreetMap contributors** boundary data under the **Open Database License
(ODbL) 1.0**: https://opendatacommons.org/licenses/odbl/1-0/.
Source archive:
https://github.com/evansiroky/timezone-boundary-builder/releases/download/2026e/timezones-with-oceans-now.geojson.zip.
Original source data is available at that link; a copy of the database license
ships in `public/geography/time-zones.LICENSE.txt`.

Standard UTC offsets use the public-domain **IANA tzdb 2026e** rules:
https://data.iana.org/time-zones/releases/tzdata2026e.tar.gz. The map subtracts
seasonal DST from offsets at 2026-10-12T12:00:00Z; it is an illustrative standard-time
overview, not a live clock or a legal boundary service. China's official UTC+8
footprint takes precedence over the source's overlapping unofficial Xinjiang time.

Transformations: repair invalid source polygons; simplify at 0.035° with topology
preserved; dissolve by standard UTC offset on a 0.001° precision grid; rasterize translucent fills and thin
outlines to a 4096×2048 equirectangular PNG. Source and asset checksums, size,
offset checks and transformations are in `public/geography/time-zones.metadata.json`.
`scripts/prepare-time-zone-map.py` reproduces the map offline using Pillow and
Shapely with the pinned archive and compiled IANA zones. It does not modify the
canonical country or grading data. Samoa's reveal-only boundary is extracted from
the same source's shared UTC+13/UTC−11 boundary, retaining the eastern arc near the
islands. Its derivative coordinates and attribution ship under ODbL 1.0 in
`public/geography/samoa-time-zone-line.v1.json`.

## U.S. boundaries

**geoBoundaries gbOpen**, William & Mary GeoLab and community contributors. https://www.geoboundaries.org/. geoBoundaries distributes its database under **CC BY 4.0**: https://creativecommons.org/licenses/by/4.0/. The underlying U.S. Census Bureau MAF/TIGER inputs are **public domain**, as recorded by the dataset metadata. These are distinct source and distribution licenses.

Citation: Runfola, D. et al. (2020), _geoBoundaries: A global database of political administrative boundaries_. PLoS ONE 15(4): e0231866. https://doi.org/10.1371/journal.pone.0231866.

Pinned geoBoundaries repository snapshot **9469f09**, boundaries representing **2018**, build December 12, 2023:

- ADM1: `USA-ADM1-66186276`, 56 states, D.C., and territories. Exact input: https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/USA/ADM1/geoBoundaries-USA-ADM1.geojson.
- ADM2: `USA-ADM2-52423323`, 3,233 source county equivalents. Exact input: https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/USA/ADM2/geoBoundaries-USA-ADM2.geojson.

Transformations: ADM1 topology-aware weighted simplification retaining 5% of vertices with `keep-shapes`. ADM2 representative points spatially filtered against the source New York geometry; the resulting 62 source IDs recorded in the committed mapping; then those 62 polygons simplified together, retaining 60% of vertices with `keep-shapes`. Both layers rounded to 0.00001°. Source names/IDs mapped separately to canonical IDs; Queens is `wurl:USA-NY-36081`. Original metadata and SHA-256 hashes are retained in `sources/`.

## City point

The New York City demo point (40.7128, −74.0060) is a hand-entered illustrative location in Lower Manhattan, not a legal city centroid or imported city boundary. Its catalog ID is `wurl:place:NYC`, its source ID is `curated:NYC`, and its containing-region reference is New York. This legacy illustrative point is separate from the GeoNames display catalog below.

## Capitals, language labels, and clue flag

Explore's bundled English language labels use the GeoNames ISO language-code list
(CC BY 4.0), downloaded October 7, 2026:
https://download.geonames.org/export/dump/iso-languagecodes.txt.
Preparation expands codes with English display names and retains source names for
languages and groups not covered by the preparation runtime's locale data.
The exact input checksum is recorded in `sources/languages.metadata.json`.

**GeoNames** supplies the bundled primary capital coordinates and spelling aliases in
`src/game/data/capitals.v1.json`, licensed under **CC BY 4.0**:
https://www.geonames.org/ and https://creativecommons.org/licenses/by/4.0/.
The GeoNames `cities15000.zip` and `countryInfo.txt` exports were downloaded on
2026-10-05; their exact URLs and input checksums are recorded in the snapshot.
Transformations: retain one primary capital record for each of the 193 UN members,
map country codes to WURL IDs, retain Latin-script aliases, and extract coordinates.
Secondary governmental seats are excluded. Source conventions for capitals,
including disputed Jerusalem, are retained rather than adjudicated. This is a
quiz snapshot, not a statement about constitutional capital roles.

The Canadian flag artwork in `public/flags/clue-01.svg` is the **public-domain**
Wikimedia Commons SVG at https://commons.wikimedia.org/wiki/File:Flag_of_Canada.svg.
Its embedded title was removed to avoid identifying the answer before submission;
the artwork is unchanged. Asset checksums and sizes are in `sources/quiz.metadata.json`.
Country relationships for languages and physical features are separately authored
from the government, UNEP and ICPDR references linked in `src/game/quizData.ts`.

## Explore subdivisions and geographic features

Natural Earth **v5.1.2** (public domain) supplies the global Admin-1 catalog,
1:10m rivers, mountain ranges, deserts, basins, plains and plateaus, and ocean/sea
labels. geoBoundaries gbOpen snapshot **9469f09**, CC BY 4.0, supplies the detailed
U.S., Canadian, Mexican and Australian branches. Input URLs, checksums and sizes
are retained in `sources/explore-checksums.json`; each local boundary asset's
checksum and attribution are retained in `public/geography/manifest.json`.
`scripts/prepare-explore.mjs` simplifies polygons with shared topology, normalizes
source naming/identifiers (including Mexico City), and creates alternate label
anchors inside large physical regions. These are generalized cartographic
features, not precise boundaries of physical landforms. Country layers are split
for local, on-demand loading. No runtime external geography API is used.
`scripts/prepare-regional-display.mjs` also generates display-only footprints
clipped to the parent map outline. Border samples and a Voronoi partition assign
missing cartographic edge strips to adjacent subdivisions, then dissolve them
into their display footprints. These reconciled outlines are generalized display
geometry; original source geometry is retained for geographic calculations.
Mapshaper and d3-delaunay are used only during local data preparation.

## Great Lakes display masking

The checked-in `scripts/great-lakes.geojson` subset comes from Natural Earth
v5.1.2 **1:10m lakes**, public domain. Exact source:
https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_lakes.geojson.
The five Great Lakes are removed from the U.S. and Canadian **display** land
footprints, then carried through reconciled subdivisions and New York counties.
Canonical source geometry remains unchanged for grading and connectivity.
`scripts/lake-display.mjs` performs this display transformation as part of
regional preparation; the world manifest records the display-water source.

## Software dependencies

Dependency versions and their transitive packages are pinned in `package-lock.json`. React, Vite, Three.js, and react-globe.gl use permissive software licenses; retain the applicable dependency notices when distributing a bundled application. Mapshaper is used only at build time. No geography or imagery is fetched from third-party hosts at runtime.

## Local Study flag catalog

The 193 Study flag assets in `public/flags/study/` come from
[Accurate country flags](https://github.com/hampusborgos/country-flags), pinned to
commit `c09927e63705529bbf59ca6684cd9b23225dddad`. The source project describes these
Wikimedia Commons flag artworks as public domain. Its original notice is retained
in `sources/flags-source-README.md`.

Native SVG width, height and viewBox are preserved, including Nepal's nonrectangular
flag. Embedded titles, descriptions, metadata, and accessibility labels are removed
from clue assets to avoid disclosing answers. Exact input URLs, input and output
SHA-256 checksums, and native dimensions are recorded for each asset in
`sources/flags.metadata.json`. `scripts/prepare-flags.py` reproduces the catalog;
it is a preparation tool only. No flag, capital, or geography API/CDN is used at runtime.

## Major-city display catalog

**GeoNames**, CC BY 4.0 (https://www.geonames.org/ and
https://creativecommons.org/licenses/by/4.0/), supplies 2,234 local major-city
points and population estimates for the 193 existing primary-capital points.
`src/geography/data/cities.v1.json` is derived from the same checksum-pinned
2026-10-05 `cities15000.zip` / `countryInfo.txt` snapshot used for capitals.
`sources/cities.metadata.json` records exact input URLs, SHA-256 checksums, the
output checksum, byte count, and selection policy. `npm run prepare:cities`
rebuilds it from verified cached inputs without network requests.

We retain populated places PPL/PPLA/PPLA2/PPLA3/PPLA4 in eligible countries with
at least 250,000 source population, plus each country's largest non-primary-capital
place where it has at least 15,000. Neighborhoods and historical/abandoned places
are excluded; primary capital IDs are excluded from cities to avoid duplicate
symbols. City and display-capital names preserve the Unicode source name in NFC form. Source population values are
place estimates, not uniform metropolitan-area populations or a ranking of
urban areas; they are used only to determine display prominence. Snapshot
coverage and accuracy remain those of the source. No live city API is used.

## Seventh daily puzzle facts and geometry

`src/game/seventhJourney.ts` stores reviewed naming relationships with links to
New Zealand's Te Ara encyclopedia, the Spanish Geographical Society's account
quoting Ortiz de Retes's letters, the U.S. Census Bureau and National Park Service,
the New Jersey Legislature, and Mexico's Secretariat of Public Education and
Postal Service. The Guinea clue distinguishes the historical African coastal
region from today's sovereign country. The León clue asks for the current
province, rather than displaying an invented historical kingdom boundary.

`src/game/data/name-origins.v1.json` is a three-region subset of the same pinned
Zeeland, Nuevo León, and León geometry used in Explore. Attribution and canonical
geometry remain intact; `scripts/name-origins.mjs` refreshes this subset during
regional preparation. U.S. state geometry is shared with the fifth puzzle.
Gameplay uses local definitions and assets without fetching these source pages.

## Sixth daily puzzle facts and geometry

`src/game/sixthJourney.ts` records reviewed sources from the Government of
Lesotho, Saint Petersburg regional geography research, Brunei Tourism, the
Australian Government, and the Council of Europe. Source pages are not fetched
at runtime. `src/game/data/enclosed-territories.v1.json` is a six-region subset
of the pinned Natural Earth regional assets, preserving attribution, canonical
geometry, and their reconciled display footprints. Regional preparation refreshes
this subset through `scripts/enclosed-territories.mjs`.

## Mediterranean Journey facts and canal geometry

Reviewed sources in `src/game/fourthJourney.ts` include Visit Gibraltar, Sicily’s
official tourism brochure, pinned GeoNames city records, the UN ICTY six-republic
reference, the European Commission’s Adriatic–Ionian regional reference, Neum’s tourism board, and the
Suez Canal Authority. Sources appear after submission and are not fetched at runtime.

`src/game/data/mediterranean-map.v1.json` preserves the three existing Suez Canal
centerline segments from Natural Earth **v5.1.2** 1:10m rivers/lake centerlines
(public domain). It records the input URL and SHA-256 from
`sources/explore-checksums.json`; no artificial segment connects gaps. The data
is display-only and is withheld until the pin reveal. Pin grading uses the
pinned GeoNames Port Said gateway coordinate, not the drawn canal geometry.
Neum’s label uses reviewed GeoNames coordinates (42.923333, 17.615556); source
names and city display styling do not alter country grading geometry.

Earlier regional-language and Mediterranean-country-count facts in
`src/game/quizData.ts` retain their Spain ministry, UNEP/MAP and UNRWA source
references, but are no longer questions in this Journey.

The enlarged sun detail in `public/flags/clues/sun-detail-01.svg` uses the same
Uruguay flag artwork as `public/flags/study/flag-186.svg`, cropped by its SVG
view box. The original flag artwork’s attribution and license also apply.

The Chasing the sun motif comparisons in `public/flags/clues/sun-*.v1.svg` retain
the reviewed flag artwork's paths and internal references. Source view boxes
isolate the suns or a single Kazakhstan ray; unrelated stripes/ornaments are
omitted where appropriate, with plain source-colored backgrounds. Malawi's crop
retains the original rising-sun horizon. These are detail views, not alternative
national flag designs. `scripts/prepare-sun-details.py` prepares them locally;
`sources/sun-details.metadata.json` records source/output hashes, crop bounds,
transformations, and the source public-domain notice. The full flags remain
available alongside the detail views.

## Danube Journey river route

**© OpenStreetMap contributors**, licensed under the **Open Database License
(ODbL) 1.0**: https://www.openstreetmap.org/copyright and
https://opendatacommons.org/licenses/odbl/1-0/.
The reviewed snapshot of Danube relation **89652**, version **420**, was retrieved
on October 11, 2026 from
https://api.openstreetmap.org/api/0.6/relation/89652/full.json.

`public/geography/danube-route-source.v1.geojson` is the downloadable source subset:
main-stream member ways joined only at identical source node IDs, with connected
Tulcea, Sulina, and Sfântu Gheorghe distributary reaches. Source coordinates are
unchanged. Way IDs and versions accompany each feature; input/output checksums
and provenance are recorded in `sources/danube-route.metadata.json`.

`scripts/prepare-journey-map-context.mjs` splits the connected route into itinerary
stages and simplifies it by retaining source vertices, preserving stage endpoints,
branch junctions, and actual river mouths. It also extracts local Rhine context
and the Black Sea label from the reviewed Natural Earth public-domain snapshot.
No connections are fabricated. The derived database is available under **ODbL
1.0** at `/geography/danube-context.v1.json`, identical to the bundled
`src/game/data/danube-context.v1.json`. The application attributes OpenStreetMap
beside the Journey map and links the downloadable data in World credits.
The two-bank feedback diagram is explicitly schematic, not sourced urban geometry.

## Andes Journey physical context

`src/game/data/andes-context.v1.json` extracts the Andes and Altiplano extents,
Lake Titicaca shoreline, and summit coordinates from **Natural Earth v5.1.2**,
public domain. Source URLs and SHA-256 checksums are embedded in the asset.
`scripts/prepare-andes-context.py` retains source vertices rounded to four decimal
places; mountain footprints are generalized extents, not precise ridgelines.
The northern display uses the main Andes extent south of 8°N plus the separately
sourced Cordillera de Mérida footprint, excluding the Venezuelan Coastal Range
from this Journey's Andean convention. Clipping intersections are retained.
Chile’s frontier highlights use only shared edges of the bundled canonical
country geometry. These display-only features never change country picking
or grading.

## Andes mountain hatching

`src/game/data/andes-relief.v1.json` is derived from Mapzen/Tilezen Terrain Tiles
on AWS, accessed October 11, 2026. Global GMTED2010 and SRTM elevation data are
courtesy of the U.S. Geological Survey; ETOPO1 data are from DOC/NOAA/NESDIS/NCEI,
National Centers for Environmental Information, U.S. Department of Commerce.
These U.S. government data are not subject to copyright protection within the
United States. Attribution and source terms are documented at
<https://github.com/tilezen/joerd/blob/master/docs/attribution.md>.

`scripts/prepare-mountain-relief.py` generalizes zoom-5 elevation tiles and uses
spaced regional high points to anchor joined pictorial mountain forms, shaded
faces and attached hatching within the reviewed Andes extent. Symbols are scaled
to 85% of their initial size. An optional whole-symbol clearance around Titicaca
uses its reviewed shoreline plus a 0.08-degree display margin and tests shaded
faces as well as ink. North-up pictorial occlusion clips rear faces and strokes
behind southern foreground silhouettes. Lake clearance is applied only
when the lake is the authored focal feature. Pale faces do not
denote permanent snow. These are cartographic symbols, not exact summit outlines,
surveyed ridgelines or navigation data. Source tile URLs, SHA-256 hashes,
processing conventions, and the derived asset hash are recorded in
`sources/andes-relief-manifest.json`. Raw elevation stays in the preparation cache;
play uses bundled vector ink without live terrain requests.

Ecuador summit choices for Cotopaxi, Cayambe and Antisana are supported by
Smithsonian Institution’s Global Volcanism Program (volcano numbers 352050,
352006 and 352030), reviewed October 11, 2026. Each round includes source links;
Chimborazo’s revealed marker retains its Natural Earth coordinate.

## Tierra del Fuego colony photograph

`public/journeys/andes/king-penguin-colony.v1.jpg` is **Gillermo Adolfo**'s
photograph of the wild king-penguin colony at Bahía Inútil, taken April 24, 2016,
licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
The image uses Wikimedia Commons' existing crop and 960-pixel thumbnail; Ambit
makes no further image edits. The reveal displays the photographer, source and
license links. Source:
[Wikimedia Commons file page](https://commons.wikimedia.org/wiki/File:Pinguinos_Rey,_Parque_del_mismo_nombre,_bahia_inutil_,Tierra_del_Fuego_-_panoramio.jpg).
Download provenance and checksum are in `sources/andes-penguins.metadata.json`.

The colony marker uses the reserve location (53°27′38″S, 69°18′21″W) reported in
[Vidal et al.'s 2023 reserve flora study](https://www.scielo.cl/article_plus.php?lng=es&pid=S0717-66432023000100001&tlng=es).
It is a reference location, not a surveyed colony boundary.

## Across the Divide bridge photographs

The Journey credits the following photographs after each question is answered. Source and license details are recorded in the Journey content.

| Photo                               | Creator                  | Source                                                                                                    | License                                                         |
| ----------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Golden Gate Bridge (`01.v1.jpg`)    | ThomasLendt              | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Golden_Gate_Bridge_with_Fort_Point.jpg)       | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| Sydney Harbour Bridge (`02.v1.jpg`) | JJ Harrison              | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Sydney_Harbour_Bridge_from_Circular_Quay.jpg) | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| Tower Bridge (`03.v1.jpg`)          | Helen Ilus               | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Tower_Bridge_from_South_Bank.jpg)             | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| Øresund Bridge (`04.v1.jpg`)        | Philaweb / Paul Bischoff | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Oresund_Bridge.JPG)                           | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)       |
| Qiansimen Bridge (`05.v1.jpg`)      | DvTor8303                | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Qiansimen_Bridge_at_night_20251027.jpg)       | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)   |

## Shared-name Journey map context

`src/game/data/shared-names-context.v1.json` and the identical downloadable
`public/geography/shared-names-context.v1.json` contain question-local geography.
Congo and Zambezi centerlines reuse the pinned Natural Earth v5.1.2 public-domain
physical data. Lake St. Clair, Kariba and Victoria footprints are a subset of
Natural Earth v5.1.2 1:10m lakes; their original coordinates are retained in
`public/geography/shared-names-lakes-source.v1.geojson`.

Ontario's Thames River main stream is from OpenStreetMap relation **7666913**,
attributed to **© OpenStreetMap contributors**, licensed **ODbL 1.0**:
https://www.openstreetmap.org/copyright and
https://opendatacommons.org/licenses/odbl/1-0/.
`public/geography/shared-names-thames-source.v1.geojson` preserves source way
versions, node identities and coordinates. Member ways are joined only at shared
node IDs, then simplified by retaining original vertices and the head reach and
Lake St. Clair outlet. No watershed-map image or traced geometry is used.

The pin target uses OpenStreetMap waterfall node **299131927** at the Main Falls
lip. Its source snapshot and nearby Main Falls cliff are in
`public/geography/shared-names-falls-source.v1.geojson`, also ODbL 1.0. This is a
waterfall location, not the nearby town or the World Heritage property centroid.
The centerlines are generalized cartography, not surveyed waterfall/gorge relief.

Chatham's canonical GeoNames ID **5920457**, Kingston's **5992500**, and their
coordinates come from the already
pinned cities15000 source, CC BY 4.0 (https://www.geonames.org/). Other city markers
reuse bundled GeoNames city/capital records. No optional photographs ship.
`sources/shared-names-map.metadata.json` records source URLs, versions, licenses
and checksums. `python3 scripts/prepare-shared-names-map.py` reproduces only these
Journey assets from checked-in source subsets; it does not regenerate catalogs.

The U.S. Georgia completion polygon reuses Explore's pinned geoBoundaries gbOpen
state boundary, documented above and in `sources/usa-adm1.metadata.json`; it is
hidden during the question.
Journey lakes use opaque blue surfaces and source shoreline paths, matching the
Lake Titicaca treatment in Along the Andes.

## Polygon interior markers

Journey response markers use [Polylabel](https://github.com/mapbox/polylabel) 2.1.0
and its [TinyQueue](https://github.com/mourner/tinyqueue) 3.0.0 dependency, both under
the ISC license. Their complete copyright and permission notices are shipped in
[the geometry library notices](public/licenses/journey-geometry.txt)
(`/licenses/journey-geometry.txt` in the published app).

## Iron Gates mountain relief

`src/game/data/iron-gates-relief.v1.json` uses the same Mapzen/Tilezen elevation
sources and pictorial processing described above for Andes mountain hatching.
Run `scripts/prepare-mountain-relief.py --region iron-gates` to prepare this
regional variant. Zoom-6 tiles, their hashes, attribution, and the derived asset
hash are recorded in `sources/iron-gates-relief-manifest.json`.

Elevation maxima above 900 m anchor the symbols inside the display window
20°–25.5°E, 42.5°–46.5°N. This window is not a mountain-range boundary. The
symbols are generalized terrain illustrations, not surveyed ridges, exact peak
locations, political boundaries, or grading geometry.

Drawing the Sahara uses NASA GIBS/EarthKAM imagery, Gunn 2026 dune presence data
(MIT), WorldPop 2024 R2025A v1 modeled counts (CC BY 4.0), geoBoundaries /
OpenStreetMap / Wambacher boundaries (ODbL 1.0), Natural Earth river data (public
domain), and bundled GeoNames city coordinates (CC BY 4.0). Full attribution,
changes, source links and licenses are in
`public/journeys/drawing-the-sahara/SOURCES.md`. The derived Algeria footprint and
population database is supplied as `algeria-model.v1.json` under ODbL 1.0, with
WorldPop attribution retained.
