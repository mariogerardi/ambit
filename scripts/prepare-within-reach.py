"""Offline whole-island preparation; Python >=3.11, Shapely 2.1.2, NumPy.
Source coastline hulls grade answers; simplified display shores only render.
"""
import gzip
import hashlib
import itertools
import json
import math
from pathlib import Path
from shapely import STRtree, make_valid
from shapely.geometry import LineString, Point, Polygon, box, mapping, shape
from shapely.ops import polygonize, unary_union, polylabel
ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'public/journeys/within-reach'
EARTH_KM=6371.0088


def encoded(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n'

def dot(a, b):
    return sum(x * y for x, y in zip(a, b))

def cross(a, b):
    return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])

def unit(v):
    length = math.sqrt(dot(v, v))
    return tuple(x / length for x in v) if length > 1e-14 else None

def vector(p):
    lat, lng = math.radians(p['lat']), math.radians(p['lng'])
    return (math.cos(lat)*math.cos(lng), math.cos(lat)*math.sin(lng), math.sin(lat))

def position(v):
    return {'lat': math.degrees(math.atan2(v[2], math.hypot(v[0], v[1]))),
            'lng': math.degrees(math.atan2(v[1], v[0]))}

def distance(a, b):
    return EARTH_KM * math.atan2(math.sqrt(dot(cross(a, b), cross(a, b))), dot(a, b))

def polygon_geometry(geometry):
    geometry = make_valid(geometry)
    if geometry.geom_type == 'Polygon':
        return geometry
    if geometry.geom_type == 'MultiPolygon':
        return geometry
    return unary_union([g for g in geometry.geoms if g.geom_type in ('Polygon', 'MultiPolygon')])

def detailed_land(elements, bounds):
    area = box(*bounds)
    lines, segments = [], []
    for e in elements:
        if e.get('tags', {}).get('natural') != 'coastline':
            continue
        coords = [(p['lon'], p['lat']) for p in e['geometry']]
        clipped = LineString(coords).intersection(area)
        if not clipped.is_empty:
            lines.append(clipped)
        for a, b in zip(coords, coords[1:]):
            segment = LineString([a, b])
            if a != b and segment.intersects(area):
                segments.append(segment)
    tree = STRtree(segments)
    land = []
    for poly in polygonize(unary_union([area.boundary, *lines])):
        p = poly.representative_point()
        segment = segments[int(tree.nearest(p))]
        a, b = segment.coords
        side = (b[0]-a[0])*(p.y-a[1])-(b[1]-a[1])*(p.x-a[0])
        if side > 0:
            land.append(poly)
    if not land:
        raise ValueError('No land polygons from directed coastlines')
    original = polygon_geometry(unary_union(land))
    return original, len(segments)

def rounded_geometry(geometry):
    rounded = json.loads(json.dumps(mapping(geometry)), parse_float=lambda x: round(float(x), 6))
    # Rounding can close a very narrow channel. Repair after rounding, rather
    # than emitting a self-intersection to the globe triangulator.
    return json.loads(json.dumps(mapping(polygon_geometry(shape(rounded)))))

import numpy as np
from shapely import intersects_xy


def frame_at(lat, lng):
    up = np.array(vector({'lat': lat, 'lng': lng}))
    east = np.array([-math.sin(math.radians(lng)), math.cos(math.radians(lng)), 0.0])
    north = np.cross(up, east)
    return up, east, north


def project_vectors(vs, frame):
    up, east, north = frame
    return np.column_stack((vs @ east, vs @ north)) / (vs @ up)[:, None]


def unproject_points(points, frame):
    up, east, north = frame
    v = up + points[:, 0, None]*east + points[:, 1, None]*north
    return v / np.linalg.norm(v, axis=1)[:, None]


def canonical_hull(poly, focus):
    # Gnomonic projection maps minor great-circle arcs to straight lines.
    # A circle smaller than a hemisphere contains the entire island iff it
    # contains this hull: concave bays and display simplification cannot grade it.
    frame = frame_at(focus['lat'], focus['lng'])
    raw = np.array([vector({'lat': y, 'lng': x}) for x, y in poly.exterior.coords[:-1]])
    hull = Polygon(project_vectors(raw, frame)).convex_hull
    vs = unproject_points(np.array(hull.exterior.coords[:-1]), frame)
    return [position(v) for v in vs]


def solve_islands(islands, radius, site, resolution=128):
    frame = frame_at(site['focus']['lat'], site['focus']['lng'])
    boundaries = [np.array([vector(p) for p in i['boundary']]) for i in islands]
    r = radius/EARTH_KM
    # Circumscribed spherical polygon. Each edge is tangent to the true radius-r
    # cap, so intersections are certified OUTER bounds on feasible centers.
    outer_r = math.atan(math.tan(r)/math.cos(math.pi/resolution))
    angles = np.arange(resolution)*2*math.pi/resolution
    feasible = []
    for boundary in boundaries:
        region = None
        for v in boundary:
            tangent = np.cross(np.array([0., 0., 1.]), v)
            tangent /= np.linalg.norm(tangent)
            other = np.cross(v, tangent)
            ring = v*math.cos(outer_r) + math.sin(outer_r)*(np.cos(angles)[:, None]*tangent + np.sin(angles)[:, None]*other)
            cap = Polygon(project_vectors(ring, frame))
            region = cap if region is None else region.intersection(cap)
            if region.is_empty: break
        feasible.append(region)
    polygons = [p for p in feasible if not p.is_empty]
    samples = []
    def coords(g):
        if g.is_empty: return
        if g.geom_type == 'Point': samples.append((g.x, g.y))
        elif g.geom_type in ('LineString', 'LinearRing'): samples.extend(g.coords)
        elif hasattr(g, 'geoms'):
            for p in g.geoms: coords(p)
    for p in polygons:
        samples.extend(p.exterior.coords)
        samples.append(tuple(p.representative_point().coords)[0])
        samples.append(tuple(p.centroid.coords)[0])
    for a, b in itertools.combinations(polygons, 2):
        if a.intersects(b): coords(a.boundary.intersection(b.boundary))
    # Interior faces supply comfortable witnesses, while vertices certify the
    # arrangement's maximum even when two center domains merely touch.
    for face in polygonize(unary_union([p.boundary for p in polygons])):
        samples.append(tuple(face.representative_point().coords)[0])
        samples.append(tuple(face.centroid.coords)[0])
        samples.append(tuple(polylabel(face, tolerance=3e-7).coords)[0])
    xy = np.unique(np.array(samples), axis=0)
    upper_counts = np.zeros(len(xy), dtype=int)
    for p in polygons:
        upper_counts += intersects_xy(p.buffer(1e-11), xy[:, 0], xy[:, 1])
    upper = int(upper_counts.max())
    vs = unproject_points(xy, frame)
    worst = np.empty((len(vs), len(boundaries)))
    for i, boundary in enumerate(boundaries):
        # atan2 stays accurate at kilometer scale, unlike acos near one.
        dots = np.clip(vs @ boundary.T, -1, 1)
        worst[:, i] = np.arctan2(np.sqrt(np.maximum(0, 1-dots*dots)), dots).max(axis=1)*EARTH_KM
    counts = (worst <= radius + 1e-6).sum(axis=1)
    maximum = int(counts.max())
    if maximum != upper:
        if resolution < 512: return solve_islands(islands, radius, site, resolution*2)
        raise ValueError(f'{site["id"]}: uncertified island maximum {maximum} < {upper}')
    tiers = [maximum, maximum-2, maximum-5]
    if len(tiers) != 3: tiers = [maximum, maximum-1, maximum-2]
    witnesses = []
    for count in tiers:
        indices = np.where(counts == count)[0]
        if not len(indices):
            lower = sorted(set(int(c) for c in counts if c < count), reverse=True)
            if not lower: raise ValueError('No attainable island tier')
            count = lower[0]; indices = np.where(counts == count)[0]
        margins = np.abs(worst[indices]-radius).min(axis=1)
        chosen = indices[int(margins.argmax())]
        witnesses.append({'count':int(count), 'center':position(vs[chosen]),
                          'clearanceKm':round(float(margins.max()),6),
                          'containedIds':[p['id'] for p, d in zip(islands, worst[chosen]) if d <= radius+1e-6]})
    return {'maximum':maximum,'radiusKm':radius,'upperBound':upper,
            'method':'circumscribed spherical-cap arrangement upper bound matched by exact whole-shore witness',
            'resolution':resolution,'samples':witnesses}


def source_anchor(e):
    if 'lat' in e and 'lon' in e: return Point(e['lon'], e['lat'])
    if 'center' in e: return Point(e['center']['lon'], e['center']['lat'])
    if e.get('type') == 'relation':
        outer = [LineString([(p['lon'],p['lat']) for p in m['geometry']])
                 for m in e.get('members',[]) if m.get('role') != 'inner' and m.get('geometry')]
        polygons = list(polygonize(unary_union(outer)))
        if polygons: return max(polygons,key=lambda p:p.area).representative_point()
    geometry = e.get('geometry')
    if not geometry:
        geometry = [p for m in e.get('members', []) for p in m.get('geometry', [])]
    if not geometry: return None
    points = [(p['lon'], p['lat']) for p in geometry]
    if len(points)>3 and points[0] == points[-1]:
        return polygon_geometry(Polygon(points)).representative_point()
    return LineString(points).centroid if len(points)>1 else Point(points[0])


def prepare_field(elements, site, name_source=None):
    land, segments = detailed_land(elements, site['bounds'])
    # A source rectangle can span neighboring countries across a narrow strait.
    # Remove whole foreign components, rather than clipping invented coastlines.
    exclusions = [box(*bounds) for bounds in site.get('excludedCoastBoxes', [])]
    if exclusions:
        parts = list(land.geoms) if land.geom_type == 'MultiPolygon' else [land]
        land = polygon_geometry(unary_union([p for p in parts if not any(
            area.covers(p.representative_point()) for area in exclusions)]))
    extensions = []
    for extension in site.get('islandExtensions', []):
        extra, n = detailed_land(elements, extension['bounds']); segments += n
        old = next(p for p in site['landings'] if p[2] == extension['name'])
        source = next(e for e in elements if e['type'] == old[0] and e['id'] == old[1])
        point = source_anchor(source)
        parts = list(extra.geoms) if extra.geom_type == 'MultiPolygon' else [extra]
        island = min(parts, key=lambda p:p.distance(point))
        if island.boundary.intersection(box(*extension['bounds']).boundary).length > 1e-9:
            raise ValueError('Incomplete island extension')
        land = polygon_geometry(land.union(island)); extensions.append(island)
    parts = list(land.geoms) if land.geom_type == 'MultiPolygon' else [land]
    field = box(*site['fieldBounds']); border = box(*site['bounds']).boundary
    named = {}
    features = []
    for e in sorted(elements, key=lambda e:(e.get('tags',{}).get('place') != 'island', e['type'] != 'relation')):
        tags = e.get('tags', {})
        name = (tags.get('name') if site.get('preferLocalNames') else None) or tags.get('name:en') or tags.get('int_name') or tags.get('name')
        if not name: continue
        closed_coast = tags.get('natural') == 'coastline' and e.get('geometry') and e['geometry'][0] == e['geometry'][-1]
        if tags.get('place') not in ('island','islet') and not closed_coast: continue
        point = source_anchor(e)
        if point: features.append((point,name,f'osm:{e["type"]}:{e["id"]}'))
    if name_source:
        features = [(Point(p['lng'],p['lat']),p['name'],'geonames:'+p['id']) for p in name_source['islands']] + features
    for p in site.get('islandNameSources', []):
        features.append((Point(p['lng'],p['lat']),p['name'],p['id']))
    for kind, id, name in site.get('landings', []):
        e = next(e for e in elements if e['type']==kind and e['id']==id)
        features.append((source_anchor(e),name.split(' · ')[0],f'osm:{kind}:{id}'))
    excluded = []
    factor = 111.195**2*math.cos(math.radians(site['focus']['lat']))
    for point,name,source_id in features:
        if not field.covers(point): continue
        if any(area.covers(point) for area in exclusions): continue
        index = min(range(len(parts)),key=lambda i:parts[i].distance(point))
        poly = parts[index]
        if poly.distance(point)>0.002: continue
        if poly.area*factor < site['minimumIslandKm2']: continue
        if poly.boundary.intersection(border).length > 1e-9:
            excluded.append(name); continue # Mainland/peninsula, or incompletely sourced.
        named.setdefault(index,(name,source_id))
    islands=[]
    for index,(name,source_id) in named.items():
        name = site.get('islandDisplayNames', {}).get(name, name)
        poly=parts[index];anchor=poly.representative_point();focus={'lat':anchor.y,'lng':anchor.x}
        hull=canonical_hull(poly,focus)
        # Grade the source hull. Render a separate, topology-preserving shore.
        display=rounded_geometry(poly.simplify(site['displayToleranceMeters']/111195,preserve_topology=True))
        islands.append({'id':f'within-reach:{site["id"]}:island:{source_id}', 'name':name,
                        'parentId':site['parentId'],'level':'ADM0','focus':focus,
                        'geometry':display,'boundary':hull,'sourceId':source_id,
                        'areaKm2':round(poly.area*factor,5)})
    islands.sort(key=lambda i:(-i['areaKm2'],i['name']))
    if len(islands)<12: raise ValueError(f'{site["id"]}: insufficient island field: {len(islands)}')
    print(site['id'],len(islands),'islands; excluded attached/clipped:',excluded,flush=True)
    protected=set(named)
    visible=[shape(rounded_geometry(p.simplify(site['displayToleranceMeters']/111195,preserve_topology=True)))
             for i,p in enumerate(parts) if i in protected or p.area*factor>=site.get('contextMinimumKm2',0.03)]
    return polygon_geometry(unary_union(visible)),islands,extensions,segments,excluded


def main():
    config=json.loads((ROOT/'sources/within-reach.locations.json').read_text())
    snapshot=ASSETS/'osm-source.v1.json.gz';sources=json.load(gzip.open(snapshot,'rt'))
    co=json.load(gzip.open(ASSETS/'context-shores.v1.json.gz','rt'))
    world={r['id']:r for r in json.loads((ROOT/'public/geography/world.v1.json').read_text())}
    data={'version':config['version'],'sites':[]};audit={'version':config['version'],'reviewedOn':config['reviewedOn'],'sites':[]}
    for site in config['sites']:
        src=sources['sites'][site['id']]
        land,islands,extensions,segments,excluded=prepare_field(src['elements'],site,src.get('nameSource'))
        benchmark=None
        for scale in [1,1.05,0.95,1.1,0.9]:
            trial=solve_islands(islands,round(site['radiusKm']*scale,3),site)
            print(site['id'],'radius trial',trial['radiusKm'],'maximum',trial['maximum'],'margin',trial['samples'][0]['clearanceKm'],flush=True)
            if trial['samples'][0]['clearanceKm']>=max(0.06,trial['radiusKm']*0.01):
                benchmark=trial;break
        if benchmark is None:raise ValueError(f'{site["id"]}: no forgiving radius near authored size')
        site={**site,'radiusKm':benchmark['radiusKm']}
        country=world[site['parentId']];coarse=polygon_geometry(shape(country.get('displayGeometry') or country['geometry']))
        outer=co['sites'][site['id']];contextual=polygon_geometry(shape(outer['geometry'])).simplify(0.001,preserve_topology=True)
        for island in extensions:
            parts=list(contextual.geoms) if contextual.geom_type=='MultiPolygon' else [contextual]
            anchor=island.representative_point()
            if any(p.contains(anchor) and p.area>island.area*4 for p in parts):raise ValueError('Context extension would remove mainland')
            contextual=polygon_geometry(unary_union([p for p in parts if not p.contains(anchor)]))
        display=polygon_geometry(unary_union([coarse.difference(box(*outer['bounds'])),contextual.difference(box(*site['bounds'])),land]))
        union=unary_union([shape(i['geometry']) for i in islands]);background=polygon_geometry(display.difference(union))
        if background.intersection(union).area>1e-12:raise ValueError('Overlapping island/backing')
        entry={k:site[k] for k in ['id','name','parentId','bounds','fieldBounds','focus','initial','radiusKm']}
        entry.update(islands=islands,backgroundGeometry=json.loads(json.dumps(mapping(background))),benchmark=benchmark)
        entry['sourceRevision']='whole-shores-v2:'+hashlib.sha256(encoded([site['radiusKm'],[s['count'] for s in benchmark['samples']],[(i['id'],i['boundary']) for i in islands]]).encode()).hexdigest()[:16]
        data['sites'].append(entry)
        # Start with a neutral, movable circle, below the weakest scoring band.
        initial=vector(site['initial']);count=sum(all(distance(initial,vector(p))<=site['radiusKm'] for p in i['boundary']) for i in islands)
        if count>=benchmark['samples'][-1]['count']:raise ValueError(f'{site["id"]}: initial circle already rewards {count}')
        row={'id':site['id'],'timestamp':src['timestamp'],'islands':len(islands),'coastlineSegments':segments,
             'maximum':benchmark['maximum'],'certifiedUpperBound':benchmark['upperBound'],
             'radiusKm':site['radiusKm'],'tierClearanceKm':[s['clearanceKm'] for s in benchmark['samples']],
             'displayToleranceMeters':site['displayToleranceMeters'],'minimumIslandKm2':site['minimumIslandKm2'],
             'excludedAttachedOrClippedNames':sorted(set(excluded))}
        audit['sites'].append(row);print(encoded(row),flush=True)
    raw=encoded(data).encode();(ROOT/'src/game/data/within-reach.v1.json').write_bytes(raw)
    (ASSETS/'map-data.v1.json.gz').write_bytes(gzip.compress(raw,mtime=0))
    metadata={'reviewedOn':config['reviewedOn'],'generator':'scripts/prepare-within-reach.py','license':'ODbL-1.0 + CC-BY-4.0',
              'nameAttributions':[{'name':'GeoNames','url':'https://www.geonames.org/','license':'CC-BY-4.0'},
                                  {'name':'National Park Service','url':'https://www.nps.gov/boha/learn/historyculture/facts-intro.htm'}],
              'sourceSnapshotSha256':hashlib.sha256(snapshot.read_bytes()).hexdigest(),
              'contextSnapshotSha256':hashlib.sha256((ASSETS/'context-shores.v1.json.gz').read_bytes()).hexdigest(),
              'outputSha256':hashlib.sha256(raw).hexdigest(),'sites':audit['sites'],
              'notes':'Source hulls grade whole islands. Named islands in documented fields are eligible; mainland, clipped geometry and tiny rocks are context only. Display geometry never grades.'}
    (ASSETS/'data-audit.json').write_text(json.dumps(audit,indent=2)+'\n')
    (ROOT/'sources/within-reach.metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')


if __name__=='__main__':main()
