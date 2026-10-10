import fs from "node:fs/promises";

/** Small, canonical regional subset for the name-origins daily puzzle. */
export async function prepareNameOrigins() {
  const subset = [];
  for (const [country, id] of [
    ["nld", "wurl:NLD-ZE"],
    ["mex", "wurl:MEX-NLE"],
    ["esp", "wurl:ESP-LE"],
  ]) {
    const regions = JSON.parse(
      await fs.readFile(`public/geography/${country}-adm1.v1.json`, "utf8"),
    );
    const region = regions.find((r) => r.id === id);
    if (!region) throw Error(`Missing name-origin geometry: ${id}`);
    subset.push(region);
  }
  await fs.writeFile(
    "src/game/data/name-origins.v1.json",
    JSON.stringify(subset) + "\n",
  );
}
