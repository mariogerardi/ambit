import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import mapshaper from "mapshaper";
import { center, contains, validateGeometry } from "./geometry.mjs";
const generatedAt = "2026-10-04T00:00:00Z"; // Snapshot identity, deterministic output.
const snapshots = {
  "ne-countries.geojson":
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_countries.geojson",
  "usa-adm1.geojson":
    "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/USA/ADM1/geoBoundaries-USA-ADM1.geojson",
  "usa-adm2.geojson":
    "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/USA/ADM2/geoBoundaries-USA-ADM2.geojson",
};
await fs.mkdir("sources", { recursive: true });
await fs.mkdir("public/geography", { recursive: true });
const sourceHashes = {};
const oldHashes = JSON.parse(
  await fs.readFile("sources/checksums.json", "utf8").catch(() => "{}"),
);
async function source(file) {
  let raw = await fs.readFile(`sources/${file}`).catch(() => null);
  if (!raw || process.argv.includes("--download")) {
    const res = await fetch(snapshots[file]);
    if (!res.ok)
      throw Error(`Download failed: ${res.status} ${snapshots[file]}`);
    raw = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(`sources/${file}`, raw);
  }
  const hash = createHash("sha256").update(raw).digest("hex");
  if (oldHashes[file] && oldHashes[file].sha256 !== hash)
    throw Error(`Source checksum mismatch: ${file}`);
  sourceHashes[file] = {
    sha256: hash,
    url: snapshots[file],
    bytes: raw.length,
  };
  return JSON.parse(raw);
}
async function simplify(json, percent) {
  const result = await mapshaper.applyCommands(
    `-i input.geojson -simplify weighted ${percent}% keep-shapes -o output.geojson format=geojson precision=0.00001`,
    { "input.geojson": JSON.stringify(json) },
  );
  return JSON.parse(result["output.geojson"]);
}
const worldRaw = await source("ne-countries.geojson");
const statesRaw = await source("usa-adm1.geojson");
const countiesRaw = await source("usa-adm2.geojson");
// Explicit lab catalog: all 242 source map units are inspectable. No playable-country
// eligibility is implied. Non-ISO units use their pinned Natural Earth ADM0 code.
const mappingFile = "sources/catalog-mapping.json";
let mapping = JSON.parse(
  await fs.readFile(mappingFile, "utf8").catch(() => "null"),
);
if (!mapping) {
  const ny = statesRaw.features.find((f) => f.properties.shapeISO === "US-NY");
  const countyNames =
    "Albany|Allegany|Bronx|Broome|Cattaraugus|Cayuga|Chautauqua|Chemung|Chenango|Clinton|Columbia|Cortland|Delaware|Dutchess|Erie|Essex|Franklin|Fulton|Genesee|Greene|Hamilton|Herkimer|Jefferson|Kings|Lewis|Livingston|Madison|Monroe|Montgomery|Nassau|New York|Niagara|Oneida|Onondaga|Ontario|Orange|Orleans|Oswego|Otsego|Putnam|Queens|Rensselaer|Richmond|Rockland|St. Lawrence|Saratoga|Schenectady|Schoharie|Schuyler|Seneca|Steuben|Suffolk|Sullivan|Tioga|Tompkins|Ulster|Warren|Washington|Wayne|Westchester|Wyoming|Yates".split(
      "|",
    );
  const nyCounties = countiesRaw.features.filter((f) =>
    contains(ny.geometry, center(f.geometry)),
  );
  if (nyCounties.length !== 62)
    throw Error(`Expected 62 NY counties, got ${nyCounties.length}`);
  mapping = { world: {}, states: {}, counties: {} };
  for (const f of worldRaw.features) {
    const p = f.properties;
    const iso = /^[A-Z]{3}$/.test(p.ISO_A3_EH) ? p.ISO_A3_EH : null;
    mapping.world[p.NE_ID] = {
      id: `wurl:${iso && (worldRaw.features.filter((x) => x.properties.ISO_A3_EH === iso).length === 1 || p.ADM0_A3 === iso) ? iso : "NE-" + p.ADM0_A3}`,
      name: p.ADMIN === "United States of America" ? "United States" : p.ADMIN,
      iso,
      sourceCode: p.ADM0_A3,
      sourceType: p.TYPE,
      sovereign: p.SOVEREIGNT,
      boundaryNote: p.NOTE_BRK || p.NOTE_ADM0 || null,
    };
  }
  for (const f of statesRaw.features) {
    const p = f.properties;
    // These source IDs remain mapped independently of future catalog naming.
    mapping.states[p.shapeID] = {
      id: `wurl:USA-${p.shapeISO.slice(3) || "GB-" + p.shapeID}`,
      name: p.shapeName,
      parentId: "wurl:USA",
      iso: p.shapeISO,
    };
  }
  for (const f of nyCounties) {
    const index = countyNames.indexOf(f.properties.shapeName);
    if (index < 0) throw Error(`Unmapped county: ${f.properties.shapeName}`);
    const fips = "36" + String(index * 2 + 1).padStart(3, "0");
    mapping.counties[f.properties.shapeID] = {
      id: `wurl:USA-NY-${fips}`,
      name: `${f.properties.shapeName} County`,
      parentId: "wurl:USA-NY",
      fips,
    };
  }
  await fs.writeFile(mappingFile, JSON.stringify(mapping, null, 2) + "\n");
}
const focusOverrides = {
  "wurl:USA": { lat: 38, lng: -98, altitude: 0.95 },
  "wurl:ETH": { lat: 9, lng: 40, altitude: 0.62 },
  "wurl:BRA": { lat: -12, lng: -52, altitude: 0.95 },
  "wurl:USA-NY": { lat: 43, lng: -75.5, altitude: 0.14 },
  "wurl:USA-NY-36081": { lat: 40.72, lng: -73.81, altitude: 0.018 },
};
function fittedFocus(geometry, desired) {
  const rings =
    geometry.type === "Polygon"
      ? geometry.coordinates
      : geometry.coordinates.flat();
  const rad = Math.PI / 180;
  const angles = rings
    .flat()
    .map(([lng, lat]) =>
      Math.acos(
        Math.max(
          -1,
          Math.min(
            1,
            Math.sin(lat * rad) * Math.sin(desired.lat * rad) +
              Math.cos(lat * rad) *
                Math.cos(desired.lat * rad) *
                Math.cos((lng - desired.lng) * rad),
          ),
        ),
      ),
    );
  const theta = Math.max(...angles);
  const altitude =
    theta > Math.PI / 2
      ? 2.5
      : Math.cos(theta) + Math.sin(theta) / (Math.tan(25 * rad) * 0.72) - 1;
  return {
    ...desired,
    altitude: +Math.max(desired.altitude ?? 0.035, altitude).toFixed(4),
  };
}
function convert(f, table, sourceId, level) {
  const entry = table[sourceId];
  if (!entry) throw Error(`Unknown source ID: ${sourceId}`);
  const [lng, lat] = center(f.geometry);
  validateGeometry(f.geometry);
  return {
    id: entry.id,
    name: entry.name,
    level,
    ...(entry.parentId ? { parentId: entry.parentId } : {}),
    localType:
      level === "ADM0"
        ? "map unit"
        : level === "ADM1"
          ? "state / territory"
          : "county",
    sourceId: String(sourceId),
    focus: fittedFocus(
      f.geometry,
      focusOverrides[entry.id] || {
        lat: +lat.toFixed(5),
        lng: +lng.toFixed(5),
      },
    ),
    geometry: f.geometry,
  };
}
// Preserve existing answer geometry; regional preparation supplies 75% display outlines.
const world = (await simplify(worldRaw, 16)).features.map((f) =>
  convert(f, mapping.world, f.properties.NE_ID, "ADM0"),
);
const states = (await simplify(statesRaw, 5)).features.map((f) =>
  convert(f, mapping.states, f.properties.shapeID, "ADM1"),
);
const nyRaw = {
  type: "FeatureCollection",
  features: countiesRaw.features.filter(
    (f) => mapping.counties[f.properties.shapeID],
  ),
};
const counties = (await simplify(nyRaw, 60)).features.map((f) =>
  convert(f, mapping.counties, f.properties.shapeID, "ADM2"),
);
const all = [...world, ...states, ...counties];
if (
  world.length !== 242 ||
  states.length !== 56 ||
  counties.length !== 62 ||
  new Set(all.map((f) => f.id)).size !== all.length
)
  throw Error("Catalog count/ID validation failed");
if (
  counties.find((f) => f.name === "Queens County")?.id !== "wurl:USA-NY-36081"
)
  throw Error("Queens ID mismatch");
const reports = [];
async function asset(filename, data) {
  const content = JSON.stringify(data);
  await fs.writeFile(`public/geography/${filename}`, content + "\n");
  const report = {
    filename,
    features: data.length,
    bytes: Buffer.byteLength(content) + 1,
    sha256: createHash("sha256")
      .update(content + "\n")
      .digest("hex"),
  };
  reports.push(report);
  return report;
}
const files = ["world.v1.json", "usa-adm1.v1.json", "ny-adm2.v1.json"];
await asset(files[0], world);
await asset(files[1], states);
await asset(files[2], counties);
const provenance = (
  key,
  level,
  parentId,
  file,
  source,
  version,
  attribution,
  url,
) => ({
  key,
  level,
  ...(parentId ? { parentId } : {}),
  assetUrl: `/geography/${file}`,
  source,
  sourceVersion: version,
  license:
    source === "Natural Earth"
      ? "Public Domain"
      : "CC BY 4.0 (geoBoundaries); Public Domain (Census source)",
  attribution,
  sourceUrl: url,
  generatedAt,
  ...reports.find((r) => r.filename === file),
});
const manifest = [
  provenance(
    "WORLD/ADM0",
    "ADM0",
    null,
    files[0],
    "Natural Earth",
    "5.1.2 / 1:50m",
    "Made with Natural Earth",
    snapshots["ne-countries.geojson"],
  ),
  provenance(
    "USA/ADM1",
    "ADM1",
    "wurl:USA",
    files[1],
    "geoBoundaries gbOpen / U.S. Census Bureau",
    "9469f09 / USA-ADM1-66186276 / 2018",
    "geoBoundaries (William & Mary GeoLab); U.S. Census Bureau",
    snapshots["usa-adm1.geojson"],
  ),
  provenance(
    "USA-NY/ADM2",
    "ADM2",
    "wurl:USA-NY",
    files[2],
    "geoBoundaries gbOpen / U.S. Census Bureau",
    "9469f09 / USA-ADM2-52423323 / 2018",
    "geoBoundaries (William & Mary GeoLab); U.S. Census Bureau",
    snapshots["usa-adm2.geojson"],
  ),
];
await fs.writeFile(
  "public/geography/manifest.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
await fs.writeFile(
  "public/geography/places.v1.json",
  JSON.stringify([
    {
      id: "wurl:place:NYC",
      name: "New York City",
      kind: "city",
      parentId: "wurl:USA-NY",
      lat: 40.7128,
      lng: -74.006,
      sourceId: "curated:NYC",
    },
  ]) + "\n",
);
await fs.writeFile(
  "sources/checksums.json",
  JSON.stringify(sourceHashes, null, 2) + "\n",
);
await fs.writeFile(
  "sources/validation.json",
  JSON.stringify(
    {
      generatedAt,
      counts: {
        ADM0: world.length,
        ADM1: states.length,
        NY_ADM2: counties.length,
      },
      antimeridianCrossings: world.reduce(
        (n, f) => n + validateGeometry(f.geometry),
        0,
      ),
      assets: reports,
    },
    null,
    2,
  ) + "\n",
);
// Refresh display footprints after changing the world or detailed US branches.
await import("./prepare-regional-display.mjs");
console.log(reports);

const textureFile = "public/textures/earth-day.jpg";
const textureSource =
  "https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg";
const textureMetadataFile = "sources/texture.metadata.json";
const previousTexture = JSON.parse(
  await fs.readFile(textureMetadataFile, "utf8").catch(() => "null"),
);
let texture = await fs.readFile(textureFile).catch(() => null);
if (!texture) {
  await fs.mkdir("public/textures", { recursive: true });
  const response = await fetch(textureSource);
  if (!response.ok) throw Error("Texture download failed");
  texture = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(textureFile, texture);
}
const textureHash = createHash("sha256").update(texture).digest("hex");
if (previousTexture && previousTexture.sha256 !== textureHash)
  throw Error("Texture snapshot checksum mismatch");
await fs.writeFile(
  textureMetadataFile,
  JSON.stringify(
    {
      url: textureSource,
      source: "Solar System Scope / INOVE",
      sourceVersion: "2k Earth Day Map; snapshot 2026-10-04",
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      attribution:
        "Earth texture by Solar System Scope / INOVE, based on NASA imagery",
      transformations: "None",
      sha256: textureHash,
      bytes: texture.length,
    },
    null,
    2,
  ) + "\n",
);

// Stable base colors follow the shipped world topology.
await import("./prepare-map-colors.mjs");
