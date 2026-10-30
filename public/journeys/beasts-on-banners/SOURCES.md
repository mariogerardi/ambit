# Beasts on Banners: artwork and factual sources

These assets support Beasts on Banners, registered at `/journey/beasts-on-banners`.
Registration does not deploy the Journey. Altered images are educational puzzle
illustrations, not official flag variants. Player-facing source titles should remain neutral:
for example, "Bhutan Ministry of Foreign Affairs · National symbols".

## Artwork provenance

All production art derives from Ambit's existing **Accurate country flags**
snapshot, commit `c09927e63705529bbf59ca6684cd9b23225dddad`. Its
[retained upstream notice](../../../sources/flags-source-README.md) describes
the Wikimedia Commons originals as public domain. See also the
[pinned upstream README](https://github.com/hampusborgos/country-flags/blob/c09927e63705529bbf59ca6684cd9b23225dddad/README.md).
This is the existing source project's copyright statement, not a determination
that every use of national insignia is unrestricted.

The handoff contact sheets informed the edits. No PST-Flags artwork, LPPL package
components, embedded PNG strips, or government reference images were copied into
the production files. All new assets use vector geometry and local fragment
references only. The original full flags and catalog remain unchanged.

Reproduce only this asset set with `python3.13 scripts/prepare-beasts-flags.py`
from the repository root (Python >=3.11; standard library only). The generator
checks the bundled flags against `sources/flags.metadata.json` before editing.
`sources/beasts-flags.metadata.json` records individual upstream URLs, source and
output SHA-256 hashes, viewports, and the exact transformations. Original and clue
details use the same viewport and underlying full-flag geometry.

| Round     | Original full flag          | New original detail      | Question-only full / detail          |
| --------- | --------------------------- | ------------------------ | ------------------------------------ |
| Mexico    | `/flags/study/flag-110.svg` | `01-original-detail.svg` | Use originals                        |
| Andorra   | `/flags/study/flag-004.svg` | `02-original-detail.svg` | `02-clue.svg` / `02-clue-detail.svg` |
| Bhutan    | `/flags/study/flag-019.svg` | Full flag only           | Use original full flag               |
| Sri Lanka | `/flags/study/flag-164.svg` | `04-original-detail.svg` | `04-clue.svg` / `04-clue-detail.svg` |
| Bolivia   | `/flags/study/flag-020.svg` | `05-original-detail.svg` | `05-clue.svg` / `05-clue-detail.svg` |

Bhutan uses only its full flag in play, feedback and completion; the prepared
`03-original-detail.svg` crop is retained but unused.

Andorra removes the two cow instances and adds a red, font-independent question
mark. Sri Lanka removes the sword's blade, guard and hilt subpaths while
preserving the raised paw and fingers. Bolivia removes 18 animal fill/outline
paths, exposing the existing landscape; the mountains, sun, palm, wheat, shield,
stars and condor remain unchanged. These are source-faithful derivatives, not
certified official government master artwork or color proofs.

## Disclosure and media contract

During play, both the main detail and secondary full flag must use the clue
variant for rounds 2, 4 and 5. After either a correct or incorrect submitted
answer, replace both with originals through `feedbackFlags`. Completion uses
only originals. Do not rely on `image.feedbackAlt` alone to restore image content.
Remove the prior round's clue on advancement. The direct-module Journey and its focused lifecycle tests implement this
contract; these asset files alone do not control stage transitions.

Use these pre-answer alt texts for the main detail, and equivalent full-flag
descriptions for its secondary context. Do not name the removed object in either.

| Round     | Pre-answer detail alt text                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------ |
| Mexico    | Eagle, serpent and cactus in the central emblem of Mexico's flag.                                            |
| Andorra   | Andorra's coat of arms with a red question mark in its lower-right gold quarter.                             |
| Bhutan    | White dragon with jewels across a yellow and orange background.                                              |
| Sri Lanka | Golden lion with a raised paw beside an empty space on a maroon background, with four corner leaves.         |
| Bolivia   | Mountain landscape inside Bolivia's coat of arms, with an empty patch of foreground beside wheat and a palm. |

After submission the alt text may explicitly describe the two cows, sword,
thunder dragon and llama. Neutral numeric asset filenames contain no answers.
The SVGs contain no titles, descriptions, text nodes, accessibility labels,
scripts, external links, or raster images. The shield's lettering is geometry
preserved from the original, not hidden metadata.

## Factual references

Reviewed against the sources below on **29 October 2026**. Facts are paraphrased;
reference artwork is not redistributed.

### Mexico: target and tolerances

[INAH's Templo Mayor record](https://datos.inah.gob.mx/taxonomy/term/2025)
publishes `POINT (-99.13145 19.434914)` in longitude/latitude order. Use
**lat 19.434914, lng -99.131450** as a representative point in Tenochtitlan's
ceremonial center. It does not locate the legendary eagle to an exact coordinate.

The [INAH archaeological guide](https://www.difusion.inah.gob.mx/images/guias/115_zona-arqueologica-templo-mayor.pdf),
PDF page 1 of 2, historical overview, places the settlement on an island in Lake
Texcoco around 1325 and describes the eagle-on-cactus legend. PDF page 2 locates
the surviving archaeological site in Mexico City's historic center.

Use 100 / 200 / 300 km as inclusive 3 / 2 / 1-point distance tiers, with zero
outside 300 km and normal help ceilings. These are regional gameplay tolerances,
not historical city boundaries. Ambit's Mexico City capital point is about 0.82 km
from the INAH target and earns full credit. The enlarged bands deliberately allow
approximate placement from a country-wide view.

The opening camera frames all of Mexico using its bundled country focus, with
extra margin. Reveal framing fits the larger target rings. Use bundled GeoNames
records for Guadalajara and Oaxaca as assist references: they are 461.51 km and
366.43 km from the target, respectively, outside the full 300 km acceptance
radius. The target lies east of Guadalajara and northwest of Oaxaca. Earlier
Puebla/Querétaro references are no longer used because both fall inside the
expanded target. Keep the actual point, Mexico City label and accuracy rings
hidden until submission. Physical-phone touch precision remains unverified.

Content revision 2 preserves earlier submitted grades and receipt labels through
the existing save-upgrade layer; new attempts use the enlarged bands.

### Andorra: shield composition

The [government arms guide](https://www.govern.ad/documents/1898932/3698624/1_Escut.pdf/e8f70532-6a51-7ab4-0e94-f35b50c9b09c?t=1734522065599),
printed page 9 / PDF page 4, identifies the traditional four components.
The [government's historical arms record](https://www.govern.ad/ca/l/4510908)
explicitly identifies the cows of Béarn in the lower-right quarter. The guide
distinguishes simplified and detailed versions; the supplied and bundled
reproductions should not be described as exact government master artwork.

### Bhutan: Druk and the flag

[Ministry of Foreign Affairs, Window on Bhutan, December 2022](https://www.mfa.gov.bt/wp-content/uploads/2022/12/window-on-Bhutan-2022.pdf),
**printed page 46, National Symbols**, contains the passage
"Druk means thunder dragon, Yul means land."
The National Emblem section connects the dragon's roar with summer storms;
the National Flag section associates the flag's dragon with the country's name
and its claw-held jewels with wealth and perfection. These support "Thunder"
and the revised reveal. Keep the translation out of pre-answer source titles,
alt text, captions and hints.

The Ministry's indexed page text was readable and includes its printed page
number. Direct PDF downloads timed out, so the PDF viewer page index and a
fresh visual inspection of that physical page remain unverified. Do not invent
a viewer page number or report a successful download.

### Sri Lanka: lion and sword

The [Sri Lankan High Commission in Wellington's country profile](https://www.hc-wellington.gov.lk/pt/country-profile),
National Symbols / Sri Lanka National Flag, identifies the lion holding a sword
and associates the sword with sovereignty. Its description and flag reference
support preserving the lion, four leaves, stripes and borders during the edit.

### Bolivia: emblem and institutional flag

[Supreme Decree 241 of 5 August 2009, reproduced by LexiVox](https://www.lexivox.org/norms/BO-DS-N241.xhtml),
articles 9 and 12 distinguish institutional and civil uses; articles 21 and 24
identify the llama, mountains, wheat, palm, condor and the animal's association
with native fauna. The reproduction supports the factual distinction, but is
not an official consolidated legal opinion or a redistribution license for art.

Copyright provenance and insignia-use rules are separate. Article 42 contains
restrictions concerning additions to representations of state symbols and certain
uses. Its application to this educational omission puzzle, and any applicable
exception, have not been established. No publication clearance is inferred from
the upstream public-domain notice or this local asset preparation.
