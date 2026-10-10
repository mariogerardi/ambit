"""Rebuild the pinned capital snapshot from cached, checksum-verified GeoNames files."""
import json, pathlib, zipfile, hashlib, re, urllib.request, math
ROOT=pathlib.Path(__file__).resolve().parents[1]
CACHE=ROOT/'.cache/quiz'; CACHE.mkdir(parents=True,exist_ok=True)
SOURCES={
 'cities15000.zip':('https://download.geonames.org/export/dump/cities15000.zip','2d82a15a729ab0031895405e4e7436ddc7486d330c266a85f1d4b50967102ea6'),
 'countryInfo.txt':('https://download.geonames.org/export/dump/countryInfo.txt','93bafc525813f22e4711ff9ed6d626343094ce48c26388dc7c49189b3d7d5512')}
for name,(url,sha) in SOURCES.items():
 p=CACHE/name
 if not p.exists():p.write_bytes(urllib.request.urlopen(url).read())
 if hashlib.sha256(p.read_bytes()).hexdigest()!=sha:raise ValueError(f'{name}: snapshot changed; review and explicitly update the checksum')
info={r[0]:r for l in (CACHE/'countryInfo.txt').read_text().splitlines() if not l.startswith('#') and len(r:=l.split('\t'))>9}
roster={r['id']:r['name'] for r in json.loads((ROOT/'src/game/data/un-members.v1.json').read_text())['members']}
rows=[l.split('\t') for l in zipfile.ZipFile(CACHE/'cities15000.zip').read('cities15000.txt').decode().splitlines()]
byid={r[0]:r for r in rows}
capitals=[]
for r in rows:
 c=info.get(r[8]); cid='wurl:'+c[1] if c else ''
 if r[7]!='PPLC' or cid not in roster:continue
 capitals.append(dict(id='place:'+r[0],name=r[2],aliases=sorted(set([r[1]]+[a for a in r[3].split(',') if re.fullmatch(r'[A-Za-zÀ-ž .’\'-]{2,45}',a)])),countryId=cid,continent=c[8],lat=float(r[4]),lng=float(r[5]),sourceId='geonames:'+r[0],role='primary'))
# countryInfo identifies Jerusalem as Israel's capital, although its city code
# is PPLA. Keep this source convention explicit; it is not a sovereignty ruling.
r=byid['281184']
capitals.append(dict(id='place:'+r[0],name=r[2],aliases=[r[1]],countryId='wurl:ISR',continent='AS',lat=float(r[4]),lng=float(r[5]),sourceId='geonames:'+r[0],role='primary',note='Capital relationship from GeoNames countryInfo; disputed status is not adjudicated.'))
assert len(capitals)==193 and len({c['countryId'] for c in capitals})==193
out=dict(version='capitals-geonames-2026-10-05',license='CC BY 4.0',source='https://www.geonames.org/',reviewedOn='2026-10-05',policy='One primary GeoNames capital record per UN member. Secondary governmental seats are not counted. Source capital conventions are retained, not legal determinations.',inputs=[dict(url=u,sha256=s) for u,s in SOURCES.values()],capitals=sorted(capitals,key=lambda c:c['countryId']))
(ROOT/'src/game/data/capitals.v1.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('Prepared',len(capitals),'primary capital records')
