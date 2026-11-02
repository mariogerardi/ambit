# I'm Like a Bird: sources and illustration notes

Research reviewed November 1, 2026. Bundled edition added November 2, 2026.
This Journey belongs to the Journey library and automatic Daily pool, with the
practice route `/journey/im-like-a-bird`. Registration does not assign a date or
reset any started attempt.

## Preview and checks

Run `npm run dev`, then open
<http://127.0.0.1:5173/review/im-like-a-bird.html>. The page imports the Journey
directly and uses the real card control, reducer, feedback, completion and WebGL
globe. State stays in memory; it does not write player saves or call account APIs.
The stop selector allows focused review of any round; Restart starts a full run.
Completion has manual geographic views and saved answer reviews.

With the pinned Node/npm runtime, run:

```sh
npm test -- tests/im-like-a-bird-journey.test.tsx tests/choice-order.test.tsx tests/region-fades.test.ts tests/map-overlays.test.ts
./node_modules/.bin/tsc --noEmit
```

The Journey test runs `auditJourney` and verifies registry loading. Use
`npm run check:journey -- im-like-a-bird` for the indexed audit. Admin's normal
Journey review is available through the library as well as the isolated fixture.

## What the geography represents

All five shaded ribbons and reveal lines are original, research-informed
illustrations authored in `src/game/imLikeABirdJourney.ts`. No external GIS
datasets, map artwork or individual GPS coordinates were copied or digitized.
The papers below establish the broad movements and selected country milestones;
the drawn waypoints and widths are editorial approximations. They are not a
tracked individual's itinerary, a measured population corridor, seasonal range
polygons, confidence intervals, or a claim of universal passage.

The ribbons follow a centripetal spline through every authored waypoint,
normalized onto the sphere and sampled at roughly 35 km intervals. Continuous
tangents remove the remaining straight-segment corners. Rounded caps and eight
translucent bands soften the silhouette. The outer feather reaches 1.3 times the
nominal half-width listed below; this is a visual treatment, not new evidence.
The flow tips and reveal use the same smoothed centerline as the ribbons.

Play now includes larger, contrasting looping direction tips without a fixed centerline,
while political shapes remain anonymous and unhighlighted. Reveal adds a stronger
one-shot line, staggered country fills and numbered solution markers. It keeps a
single answer sequence; missed assignments are available in a disclosure. Each
round starts with all five cards shuffled into four positions and Leave out,
using the existing occupied-slot swap and assistance contracts. A hint moves the
spare into Leave out and locks it; the assist then locks the first country.

Reduced motion shows the corridor without moving or stationary direction tips;
reveal uses immediate solution fills. Advance
removes the previous corridor and flow; completion deliberately retains five
separate migrations with static direction lines. The full saved response review
and scientific qualifications remain available in secondary disclosures.

The four cards are selected milestones, not a complete list of all countries
crossed. A spare is outside this selected corridor, not necessarily outside the
species' distribution. Country polygons and ordering rules, independently of the
ribbons, determine grading. None of these overlays grants map input.

| Round                     | Evidence and selected milestones                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Illustration choices and limits                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Common crane              | [Crane Conservation Germany: migration](https://kraniche.de/en/crane-migration.html) describes Scandinavian breeders, German stopovers, and wintering in France and Spain. This supports Sweden → Germany → France → Spain.                                                                                                                                                                                                                                                                                                                         | A western-European autumn ribbon through Scandinavia, central Europe and Iberia; 100 km half-width. Italy is outside this western corridor. It is not a claim about other crane flyways.                                                                                                                                                                                                                                            |
| Ruby-throated hummingbird | [Cornell Lab: range and migration](https://www.allaboutbirds.org/guide/Ruby-throated_Hummingbird/maps-range) describes Central American wintering, northern breeding and both trans-Gulf and coastal routes. [American Bird Conservancy's species account](https://abcbirds.org/birds/ruby-throated-humming/) supports its breeding/nonbreeding geography.                                                                                                                                                                                          | Guatemala → Mexico → United States → Canada is a representative spring connection between those seasonal areas. The ribbon includes a Yucatán–northern Gulf crossing and an eastern North American continuation; 100 km half-width. This is a synthesis, not evidence that one tagged bird visited all four. Cuba is outside the chosen Gulf crossing. Seasonal ranges alone do not determine a precise flight path.                |
| White stork               | Berthold, van den Bossche, Kaatz & Querner (2006), “Conservation measures based on migration research in white storks,” [Acta Zoologica Sinica 52 Supplement, pp. 211–214](https://www.internationalornithology.org/sites/default/files/23rd%20IOC%20Proceedings_1.pdf), especially p. 212, describes eastern migrants crossing the Bosphorus, Levant, Gulf of Suez, Sudan and Uganda toward Kenya and beyond. [Becciu et al. (2020)](https://doi.org/10.1111/1365-2435.13539) studied storks tagged in Germany passing southern Turkey.            | Supports Germany → Turkey → Egypt → Kenya. The ribbon follows the eastern Mediterranean detour, Nile region and eastern Sudan/Uganda branch; 80 km half-width. It omits the separate Chad branch and is not a literal route through every drawn waypoint. Spain is on a different, western flyway.                                                                                                                                  |
| Amur falcon               | Kaur, Jacob & Kumar (2022), “Satellite tracking Amur falcons Falco amurensis from their stop-over sites in Manipur to support conservation efforts,” Wildlife Institute of India, Technical Report 2021/20, [pp. 29–33, especially p. 31](https://raptors.cms.int/sites/default/files/document/Inf.14_Satellite%20Tracking%20of%20Amur%20Falcon%20Falco%20Amurensis.pdf). It documents autumn departures from China, northeastern Indian stopovers, Arabian Sea crossings to Somalia and southern African nonbreeding areas including South Africa. | Supports China → India → Somalia → South Africa. The 140 km half-width ribbon chooses the reported overland option within India before the Arabian Sea crossing. It does not portray the additional Bay of Bengal crossing made by some tracked birds. Madagascar is outside this mainland continuation.                                                                                                                            |
| Bar-headed goose          | Hawkes et al. (2013), [“The paradox of extreme high-altitude migration in bar-headed geese Anser indicus,” Proceedings B 280:20122114](https://pmc.ncbi.nlm.nih.gov/articles/PMC3574432/), results §2(a–b), Figure 1. Tracking links Mongolian breeding grounds, the Tibetan Plateau and Indian wintering grounds; an autumn altitude record was explicitly located over northern Bhutan.                                                                                                                                                           | Supports Mongolia → China → Bhutan → India as a representative eastern-Himalayan option, not the route of every bird. The ribbon stays east of Nepal, crosses central Bhutan and ends in the Indian plains; 55 km half-width. The waypoints are not that bird's published GPS fixes. Myanmar is outside this crossing. The study generally found valley-following at lower altitudes, not routine flight above the highest summits. |

No unsupported country sequence was substituted. The main remaining data limit
is deliberate: the overlays show a defensible illustrative connection, not a
downloadable, empirically delimited corridor dataset.

## Photographs and reuse

Five species portraits are bundled locally. They identify the bird; the location
where a portrait was taken does not establish a migration route. The white stork
portrait, for example, was taken in Spain. The goose portrait is from Belgium.
These facts do not alter the selected migration sequences.

The files are unchanged Wikimedia Commons thumbnails. Their original URLs,
download URLs, author credits, license links and SHA-256 hashes are recorded in
`src/game/data/im-like-a-bird-media.v1.json`. Credit and license links appear with
each reveal photograph and remain accessible in saved answer reviews.

| Local image                   | Author and original file                                                                                                                                                      | License                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| common-crane.jpg              | [MinoZig: Grus grus in flight, Israel](https://commons.wikimedia.org/wiki/File:Grus_grus_in_flight,_Israel.jpg)                                                               | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| ruby-throated-hummingbird.jpg | [Joe Schneid: Archilochus colubris (Male)](<https://commons.wikimedia.org/wiki/File:Archilochus_colubris_(Male).jpg>)                                                         | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)       |
| white-stork.jpg               | [Carlos Delgado: Ciconia ciconia - 01](https://commons.wikimedia.org/wiki/File:Ciconia_ciconia_-_01.jpg)                                                                      | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| amur-falcon.jpg               | [Afsarnayakkan: Amure falcon (Falco amurensis) (12244)](<https://commons.wikimedia.org/wiki/File:Amure_falcon_(Falco_amurensis)_(12244).jpg>)                                 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| bar-headed-goose.jpg          | [Horst J. Meuter: Streifengans - Indische Gans - Anser indicus - (1) 04](<https://commons.wikimedia.org/wiki/File:Streifengans_-_Indische_Gans_-_Anser_indicus_-_(1)_04.jpg>) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |

The photograph licenses apply to their respective files. No artwork, maps or
tracking datasets from Cornell, BirdLife, eBird, Audubon, Movebank or the cited
papers are redistributed. Original illustrative ribbons are repository-authored.
