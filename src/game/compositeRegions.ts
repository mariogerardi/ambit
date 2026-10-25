import { geoContains } from "d3-geo";
import { sphericalGeometry } from "../geography/sphericalGeometry.mjs";
import type { RegionFeature } from "../geography/types";
import type { Question } from "./questionContracts";

type Point = number[];
const key = (point: Point) => point.join(",");
const parts = (region: RegionFeature) =>
  region.geometry.type === "Polygon"
    ? [region.geometry.coordinates]
    : region.geometry.coordinates;
const signedArea = (ring: Point[]) =>
  ring
    .slice(1)
    .reduce(
      (sum, point, index) =>
        sum + ring[index][0] * point[1] - point[0] * ring[index][1],
      0,
    ) / 2;

/** Dissolve the bundled shared-edge topology; never approximate a hidden border.
 * Preserves every exterior vertex, offshore component and enclave hole. */
export function dissolveRegions(
  members: RegionFeature[],
): RegionFeature["geometry"] {
  const edges = new Map<string, { from: Point; to: Point }>();
  for (const member of members)
    for (const part of parts(member))
      for (const ring of part)
        for (let index = 1; index < ring.length; index++) {
          const from = ring[index - 1],
            to = ring[index];
          if (key(from) === key(to)) continue;
          const reverse = `${key(to)}|${key(from)}`;
          if (edges.has(reverse)) edges.delete(reverse);
          else {
            const edgeKey = `${key(from)}|${key(to)}`;
            if (edges.has(edgeKey))
              throw Error(
                "Composite polygons overlap or have inconsistent winding.",
              );
            edges.set(edgeKey, { from, to });
          }
        }
  const outgoing = new Map<string, typeof edges>();
  for (const [id, edge] of edges) {
    const next = outgoing.get(key(edge.from)) ?? new Map();
    next.set(id, edge);
    outgoing.set(key(edge.from), next);
  }
  const rings: Point[][] = [];
  while (edges.size) {
    const [firstId, first] = edges.entries().next().value!;
    const ring = [first.from];
    let id = firstId,
      edge = first;
    while (true) {
      edges.delete(id);
      outgoing.get(key(edge.from))!.delete(id);
      ring.push(edge.to);
      if (key(edge.to) === key(ring[0])) break;
      const next = outgoing.get(key(edge.to));
      if (!next?.size)
        throw Error("Composite exterior is not a closed shared-edge polygon.");
      // At a point contact, follow the leftmost continuation with land on the left.
      const incoming = Math.atan2(
        edge.to[1] - edge.from[1],
        edge.to[0] - edge.from[0],
      );
      [id, edge] = [...next].sort(([, a], [, b]) => {
        const turn = (e: typeof edge) => {
          const angle =
            Math.atan2(e.to[1] - e.from[1], e.to[0] - e.from[0]) - incoming;
          return Math.atan2(Math.sin(angle), Math.cos(angle));
        };
        return turn(b) - turn(a);
      })[0];
    }
    rings.push(ring);
  }
  const polygons = rings
    .filter((ring) => signedArea(ring) > 0)
    .map((ring) => [ring]);
  for (const hole of rings.filter((ring) => signedArea(ring) < 0)) {
    const owner = polygons.find(([outer]) =>
      geoContains(
        sphericalGeometry({ type: "Polygon", coordinates: [outer] }),
        hole[0] as [number, number],
      ),
    );
    if (!owner) throw Error("Composite hole has no exterior polygon.");
    owner.push(hole);
  }
  if (!polygons.length) throw Error("Composite has no exterior polygons.");
  return polygons.length === 1
    ? { type: "Polygon", coordinates: polygons[0] }
    : { type: "MultiPolygon", coordinates: polygons };
}
const cache = new WeakMap<RegionFeature[], WeakMap<Question, RegionFeature>>();
export function compositeRegion(
  regions: RegionFeature[],
  question: Question,
): RegionFeature {
  const rule = question.rule;
  if (rule.type !== "merged-region")
    throw Error("Expected a composite answer contract.");
  let entries = cache.get(regions);
  if (!entries) cache.set(regions, (entries = new WeakMap()));
  const cached = entries.get(question);
  if (cached) return cached;
  const members = rule.memberIds.map((id) => {
    const member = regions.find(
      (region) => region.id === id && region.level === "ADM0",
    );
    if (!member) throw Error(`Missing canonical composite member: ${id}`);
    return member;
  });
  const result: RegionFeature = {
    id: rule.targetId,
    name: "Territory",
    level: "ADM0",
    sourceId: "journey-composite",
    focus: members[0].focus,
    geometry: dissolveRegions(members),
    // Match neighboring display shores/borders; coarse grading outlines leave
    // visible gaps and overlaps against the detailed map and disclose the pair.
    displayGeometry: members.some((member) => member.displayGeometry)
      ? dissolveRegions(
          members.map((member) => ({
            ...member,
            geometry: member.displayGeometry ?? member.geometry,
          })),
        )
      : undefined,
  };
  entries.set(question, result);
  return result;
}
