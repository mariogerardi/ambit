import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import mapshaper from "mapshaper";

export const WORLD_DISPLAY_PERCENT = 75;

/** Denser cartography retains the existing canonical answer geometry and IDs. */
export async function prepareWorldDisplay(world) {
  const raw = await fs.readFile("sources/ne-countries.geojson");
  const checks = JSON.parse(
    await fs.readFile("sources/checksums.json", "utf8"),
  );
  if (
    createHash("sha256").update(raw).digest("hex") !==
    checks["ne-countries.geojson"].sha256
  )
    throw Error("World display source checksum mismatch");
  const output = await mapshaper.applyCommands(
    `-i input.geojson -simplify weighted ${WORLD_DISPLAY_PERCENT}% keep-shapes -o output.geojson format=geojson precision=0.00001`,
    { "input.geojson": raw.toString() },
  );
  const geometries = new Map(
    JSON.parse(output["output.geojson"]).features.map((f) => [
      String(f.properties.NE_ID),
      f.geometry,
    ]),
  );
  return world.map((region) => {
    const displayGeometry = geometries.get(region.sourceId);
    if (!displayGeometry)
      throw Error(`Missing world display geometry: ${region.id}`);
    return { ...region, displayGeometry };
  });
}
