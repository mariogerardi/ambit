"""Prepare terrain-anchored, pictorial mountain chains for offline display.

Run in a virtualenv with scripts/terrain-requirements.txt. The pinned input
manifest detects upstream changes; intentionally review before replacing it.
"""
import hashlib
import json
import math
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import urlopen

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, maximum_filter
from shapely.geometry import Point, shape
from shapely.prepared import prep

ZOOM = 5
SIZE = 256
N = 2 ** ZOOM * SIZE
BASE = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium"
OUT = Path("src/game/data/andes-relief.v1.json")
MANIFEST = Path("sources/andes-relief-manifest.json")
CACHE = Path(".cache/terrain")
CACHE.mkdir(parents=True, exist_ok=True)
# Covers the complete reviewed range, including Tierra del Fuego and Mérida.
XS = range(8, 11)
YS = range(14, 23)
previous = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else None

def load_tile(tile):
    x, y = tile
    url = f"{BASE}/{ZOOM}/{x}/{y}.png"
    path = CACHE / f"{ZOOM}-{x}-{y}.png"
    if not path.exists():
        path.write_bytes(urlopen(url, timeout=30).read())
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if previous and previous["tiles"].get(url) != digest:
        raise ValueError(f"Elevation source changed: review {url} before updating manifest")
    rgb = np.asarray(Image.open(path).convert("RGB"), dtype=np.float64)
    elevation = rgb[:, :, 0] * 256 + rgb[:, :, 1] + rgb[:, :, 2] / 256 - 32768
    return x, y, url, digest, elevation

with ThreadPoolExecutor(max_workers=6) as pool:
    tiles = list(pool.map(load_tile, [(x, y) for y in YS for x in XS]))
height = np.empty((len(YS) * SIZE, len(XS) * SIZE))
for x, y, _, _, elevation in tiles:
    height[(y - YS.start)*SIZE:(y-YS.start+1)*SIZE,
           (x - XS.start)*SIZE:(x-XS.start+1)*SIZE] = elevation
height = gaussian_filter(height, 1.2)
footprint = prep(shape(json.loads(Path("src/game/data/andes-context.v1.json").read_text())["andes"]["geometry"]))

def location(y, x):
    # Pixel centers in Web Mercator. GeoJSON coordinates are always lng, lat.
    px, py = x + XS.start*SIZE + .5, y + YS.start*SIZE + .5
    lng = px / N * 360 - 180
    lat = math.degrees(math.atan(math.sinh(math.pi*(1-2*py/N))))
    return [round(lng, 4), round(lat, 4)]

def inside(y, x):
    return footprint.contains(Point(location(y, x)))

# Regional high points anchor grouped mountain symbols. The silhouettes are
# cartographic illustration, NOT traced summit outlines or surveyed ridgelines.
# Poisson-like spacing avoids the old disconnected, pixel-scale twig texture.
maximum = maximum_filter(height, size=9)
candidates = sorted(zip(*np.nonzero((height == maximum) & (height > 900))),
                    key=lambda point: -height[point])
anchors = []
for y, x in candidates:
    if inside(y, x) and all((y-ay)**2 + (x-ax)**2 >= 64 for ay, ax in anchors):
        anchors.append((y, x))
ridges, highlights, hachures, light_faces, dark_faces = [], [], [], [], []
for y, x in sorted(anchors):
    # Two joined peaks with a shared saddle, shoulders and attached slope ink.
    # Scale gently with elevation; shadows indicate a drawn face, never snow.
    scale = .8 + min(height[y, x]/5000, 1) * .35
    seed = (int(y)*31 + int(x)*17) % 11
    width, rise = 11*scale, (11 + seed*.25)*scale
    left = (y+4*scale, x-width)
    top = (y-rise, x-1.5*scale)
    saddle = (y-2*scale, x+1.2*scale)
    second = (y-rise*.64, x+4*scale)
    right = (y+4*scale, x+width)
    foot = (y+6.5*scale, x+1*scale)
    # Keep every pictorial stroke/face within reviewed terrain extent.
    outline = [left, top, saddle, second, right, foot]
    if not all(inside(*point) for point in outline):
        continue
    loc = lambda point: location(*point)
    shoulder = (y-rise*.28, x-width*.5)
    notch = (y-rise*.4, x-width*.46)
    ridge = [left, shoulder, notch, top, (y-rise*.66,x-.7*scale), saddle, second,
             (y-rise*.3,x+5*scale), right]
    ridges.append(list(map(loc, ridge)))
    ridges.append(list(map(loc, [top, (y-1*scale,x-.1*scale), foot])))
    highlights.append(list(map(loc, [shoulder, notch, top, (y-rise*.54,x-3.8*scale)])))
    light_faces.append(list(map(loc, [left, shoulder, notch, top, foot, left])))
    dark_faces.append(list(map(loc, [top, saddle, second, right, foot, top])))
    # Ink remains attached to its own crest/face rather than scattered over land.
    for t in [.24, .4, .56, .72]:
        start = (top[0]*(1-t)+foot[0]*t, top[1]*(1-t)+foot[1]*t)
        end = (start[0]+(2.5+t*2)*scale, start[1]+(2.3+t*1.7)*scale)
        mid = (start[0]+1.2*scale, start[1]+1.1*scale)
        if all(inside(*point) for point in [start, mid, end]):
            hachures.append(list(map(loc, [start, mid, end])))
    # Secondary peak shares the first peak's foothills.
    ridges.append(list(map(loc, [second, (y+1*scale,x+4.5*scale), right])))
result = {"ridges": ridges, "hachures": hachures, "highlights": highlights,
          "lightFaces": light_faces, "darkFaces": dark_faces}
OUT.write_text(json.dumps(result, separators=(",", ":")) + "\n")
MANIFEST.write_text(json.dumps({
    "source": "Mapzen/Tilezen Terrain Tiles on AWS; USGS GMTED2010/SRTM and NOAA ETOPO1",
    "accessed": "2026-10-11", "zoom": ZOOM,
    "attributionUrl": "https://github.com/tilezen/joerd/blob/master/docs/attribution.md",
    "tiles": {url: digest for _, _, url, digest, _ in tiles},
    "derivedSha256": hashlib.sha256(OUT.read_bytes()).hexdigest(),
    "processing": "Gaussian elevation generalization; spaced regional high points anchor joined pictorial peaks with shared saddles, shaded faces and attached hatching. All vertices clipped to reviewed Andes extent. Symbols are illustrative, not exact summit outlines, ridgelines or snow cover. Display only; never used for grading."
}, indent=2)+"\n")
print(f"Prepared {len(ridges)} crest segments, {len(hachures)} slope strokes, {len(highlights)} high-elevation segments; {OUT.stat().st_size} bytes.")
