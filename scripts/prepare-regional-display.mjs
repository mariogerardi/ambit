import fs from "node:fs/promises";
import { prepareEnclosedTerritories } from "./enclosed-territories.mjs";
import { prepareNameOrigins } from "./name-origins.mjs";
import { createHash } from "node:crypto";
import { reconcileRegionalDisplay } from "./regional-display.mjs";
import { validateGeometry } from "./geometry.mjs";
import { applyGreatLakesDisplay } from "./lake-display.mjs";
import {
  prepareWorldDisplay,
  WORLD_DISPLAY_PERCENT,
} from "./world-display.mjs";

// Entirely offline. Parents are processed before descendants, including counties.
export async function prepareRegionalDisplay(greatLakesOnly = false) {
  const manifest = JSON.parse(
    await fs.readFile("public/geography/manifest.json", "utf8"),
  );
  const world = await applyGreatLakesDisplay(
    await prepareWorldDisplay(
      JSON.parse(await fs.readFile("public/geography/world.v1.json", "utf8")),
    ),
  );
  const parents = new Map(world.map((r) => [r.id, r]));
  let count = 0;
  const worldBytes = Buffer.from(JSON.stringify(world));
  const worldLayer = manifest.find((l) => l.level === "ADM0");
  worldLayer.bytes = worldBytes.length;
  worldLayer.sha256 = createHash("sha256").update(worldBytes).digest("hex");
  worldLayer.displayWaterSource = "Natural Earth v5.1.2 / 1:10m Great Lakes";
  worldLayer.displaySimplification = {
    method: "weighted",
    retainedPercent: WORLD_DISPLAY_PERCENT,
    keepShapes: true,
  };
  const pending = [["public/geography/world.v1.json", worldBytes]];
  const affected = new Set(["wurl:USA", "wurl:CAN"]);
  for (const layer of manifest
    .filter((l) => l.level !== "ADM0")
    .sort((a, b) => a.level.localeCompare(b.level))) {
    const parent = parents.get(layer.parentId);
    if (!parent) throw Error(`Missing display parent: ${layer.parentId}`);
    const path = `public${layer.assetUrl}`;
    const canonical = JSON.parse(await fs.readFile(path, "utf8"));
    if (greatLakesOnly && !affected.has(layer.parentId)) {
      for (const r of canonical) parents.set(r.id, r);
      continue;
    }
    const regions = await reconcileRegionalDisplay(parent, canonical);
    for (const r of regions) {
      if (r.displayGeometry) validateGeometry(r.displayGeometry);
      parents.set(r.id, r);
      affected.add(r.id);
    }
    const bytes = Buffer.from(JSON.stringify(regions));
    pending.push([path, bytes]);
    layer.bytes = bytes.length;
    layer.sha256 = createHash("sha256").update(bytes).digest("hex");
    layer.displayGeometryVersion = 2;
    count += regions.length;
  }
  // Failed geometry proofs leave the current working assets intact.
  for (const [path, bytes] of pending) await fs.writeFile(path, bytes);
  await fs.writeFile(
    "public/geography/manifest.json",
    JSON.stringify(manifest, null, 2) + "\n",
  );
  await prepareEnclosedTerritories();
  await prepareNameOrigins();
  console.log(
    `Prepared reconciled display partitions for ${count} subdivisions.`,
  );
}

await prepareRegionalDisplay(process.argv.includes("--great-lakes-only"));
