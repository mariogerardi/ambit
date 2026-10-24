"""Crop reviewed, bundled flag vectors for Chasing the Sun; never downloads flags."""
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SVG = 'http://www.w3.org/2000/svg'
ET.register_namespace('', SVG)
ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')
catalog = json.loads((ROOT / 'sources/flags.metadata.json').read_text())
records = {record['countryId']: record for record in catalog['flags']}
# View boxes isolate the source motifs with approximately equal diameter/margins.
crops = [
    ('ARG', 'sun-detail-arg.v1.svg', (322, 172, 156, 156), 'symbol', 'white'),
    ('URY', 'sun-detail-ury.v1.svg', (22, 22, 296, 296), 'symbol', 'white'),
    ('PHL', 'sun-detail-phl.v1.svg', (7, 24, 42, 42), 'symbol', 'white'),
    ('KAZ', 'sun-detail-kaz.v1.svg', (850.4716, 190, 460, 460), 'sun', '#00afca'),
    ('KAZ', 'sun-ray-kaz.v1.svg', (1065.4716, 200, 30, 78), 'ray', '#00afca'),
    ('JPN', 'sun-detail-jpn.v1.svg', (250, 100, 400, 400), 'whole', None),
    ('MWI', 'sun-detail-mwi.v1.svg', (-112, -112, 224, 98), 'whole', None),
]
manifest = []
for code, name, box, mode, background in crops:
    record = records[f'wurl:{code}']
    source = ROOT / 'public' / record['src'].lstrip('/')
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    if source_hash != record['sha256']:
        raise ValueError(f'Changed reviewed source: {source}')
    original = ET.parse(source).getroot()
    result = ET.Element(f'{{{SVG}}}svg', {'viewBox': ' '.join(map(str, box)), 'width': str(box[2]), 'height': str(box[3]), 'overflow': 'hidden'})
    if background:
        x, y, width, height = box
        ET.SubElement(result, f'{{{SVG}}}rect', {
            'x': str(x), 'y': str(y), 'width': str(width), 'height': str(height), 'fill': background,
        })
    if mode == 'symbol':
        # Argentina/Uruguay: omit background stripes. Philippines: retain its
        # original sun group; the view box excludes the three corner stars.
        children = list(original)[2:] if code in ('ARG', 'URY') else [list(original)[3]]
    elif mode == 'sun':
        children = [next(el for el in original if el.get('id') == 'sun')]
    elif mode == 'ray':
        sun = next(el for el in original if el.get('id') == 'sun')
        group = ET.Element(f'{{{SVG}}}g', dict(sun.attrib))
        group.append(deepcopy(next(el for el in sun.iter() if el.get('id') == 'r')))
        children = [group]
    else:
        children = list(original)
    for child in children:
        result.append(deepcopy(child))
    output = ROOT / 'public/flags/clues' / name
    output.parent.mkdir(parents=True, exist_ok=True)
    asset = ET.tostring(result, encoding='utf-8', xml_declaration=True)
    output.write_bytes(asset)
    manifest.append({
        'asset': str(output.relative_to(ROOT)), 'countryId': record['countryId'],
        'sourceAsset': str(source.relative_to(ROOT)), 'sourceUrl': record['sourceUrl'],
        'sourceSha256': source_hash, 'sha256': hashlib.sha256(asset).hexdigest(),
        'viewBox': list(box), 'selection': mode, 'background': background,
        'changes': 'Source SVG motif geometry retained; viewport cropped. Non-motif artwork omitted where specified.',
    })
(ROOT / 'sources/sun-details.metadata.json').write_text(json.dumps({
    'version': 1, 'license': catalog['license'], 'sourceCommit': catalog['commit'], 'crops': manifest,
}, indent=2) + '\n')
print(f'Prepared {len(manifest)} local sun details from reviewed flag artwork.')
