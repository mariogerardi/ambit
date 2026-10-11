import { readFile, writeFile } from "node:fs/promises";

// Reuse the reviewed Natural Earth snapshot; never draw invented river connections.
const source = JSON.parse(
  await readFile("public/geography/physical.v1.json", "utf8"),
);
const specs = {
  upper: { name: "Danube", bounds: [8, 12, 47.7, 49] },
  vienna: { name: "Danube", bounds: [15.8, 17.2, 47.9, 48.6] },
  budapest: { name: "Danube", bounds: [18.85, 19.2, 47.3, 47.75] },
  gorge: { name: "Danube", bounds: [21.6, 22.6, 44.5, 44.85] },
  delta: { name: "Danube", bounds: [27.5, 30, 44.8, 45.6] },
  rhine: { name: "Rhine", bounds: [7.5, 9.6, 47.5, 48.3] },
};
const segments = {};
for (const [
  key,
  {
    name,
    bounds: [west, east, south, north],
  },
] of Object.entries(specs)) {
  const paths = [];
  for (const feature of source.features.filter(
    (f) => f.name === name || (name === "Rhine" && f.name === "Rhein"),
  )) {
    for (const path of feature.paths ?? []) {
      let run = [];
      const finish = () => {
        if (run.length > 1) paths.push(run);
        run = [];
      };
      for (const point of path) {
        const [lng, lat] = point;
        if (lng >= west && lng <= east && lat >= south && lat <= north)
          run.push(point);
        else finish();
      }
      finish();
    }
  }
  if (!paths.length) throw Error(`No sourced river geometry for ${key}`);
  const main = [...paths].sort((a, b) => b.length - a.length)[0];
  const [lng, lat] = main[Math.floor(main.length / 2)];
  segments[key] = [
    {
      id: `journey:danube:${key}`,
      kind: "river",
      name,
      lat,
      lng,
      rank: 2,
      paths,
    },
  ];
}
const sea = source.features.find(
  (f) => f.kind === "ocean" && f.name === "Black Sea",
);
if (!sea) throw Error("Missing Black Sea label");
segments.sea = [sea];
await writeFile(
  "src/game/data/danube-context.v1.json",
  JSON.stringify({
    source: source.source,
    sourceRevision: source.revision,
    note: "Generalized Natural Earth river centerlines clipped to each stop; not navigation or underground cave routes.",
    segments,
  }) + "\n",
);
console.log(
  `Prepared ${Object.keys(segments).length} local Danube context layers.`,
);
