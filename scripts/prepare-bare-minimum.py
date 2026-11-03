"""Create Journey-local flat SVG illustrations and a Borneo coastline.
Python >=3.11 with shapely. Uses existing, reviewed Natural Earth geography only;
never changes shared geography, flags or catalog metadata.
"""
from pathlib import Path
import hashlib
import json
from shapely.geometry import shape, Point, mapping
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/journeys/bare-minimum'
OUT.mkdir(parents=True, exist_ok=True)

def svg(name, body, width=600, height=300):
    (OUT/name).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}">{body}</svg>\n')

colors = {'01':'#ffffff', '02':'#f7e017', '03':'#ce2028', '04':'#ce2028', '05':'#101010', '06':'#ffffff', '07':'#009739'}
# Neutral frames delineate the illustration, not historical flag design.
for number, color in colors.items():
    svg(f'field-{number}.svg', f'<rect x="1" y="1" width="598" height="298" fill="{color}" stroke="#888" stroke-width="2"/>')
svg('clue-02.svg','<rect x="1" y="1" width="598" height="298" fill="#f7e017" stroke="#888" stroke-width="2"/><text x="300" y="332" text-anchor="middle" fill="#d4d4d4" font-family="sans-serif" font-size="23">Sultan’s historical banner</text>',height=345)
svg('clue-03.svg','<rect x="1" y="1" width="283" height="188" fill="#ce2028" stroke="#888" stroke-width="2"/><rect x="316" y="1" width="283" height="188" fill="#ce2028" stroke="#888" stroke-width="2"/>',height=190)
svg('clue-04.svg','<rect x="1" y="1" width="283" height="188" fill="#101010" stroke="#888" stroke-width="2"/><rect x="316" y="1" width="283" height="188" fill="#fff" stroke="#888" stroke-width="2"/><g text-anchor="middle" fill="#d4d4d4" font-family="sans-serif" font-size="21"><text x="142" y="225">Black banner</text><text x="142" y="252">Reconstruction</text><text x="458" y="225">Initially plain white</text><text x="458" y="252">1996</text></g>',height=270)
# Same reviewed geometric stripe construction as the bundled public-domain flag;
# the historic striped state flag predates the red crest.
svg('striped-02.svg','<rect width="1440" height="720" fill="#f7e017"/><path d="M0,50V370L1440,520V350z" fill="#fff"/><path d="M0,220V370L1440,670V520z" fill="#000"/>',1440,720)
world_path=ROOT/'public/geography/world.v1.json'
world=json.loads(world_path.read_text())
land=unary_union([shape(f['geometry']) for f in world if f['id'] in ['wurl:MYS','wurl:IDN','wurl:BRN']])
borneo=next(p for p in land.geoms if p.contains(Point(114,0))).simplify(.003,preserve_topology=True)
# Only the outer shore is illustrative; internal national borders stay withheld.
coast=[list(p) for p in borneo.exterior.coords]
data_path=ROOT/'src/game/data/bare-minimum-borneo.v1.json'
data_path.write_text(json.dumps({'coast':coast},separators=(',',':'))+'\n')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
outputs={p.name:sha(p) for p in sorted(OUT.glob('*.svg'))}
(OUT/'asset-audit.json').write_text(json.dumps({'worldSHA256':sha(world_path),'coastSHA256':sha(data_path),'outputsSHA256':outputs,'coastSource':'Natural Earth 5.1.2, public domain; union of MYS, IDN and BRN, Borneo component only','colorStatus':'Illustrative historic colors; no claim of standardized historic digital colors'},indent=2)+'\n')
print(f'Prepared {len(outputs)} SVGs and the {len(coast)}-point Borneo perimeter')
