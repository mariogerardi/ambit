import { readFile, writeFile } from "node:fs/promises";

// Offline, reviewed snapshots. Retain source vertices; never invent connections.
const source = JSON.parse(
  await readFile("public/geography/danube-route-source.v1.geojson", "utf8"),
);
const naturalEarth = JSON.parse(
  await readFile("public/geography/physical.v1.json", "utf8"),
);
const main = source.features.find((f) => f.properties.role === "main_stream")
  .geometry.coordinates;
const junctions = new Set(
  source.features
    .slice(1)
    .map((f) => JSON.stringify(f.geometry.coordinates[0])),
);
function simplify(path) {
  if (path.length <= 2) return path;
  const [a, b] = [path[0], path.at(-1)];
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    length = dx * dx + dy * dy;
  let farthest = -1,
    distance = 0.0005 ** 2;
  for (let i = 1; i < path.length - 1; i++) {
    // Preserve exact junctions as well as the ends of every authored stage.
    if (junctions.has(JSON.stringify(path[i]))) {
      farthest = i;
      break;
    }
    const t = length
      ? Math.max(
          0,
          Math.min(
            1,
            ((path[i][0] - a[0]) * dx + (path[i][1] - a[1]) * dy) / length,
          ),
        )
      : 0;
    const d =
      (path[i][0] - a[0] - t * dx) ** 2 + (path[i][1] - a[1] - t * dy) ** 2;
    if (d > distance) {
      distance = d;
      farthest = i;
    }
  }
  return farthest < 0
    ? [a, b]
    : [
        ...simplify(path.slice(0, farthest + 1)).slice(0, -1),
        ...simplify(path.slice(farthest)),
      ];
}
const stops = {
  upper: [11.9, 48.9],
  vienna: [16.45, 48.2],
  budapest: [19.07, 47.47],
  gorge: [22.62, 44.62],
  lower: [27.5, 45.3],
  delta: main.at(-1),
};
const segments = {},
  routeEnds = {};
let start = 0;
for (const [key, target] of Object.entries(stops)) {
  const end =
    key === "delta"
      ? main.length - 1
      : main.reduce(
          (best, p, i) =>
            i >= start &&
            (p[0] - target[0]) ** 2 + (p[1] - target[1]) ** 2 <
              (main[best][0] - target[0]) ** 2 +
                (main[best][1] - target[1]) ** 2
              ? i
              : best,
          start,
        );
  if (end <= start) throw Error(`Invalid downstream stage ${key}`);
  const path = simplify(main.slice(start, end + 1)),
    [lng, lat] = path[Math.floor(path.length / 2)];
  segments[key] = [
    {
      id: `journey:danube:${key}`,
      kind: "river",
      name: "Danube",
      lat,
      lng,
      rank: 2,
      paths: [path],
      labelAnchors: [],
    },
  ];
  routeEnds[key] = { lng: main[end][0], lat: main[end][1] };
  start = end;
}
segments.branches = source.features.slice(1).map((f, i) => {
  const path = simplify(f.geometry.coordinates),
    [lng, lat] = path[Math.floor(path.length / 2)];
  return {
    id: `journey:danube:branch-${i}`,
    kind: "river",
    name: f.properties.name,
    lat,
    lng,
    rank: 2,
    paths: [path],
    labelAnchors: [],
  };
});
const paths = [];
for (const f of naturalEarth.features.filter((f) =>
  ["Rhine", "Rhein"].includes(f.name),
))
  for (const path of f.paths ?? []) {
    let run = [];
    const finish = () => {
      if (run.length > 1) paths.push(run);
      run = [];
    };
    for (const point of path) {
      const [lng, lat] = point;
      if (lng >= 7.5 && lng <= 9.6 && lat >= 47.5 && lat <= 48.3)
        run.push(point);
      else finish();
    }
    finish();
  }
if (!paths.length) throw Error("Missing reviewed Rhine context");
segments.rhine = [
  {
    id: "journey:danube:rhine",
    kind: "river",
    name: "Rhine",
    lat: 47.7,
    lng: 8.5,
    rank: 2,
    paths,
  },
];
const sea = naturalEarth.features.find(
  (f) => f.kind === "ocean" && f.name === "Black Sea",
);
if (!sea) throw Error("Missing Black Sea label");
segments.sea = [sea];
const data =
  JSON.stringify({
    attribution: source.attribution,
    license: source.license,
    licenseUrl: source.licenseUrl,
    sourceUrl: source.sourceUrl,
    relationVersion: source.relationVersion,
    naturalEarthRevision: naturalEarth.revision,
    note: "Connected OSM main stream and delta branches, simplified with retained vertices and preserved junctions/mouths. Staged ends mark itinerary progress, not river termini. Rhine/sea context: Natural Earth, public domain.",
    routeEnds,
    segments,
  }) + "\n";
await writeFile("src/game/data/danube-context.v1.json", data);
await writeFile("public/geography/danube-context.v1.json", data);
console.log(
  `Prepared continuous Danube route and connected delta branches (${data.length} bytes).`,
);
