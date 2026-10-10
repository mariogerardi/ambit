import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { geoCentroid } from "d3-geo";
import { sphericalGeometry } from "../src/geography/sphericalGeometry.mjs";
const input = readFileSync("sources/ne-countries.geojson");
const checksums = JSON.parse(readFileSync("sources/checksums.json", "utf8"));
const sourceSha256 = checksums["ne-countries.geojson"].sha256;
if (createHash("sha256").update(input).digest("hex") !== sourceSha256)
  throw Error(
    "Island clue source checksum mismatch. Run prepare:geography to restore the pinned source.",
  );
const source = JSON.parse(input);
const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
);
const specs = [
  ["andaman-nicobar", "IND", [91, 95, 6, 14]],
  ["bioko", "GNQ", [8, 9.2, 3, 4.2]],
  ["svalbard", "NOR", [8, 36, 74, 82]],
  ["galapagos", "ECU", [-93, -89, -2, 2]],
  ["reunion", "FRA", [55, 56, -22, -20]],
];
const parts = (g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates);
const within = (p, b) =>
  p[0].every(([x, y]) => x >= b[0] && x <= b[1] && y >= b[2] && y <= b[3]);
const result = {
  version: 1,
  source: "Natural Earth v5.1.2 · 1:50m country geometry",
  sourceUrl:
    "https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/",
  sourceSha256,
  islands: specs.map(([id, code, bounds]) => {
    const raw = source.features.find((f) => f.properties.ADM0_A3 === code);
    const owner = world.find((r) => r.id === `wurl:${code}`);
    const coordinates = parts(raw.geometry).filter((p) => within(p, bounds));
    const points = parts(owner.geometry)
      .filter((p) => within(p, bounds))
      .map((coordinates) => {
        const [lng, lat] = geoCentroid(
          sphericalGeometry({ type: "Polygon", coordinates }),
        );
        return { lng, lat };
      });
    if (!coordinates.length || !points.length)
      throw Error(`Missing island geometry: ${id}`);
    console.log(
      id,
      coordinates.length,
      "source components",
      points.length,
      "display components",
    );
    return {
      id,
      countryId: owner.id,
      points,
      geometry: { type: "MultiPolygon", coordinates },
    };
  }),
};
writeFileSync(
  "src/game/data/island-clues.v1.json",
  JSON.stringify(result) + "\n",
);
