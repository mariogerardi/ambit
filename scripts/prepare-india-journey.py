"""Freeze Journey-local India inputs. Does not rebuild shared geography.

Python 3.13: numpy 2.2.6, Pillow 11.3.0, rasterio 1.4.3, shapely 2.1.1,
pyproj 3.7.1, scipy 1.15.3. Cache source files under .cache/india/.
Source hashes are checked before use; output includes an independent numeric audit.
"""
import hashlib
import json
import math
import sys
from pathlib import Path
import urllib.parse
import urllib.request

import numpy as np
import rasterio
from rasterio.features import rasterize
from rasterio.transform import from_bounds
from rasterio.windows import Window
from shapely import contains_xy, box as boxes, intersection, area
from shapely.geometry import shape, mapping, box, Polygon
from shapely.ops import unary_union, transform
from pyproj import Transformer, Geod
from PIL import Image
from scipy.optimize import minimize

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.cache/india'
OUT = ROOT / 'public/journeys/the-shape-of-india'
OUT.mkdir(parents=True, exist_ok=True)
CACHE.mkdir(parents=True, exist_ok=True)
R = 6371008.8
RAD = math.pi / 180
BASE = '/journeys/the-shape-of-india/'
ECO_SERVICE = 'https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/Resolve_Ecoregions/FeatureServer/0/query'
ECO_IDS = [0, 222, 233, 238, 287, 302, 306, 308, 309, 310, 311, 314, 318, 702, 751, 754, 760, 769]

def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def save(path, value):
    path.write_text(json.dumps(value, separators=(',', ':'), allow_nan=False) + '\n')

def fetch(name, url, expected=None):
    p = CACHE / name
    if not p.exists():
        urllib.request.urlretrieve(url, p)
    if expected and digest(p) != expected:
        raise ValueError(f'Source changed: {name}; review before accepting new bytes')
    return p

pop_path = fetch('ind-pop-2025.tif', 'https://data.worldpop.org/GIS/Population/Global_2015_2030/R2025A/2025/IND/v1/1km_ua/constrained/ind_pop_2025_CN_1km_R2025A_UA_v1.tif', 'e188723030087fb8e90e1741199bd476a181c00b046fab7dd8e8358adb136b64')
dispute_path = fetch('disputed.geojson', 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_disputed_areas.geojson', '9cafef8b7dfb6b164dc58f218f981f4ace9f716f6c03795d4c62d1ac9f3d50f5')
eco_params = dict(f='geojson', where=f"ECO_ID IN ({','.join(map(str, ECO_IDS))})", outFields='ECO_ID,ECO_NAME', outSR='4326', geometryPrecision=5)
eco_path = fetch('india-ecoregions.geojson', ECO_SERVICE + '?' + urllib.parse.urlencode(eco_params), '7df3cbff54d361dcffa12d3ec678066ada638902ab524ed41d26c9159c799135')
image_params = dict(SERVICE='WMS', REQUEST='GetMap', VERSION='1.1.1', SRS='EPSG:4326', LAYERS='BlueMarble_ShadedRelief', FORMAT='image/jpeg', WIDTH=2048, HEIGHT=2048, BBOX='60,2,104,42')
image_path = fetch('south-asia.jpg', 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?' + urllib.parse.urlencode(image_params), 'ba608170b6eecde2388a5c7d8e6957ffd0ddf6828e4fa38797c718479257b026')
world_path = ROOT / 'public/geography/world.v1.json'
world = json.loads(world_path.read_text())
india = unary_union([shape(f['geometry']) for f in world if f['id'] in ['wurl:IND', 'wurl:NE-KAS']]).buffer(0)
mainland = max(india.geoms, key=lambda p: p.area) if india.geom_type == 'MultiPolygon' else india
neighbors = unary_union([shape(f['geometry']) for f in world if shape(f['geometry']).intersects(box(60, 2, 104, 42))]).intersection(box(60, 2, 104, 42)).buffer(0)
disputes = [f for f in json.loads(dispute_path.read_text())['features'] if f['properties']['ADM0_A3'] == 'IND' or 'Claimed by India' in str(f['properties'].get('NOTE_BRK')) or f['properties']['ADM0_A3'] == 'KAS']
ignored = unary_union([shape(f['geometry']) for f in disputes]).buffer(.08)
# Exclude a narrow uncertainty band on India's generalized border and all detached
# islands from country-scale painting penalties. The full footprint is still revealed.
paint_ignored = ignored.union(india.boundary.buffer(.07)).union(india.difference(mainland).buffer(.12))
project = Transformer.from_crs('EPSG:4326', f'+proj=cea +lat_ts=0 +R={R} +units=m', always_xy=True).transform
country_m = transform(project, india)

def mask_image(name, geom, bounds, source_image=None):
    size = (2048, 2048)
    # Supersample display masks. Alpha maps read RGB green, not PNG alpha.
    mask = rasterize([(mapping(geom), 255)], out_shape=(4096, 4096), transform=from_bounds(*bounds, 4096, 4096), fill=0, dtype='uint8')
    mask = Image.fromarray(mask).resize(size, Image.Resampling.LANCZOS)
    if source_image:
        im = Image.open(source_image).convert('RGBA')
        w, h = im.size
        west, south, east, north = bounds
        # The cached NASA source has bounds 60,2,104,42; crop before resizing.
        im = im.crop(((west-60)/44*w, (42-north)/40*h, (east-60)/44*w, (42-south)/40*h)).resize(size, Image.Resampling.LANCZOS)
        im.putalpha(mask)
    else:
        im = mask
    if name.endswith('.webp'):
        im.save(OUT / name, quality=88, method=6)
    else:
        im.save(OUT / name, optimize=True)
    return dict(assetUrl=BASE + name, bounds=bounds)

# Lakes affect display clipping only; keep all frozen grading geometry intact.
lakes_path = fetch('lakes.geojson', 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_lakes.geojson', '2d036f53dedec578001c5c30c2959ee7d4eebc1306900fa4367c49929ec8f2d9')
lakes = unary_union([shape(f['geometry']) for f in json.loads(lakes_path.read_text())['features'] if shape(f['geometry']).intersects(box(60, 2, 104, 42))]).buffer(0)
display_land = neighbors.difference(lakes)
display_india = india.difference(lakes)
land_mask = mask_image('south-asia-mask.png', display_land, [60, 2, 104, 42])
mask_image('south-asia.webp', display_land, [60, 2, 104, 42], image_path)
india_mask = mask_image('india-mask.png', display_india, [66, 6, 99, 38])
mask_image('india-relief.webp', display_india, [66, 6, 99, 38], image_path)
def landscape_image(zones):
    # A reveal illustration from frozen answer geometry; no grading values change.
    bounds = (66, 6, 99, 38)
    palette = {'himalayas': (160, 173, 235), 'thar': (239, 192, 110), 'plain': (106, 201, 161)}
    pixels = np.zeros((4096, 4096, 4), dtype=np.uint8)
    for zone in zones:
        geom = shape(zone['geometry']).intersection(display_india)
        mask = rasterize([(mapping(geom), 255)], out_shape=(4096, 4096), transform=from_bounds(*bounds, 4096, 4096), fill=0, dtype='uint8')
        pixels[mask > 0] = (*palette[zone['id']], 255)
    Image.fromarray(pixels).resize((2048, 2048), Image.Resampling.LANCZOS).save(OUT/'landscapes.png', optimize=True)

if '--display-only' in sys.argv:
    landscape_image(json.loads((ROOT/'src/game/data/india-journey.v1.json').read_text())['zones'])
    print('Updated land masks, relief imagery and landscape reveal; frozen scoring inputs unchanged.')
    sys.exit(0)

# Painting grid: true spherical cell area, neutral land on either side of borders.
west, south, east, north = 60, 2, 104, 42
cols, rows = 220, 200
paint_cells = []
for y in range(rows):
    lat = south + (y + .5) * .2
    xs = west + (np.arange(cols) + .5) * .2
    land = contains_xy(neighbors, xs, lat)
    ungraded = contains_xy(paint_ignored, xs, lat)
    target = contains_xy(mainland, xs, lat)
    a = R ** 2 * .2 * RAD * (math.sin((south + (y + 1) * .2) * RAD) - math.sin((south + y * .2) * RAD)) / 1e6
    for x in np.flatnonzero(land & ~ungraded):
        paint_cells.append([int(y * cols + x), int(target[x]), round(a, 5)])
revision = hashlib.sha256((digest(world_path) + digest(dispute_path) + 'india-admin-v1').encode()).hexdigest()[:16]
paint = dict(id='india-admin-paint-v1', label='India administered footprint · 0.2° land cells · disputed areas, boundary uncertainty and small islands unscored', sourceUrl='https://www.naturalearthdata.com/about/disputed-boundaries-policy/', revision=revision, west=west, south=south, east=east, north=north, columns=cols, rows=rows, equalArea=False, cells=paint_cells)

# Broad teaching zones use attributed ecological region extents as geographic
# evidence, not invented official physiographic borders. Preserve a 10 km-ish
# cartographic tolerance, then remove overlap between adjacent teaching zones.
eco = {int(f['properties']['ECO_ID']): shape(f['geometry']).buffer(0) for f in json.loads(eco_path.read_text())['features']}
mountain_ids = [0, 233, 302, 306, 308, 309, 310, 702, 751, 754, 760, 769]
mountains = unary_union([eco[i] for i in mountain_ids]).intersection(box(72, 26, 98, 37)).buffer(.08).intersection(india.buffer(.06)).simplify(.015, preserve_topology=True)
desert = eco[318].buffer(.08).intersection(india).difference(mountains).simplify(.015, preserve_topology=True)
# The northern portion of Aravalli-west scrub covers Punjab/Haryana's dry plains;
# only that portion joins the Gangetic/Terai lowland belt, never all Rajasthan.
plain = unary_union([eco[i] for i in [238, 287, 311]] + [eco[314].intersection(box(73, 29, 78, 32))]).buffer(.08).intersection(india).difference(mountains.union(desert)).simplify(.015, preserve_topology=True)
zones = [dict(id='himalayas', label='Himalayas', geometry=mapping(mountains), example=dict(lat=30.7, lng=78.7)), dict(id='thar', label='Thar Desert', geometry=mapping(desert), example=dict(lat=27, lng=70.9)), dict(id='plain', label='Indo-Gangetic Plain', geometry=mapping(plain), example=dict(lat=26.8, lng=81))]
landscape_image(zones)
for z in zones:
    assert shape(z['geometry']).covers(__import__('shapely').Point(z['example']['lng'], z['example']['lat'])), z['label']

# Aggregate source population exactly once using original 1 km pixel centers.
# Retained cells include zero-population land so both population and area partitions
# use the same complete national mask, including offshore islands.
step = 10000
x0, y0, x1, y1 = country_m.bounds
x0 = math.floor(x0 / step) * step
y0 = math.floor(y0 / step) * step
cols, rows = math.ceil((x1 - x0) / step), math.ceil((y1 - y0) / step)
pop = np.zeros(rows * cols)
source_total = clipped_total = 0.
source_samples = []
with rasterio.open(pop_path) as src:
    for row in range(0, src.height, 512):
        a = src.read(1, window=Window(0, row, src.width, min(512, src.height - row)))
        rr, cc = np.nonzero((a > 0) & np.isfinite(a))
        values = a[rr, cc].astype('float64')
        source_total += float(values.sum())
        lng = src.transform.c + (cc + .5) * src.transform.a
        lat = src.transform.f + (row + rr + .5) * src.transform.e
        inside = contains_xy(india, lng, lat)
        values, lng, lat = values[inside], lng[inside], lat[inside]
        clipped_total += float(values.sum())
        xx, yy = R * lng * RAD, R * np.sin(lat * RAD)
        ix, iy = np.floor((xx - x0) / step).astype(int), np.floor((yy - y0) / step).astype(int)
        pop += np.bincount(iy * cols + ix, weights=values, minlength=rows * cols)
        source_samples.append((lng, lat, values))
ix, iy = np.meshgrid(np.arange(cols), np.arange(rows))
rectangles = boxes(x0 + ix.ravel() * step, y0 + iy.ravel() * step, x0 + (ix.ravel() + 1) * step, y0 + (iy.ravel() + 1) * step)
landareas = area(intersection(rectangles, country_m)) / 1e6
cells = [[i, round(float(pop[i]), 4), round(float(landareas[i]), 6)] for i in range(rows * cols) if landareas[i] > .00001]
assert abs(sum(c[1] for c in cells) - clipped_total) / clipped_total < 1e-7
grid = dict(id='india-worldpop-2025-10km', label='WorldPop 2025 R2025A v1 (alpha) · modeled population · country-clipped 10 km equal-area cells', sourceUrl='https://hub.worldpop.org/geodata/summary?id=77679', revision=hashlib.sha256((digest(pop_path) + revision + '10km-v1').encode()).hexdigest()[:16], west=x0 / R / RAD, east=(x0 + cols * step) / R / RAD, south=math.asin(y0 / R) / RAD, north=math.asin((y0 + rows * step) / R) / RAD, columns=cols, rows=rows, equalArea=True, cells=cells)

# Density is counts divided by clipped land area; a log palette is explicit in
# the legend. Source counts (not these colors) always determine scoring.
heat = np.zeros((1600, 1650, 4), dtype=np.uint8)
for i, count, a in cells:
    gx, gy = i % cols, i // cols
    lng = grid['west'] + (gx + .5) / cols * (grid['east'] - grid['west'])
    lat = math.asin((y0 + (gy + .5) * step) / R) / RAD
    px, py = int((lng - 66) / 33 * 1650), int((38 - lat) / 32 * 1600)
    t = min(1, math.log1p(count / a) / math.log(5001))
    if 0 <= px < 1650 and 0 <= py < 1600:
        heat[max(0, py-3):min(1600, py+4), max(0, px-3):min(1650, px+4)] = [int(255-30*t), int(240-180*t), int(180-130*t), 235]
alpha = rasterize([(mapping(india), 255)], out_shape=(1600, 1650), transform=from_bounds(66, 6, 99, 38, 1650, 1600), fill=0, dtype='uint8')
heat[:, :, 3] = np.minimum(heat[:, :, 3], alpha)
Image.fromarray(heat).save(OUT / 'population.png', optimize=True)

boundary = [dict(lng=x, lat=y) for x, y in mainland.simplify(.01, preserve_topology=True).exterior.coords]
geod = Geod(a=R, b=R)
city_catalog = json.loads((ROOT/'src/geography/data/cities.v1.json').read_text())
city_records = [dict(id='place:'+r[0], name=r[1], parentId=r[2], lat=r[3], lng=r[4], kind='city', sourceId='geonames:'+r[0]) for r in city_catalog['cities']]
city_records += [dict(id=c['id'], name=c['name'], parentId=c['countryId'], lat=c['lat'], lng=c['lng'], kind='city', sourceId='geonames:'+c['id'].split(':')[-1]) for c in json.loads((ROOT/'src/game/data/capitals.v1.json').read_text())['capitals']]
cities = []
for name in ['Delhi', 'Jaipur', 'Agra']:
    city = next(c for c in city_records if c['name'] == name and c.get('parentId',c.get('countryId')) == 'wurl:IND')
    cities.append(city)
coords = [(p['lng'], p['lat']) for p in cities]
def radius(center):
    return max(geod.inv(*center, *p)[2] / 1000 for p in coords)
fit = minimize(radius, [76.8, 27.55], method='Nelder-Mead', options=dict(xatol=1e-10, fatol=1e-8))
assert radius(fit.x) < 150

def vec(lng, lat):
    lng, lat = np.asarray(lng)*RAD, np.asarray(lat)*RAD
    return np.stack([np.cos(lat)*np.cos(lng), np.cos(lat)*np.sin(lng), np.sin(lat)], axis=-1)
centers = np.array([[grid['west']+(i%cols+.5)/cols*(grid['east']-grid['west']), math.asin((y0+(i//cols+.5)*step)/R)/RAD] for i, _, _ in cells])
vectors = vec(centers[:, 0], centers[:, 1])
weights = np.array([v for _, v, _ in cells]); lands = np.array([a for _, _, a in cells])
slng, slat, sw = [np.concatenate([s[i] for s in source_samples]) for i in range(3)]
svectors = vec(slng, slat)
balanced = []
for orientation in ['east-west', 'north-south']:
    low, high = (8, 36) if orientation == 'east-west' else (68, 97)
    for _ in range(40):
        middle = (low + high)/2
        normal = np.array([-math.sin(middle*RAD)*math.cos(80*RAD), -math.sin(middle*RAD)*math.sin(80*RAD), math.cos(middle*RAD)]) if orientation == 'east-west' else np.array([-math.sin(middle*RAD), math.cos(middle*RAD), 0])
        share = weights[(vectors@normal)>=0].sum()/weights.sum()
        if share > .5: low = middle
        else: high = middle
    found = []
    for a, b in zip(boundary, boundary[1:]):
        u,v=vec(a['lng'],a['lat']),vec(b['lng'],b['lat'])
        axis=np.cross(normal,np.cross(u,v)); length=np.linalg.norm(axis)
        if length < 1e-12: continue
        for sign in [1,-1]:
            w=axis*sign/length
            angle=lambda x,y:math.atan2(np.linalg.norm(np.cross(x,y)),np.dot(x,y))
            if abs(angle(u,w)+angle(w,v)-angle(u,v))<1e-7: found.append(dict(lat=math.asin(w[2])/RAD,lng=math.atan2(w[1],w[0])/RAD))
    found.sort(key=lambda p:p['lng'] if orientation=='east-west' else p['lat'])
    actual=float(sw[(svectors@normal)>=0].sum()/sw.sum()*100)
    balanced.append(dict(orientation=orientation, points=[found[0],found[-1]], population=float(share*100), sourcePopulation=actual, area=float(lands[(vectors@normal)>=0].sum()/lands.sum()*100)))
assert all(abs(e['population']-e['sourcePopulation']) < .5 for e in balanced)
# Independent source-resolution checks include diagonal cuts through different
# population concentrations, not just the two optimized demonstration solutions.
cut_errors = []
for longitude, latitude in [(74,18),(80,24),(86,30)]:
    center = vec(longitude, latitude)
    north = np.array([-math.sin(latitude*RAD)*math.cos(longitude*RAD),-math.sin(latitude*RAD)*math.sin(longitude*RAD),math.cos(latitude*RAD)])
    east = np.array([-math.sin(longitude*RAD),math.cos(longitude*RAD),0])
    for angle in np.arange(0,180,22.5):
        normal = np.cross(center, north*math.cos(angle*RAD)+east*math.sin(angle*RAD))
        coarse=float(weights[(vectors@normal)>=0].sum()/weights.sum()*100)
        fine=float(sw[(svectors@normal)>=0].sum()/sw.sum()*100)
        cut_errors.append(abs(coarse-fine))
assert max(cut_errors) < 1, cut_errors
zone_revision = hashlib.sha256((digest(eco_path)+revision+json.dumps(zones,sort_keys=True)).encode()).hexdigest()[:16]
output=dict(revision=revision, zoneRevision=zone_revision, indiaGeometry=mapping(india), landGeometry=mapping(neighbors.simplify(.015, preserve_topology=True)), landMask=land_mask, indiaMask=india_mask, paint=paint, zones=zones, population=grid, boundary=boundary, balancedExamples=balanced, cities=cities, circleExample=dict(lat=float(fit.x[1]),lng=float(fit.x[0])))
save(ROOT/'src/game/data/india-journey.v1.json', output)
# Publish the derived count database alongside its provenance and share-alike notice.
save(OUT/'india-model.v1.json', dict(indiaGeometry=output['indiaGeometry'], population=grid))
audit=dict(sourcePopulationTotal=source_total, retainedPopulation=clipped_total, aggregatedPopulation=sum(c[1] for c in cells), countryAreaKm2=country_m.area/1e6, gridAreaKm2=sum(c[2]for c in cells), populationCellCount=len(cells), paintingCellCount=len(paint_cells), disputedAreas=[f['properties']['BRK_NAME']for f in disputes], ignoredPaintingIslands=True, circleMinimumRadiusKm=radius(fit.x), circleExample=output['circleExample'], balancedExamples=balanced, ecoregions={str(i):next(f['properties']['ECO_NAME']for f in json.loads(eco_path.read_text())['features']if int(f['properties']['ECO_ID'])==i)for i in ECO_IDS}, inputs={p.name:digest(p)for p in [pop_path,dispute_path,eco_path,image_path,world_path,ROOT/'src/geography/data/cities.v1.json']}, outputSHA256=digest(ROOT/'src/game/data/india-journey.v1.json'))
audit['cutValidation'] = dict(samples=len(cut_errors), maximumErrorPercentagePoints=max(cut_errors))
(OUT/'data-audit.json').write_text(json.dumps(audit,indent=2)+'\n')
print(json.dumps({k:v for k,v in audit.items()if k not in ['ecoregions','inputs','disputedAreas']},indent=2))
