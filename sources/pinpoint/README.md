# Pinpoint landmark snapshot

`targets.json` defines 60 recognizable landmarks across 60 countries. It is a
curated variety pool, not an exhaustive database. Wikipedia page properties
resolve each target to a Wikidata entity; the shipped coordinates are Wikidata's
P625 statements, with entity IDs and source revisions retained.

`python3.13 scripts/prepare-pinpoint.py` writes only
`src/minigames/landmarks.v1.json` and `public/minigames/pinpoint/`. It caches source
responses in `.cache/pinpoint/`, honors rate limits, and stores Commons thumbnails
only when their metadata identifies a supported license and image format. It
never regenerates shared geography or the Journey catalog. Runtime play is offline.
Review changes deliberately before replacing a cache entry or source snapshot.

The 58 photographs retain authors, file-page URLs, license links and checksums in
`public/minigames/pinpoint/SOURCES.json`. `overrides.json` records reviewed display
names and attribution corrections. In particular, the Eiffel Tower and Borobudur
file pages distinguish public-domain structures from CC BY-SA 3.0 photographs;
Kilimanjaro's file page requests credit to Chris 73 / Wikimedia. Source pages:

- https://commons.wikimedia.org/wiki/File:Tour_Eiffel_Wikimedia_Commons.jpg
- https://commons.wikimedia.org/wiki/File:Borobudur-Nothwest-view.jpg
- https://commons.wikimedia.org/wiki/File:Mt._Kilimanjaro_12.2006.jpg

API references:

- https://www.wikidata.org/wiki/Wikidata:Data_access
- https://www.mediawiki.org/wiki/API:Imageinfo

Photos are downloaded thumbnails without further file changes. The UI may crop
the displayed frame. Per-photo attribution accompanies each image in the game;
World credits links the complete downloadable source record.
