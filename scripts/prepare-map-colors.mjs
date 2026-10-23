import fs from "node:fs/promises";

const world = JSON.parse(
  await fs.readFile("public/geography/world.v1.json", "utf8"),
);
const neighbors = new Map(world.map((r) => [r.id, new Set()]));
const edges = new Map();
for (const region of world) {
  const polygons =
    region.geometry.type === "Polygon"
      ? [region.geometry.coordinates]
      : region.geometry.coordinates;
  for (const polygon of polygons)
    for (const ring of polygon)
      for (let i = 1; i < ring.length; i++) {
        const a = ring[i - 1].join(","),
          b = ring[i].join(",");
        if (a === b) continue;
        const key = [a, b].sort().join("|");
        const owners = edges.get(key) ?? [];
        for (const owner of owners)
          if (owner !== region.id) {
            neighbors.get(owner).add(region.id);
            neighbors.get(region.id).add(owner);
          }
        owners.push(region.id);
        edges.set(key, owners);
      }
}
const colors = {},
  usage = Array(6).fill(0);
const remaining = new Set([...neighbors.keys()].sort());
const saturation = (id) =>
  new Set(
    [...neighbors.get(id)].map((n) => colors[n]).filter((c) => c !== undefined),
  ).size;
while (remaining.size) {
  const id = [...remaining].sort(
    (a, b) =>
      saturation(b) - saturation(a) ||
      neighbors.get(b).size - neighbors.get(a).size ||
      a.localeCompare(b),
  )[0];
  const used = new Set([...neighbors.get(id)].map((n) => colors[n]));
  const color = usage
    .map((count, index) => ({ count, index }))
    .filter((c) => !used.has(c.index))
    .sort((a, b) => a.count - b.count || a.index - b.index)[0]?.index;
  if (color === undefined) throw Error(`No distinct map color for ${id}`);
  colors[id] = color;
  usage[color]++;
  remaining.delete(id);
}
await fs.writeFile(
  "src/geography/data/map-colors.v1.json",
  JSON.stringify({
    version: 1,
    colors: Object.fromEntries(Object.entries(colors).sort()),
  }),
);
console.log(
  `Colored ${world.length} map units without shared-border conflicts.`,
);
