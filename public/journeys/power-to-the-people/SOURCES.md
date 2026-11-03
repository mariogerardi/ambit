# Power to the People — sources and geographic data

Historical sources are available after each answer. No documentary photographs
are bundled. City references use the existing GeoNames catalog (CC BY 4.0), with Sidi Bouzid
located at 35.03823° N, 9.48494° E from [GeoDatos](https://www.geodatos.net/en/coordinates/tunisia/sidi-bouzid).
The EDSA reference marks the Camp Aguinaldo frontage in Quezon City, distinct
from Manila's graded city center; its historical location follows the
[Philippine National Historical Commission](https://philhistoricsites.nhcp.gov.ph/registry_database/edsa-people-power/).

## Ukraine, December 26, 2004

[Regional results](regional-results.json) transcribe the official
[Central Election Commission summary](https://cvk.gov.ua/pls/vp2004/wp301e2e3e.html).
They record the leading candidate, their reported share, and voters participating
in each of 27 regions. This is the December 26 repeat runoff, not either earlier
round. The CEC's historical English transliterations are retained in `cecName`;
ISO keys join the results to geography. The result is categorical: regional
winners do not describe every resident's vote.

[Download the derived administrative polygons](historical-regions.geojson).
These are a derivative database under the
[Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
Attribution: © OpenStreetMap contributors, Wambacher, geoBoundaries.
[geoBoundaries source](https://www.geoboundaries.org/api/current/gbOpen/UKR/ADM1/),
release commit `9469f09`, boundary ID `UKR-ADM1-14850775`, represents 2017.
Its 24 oblasts, Autonomous Republic of Crimea, Kyiv City and Sevastopol are
matched individually to the CEC's 2004 units. These later polygons reconstruct
the historical election-region footprint; they are not a surveyed boundary
archive from 2004. No modern occupation/control boundaries are included. The play perimeter uses only
the union’s exterior ring: small internal seams created by source-unit alignment
are not drawn as bright outlines. Grading polygons and their holes are unchanged.
Kyiv City is excluded from Kyiv Oblast, and Sevastopol from Crimea.

The source includes coastal waters. Preparation clips it to the bundled
[Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/) land
(public domain), using all country footprints so Crimea remains present despite
the base map's contemporary display convention. A 0.001-degree simplification
is shared by the grading grid, country/target masks, outlines and result image.
The runtime geography does not replace the shared country catalog.

`regional-winners.png` shows Yushchenko's regions in orange and Yanukovych's
in purple. It appears only after submission; the shared grading overlay recolors
the target and submitted paint above this historical layer. Candidate labels
identify the regions independently of those grading colors. The submitted paint remains in the
shared correct/incorrect/missed-target overlay. The 0.1-degree grading grid
weights clipped land by geodesic cell area. Fractional boundary cells preserve
the target's proportion of the land; water and land outside Ukraine contribute
nothing. Masks have the same bounds and north-up alignment as the result image.

Reproduce from the repository root with Python >=3.11 and `shapely`, `numpy`,
`Pillow`, `pyproj` installed:

```sh
python3 scripts/prepare-power-people.py
```

The script pins the two download checksums and records the bundled land checksum,
27-unit crosswalk, output checksum, clipped area, and an independent non-aligned
sampling comparison in [the data audit](data-audit.json). It validates separate
Kyiv/Sevastopol/Crimea locations and source-unit overlap. The bundled tests exercise
broad, intermediate, limited-western and wrong-side strokes across the normal
3/2/1 tiers, assistance ceilings and save restoration. These scripted examples
are engineering calibration, not human playtesting.

## Flag

The national flag uses the existing local `flag-160.svg`, from
[hampusborgos/country-flags](https://github.com/hampusborgos/country-flags/tree/c09927e63705529bbf59ca6684cd9b23225dddad).
It retains the repository's established public-domain flag provenance in
`sources/flags-source-README.md`. The
[South African Government](https://www.gov.za/about-sa/national-flag-1)
provides its design, symbolism and first-use date.

## Historical accounts

- [UNESCO: People Power radio broadcasts](https://www.unesco.org/en/memory-world/radio-broadcast-philippine-people-power-revolution?hub=1081)
- [South African Government: freedom milestones](https://www.gov.za/issues/20years/milestones-20-years-freedom)
- [OSCE/ODIHR: Ukraine 2004 election mission](https://odihr.osce.org/odihr/elections/ukraine/eoms/presidential_2004)
- [Wilson Center: Tunisia](https://www.wilsoncenter.org/tunisia)
- [CFR: Arab Spring retrospective](https://www.cfr.org/articles/arab-spring-ten-years-whats-legacy-uprisings)
- [WIRED: Nepal online deliberations](https://www.wired.com/story/nepal-discord-gen-z-protests-vote-prime-minister-election/)
- [Harvard: 2025 Nepal uprising](https://hsph.harvard.edu/atrocity-prevention-lab/news/the-2025-gen-z-uprising-in-nepal-a-three-part-analysis/)
- [Nepal Prime Minister's Office: 2026 election and assumption of office](https://opmcm.gov.np/minister-detail/)

The political-geography context for Q3 follows the [Congressional Research Service’s February 2005 account](https://www.everycrsreport.com/reports/RL32691.html) and the OSCE/ODIHR election report: Yushchenko’s reform coalition and European orientation, and Yanukovych’s industrial eastern base and links with Russia.
