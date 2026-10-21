# Drawing the Sahara — data and imagery

Prepared 20 October 2026. This edition uses frozen local assets; opening the Journey does not request live mapping or scoring data. Source hashes and numerical checks are in [data-audit.json](./data-audit.json).

## Dunes

Andrew Gunn (2026), _The distribution of Earth’s wind-blown sand dunes_, Nature Communications 17, 8468. [Paper](https://www.nature.com/articles/s41467-026-75466-y); [versioned dataset and code](https://doi.org/10.5281/zenodo.20054674). The `dune-mask-rev1.tif` expert-mapped 0.1° presence raster supplies the target, not a generic bare-ground classification. MIT license; the [full notice](./dune-map-LICENSE.txt) accompanies these assets.

For scoring, this raster is reduced to 0.2° cells within 17°W–36°E, 14–34°N. Connected fields smaller than 12 cells and a one-cell transition zone are unscored. Remaining land cells use spherical land-area weights. Painting an unscored transition neither helps nor hurts. F1 measures coverage and precision; an additional minimum precision prevents indiscriminate whole-desert painting from earning credit. This is a generalized comparison of major dune fields, not a precise geomorphological survey.

## Imagery

NASA GIBS **BlueMarble_NextGeneration** supplies the natural-color Sahara and Nile patches. **VIIRS_CityLights_2012** supplies the nightlights clue (NASA Earth Observatory / NOAA National Geophysical Data Center). [GIBS documentation](https://nasa-gibs.github.io/gibs-api-docs/); [NASA imagery usage](https://www.nasa.gov/nasa-brand-center/images-and-media/). Images are geographic WGS84 patches with no invented spatial detail. Their dates differ from the population model. Nightlight brightness is never used to count residents.

The two assist texture crops come from NASA ISS EarthKAM photograph CCFID_152293_2017304121045, 31 October 2017, [Grand Erg Oriental, Algeria](https://science.nasa.gov/earth/earth-observatory/grand-erg-oriental-algeria-92232/), published 4 June 2018. Credit: Sally Ride EarthKAM@Space Camp on the International Space Station; caption by M. Justin Wilkinson, Texas State University / NASA Johnson Space Center. The source image is contrast enhanced. Crops isolate actual dune ridges and rocky terrain from the same photograph; neither is an answer mask.

## Population and country footprint

Bondarenko et al. (2025), **WorldPop, University of Southampton**, _Constrained estimates of 2015–2030 total number of people per grid square at 3 arc seconds, R2025A v1_, [DOI 10.5258/SOTON/WP00839](https://doi.org/10.5258/SOTON/WP00839), [release statement](https://data.worldpop.org/repo/prj/Global_2015_2030/R2025A/doc/Global2_Release_Statement_R2025A_v1.pdf). [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Exact input: [Algeria 2024 constrained 100 m counts](https://data.worldpop.org/GIS/Population/Global_2015_2030/R2025A/2024/DZA/v1/100m/constrained/dza_pop_2024_CN_100m_R2025A_v1.tif). The publisher labels this release **alpha**. Counts are modeled estimates, not enumerated residents at each point. Original positive source pixels are assigned once, by their centers, into frozen 6 km equal-area cells.

Algeria’s footprint is from **geoBoundaries gbOpen ADM0**, OpenStreetMap contributors / Wambacher (2017), pinned [source revision 9469f09](https://github.com/wmgeolab/geoBoundaries/blob/9469f09/releaseData/gbOpen/DZA/ADM0/geoBoundaries-DZA-ADM0.geojson). [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/); [metadata](https://www.geoboundaries.org/api/current/gbOpen/DZA/ADM0/). The boundary is simplified at 0.002° for this model. It is independent of the coarser global display geography. Land denominators include unpopulated desert; WorldPop nodata is not treated as missing land.

The [derived footprint and population database](./algeria-model.v1.json) is available under **ODbL 1.0**, retaining WorldPop’s CC BY attribution. This is the exact machine-readable database used in the two population questions. The population heatmap is a produced work from that database. Changes: country clipping, spherical cylindrical equal-area aggregation, rounding and heatmap rendering. No endorsement by any data provider is implied.

Retained population: 46,482,973 modeled residents of 46,497,095 positive source counts (99.97%). Aggregation preserves the retained total to under one person. Country land in this frozen model is approximately 2,314,185 km²; this is the grading footprint, not a claim about a statutory national-area figure. Polygon and cut membership use cell centers; land weights are country-clipped cell areas. Consequently results have approximately 6 km spatial resolution. Boundary-touching circle candidates count; cuts have no preference for orientation or land-area balance.

## River and cities

The Nile reference is the actual bundled **Natural Earth 1:10m river centerline**, cropped and ordered Aswan–Cairo. [Source](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/); public domain. It stays hidden during tracing. City coordinates are frozen bundled **GeoNames** records, [CC BY 4.0](https://www.geonames.org/export/), including the ten explicitly marked capitals. Exactly those ten candidates count in the circle question. Pairwise spherical-cap intersection enumeration verifies a maximum of five at a 1,400 km radius; several centers work.

## Reproduction and calibration

Repository script: `scripts/prepare-sahara-construction.py`. It consumes explicit cached inputs, changes only this Journey’s assets and scoring data, and writes source hashes and feasibility examples. See `docs/DEVELOPMENT.md` (Sahara data preparation) for input URLs and commands, and `docs/HOSTING.md` (Journey acceptance checks) for remaining human calibration. This Journey remains unlisted pending desktop/touch trials, particularly the brush and river tolerances. Automated geometric examples are not human usability tests.

## Masked imagery and interaction footprints

The current presentation uses an Africa patch at 18°W–52°E, 10–38°N
(5120 × 2048), and a whole-Egypt patch at 24–37°E, 21–33°N
(3072 × 3072), from the same NASA GIBS Blue Marble layer. Country outlines
come from the pinned bundled country geography; Algeria retains the finer
geoBoundaries footprint described above. The imagery has transparent pixels
outside each footprint. Separate geographic masks clip constructed fills to
those same outlines. The southern edge of the Africa patch is 10°N.

The African scoring target is restricted to the continent’s land footprint;
its revision adds `:africa-v2`. Its underlying scoring grid and transition policy
remain as described above. Displayed paint also covers unscored pixels so the
brush remains continuous. Historical submission metrics keep their original
source revision and values. No scoring uses the display images or alpha masks.

Display preparation: `scripts/prepare-sahara-display.py`; source hashes and
patch extents: [display-audit.json](./display-audit.json). WebP compression changes
only the displayed photographs, not the target data. Nightlights and population
maps are clipped PNG derivatives. The original source licenses and credits
continue to apply.

The Blue Marble source is a natural-color MODIS composite; see NASA’s
[dataset description](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/).
Pale rock and sand can look similar at continental scale, so texture and dune
morphology matter. Source-mask spot checks identify the Grand Ergs as dunes
and Hoggar, Tibesti and the Nile corridor as non-dune terrain.

Display outlines now subdivide long latitude/longitude edges before spherical
rendering. This aligns the 10°N outline with the image cutoff. The African
source-revision suffix is `:africa-v2`; saved metrics are retained as submitted.
The prepared northern-ribbon example includes eight editable vertices and a
country-clipped closed footprint; its scoring still uses the frozen population
grid and the original eight-vertex polygon.
