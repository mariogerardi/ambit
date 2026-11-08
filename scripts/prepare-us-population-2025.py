#!/usr/bin/env python3
"""Build the frozen 2025 CONUS population grid from WorldPop counts and Census totals.

Requires rasterio, numpy, shapely and Pillow. Pass local paths to the R2024B
1 km USA GeoTIFF, Census NST-EST2025-ALLDATA.csv and supplied reference JSON.
The raw input raster is not part of the browser bundle.
"""
import csv, hashlib, json, math, sys
from pathlib import Path
import numpy as np
import rasterio
from rasterio.features import rasterize
from rasterio.windows import from_bounds, transform as window_transform
from shapely.geometry import shape, mapping
from shapely.ops import unary_union
from PIL import Image

root = Path(__file__).resolve().parents[1]
raster, census, reference = map(Path, sys.argv[1:4])
ref = json.loads(reference.read_text())
regions = json.loads((root/'public/geography/usa-adm1.v1.json').read_text())
state_by_name = {r['name']: r for r in regions}
rows = list(csv.DictReader(census.open(encoding='utf-8-sig')))
actual = {state_by_name[r['NAME']]['id'].split(':')[-1]: int(r['POPESTIMATE2025'])
          for r in rows if r['SUMLEV'] == '040' and r['NAME'] != 'Puerto Rico'}
assert actual == ref['statesAndDistrictOfColumbia'], 'Reference disagrees with official state CSV'
assert int(rows[0]['POPESTIMATE2025']) == ref['nationalResidentPopulation'] == sum(actual.values())
conus = [r for r in regions if r['id'].split(':')[-1] in actual and r['id'] not in ('wurl:USA-AK', 'wurl:USA-HI')]
conus.sort(key=lambda r: (r['id'].endswith('-DC'), r['id']))
assert len(conus) == 49
west, south, east, north = -125., 24., -66., 50.
columns, gridrows = 590, 260
n = columns * gridrows
with rasterio.open(raster) as dataset:
    assert dataset.crs.to_epsg() == 4326
    window = from_bounds(west, south, east, north, dataset.transform).round_offsets().round_lengths()
    transform = window_transform(window, dataset.transform)
    values = dataset.read(1, window=window)
    valid = np.isfinite(values) & (values >= 0)
    values[~valid] = 0
    state = rasterize([(r['geometry'], i + 1) for i, r in enumerate(conus)],
                      out_shape=values.shape, transform=transform, fill=0, dtype='uint8')
    lat = transform.f + (np.arange(values.shape[0]) + 0.5)*transform.e
    lng = transform.c + (np.arange(values.shape[1]) + 0.5)*transform.a
    iy = np.floor((lat-south)*10).astype('int32')
    ix = np.floor((lng-west)*10).astype('int32')
    inside = (state > 0) & (iy[:, None] >= 0) & (iy[:, None] < gridrows) & (ix[None, :] >= 0) & (ix[None, :] < columns)
    yy, xx = np.nonzero(inside)
    index = iy[yy]*columns + ix[xx]
    groups = state[yy,xx].astype('int64')*n + index
    weights = values[yy,xx].astype('float64')
    grouped = np.bincount(groups, weights=weights, minlength=(len(conus)+1)*n).reshape(len(conus)+1,n)
    land = np.bincount(index, minlength=n)
    counts = np.zeros(n, dtype='float64')
    state_checks = {}
    for i, region in enumerate(conus, 1):
        code = region['id'].split(':')[-1]
        source_total = grouped[i].sum()
        if source_total <= 0: raise ValueError(f'No WorldPop pixels for {code}')
        calibrated = grouped[i] * (actual[code]/source_total)
        state_checks[code] = float(calibrated.sum())
        counts += calibrated
    expected = sum(actual[r['id'].split(':')[-1]] for r in conus)
    assert abs(counts.sum() - expected) < 0.01
    assert all(abs(state_checks[k]-actual[k]) < 0.01 for k in state_checks)
    cells = []
    for i in np.flatnonzero(land):
        latitude = south + (i//columns + .5)/10
        land_area = 123.643 * math.cos(math.radians(latitude)) * min(1., land[i]/144.)
        cells.append([int(i), round(float(counts[i]), 5), round(max(land_area, .00001), 5)])
    mask = (state > 0).astype('uint8')*255
    mask_path = root/'public/journeys/how-america-adds-up/conus-mask.png'
    Image.fromarray(mask, 'L').save(mask_path, optimize=True)
    # Density uses exactly the calibrated counts and land areas stored for grading.
    image = np.zeros((gridrows,columns,4), dtype='uint8')
    for i, count, area in cells:
        density = count / area
        intensity = min(1., max(0., math.log10(1 + density)/4.0))
        row, col = divmod(i, columns)
        image[gridrows-1-row, col] = [241, 165, 99, round(30 + 190*intensity)]
    Image.fromarray(image, 'RGBA').resize((columns*2, gridrows*2), Image.Resampling.NEAREST).save(root/'public/journeys/how-america-adds-up/density.png', optimize=True)
    union = unary_union([shape(r['geometry']).buffer(0) for r in conus])
    if union.geom_type == 'Polygon': union = __import__('shapely').geometry.MultiPolygon([union])
    data = {
      'population': ref,
      'conusPopulation': expected,
      'geometry': mapping(union),
      'mask': {'assetUrl':'/journeys/how-america-adds-up/conus-mask.png','bounds':[west,south,east,north]},
      'grid': {'id':'us-population-2025-conus','label':'Modeled 2025 population, calibrated to Census state totals',
               'sourceUrl':'https://hub.worldpop.org/geodata/summary?id=57010','revision':'worldpop-r2024b-2025-census-vintage2025-conus-v1',
               'west':west,'south':south,'east':east,'north':north,'columns':columns,'rows':gridrows,'equalArea':False,'cells':cells},
      'sourceSha256': hashlib.file_digest(raster.open('rb'),'sha256').hexdigest(),
      'stateSums': state_checks,
    }
    (root/'src/game/data/how-america-population.v1.json').write_text(json.dumps(data,separators=(',',':'))+'\n')
    print('worldpop', data['sourceSha256'], 'grid cells',len(cells),'modeled CONUS',round(counts.sum()), 'Census',expected, 'input shape',values.shape)
