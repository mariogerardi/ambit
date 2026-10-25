#!/usr/bin/env python3
"""Freeze Pinpoint's curated landmarks and licensed Commons thumbnails only.
No shared geography or Journey catalog is regenerated. Cached responses make
review repeatable; delete a particular cached request deliberately to refresh it.
"""
from datetime import date
from hashlib import sha256
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import json
import time

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.cache/pinpoint'
OUT = ROOT / 'public/minigames/pinpoint'
for path in [CACHE, OUT]: path.mkdir(parents=True, exist_ok=True)
AGENT = 'AmbitGeography/1.0 (offline educational geography catalog; github.com/mariogerardi/ambit)'

def fetch(url):
    file = CACHE / sha256(url.encode()).hexdigest()
    if not file.exists():
        for attempt in range(3):
            try:
                data = urlopen(Request(url, headers={'User-Agent': AGENT}), timeout=30).read()
                break
            except Exception as error:
                if getattr(error,'code',None)!=429 or attempt==2: raise
                time.sleep(min(30,int(error.headers.get('Retry-After','10'))+1))
        file.write_bytes(data)
        time.sleep(0.35)
    return file.read_bytes()

def api(host, **params):
    return json.loads(fetch(f'https://{host}/w/api.php?' + urlencode({'format':'json', **params})))

class Plain(HTMLParser):
    def __init__(self): super().__init__(); self.parts=[]
    def handle_data(self, data): self.parts.append(data)
    @classmethod
    def text(cls, html):
        parser=cls(); parser.feed(html); return ' '.join(''.join(parser.parts).split())

def prepare(target):
    title, country = target
    page=PAGES.get(title,{})
    qid=page.get('pageprops',{}).get('wikibase_item')
    if not qid: return {'error':title,'reason':'No entity'}
    entity=json.loads(fetch(f'https://www.wikidata.org/wiki/Special:EntityData/{qid}.json'))['entities'][qid]
    claims=entity.get('claims',{})
    def value(prop):
        candidates=[c for c in claims.get(prop,[]) if c.get('rank')!='deprecated' and 'datavalue' in c.get('mainsnak',{})]
        candidates.sort(key=lambda c:c.get('rank')!='preferred')
        return candidates[0]['mainsnak']['datavalue']['value'] if candidates else None
    point=value('P625')
    if not point or point.get('globe')!='http://www.wikidata.org/entity/Q2': return {'error':title,'reason':'No earth coordinates'}
    name=entity.get('labels',{}).get('en',{}).get('value',title)
    record={'id':qid,'name':name,'countryId':f'wurl:{country}','lat':point['latitude'],'lng':point['longitude'],'sourceUrl':f'https://www.wikidata.org/wiki/{qid}','revision':entity['lastrevid']}
    image=value('P18')
    if image:
        try:
            info=api('commons.wikimedia.org',action='query',titles=f'File:{image}',prop='imageinfo',iiprop='url|extmetadata|size|mime',iiurlwidth=640)
            file=next(iter(info['query']['pages'].values())).get('imageinfo',[{}])[0]
            meta=file.get('extmetadata',{})
            get=lambda key:Plain.text(meta.get(key,{}).get('value',''))
            license=get('LicenseShortName')
            allowed=license.startswith(('CC BY','CC0','Public domain'))
            if allowed and file.get('mime') in ['image/jpeg','image/png','image/webp'] and file.get('width',0)>=300 and file.get('height',0)>=150:
                url=file.get('thumburl',file['url'])
                data=fetch(url)
                extension='.png' if 'png' in file.get('thumbmime',file['mime']) else '.webp' if 'webp' in file.get('thumbmime',file['mime']) else '.jpg'
                filename=qid+extension
                (OUT/filename).write_bytes(data)
                record['photo']={'src':f'/minigames/pinpoint/{filename}','author':get('Artist') or get('Credit'),'url':file['descriptionurl'],'license':license,'licenseUrl':get('LicenseUrl') or 'https://creativecommons.org/publicdomain/mark/1.0/','sha256':sha256(data).hexdigest()}
        except Exception as error: record['photoNote']=str(error)
    return record

if __name__=='__main__':
    targets=json.loads((ROOT/'sources/pinpoint/targets.json').read_text())
    PAGES={}
    titles=[t[0] for t in targets]
    for i in range(0,len(titles),40):
        response=api('en.wikipedia.org',action='query',titles='|'.join(titles[i:i+40]),redirects=1,prop='pageprops')
        pages={p['title']:p for p in response['query']['pages'].values()}
        renames={r['from']:r['to'] for r in response['query'].get('normalized',[])+response['query'].get('redirects',[])}
        for title in titles[i:i+40]:
            key=title
            for _ in range(3): key=renames.get(key,key)
            PAGES[title]=pages.get(key,{})
    # Keep Wikimedia preparation polite; runtime never makes these requests.
    records=[]
    for target in targets:
        records.append(prepare(target))

    overrides=json.loads((ROOT/'sources/pinpoint/overrides.json').read_text())
    for record in records:
        override=overrides.get(record.get('id'),{})
        if 'name' in override: record['name']=override['name']
        if 'photoAuthor' in override and 'photo' in record: record['photo']['author']=override['photoAuthor']
        if 'photoLicense' in override and 'photo' in record:
            record['photo']['license']=override['photoLicense']
            record['photo']['licenseUrl']=override['photoLicenseUrl']
            record['photo']['licenseNote']=override['note']
    errors=[r for r in records if 'error' in r]
    if errors:
        print(json.dumps(errors,ensure_ascii=False,indent=2)); raise SystemExit(1)
    result={'version':'pinpoint-landmarks-v1','reviewedOn':date(2026,10,24).isoformat(),'source':'https://www.wikidata.org/','coordinateLicense':'CC0 1.0','landmarks':records}
    (ROOT/'src/minigames/landmarks.v1.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    (OUT/'SOURCES.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(f'{len(records)} landmarks in {len(set(r["countryId"] for r in records))} countries; {sum("photo" in r for r in records)} licensed photographs')
    for r in records: print(r['id'],r['name'],r['countryId'],r['lat'],r['lng'],r.get('photoNote',''))
