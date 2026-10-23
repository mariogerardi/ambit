import fs from "node:fs/promises";
import mapshaper from "mapshaper";

// Natural Earth 1:10m lakes, pinned to the same v5.1.2 release as the world map.
// Source: https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_lakes.geojson
// Public domain. The checked-in subset keeps preparation entirely offline.
export async function applyGreatLakesDisplay(world) {
  const targets = world.filter((r) => ["wurl:USA", "wurl:CAN"].includes(r.id));
  const countries = JSON.stringify({
    type: "FeatureCollection",
    features: targets.map((r) => ({
      type: "Feature",
      properties: { id: r.id },
      geometry: r.displayGeometry ?? r.geometry,
    })),
  });
  const lakes = await fs.readFile(
    new URL("./great-lakes.geojson", import.meta.url),
    "utf8",
  );
  const output = await mapshaper.applyCommands(
    "-i countries.geojson -erase lakes.geojson -clean gap-fill-area=0 -o land.geojson format=geojson geojson-type=FeatureCollection",
    { "countries.geojson": countries, "lakes.geojson": lakes },
  );
  const geometries = new Map(
    JSON.parse(output["land.geojson"]).features.map((f) => [
      f.properties.id,
      f.geometry,
    ]),
  );
  return world.map((r) =>
    geometries.has(r.id) ? { ...r, displayGeometry: geometries.get(r.id) } : r,
  );
}
