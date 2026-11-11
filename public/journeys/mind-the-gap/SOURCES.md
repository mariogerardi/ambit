# Mind the Gap — sources

Reviewed November 11, 2026. These notes retain evidence and implementation
qualifications outside the player-facing question text.

## Liziba photograph

- File: `liziba.v1.jpg`, 1280 × 960 pixels.
- Creator: **David290**, photographed May 25, 2019.
- [Original file page](https://commons.wikimedia.org/wiki/File:A_train_of_Chongqing_Rail_Transit_Line_2_coming_through_a_residential_building_at_Liziba_2251.jpg).
- License: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- Unchanged Wikimedia Commons thumbnail; the interface may crop its displayed
  frame. The photograph's license applies independently of application code.
- Download URL and SHA-256 are retained in
  `src/game/data/mind-the-gap-media.v1.json`.

The clue image and alt text omit the city and station names. Identifying caption,
photographer credit and license links appear after submission. The
[interview with Liziba's designer](https://www.ichongqing.info/2022/01/06/which-came-first-liziba-station-or-its-residential-building/)
supports the shared design/construction story. Published descriptions count the
station's floors differently; the Journey says “middle floors.”

## Deep stations and their locations

- [Independent Kyiv Metro guide: Arsenalna](https://kyivmetro.org/en/m1-line/arsenalna/)
  reports the 105.5 m platform depth. This site is not the metro operator.
- [Admiralteyskaya's designers](https://www.lmgt.ru/en/projects/metro-in-st.-petersburg/admiralteiskayathe-metro-station-admiralteyskaya)
  report 86 m. The page's introductory address/date fields are inconsistent with
  its station description; the Journey uses only its depth information.
- [Metroteca's depth comparison](https://metroteca.com/en/depth/) discusses
  measurement conventions. No precise global ranking is asserted.
- [Hongyancun's constructor, CSCEC](https://en.cscec.com/CompanyNews/CorporateNews/202510/3911551.html)
  describes the station's hillside engineering and 141 m elevation difference
  between entrances. This is not equated with platform depth.
- [OpenStreetMap node 9436112299, version 12](https://www.openstreetmap.org/node/9436112299/history)
  supplies the Hongyancun reference point (29.5525861° N, 106.4893638° E) and a
  recorded depth of 116 m. The question uses the less specific “more than 100 m.”
  © OpenStreetMap contributors, [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/).

Kyiv and Saint Petersburg markers are explanatory station references, not extra
graded locations. Their city/country relationships are the two-country task.
Other city points use the credited GeoNames identities in the Journey module.

## Quito and Berlin

[Quito Turismo's visitor map](https://visitquito.ec/wp-content/uploads/2025/07/MAPA_2023_DIGITAL.pdf)
lists an urban-zone average altitude of 2,850 m. This is an approximate city
elevation, not a common height assigned to all metro platforms.

[Berlin's ghost-station exhibition](https://www.berlin.de/en/tickets/exhibitions/border-and-ghost-stations-in-divided-berlin-b20043c9-a84f-4435-a240-4b2b51a41410/)
describes the West Berlin U-Bahn and S-Bahn services through sealed eastern
stations and Friedrichstraße's controlled interchange exception. No historical
route geometry is reconstructed.

The Europe reference in `src/game/data/mind-the-gap-europe.v1.json` is supplied
handoff geometry described as united, simplified Natural Earth 1:110m country
polygons, with an approximate eastern boundary. It is display-only. The source
data are [public domain](https://www.naturalearthdata.com/about/terms-of-use/).
The handoff did not identify an exact Natural Earth release or preparation
script; it is not used for political boundaries or grading.

## Marmaray

[The construction consortium](https://holding.gama.com.tr/en/project/10274/)
reports a 1,387 m immersed-tube section and deepest alignment point of 60.46 m;
the construction period ended in October 2013.

The target at 41.021° N, 29.000° E is a broad illustrative crossing location.
The dashed three-point path is an authored schematic connecting the Sirkeci and
Üsküdar shores, not surveyed tunnel alignment. The 50/150/300 km bands test
finding Istanbul's region; they do not test identifying a tunnel portal.
