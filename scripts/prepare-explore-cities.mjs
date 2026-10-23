import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { geoBounds, geoContains } from "d3-geo";
import { sphericalGeometry } from "../src/geography/sphericalGeometry.mjs";

// Called by prepare-cities.py after it verifies and reads the pinned GeoNames ZIP.
let input = "";
for await (const chunk of process.stdin) input += chunk;
const { rows, countryInfo, capitals } = JSON.parse(input);
const raw = await fs.readFile("sources/ne-countries.geojson");
const checks = JSON.parse(await fs.readFile("sources/checksums.json", "utf8"));
if (
  createHash("sha256").update(raw).digest("hex") !==
  checks["ne-countries.geojson"].sha256
)
  throw Error("Natural Earth source checksum mismatch");
const mappingRaw = await fs.readFile("sources/catalog-mapping.json");
const mapping = JSON.parse(mappingRaw).world;
const regions = JSON.parse(raw).features.map((f) => {
  const geometry = sphericalGeometry(f.geometry);
  return {
    id: mapping[f.properties.NE_ID].id,
    geometry,
    bounds: geoBounds(geometry),
  };
});
const ids = new Set(regions.map((r) => r.id));
// This is a source-code crosswalk, not a change to map identity or quiz eligibility.
const sourceId = (iso) => (iso === "XKX" ? "wurl:NE-KOS" : `wurl:${iso}`);
const bounded = (r, lng, lat) => {
  const [[west, south], [east, north]] = r.bounds;
  return (
    lat >= south &&
    lat <= north &&
    (west <= east ? lng >= west && lng <= east : lng >= west || lng <= east)
  );
};
const links = {},
  roles = {};
const assigned = new Map();
function parent(row) {
  if (assigned.has(row[0])) return assigned.get(row[0]);
  const lng = Number(row[5]),
    lat = Number(row[4]);
  const direct = sourceId(countryInfo[row[8]]?.[1]);
  const containing = regions.find(
    (r) => bounded(r, lng, lat) && geoContains(r.geometry, [lng, lat]),
  );
  // Coastal points can lie just outside generalized land. Retain a valid source
  // relationship in that case; never invent a parent for an unmatched point.
  // Retain reviewed/source capital relationships at generalized border points.
  // Other cities follow the map unit containing their pinned coordinate.
  const result =
    roles[row[0]]?.find((id) => ids.has(id)) ??
    containing?.id ??
    (ids.has(direct) ? direct : undefined);
  assigned.set(row[0], result);
  return result;
}
const populated = rows.filter((r) =>
  ["PPL", "PPLC", "PPLA", "PPLA2", "PPLA3", "PPLA4"].includes(r[7]),
);
const populatedSet = new Set(populated);
const byId = new Map(rows.map((r) => [r[0], r]));
function capitalLink(countryId, row) {
  links[countryId] = `place:${row[0]}`;
  (roles[row[0]] ??= []).push(countryId);
}
for (const capital of capitals) {
  const row = byId.get(capital.id.slice(6));
  if (row) capitalLink(capital.countryId, row);
}
const fold = (value) =>
  value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]/gu, "");
for (const [code, info] of Object.entries(countryInfo)) {
  const countryId = sourceId(info[1]);
  if (!ids.has(countryId) || links[countryId] || !info[5]) continue;
  const name = fold(info[5]);
  const matches = rows.filter(
    (r) =>
      (populatedSet.has(r) || r[7] === "PPLX") &&
      r[8] === code &&
      [r[1], r[2], ...r[3].split(",")].some((n) => fold(n) === name),
  );
  // Accept only an unambiguous named populated place, never a guessed centroid.
  if (matches.length === 1) capitalLink(countryId, matches[0]);
}
const candidates = populated.filter((r) => Number(r[14]) >= 15000 && parent(r));
const largest = new Map();
for (const row of candidates) {
  if (roles[row[0]]) continue;
  const id = parent(row),
    previous = largest.get(id);
  if (!previous || Number(row[14]) > Number(previous[14])) largest.set(id, row);
}
const kept = new Map();
for (const row of candidates)
  if (Number(row[14]) >= 250000 || largest.get(parent(row)) === row)
    kept.set(row[0], row);
for (const id of Object.keys(roles)) {
  const row = byId.get(id);
  if (row && parent(row)) kept.set(id, row);
}
const cities = [...kept.values()]
  .sort((a, b) => Number(a[0]) - Number(b[0]))
  .map((row) => [
    row[0],
    row[1].normalize("NFC"),
    parent(row),
    Number(row[4]),
    Number(row[5]),
    Number(row[14]),
    row[8],
    roles[row[0]] ?? [],
    countryInfo[row[8]]?.[4] ?? row[8],
    sourceId(countryInfo[row[8]]?.[1]),
    row[7],
  ]);
process.stdout.write(
  JSON.stringify({
    cities,
    capitalLinks: links,
    inputs: [
      {
        path: "sources/ne-countries.geojson",
        sha256: createHash("sha256").update(raw).digest("hex"),
      },
      {
        path: "sources/catalog-mapping.json",
        sha256: createHash("sha256").update(mappingRaw).digest("hex"),
      },
    ],
    policy:
      "Explore populated places across the full map catalog: source capitals (including a named city district when explicitly listed), places with population at least 250,000, and the largest other place per map unit when at least 15,000. Source capital relationships take precedence at generalized border points; other parent map units use pinned Natural Earth containment, with source-country fallback for coastal points outside generalized land. GeoNames country codes and source capital roles remain separate; these conventions do not determine sovereignty or quiz eligibility.",
  }),
);
