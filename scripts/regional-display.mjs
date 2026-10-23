import mapshaper from "mapshaper";
import { Delaunay } from "d3-delaunay";
import { geoDistance, geoInterpolate } from "d3-geo";
import { createHash } from "node:crypto";

const radians = Math.PI / 180;
const round = (n) => Math.round(n * 1e10) / 1e10;
const collection = (features) =>
  JSON.stringify({ type: "FeatureCollection", features });
const feature = (id, geometry) => ({
  type: "Feature",
  properties: { id },
  geometry,
});
const parts = (geometry) =>
  geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
const outputOptions = "format=geojson geojson-type=FeatureCollection";

// Topology is planar here. Spherical area would give nearly collinear clipping
// artifacts a spurious area when it reinterprets their edges as great circles.
function planarArea(geometry) {
  const ringArea = (ring) => {
    const [x, y] = ring[0];
    let sum = 0;
    for (let i = 1; i < ring.length; i++)
      sum +=
        (ring[i - 1][0] - x) * (ring[i][1] - y) -
        (ring[i][0] - x) * (ring[i - 1][1] - y);
    return Math.abs(sum / 2);
  };
  return parts(geometry).reduce(
    (sum, rings) =>
      sum +
      ringArea(rings[0]) -
      rings.slice(1).reduce((holes, ring) => holes + ringArea(ring), 0),
    0,
  );
}

// Match great-circle edges before planar topology work. Splitting a long
// national edge otherwise changes its spherical curvature in the renderer.
function densify(geometry) {
  const rings = parts(geometry).map((part) =>
    part.map((ring) => {
      const points = [];
      for (let i = 1; i < ring.length; i++) {
        const from = ring[i - 1],
          to = ring[i];
        const steps = Math.max(
          1,
          Math.ceil(geoDistance(from, to) / (0.25 * radians)),
        );
        const interpolate = geoInterpolate(from, to);
        points.push(from);
        for (let j = 1; j < steps; j++)
          points.push(interpolate(j / steps).map(round));
      }
      points.push(ring.at(-1));
      return points;
    }),
  );
  return { type: "MultiPolygon", coordinates: rings };
}

// Border samples assign missing strips to nearby territories. Unlike assigning
// one ID to a whole gap, this splits long coastal strips among adjacent regions.
function nearestTerritoryCells(clipped, footprint) {
  const edges = new Map();
  for (const f of clipped.filter((f) => f.geometry))
    for (const part of parts(f.geometry))
      for (const ring of part)
        for (let i = 1; i < ring.length; i++) {
          const a = ring[i - 1],
            b = ring[i];
          const ka = a.map(round).join(","),
            kb = b.map(round).join(",");
          if (ka === kb) continue;
          const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
          const existing = edges.get(key);
          if (existing) existing.count++;
          else edges.set(key, { a, b, id: f.properties.id, count: 1 });
        }
  const exterior = [...edges.values()].filter((e) => e.count === 1);
  const length = exterior.reduce(
    (sum, e) => sum + geoDistance(e.a, e.b) / radians,
    0,
  );
  const spacing = Math.max(0.02, length / 40000);
  const vertices = parts(footprint).flat(2);
  const west = Math.min(...vertices.map((p) => p[0])),
    east = Math.max(...vertices.map((p) => p[0]));
  const south = Math.min(...vertices.map((p) => p[1])),
    north = Math.max(...vertices.map((p) => p[1]));
  const scale = Math.max(0.2, Math.cos(((north + south) / 2) * radians));
  const sites = [],
    owners = [],
    seen = new Set();
  const add = (point, id) => {
    const key = point.map(round).join(",");
    if (seen.has(key)) return;
    seen.add(key);
    for (const shift of east - west > 180 ? [-360, 0, 360] : [0]) {
      sites.push([(point[0] + shift) * scale, point[1]]);
      owners.push(id);
    }
  };
  for (const edge of exterior) {
    const steps = Math.max(
      1,
      Math.ceil(geoDistance(edge.a, edge.b) / (spacing * radians)),
    );
    const interpolate = geoInterpolate(edge.a, edge.b);
    for (let j = 0; j <= steps; j++) add(interpolate(j / steps), edge.id);
  }
  if (!sites.length)
    throw Error("No subdivision edges available for display reconciliation");
  const voronoi = Delaunay.from(sites).voronoi([
    west * scale - 1e-6,
    south - 1e-6,
    east * scale + 1e-6,
    north + 1e-6,
  ]);
  return [...voronoi.cellPolygons()].map((polygon) =>
    feature(owners[polygon.index], {
      type: "Polygon",
      coordinates: [polygon.map(([x, y]) => [round(x / scale), round(y)])],
    }),
  );
}

/** Complete a display partition; canonical answer geometry is never rewritten. */
export async function reconcileRegionalDisplay(parent, children) {
  const source =
    parent.displayGeometry === undefined
      ? parent.geometry
      : parent.displayGeometry;
  const empty = () =>
    children.map(({ displayPartition: _old, ...r }) => ({
      ...r,
      displayGeometry: null,
    }));
  if (!source) return empty();
  const footprint = densify(source);
  const input = {
    "parent.json": collection([feature(parent.id, footprint)]),
    "children.json": collection(
      children.map((r) => feature(r.id, densify(r.geometry))),
    ),
  };
  const output = await mapshaper.applyCommands(
    `-i parent.json name=parent -i children.json name=children -clip parent target=children -clean target=children gap-fill-area=0 overlap-rule=min-id allow-empty -o clipped.json target=children ${outputOptions} -erase children target=parent -o gaps.json target=parent ${outputOptions}`,
    input,
  );
  const clipped = JSON.parse(output["clipped.json"]).features;
  if (!clipped.some((f) => f.geometry)) return empty();
  const gaps = JSON.parse(output["gaps.json"]).features.filter(
    (f) => f.geometry,
  );
  let display = clipped;
  if (gaps.length) {
    const cells = nearestTerritoryCells(clipped, footprint);
    const repaired = await mapshaper.applyCommands(
      `-i clipped.json name=clipped -i cells.json name=cells -dissolve id target=cells -i gaps.json name=gaps -clip gaps target=cells -merge-layers target=clipped,cells name=display -dissolve id target=display -clean target=display gap-fill-area=0 overlap-rule=min-id allow-empty -o display.json target=display ${outputOptions}`,
      {
        "clipped.json": collection(clipped),
        "cells.json": collection(cells),
        "gaps.json": collection(gaps),
      },
    );
    display = JSON.parse(repaired["display.json"]).features;
  }
  // A complete union lets us remove the backing mesh and duplicate outlines.
  const proof = await mapshaper.applyCommands(
    `-i parent.json name=parent -i display.json name=display -erase display target=parent -o uncovered.json target=parent ${outputOptions}`,
    {
      "parent.json": input["parent.json"],
      "display.json": collection(display),
    },
  );
  const uncoveredFeatures = JSON.parse(proof["uncovered.json"]).features;
  const uncovered = uncoveredFeatures.reduce(
    (sum, f) => sum + (f.geometry ? planarArea(f.geometry) : 0),
    0,
  );
  // Dense coastlines can leave negligible floating-point overlay slivers.
  // Bound these by one hundred-millionth of the display footprint's area.
  if (uncovered > Math.max(1e-10, planarArea(footprint) * 1e-8))
    throw Object.assign(
      Error(
        `Incomplete subdivision display partition: ${parent.id} (${uncovered})`,
      ),
      { uncoveredFeatures },
    );
  const geometries = new Map(display.map((f) => [f.properties.id, f.geometry]));
  const members = display.filter((f) => f.geometry).length;
  const id = createHash("sha256")
    .update(
      JSON.stringify([footprint, children.map((r) => [r.id, r.geometry])]),
    )
    .digest("hex")
    .slice(0, 16);
  return children.map((r) => ({
    ...r,
    displayGeometry: geometries.get(r.id) ?? null,
    displayPartition: { id, members },
  }));
}
