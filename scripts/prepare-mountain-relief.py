"""Prepare offline, elevation-derived mountain ink. No invented peak stamps.

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
from scipy.ndimage import gaussian_filter, map_coordinates
from shapely.geometry import Point, shape
from shapely.prepared import prep
from skimage.morphology import skeletonize

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
gy, gx = np.gradient(height)
# Cross-ridge curvature and gradient: detect local crests, not arbitrary contours.
hxx = gaussian_filter(height, 1.2, order=(0, 2))
hyy = gaussian_filter(height, 1.2, order=(2, 0))
hxy = gaussian_filter(height, 1.2, order=(1, 1))
minimum = (hxx+hyy-np.sqrt((hxx-hyy)**2+4*hxy**2))/2
nx, ny = hxy, minimum-hxx
length = np.hypot(nx, ny)
nx = np.divide(nx, length, out=np.ones_like(nx), where=length > 1e-9)
ny = np.divide(ny, length, out=np.zeros_like(ny), where=length > 1e-9)
crest = skeletonize((minimum < -45) & (np.abs(gx*nx+gy*ny) < 55) & (height > 650))
footprint = prep(shape(json.loads(Path("src/game/data/andes-context.v1.json").read_text())["andes"]["geometry"]))

def location(y, x):
    # Pixel centers in Web Mercator. GeoJSON coordinates are always lng, lat.
    px, py = x + XS.start*SIZE + .5, y + YS.start*SIZE + .5
    lng = px / N * 360 - 180
    lat = math.degrees(math.atan(math.sinh(math.pi*(1-2*py/N))))
    return [round(lng, 4), round(lat, 4)]

def inside(y, x):
    return footprint.contains(Point(location(y, x)))

ridges, highlights, hachures = [], [], []
for y, x in zip(*np.nonzero(crest)):
    if not inside(y, x):
        continue
    # Adjacent skeleton pixels form source-grounded crest segments.
    for dy, dx in [(0, 1), (1, -1), (1, 0), (1, 1)]:
        yy, xx = y+dy, x+dx
        if yy >= height.shape[0] or xx < 0 or xx >= height.shape[1]:
            continue
        if crest[yy, xx] and inside(yy, xx):
            path = [location(y, x), location(yy, xx)]
            (highlights if height[y, x] > 3500 else ridges).append(path)
# Regular sampling with an alternating offset; strokes follow the actual downhill
# gradient. Flat plateaus remain mostly clear, rather than filled with decoration.
for y in range(3, height.shape[0]-3, 4):
    for x in range(3+(y//4 % 2), height.shape[1]-3, 4):
        slope = math.hypot(gx[y, x], gy[y, x])
        if height[y, x] < 500 or slope < 60 or not inside(y, x):
            continue
        xx, yy = float(x), float(y)
        path = [location(yy, xx)]
        step = .55 + min(slope/350, .55)
        for _ in range(3):
            dx = float(map_coordinates(gx, [[yy], [xx]], order=1)[0])
            dy = float(map_coordinates(gy, [[yy], [xx]], order=1)[0])
            norm = math.hypot(dx, dy)
            if norm < 20:
                break
            xx -= dx/norm*step
            yy -= dy/norm*step
            if not (1 <= xx < height.shape[1]-1 and 1 <= yy < height.shape[0]-1) or not inside(yy, xx):
                break
            path.append(location(yy, xx))
        if len(path) > 1:
            hachures.append(path)
result = {"ridges": ridges, "hachures": hachures, "highlights": highlights}
OUT.write_text(json.dumps(result, separators=(",", ":")) + "\n")
MANIFEST.write_text(json.dumps({
    "source": "Mapzen/Tilezen Terrain Tiles on AWS; USGS GMTED2010/SRTM and NOAA ETOPO1",
    "accessed": "2026-10-11", "zoom": ZOOM,
    "attributionUrl": "https://github.com/tilezen/joerd/blob/master/docs/attribution.md",
    "tiles": {url: digest for _, _, url, digest, _ in tiles},
    "derivedSha256": hashlib.sha256(OUT.read_bytes()).hexdigest(),
    "processing": "Gaussian generalization; cross-slope crest detection and downhill gradient hachures, clipped to reviewed Andes orientation extent. Pale strokes indicate high elevation, not permanent snow. Display only; never used for grading."
}, indent=2)+"\n")
print(f"Prepared {len(ridges)} crest segments, {len(hachures)} slope strokes, {len(highlights)} high-elevation segments; {OUT.stat().st_size} bytes.")
