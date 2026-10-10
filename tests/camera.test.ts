import { describe, it, expect, vi, afterEach } from "vitest";
import {
  CameraTravel,
  CameraFlyover,
  shortestLongitude,
  routeFocus,
  worldAltitude,
  viewportProjection,
  ViewportResize,
} from "../src/globe/camera";
import { PerspectiveCamera, Vector3 } from "three";
import type { Focus } from "../src/geography/types";
import { regionStyle, stateStyles } from "../src/globe/visualStates";
afterEach(() => vi.unstubAllGlobals());
describe("camera travel", () => {
  it("flies slowly across each stop once, returns to the first, loops, and cancels completely", () => {
    let now = 0,
      nextId = 0;
    const callbacks = new Map<number, FrameRequestCallback>();
    vi.stubGlobal("performance", { now: () => now });
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callbacks.set(++nextId, callback);
      return nextId;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => callbacks.delete(id));
    let position: Required<Focus> = { lat: 0, lng: 0, altitude: 1.2 };
    const visits: number[] = [];
    const port = {
      pointOfView(target?: Focus) {
        if (target) {
          position = { ...position, ...target };
          if (target.lng === 20 && target.lat === 10) visits.push(0);
          if (target.lng === 100 && target.lat === -20) visits.push(1);
        }
        return position;
      },
    };
    const advance = (duration: number) => {
      for (let elapsed = 0; elapsed < duration; elapsed += 10) {
        now += 10;
        const frame = [...callbacks.values()];
        callbacks.clear();
        for (const callback of frame) callback(now);
      }
    };
    const tour = new CameraFlyover();
    tour.start(
      port,
      [
        { lat: 10, lng: 20, altitude: 0.8 },
        { lat: -20, lng: 100, altitude: 0.8 },
      ],
      false,
    );
    advance(3000);
    expect(position.lng).toBeCloseTo(20);
    advance(200);
    expect(Math.hypot(position.lat - 10, position.lng - 20)).toBeLessThan(1);
    advance(11900);
    expect(visits).toEqual([0, 1, 0]);
    tour.cancel();
    const stopped = { ...position };
    expect(callbacks.size).toBe(0);
    advance(12000);
    expect(position).toEqual(stopped);
    tour.start(port, [{ lat: 10, lng: 20 }], true);
    expect(callbacks.size).toBe(0);
    expect(position).toEqual(stopped);
  });

  it("preserves camera velocity at arrival, departure and the return to the first stop", () => {
    let now = 0,
      nextId = 0;
    const callbacks = new Map<number, FrameRequestCallback>();
    vi.stubGlobal("performance", { now: () => now });
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callbacks.set(++nextId, callback);
      return nextId;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => callbacks.delete(id));
    let position: Required<Focus> = { lat: 0, lng: 0, altitude: 1.2 };
    const samples = new Map<number, Required<Focus>>();
    const port = {
      pointOfView(target?: Focus) {
        if (target) {
          position = { ...position, ...target };
          samples.set(now, { ...position });
        }
        return position;
      },
    };
    const tour = new CameraFlyover();
    tour.start(
      port,
      [
        { lat: 10, lng: 20, altitude: 0.8 },
        { lat: -20, lng: 100, altitude: 0.6 },
      ],
      false,
    );
    for (now = 10; now <= 15010; now += 10) {
      const frame = [...callbacks.values()];
      callbacks.clear();
      for (const callback of frame) callback(now);
    }
    for (const time of [3000, 9000, 15000]) {
      const before = samples.get(time - 10)!,
        join = samples.get(time)!,
        after = samples.get(time + 10)!;
      const speed = Math.hypot(
        (after.lat - join.lat) / 10,
        (after.lng - join.lng) / 10,
      );
      expect(speed).toBeGreaterThan(0.0001);
      for (const axis of ["lat", "lng", "altitude"] as const) {
        expect((after[axis] - join[axis]) / 10).toBeCloseTo(
          (join[axis] - before[axis]) / 10,
          5,
        );
      }
      expect((after.altitude - join.altitude) / 10).toBeCloseTo(0, 5);
    }
    tour.cancel();
  });

  it("holds globe scale while the tray starts moving, then grows at most eight percent", () => {
    let callback: FrameRequestCallback = () => {};
    vi.stubGlobal("performance", { now: () => 0 });
    vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => {
      callback = fn;
      return 7;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    let position: Required<Focus> = {
      lat: 20,
      lng: 80,
      altitude: worldAltitude(440, 385, true),
    };
    const port = {
      pointOfView(target?: Focus) {
        if (target) position = { ...position, ...target };
        return position;
      },
    };
    const radius = (height: number) =>
      height * Math.tan(Math.asin(1 / (position.altitude + 1)));
    const initial = radius(385);
    const resize = new ViewportResize();
    resize.start(port, { width: 440, height: 385 }, true, true);
    resize.resize(440, 600);
    callback(160);
    expect(radius(600)).toBeCloseTo(initial);
    expect(position.lat).toBe(20);
    expect(position.lng).toBe(80);
    resize.resize(440, 800);
    callback(540);
    expect(radius(800)).toBeGreaterThan(initial);
    expect(radius(800)).toBeLessThan(initial * 1.08);
    callback(900);
    expect(radius(800)).toBeCloseTo(initial * 1.08);
    expect(resize.active).toBe(false);
  });
  it("preserves a close zoom on enlargement and allows interaction to interrupt resizing", () => {
    let callback: FrameRequestCallback = () => {};
    vi.stubGlobal("performance", { now: () => 0 });
    vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => {
      callback = fn;
      return 7;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    let position: Required<Focus> = { lat: 40, lng: -85, altitude: 0.5 };
    const port = {
      pointOfView(target?: Focus) {
        if (target) position = { ...position, ...target };
        return position;
      },
    };
    const resize = new ViewportResize();
    resize.start(port, { width: 440, height: 385 }, false, true);
    resize.resize(440, 800);
    callback(400);
    const before = { ...position };
    resize.cancel();
    callback(900);
    expect(position).toEqual(before);
    expect(resize.active).toBe(false);
    const oldRadius = 385 * Math.tan(Math.asin(1 / 1.5));
    const newRadius = 800 * Math.tan(Math.asin(1 / (position.altitude + 1)));
    expect(newRadius).toBeCloseTo(oldRadius);
  });
  it("softens the first 90ms without a pause and still settles exactly at the target", () => {
    let callback: FrameRequestCallback = () => {};
    let position: Required<Focus> = { lat: 0, lng: 0, altitude: 1 };
    vi.stubGlobal("performance", { now: () => 0 });
    vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => {
      callback = fn;
      return 7;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const port = {
      pointOfView: (target?: Focus) => {
        if (target) position = { ...position, ...target };
        return position;
      },
    };
    new CameraTravel().move(port, { lat: 30, lng: 90, altitude: 0.8 }, false);
    callback(16);
    // Still responds on frame one, but begins more gently than pure ease-out.
    const firstProgress = position.lng;
    expect(firstProgress).toBeGreaterThan((90 * 16) / 1100 / 2);
    expect(firstProgress).toBeLessThan(90 * (16 / 1100) * (2 - 16 / 1100));
    expect(position.lat).toBeGreaterThan(0);
    callback(32);
    expect(position.lng - firstProgress).toBeGreaterThan(firstProgress);
    for (let time = 48; time <= 96; time += 16) callback(time);
    expect(position.lng).toBeCloseTo(90 * (96 / 1100) * (2 - 96 / 1100), 10);
    for (let time = 112; time <= 1120; time += 16) callback(time);
    expect(position.lat).toBe(30);
    expect(position.lng).toBe(90);
    expect(position.altitude).toBeCloseTo(0.8, 12);
  });
  it("crosses the antimeridian by the shortest route", () => {
    expect(shortestLongitude(179, -179)).toBe(181);
    expect(shortestLongitude(-179, 179)).toBe(-181);
    expect(shortestLongitude(720, 10) - 720).toBe(10);
  });
  it("frames both Ethiopia and Brazil with a spherical midpoint", () => {
    const focus = routeFocus({ lat: 9, lng: 40 }, { lat: -12, lng: -52 });
    expect(focus.lng).toBeGreaterThan(-52);
    expect(focus.lng).toBeLessThan(40);
    expect(Math.abs(focus.lat)).toBeLessThan(10);
    expect(focus.altitude).toBeGreaterThan(1);
  });
  it("adjusts full-globe distance for a portrait viewport", () => {
    expect(worldAltitude(390, 680)).toBeGreaterThan(worldAltitude(1440, 900));
    expect(worldAltitude(320, 680)).toBeLessThanOrEqual(5.5);
  });
  it("fills the mobile map stage with a small margin and still fits a tall expanded stage", () => {
    const stageAltitude = worldAltitude(440, 385, true);
    const angularRadius = Math.asin(1 / (stageAltitude + 1));
    expect(
      Math.tan(angularRadius) / Math.tan((25 * Math.PI) / 180),
    ).toBeCloseTo(0.96);
    expect(stageAltitude).toBeLessThan(worldAltitude(440, 385));
    expect(worldAltitude(440, 490, true)).toBeGreaterThan(stageAltitude);
    expect(worldAltitude(440, 800, true)).toBeGreaterThan(
      worldAltitude(440, 490, true),
    );
  });
  it("extends the mobile frustum behind both bars without shifting or enlarging the globe", () => {
    const width = 440,
      frameHeight = 385,
      top = 56,
      bottom = 46;
    const height = top + frameHeight + bottom;
    const projection = viewportProjection(height, frameHeight, top);
    const original = new PerspectiveCamera(50, width / frameHeight, 1, 2000);
    const extended = new PerspectiveCamera(
      projection.fov,
      width / height,
      1,
      2000,
    );
    extended.setViewOffset(
      width,
      height,
      0,
      -projection.offsetY,
      width,
      height,
    );
    const pixels = (
      point: Vector3,
      camera: PerspectiveCamera,
      canvasHeight: number,
    ) => {
      const p = point.clone().project(camera);
      return { x: ((p.x + 1) * width) / 2, y: ((1 - p.y) * canvasHeight) / 2 };
    };
    // Preserve framing at the default distance and after a close zoom.
    for (const distance of [
      100 * (worldAltitude(width, frameHeight, true) + 1),
      125,
    ]) {
      for (const camera of [original, extended]) {
        camera.position.z = distance;
        camera.updateMatrixWorld();
      }
      for (const point of [
        new Vector3(),
        new Vector3(70, 70, 20),
        new Vector3(-70, -70, 20),
      ]) {
        const before = pixels(point, original, frameHeight);
        const after = pixels(point, extended, height);
        expect(after.x).toBeCloseTo(before.x, 8);
        expect(after.y).toBeCloseTo(top + before.y, 8);
      }
    }
    // These zoomed surface points used to be clipped at the map's edges.
    for (const y of [65, -65]) {
      const p = pixels(new Vector3(0, y, 0), extended, height);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(height);
      expect(p.y < top || p.y > top + frameHeight).toBe(true);
    }
    expect(viewportProjection(900).fov).toBeCloseTo(50);
    expect(viewportProjection(900).offsetY).toBe(0);
  });
  it("interrupts camera movement at its current position and starts new travel there", () => {
    let callback: FrameRequestCallback = () => {},
      position: Required<Focus> = { lat: 0, lng: 179, altitude: 1 };
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((fn) => {
        callback = fn;
        return 7;
      }),
    );
    const cancel = vi.fn();
    vi.stubGlobal("cancelAnimationFrame", cancel);
    const port = {
      pointOfView: vi.fn((target?: Focus) => {
        if (target) position = { ...position, ...target };
        return position;
      }),
    };
    const travel = new CameraTravel();
    expect(travel.active).toBe(false);
    travel.move(port, { lat: 10, lng: -179, altitude: 0.5 }, false);
    expect(travel.active).toBe(true);
    callback(performance.now() + 550);
    const interrupted = { ...position };
    expect(interrupted.lng).toBeGreaterThan(179);
    expect(interrupted.lng).toBeLessThan(181);
    travel.cancel();
    expect(travel.active).toBe(false);
    expect(position).toEqual(interrupted);
    expect(cancel).toHaveBeenCalledWith(7);
    travel.move(port, { lat: -10, lng: 0, altitude: 1 }, false);
    const start = performance.now();
    for (let time = 16; time <= 1120; time += 16) callback(start + time);
    expect(position.lat).toBe(-10);
    expect(travel.active).toBe(false);
  });
  it("does not jump ahead when selection or texture work delays an animation frame", () => {
    let callback: FrameRequestCallback = () => {},
      position: Required<Focus> = { lat: 0, lng: 0, altitude: 1 };
    vi.stubGlobal("performance", { now: () => 0 });
    vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => {
      callback = fn;
      return 7;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    new CameraTravel().move(
      {
        pointOfView: (target?: Focus) => {
          if (target) position = { ...position, ...target };
          return position;
        },
      },
      { lat: 30, lng: 90, altitude: 0.8 },
      false,
    );
    callback(250);
    expect(position.lng).toBeGreaterThan(0);
    expect(position.lng).toBeLessThan(3);
    const previous = position.lng;
    callback(500);
    expect(position.lng - previous).toBeLessThan(6);
  });
  it("settles at the destination when reduced motion is enabled during travel", () => {
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn(() => 7),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const port = {
      pointOfView: vi.fn((target?: Focus) => ({
        ...target,
        lat: target?.lat ?? 0,
        lng: target?.lng ?? 0,
        altitude: target?.altitude ?? 1,
      })),
    };
    const travel = new CameraTravel();
    travel.move(port, { lat: 9, lng: 40, altitude: 0.62 }, false);
    travel.settle();
    expect(port.pointOfView).toHaveBeenLastCalledWith(
      { lat: 9, lng: 40, altitude: 0.62 },
      0,
    );
  });
  it("applies reduced-motion travel immediately with no animation", () => {
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const request = vi.fn();
    vi.stubGlobal("requestAnimationFrame", request);
    const port = {
      pointOfView: vi.fn((target?: Focus) => ({
        ...target,
        lat: target?.lat ?? 0,
        lng: target?.lng ?? 0,
        altitude: target?.altitude ?? 1,
      })),
    };
    new CameraTravel().move(port, { lat: 9, lng: 40, altitude: 0.62 }, true);
    expect(request).not.toHaveBeenCalled();
    expect(port.pointOfView).toHaveBeenLastCalledWith(
      { lat: 9, lng: 40, altitude: 0.62 },
      0,
    );
  });
});
describe("semantic visual states", () => {
  it("keeps persistent fill while hover changes the exact outline", () => {
    for (const state of [
      "selected",
      "visited",
      "correct",
      "incorrect",
    ] as const) {
      expect(regionStyle(state, true).fill).toBe(stateStyles[state].fill);
      expect(regionStyle(state, true).stroke).toBe(stateStyles.hover.stroke);
      expect(regionStyle(state, false)).toEqual(stateStyles[state]);
    }
  });
  it("leaves disabled regions muted under hover", () => {
    expect(regionStyle("disabled", true)).toEqual(stateStyles.disabled);
    expect(regionStyle("default", true).fill).toBe(stateStyles.hover.fill);
  });
});
