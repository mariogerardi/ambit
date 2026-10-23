import fs from "node:fs/promises";
import { createHash } from "node:crypto";

// This focused preparation never rewrites geography, identities, or quiz rosters.
const raw = await fs.readFile(".cache/quiz/countryInfo.txt");
const checks = JSON.parse(
  await fs.readFile("sources/explore-checksums.json", "utf8"),
);
if (
  createHash("sha256").update(raw).digest("hex") !== checks.countryInfo.sha256
)
  throw Error("Country metadata checksum mismatch");
const mappings = JSON.parse(
  await fs.readFile("sources/catalog-mapping.json", "utf8"),
).world;
const naturalEarthRaw = await fs.readFile("sources/ne-countries.geojson");
const geographyChecks = JSON.parse(
  await fs.readFile("sources/checksums.json", "utf8"),
);
if (
  createHash("sha256").update(naturalEarthRaw).digest("hex") !==
  geographyChecks["ne-countries.geojson"].sha256
)
  throw Error("Natural Earth source checksum mismatch");
const naturalEarth = JSON.parse(naturalEarthRaw);
const rows = new Map(
  raw
    .toString()
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const row = line.split("\t");
      return [row[1], row];
    }),
);
const previous = JSON.parse(
  await fs.readFile("src/geography/data/country-info.v1.json", "utf8"),
);
const countries = {};
for (const feature of naturalEarth.features) {
  const n = feature.properties;
  const mapping = mappings[n.NE_ID];
  // A shared ISO seed must not copy Australia's profile into separate map units.
  const p =
    mapping.id === `wurl:${mapping.iso}` ? rows.get(mapping.iso) : undefined;
  countries[mapping.id] = {
    continent: n.CONTINENT,
    subregion: n.SUBREGION ?? "",
    ...(p
      ? {
          areaKm2: Number(p[6]) || null,
          population: Number(p[7]) || null,
          listedCapital: p[5] || null,
          currencyCode: p[10],
          currencyName: p[11],
          callingCode: p[12],
        }
      : Number(n.POP_EST) > 0
        ? {
            population: Number(n.POP_EST),
            populationYear: Number(n.POP_YEAR),
            populationSource: "Natural Earth",
          }
        : {}),
    languages: p ? p[15].split(",").filter(Boolean) : [],
  };
}
await fs.writeFile(
  "src/geography/data/country-info.v1.json",
  JSON.stringify({
    ...previous,
    source:
      "GeoNames CC BY 4.0 / Natural Earth public domain; GeoNames population estimates are undated; Natural Earth fallback estimates retain their source year",
    countries,
  }),
);
console.log(`Prepared ${Object.keys(countries).length} Explore profiles.`);
