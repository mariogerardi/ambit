"""Freeze Journey-local 2004 election regions, masks and area-weighted grading grid.
Python >=3.11 with shapely, numpy, pillow and pyproj. Never changes shared geography.
Inputs are checksum pinned; reruns use .cache/power-people. Output geometry is ODbL.
"""
from pathlib import Path
import hashlib
import html
import json
import math
import re
import urllib.request

import numpy as np
from PIL import Image
from pyproj import Geod
from shapely import contains_xy, intersection, area, box as boxes
from shapely.geometry import shape, mapping, box
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.cache/power-people'
OUT = ROOT / 'public/journeys/power-to-the-people'
CACHE.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
CEC = 'https://cvk.gov.ua/pls/vp2004/wp301e2e3e.html'
GEO = 'https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/UKR/ADM1/geoBoundaries-UKR-ADM1.geojson'

def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def fetch(name, url, sha):
    p = CACHE / name
    if not p.exists():
        urllib.request.urlretrieve(url, p)
    assert digest(p) == sha, f'Changed source: {name}; review before updating checksum'
    return p

def save(p, d):
    p.write_text(json.dumps(d, separators=(',', ':'), allow_nan=False) + '\n')

cp = fetch('cec-2004.html', CEC, '68032351449e99b6b262744ba86834053b82f89d3691ea075323f8c2e5def55a')
gp = fetch('ukraine-adm1.geojson', GEO, 'b2f9f4ad2e9be5888523219c0bb46a24332ead16b46305409098048fd361a2d6')
# CEC table order, explicitly keyed to ISO units, including the two separate cities.
iso = ['43','05','07','12','14','18','21','23','26','32','35','09','46','48','51','53','56','59','61','63','65','68','71','77','74','30','40']
expected = {'05','07','18','21','26','32','35','46','53','56','59','61','68','71','77','74','30'}
page = cp.read_text(encoding='cp1251')
assert 'Elections 26.12.2004' in page
rows = []
for tr in re.findall(r'<tr>(.*?)</tr>', page, re.S | re.I):
    cells = [html.unescape(re.sub('<[^>]+>', '', x)).strip() for x in re.findall(r'<td\b[^>]*>(.*?)</td>', tr, re.S | re.I)]
    if len(cells) == 5 and ('Jushhenko' in cells[1] or 'Janukovych' in cells[1]):
        rows.append(dict(iso='UA-'+iso[len(rows)], cecName=cells[0], winner='Yushchenko' if 'Jushhenko' in cells[1] else 'Yanukovych', share=float(cells[2]), voters=int(cells[3].replace(' ',''))))
assert len(rows) == 27
assert {r['iso'][3:] for r in rows if r['winner']=='Yushchenko'} == expected
source = dict(electionDate='2004-12-26', reviewedOn='2026-11-02', sourceUrl=CEC, sourceSHA256=digest(cp), regions=rows)
save(OUT / 'regional-results.json', source)
features = json.loads(gp.read_text())['features']
assert {f['properties']['shapeISO'] for f in features} == {r['iso'] for r in rows}
# OSM ADM1 includes coastal waters. Clip against the bundled Natural Earth land,
# using *all* countries so the current Russia display convention cannot drop Crimea.
wp = ROOT / 'public/geography/world.v1.json'
world = json.loads(wp.read_text())
window = box(22,44,41,53)
land = unary_union([shape(f['geometry']).intersection(window) for f in world if shape(f['geometry']).intersects(window)])
by_iso = {r['iso']: r for r in rows}
regions = []
for f in features:
    p = f['properties']
    g = shape(f['geometry']).buffer(0).intersection(land).simplify(.001, preserve_topology=True)
    assert g.is_valid and not g.is_empty
    regions.append(dict(iso=p['shapeISO'], name=p['shapeName'], winner=by_iso[p['shapeISO']]['winner'], geometry=mapping(g)))
country = unary_union([shape(r['geometry']) for r in regions])
target = unary_union([shape(r['geometry']) for r in regions if r['winner']=='Yushchenko'])
other = unary_union([shape(r['geometry']) for r in regions if r['winner']=='Yanukovych'])
# Source interiors must not overlap; retain the independently clipped city units.
assert target.intersection(other).area / country.area < .0001
for name, point in [('Kyiv', (30.52,50.45)), ('Sevastopol',(33.52,44.60)), ('Autonomous Republic of Crimea',(34.10,44.95))]:
    assert contains_xy(shape(next(r['geometry'] for r in regions if r['name']==name)), *point)
B = [22,44,41,53]
W,H = 190,90
geod = Geod(ellps='WGS84')
xs = np.linspace(B[0],B[2],W+1)
ys = np.linspace(B[1],B[3],H+1)
# Exact planar cell intersections give clipped fractions. Geodesic full-cell area
# supplies the latitude weight; finer subcells independently audit area/alignment.
x,y = np.meshgrid(xs[:-1],ys[:-1])
cells = boxes(x.ravel(), y.ravel(), (x+.1).ravel(), (y+.1).ravel())
clipped = intersection(cells,country)
fractions = area(clipped)/.01
hits = area(intersection(cells,target))/.01
geod_area = np.array([abs(geod.geometry_area_perimeter(box(B[0],lat,B[0]+.1,lat+.1))[0])/1e6 for lat in y.ravel()])
values = []
for i in np.flatnonzero(fractions>1e-8):
    values.append([int(i), round(float(hits[i]/fractions[i]),6), round(float(geod_area[i]*fractions[i]),6)])
base='/journeys/power-to-the-people/'
grid=dict(id='ukraine-2004-repeat-runoff', label='Yushchenko-winning regions', sourceUrl=CEC, revision='cec-2004-12-26-gb9469f09-land-v1',west=22,south=44,east=41,north=53,columns=W,rows=H,equalArea=False,cells=values)
# All display and alpha masks come from the exact same clipped source units.
pw,ph=1900,900
xx,yy=np.meshgrid(np.linspace(22,41,pw,endpoint=False)+19/pw/2,np.linspace(53,44,ph,endpoint=False)-9/ph/2)
inside=contains_xy(country,xx,yy)
won=contains_xy(target,xx,yy)
for name,mask in [('ukraine-mask.png',inside),('target-mask.png',won)]:
    Image.fromarray((mask*255).astype('uint8')).save(OUT/name)
rgba=np.zeros((ph,pw,4),dtype='uint8')
rgba[inside]=[133,113,197,150]
rgba[won]=[230,152,58,155]
Image.fromarray(rgba).save(OUT/'regional-winners.png')
# A coarse, plausible serpentine brush example, with simpler partial/wrong anchors.
def stroke(points, radius=45):
    return dict(points=[dict(lng=x,lat=y) for x,y in points],radiusKm=radius,erase=False)
examples = {
 'broad': [stroke([(x,lat) for x in np.arange(lo,hi,.35)]) for lat,lo,hi in [(48.0,22.5,26.8),(48.6,23,29),(49.2,23,31.5),(49.8,23.4,34.3),(50.4,24,34.9),(51.0,24,34.8),(51.6,25,34.4)]],
 'partial': [stroke([(23.3,49.1),(24.5,49.8),(26,50.5),(28,50.5)],65)],
 'wrongSide': [stroke([(35,48),(37,48),(39,48)],100),stroke([(33,45.4),(35,45.4)],90)],
}
examples['complete'] = examples['broad']
examples['middle'] = examples['broad'][:4]
examples['lower'] = examples['broad'][:3]
data=dict(regions=regions, countryGeometry=mapping(country),grid=grid, examples={k:dict(version=1,kind='brush',strokes=v) for k,v in examples.items()},mask=dict(assetUrl=base+'ukraine-mask.png',bounds=B),targetMask=dict(assetUrl=base+'target-mask.png',bounds=B))
dp=ROOT/'src/game/data/power-people-ukraine.v1.json'
save(dp,data)
# Independent point sampling on a non-aligned grid and ellipsoidal polygon area.
ax,ay=np.meshgrid(np.linspace(22,41,763),np.linspace(44,53,367))
sample=contains_xy(country,ax,ay)
sample_won=contains_xy(target,ax,ay)
country_km=sum(abs(geod.geometry_area_perimeter(g)[0]) for g in (country.geoms if hasattr(country,'geoms') else [country]))/1e6
assert 590000 < country_km < 615000, country_km
sample_share=float(np.sum(np.cos(np.deg2rad(ay))*sample_won)/np.sum(np.cos(np.deg2rad(ay))*sample))
grid_share=sum(v*a for _,v,a in values)/sum(a for _,_,a in values)
assert abs(sample_share-grid_share)<.002
assert abs(sum(a for _,_,a in values)/country_km-1)<.01
save(OUT/'historical-regions.geojson',dict(type='FeatureCollection',features=[dict(type='Feature',properties={k:v for k,v in r.items() if k!='geometry'},geometry=r['geometry']) for r in regions]))
outputs={name:digest(OUT/name) for name in ['ukraine-mask.png','target-mask.png','regional-winners.png','historical-regions.geojson','regional-results.json']}
save(OUT/'data-audit.json',dict(outputsSHA256=outputs,sourceSHA256=digest(cp),geometrySHA256=digest(gp),worldSHA256=digest(wp),outputSHA256=digest(dp),units=len(regions),targetUnits=17,otherUnits=10,countryAreaKm2=country_km,gridAreaKm2=sum(a for _,_,a in values),gridTargetShare=grid_share,independentTargetShare=sample_share,geometryVintage='2017 OSM ADM1, reconciled to the 27 CEC 2004 unit identities; coastline clipped to bundled Natural Earth. Not a surveyed 2004 boundary archive.',bounds=B,columns=W,rows=H))
print(f'Prepared {len(regions)} regions; {country_km:.0f} km²; target {grid_share:.3%}; {len(values)} grading cells')
