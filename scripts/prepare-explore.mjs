import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import mapshaper from "mapshaper";
import { geoDistance, geoBounds, geoContains } from "d3-geo";
import { sphericalGeometry } from "../src/geography/sphericalGeometry.mjs";
import { geometryFingerprint } from "../src/geography/regionIdentity.mjs";
import { center, validateGeometry } from "./geometry.mjs";
const stamp = "2026-10-05T00:00:00Z";
const sources = {
  "can-simple":
    "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/CAN/ADM1/geoBoundaries-CAN-ADM1_simplified.geojson",
  rivers50:
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_rivers_lake_centerlines.geojson",
  rivers10:
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_rivers_lake_centerlines.geojson",
  ranges10:
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_geography_regions_polys.geojson",
  "mex-simple":
    "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/MEX/ADM1/geoBoundaries-MEX-ADM1_simplified.geojson",
  "aus-simple":
    "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/AUS/ADM1/geoBoundaries-AUS-ADM1_simplified.geojson",
  "global-adm1":
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_1_states_provinces.geojson",
  ranges:
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_geography_regions_polys.geojson",
  oceans:
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_geography_marine_polys.geojson",
};
await fs.mkdir(".cache/explore", { recursive: true });
const checks = JSON.parse(
  await fs.readFile("sources/explore-checksums.json", "utf8").catch(() => "{}"),
);
async function source(name) {
  const path = `.cache/explore/${name}.geojson`;
  let raw = await fs.readFile(path).catch(() => null);
  if (!raw) {
    const res = await fetch(sources[name]);
    if (!res.ok) throw Error(`Download failed ${name}`);
    raw = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(path, raw);
  }
  const sha256 = createHash("sha256").update(raw).digest("hex");
  if (checks[name] && checks[name].sha256 !== sha256)
    throw Error(`Checksum mismatch ${name}`);
  checks[name] = { url: sources[name], sha256, bytes: raw.length };
  return JSON.parse(raw);
}
const raw = await source("can-simple");
const simplified = await mapshaper.applyCommands(
  "-i input.geojson -simplify weighted 2% keep-shapes -o output.geojson format=geojson precision=0.00001",
  { "input.geojson": JSON.stringify(raw) },
);
const canada = JSON.parse(simplified["output.geojson"]).features.map((f) => {
  validateGeometry(f.geometry);
  const [lng, lat] = center(f.geometry);
  const vertices = (
    f.geometry.type === "Polygon"
      ? f.geometry.coordinates
      : f.geometry.coordinates.flat()
  ).flat();
  const theta = Math.max(...vertices.map((p) => geoDistance([lng, lat], p)));
  const altitude = Math.max(
    0.04,
    Math.cos(theta) +
      Math.sin(theta) / (Math.tan((25 * Math.PI) / 180) * 0.72) -
      1,
  );
  return {
    id: `wurl:CAN-${f.properties.shapeISO.slice(3)}`,
    name: f.properties.shapeName,
    level: "ADM1",
    parentId: "wurl:CAN",
    localType: ["CA-NT", "CA-NU", "CA-YT"].includes(f.properties.shapeISO)
      ? "territory"
      : "province",
    geometry: f.geometry,
    focus: { lng, lat, altitude: +altitude.toFixed(4) },
    sourceId: f.properties.shapeID,
    attribution: "geoBoundaries (William & Mary GeoLab), CC BY 4.0",
    sourceUrl: sources["can-simple"],
  };
});
await fs.writeFile("public/geography/can-adm1.v1.json", JSON.stringify(canada));
const manifest = JSON.parse(
  await fs.readFile("public/geography/manifest.json", "utf8"),
).filter((l) => l.key !== "CAN/ADM1");
const bytes = await fs.readFile("public/geography/can-adm1.v1.json");
manifest.push({
  key: "CAN/ADM1",
  level: "ADM1",
  parentId: "wurl:CAN",
  assetUrl: "/geography/can-adm1.v1.json",
  source: "geoBoundaries gbOpen",
  sourceVersion: "9469f09",
  license: "CC BY 4.0",
  attribution: "geoBoundaries (William & Mary GeoLab)",
  sourceUrl: sources["can-simple"],
  generatedAt: stamp,
  features: 13,
  bytes: bytes.length,
  sha256: createHash("sha256").update(bytes).digest("hex"),
});
await fs.writeFile(
  "public/geography/manifest.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
for (const [country, count] of [
  ["MEX", 32],
  ["AUS", 9],
]) {
  const sourceKey = `${country.toLowerCase()}-simple`;
  const original = await source(sourceKey);
  const result = await mapshaper.applyCommands(
    "-i input.geojson -simplify weighted 5% keep-shapes -o output.geojson format=geojson precision=0.00001",
    { "input.geojson": JSON.stringify(original) },
  );
  const children = JSON.parse(result["output.geojson"]).features.map((f) => {
    validateGeometry(f.geometry);
    const [lng, lat] = center(f.geometry);
    const vertices = (
      f.geometry.type === "Polygon"
        ? f.geometry.coordinates
        : f.geometry.coordinates.flat()
    ).flat();
    const theta = Math.max(...vertices.map((p) => geoDistance([lng, lat], p)));
    const altitude = Math.max(
      0.04,
      Math.cos(theta) +
        Math.sin(theta) / (Math.tan((25 * Math.PI) / 180) * 0.72) -
        1,
    );
    const sourceName = f.properties.shapeName;
    const decodedName = /[ÃÂ]/.test(sourceName)
      ? Buffer.from(sourceName, "latin1").toString("utf8")
      : sourceName;
    const mexicoCity =
      country === "MEX" && /Distrito Federal/i.test(sourceName);
    const iso = mexicoCity ? "MX-CMX" : f.properties.shapeISO;
    return {
      id: `wurl:${country}-${iso?.slice(3) || "OT"}`,
      name: mexicoCity ? "Mexico City" : decodedName,
      level: "ADM1",
      parentId: `wurl:${country}`,
      ...(mexicoCity
        ? { aliases: ["Ciudad de México", "CDMX", "Distrito Federal"] }
        : {}),
      localType:
        country === "MEX"
          ? iso === "MX-CMX"
            ? "federal entity"
            : "state"
          : /Territor/i.test(decodedName)
            ? "territory"
            : "state",
      geometry: f.geometry,
      focus: { lat, lng, altitude: +altitude.toFixed(4) },
      sourceId: f.properties.shapeID,
      attribution: "geoBoundaries (William & Mary GeoLab), CC BY 4.0",
      sourceUrl: sources[sourceKey],
    };
  });
  if (children.length !== count)
    throw Error(`Unexpected ${country} subdivision count: ${children.length}`);
  if (new Set(children.map((r) => r.id)).size !== children.length)
    throw Error(`Duplicate ${country} subdivision identity`);
  const assetUrl = `/geography/${country.toLowerCase()}-adm1.v1.json`;
  const bytes = Buffer.from(JSON.stringify(children));
  await fs.writeFile(`public${assetUrl}`, bytes);
  const existing = manifest.findIndex((l) => l.key === `${country}/ADM1`);
  if (existing >= 0) manifest.splice(existing, 1);
  manifest.push({
    key: `${country}/ADM1`,
    level: "ADM1",
    parentId: `wurl:${country}`,
    assetUrl,
    source: "geoBoundaries gbOpen",
    sourceVersion: "9469f09",
    license: "CC BY 4.0",
    attribution: "geoBoundaries (William & Mary GeoLab)",
    sourceUrl: sources[sourceKey],
    generatedAt: stamp,
    features: children.length,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
await fs.writeFile(
  "public/geography/manifest.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
// Broad, offline ADM1 coverage, split into small on-demand country assets.
// Preserve the established, more detailed US/Canada/Mexico/Australia branches.
const globalRaw = await source("global-adm1");
const globalResult = await mapshaper.applyCommands(
  "-i input.geojson -simplify weighted 3% keep-shapes -o output.geojson format=geojson precision=0.00001",
  { "input.geojson": JSON.stringify(globalRaw) },
);
const worldIds = new Set(
  JSON.parse(await fs.readFile("public/geography/world.v1.json", "utf8")).map(
    (r) => r.id,
  ),
);
const globalLayers = new Map();
for (const f of JSON.parse(globalResult["output.geojson"]).features) {
  const p = f.properties,
    country = p.adm0_a3,
    parentId = `wurl:${country}`;
  if (!worldIds.has(parentId) || ["USA", "CAN", "MEX", "AUS"].includes(country))
    continue;
  validateGeometry(f.geometry);
  const [lng, lat] = center(f.geometry);
  const vertices = (
    f.geometry.type === "Polygon"
      ? f.geometry.coordinates
      : f.geometry.coordinates.flat()
  ).flat();
  const theta = Math.max(
    ...vertices.map((point) => geoDistance([lng, lat], point)),
  );
  const altitude = Math.max(
    0.04,
    Math.cos(theta) +
      Math.sin(theta) / (Math.tan((25 * Math.PI) / 180) * 0.72) -
      1,
  );
  const iso = p.iso_3166_2;
  const code =
    iso && iso !== "-99"
      ? iso.split("-").slice(1).join("-")
      : String(p.ne_id ?? p.adm1_code);
  const regions = globalLayers.get(country) ?? [];
  let id = `wurl:${country}-${code}`;
  if (regions.some((r) => r.id === id)) id = `${id}-${p.ne_id ?? p.adm1_code}`;
  regions.push({
    id,
    parentId,
    level: "ADM1",
    name: p.name_en || p.name || p.name_local || p.adm1_code,
    localType: (p.type_en || p.type || "subdivision").toLowerCase(),
    geometry: f.geometry,
    focus: { lng, lat, altitude: +altitude.toFixed(4) },
    sourceId: `naturalearth:${p.ne_id ?? p.adm1_code}`,
    attribution: "Natural Earth v5.1.2, public domain",
    sourceUrl: sources["global-adm1"],
  });
  globalLayers.set(country, regions);
}
for (const [country, children] of globalLayers) {
  const assetUrl = `/geography/${country.toLowerCase()}-adm1.v1.json`,
    key = `${country}/ADM1`;
  const bytes = Buffer.from(JSON.stringify(children));
  await fs.writeFile(`public${assetUrl}`, bytes);
  const old = manifest.findIndex((l) => l.key === key);
  if (old >= 0) manifest.splice(old, 1);
  manifest.push({
    key,
    level: "ADM1",
    parentId: `wurl:${country}`,
    assetUrl,
    source: "Natural Earth",
    sourceVersion: "5.1.2",
    license: "public domain",
    attribution: "Natural Earth",
    sourceUrl: sources["global-adm1"],
    generatedAt: stamp,
    features: children.length,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
await fs.writeFile(
  "public/geography/manifest.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
const regions = [];
for (const layer of manifest.filter((l) => l.level !== "ADM0")) {
  const path = layer.assetUrl.split("/").at(-1),
    key = layer.key;
  const excluded = [
    "wurl:USA-AS",
    "wurl:USA-GU",
    "wurl:USA-MP",
    "wurl:USA-PR",
    "wurl:USA-VI",
  ];
  for (const r of JSON.parse(
    await fs.readFile(`public/geography/${path}`, "utf8"),
  ).filter((r) => !excluded.includes(r.id)))
    regions.push({
      id: r.id,
      name: r.name,
      parentId: r.parentId,
      level: r.level,
      localType: r.localType,
      key,
      focus: r.focus,
      sourceId: r.sourceId,
      geometryFingerprint: geometryFingerprint(r.geometry),
    });
}
await fs.writeFile(
  "src/geography/data/regions.v1.json",
  JSON.stringify({ version: 1, regions }),
);
const physical = [];
for (const f of (await source("rivers10")).features) {
  const p = f.properties;
  const name = p.name_en || p.name;
  if (!name || (p.scalerank ?? 4) > 6) continue;
  const paths =
    f.geometry.type === "LineString"
      ? [f.geometry.coordinates]
      : f.geometry.type === "MultiLineString"
        ? f.geometry.coordinates
        : [];
  if (!paths.length) continue;
  const main = [...paths].sort((a, b) => b.length - a.length)[0],
    anchor = main[Math.floor(main.length / 2)];
  physical.push({
    id: `physical:river:${createHash("sha256")
      .update(JSON.stringify({ name, geometry: f.geometry }))
      .digest("hex")
      .slice(0, 16)}`,
    kind: "river",
    name,
    lat: anchor[1],
    lng: anchor[0],
    rank: p.scalerank ?? 4,
    paths: paths.map((path) =>
      path.map(([x, y]) => [+x.toFixed(4), +y.toFixed(4)]),
    ),
  });
}
for (const [file, kind] of [
  ["ranges10", "terrain"],
  ["oceans", "ocean"],
])
  for (const f of (await source(file)).features) {
    const p = f.properties,
      cla = p.FEATURECLA || p.featurecla;
    if (
      kind === "terrain" &&
      ![
        "Range/mtn",
        "Mountain range",
        "Range",
        "Desert",
        "Plateau",
        "Basin",
        "Plain",
      ].includes(cla)
    )
      continue;
    if (
      kind === "ocean" &&
      !["ocean", "sea", "gulf", "bay", "strait"].includes(cla)
    )
      continue;
    const [lng, lat] = center(f.geometry);
    const featureKind =
      kind === "terrain"
        ? ["Range/mtn", "Mountain range", "Range"].includes(cla)
          ? "mountain"
          : "landform"
        : kind;
    const labelAnchors = [[lng, lat]];
    if (kind === "terrain") {
      const geometry = sphericalGeometry(f.geometry);
      const [[west, south], [east, north]] = geoBounds(geometry);
      if (west <= east) {
        const step = Math.max(
          0.5,
          Math.min(2, Math.max(east - west, north - south) / 8),
        );
        for (let y = south + step / 2; y < north; y += step)
          for (let x = west + step / 2; x < east; x += step)
            if (geoContains(geometry, [x, y]))
              labelAnchors.push([+x.toFixed(4), +y.toFixed(4)]);
      }
    }
    if (labelAnchors.length > 49) {
      const spread = Array.from(
        { length: 48 },
        (_, i) =>
          labelAnchors[1 + Math.floor((i * (labelAnchors.length - 1)) / 48)],
      );
      labelAnchors.splice(1, labelAnchors.length - 1, ...spread);
    }
    physical.push({
      id: `physical:${kind}:${createHash("sha256")
        .update(
          JSON.stringify({
            name: p.NAME_EN || p.name_en || p.NAME || p.name,
            geometry: f.geometry,
          }),
        )
        .digest("hex")
        .slice(0, 16)}`,
      kind: featureKind,
      name: p.NAME_EN || p.name_en || p.NAME || p.name,
      lat,
      lng,
      rank: p.SCALERANK ?? p.scalerank ?? 2,
      ...(kind === "terrain" ? { labelAnchors } : {}),
    });
  }
if (new Set(physical.map((f) => f.id)).size !== physical.length)
  throw Error("Duplicate physical feature identities");
const revision = createHash("sha256")
  .update(JSON.stringify(physical))
  .digest("hex")
  .slice(0, 16);
await fs.writeFile(
  "src/geography/data/physical-metadata.v1.json",
  JSON.stringify({ version: 1, revision, features: physical.length }),
);
await fs.writeFile(
  "public/geography/physical.v1.json",
  JSON.stringify({
    version: 1,
    revision,
    source: "Natural Earth v5.1.2; public domain",
    features: physical,
  }),
);
const ne = JSON.parse(
  await fs.readFile("sources/ne-countries.geojson", "utf8"),
);
const roster = JSON.parse(
  await fs.readFile("src/game/data/un-members.v1.json", "utf8"),
).members;
const info = {};
for (const line of (
  await fs.readFile(".cache/quiz/countryInfo.txt", "utf8")
).split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const p = line.split("\t"),
    id = `wurl:${p[1]}`;
  if (!roster.some((c) => c.id === id)) continue;
  const n = ne.features.find(
    (f) => f.properties.ISO_A3_EH === p[1],
  )?.properties;
  info[id] = {
    areaKm2: Number(p[6]),
    population: Number(p[7]),
    continent: n?.CONTINENT ?? p[8],
    subregion: n?.SUBREGION ?? "",
    currencyCode: p[10],
    currencyName: p[11],
    callingCode: p[12],
    languages: p[15].split(",").filter(Boolean),
  };
}
const countryRaw = await fs.readFile(".cache/quiz/countryInfo.txt");
if (
  checks.countryInfo &&
  checks.countryInfo.sha256 !==
    createHash("sha256").update(countryRaw).digest("hex")
)
  throw Error("Country metadata checksum mismatch");
checks.countryInfo = {
  url: "https://download.geonames.org/export/dump/countryInfo.txt",
  sha256: createHash("sha256").update(countryRaw).digest("hex"),
  bytes: countryRaw.length,
};
await fs.writeFile(
  "src/geography/data/country-info.v1.json",
  JSON.stringify({
    version: 1,
    snapshot: stamp,
    source:
      "GeoNames CC BY 4.0 / Natural Earth public domain; population estimates are undated source estimates",
    countries: info,
  }),
);
await fs.writeFile(
  "sources/explore-checksums.json",
  JSON.stringify(checks, null, 2) + "\n",
);
console.log(
  `Prepared ${regions.length} subdivisions, ${physical.length} geographic features, ${Object.keys(info).length} country profiles; Canada ${bytes.length} bytes.`,
);
// Reconcile regenerated subdivisions with the unchanged world footprint.
await import("./prepare-regional-display.mjs");
await import("./prepare-language-names.mjs");
