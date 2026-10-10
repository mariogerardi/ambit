import {
  BufferGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
} from "three";
import ConicPolygonGeometry from "three-conic-polygon-geometry";
import type { RegionFeature } from "../geography/types";
import { boundaryAltitude, boundaryResolution } from "./geometry";
import { outlineColor } from "./outlines";

/** Regional caps belong to this renderer, rather than Kapsule's disposable polygon layer. */
export class RegionSurfaces {
  constructor(private paused: () => boolean = () => false) {}
  private geometry = new Map<
    RegionFeature["geometry"],
    (BufferGeometry | undefined)[]
  >();
  private groups = new Map<RegionFeature, Group>();
  private materials = new Map<RegionFeature, MeshBasicMaterial>();
  private jobs: (() => void)[] = [];
  private frame = 0;
  private disposed = false;

  private parts(region: RegionFeature) {
    return region.geometry.type === "Polygon"
      ? [region.geometry.coordinates]
      : region.geometry.coordinates;
  }
  private buffers(region: RegionFeature) {
    let cached = this.geometry.get(region.geometry);
    if (!cached) this.geometry.set(region.geometry, (cached = []));
    return cached;
  }
  private build(region: RegionFeature, index: number) {
    const cached = this.buffers(region);
    return (cached[index] ??= new ConicPolygonGeometry(
      this.parts(region)[index],
      0,
      1 + boundaryAltitude(region),
      false,
      true,
      false,
      boundaryResolution(region),
    ));
  }
  private schedule() {
    if (this.frame || this.disposed) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      if (this.paused()) {
        this.schedule();
        return;
      }
      const start = performance.now();
      // Yield between polygons so flights and recoloring can start immediately.
      do {
        this.jobs.shift()?.();
      } while (this.jobs.length && performance.now() - start < 5);
      if (this.jobs.length) this.schedule();
    });
  }
  warm(regions: RegionFeature[]) {
    for (const region of regions.filter((r) => r.level !== "ADM0")) {
      this.parts(region).forEach((_, index) => {
        if (!this.buffers(region)[index])
          this.jobs.push(() => this.build(region, index));
      });
    }
    if (this.jobs.length) this.schedule();
  }
  get(region: RegionFeature, radius: number) {
    let group = this.groups.get(region);
    if (group) return group;
    group = new Group();
    group.scale.setScalar(radius);
    this.groups.set(region, group);
    const material = new MeshBasicMaterial({ side: DoubleSide });
    this.materials.set(region, material);
    this.parts(region).forEach((_, index) => {
      const add = () => {
        if (!this.disposed)
          group!.add(new Mesh(this.build(region, index), material));
      };
      if (this.buffers(region)[index]) add();
      else this.jobs.unshift(add);
    });
    if (this.jobs.length) this.schedule();
    return group;
  }
  update(region: RegionFeature, color: string) {
    const material = this.materials.get(region);
    if (!material) return;
    const components = outlineColor(color);
    material.color.set(components.color);
    const transparent = components.opacity < 1;
    if (material.transparent !== transparent) {
      material.transparent = transparent;
      material.needsUpdate = true;
    }
    material.opacity = components.opacity;
    material.depthWrite = !transparent;
  }
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.jobs = [];
    for (const buffers of this.geometry.values())
      buffers.forEach((g) => g?.dispose());
    for (const material of this.materials.values()) material.dispose();
    for (const group of this.groups.values()) {
      const outline = group.userData.outline;
      outline?.geometry.dispose();
      outline?.material.dispose();
    }
    this.geometry.clear();
    this.groups.clear();
    this.materials.clear();
  }
}
