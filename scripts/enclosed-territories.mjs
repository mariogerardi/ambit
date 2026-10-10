import fs from "node:fs/promises";

/** Keep the small gameplay snapshot synchronized after regional preparation. */
export async function prepareEnclosedTerritories() {
  const sources = [
    ["rus", ["wurl:RUS-LEN", "wurl:RUS-SPE", "wurl:RUS-KGD"]],
    ["brn", ["wurl:BRN-TE"]],
    ["aus", ["wurl:AUS-ACT", "wurl:AUS-NSW"]],
  ];
  const subset = [];
  for (const [country, ids] of sources) {
    const rows = JSON.parse(
      await fs.readFile(`public/geography/${country}-adm1.v1.json`, "utf8"),
    );
    const matches = rows.filter((r) => ids.includes(r.id));
    if (matches.length !== ids.length)
      throw Error(`Missing enclosed-territory geometry: ${country}`);
    subset.push(...matches);
  }
  await fs.writeFile(
    "src/game/data/enclosed-territories.v1.json",
    JSON.stringify(subset) + "\n",
  );
}
