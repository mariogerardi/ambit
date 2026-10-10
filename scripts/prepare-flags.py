"""Pinned, local-only Study flag catalog. Run only to prepare checked-in assets."""
import concurrent.futures, hashlib, json, pathlib, re, urllib.request, xml.etree.ElementTree as ET
ROOT = pathlib.Path(__file__).resolve().parent.parent
COMMIT = 'c09927e63705529bbf59ca6684cd9b23225dddad'
BASE = f'https://raw.githubusercontent.com/hampusborgos/country-flags/{COMMIT}'
cache = ROOT / '.cache/flags' / COMMIT
cache.mkdir(parents=True, exist_ok=True)
out = ROOT / 'public/flags/study'
out.mkdir(parents=True, exist_ok=True)
iso = {}
for line in (ROOT / '.cache/quiz/countryInfo.txt').read_text().splitlines():
    if line and not line.startswith('#'):
        cells = line.split('\t'); iso[cells[1]] = cells[0].lower()
members = json.loads((ROOT / 'src/game/data/un-members.v1.json').read_text())['members']
ET.register_namespace('', 'http://www.w3.org/2000/svg')
ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')
def get(path):
    local = cache / pathlib.Path(path).name
    if not local.exists():
        with urllib.request.urlopen(f'{BASE}/{path}', timeout=40) as response: local.write_bytes(response.read())
    return local.read_bytes()
def prepare(item):
    index, member = item
    code = iso[member['id'][5:]]
    raw = get(f'svg/{code}.svg')
    root = ET.fromstring(raw)
    for parent in root.iter():
        for child in list(parent):
            if child.tag.split('}')[-1] in ('title', 'desc', 'metadata'): parent.remove(child)
        if parent.tag.split('}')[-1] in ('script', 'foreignObject'): raise ValueError('Unsafe flag content')
        for key in list(parent.attrib):
            if key.startswith('aria-') or key.split('}')[-1] in ('title', 'label'): del parent.attrib[key]
            elif key.split('}')[-1] in ('href', 'src') and not parent.attrib[key].startswith('#'): raise ValueError('External flag reference')
    asset = ET.tostring(root, encoding='utf-8', xml_declaration=True)
    filename = f'flag-{index + 1:03}.svg'
    (out / filename).write_bytes(asset)
    return {'countryId': member['id'], 'src': f'/flags/study/{filename}', 'viewBox': root.get('viewBox'), 'width': root.get('width'), 'height': root.get('height'), 'sourceUrl': f'{BASE}/svg/{code}.svg', 'sourceSha256': hashlib.sha256(raw).hexdigest(), 'sha256': hashlib.sha256(asset).hexdigest()}
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool: flags = list(pool.map(prepare, enumerate(members)))
metadata = {'version': 1, 'repository': 'https://github.com/hampusborgos/country-flags', 'commit': COMMIT, 'license': 'Public domain per source README; originals from Wikimedia Commons', 'flags': flags}
(ROOT / 'sources/flags.metadata.json').write_text(json.dumps(metadata, indent=2) + '\n')
(ROOT / 'src/game/data/flags.v1.json').write_text(json.dumps({'version': 1, 'commit': COMMIT, 'flags': [{'countryId': f['countryId'], 'src': f['src']} for f in flags]}, indent=2) + '\n')
(ROOT / 'sources/flags-source-README.md').write_bytes(get('README.md'))
print(f'Prepared {len(flags)} local flags from {COMMIT}')
