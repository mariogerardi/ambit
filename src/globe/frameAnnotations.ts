import { Matrix4 } from "three";
import type { Camera, Scene } from "three";

/** Project screen annotations after Three updates camera matrices, on the same
 * frame as the globe. Independent RAF callbacks can lag damping/tween motion. */
export function bindFrameAnnotations(
  scene: Scene,
  refresh: () => void,
  pending: () => boolean = () => false,
) {
  const previous = scene.onBeforeRender;
  const world = new Matrix4(),
    projection = new Matrix4();
  let lastCamera: Camera | undefined;
  const before: typeof scene.onBeforeRender = function (this: Scene, ...args) {
    previous.call(this, ...args);
    const camera = args[2];
    if (
      camera === lastCamera &&
      world.equals(camera.matrixWorld) &&
      projection.equals(camera.projectionMatrix) &&
      !pending()
    )
      return;
    refresh();
    lastCamera = camera;
    world.copy(camera.matrixWorld);
    projection.copy(camera.projectionMatrix);
  };
  scene.onBeforeRender = before;
  return () => {
    if (scene.onBeforeRender === before) scene.onBeforeRender = previous;
  };
}
