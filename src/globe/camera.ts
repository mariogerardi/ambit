import type { Focus } from "../geography/types";
import { normalWorldView } from "./defaultViews";
export interface CameraPort {
  pointOfView(): Required<Focus>;
  pointOfView(focus: Focus, duration: number): unknown;
}
export function shortestLongitude(from: number, to: number) {
  return from + ((((to - from + 540) % 360) + 360) % 360) - 180;
}
export function routeFocus(from: Focus, to: Focus): Focus {
  const radians = Math.PI / 180;
  const xyz = (p: Focus) => [
    Math.cos(p.lat * radians) * Math.cos(p.lng * radians),
    Math.cos(p.lat * radians) * Math.sin(p.lng * radians),
    Math.sin(p.lat * radians),
  ];
  const a = xyz(from),
    b = xyz(to),
    v = a.map((n, i) => n + b[i]);
  return {
    lat: Math.atan2(v[2], Math.hypot(v[0], v[1])) / radians,
    lng: Math.atan2(v[1], v[0]) / radians,
    altitude: 1.85,
  };
}
export class CameraTravel {
  private frame = 0;
  private finish?: () => void;
  private finalPosition?: () => void;
  get active() {
    return this.frame !== 0;
  }
  cancel() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    const finish = this.finish;
    this.finish = undefined;
    this.finalPosition = undefined;
    finish?.();
  }
  settle() {
    const finalPosition = this.finalPosition;
    this.cancel();
    finalPosition?.();
  }
  move(
    port: CameraPort,
    target: Focus,
    reduced: boolean,
    done?: () => void,
    targetAltitude?: () => number,
  ) {
    this.cancel();
    const from = port.pointOfView(),
      to = {
        ...target,
        altitude: Math.max(0.012, Math.min(5.5, target.altitude ?? 0.8)),
      };
    const lng = shortestLongitude(from.lng, to.lng);
    this.finish = done;
    const fitAltitude = () =>
      Math.max(0.012, Math.min(5.5, targetAltitude?.() ?? to.altitude));
    to.altitude = fitAltitude();
    this.finalPosition = () =>
      port.pointOfView({ ...to, altitude: fitAltitude() }, 0);
    if (reduced) {
      port.pointOfView(to, 0);
      this.cancel();
      return;
    }
    const start = performance.now(),
      duration = 1100;
    let previousTime = start,
      elapsed = 0;
    const tick = (now: number) => {
      // A busy selection/render frame must not skip a quarter of the flight.
      // Advance by bounded frame time, including a small first-frame step.
      elapsed += Math.min(
        elapsed === 0 ? 16 : 32,
        Math.max(0, now - previousTime),
      );
      previousTime = now;
      to.altitude = fitAltitude();
      const t = Math.min(1, elapsed / duration),
        // Soften just the first 90ms, with a nonzero starting speed so the
        // globe responds immediately. Rejoin the original ease-out afterward.
        ramp = Math.min(1, elapsed / 90),
        easedTime = t * (1 - 0.65 * (1 - ramp) ** 2),
        smooth = easedTime * (2 - easedTime);
      if (t >= 1) {
        // Avoid accumulated interpolation roundoff at the final position.
        port.pointOfView({ ...to, lng }, 0);
        this.cancel();
        return;
      }
      // Pull back slightly during long travel so a close regional view never
      // scrapes along Earth's surface on its way to another region.
      const lift =
        Math.sin(Math.PI * easedTime) *
        Math.min(
          0.7,
          Math.abs(lng - from.lng) / 120 + Math.abs(to.lat - from.lat) / 90,
        );
      port.pointOfView(
        {
          lat: from.lat + (to.lat - from.lat) * smooth,
          lng: from.lng + (lng - from.lng) * smooth,
          altitude:
            from.altitude + (to.altitude - from.altitude) * smooth + lift,
        },
        0,
      );
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }
}

/** A planned, continuous loop: slow over destinations, carry course between them. */
export class CameraFlyover {
  private frame = 0;
  private generation = 0;
  get active() {
    return this.frame !== 0;
  }
  cancel() {
    this.generation++;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }
  start(
    port: CameraPort,
    stops: Focus[],
    reduced: boolean,
    loop = true,
    onStep?: (index: number) => void,
  ) {
    this.cancel();
    if (reduced || !stops.length) return;
    const generation = this.generation;
    const destinations = stops.map((stop) => ({
      ...stop,
      altitude: Math.max(0.012, Math.min(5.5, stop.altitude ?? 0.65)),
    }));
    // The incoming/outgoing bearings shape each stop's course. Speed stays low
    // near the country and respects nearby stops so short legs cannot overshoot.
    const velocities = destinations.map((stop, i) => {
      const previous =
        destinations[
          loop ? (i + stops.length - 1) % stops.length : Math.max(0, i - 1)
        ];
      const next =
        destinations[
          loop ? (i + 1) % stops.length : Math.min(stops.length - 1, i + 1)
        ];
      const longitudeScale = Math.max(
        0.2,
        Math.cos((stop.lat * Math.PI) / 180),
      );
      const incoming = {
        lat: stop.lat - previous.lat,
        lng:
          (stop.lng - shortestLongitude(stop.lng, previous.lng)) *
          longitudeScale,
      };
      const outgoing = {
        lat: next.lat - stop.lat,
        lng:
          (shortestLongitude(stop.lng, next.lng) - stop.lng) * longitudeScale,
      };
      const before = Math.hypot(incoming.lat, incoming.lng),
        after = Math.hypot(outgoing.lat, outgoing.lng);
      let lat = incoming.lat / (before || 1) + outgoing.lat / (after || 1);
      let lng = incoming.lng / (before || 1) + outgoing.lng / (after || 1);
      if (Math.hypot(lat, lng) < 0.05) {
        lat = -incoming.lng / (before || 1);
        lng = incoming.lat / (before || 1);
      }
      const length = Math.hypot(lat, lng) || 1;
      const speed = Math.min(6 / 3600, Math.min(before, after) / 12000);
      return {
        lat: (lat / length) * speed,
        lng: ((lng / length) * speed) / longitudeScale,
      };
    });
    let index = 0,
      initial = true;
    let from = port.pointOfView();
    const destination = (
      origin: Required<Focus>,
      i: number,
    ): Required<Focus> => ({
      ...destinations[i],
      lng: shortestLongitude(origin.lng, destinations[i].lng),
    });
    let to = destination(from, index);
    onStep?.(index);
    let fromVelocity = { lat: 0, lng: 0 },
      toVelocity = velocities[0];
    const distance = () =>
      Math.hypot(
        to.lat - from.lat,
        (to.lng - from.lng) * Math.cos(((from.lat + to.lat) * Math.PI) / 360),
      );
    let duration = Math.max(3000, Math.min(6500, distance() * 35));
    let elapsed = 0,
      previousTime = performance.now();
    // Match position, velocity and acceleration at every destination. There is
    // no separate approach/pass sequence and no independent zoom pulse.
    const blend = (a: number, b: number, t: number, v0 = 0, v1 = 0) => {
      const delta = b - a,
        m0 = v0 * duration,
        m1 = v1 * duration;
      return (
        a +
        m0 * t +
        (10 * delta - 6 * m0 - 4 * m1) * t ** 3 +
        (-15 * delta + 8 * m0 + 7 * m1) * t ** 4 +
        (6 * delta - 3 * m0 - 3 * m1) * t ** 5
      );
    };
    const next = () => {
      from = to;
      fromVelocity = toVelocity;
      initial = false;
      index = (index + 1) % stops.length;
      onStep?.(index);
      to = destination(from, index);
      toVelocity = velocities[index];
      duration = Math.max(6000, Math.min(10000, distance() * 70));
    };
    const tick = (now: number) => {
      if (generation !== this.generation) return;
      elapsed += Math.max(0, Math.min(32, now - previousTime));
      previousTime = now;
      while (elapsed >= duration) {
        if (!loop && index === stops.length - 1) {
          port.pointOfView(to, 0);
          this.frame = 0;
          return;
        }
        elapsed -= duration;
        next();
      }
      const t = elapsed / duration;
      // A one-stop tour has no onward course; make a small, seamless orbit.
      const orbit = loop && !initial && stops.length === 1;
      port.pointOfView(
        {
          lat:
            blend(from.lat, to.lat, t, fromVelocity.lat, toVelocity.lat) +
            (orbit ? Math.sin(2 * Math.PI * t) ** 3 : 0),
          lng:
            blend(from.lng, to.lng, t, fromVelocity.lng, toVelocity.lng) +
            (orbit ? (1 - Math.cos(2 * Math.PI * t)) ** 2 : 0),
          altitude: blend(from.altitude, to.altitude, t),
        },
        0,
      );
      if (generation === this.generation)
        this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }
}

// Three.js default camera: 50° vertical field of view. Keep the entire Earth
// inside the narrower viewport dimension, including on portrait phones.
export function viewportProjection(
  canvasHeight: number,
  frameHeight = canvasHeight,
  frameTop = 0,
  scale = 1,
) {
  // Extend the visible frustum through overlay bars, preserving the scale and
  // center of the original map frame at every zoom level. Scale magnifies the
  // projection without changing the orbit or distorting the sphere.
  return {
    fov:
      (Math.atan(
        (Math.tan((25 * Math.PI) / 180) *
          (Math.max(1, canvasHeight) / Math.max(1, frameHeight))) /
          scale,
      ) *
        360) /
      Math.PI,
    offsetY: frameTop + (frameHeight - canvasHeight) / 2,
  };
}

export function focusAltitude(
  altitude: number,
  viewport: { width: number; frameHeight: number },
  compact: boolean,
  fit: boolean | "world" = true,
) {
  if (!fit) return altitude;
  if (fit === "world")
    return worldAltitude(viewport.width, viewport.frameHeight, compact);
  return altitude < 1.65
    ? altitude / Math.min(1, viewport.width / Math.max(1, viewport.frameHeight))
    : Math.max(
        altitude,
        worldAltitude(viewport.width, viewport.frameHeight, compact),
      );
}

export function worldAltitude(width: number, height: number, compact = false) {
  const radiusFraction = compact ? 0.96 : width < 700 ? 0.84 : 0.9;
  const angularRadius = Math.atan(
    Math.tan((25 * Math.PI) / 180) *
      Math.min(1, width / height) *
      radiusFraction,
  );
  return Math.min(
    5.5,
    Math.max(compact ? 1.4 : 1.65, 1 / Math.sin(angularRadius) - 1),
  );
}

const projectedRadius = (altitude: number, height: number) =>
  height * Math.tan(Math.asin(1 / (1 + altitude)));

/** Blend projection magnification without taking control of the camera orbit. */
export class CameraScale {
  private frame = 0;
  constructor(public value = 1) {}
  cancel() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }
  move(target: number, reduced: boolean, update: () => void) {
    this.cancel();
    if (reduced || target === this.value) {
      this.value = target;
      update();
      return;
    }
    const from = this.value,
      start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / 720));
      this.value = from + (target - from) * t * t * (3 - 2 * t);
      update();
      this.frame = t < 1 ? requestAnimationFrame(tick) : 0;
    };
    this.frame = requestAnimationFrame(tick);
  }
}

/** Preserve the on-screen scale while the tray moves, then grow gently. */
export class ViewportResize {
  private frame = 0;
  private viewport?: { width: number; height: number };
  get active() {
    return !!this.viewport;
  }
  cancel() {
    cancelAnimationFrame(this.frame);
    this.viewport = undefined;
  }
  resize(width: number, height: number) {
    if (this.viewport) this.viewport = { width, height };
  }
  adapt(
    port: CameraPort,
    previous: { width: number; height: number },
    next: { width: number; height: number },
    moving: boolean,
  ) {
    // A changing tray must never cancel or overwrite a destination flight.
    if (moving) return;
    if (this.active) {
      this.resize(next.width, next.height);
      return;
    }
    const view = port.pointOfView();
    const altitude = normalWorldView(
      view,
      worldAltitude(previous.width, previous.height, true),
    )
      ? worldAltitude(next.width, next.height, true)
      : (view.altitude * Math.min(1, previous.width / previous.height)) /
        Math.min(1, next.width / next.height);
    port.pointOfView({ ...view, altitude }, 0);
  }
  start(
    port: CameraPort,
    viewport: { width: number; height: number },
    fullWorld: boolean,
    expanding: boolean,
  ) {
    this.cancel();
    this.viewport = viewport;
    const start = performance.now();
    const initialRadius = projectedRadius(
      port.pointOfView().altitude,
      viewport.height,
    );
    const tick = (now: number) => {
      const current = this.viewport;
      if (!current) return;
      const elapsed = now - start;
      const t = Math.max(0, Math.min(1, (elapsed - 180) / 720));
      const progress = t * t * (3 - 2 * t);
      const desiredRadius = fullWorld
        ? projectedRadius(
            worldAltitude(current.width, current.height, true),
            current.height,
          )
        : (initialRadius * current.width) / viewport.width;
      const targetRadius = expanding
        ? Math.min(initialRadius * 1.08, desiredRadius)
        : desiredRadius;
      const radius = initialRadius + (targetRadius - initialRadius) * progress;
      const altitude = 1 / Math.sin(Math.atan(radius / current.height)) - 1;
      port.pointOfView(
        {
          ...port.pointOfView(),
          altitude: Math.max(0.012, Math.min(5.5, altitude)),
        },
        0,
      );
      if (elapsed < 900) this.frame = requestAnimationFrame(tick);
      else this.viewport = undefined;
    };
    this.frame = requestAnimationFrame(tick);
  }
}
