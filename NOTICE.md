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

## Fourth daily puzzle facts

Reviewed local fact relationships and source links are stored in
`src/game/fourthJourney.ts` and `src/game/quizData.ts`: Spain’s Ministry of
Territorial Policy for regional languages, Sicily’s official tourism brochure
for the island, the existing pinned GeoNames capital record for Tripoli, the
UN ICTY legacy page for Yugoslavia’s six constituent republics, and UNEP/MAP’s
coastal-country list plus UNRWA’s Gaza coastline description for the explicit
22-country Mediterranean convention. Facts are authored locally; source pages
are linked after answering and are not fetched at runtime.

The enlarged sun detail in `public/flags/clues/sun-detail-01.svg` uses the same
Uruguay flag artwork as `public/flags/study/flag-186.svg`, cropped by its SVG
view box. The original flag artwork’s attribution and license also apply.

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
faces and attached hatching within the reviewed Andes extent. Pale faces do not
denote permanent snow. These are cartographic symbols, not exact summit outlines,
surveyed ridgelines or navigation data. Source tile URLs, SHA-256 hashes,
processing conventions, and the derived asset hash are recorded in
`sources/andes-relief-manifest.json`. Raw elevation stays in the preparation cache;
play uses bundled vector ink without live terrain requests.

Ecuador summit markers for Cotopaxi, Cayambe and Antisana use coordinates from
Smithsonian Institution’s Global Volcanism Program (volcano numbers 352050,
352006 and 352030), reviewed October 11, 2026. Each round includes source links;
Chimborazo retains its Natural Earth coordinate.
