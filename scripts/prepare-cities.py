"""Build local display cities from the already pinned GeoNames quiz cache (no network)."""
import hashlib
import json
import pathlib
import zipfile
import unicodedata
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
INPUTS = {
    'cities15000.zip': ('https://download.geonames.org/export/dump/cities15000.zip', '2d82a15a729ab0031895405e4e7436ddc7486d330c266a85f1d4b50967102ea6'),
    'countryInfo.txt': ('https://download.geonames.org/export/dump/countryInfo.txt', '93bafc525813f22e4711ff9ed6d626343094ce48c26388dc7c49189b3d7d5512'),
}
for name, (_, checksum) in INPUTS.items():
    path = ROOT / '.cache/quiz' / name
    if not path.exists():
        raise SystemExit(f'Missing pinned input: {path}. Restore the recorded snapshot first.')
    if hashlib.sha256(path.read_bytes()).hexdigest() != checksum:
        raise ValueError(f'{name}: checksum mismatch')
info = {}
country_info = {}
for line in (ROOT / '.cache/quiz/countryInfo.txt').read_text().splitlines():
    if not line.startswith('#'):
        columns = line.split('\t')
        if len(columns) > 9:
            info[columns[0]] = columns[1]
            country_info[columns[0]] = columns
roster = {c['id'] for c in json.loads((ROOT / 'src/game/data/un-members.v1.json').read_text())['members']}
capitals = json.loads((ROOT / 'src/game/data/capitals.v1.json').read_text())['capitals']
capital_ids = {c['id'].removeprefix('place:') for c in capitals}
with zipfile.ZipFile(ROOT / '.cache/quiz/cities15000.zip') as source:
    rows = [line.split('\t') for line in source.read('cities15000.txt').decode().splitlines()]
by_id = {r[0]: r for r in rows}
candidates = [r for r in rows if r[7] in {'PPL', 'PPLA', 'PPLA2', 'PPLA3', 'PPLA4'}
              and 'wurl:' + info.get(r[8], '') in roster and r[0] not in capital_ids and int(r[14]) >= 15000]
# A modest global pool plus each country's largest remaining city. Neighborhoods,
# abandoned/historical settlements and the 193 primary capital markers are excluded.
top_by_country = {}
for r in candidates:
    if r[8] not in top_by_country or int(r[14]) > int(top_by_country[r[8]][14]):
        top_by_country[r[8]] = r
keep_ids = {r[0] for r in top_by_country.values()}
selected = [r for r in candidates if int(r[14]) >= 250000 or r[0] in keep_ids]
policy = ('GeoNames populated places PPL/PPLA/PPLA2/PPLA3/PPLA4 in the 193 eligible countries; '
          'population at least 250,000, plus the largest non-primary-capital place per country when at least 15,000. '
          'Primary capital IDs excluded to avoid duplicate symbols. Population values are source place estimates, '
          'not comparable metropolitan-area rankings; used only for display importance. Unicode source display names preserved in NFC form.')
out = {
    'version': 'cities-geonames-2026-10-05',
    'license': 'CC BY 4.0', 'source': 'https://www.geonames.org/', 'policy': policy,
    'columns': ['geonamesId', 'name', 'countryId', 'lat', 'lng', 'population'],
    'cities': [[r[0], unicodedata.normalize('NFC', r[1]), 'wurl:' + info[r[8]], float(r[4]), float(r[5]), int(r[14])]
               for r in sorted(selected, key=lambda r: int(r[0]))],
    'capitalNames': {c['id']: unicodedata.normalize('NFC', by_id[c['id'].removeprefix('place:')][1]) for c in capitals},
    'capitalPopulations': {c['id']: int(by_id[c['id'].removeprefix('place:')][14]) for c in capitals},
}
explore = subprocess.run(
    ['node', str(ROOT / 'scripts/prepare-explore-cities.mjs')],
    input=json.dumps(dict(rows=rows, countryInfo=country_info, capitals=capitals)),
    text=True, capture_output=True, cwd=ROOT,
)
if explore.returncode:
    raise SystemExit(explore.stderr.strip() or 'Explore city preparation failed')
out['explore'] = json.loads(explore.stdout)
path = ROOT / 'src/geography/data/cities.v1.json'
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')) + '\n')
metadata = {k: out[k] for k in ['version', 'license', 'source', 'policy']}
metadata.update(inputs=[dict(url=url, sha256=sha) for url, sha in INPUTS.values()],
                asset=str(path.relative_to(ROOT)), sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                bytes=path.stat().st_size, cities=len(selected), capitalPopulations=len(capitals))
metadata.update(exploreCities=len(out['explore']['cities']), explorePolicy=out['explore']['policy'],
                exploreInputs=out['explore']['inputs'])
(ROOT / 'sources/cities.metadata.json').write_text(json.dumps(metadata, indent=2) + '\n')
print(f'Prepared {len(selected)} major cities and {len(capitals)} capital population estimates ({path.stat().st_size:,} bytes)')
