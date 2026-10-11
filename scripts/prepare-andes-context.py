"""Extract pinned, public-domain physical geography; never invent a route line."""
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen

BASE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/"
FILES = {"ranges10": "ne_10m_geography_regions_polys.geojson",
         "lakes": "ne_10m_lakes.geojson",
         "peaks": "ne_10m_geography_regions_elevation_points.geojson"}
sources = {}
data = {}
for key, filename in FILES.items():
    cache = Path(f".cache/explore/{key}.geojson")
    if not cache.exists():
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_bytes(urlopen(BASE + filename).read())
    raw = cache.read_bytes()
    sources[key] = {"url": BASE + filename, "sha256": hashlib.sha256(raw).hexdigest()}
    data[key] = json.loads(raw)["features"]

def name(feature):
    p = feature["properties"]
    return p.get("NAME_EN") or p.get("name_en") or p.get("NAME") or p.get("name")

def find(key, target):
    return next(f for f in data[key] if target in [f["properties"].get(k) for k in ["NAME_EN", "name_en", "NAME", "name"]])

def rounded(value):
    return [rounded(v) for v in value] if isinstance(value, list) else round(value, 4)

def physical(key, target, feature_id, kind, lat, lng, color, opacity):
    geometry = find(key, target)["geometry"]
    geometry = {"type": geometry["type"], "coordinates": rounded(geometry["coordinates"])}
    polygons = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
    return {"id": feature_id, "name": "Lake Titicaca" if key == "lakes" else target,
            "kind": kind, "lat": lat, "lng": lng, "rank": 1,
            "geometry": geometry, "paths": [ring for polygon in polygons for ring in polygon],
            "color": color, "fillOpacity": opacity}

andes = physical("ranges10", "Andes", "andes:range", "mountain", -16.7, -71.8, "#d7b17d", .24)
# The coarse label extent includes Venezuela's separate Coastal Range. For this
# geographic convention, retain the main extent south of 8°N and use the source's
# distinct Cordillera de Mérida footprint for the Venezuelan Andes.
def south_of(ring, latitude):
    result = []
    points = ring[:-1]
    for a, b in zip(points[-1:] + points[:-1], points):
        a_inside, b_inside = a[1] <= latitude, b[1] <= latitude
        if a_inside != b_inside:
            t = (latitude - a[1]) / (b[1] - a[1])
            result.append([round(a[0] + t * (b[0] - a[0]), 4), latitude])
        if b_inside:
            result.append(b)
    return result + [result[0]] if len(result) >= 3 else []
polygons = []
for polygon in andes["geometry"]["coordinates"]:
    rings = [south_of(ring, 8) for ring in polygon]
    if rings[0]:
        polygons.append([ring for ring in rings if ring])
merida = rounded(find("ranges10", "Cordillera de Mérida")["geometry"]["coordinates"])
polygons.append(merida)
andes["geometry"]["coordinates"] = polygons
andes["paths"] = [ring for polygon in polygons for ring in polygon]
andes["extentConvention"] = "Main Andes extent south of 8°N plus reviewed Cordillera de Mérida extent; Venezuelan Coastal Range excluded. Generalized orientation, not precise topography."
andes["labelAnchors"] = [[-74, 6], [-78.2, -1.5], [-71.8, -14], [-69.6, -28], [-70, -38], [-72, -48]]
altiplano = physical("ranges10", "Altiplano", "andes:altiplano", "landform", -18, -68, "#d7b17d", .12)
lake = physical("lakes", "Lago Titicaca", "andes:titicaca", "landform", -15.8, -69.3, "#72b9d2", .9)
peaks = {}
for target in ["Chimborazo", "Cerro Aconcagua"]:
    lng, lat = find("peaks", target)["geometry"]["coordinates"]
    peaks[target] = {"lng": lng, "lat": lat}

# Only shared source edges: no invented frontier or country-centroid connections.
world_raw = Path("public/geography/world.v1.json").read_bytes()
world = json.loads(world_raw)
def edges(feature):
    geometry = feature["geometry"]
    polygons = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
    return {tuple(sorted([tuple(a), tuple(b)])): [a, b]
            for polygon in polygons for ring in polygon for a, b in zip(ring, ring[1:])}
chile_edges = edges(next(f for f in world if f["id"] == "wurl:CHL"))
frontiers = []
for code in ["PER", "BOL", "ARG"]:
    neighbor_edges = edges(next(f for f in world if f["id"] == f"wurl:{code}"))
    shared = [chile_edges[key] for key in sorted(chile_edges.keys() & neighbor_edges.keys())]
    if not shared:
        raise ValueError(f"Missing reviewed Chile–{code} boundary")
    frontiers.append({"id": f"andes:chile-border:{code}", "name": "", "kind": "landform", "lat": -25, "lng": -69,
                      "rank": 1, "labelAnchors": [], "paths": shared, "color": "#78dfaa"})
sources["borders"] = {"asset": "public/geography/world.v1.json", "sha256": hashlib.sha256(world_raw).hexdigest()}
result = {"source": "Natural Earth v5.1.2; public domain", "sources": sources,
          "note": "Generalized physical extents and lake shoreline, rounded to four decimals. Northern Andes convention excludes Venezuela’s Coastal Range; clipping intersections are recorded in the derived geometry. Mountain extents are orientation, not a ridge or exact topographic boundary.",
          "andes": andes, "altiplano": altiplano, "lake": lake, "peaks": peaks, "frontiers": frontiers}
Path("src/game/data/andes-context.v1.json").write_text(json.dumps(result, separators=(",", ":")) + "\n")
print("Prepared reviewed Andes extents, Titicaca shoreline, and summit coordinates.")
