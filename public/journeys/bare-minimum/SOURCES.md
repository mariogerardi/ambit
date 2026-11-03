# Bare Minimum — historical flags and geographic sources

The local SVGs are simple, independently recreated illustrations, not crops of a
third-party infographic or photographs. Historical red, yellow, black and green
are illustrative screen colors; the artwork does not assert historical digital
color standards. Thin neutral frames sit outside the flag fields.

## Historical designs

- **France:** The plain-white national ensign belongs to the Bourbon Restoration,
  interrupted by Napoleon’s Hundred Days. The revolutionary tricolor returned in 1830. [FOTW Restoration history](https://www.fotw.info/flags/fr_rest.html) and
  [naval flag records](https://www.fotw.info/flags/fr~rest.html) distinguish the
  national ensign from decorated royal and military standards.
- **Brunei:** The early yellow field represents the Sultan’s **royal banner**.
  The Information Department’s [flag-history feature](https://www.information.gov.bn/Majalah%20Alai%20Ginis/2024/MAGAZINE%20DECEMBER%202024%20FINAL.pdf)
  explicitly says there was no official state flag before 1906, illustrates the
  yellow 18th–19th-century royal banner, and dates the striped state flag to 1906
  and the crest to 1959. Its [annual report](https://www.information.gov.bn/Publication%20listsPDF/Annual_Report_BruneiDarussalam_2005-2009%28Part_One%29.pdf)
  corroborates the latter dates. Both official PDF URLs returned 404 to direct
  retrieval on November 2, 2026; their indexed official text and flag descriptions
  were available and checked. The [historical FOTW record](https://www.crwflags.com/fotw/flags/bn_his.html)
  also describes the early yellow banner and striped successor.
- **Hungary:** The Hungarian Soviet Republic used a plain-red flag in **1919**.
  [The FAME historical record](https://zeljko-heimer-fame.from.hr/descr/hu-sovie.html)
  describes the red flag but has an apparent 1918 adoption-year error. This
  Journey uses the republic’s March–August 1919 period, also documented by the
  [Commons historical flag record](<https://commons.wikimedia.org/wiki/File:Flag_of_Hungary_(1919).svg>).
- **Muscat and Oman:** The [Oman Foreign Ministry](https://www.fm.gov.om/en/about-oman/state/flag-emblem-and-national-anthem/)
  identifies the earlier flag as all red and dates the multicolor design to
  December 17, 1970. The modern Oman polygon is a geographic locator for the
  historical Sultanate of Muscat and Oman.
- **Afghanistan:** [Encyclopaedia Iranica](https://www.iranicaonline.org/articles/flags-ii/)
  establishes black as the standard royal/state flag color under Abdur Rahman
  Khan, 1880–1901, and discusses emblems and variants. The plain-black rectangle
  is explicitly labeled **reconstruction**. It is not presented as proof of a
  universally standardized plain national flag. [Contemporary Reuters reporting](https://www.washingtonpost.com/archive/politics/1996/09/29/afghan-militia-halts-advance-after-kabul/325ae991-b7ab-45aa-af7e-9e8d953f9be8/)
  and [FOTW’s historical account](https://www.crwflags.com/FOTW/flags/af_talib.html)
  corroborate the early Taliban plain-white banner in 1996. No historical
  photograph or modern Taliban insignia is reproduced.
- **Libya:** [SAVA’s specification](https://www.savaflags.org.za/spec/Libya%20-%20national%20-%201977%20-%202011.pdf)
  documents the plain-green national flag and its 1977–2011 period. The Journey
  avoids the disputed exact adoption day and an unsupported claim to uniqueness
  across all flag history.

## Artwork and geography

`field-01.svg` through `field-07.svg` form the seven-swatch completion collection,
including separate Hungary/Oman red images and separate France/Afghanistan white
images. `clue-03.svg` and `clue-04.svg` combine supplied fields for the question
panel. The latter visibly qualifies the black reconstruction. `clue-02.svg`
labels the yellow design as a historical Sultan’s banner.

The 1906–1959 striped illustration uses the basic stripe geometry of the bundled
public-domain Brunei flag, omitting its later crest. The current French, Bruneian
and Libyan flag illustrations reuse the existing local flag catalog, pinned to
[hampusborgos/country-flags](https://github.com/hampusborgos/country-flags/tree/c09927e63705529bbf59ca6684cd9b23225dddad),
with the repository’s established public-domain provenance.

Country polygons and Borneo’s exterior coastline derive from bundled Natural
Earth 5.1.2 data (public domain). The Borneo component is the union of Malaysia,
Indonesia and Brunei, so its outer shore reveals no Brunei border. The play view
withholds all internal country boundaries. Brunei’s two land areas are revealed
from the canonical country geometry after commitment. City coordinates come from
the pinned GeoNames capital/major-city catalog (CC BY 4.0).

Brunei pin grading uses Bandar Seri Begawan (4.89035° N, 114.94006° E) as the
specified approximate-location proxy, with inclusive 90/150/230 km bands. Kuching
and Balikpapan are independently checked to lie beyond 230 km. The test cases
include close, displaced northwest-coast and southern-island guesses; these are
engineering checks rather than human playtesting.

Recreate the illustrations and coast from existing local geography with Python

> =3.11 and `shapely` installed:

```sh
python3 scripts/prepare-bare-minimum.py
```

[The asset audit](asset-audit.json) records input/output SHA-256 checksums. Modern
country footprints locate the historical events; they are not historical boundary
reconstructions. No catalog, schedule, account service or shared geographic asset
is modified by preparation.
