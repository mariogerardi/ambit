"""Prepare a transparent completion map from pinned timezone-boundary-builder data.

Offline tool; requires Python 3.10+, Pillow and Shapely 2.1+ (GEOS 3.13+).
Supply the 2026e with-oceans-now zip
and a directory of compiled IANA 2026e zones. It does not change world geography.
"""
import argparse
from collections import defaultdict
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import zipfile
from zoneinfo import ZoneInfo

from PIL import Image, ImageDraw
from shapely.geometry import Point, shape, box, mapping
from shapely.ops import linemerge
from shapely import make_valid, union_all

SOURCE_URL = "https://github.com/evansiroky/timezone-boundary-builder/releases/download/2026e/timezones-with-oceans-now.geojson.zip"
SOURCE_SHA = "4807d56a629c4ade3648f49843376e7f41d32e90f9621d146d2682bbb5e20021"
WIDTH, HEIGHT = 4096, 2048
PALETTE = [(137, 183, 184), (188, 178, 149), (152, 166, 197),
           (189, 156, 155), (155, 185, 165), (185, 166, 194)]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--boundaries", required=True, type=Path)
    parser.add_argument("--tzdata", required=True, type=Path)
    parser.add_argument("--output", type=Path, default=Path("public/geography"))
    parser.add_argument("--line-module", type=Path, default=Path("src/game/data/samoa-time-zone-line.v1.json"))
    args = parser.parse_args()
    digest = hashlib.sha256(args.boundaries.read_bytes()).hexdigest()
    if digest != SOURCE_SHA:
        raise ValueError("Boundary archive differs from the pinned 2026e release")
    with zipfile.ZipFile(args.boundaries) as archive:
        data = json.loads(archive.read("combined-with-oceans-now.json"))
    reference = datetime(2026, 10, 12, 12, tzinfo=timezone.utc)
    pieces = defaultdict(list)
    for feature in data["features"]:
        tzid = feature["properties"]["tzid"]
        with (args.tzdata / tzid).open("rb") as stream:
            zone = ZoneInfo.from_file(stream)
        local = reference.astimezone(zone)
        minutes = int((local.utcoffset() - local.dst()).total_seconds() / 60)
        pieces[minutes].append(make_valid(shape(feature["geometry"])).simplify(0.035, preserve_topology=True))
    zones = {offset: union_all(parts, grid_size=0.001) for offset, parts in pieces.items()}
    # The source includes overlapping unofficial Xinjiang time. This Journey
    # teaches China's official clock, so UTC+8 owns that overlap in this map.
    zones[360] = zones[360].difference(zones[480])

    checks = {
        "Reykjavík": (-21.89541, 64.13548, 0),
        "Accra": (-0.1969, 5.55602, 0),
        "Praia": (-23.51254, 14.93152, -60),
        "Oran": (-0.63588, 35.69906, 60),
        "Madrid": (-3.70256, 40.4165, 60),
        "Warsaw": (21.01178, 52.22977, 60),
        "Beijing": (116.39723, 39.9075, 480),
        "Kashgar": (75.98976, 39.46718, 480),
        "Apia": (-171.76666, -13.83333, 780),
        "Pago Pago": (-170.7025, -14.27806, -660),
        "Vladivostok": (131.87353, 43.10562, 600),
        "Brisbane": (153.02809, -27.46794, 600),
        "Darwin": (130.84185, -12.46113, 570),
        "Perth": (115.8614, -31.95224, 480),
    }
    for name, (lng, lat, expected) in checks.items():
        actual = [offset for offset, geometry in zones.items() if geometry.covers(Point(lng, lat))]
        if actual != [expected]:
            raise ValueError(f"{name}: expected UTC minutes {expected}, found {actual}")

    # Extract the genuine shared boundary for the Samoa reveal. Retain source
    # vertices and clip only the eastern arc that separates the displayed islands.
    local = box(-174, -16, -169, -12)
    positive = make_valid(shape(next(f["geometry"] for f in data["features"]
                                    if f["properties"]["tzid"] == "Pacific/Tongatapu"))).intersection(local)
    negative = make_valid(shape(next(f["geometry"] for f in data["features"]
                                    if f["properties"]["tzid"] == "Pacific/Pago_Pago"))).intersection(local)
    island = next(p for p in positive.geoms if p.covers(Point(-171.76666, -13.83333)))
    boundary = linemerge(island.boundary.intersection(negative.boundary)
                        .intersection(box(-171.6, -14.5, -171, -13.1)))
    if boundary.geom_type != "LineString":
        raise ValueError("Samoa's source boundary is not one continuous arc")
    args.output.mkdir(parents=True, exist_ok=True)
    line = {
        "source": "Timezone Boundary Builder / OpenStreetMap contributors",
        "sourceVersion": "2026e", "sourceUrl": SOURCE_URL,
        "sourceSha256": SOURCE_SHA, "license": "ODbL-1.0",
        "licenseUrl": "https://opendatacommons.org/licenses/odbl/1-0/",
        "transformations": "Intersect Samoa UTC+13 and American Samoa UTC−11 boundary footprints; retain the eastern Samoa arc between longitudes −171.6° and −171°",
        "geometry": mapping(boundary),
    }
    line_json = json.dumps(line, ensure_ascii=False, indent=2) + "\n"
    (args.output / "samoa-time-zone-line.v1.json").write_text(line_json)
    args.line_module.parent.mkdir(parents=True, exist_ok=True)
    args.line_module.write_text(line_json)

    image = Image.new("RGBA", (WIDTH, HEIGHT))
    def pixels(ring):
        return [((lng + 180) * WIDTH / 360, (90 - lat) * HEIGHT / 180) for lng, lat in ring.coords]
    for index, (offset, geometry) in enumerate(sorted(zones.items())):
        color = PALETTE[index % len(PALETTE)]
        mask = Image.new("L", image.size)
        draw = ImageDraw.Draw(mask)
        polygons = [geometry] if geometry.geom_type == "Polygon" else list(geometry.geoms)
        for polygon in polygons:
            if polygon.geom_type != "Polygon":
                continue
            draw.polygon(pixels(polygon.exterior), fill=255)
            for hole in polygon.interiors:
                draw.polygon(pixels(hole), fill=0)
        image.paste(Image.new("RGBA", image.size, (*color, 72)), (0, 0), mask)
    draw = ImageDraw.Draw(image)
    for geometry in zones.values():
        polygons = [geometry] if geometry.geom_type == "Polygon" else list(geometry.geoms)
        for polygon in polygons:
            if polygon.geom_type != "Polygon":
                continue
            for ring in [polygon.exterior, *polygon.interiors]:
                draw.line(pixels(ring), fill=(193, 204, 200, 135), width=5)
    args.output.mkdir(parents=True, exist_ok=True)
    destination = args.output / "time-zones.v1.png"
    image.save(destination, optimize=True)
    metadata = {
        "source": "Timezone Boundary Builder / OpenStreetMap contributors",
        "sourceVersion": "2026e", "sourceUrl": SOURCE_URL,
        "sourceSha256": digest, "license": "ODbL-1.0",
        "licenseUrl": "https://opendatacommons.org/licenses/odbl/1-0/",
        "offsetSource": "IANA tzdb 2026e",
        "offsetSourceUrl": "https://data.iana.org/time-zones/releases/tzdata2026e.tar.gz",
        "offsetSourceSha256": "b26882805f26aac59d5b222978e6580484b834ccdc98be89df2f05a6dc53a652",
        "offsetReference": reference.isoformat(),
        "offsetMethod": "UTC offset minus DST; official UTC+8 takes precedence in Xinjiang",
        "projection": "equirectangular", "width": WIDTH, "height": HEIGHT,
        "transformations": "Repair invalid source polygons; topology-preserving simplification at 0.035 degrees; dissolve by standard UTC offset on a 0.001-degree precision grid; rasterize transparent fills and outlines",
        "assetSha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
        "bytes": destination.stat().st_size,
        "checkedOffsetsMinutes": {name: point[2] for name, point in checks.items()},
    }
    (args.output / "time-zones.metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n")
    print(f"Prepared {destination}: {destination.stat().st_size} bytes; {len(zones)} offsets, {len(checks)} Journey locations checked")


if __name__ == "__main__":
    main()
