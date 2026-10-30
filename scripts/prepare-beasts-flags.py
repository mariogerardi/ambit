"""Prepare Beasts on Banners art from pinned local flags; no downloads.

Run with Python >=3.11. Uses only the standard library. Shared flags are never
modified. Original full flags remain in /flags/study/; new files are details and
deliberately altered puzzle illustrations, not official flag variants.
"""

from copy import deepcopy
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SVG = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG)
ET.register_namespace("xlink", "http://www.w3.org/1999/xlink")
CATALOG = json.loads((ROOT / "sources/flags.metadata.json").read_text())
RECORDS = {r["countryId"]: r for r in CATALOG["flags"]}
OUTPUT = ROOT / "public/journeys/beasts-on-banners"

# Identical viewports for each clue/restored pair. Bolivia isolates the shield,
# while Sri Lanka retains all four leaves and the whole lion.
DETAILS = {
    "01": ("MEX", (350, 145, 280, 265)),
    "02": ("AND", (340, 180, 320, 340)),
    "03": ("BTN", (85, 55, 730, 490)),
    "04": ("LKA", (424, 56, 720, 488)),
    "05": ("BOL", (133, 89, 25, 31)),
}


def alter(root, code):
    if code == "AND":
        # The first cow and its translated duplicate; retain the gold field,
        # shield outline and all other heraldic components unchanged.
        cow = next(e for e in root if e.get("id") == "b")
        duplicate = next(e for e in root if e.tag == f"{{{SVG}}}use")
        assert duplicate.get("{http://www.w3.org/1999/xlink}href") == "#b"
        root.remove(cow)
        root.remove(duplicate)
        # Font-independent question mark. No text node, title or answer metadata.
        ET.SubElement(root, f"{{{SVG}}}path", {
            "fill": "#d52b1e",
            "d": "M535 367 C535 349 565 347 565 364 C565 374 554 376 554 387 "
                 "H545 C545 370 556 372 556 364 C556 356 544 357 544 367 Z "
                 "M545 393 H554 V402 H545 Z",
        })
        return "Removed cow group and duplicate; added red vector question mark."
    if code == "LKA":
        nodes = list(root.iter())
        # These compound paths also contain lion geometry. Keep that geometry
        # byte-for-byte, converting the retained relative moveto to absolute.
        hilt, guard, blade = nodes[10], nodes[12], nodes[13]
        assert "M598.836 428.6" in hilt.get("d")
        assert "m9.56-13.91" in guard.get("d")
        assert "m105.23-66.38" in blade.get("d")
        hilt.set("d", hilt.get("d").split("M598.836 428.6")[0])
        guard.set("d", guard.get("d").split("m9.56-13.91")[0])
        blade.set("d", "M713.34 233.26" + blade.get("d").split("m105.23-66.38")[1])
        return "Removed blade, guard and hilt subpaths; retained paw/fingers and lion."
    if code == "BOL":
        group = list(root)[4]
        animal = list(group)[575:593]
        assert len(animal) == 18
        assert animal[0].get("d").startswith("M2126.27 1302.313")
        assert animal[-1].get("d").startswith("M2065.903 1225.482")
        for element in animal:
            group.remove(element)
        return "Removed 18 animal fill/outline paths; retained original landscape beneath."
    raise ValueError(code)


def write(root, filename, box=None):
    result = deepcopy(root)
    if box:
        result.set("viewBox", " ".join(map(str, box)))
        result.set("width", str(box[2]))
        result.set("height", str(box[3]))
        result.set("overflow", "hidden")
    # Check all media, including definitions, for hidden text/external content.
    for e in result.iter():
        assert e.tag.split("}")[-1] not in {
            "title", "desc", "metadata", "text", "image", "script", "foreignObject"
        }
        for key, value in e.attrib.items():
            assert not key.startswith("aria-")
            if key.split("}")[-1] == "href":
                assert value.startswith("#"), value
    data = ET.tostring(result, encoding="utf-8", xml_declaration=True)
    (OUTPUT / filename).write_bytes(data)
    return {"asset": f"/journeys/beasts-on-banners/{filename}",
            "sha256": hashlib.sha256(data).hexdigest(),
            "viewBox": result.get("viewBox")}


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    assets = []
    for number, (code, box) in DETAILS.items():
        record = RECORDS[f"wurl:{code}"]
        original = ROOT / "public" / record["src"].lstrip("/")
        digest = hashlib.sha256(original.read_bytes()).hexdigest()
        if digest != record["sha256"]:
            raise ValueError(f"Pinned flag changed: {original}")
        root = ET.parse(original).getroot()
        entry = {
            "round": int(number), "countryId": record["countryId"],
            "originalFull": record["src"], "sourceUrl": record["sourceUrl"],
            "sourceSha256": digest,
            "originalDetail": write(root, f"{number}-original-detail.svg", box),
        }
        if code in {"AND", "LKA", "BOL"}:
            entry["changes"] = alter(root, code)
            entry["clueFull"] = write(root, f"{number}-clue.svg")
            entry["clueDetail"] = write(root, f"{number}-clue-detail.svg", box)
        assets.append(entry)
    (ROOT / "sources/beasts-flags.metadata.json").write_text(json.dumps({
        "version": 1, "sourceCommit": CATALOG["commit"],
        "license": CATALOG["license"], "assets": assets,
    }, indent=2) + "\n")
    print("Prepared 11 SVGs; reused 5 unchanged full flags. Shared catalog untouched.")


if __name__ == "__main__":
    main()
