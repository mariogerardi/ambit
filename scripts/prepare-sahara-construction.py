"""Reproduce frozen Drawing the Sahara inputs from reviewed cached source files.
Python: numpy pillow rasterio shapely scipy pyproj. No global catalogs are regenerated.
Inputs are intentionally explicit; sources/hashes and numerical audits accompany output.
"""
import hashlib,json,math,pathlib,shutil
import numpy as np
import rasterio
from rasterio.windows import Window
from rasterio.enums import Resampling
from shapely.geometry import shape,box,Polygon
from shapely.ops import transform,unary_union
from shapely import contains_xy,intersection,area as areas,box as boxes,prepare
from scipy.ndimage import label,binary_erosion,binary_dilation
from pyproj import Transformer,Geod
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1]
CACHE=ROOT/'.cache/constructive'; OUT=ROOT/'public/journeys/drawing-the-sahara'; OUT.mkdir(parents=True,exist_ok=True)
DATA=ROOT/'src/game/data/sahara-construction.v1.json'
R=6371008.8;RAD=math.pi/180
world=json.load(open(ROOT/'public/geography/world.v1.json'))
algeria=next(f for f in world if f['id']=='wurl:DZA')
boundary_source=json.load(open(CACHE/'algeria-boundary.geojson'))
country=unary_union([shape(f['geometry']) for f in boundary_source['features']]).simplify(.002,preserve_topology=True)
cea=f'+proj=cea +lat_ts=0 +R={R} +units=m +no_defs';project=Transformer.from_crs('EPSG:4326',cea,always_xy=True).transform
prepare(country)
country_m=transform(project,country)
def digest(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def save(p,value):pathlib.Path(p).write_text(json.dumps(value,separators=(',',':'))+'\n')
# Dune map is an actual expert-mapped 0.1-degree presence raster, not bare-land cover.
dune_path=next((CACHE/'dune-world').rglob('dune-mask-rev1.tif'))
west,south,east,north=-17,14,36,34;cols,rows=265,100
with rasterio.open(dune_path) as src:
 window=rasterio.windows.from_bounds(west,south,east,north,src.transform)
 mask=src.read(1,window=window,out_shape=(rows,cols),resampling=Resampling.average)>0.5
 mask=np.flipud(mask)
components,n=label(mask);sizes=np.bincount(components.ravel());major=np.isin(components,np.where(sizes>=12)[0][1:])
uncertain=binary_dilation(mask,iterations=1)^binary_erosion(mask,iterations=1)
# Small mapped dune patches are unscored rather than treating real dunes as errors.
uncertain|=mask&~major
land_shapes=[shape(f['geometry']) for f in world if f.get('level')=='ADM0']
from shapely.ops import unary_union
land=unary_union([p for p in land_shapes if p.intersects(box(west,south,east,north))])
dune_cells=[]
for y in range(rows):
 lat=south+(y+.5)*(north-south)/rows
 for x in range(cols):
  lng=west+(x+.5)*(east-west)/cols
  if uncertain[y,x] or not land.contains(__import__('shapely').Point(lng,lat)):continue
  a=R**2*((east-west)/cols*RAD)*(math.sin((south+(y+1)*(north-south)/rows)*RAD)-math.sin((south+y*(north-south)/rows)*RAD))/1e6
  dune_cells.append([y*cols+x,int(major[y,x]),round(a,3)])
dunes=dict(id='sahara-dunes-gunn-2026',label='Major dune fields · Gunn 2026 · 0.2° scoring cells; transitions unscored',sourceUrl='https://doi.org/10.5281/zenodo.20054674',revision=digest(dune_path)[:16],west=west,south=south,east=east,north=north,columns=cols,rows=rows,equalArea=False,cells=dune_cells)
# Aggregate positive source population counts by source-pixel centers. Every retained
# count is assigned once; country clipping is performed at the original 100m centers.
step=6000;x0,y0,x1,y1=country_m.bounds;x0=math.floor(x0/step)*step;y0=math.floor(y0/step)*step
cols=math.ceil((x1-x0)/step);rows=math.ceil((y1-y0)/step);pop=np.zeros(rows*cols);raw_total=0.;clipped_total=0.
with rasterio.open(CACHE/'algeria-population.tif') as src:
 for row in range(0,src.height,1024):
  for col in range(0,src.width,1024):
   a=src.read(1,window=Window(col,row,min(1024,src.width-col),min(1024,src.height-row)))
   rr,cc=np.nonzero((a>0)&np.isfinite(a));values=a[rr,cc].astype('float64');raw_total+=values.sum()
   if not len(values):continue
   lng=src.transform.c+(col+cc+.5)*src.transform.a;lat=src.transform.f+(row+rr+.5)*src.transform.e
   inside=contains_xy(country,lng,lat);values=values[inside];lng=lng[inside];lat=lat[inside];clipped_total+=values.sum()
   xx=R*lng*RAD;yy=R*np.sin(lat*RAD);ix=np.floor((xx-x0)/step).astype(int);iy=np.floor((yy-y0)/step).astype(int)
   pop+=np.bincount(iy*cols+ix,weights=values,minlength=rows*cols)
ix,iy=np.meshgrid(np.arange(cols),np.arange(rows));indices=(iy*cols+ix).ravel()
rectangles=boxes(x0+ix.ravel()*step,y0+iy.ravel()*step,x0+(ix.ravel()+1)*step,y0+(iy.ravel()+1)*step)
landareas=areas(intersection(rectangles,country_m))/1e6
cells=[[int(i),round(float(pop[i]),3),round(float(landareas[i]),5)] for i in indices if landareas[i]>.001]
grid=dict(id='algeria-worldpop-2024-6km',label='WorldPop 2024 R2025A v1 · country-clipped 6 km equal-area cells · modeled residents',sourceUrl='https://data.worldpop.org/GIS/Population/Global_2015_2030/R2025A/2024/DZA/v1/100m/constrained/',revision=hashlib.sha256((digest(CACHE/'algeria-population.tif')+digest(CACHE/'algeria-boundary.geojson')+'6km-v1').encode()).hexdigest()[:16],west=x0/R/RAD,east=(x0+cols*step)/R/RAD,south=math.asin(y0/R)/RAD,north=math.asin((y0+rows*step)/R)/RAD,columns=cols,rows=rows,equalArea=True,cells=cells)
# Reveal-only population map: north-up equirectangular georeferencing, alpha outside land.
heat=np.zeros((1200,1200,4),dtype=np.uint8)
for i,count,a in cells:
 if count<=0:continue
 gx=i%cols;gy=i//cols;lng=grid['west']+(gx+.5)/cols*(grid['east']-grid['west']);lat=math.asin((y0+(gy+.5)*step)/R)/RAD
 px=int((lng+9)/21*1200);py=int((38-lat)/20*1200)
 strength=min(1,math.log1p(count/a)/math.log(8000))
 if 0<=px<1200 and 0<=py<1200:
  color=[255,int(210-130*strength),65,int(50+190*strength)]
  heat[max(0,py-2):min(1200,py+3),max(0,px-2):min(1200,px+3)]=color
Image.fromarray(heat).save(OUT/'population.png',optimize=True)
for name in ['sahara.jpg','nile.jpg','lights.png']:shutil.copyfile(CACHE/name,OUT/name)
# Clear texture comparisons from one NASA ISS photograph, not upscaled map pixels.
erg=Image.open(CACHE/'erg-oriental.jpg')
for name,bounds in [('sand-texture.jpg',(0,.06,.29,.387)),('rock-texture.jpg',(.69,.12,1,.47))]:
 crop=erg.crop(tuple(int(v*(erg.width if i%2==0 else erg.height)) for i,v in enumerate(bounds)))
 crop.resize((480,360),Image.Resampling.LANCZOS).save(OUT/name,quality=90)
# Publish the exact derived footprint and population database under ODbL 1.0.
save(OUT/'algeria-model.v1.json',dict(boundary=__import__('shapely').geometry.mapping(country),population=grid))
# Reuse bundled Natural Earth centerline and trim its true ordered route to city latitudes.
physical=json.load(open(ROOT/'public/geography/physical.v1.json'))['features'];line=next(p for f in physical if f['name']=='Nile' for p in f['paths'] if min(x[1] for x in p)<24 and max(x[1] for x in p)>30)
nile=[dict(lng=x,lat=y) for x,y in line if 24.08<=y<=30.05]
# Endpoints lie on the reviewed river, not an invented straight replacement.
if nile[0]['lat']>nile[-1]['lat']:nile.reverse()
boundary=list(max(country.geoms,key=lambda g:g.area).exterior.coords if country.geom_type=='MultiPolygon' else country.exterior.coords)
boundary=[dict(lng=x,lat=y) for x,y in boundary]
# Independent feasibility example with geodesic polygon edges.
geod=Geod(a=R,b=R)
def densify(points):
 out=[]
 for a,b in zip(points,points[1:]+points[:1]):out.append(a);out.extend(geod.npts(*a,*b,max(1,int(geod.inv(*a,*b)[2]/20000))))
 return Polygon(out)
centers=[]
for i,count,a in cells:centers.append((grid['west']+(i%cols+.5)/cols*(grid['east']-grid['west']),math.asin((y0+(i//cols+.5)*step)/R)/RAD,count,a))
centers=np.array(centers);examples=[]
for latitude in [32,33,33.5,34,34.5]:
 vertices=[(-9,latitude),(12,latitude),(12,38),(-9,38)];p=densify(vertices);inside=contains_xy(p,centers[:,0],centers[:,1]);examples.append(dict(points=[dict(lng=x,lat=y)for x,y in vertices],population=round(centers[inside,2].sum()/centers[:,2].sum()*100,4),area=round(centers[inside,3].sum()/centers[:,3].sum()*100,4)))
# Solve two differently oriented population bisectors against the same frozen cells.
def vec(p):
 a,b=p['lat']*RAD,p['lng']*RAD
 return np.array([math.cos(a)*math.cos(b),math.cos(a)*math.sin(b),math.sin(a)])
vs=np.array([vec(dict(lng=x,lat=y)) for x,y,_,_ in centers]);weights=centers[:,2];lands=centers[:,3]
def crossing(normal):
 found=[]
 for a,b in zip(boundary,boundary[1:]):
  u,v=vec(a),vec(b);axis=np.cross(normal,np.cross(u,v));length=np.linalg.norm(axis)
  if length<1e-12:continue
  for sign in [1,-1]:
   w=axis*sign/length
   angle=lambda x,y:math.atan2(np.linalg.norm(np.cross(x,y)),np.dot(x,y))
   if abs(angle(u,w)+angle(w,v)-angle(u,v))<1e-7:found.append(dict(lat=math.asin(w[2])/RAD,lng=math.atan2(w[1],w[0])/RAD))
 return sorted(found,key=lambda p:p['lng'])
balanced=[]
for orientation in ['east-west','north-south']:
 low,high=(32,37.1) if orientation=='east-west' else (-8,12)
 for _ in range(45):
  middle=(low+high)/2
  normal=np.array([-math.sin(middle*RAD)*math.cos(2*RAD),-math.sin(middle*RAD)*math.sin(2*RAD),math.cos(middle*RAD)]) if orientation=='east-west' else np.array([-math.sin(middle*RAD),math.cos(middle*RAD),0])
  share=weights[(vs@normal)>=0].sum()/weights.sum()
  if share>.5:low=middle
  else:high=middle
 found=crossing(normal)
 if orientation=='north-south':found=sorted(found,key=lambda p:p['lat'])
 balanced.append(dict(orientation=orientation,points=[found[0],found[-1]],population=share*100,area=lands[(vs@normal)>=0].sum()/lands.sum()*100))
result=dict(dunes=dunes,population=grid,nile=nile,boundary=boundary,balancedExamples=balanced,algeriaGeometry=__import__('shapely').geometry.mapping(country),examples=examples)
save(DATA,result)
audit=dict(sourcePopulationTotal=raw_total,countryClippedTotal=clipped_total,aggregatedTotal=sum(c[1]for c in cells),countryAreaKm2=country_m.area/1e6,gridAreaKm2=sum(c[2]for c in cells),populationCellCount=len(cells),duneCellCount=len(dune_cells),duneFraction=sum(v*a for _,v,a in dune_cells)/sum(a for _,_,a in dune_cells),polygonExamples=examples,balancedExamples=balanced,inputs={p.name:digest(p) for p in [dune_path,CACHE/'algeria-population.tif',CACHE/'algeria-boundary.geojson',ROOT/'public/geography/world.v1.json',ROOT/'public/geography/physical.v1.json',CACHE/'sahara.jpg',CACHE/'nile.jpg',CACHE/'lights.png',CACHE/'erg-oriental.jpg']})
save(OUT/'data-audit.json',audit)
license_path=next((CACHE/'dune-world').rglob('LICENSE'));shutil.copyfile(license_path,OUT/'dune-map-LICENSE.txt')
print(json.dumps({k:v for k,v in audit.items() if k!='inputs'},indent=2))
