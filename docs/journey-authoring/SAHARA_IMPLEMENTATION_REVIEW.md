# Drawing the Sahara: implementation review

Edition `drawing-the-sahara-v1`, direct route `/journey/drawing-the-sahara`, unlisted.
The approved five-stop outline is preserved: brush dunes → fixed-radius capitals →
trace the Nile → population polygon → population cut. All five controls work per
question, with no dependence on a preceding round or Journey relay.

## Settled implementation decisions

- Geographic shapes, not screen coordinates, are the response. Drawing and
  coordinate entry use one editor. Painting/erasing and shape edits start inside the outlined territory; gestures
  starting elsewhere rotate. The circle is preplaced and draggable without a
  center jump. Remove last point/undo stroke and reset remain explicit. Trace endpoints are locked.
  Cuts snap only their endpoints to the country boundary, never to a solution.
- A submission freezes versioned geometry, source revision, tier and numeric
  metrics in the existing save registers. Help caps 3/2/1 quality points at 2/1.
  Restoring an answer does not regrade it. Future source changes require an
  edition/save-continuity decision, not silently replacing this file.
- No live precision, city count, population share or balance indicator. The free
  Accuracy panel discloses every band before play. Explicit solution examples
  are reveal-only toggles and never overwrite the submitted geometry.
- Reveal differentiates overspray/missing dunes, enclosed capitals, off-corridor
  trace stretches, population versus land, and the two cut shares. Completion
  opens on a traditional regional flyover. Manual review selects one
  construction at a time without coupling camera stops to different map layers.
- The reviewed dune mask is Gunn **2026**, not Gunn 2021/FATE (which does not
  distribute the necessary dune polygons). The target is actual mapped dune
  morphology, not bare-land cover. A one-cell transition zone is unscored.
  The scoring grid is equirectangular with spherical area weights; population
  uses equal-area cells. Both grade geographic area, independent of camera zoom.
- Added minimum brush precision of 67/60/55% alongside F1 62/48/33%. Painting the
  whole desert cannot pass despite an F1 score boosted by target prevalence.
- Exactly the ten authored capital records count. Independent spherical-cap
  intersection enumeration verifies **five** at exactly 1,400 km. The winning
  group includes Niamey with Rabat, Algiers, Tunis and Tripoli. Multiple centers
  work. These are capitals of countries with Saharan territory, not ten cities
  all within the desert.
- The real bundled Nile centerline is withheld during play; imagery supplies
  the visible valley. Mutual corridor coverage, endpoints and a 0.9–1.6 length
  ratio reject the straight shortcut, reversed routes and excessive backtracking.
  Current bands are 90% within 15/20 km, 80% within 25/30 km, 70% within 35/45 km
  (reference coverage / stroke coverage). They need touch calibration before
  publication; the draft’s much wider distances accepted straight shortcuts.
- WorldPop 2024 R2025A v1 is modeled and explicitly described by its publisher as
  an alpha release. Nightlights are an imperfect 2012 clue, never the grader.
  The source footprint includes unpopulated desert; nodata does not define land.
- A four-corner polygon independently captures 90.7633% of modeled residents in
  11.4072% of the footprint, comfortably meeting the 75/20 target.
- Both east–west and north–south population bisectors pass. Their smaller land
  shares are about 2.38% and 47.44%. Thus the reveal reports actual land shares
  rather than promising every successful cut creates extremely unequal areas.

## Frozen sources and preparation

Player-facing attribution and licenses:
[`public/journeys/drawing-the-sahara/SOURCES.md`](../../public/journeys/drawing-the-sahara/SOURCES.md).
The exact derived Algeria footprint/population database is publicly available as
`algeria-model.v1.json` under ODbL 1.0 with WorldPop CC BY attribution. The app’s
combined scoring input is `src/game/data/sahara-construction.v1.json`.

Use a separate Python environment (numpy 2.0.2, pillow 11.3.0, rasterio 1.4.3,
shapely 2.0.7, scipy 1.13.1, pyproj 3.6.1). Cache these inputs under
`.cache/constructive/`; no global catalog/geography preparation is needed:

| Cached name                                     | Frozen input                                                                                                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dune-world/…/dune-mask-rev1.tif` and `LICENSE` | [Zenodo release archive](https://zenodo.org/api/records/20054674/files/geomorphlab/dune-world-v1.0.0.zip/content), unzip into `dune-world/`                                     |
| `algeria-population.tif`                        | [WorldPop exact raster](https://data.worldpop.org/GIS/Population/Global_2015_2030/R2025A/2024/DZA/v1/100m/constrained/dza_pop_2024_CN_100m_R2025A_v1.tif)                       |
| `algeria-boundary.geojson`                      | [geoBoundaries revision 9469f09](https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/DZA/ADM0/geoBoundaries-DZA-ADM0.geojson)                              |
| `erg-oriental.jpg`                              | [NASA EarthKAM CCFID_152293_2017304121045](https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/92000/92232/CCFID_152293_2017304121045_IMAGE_LRG.jpg) |

Fetch the other three cached images from
`https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi` with
`SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&SRS=EPSG:4326`, plus:

| File         | LAYERS                      | FORMAT       | WIDTH×HEIGHT | BBOX           |
| ------------ | --------------------------- | ------------ | ------------ | -------------- |
| `sahara.jpg` | `BlueMarble_NextGeneration` | `image/jpeg` | 4096×2048    | `-18,10,38,38` |
| `nile.jpg`   | `BlueMarble_NextGeneration` | `image/jpeg` | 2048×3072    | `29,23,34,31`  |
| `lights.png` | `VIIRS_CityLights_2012`     | `image/png`  | 2048×2048    | `-9,18,12,38`  |

Then run `python scripts/prepare-sahara-construction.py`. Outputs include SHA-256
hashes in `data-audit.json`. A remote publisher may update a URL: compare hashes
before accepting a regenerated edition. The preparation script never downloads
at runtime or regenerates shared geography.

Population sums retain 99.97% of positive source counts after source-pixel-center
clipping against the finer country boundary; aggregation changes retained totals
by less than one person. Country area sums agree to under 0.01 km². Cells are
6 km; polygon and half-plane membership use geographic cell centers, while land
weights are country clipped. This is a deliberately disclosed approximation.

## Verification and publication gate

Focused unit/DOM checks cover all five real and wrong submissions, source
feasibility, global circle maximum, date-line/polar geometry, erase order, corrupt
saves, edit/reset/submit controls, independent help ceilings, frozen register
round trips, hidden/revealed scenes, texture disposal and completion isolation.
`npm run check:journey -- drawing-the-sahara` checks the actual content/assets.

No browser or real GPU/touch verification was performed, following the user’s
instruction. Source images were inspected locally. Automated source-derived
strokes establish geometric feasibility, not human usability. Before moving this
edition into the daily pool, trial 3–5 human brush samples on desktop/mobile,
check trace tolerance and touch gesture responsiveness, and review imagery
readability. The edition stays unlisted until those checks and any calibration
are complete. No deployment is part of this implementation.

## Territory interaction and presentation revision

Following player feedback, `constructionArea` now provides a visible edit
footprint and geographic alpha mask. North Africa uses its outer coastline down
to 10°N, including the eastern coast through the Horn. Egypt uses the complete
country with a broader satellite view. Algeria’s nightlights, population reveal
and construction fills share its frozen footprint. New edits cannot place
vertices outside the active territory; existing saved constructions and numeric
results remain intact, with their displayed edges clipped to the footprint.

The brush radius is now 160 km. Earlier 90 km strokes remain usable in pending
saves. Actual paint is displayed continuously across unscored transition cells;
grading still uses canonical weighted cells and the same thresholds. The target
is clipped to Africa (`:africa-v1` source suffix); historical metrics are never
recomputed. Filled paint and reveal colors have stronger saturation/opacity.

`scripts/prepare-sahara-display.py` prepares only these masks, footprints and
images. It reads the existing frozen sources, downloads fixed Blue Marble
patches if absent from `.cache/constructive`, and writes `display-audit.json`.
It does not rerun population aggregation or regenerate shared geography.

Story copy now connects dunes → cities → water → settlement → alternative
population splits. Technical model notes remain in Accuracy/Sources. The normal
reveal omits the model footer and “shape kept” notice. Editorial tier wording may
refresh while saved tier, geometry, metrics and rewards stay frozen.

## Brush and solution polish

The brush defaults to a 160 km radius with a 40–320 km slider. Paint and erase
icons, the slider, undo and reset share one row. Radius belongs to each stroke;
existing saves retain their original geometry. Coordinate entry and repeated
circle-radius copy were removed from the question panels at the user’s request.

Paint updates retain the visible mesh, material and loaded mask, replacing only
its geometry. This removes the asynchronous hide/reload cycle during strokes.
The southern image boundary is densified along 10°N, matching the raster’s
latitude edge rather than bending north as a single great-circle segment.

Q3 simplifies each completed stroke to a 2 km geometric tolerance while keeping
endpoints and river bends. At most twelve unnumbered interior handles are shown.
Q4 now has an attainable eight-corner example and a prepared, closed clipped
footprint, shown with a translucent fill. Its original vertices pass the same
population/land grader as a player’s construction.

Q1 imagery was checked against NASA’s Blue Marble provenance and geographic
landmarks; the dune source was spot-checked against the Grand Ergs, Hoggar,
Tibesti and Nile. Blue Marble is a natural-color composite, not a dune category
map. Prompts/reveals emphasize morphology rather than interpreting pale color
as sand. No real browser/GPU verification was performed.
