"""Build only the shared-names Journey assets from checked-in source subsets.

No network, global catalog/geography regeneration, or watershed-map tracing.
"""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads((ROOT / path).read_text())


def simplify(path, tolerance=0.00025):
    """Retain original vertices, including both endpoints (about 25 m tolerance)."""
    if len(path) < 3:
        return path
    a, b = path[0], path[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    length = dx * dx + dy * dy
    def distance(p):
        t = max(0, min(1, ((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)) if length else 0
        return ((p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2)**0.5
    index = max(range(1, len(path)-1), key=lambda i: distance(path[i]))
    if distance(path[index]) <= tolerance:
        return [a, b]
    return simplify(path[:index+1], tolerance)[:-1] + simplify(path[index:], tolerance)


thames_path = "public/geography/shared-names-thames-source.v1.geojson"
thames_source = read(thames_path)
ways = thames_source["features"][:]
endpoints = {}
for w in ways:
    for n, point in zip([w["properties"]["nodeIds"][0], w["properties"]["nodeIds"][-1]],
                        [w["geometry"]["coordinates"][0], w["geometry"]["coordinates"][-1]]):
        endpoints.setdefault(n, []).append(point)
start = next(n for n, points in endpoints.items() if len(points) == 1 and points[0][0] > -81)
chain, cursor = [], start
while ways:
    w = next((w for w in ways if cursor in [w["properties"]["nodeIds"][0], w["properties"]["nodeIds"][-1]]), None)
    if w is None:
        raise ValueError("Thames main stream has a disconnected reach")
    ns, coords = w["properties"]["nodeIds"], w["geometry"]["coordinates"]
    if ns[0] != cursor:
        ns, coords = ns[::-1], coords[::-1]
    chain.extend(coords if not chain else coords[1:])
    cursor = ns[-1]
    ways.remove(w)

physical = read("public/geography/physical.v1.json")["features"]
falls_source = read("public/geography/shared-names-falls-source.v1.geojson")
point = falls_source["features"][0]
lakes = []
anchors = {"Lake St. Clair": (42.43, -82.68), "Lake Kariba": (-16.92, 28.05), "Lake Victoria": (-1, 33.3)}
for f in read("public/geography/shared-names-lakes-source.v1.geojson")["features"]:
    name = f["properties"]["name"]
    lat, lng = anchors[name]
    geometry = f["geometry"]
    shorelines = geometry["coordinates"] if geometry["type"] == "Polygon" else [ring for polygon in geometry["coordinates"] for ring in polygon]
    # Match Along the Andes: opaque water masks land tint, with real shoreline ink.
    lakes.append(dict(id="shared-names:lake:"+name, name=name, kind="landform", lat=lat, lng=lng,
                      rank=1, geometry=geometry, paths=shorelines, color="#72b9d2", fillOpacity=1))

context = {
    "version": "shared-names-context-v1",
    "attribution": "Natural Earth (public domain); © OpenStreetMap contributors (ODbL-1.0); GeoNames (CC BY 4.0)",
    "licenseUrl": "https://opendatacommons.org/licenses/odbl/1-0/",
    "thames": dict(id="shared-names:thames", name="Thames River", kind="river", lat=42.75, lng=-81.75,
                   rank=1, paths=[simplify(chain)], lineWidth=2.5),
    "congo": [f for f in physical if f["name"] == "Congo"],
    "zambezi": [dict(f, lineWidth=2.5) for f in physical if f["name"] == "Zambezi"],
    "lakes": lakes,
    "chatham": dict(id="place:5920457", name="Chatham", kind="city", parentId="wurl:CAN",
                    lat=42.41224, lng=-82.18494, sourceId="geonames:5920457"),
    "falls": dict(id=point["properties"]["id"], name="Mosi-oa-Tunya / Victoria Falls", kind="landmark",
                  parentId="wurl:ZWE", lat=point["geometry"]["coordinates"][1],
                  lng=point["geometry"]["coordinates"][0], sourceId="osm:node:299131927"),
    "fallsSourceUrl": "https://www.openstreetmap.org/node/299131927",
    "note": "Pin target is the mapped Main Falls lip, not a town or World Heritage property centroid. Natural Earth rivers are generalized centerlines; Thames joins only identical OSM node IDs, retaining source vertices, head reach and Lake St. Clair outlet. Namesakes have no connecting route.",
}
encoded = json.dumps(context, separators=(",", ":"), ensure_ascii=False)+"\n"
for path in ["src/game/data/shared-names-context.v1.json", "public/geography/shared-names-context.v1.json"]:
    (ROOT/path).write_text(encoded)
metadata = {
    "reviewedOn": "2026-10-12", "generator": "scripts/prepare-shared-names-map.py",
    "sources": [
        {"asset": thames_path, "url": "https://api.openstreetmap.org/api/0.6/relation/7666913/full.json", "relationVersion": thames_source["relationVersion"], "license": "ODbL-1.0"},
        {"asset": "public/geography/shared-names-falls-source.v1.geojson", "url": "https://api.openstreetmap.org/api/0.6/map?bbox=25.835,-17.93,25.87,-17.91", "license": "ODbL-1.0", "targetReview": "Main Falls waterfall node lies on the mapped Main Falls cliff/lip, on the south side of the upstream river; inspected against OSM way 579843539. Target is one part of the 1.7 km curtain, not its exact midpoint."},
        {"asset": "public/geography/shared-names-lakes-source.v1.geojson", "url": "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_lakes.geojson", "license": "Public domain"},
        {"asset": "public/geography/physical.v1.json", "url": "https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/", "license": "Public domain", "version": "5.1.2"},
        {"asset": "src/geography/data/cities.v1.json", "url": "https://www.geonames.org/", "license": "CC BY 4.0", "chatham": "ID 5920457, coordinates from the existing pinned .cache/quiz/cities15000.zip (see sources/quiz.metadata.json)"},
    ],
}
for s in metadata["sources"]:
    s["sha256"] = hashlib.sha256((ROOT/s["asset"]).read_bytes()).hexdigest()
(ROOT/"sources/shared-names-map.metadata.json").write_text(json.dumps(metadata, indent=2)+"\n")
print(f"Shared-name context: {len(chain)} source Thames vertices, {len(context['thames']['paths'][0])} retained")
