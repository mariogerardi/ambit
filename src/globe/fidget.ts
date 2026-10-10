import {
  BufferGeometry,
  InstancedBufferGeometry,
  Matrix4,
  Object3D,
  Plane,
  Sprite,
  Vector3,
} from "three";
import type {
  BufferAttribute,
  InterleavedBufferAttribute,
  Material,
} from "three";
export const FIDGETS = ["squeeze", "split", "cube", "twist", "ripple"] as const;
export type FidgetEffect = (typeof FIDGETS)[number];
type Attribute = BufferAttribute | InterleavedBufferAttribute;
interface Surface {
  object: Object3D & { geometry: BufferGeometry };
  original: BufferGeometry;
  temporary: BufferGeometry;
  culled: boolean;
  inverse: Matrix4;
  attributes: { attribute: Attribute; world: Float32Array }[];
}
interface Label {
  object: Sprite;
  original: Vector3;
  world: Vector3;
  inverse: Matrix4;
}
/** Temporary geometry copies keep the renderer, country objects and cached originals intact. */
export class GlobeFidget {
  get active() {
    return this.surfaces.length > 0;
  }
  private surfaces: Surface[] = [];
  private labels: Label[] = [];
  private frame = 0;
  private previous?: FidgetEffect;
  private clipping?: {
    renderer: { localClippingEnabled: boolean };
    original: boolean;
    planes: Plane[];
  };
  private materials: {
    object: Object3D & { material: Material | Material[] };
    original: Material | Material[];
    temporary: Material | Material[];
  }[] = [];
  private vector = new Vector3();
  private scratch = new Vector3();
  play(
    scene: Object3D,
    radius: number,
    reduced = false,
    chosen?: FidgetEffect,
    renderer?: { localClippingEnabled: boolean },
    onComplete?: () => void,
  ): FidgetEffect | undefined {
    this.cancel();
    if (reduced) return;
    const options = FIDGETS.filter((effect) => effect !== this.previous);
    const effect =
      chosen ?? options[Math.floor(Math.random() * options.length)];
    this.previous = effect;
    if (effect === "split" && renderer) {
      this.clipping = {
        renderer,
        original: renderer.localClippingEnabled,
        planes: [
          new Plane(new Vector3(0, 1, 0)),
          new Plane(new Vector3(0, -1, 0)),
        ],
      };
      renderer.localClippingEnabled = true;
    }
    const clip = (object: Object3D) => {
      const drawable = object as Object3D & { material: Material | Material[] };
      if (!this.clipping || !drawable.material) return;
      const copy = (material: Material) => {
        const result = material.clone();
        result.clippingPlanes = this.clipping!.planes;
        result.clipIntersection = true;
        return result;
      };
      const original = drawable.material;
      const temporary = Array.isArray(original)
        ? original.map(copy)
        : copy(original);
      this.materials.push({ object: drawable, original, temporary });
      drawable.material = temporary;
    };
    scene.updateMatrixWorld(true);
    const onSurface = (v: Vector3) =>
      v.length() > radius * 0.85 && v.length() < radius * 1.12;
    scene.traverse((object) => {
      if (object instanceof Sprite) {
        const world = object.getWorldPosition(new Vector3());
        if (onSurface(world) && object.parent) {
          this.labels.push({
            object,
            world,
            original: object.position.clone(),
            inverse: object.parent.matrixWorld.clone().invert(),
          });
          clip(object);
        }
        return;
      }
      const mesh = object as Surface["object"];
      if (!mesh.geometry?.isBufferGeometry) return;
      const names = ["position", "instanceStart", "instanceEnd"].filter(
        (key) => {
          const attr = mesh.geometry.getAttribute(key);
          if (!attr || attr.itemSize !== 3 || !attr.count) return false;
          // Lines2's base quad is not geography; its instance endpoints are.
          this.vector
            .fromBufferAttribute(attr as Attribute, 0)
            .applyMatrix4(object.matrixWorld);
          return onSurface(this.vector);
        },
      );
      if (!names.length) return;
      clip(object);
      const original = mesh.geometry,
        temporary = (original as InstancedBufferGeometry)
          .isInstancedBufferGeometry
          ? new InstancedBufferGeometry().copy(
              original as InstancedBufferGeometry,
            )
          : new BufferGeometry().copy(original);
      // Kapsule checks these parameters on color/hover updates. Without them it
      // mistakes the temporary copy for a different polygon and rebuilds it.
      if ("parameters" in original)
        Object.assign(temporary, { parameters: original.parameters });
      const attributes = names.map((key) => {
        const attribute = temporary.getAttribute(key) as Attribute;
        const world = new Float32Array(attribute.count * 3);
        for (let i = 0; i < attribute.count; i++) {
          this.vector
            .fromBufferAttribute(attribute, i)
            .applyMatrix4(object.matrixWorld)
            .toArray(world, i * 3);
        }
        return { attribute, world };
      });
      this.surfaces.push({
        object: mesh,
        original,
        temporary,
        culled: object.frustumCulled,
        inverse: object.matrixWorld.clone().invert(),
        attributes,
      });
      mesh.geometry = temporary;
      mesh.frustumCulled = false;
    });
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - start) / 1700));
      if (progress >= 1) {
        this.cancel();
        onComplete?.();
        return;
      }
      // A short pause at the peak makes each transformation readable.
      const strength =
        Math.sin((Math.PI * Math.min(1, progress / 0.4)) / 2) ** 2;
      const envelope =
        progress < 0.4
          ? strength
          : progress < 0.6
            ? 1
            : Math.sin((Math.PI * (1 - progress)) / 0.8) ** 2;
      // Clip the connecting triangle strip as well as the lines: the gap is an
      // actual empty cut rather than an elastic belt joining two hemispheres.
      if (this.clipping)
        this.clipping.planes.forEach((plane) => {
          plane.constant = -radius * 0.18 * envelope * 0.99;
        });
      for (const surface of this.surfaces) {
        for (const { attribute, world } of surface.attributes) {
          for (let i = 0; i < attribute.count; i++) {
            this.vector.fromArray(world, i * 3);
            this.deform(this.vector, effect, envelope, radius);
            this.vector.applyMatrix4(surface.inverse);
            attribute.setXYZ(i, this.vector.x, this.vector.y, this.vector.z);
          }
          attribute.needsUpdate = true;
        }
      }
      for (const label of this.labels) {
        this.vector.copy(label.world);
        this.deform(this.vector, effect, envelope, radius);
        label.object.position.copy(this.vector.applyMatrix4(label.inverse));
      }
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
    return effect;
  }
  private deform(
    v: Vector3,
    effect: FidgetEffect,
    amount: number,
    radius: number,
  ) {
    const { x, y, z } = v;
    if (effect === "squeeze")
      v.set(
        x * (1 + 0.18 * amount),
        y * (1 - 0.42 * amount),
        z * (1 + 0.18 * amount),
      );
    else if (effect === "split")
      v.y += (y < 0 ? -1 : 1) * radius * 0.18 * amount;
    else if (effect === "cube") {
      const max = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
      if (max)
        v.lerp(
          this.scratch.set(x, y, z).multiplyScalar((radius * 0.83) / max),
          amount,
        );
    } else if (effect === "twist") {
      const angle = (y / radius) * 0.7 * amount;
      v.set(
        x * Math.cos(angle) - z * Math.sin(angle),
        y,
        x * Math.sin(angle) + z * Math.cos(angle),
      );
    } else v.multiplyScalar(1 + 0.075 * amount * Math.sin((y / radius) * 12));
  }
  cancel() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    for (const s of this.surfaces) {
      // A layer may have been replaced while the effect was running.
      if (s.object.geometry === s.temporary) s.object.geometry = s.original;
      s.object.frustumCulled = s.culled;
      s.temporary.dispose();
    }
    for (const label of this.labels) label.object.position.copy(label.original);
    for (const material of this.materials) {
      if (material.object.material === material.temporary)
        material.object.material = material.original;
      for (const m of Array.isArray(material.temporary)
        ? material.temporary
        : [material.temporary])
        m.dispose();
    }
    if (this.clipping)
      this.clipping.renderer.localClippingEnabled = this.clipping.original;
    this.clipping = undefined;
    this.materials = [];
    this.surfaces = [];
    this.labels = [];
  }
}
