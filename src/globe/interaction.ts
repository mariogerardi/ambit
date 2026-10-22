import type { RegionFeature, VisualState } from "../geography/types";
import { Raycaster, Sphere, Vector2, Vector3 } from "three";
import type { Camera } from "three";

/** Pick the surface actually drawn; the base globe gives parallax at local zoom. */
export function raisedSurfacePoint(
  camera: Camera,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const ray = new Raycaster();
  ray.setFromCamera(
    new Vector2((2 * x) / width - 1, 1 - (2 * y) / height),
    camera,
  );
  return ray.ray.intersectSphere(
    new Sphere(new Vector3(), radius),
    new Vector3(),
  );
}

/** Inspection and visual emphasis never imply that an object accepts an answer. */
export function canPickRegion(
  region: Pick<RegionFeature, "id" | "displayBase">,
  settings: {
    regionInteraction?: boolean;
    selectDisabled?: boolean;
    selectableRegionIds?: readonly string[];
    states: Record<string, VisualState>;
  },
) {
  return (
    !region.displayBase &&
    settings.regionInteraction !== false &&
    (settings.selectableRegionIds !== undefined
      ? settings.selectableRegionIds.includes(region.id)
      : settings.selectDisabled || settings.states[region.id] !== "disabled")
  );
}
