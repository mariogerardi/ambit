"""Journey-local imagery masks and edit footprints. Never regenerates scoring data.
Requires the same rasterio/shapely/Pillow environment as prepare-sahara-construction.py.
"""
import hashlib,json,pathlib,urllib.request
import numpy as np
from PIL import Image
from rasterio.features import rasterize
from rasterio.transform import from_bounds
from shapely.geometry import shape,box,mapping,Polygon
from shapely.ops import unary_union,nearest_points
from pyproj import Geod
ROOT=pathlib.Path(__file__).resolve().parents[1]
CACHE=ROOT/'.cache/constructive'; OUT=ROOT/'public/journeys/drawing-the-sahara'
world=json.loads((ROOT/'public/geography/world.v1.json').read_text())
source=json.loads((ROOT/'src/game/data/sahara-construction.v1.json').read_text())
capitals=json.loads((ROOT/'src/game/data/capitals.v1.json').read_text())['capitals']
africa_ids={p['countryId'] for p in capitals if p['continent']=='AF'}|{'wurl:ESH'}
africa=unary_union([shape(f['geometry']) for f in world if f['id'] in africa_ids]).intersection(box(-18,10,52,38)).simplify(.003,preserve_topology=True)
egypt=shape(next(f for f in world if f['id']=='wurl:EGY')['geometry'])
algeria=shape(source['algeriaGeometry'])
africa_path=CACHE/'north-africa.jpg'
if not africa_path.exists():
 query='SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&SRS=EPSG:4326&LAYERS=BlueMarble_NextGeneration&FORMAT=image/jpeg&WIDTH=5120&HEIGHT=2048&BBOX=-18,10,52,38'
 urllib.request.urlretrieve('https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?'+query,africa_path)
egypt_path=CACHE/'egypt.jpg'
if not egypt_path.exists():
 query='SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&SRS=EPSG:4326&LAYERS=BlueMarble_NextGeneration&FORMAT=image/jpeg&WIDTH=3072&HEIGHT=3072&BBOX=24,21,37,33'
 urllib.request.urlretrieve('https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?'+query,egypt_path)
# GeoJSON edges follow the image's longitude/latitude grid. Densify long
# parallels before the globe joins vertices with short great-circle segments.
africa=africa.segmentize(.15);egypt=egypt.segmentize(.15);algeria=algeria.segmentize(.15)
areas={}
def clipped_image(asset,out_name,geometry,bounds):
 im=Image.open(asset).convert('RGBA'); mask=rasterize([(mapping(geometry),255)],out_shape=(im.height,im.width),transform=from_bounds(*bounds,im.width,im.height),fill=0,dtype='uint8')
 alpha=np.array(im.getchannel('A'));im.putalpha(Image.fromarray(np.minimum(alpha,mask)));im.save(OUT/out_name,quality=92,method=6) if out_name.endswith('.webp') else im.save(OUT/out_name,optimize=True)
def area(name,geometry,bounds):
 mask=rasterize([(mapping(geometry),255)],out_shape=(1536,1536),transform=from_bounds(*bounds,1536,1536),fill=0,dtype='uint8')
 Image.fromarray(mask).convert('RGB').save(OUT/f'{name}-mask.png',optimize=True)
 areas[name]={'geometry':mapping(geometry),'mask':{'assetUrl':f'/journeys/drawing-the-sahara/{name}-mask.png','bounds':bounds}}
area('africa',africa,[-18,10,52,38]);area('egypt',egypt,[24,21,37,33]);area('algeria',algeria,[-9,18,12,38])
clipped_image(africa_path,'africa-satellite.webp',africa,[-18,10,52,38])
clipped_image(egypt_path,'egypt-satellite.webp',egypt,[24,21,37,33])
clipped_image(CACHE/'lights.png','algeria-lights.png',algeria,[-9,18,12,38])
clipped_image(OUT/'population.png','algeria-population.png',algeria,[-9,18,12,38])
# An attainable eight-corner solution, with the country-clipped footprint retained
# for a closed comparison outline instead of disconnected clipped line fragments.
anchors=[(-2,35),(-.5,35.9),(1.1,36.55),(3.2,36.85),(5.8,36.98),(7.9,36.9),(8,33.7),(-1,33.7)]
from shapely.geometry import Point
points=[]
for x,y in anchors:
 p=Point(x,y)
 if not algeria.contains(p):p=nearest_points(algeria.boundary,p)[0]
 # Move inward until the source polygon contains this actual editable corner.
 for fraction in [.0001,.0003,.001,.003,.01,.03]:
  candidate=Point(p.x+(3-p.x)*fraction,p.y+(28-p.y)*fraction)
  if algeria.contains(candidate):break
 points.append((candidate.x,candidate.y))
geod=Geod(a=6371008.8,b=6371008.8);line=[]
for a,b in zip(points,points[1:]+points[:1]):
 line.append(a);line.extend(geod.npts(*a,*b,max(1,int(geod.inv(*a,*b)[2]/10000))))
areas['northernRibbon']={'points':[{'lng':x,'lat':y}for x,y in points],'geometry':mapping(Polygon(line).intersection(algeria))}
(ROOT/'src/game/data/sahara-display.v1.json').write_text(json.dumps(areas,separators=(',',':'))+'\n')
audit={'inputSHA256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [africa_path,egypt_path,CACHE/'lights.png',ROOT/'public/geography/world.v1.json',ROOT/'src/game/data/sahara-construction.v1.json']},'areas':{name:{'bounds':a['mask']['bounds'],'mask':a['mask']['assetUrl']}for name,a in areas.items() if 'mask' in a}}
(OUT/'display-audit.json').write_text(json.dumps(audit,indent=2)+'\n')
print('Prepared Africa, Egypt and Algeria masks, outlines and local imagery.')
