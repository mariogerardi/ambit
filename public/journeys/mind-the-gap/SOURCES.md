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
- [Metroteca's depth comparison](https://metroteca.com/en/depth/) discusses
  measurement conventions and identifies Hongyancun as the deepest station,
  followed by the former record holder Arsenalna. The question uses “widely
  regarded” because comparison conventions and published station data differ.
  The per-city list is not a ranking of individual stations: Admiralteyskaya is
  not presented as the world's third-deepest station and is not part of this round.
- [Hongyancun's constructor, CSCEC](https://en.cscec.com/CompanyNews/CorporateNews/202510/3911551.html)
  describes the station's hillside engineering and 141 m elevation difference
  between entrances. This is not equated with platform depth.
- [OpenStreetMap node 9436112299, version 12](https://www.openstreetmap.org/node/9436112299/history)
  supplies the Hongyancun reference point (29.5525861° N, 106.4893638° E) and a
  recorded depth of 116 m, used approximately in the reveal.
  © OpenStreetMap contributors, [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/).

Kyiv's Arsenalna marker is an explanatory station reference, not an extra
graded location. Ukraine is the sole country answer; Russia remains a distractor.
Other city points use the credited GeoNames identities in the Journey module.

## Quito and Berlin

[Transdev's commissioning announcement](https://www.transdev.com/en/news/south-america/press-release/commissioning-of-quitos-first-metro-line-jointly-operated-by-transdev)
describes the metro line itself at 2,850 m and identifies it as the world's highest
metro line, built in a 22.6 km tunnel. Q3 asks for that approximate railway
elevation, rather than Quito's city average or a precise height for each platform.

[Berlin's ghost-station exhibition](https://www.berlin.de/en/tickets/exhibitions/border-and-ghost-stations-in-divided-berlin-b20043c9-a84f-4435-a240-4b2b51a41410/)
describes the West Berlin U-Bahn and S-Bahn services through sealed eastern
stations and Friedrichstraße's controlled interchange exception. No historical
route geometry is reconstructed.

The original Europe reference in `src/game/data/mind-the-gap-europe.v1.json` is supplied
handoff geometry described as united, simplified Natural Earth 1:110m country
polygons, with an approximate eastern boundary. It is display-only. The source
data are [public domain](https://www.naturalearthdata.com/about/terms-of-use/).
The handoff did not identify an exact Natural Earth release or preparation
script. The user subsequently removed the overlay; the geometry remains in the
source handoff record but is not rendered or used for grading. Q4 uses a clean,
borderless regional view. European country surfaces follow the existing Study
continent grouping and receive the shared reference fill without political
outlines or locator rings; Germany is outlined on assist and reveal.

## Marmaray

[The construction consortium](https://holding.gama.com.tr/en/project/10274/)
reports a 1,387 m immersed-tube section and deepest alignment point of 60.46 m;
the construction period ended in October 2013.

The target at 41.021° N, 29.000° E is a broad illustrative crossing location.
The dashed three-point path is an authored schematic connecting the Sirkeci and
Üsküdar shores, not surveyed tunnel alignment. The 50/150/300 km bands test
finding Istanbul's region; they do not test identifying a tunnel portal.
