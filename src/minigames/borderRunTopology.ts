import { geoInterpolate } from "d3-geo";
import roster from "../game/data/un-members.v1.json";
import type { RegionFeature } from "../geography/types";
import type { NeighborPair } from "./sharedNeighbors";
export type Coordinate = [number, number];
export interface LandPortal {
  a: Coordinate;
  b: Coordinate;
  point: Coordinate;
}
export interface LandComponent {
  key: string;
  countryId: string;
  region: RegionFeature;
  neighbors: Map<string, LandPortal[]>;
}
export interface LandTopology {
  components: Map<string, LandComponent>;
  countries: Map<string, LandComponent[]>;
}
export interface RoutePair extends NeighborPair {
  route: string[];
  components: LandComponent[];
}
const cache = new WeakMap<RegionFeature[], LandTopology>();
export function landTopology(regions: RegionFeature[]): LandTopology {
  const cached = cache.get(regions);
  if (cached) return cached;
  const members = new Set(roster.members.map((c) => c.id));
  const topology: LandTopology = {
    components: new Map(),
    countries: new Map(),
  };
  const edges = new Map<
    string,
    { component: LandComponent; a: Coordinate; b: Coordinate }[]
  >();
  for (const region of regions.filter((r) => members.has(r.id))) {
    const parts =
      region.geometry.type === "Polygon"
        ? [region.geometry.coordinates]
        : region.geometry.coordinates;
    const components = parts.map((coordinates, index) => ({
      key: `${region.id}:${index}`,
      countryId: region.id,
      region: {
        ...region,
        displayGeometry: undefined,
        geometry: { type: "Polygon" as const, coordinates },
      },
      neighbors: new Map<string, LandPortal[]>(),
    }));
    topology.countries.set(region.id, components);
    for (const component of components) {
      topology.components.set(component.key, component);
      for (const ring of component.region.geometry.coordinates as number[][][])
        for (let i = 1; i < ring.length; i++) {
          const a = ring[i - 1] as Coordinate,
            b = ring[i] as Coordinate;
          if (a[0] === b[0] && a[1] === b[1]) continue;
          const x = a.join(","),
            y = b.join(","),
            key = x < y ? `${x}|${y}` : `${y}|${x}`;
          const owners = edges.get(key) ?? [];
          owners.push({ component, a, b });
          edges.set(key, owners);
        }
    }
  }
  for (const owners of edges.values())
    for (const from of owners)
      for (const to of owners) {
        if (from.component.countryId === to.component.countryId) continue;
        const portals = from.component.neighbors.get(to.component.key) ?? [];
        portals.push({
          a: from.a,
          b: from.b,
          point: geoInterpolate(from.a, from.b)(0.5),
        });
        from.component.neighbors.set(to.component.key, portals);
      }
  cache.set(regions, topology);
  return topology;
}
/** Search physical components: ownership never teleports a route between islands. */
export function borderRunPairs(
  topology: LandTopology,
  excluded: string[] = [],
): RoutePair[] {
  const blocked = new Set(excluded),
    ids = [...topology.countries.keys()]
      .filter((id) => !blocked.has(id))
      .sort();
  const result: RoutePair[] = [];
  for (let i = 0; i < ids.length; i++) {
    const parents = new Map<string, string | undefined>();
    const queue = topology.countries
      .get(ids[i])!
      .filter((c) => c.neighbors.size > 0)
      .map((c) => c.key);
    for (const key of queue) parents.set(key, undefined);
    const reached = new Map<string, string>();
    for (let head = 0; head < queue.length; head++) {
      const current = topology.components.get(queue[head])!;
      if (!reached.has(current.countryId))
        reached.set(current.countryId, current.key);
      for (const key of [...current.neighbors.keys()].sort())
        if (
          !parents.has(key) &&
          !blocked.has(topology.components.get(key)!.countryId)
        ) {
          parents.set(key, current.key);
          queue.push(key);
        }
    }
    for (let j = i + 1; j < ids.length; j++) {
      let key = reached.get(ids[j]);
      if (!key) continue;
      const components: LandComponent[] = [];
      while (key) {
        components.push(topology.components.get(key)!);
        key = parents.get(key);
      }
      components.reverse();
      if (components.length < 3) continue;
      const route = components.map((c) => c.countryId);
      result.push({
        id: `land-v2:${ids[i]}|${ids[j]}`,
        countries: [ids[i], ids[j]],
        answer: String(components.length - 1),
        route,
        components,
      });
    }
  }
  return result;
}
