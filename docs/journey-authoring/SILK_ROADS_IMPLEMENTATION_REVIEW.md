# Where the Silk Roads Met: implementation review

Prepared 2026-10-20 from `where_the_silk_roads_met_JOURNEY_SPEC.md`.
Implemented after the user approved this direction. The Journey is registered
as `where-the-silk-roads-met-v1`, remains unlisted, and uses the question-level
Bearing Intersection composition described below. The original preparation
findings are retained as the implementation rationale. The attached specification
is reference material; the user's request determines authorization and scope.

## Five-stop outline and experience

Preserve the supplied sequence and reasoning:

1. **Xi’an / Chang’an:** infer an imperial center from Lanzhou and Datong.
2. **Dunhuang:** combine Xi’an and Hami to find an oasis gateway.
3. **Kashgar:** combine Dunhuang and Gilgit at the mountain/desert crossroads.
4. **Samarkand:** combine Kashgar and Termez at a Central Asian meeting place.
5. **Baghdad:** combine Samarkand and Mosul at a western center of exchange.

Each question explicitly supplies both stations. Carrying a discovery into the
next question is narrative continuity, never a prerequisite for the mechanic.
The questions must also work independently. Retain the changing network across
centuries, rather than implying one caravan followed these five stops.

## Recommended implementation contract

Compose a new **Bearing Intersection presentation** with existing `mode: "pin"`,
`selection: { type: "none" }`, `commitment: "submit"` and `pin-distance` rules.
It remains a distinct mechanic from Compass Bearing, which evaluates an angle.
Share geodesic utilities, not response controls or grading.

Implemented author-facing field:

```ts
bearingIntersection: {
  stations: [stationA, stationB], // two full canonical PlaceFeature records
  assist: { stationId, halfWidthDegrees: 15, reachKm },
}
```

The canonical target is resolved from the existing pin rule's `targetId` and
question-owned place records. Do not add a second target or manually authored
heading values. Derive precise bearings from these coordinates; round only the
readouts. Require two distinct stations, a valid pin-distance target, valid
nondegenerate geometry, ascending inclusive tiers and a valid assist station.
Reject this configuration on incompatible answer rules. Add a recipe and expose
its distinct mechanic label in authoring/catalog descriptions without requiring
a new response mode or evaluator.

- Show two equally prominent **read-only** station dials/readouts, always measured
  clockwise from true north. Do not reuse an editable answer dial. Include the
  true-north/great-circle explanation in free information, not every paragraph.
- Before submission, disclose only two named blue reference stations and neutral
  regional geography. Withhold target names, markers, rays and answer-focused
  cameras, including from hover, accessible text and visible source titles.
- Hint adds context. Assist adds one broad geographic sector from one station,
  preserving hint and pending pin. It changes neither eligibility nor grading.
- Reveal two exact station-to-target great-circle segments, the city point,
  existing accuracy rings and the actual submitted pin. Use explanatory colors
  for rays; do not grade whole countries or reference stations.
- On advance, clear rays, sector, rings and old target roles. A carried-forward
  city becomes a blue reference. Keep completed answers in existing save records.
  Assign a new stable Journey ID; use existing edition/save-revision policy for
  subsequent target or grading changes.

The geographic sector uses the new `bearing-sector` map overlay primitive.
The existing compass sector remains a separate dial highlight. Sample its radial edges and far arc on the same sphere as the rays.
No centerline, second sector, answer-centered circle or endpoint at the target.
Use authored regional reaches independent of the target distance. Proposed
first-pass reaches: Lanzhou **1,200 km**, Hami **900 km**, Gilgit **1,200 km**,
Termez **900 km**, Mosul **1,000 km**. All comfortably extend beyond their targets;
review their footprint with the authored regional camera before settling them.

## Locked coordinate proposal

Reuse bundled records exactly; add four missing cities as local authored records.
Do not regenerate global geography or expand the general question pool. IDs use
`place:<GeoNames ID>`. Coordinates are modern city reference points, not historical
sites or archaeological footprints.

| Place           | GeoNames ID | Latitude | Longitude | Coordinate source                                                      |
| --------------- | ----------- | -------: | --------: | ---------------------------------------------------------------------- |
| Xi’an           | 1790630     | 34.25833 | 108.92861 | `cities.v1.json`                                                       |
| Lanzhou         | 1804430     | 36.05701 | 103.83987 | `cities.v1.json`                                                       |
| Datong          | 2037799     | 40.09361 | 113.29139 | `cities.v1.json`                                                       |
| Dunhuang        | 1529531     | 40.16667 |  94.68333 | [GeoNames city record](https://www.geonames.org/1529531/dunhuang.html) |
| Hami            | 1529484     | 42.83393 |  93.50601 | [GeoNames city record](https://www.geonames.org/1529484/hami.html)     |
| Kashgar         | 1280849     | 39.46718 |  75.98675 | `cities.v1.json`                                                       |
| Gilgit          | 1178338     | 35.91869 |  74.31245 | [GeoNames city record](https://www.geonames.org/1178338/gilgit.html)   |
| Samarkand       | 1216265     | 39.65456 |  66.96445 | `cities.v1.json`                                                       |
| Termez / Tirmiz | 1215957     | 37.22417 |  67.27833 | [GeoNames city record](https://www.geonames.org/1215957/tirmiz.html)   |
| Baghdad         | 98182       | 33.34058 |  44.40088 | `capitals.v1.json`                                                     |
| Mosul           | 99072       | 36.33500 |  43.11889 | `cities.v1.json`                                                       |

Bundled paths are `src/geography/data/cities.v1.json` and
`src/game/data/capitals.v1.json`. Hami **1529484** is the populated-place record;
do not substitute administrative-region record 1529482. The spec's Xi’an point
is about 9 km north of the bundled center, changing both Q1 and Q2 headings.

## Independent spherical audit

Calculated with a sphere of radius 6,371.0088 km using the coordinates above.
Intersect the two great-circle planes defined by each station and its rounded
heading; test both antipodal crossings. A forward solution has positive travel
less than 180° from **both** stations. Every pair has exactly one such solution.
Rounded-ray intersections are all well within the supplied bullseye bands.

| Q / target  | Precise initial bearings A / B | Display A / B   | Rounded intersection error | Acute crossing angle at target | Nearest station | Tier radii km  |
| ----------- | ------------------------------ | --------------- | -------------------------: | -----------------------------: | --------------: | -------------- |
| 1 Xi’an     | 111.8999° / 212.1264°          | **112° / 212°** |                    1.83 km |                         85.35° |       503.91 km | 70 / 145 / 240 |
| 2 Dunhuang  | 301.7060° / 161.3146°          | **302° / 161°** |                    8.32 km |                         49.04° |       312.36 km | 55 / 120 / 230 |
| 3 Kashgar   | 273.2538° / 19.9659°           | **273° / 020°** |                    7.94 km |                         60.23° |       421.16 km | 80 / 180 / 320 |
| 4 Samarkand | 274.4166° / 354.3209°          | **274° / 354°** |                    5.71 km |                         85.46° |       271.63 km | 45 / 95 / 190  |
| 5 Baghdad   | 257.8237° / 160.2697°          | **258° / 160°** |                    6.86 km |                         83.27° |       352.91 km | 60 / 135 / 250 |

Station order follows the outline above. Rounded solutions have forward travel
of 4.546°/6.797°, 12.806°/2.736°, 14.385°/3.716°, 6.965°/2.393° and
19.122°/3.114°, respectively. All are regional shortest paths, far from an
antipodal ambiguity. Every station remains outside its outer acceptance radius,
including Hami with an 82.36 km margin in Q2.

The spec's “angle between station-to-target bearings” subtracts initial headings
at different places. That is **not the intersection angle**: great-circle
headings change along the path. Assess conditioning from the two local arrival
tangents at the target (equivalently, reverse bearings to both stations).
The corrected acute crossing angles are listed above; Q2 is the narrowest.
Independently repeating the calculation on the spec's provisional points
reproduced its approximate 6/7/11/5/8 km rounding errors. The change in the table
comes from coordinate reconciliation, not a different answer model.

Retain inclusive 3/2/1-point distance tiers, hint ceiling 2, assist ceiling 1,
zero outside the outer radius, and 15 points total. Grade against the canonical
city center, never against the rounded rays' intersection. Persist the ordinary
pin result and edition identity; do not silently regrade a completed answer.

## Editorial and completion preparation

The [UNESCO Chang’an–Tianshan listing](https://whc.unesco.org/en/list/1442/)
supports the network framing and eastern corridor context. The
[Mogao Caves listing](https://whc.unesco.org/en/list/440/)
supports Dunhuang's role in religious, artistic and intellectual exchange.
The Kashgar/Gilgit statements were checked against the Archaeological Survey of
India's [tentative-list submission](https://whc.unesco.org/en/tentativelists/5492/),
and Samarkand's historical layers against its
[World Heritage listing](https://whc.unesco.org/en/list/603/). The old UNESCO
Baghdad trade page now redirects to the programme home. The implemented final
reveal uses the live [Metropolitan Museum essay](https://www.metmuseum.org/essays/the-art-of-the-abbasid-period-750-1258)
for Baghdad's foundation as Abbasid capital in 762 and commercial/cultural role;
it omits the more specific waterways/Gulf wording.
Tentative-list material must not be described as a World Heritage inscription.

Completion retains five named purple discoveries, genuine missed pins in red,
blue reference stations, and five local views followed by a Eurasian view.
The approved follow-up adds ten selected overland corridor branches from
`silkRoadCorridors.ts`, checked against UNESCO's programme map. These are original
schematic polylines through rounded geographic anchors, not surveyed tracks,
traced artwork or one dated itinerary. They extend beyond the answered cities,
including both Tarim branches, Anatolia, the Levant, Caucasus and Persian Gulf.
The map caption identifies the schematic, time-varying scope and links UNESCO.
No media or third-party route dataset is redistributed.

## Implementation and focused verification sequence

1. Add the question-level presentation contract, validation and standalone recipe.
   Test that each question resolves without prior Journey state and that invalid
   station/target combinations fail. Reuse `geodesic.ts` and pin evaluation.
2. Add static paired readouts and one geographic assist sector. Test station
   association, fixed true-north semantics, spherical sector geometry, pending-pin
   preservation, help ceilings and no pre-answer target/ray disclosure.
3. Add reveal/lifecycle integration and focused regressions for clearing old
   overlays, actual offshore misses, station taps, tier boundaries, save recovery
   and completion marker roles. Turn the table's rounded-ray audit into automated
   fixtures using locked IDs/coordinates; do not hard-code displayed headings.
4. Author the unlisted Journey with `defineQuestion` / `definePresentation`, the
   original five stops, contextual prompts and reviewed sources. Test identity by
   stable ID, not catalog count or position. Register/index only when implementing.
5. Run relevant named frontend tests, TypeScript and
   `npm run check:journey -- <id-or-slug>`. Refresh the portable authoring kit.
   Run `npm run check:catalog` before pushing a catalog change, per `AGENTS.md`.

The user has explicitly prohibited browser testing. Use math, unit/DOM tests and
code inspection; report that actual GPU rendering and device layout were not
browser-verified. No publication or deployment is part of this preparation.

## Completion overlay behavior

The approved network is visible only at completion. Bright gold, solid three-pixel
paths stay fully opaque throughout the flyover. Spherical spline sampling rounds
the schematic bends while retaining each geographic anchor. Purple discoveries,
blue references and actual red mistake pins retain their existing roles. The
overlay has no arrows, hit targets or effect on pin grading.

Geometry reference reviewed 2026-10-20:
[UNESCO Silk Roads programme map, December 2025](https://www.unesco.org/sites/default/files/2026-04/SILK%20ROADS%20MAP_Dec%202025_1.jpg).
The Tarim split is also supported by the Archaeological Survey of India's
[tentative-list submission](https://whc.unesco.org/en/tentativelists/5492/).
