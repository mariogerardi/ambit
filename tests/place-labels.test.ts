// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PerspectiveCamera,
  SRGBColorSpace,
  Raycaster,
  Vector3,
  Sprite,
} from "three";
import {
  PlaceLabels,
  placeStyle,
  placeMarkerSize,
  placeDetailVisible,
  countryCityLimit,
  placeHorizonVisible,
  physicalNameLimit,
  placeLabelStyle,
} from "../src/globe/placeLabels";
import {
  MAP_ANNOTATION_ALTITUDE,
  MAP_SURFACE_ALTITUDE,
} from "../src/globe/surface";
import { ANSWER_PLACES } from "../src/game/answerTargets";
import { playRegionStyle } from "../src/globe/themes";
import { playColors } from "../src/theme/playColors";
import { cityReference } from "../src/game/authoredPlaces";
import type { PlaceFeature } from "../src/geography/types";
import {
  PhysicalFeatures,
  physicalLinePositions,
  physicalSurfaceAltitude,
} from "../src/globe/physicalFeatures";
const places: PlaceFeature[] = [
  {
    id: "a",
    name: "First capital",
    kind: "capital",
    lat: 0,
    lng: 0,
    sourceId: "test",
  },
  {
    id: "b",
    name: "Second capital",
    kind: "capital",
    lat: 0,
    lng: 180,
    sourceId: "test",
  },
];
function canvasFactory() {
  const createElement = vi.fn(() => ({
    width: 0,
    height: 0,
    getContext: () => ({
      measureText: (text: string) => ({ width: text.length * 14 }),
      strokeText() {},
      fillText() {},
      clearRect() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      bezierCurveTo() {},
      closePath() {},
      arc() {},
      stroke() {},
      fill() {},
      fillRect() {},
    }),
  }));
  vi.stubGlobal("document", { createElement });
  return createElement;
}
const camera = () => {
  const c = new PerspectiveCamera(50, 1, 1, 1000);
  c.position.set(0, 0, 300);
  c.lookAt(0, 0, 0);
  c.updateMatrixWorld();
  return c;
};
afterEach(() => vi.unstubAllGlobals());
describe("cached readable place labels", () => {
  it("keeps an inspected small city visible and selectable at world zoom without making it a quiz answer target", () => {
    canvasFactory();
    const labels = new PlaceLabels();
    const inspected: PlaceFeature = {
      id: "inspection",
      name: "Small city",
      kind: "city",
      lat: 0,
      lng: 0,
      sourceId: "test",
      population: 20,
      inspectionSelected: true,
      priority: 1e9,
      visualState: "selected",
      labelFlexible: true,
    };
    const normal = { ...inspected, id: "context", inspectionSelected: false };
    expect(placeDetailVisible(normal, 2)).toBe(false);
    expect(placeDetailVisible(inspected, 2)).toBe(true);
    labels.update(
      {
        id: "places",
        kind: "place-labels",
        places: [inspected],
        visible: true,
        markers: true,
        contextual: true,
      },
      100,
    );
    labels.view(camera(), 700, 700);
    expect(
      labels.group.children
        .filter(
          (child) => child.visible && child.userData.placeId === inspected.id,
        )
        .map((child) => child.userData.role)
        .sort(),
    ).toEqual(["label", "marker"]);
    expect(labels.pick(350, 350)).toBe(inspected);
    expect(inspected.answerTarget).toBeUndefined();
    labels.dispose();
  });
  it.each([0.42, 0.85, 1.35])(
    "keeps Pretoria and Johannesburg labels clear of both reference dots at altitude %s",
    (altitude) => {
      canvasFactory();
      const labels = new PlaceLabels();
      const references = ["place:964137", "place:993800"].map((id) =>
        cityReference(ANSWER_PLACES.get(id)!),
      );
      labels.update(
        {
          id: "nearby-references",
          kind: "place-labels",
          visible: true,
          markers: true,
          places: references,
        },
        100,
      );
      const c = camera();
      c.aspect = 1.5;
      c.updateProjectionMatrix();
      const phi = (-28.5 * Math.PI) / 180,
        theta = (25 * Math.PI) / 180,
        distance = 100 * (1 + altitude);
      c.position.set(
        Math.cos(phi) * Math.sin(theta) * distance,
        Math.sin(phi) * distance,
        Math.cos(phi) * Math.cos(theta) * distance,
      );
      c.lookAt(0, 0, 0);
      c.updateMatrixWorld();
      labels.view(c, 1200, 800);
      const shown = labels.group.children.filter(
        (sprite) => sprite.visible && sprite.userData.role === "label",
      );
      expect(shown.map((sprite) => sprite.userData.labelName).sort()).toEqual([
        "Johannesburg",
        "Pretoria",
      ]);
      const dots = labels.group.children
        .filter((sprite) => sprite.visible && sprite.userData.role === "marker")
        .map((sprite) => {
          const position = sprite.position.clone().project(c);
          return { x: (position.x + 1) * 600, y: (1 - position.y) * 400 };
        });
      for (const box of labels.labelBoxes())
        for (const dot of dots)
          expect(
            box.left < dot.x + 8 &&
              box.right > dot.x - 8 &&
              box.top < dot.y + 8 &&
              box.bottom > dot.y - 8,
          ).toBe(false);
      const boxes = labels.labelBoxes().map((box) => ({ ...box }));
      labels.view(c, 1200, 800);
      expect(labels.labelBoxes()).toEqual(boxes);
      labels.dispose();
    },
  );
  it("renders response badges without adding pick targets or intercepting country raycasts", () => {
    canvasFactory();
    const labels = new PlaceLabels();
    labels.update(
      {
        id: "response",
        kind: "place-labels",
        visible: false,
        markers: true,
        places: [
          {
            ...places[0],
            name: "",
            kind: "other",
            markerRole: "annotation",
            markerBadge: "✓",
            visualState: "selected",
            markerSize: 26,
          },
        ],
      },
      100,
    );
    labels.view(camera(), 800, 800);
    expect(labels.group.children.some((child) => child.visible)).toBe(true);
    expect(labels.pick(400, 400)).toBeUndefined();
    labels.group.updateMatrixWorld(true);
    const ray = new Raycaster(new Vector3(0, 0, 300), new Vector3(0, 0, -1));
    expect(ray.intersectObjects([labels.group], true)).toEqual([]);
    labels.dispose();
  });
  it("outlines contextual city dots so they remain visible on the same-colored land", () => {
    const context = {
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillStyle: "",
      strokeStyle: "",
    };
    vi.stubGlobal("document", {
      createElement: () => ({ width: 0, height: 0, getContext: () => context }),
    });
    const labels = new PlaceLabels();
    labels.update(
      {
        id: "context",
        kind: "place-labels",
        visible: false,
        markers: true,
        places: [
          { ...places[0], kind: "city", visualState: "hinted", markerSize: 24 },
        ],
      },
      100,
    );
    labels.view(camera(), 800, 800);
    expect(context.fillStyle).toBe(playColors().hinted);
    expect(context.strokeStyle).toBe("#071524");
    expect(context.stroke).toHaveBeenCalledOnce();
    expect(
      labels.group.children.filter(
        (sprite) => sprite.visible && sprite.userData.role === "marker",
      ),
    ).toHaveLength(1);
    labels.dispose();
  });
  it("shows country and capital names together without giving label-only countries a marker", () => {
    canvasFactory();
    const labels = new PlaceLabels();
    const country: PlaceFeature = {
      id: "country",
      name: "Land",
      kind: "landform",
      lat: 0,
      lng: -15,
      sourceId: "test",
      markerHidden: true,
    };
    const capital: PlaceFeature = {
      ...places[0],
      name: "Place",
      lng: 15,
    };
    const layer = {
      id: "test",
      kind: "place-labels" as const,
      visible: true,
      markers: true,
      contextual: true,
      density: "study" as const,
      places: [country, capital],
    };
    labels.update(layer, 100);
    labels.view(camera(), 800, 800);
    const visible = () =>
      labels.group.children.filter((child) => child.visible);
    expect(
      visible()
        .filter((child) => child.userData.role === "marker")
        .map((child) => child.userData.placeId),
    ).toEqual([capital.id]);
    expect(
      visible().filter((child) => child.userData.role !== "marker"),
    ).toHaveLength(2);
    labels.update(
      { ...layer, places: [country, { ...capital, labelHidden: true }] },
      100,
    );
    labels.view(camera(), 800, 800);
    expect(
      visible().filter((child) => child.userData.role !== "marker"),
    ).toHaveLength(1);
    labels.dispose();
  });
  it("uses identical typography for capital and non-capital answer targets", () => {
    const capital = {
      ...ANSWER_PLACES.get("place:964137")!,
      answerTarget: true,
    };
    const city = { ...ANSWER_PLACES.get("place:993800")!, answerTarget: true };
    expect(placeLabelStyle(capital)).toEqual(placeLabelStyle(city));
    expect(placeLabelStyle(capital)).toEqual(placeStyle("city"));
  });
  it.each([
    {
      title: "Brazil reveal",
      lat: -15,
      lng: -51,
      altitude: 0.82,
      ids: ["3469058", "3451190", "3448439", "3450554", "3470127", "3663517"],
    },
    {
      title: "South Africa question",
      lat: -28.5,
      lng: 25,
      altitude: 0.42,
      ids: ["964137", "3369157", "1018725", "993800", "1007311", "964420"],
    },
  ])(
    "places all six authored names without overlap in $title",
    ({ lat, lng, altitude, ids }) => {
      canvasFactory();
      const labels = new PlaceLabels();
      const targets = ids.map((id, i) => ({
        ...ANSWER_PLACES.get(`place:${id}`)!,
        answerTarget: true,
        priority: i === 0 ? 100 : i === 1 ? 90 : 0,
      }));
      labels.update(
        {
          id: "answers",
          kind: "place-labels",
          places: targets,
          visible: true,
          markers: true,
        },
        100,
      );
      const c = camera();
      c.aspect = 1.5;
      c.updateProjectionMatrix();
      const phi = (lat * Math.PI) / 180,
        theta = (lng * Math.PI) / 180,
        distance = 100 * (1 + altitude);
      c.position.set(
        Math.cos(phi) * Math.sin(theta) * distance,
        Math.sin(phi) * distance,
        Math.cos(phi) * Math.cos(theta) * distance,
      );
      c.lookAt(0, 0, 0);
      c.updateMatrixWorld();
      labels.view(c, 1200, 800);
      const shown = labels.group.children.filter(
        (p) => p.visible && p.userData.role === "label",
      );
      expect(shown.map((p) => p.userData.labelName).sort()).toEqual(
        targets.map((p) => p.name).sort(),
      );
      const boxes = labels.labelBoxes();
      for (const [i, a] of boxes.entries())
        for (const b of boxes.slice(i + 1))
          expect(
            a.left < b.right &&
              a.right > b.left &&
              a.top < b.bottom &&
              a.bottom > b.top,
          ).toBe(false);
      const textures = labels.group.children.filter(
        (p) => p.userData.role === "label",
      );
      labels.view(c, 1200, 800);
      expect(
        labels.group.children.filter((p) => p.userData.role === "label"),
      ).toEqual(textures);
      labels.dispose();
    },
  );
  it("renders anonymous city targets and pin symbols with cached semantic colors", () => {
    const factory = canvasFactory();
    const labels = new PlaceLabels();
    const anonymous: PlaceFeature = {
      ...places[0],
      name: "",
      labelHidden: true,
      hoverName: undefined,
      answerTarget: true,
      visualState: "selectable",
    };
    const pin: PlaceFeature = {
      ...places[0],
      id: "pin",
      kind: "pin",
      name: "Your pin",
      visualState: "selected",
      lng: 5,
    };
    labels.update(
      {
        id: "answer",
        kind: "place-labels",
        places: [anonymous, pin],
        visible: true,
        markers: true,
      },
      100,
    );
    labels.view(camera(), 1200, 1200);
    expect(
      labels.group.children
        .filter((p) => p.userData.role === "label")
        .map((p) => p.userData.labelName),
    ).toEqual(["Your pin"]);
    const marker = labels.group.children.find(
      (p) => p.userData.placeId === "a",
    )!;
    expect(marker.userData.markerStyle).toContain(playColors().selectable);
    expect(
      labels.group.children.find(
        (p) => p.userData.placeId === "pin" && p.userData.role === "marker",
      )!.userData.markerStyle,
    ).toContain("pin:");
    expect(
      labels.group.children.find(
        (p) => p.userData.placeId === "pin" && p.userData.role === "marker",
      )!.userData.markerStyle,
    ).toContain(playColors().selected);
    const before = factory.mock.calls.length;
    labels.update(
      {
        id: "answer",
        kind: "place-labels",
        places: [{ ...anonymous, visualState: "correct" }, pin],
        visible: true,
        markers: true,
      },
      100,
    );
    labels.view(camera(), 1200, 1200);
    expect(labels.group.children.find((p) => p.userData.placeId === "a")).toBe(
      marker,
    );
    expect(marker.userData.markerStyle).toContain(playColors().correct);
    expect(factory.mock.calls.length).toBe(before + 1); // one shared color texture, no blank-name textures
    labels.dispose();
  });
  it.each([
    "selectable",
    "selected",
    "correct",
    "answer",
    "incorrect",
    "visited",
    "hinted",
  ] as const)(
    "uses the shared %s point accent independently of reference area outlines",
    (state) => {
      canvasFactory();
      const labels = new PlaceLabels();
      labels.update(
        {
          id: "palette",
          kind: "place-labels",
          places: [{ ...places[0], visualState: state }],
          visible: true,
          markers: true,
        },
        100,
      );
      const marker = labels.group.children.find(
        (p) => p.userData.role === "marker",
      )!;
      expect(marker.userData.markerStyle).toContain(
        state === "hinted"
          ? playColors().hinted
          : playRegionStyle("wurl:TEST", state).fill,
      );
      labels.dispose();
    },
  );
  it("keeps terrain names ahead of overlapping rivers and cities and uses a visible regional anchor", () => {
    canvasFactory();
    const physical = new PhysicalFeatures();
    physical.update(
      {
        id: "physical",
        kind: "physical-features",
        features: [
          {
            id: "range",
            kind: "mountain",
            name: "A mountain range",
            lat: 0,
            lng: 180,
            rank: 2,
            labelAnchors: [
              [180, 0],
              [0, 0],
            ],
          },
          {
            id: "river",
            kind: "river",
            name: "Local river",
            lat: 0,
            lng: 0,
            rank: 0,
          },
        ],
      },
      100,
    );
    physical.view(camera(), 1200, 1200);
    const labels = physical.group.children[0].children.filter((s) => s.visible);
    expect(labels.map((s) => s.userData.labelName)).toContain(
      "A mountain range",
    );
    expect(labels.map((s) => s.userData.labelName)).not.toContain(
      "Local river",
    );
    const cities = new PlaceLabels();
    cities.update(
      {
        id: "cities",
        kind: "place-labels",
        places: [places[0]],
        visible: true,
        markers: true,
      },
      100,
    );
    cities.view(camera(), 1200, 1200, physical.labelBoxes());
    expect(cities.labelBoxes()).toHaveLength(0);
    expect(
      cities.group.children.find((s) => s.userData.role === "marker")?.visible,
    ).toBe(true);
    physical.dispose();
    cities.dispose();
  });
  it("drapes finely sampled rivers just above the land surface", () => {
    expect(physicalSurfaceAltitude).toBeGreaterThan(0.0015);
    expect(physicalSurfaceAltitude).toBeLessThan(0.002);
    const radius = 100 * (1 + physicalSurfaceAltitude);
    const positions = physicalLinePositions(
      [
        [
          [0, 0],
          [2, 0],
        ],
      ],
      radius,
    );
    expect(positions.length).toBeGreaterThanOrEqual(8 * 6);
    for (let i = 0; i < positions.length; i += 3)
      expect(
        Math.hypot(positions[i], positions[i + 1], positions[i + 2]),
      ).toBeCloseTo(radius, 4);
  });
  it("spreads new context-label textures across frames and eventually settles", () => {
    const create = canvasFactory(),
      labels = new PlaceLabels();
    labels.update(
      {
        id: "cities",
        kind: "place-labels",
        visible: true,
        contextual: true,
        places: Array.from({ length: 12 }, (_, i) => ({
          ...places[0],
          id: `city:${i}`,
          name: `City ${i}`,
          kind: "city",
          population: 3_000_000,
          lat: (Math.floor(i / 4) - 1) * 18,
          lng: ((i % 4) - 1.5) * 22,
        })),
      },
      100,
    );
    labels.view(camera(), 1600, 1600);
    expect(create.mock.calls.length).toBeLessThanOrEqual(4);
    expect(labels.needsRefresh()).toBe(true);
    for (let frame = 0; frame < 8; frame++) labels.view(camera(), 1600, 1600);
    expect(labels.needsRefresh()).toBe(false);
    expect(labels.labelBoxes().length).toBeGreaterThan(4);
    labels.dispose();
  });
  it("caps river names at broad/regional/local zoom and labels duplicate segments only once", () => {
    expect([2, 0.8, 0.2].map((alt) => physicalNameLimit("river", alt))).toEqual(
      [2, 4, 6],
    );
    canvasFactory();
    const labels = new PlaceLabels();
    const rivers = Array.from({ length: 8 }, (_, i) => ({
      ...places[0],
      id: `river:${i}`,
      kind: "river" as const,
      name: i < 2 ? "One River" : `River ${i}`,
      lat: ((i % 3) - 1) * 18,
      lng: (i - 4) * 11,
    }));
    labels.update(
      {
        id: "rivers",
        kind: "place-labels",
        places: rivers,
        visible: true,
        markers: false,
        contextual: true,
        density: "physical",
      },
      100,
    );
    labels.view(camera(), 1200, 1200);
    const shown = labels.group.children.filter(
      (s) => s.visible && s.userData.role === "label",
    );
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.length).toBeLessThanOrEqual(2);
    expect(new Set(shown.map((s) => s.userData.labelName)).size).toBe(
      shown.length,
    );
    labels.dispose();
  });
  it("replaces a cached name when authored label content changes but keeps unchanged sprites", () => {
    canvasFactory();
    const labels = new PlaceLabels();
    const layer = {
      id: "test",
      kind: "place-labels" as const,
      places: [places[0]],
      visible: true,
      markers: true,
    };
    labels.update(layer, 100);
    const first = labels.group.children.find(
      (s) => s.userData.role === "label",
    )!;
    labels.update(
      { ...layer, places: [{ ...places[0], name: "Changed capital" }] },
      100,
    );
    const next = labels.group.children.find(
      (s) => s.userData.role === "label",
    )!;
    expect(next).not.toBe(first);
    expect(next.userData.labelName).toBe("Changed capital");
    labels.update(
      { ...layer, places: [{ ...places[0], name: "Changed capital" }] },
      100,
    );
    expect(labels.group.children.find((s) => s.userData.role === "label")).toBe(
      next,
    );
    labels.dispose();
  });
  it("keeps secondary annotations clear of already drawn city/capital names", () => {
    canvasFactory();
    const labels = new PlaceLabels();
    labels.update(
      {
        id: "test",
        kind: "place-labels",
        places: [places[0]],
        visible: true,
        markers: true,
      },
      100,
    );
    labels.view(camera(), 600, 600);
    expect(labels.labelBoxes()).toHaveLength(1);
    labels.view(camera(), 600, 600, [
      { left: 0, right: 600, top: 0, bottom: 600 },
    ]);
    expect(labels.labelBoxes()).toHaveLength(0);
    expect(
      labels.group.children.find((s) => s.userData.role === "marker")!.visible,
    ).toBe(true);
    labels.dispose();
  });
  it("insets context cities from the horizon at both world and close zoom without hiding authored clues", () => {
    for (const horizon of [0.333, 0.95]) {
      const edge = horizon + (1 - horizon) * 0.05;
      expect(placeHorizonVisible(edge, horizon, "city", true)).toBe(false);
      expect(placeHorizonVisible(edge, horizon, "capital", true)).toBe(false);
      expect(placeHorizonVisible(edge, horizon, "city", false)).toBe(true);
      expect(
        placeHorizonVisible(
          horizon + (1 - horizon) * 0.5,
          horizon,
          "city",
          true,
        ),
      ).toBe(true);
      expect(
        placeHorizonVisible(horizon - 0.01, horizon, "capital", false),
      ).toBe(false);
    }
  });
  it("creates each sprite/texture once and preserves it across hover-equivalent updates, movement, and visibility toggles", () => {
    const create = canvasFactory(),
      labels = new PlaceLabels();
    const data = {
      id: "label-layer",
      kind: "place-labels" as const,
      places,
      visible: true,
    };
    labels.update(data, 100);
    const [first, second] = labels.group.children;
    expect(create).toHaveBeenCalledTimes(2);
    for (let i = 0; i < 30; i++) {
      labels.update(data, 100);
      labels.view(camera(), 700, 700);
    }
    labels.update({ ...data, visible: false }, 100);
    expect(labels.group.visible).toBe(false);
    labels.update({ ...data, visible: true }, 100);
    expect(labels.group.children).toEqual([first, second]);
    expect(create).toHaveBeenCalledTimes(2);
    labels.dispose();
  });
  it("maintains readable screen size while zooming and culls the far side", () => {
    canvasFactory();
    const labels = new PlaceLabels();
    labels.update(
      { id: "label-layer", kind: "place-labels", places, visible: true },
      100,
    );
    const c = camera();
    labels.view(c, 700, 700);
    const first = labels.group.children[0];
    expect(first.visible).toBe(true);
    expect(labels.group.children[1].visible).toBe(false);
    const scale = first.scale.y;
    c.position.z = 150;
    c.updateMatrixWorld();
    labels.view(c, 700, 700);
    expect(first.scale.y).toBeLessThan(scale);
    expect(
      ((first.scale.y / first.position.distanceTo(c.position)) * 700) /
        (2 * Math.tan((c.fov * Math.PI) / 360)),
    ).toBeCloseTo(26);
    c.position.z = -300;
    c.lookAt(0, 0, 0);
    c.updateMatrixWorld();
    labels.view(c, 700, 700);
    expect(first.visible).toBe(false);
    expect(labels.group.children[1].visible).toBe(true);
    labels.dispose();
  });
  it("declutters overlapping text and frees its cached textures on disposal", () => {
    canvasFactory();
    const labels = new PlaceLabels();
    labels.update(
      {
        id: "label-layer",
        kind: "place-labels",
        places: [places[0], { ...places[0], id: "overlap" }],
        visible: true,
      },
      100,
    );
    labels.view(camera(), 700, 700);
    expect(labels.group.children.filter((child) => child.visible)).toHaveLength(
      1,
    );
    const sprite = labels.group.children[0] as import("three").Sprite;
    const dispose = vi.spyOn(sprite.material.map!, "dispose");
    labels.dispose();
    expect(dispose).toHaveBeenCalledOnce();
    expect(labels.group.children).toHaveLength(0);
  });
  it("uses fixed-size contrasting stars and city dots with neutral readable text", () => {
    const create = canvasFactory(),
      labels = new PlaceLabels();
    const data = {
      id: "places",
      kind: "place-labels" as const,
      places: [
        places[0],
        { ...places[0], id: "city", kind: "city" as const, lng: 20 },
      ],
      visible: true,
      markers: true,
    };
    labels.update(data, 100);
    const capitalLabel = labels.group.children[0] as import("three").Sprite;
    const capitalMarker = labels.group.children[1] as import("three").Sprite;
    const cityLabel = labels.group.children[2] as import("three").Sprite;
    const c = camera();
    labels.view(c, 700, 700);
    const pixelHeight = () =>
      ((capitalMarker.scale.y / (c.position.z - capitalMarker.position.z)) *
        700) /
      (2 * Math.tan((c.fov * Math.PI) / 360));
    expect(pixelHeight()).toBeCloseTo(30);
    c.position.z = 105;
    c.updateMatrixWorld();
    labels.view(c, 700, 700);
    expect(pixelHeight()).toBeCloseTo(30);
    expect(capitalMarker.material.depthTest).toBe(false);
    expect(capitalMarker.material.map?.colorSpace).toBe(SRGBColorSpace);
    expect(capitalLabel.material.depthTest).toBe(false);
    expect(capitalLabel.renderOrder).toBeGreaterThan(4);
    expect(placeStyle("capital").shape).toBe("star");
    expect(placeStyle("city").shape).toBe("circle");
    expect(placeStyle("capital").marker).not.toBe(placeStyle("city").marker);
    expect(placeStyle("capital").text).toBe(placeStyle("city").text);
    expect(placeStyle("capital").textHeight).toBeGreaterThan(
      placeStyle("city").textHeight,
    );
    expect(capitalLabel.material.map).not.toBe(cityLabel.material.map);
    const allocations = create.mock.calls.length;
    labels.update(data, 100);
    labels.view(c, 700, 700);
    expect(create).toHaveBeenCalledTimes(allocations);
    labels.dispose();
  });
  it("keeps markers independent of names and prevents far-side or disabled marker picks", () => {
    canvasFactory();
    const labels = new PlaceLabels();
    const data = {
      id: "places",
      kind: "place-labels" as const,
      places,
      visible: false,
      markers: true,
    };
    labels.update(data, 100);
    labels.view(camera(), 700, 700);
    expect(labels.group.children).toHaveLength(2);
    expect(labels.pick(350, 350)?.id).toBe("a");
    expect(labels.pick(370, 350)).toBeUndefined();
    expect(labels.pick(370, 350, 22)?.id).toBe("a");
    expect(labels.pick(373, 350, 22)).toBeUndefined();
    expect(labels.group.children[1].visible).toBe(false);
    labels.update({ ...data, markers: false }, 100);
    expect(labels.pick(350, 350)).toBeUndefined();
    labels.update({ ...data, visible: true, markers: false }, 100);
    labels.view(camera(), 700, 700);
    expect(labels.group.children).toHaveLength(2);
    expect(labels.pick(350, 350)).toBeUndefined();
    labels.dispose();
  });
  it("hides whole labels at viewport edges instead of cutting off their text", () => {
    canvasFactory();
    const labels = new PlaceLabels();
    labels.update(
      {
        id: "places",
        kind: "place-labels",
        places: [
          {
            ...places[0],
            lng: 55,
            name: "A very long city name right beside the screen edge",
          },
        ],
        visible: true,
        markers: true,
      },
      100,
    );
    labels.view(camera(), 700, 700);
    expect(labels.group.children[0].visible).toBe(false);
    expect(labels.group.children[1].visible).toBe(true);
    labels.dispose();
  });
});

describe("zoom-aware context places", () => {
  it("shows prominent places at world scale, reveals smaller ones up close, and creates only visible textures", () => {
    const create = canvasFactory(),
      labels = new PlaceLabels();
    const data = {
      id: "context",
      kind: "place-labels" as const,
      contextual: true,
      visible: true,
      markers: true,
      places: [
        { ...places[0], population: 2_000_000 },
        {
          ...places[0],
          id: "small",
          kind: "city" as const,
          lat: 0.5,
          population: 20_000,
        },
        { ...places[1], population: 10_000_000 },
      ],
    };
    labels.update(data, 100);
    expect(create).not.toHaveBeenCalled();
    const c = camera();
    labels.view(c, 700, 700);
    expect(create).toHaveBeenCalledTimes(2); // one star texture and one name, no far-side/small textures
    const capital = labels.group.children.find(
      (o) => o.userData.role === "marker",
    )!;
    expect(
      labels.group.children.some((o) => o.userData.placeId === "small"),
    ).toBe(false);
    expect(labels.pick(350, 350)?.id).toBe("a");
    c.position.z = 130;
    c.updateMatrixWorld();
    labels.view(c, 700, 700);
    const small = labels.group.children.find(
      (o) => o.userData.placeId === "small" && o.userData.role === "marker",
    )!;
    expect(small.visible).toBe(true);
    expect(capital.visible).toBe(true);
    const allocations = create.mock.calls.length;
    labels.view(c, 700, 700);
    expect(create).toHaveBeenCalledTimes(allocations);
    c.position.z = 300;
    c.updateMatrixWorld();
    labels.view(c, 700, 700);
    expect(small.visible).toBe(false);
    expect(
      labels.group.children.find(
        (o) => o.userData.placeId === "a" && o.userData.role === "marker",
      ),
    ).toBe(capital);
    labels.dispose();
  });
  it("bounds world clutter and leaves explicitly authored clue markers visible", () => {
    canvasFactory();
    const labels = new PlaceLabels(),
      c = camera();
    const dense = Array.from({ length: 100 }, (_, i) => ({
      ...places[0],
      id: `city-${i}`,
      kind: "city" as const,
      lat: -36 + Math.floor(i / 10) * 8,
      lng: -36 + (i % 10) * 8,
      population: 5_000_000,
    }));
    labels.update(
      {
        id: "context",
        kind: "place-labels",
        contextual: true,
        places: dense,
        visible: true,
        markers: true,
      },
      100,
    );
    labels.view(c, 700, 700);
    const visible = labels.group.children.filter((o) => o.visible);
    expect(
      visible.filter((o) => o.userData.role === "marker").length,
    ).toBeLessThanOrEqual(28);
    expect(
      visible.filter((o) => o.userData.role === "label").length,
    ).toBeLessThanOrEqual(14);
    expect(visible.length).toBeGreaterThan(0);
    labels.update(
      {
        id: "clue",
        kind: "place-labels",
        places: [{ ...places[0], population: 500 }],
        visible: true,
        markers: true,
      },
      100,
    );
    labels.view(c, 700, 700);
    expect(labels.pick(350, 350)?.id).toBe("a");
    labels.dispose();
  });
  it("uses black dots and slightly larger sizes for the largest cities", () => {
    const city = { ...places[0], kind: "city" as const, population: 300_000 };
    expect(placeStyle("city").marker).toBe("#101010");
    expect(
      placeMarkerSize({ ...city, population: 3_820_914 }, true),
    ).toBeLessThan(15);
    expect(placeStyle("city").textHeight).toBeGreaterThanOrEqual(24);
    expect(placeStyle("city").font).toContain("500 26px");
    expect(
      placeMarkerSize({ ...city, population: 3_820_914 }, true),
    ).toBeGreaterThan(placeMarkerSize(city, true));
    expect(placeDetailVisible(city, 1.65)).toBe(false);
    expect(placeDetailVisible({ ...city, population: 3_820_914 }, 1.65)).toBe(
      true,
    );
    expect(placeDetailVisible(city, 0.3)).toBe(true);
    expect(
      placeDetailVisible(
        { ...city, kind: "capital", population: 150_000 },
        0.8,
      ),
    ).toBe(true);
  });
  it("makes authored city and summit clues larger than dense background places", () => {
    const city = { ...places[0], kind: "city" as const, population: 300_000 };
    expect(placeMarkerSize(city)).toBeGreaterThan(placeMarkerSize(city, true));
    expect(placeMarkerSize({ ...city, kind: "mountain" })).toBeGreaterThan(
      placeMarkerSize(city, true),
    );
    expect(placeMarkerSize({ ...city, markerSize: 40 })).toBe(40);
  });
});

describe("city quotas and accented label textures", () => {
  it.each([
    [300, 3],
    [180, 6],
    [130, 10],
  ])(
    "caps each visible country's cities at camera distance %s, while keeping capitals",
    (distance, quota) => {
      canvasFactory();
      const labels = new PlaceLabels(),
        c = camera();
      c.position.z = distance;
      c.updateMatrixWorld();
      const cities = Array.from({ length: 30 }, (_, i) => ({
        ...places[0],
        id: `city-${i}`,
        kind: "city" as const,
        parentId: "wurl:CHN",
        lat: (Math.floor(i / 6) - 2) * 2,
        lng: ((i % 6) - 2.5) * 2,
        population: 20_000_000 - i,
      }));
      labels.update(
        {
          id: "cities",
          kind: "place-labels",
          contextual: true,
          places: [
            ...cities,
            {
              ...places[0],
              id: "capital",
              parentId: "wurl:CHN",
              population: 2_000_000,
            },
          ],
          visible: false,
          markers: true,
        },
        100,
      );
      labels.view(c, 700, 700);
      const visible = labels.group.children.filter(
        (p) => p.visible && p.userData.role === "marker",
      );
      expect(
        visible.filter((p) => p.userData.placeId.startsWith("city-")).length,
      ).toBe(quota);
      expect(visible.some((p) => p.userData.placeId === "capital")).toBe(true);
      expect(countryCityLimit(distance / 100 - 1)).toBe(quota);
      labels.dispose();
    },
  );
  it("pads accented glyph bounds, draws Unicode unchanged, and uses sRGB canvas colors", () => {
    const fillText = vi.fn();
    const metrics = {
      width: 80,
      actualBoundingBoxAscent: 40,
      actualBoundingBoxDescent: 12,
      actualBoundingBoxLeft: 4,
      actualBoundingBoxRight: 86,
    };
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        measureText: () => metrics,
        fillText,
        strokeText() {},
      }),
    };
    vi.stubGlobal("document", { createElement: () => canvas });
    const labels = new PlaceLabels();
    labels.update(
      {
        id: "name",
        kind: "place-labels",
        places: [{ ...places[0], name: "Ürümqi" }],
        visible: true,
      },
      100,
    );
    const [name, x, y] = fillText.mock.calls[0];
    expect(name).toBe("Ürümqi");
    expect(x - metrics.actualBoundingBoxLeft).toBeGreaterThanOrEqual(4);
    expect(x + metrics.actualBoundingBoxRight).toBeLessThanOrEqual(
      canvas.width - 4,
    );
    expect(y - metrics.actualBoundingBoxAscent).toBeGreaterThanOrEqual(4);
    expect(y + metrics.actualBoundingBoxDescent).toBeLessThanOrEqual(
      canvas.height - 4,
    );
    const label = labels.group.children[0] as import("three").Sprite;
    expect(label.material.map?.colorSpace).toBe(SRGBColorSpace);
    labels.dispose();
  });
});

it("uses contrasting river ink and casing, including after a palette change with unchanged geography", () => {
  const physical = new PhysicalFeatures();
  const layer = {
    id: "physical",
    kind: "physical-features" as const,
    features: [
      {
        id: "river",
        kind: "river" as const,
        name: "Danube",
        lat: 48,
        lng: 9,
        rank: 2,
        paths: [
          [
            [8, 48],
            [9, 48],
          ],
        ],
        color: "#72b9d2",
      },
    ],
  };
  const visibleLines = () =>
    physical.group.children.filter(
      (o) => o.type === "LineSegments2" && o.visible,
    ) as unknown as {
      material: { color: { getHexString(): string }; linewidth: number };
      renderOrder: number;
    }[];
  for (const palette of ["dusk", "survey", "paper"] as const) {
    physical.update({ ...layer, palette }, 100);
    const lines = visibleLines();
    expect(lines).toHaveLength(2);
    const ink = lines.find(
      (l) =>
        `#${l.material.color.getHexString()}` === playColors(palette).river,
    )!;
    const casing = lines.find(
      (l) =>
        `#${l.material.color.getHexString()}` ===
        playColors(palette)["river-casing"],
    )!;
    expect(ink).toBeDefined();
    expect(ink.material.linewidth).toBeCloseTo(1.62);
    expect(casing).toBeDefined();
    expect(casing.material.linewidth - ink.material.linewidth).toBeCloseTo(0.5);
    expect(ink.renderOrder).toBeGreaterThan(casing.renderOrder);
  }
  physical.dispose();
});

it("keeps smaller local island labels fixed to the shore as the camera pans", () => {
  canvasFactory();
  const labels = new PlaceLabels();
  const place: PlaceFeature = {
    ...places[0],
    id: "key-island",
    kind: "other",
    name: "Key island",
    lng: 0.03,
    markerHidden: true,
    surfaceAligned: true,
    labelScale: 0.8,
  };
  labels.update(
    {
      id: "islands",
      kind: "place-labels",
      places: [place],
      visible: true,
      markers: false,
    },
    100,
  );
  const c = new PerspectiveCamera(50, 1, 0.001, 1000);
  for (const offset of [-0.01, 0, 0.01]) {
    const a = (offset * Math.PI) / 180;
    c.position.set(Math.sin(a) * 100.6, 0, Math.cos(a) * 100.6);
    c.lookAt(0, 0, 0);
    c.updateMatrixWorld();
    labels.view(c, 1000, 1000);
    const label = labels.group.children.find(
      (s) => s.userData.role === "label",
    )! as Sprite;
    expect(label.visible).toBe(true);
    expect(label.position.length()).toBeCloseTo(
      100 * (1 + MAP_ANNOTATION_ALTITUDE),
      6,
    );
    const shore = label.position
      .clone()
      .normalize()
      .multiplyScalar(100 * (1 + MAP_SURFACE_ALTITUDE))
      .project(c);
    const actual = label.position.clone().project(c);
    expect(actual.distanceTo(shore) * 500).toBeLessThan(2);
    expect(label.center.x).toBe(0.5);
    expect(label.center.y).toBe(0.5);
  }
  expect(placeLabelStyle(place).textHeight).toBeCloseTo(19.2);
  labels.dispose();
});

it("gives an answer name space before compact monospaced score annotations", () => {
  canvasFactory();
  const labels = new PlaceLabels();
  const target: PlaceFeature = {
    ...places[0],
    id: "answer",
    name: "Córdoba",
    kind: "pin",
    markerRole: "target",
    labelFlexible: true,
    priority: 1000,
  };
  const bands: PlaceFeature[] = Array.from({ length: 10 }, (_, index) => ({
    ...places[0],
    id: `band:${index}`,
    name: String(1000 - index * 100),
    markerHidden: true,
    priority: 90,
    labelTypography: "numeric",
  }));
  labels.update(
    {
      id: "pinpoint",
      kind: "place-labels",
      places: [...bands, target],
      visible: true,
    },
    100,
  );
  labels.view(camera(), 800, 800);
  const name = labels.group.children.find(
    (s) => s.userData.role === "label" && s.userData.placeId === target.id,
  )!;
  expect(name.visible).toBe(true);
  expect(placeLabelStyle(bands[0]).font).toContain("monospace");
  expect(placeLabelStyle(bands[0]).textHeight).toBeLessThan(
    placeLabelStyle(target).textHeight,
  );
  labels.dispose();
});

it("anchors start and finish flags at the bottom of their poles", () => {
  canvasFactory();
  const labels = new PlaceLabels();
  labels.update(
    {
      id: "flags",
      kind: "place-labels",
      visible: true,
      markers: true,
      places: ["start", "finish"].map((markerRole, i) => ({
        ...places[0],
        id: `flag:${i}`,
        kind: "other" as const,
        lng: i * 10,
        markerRole: markerRole as "start" | "finish",
        markerSize: 44,
        labelHidden: true,
      })),
    },
    100,
  );
  labels.view(camera(), 800, 800);
  const markers = labels.group.children.filter(
    (c) => c instanceof Sprite && c.userData.role === "marker",
  ) as Sprite[];
  expect(markers).toHaveLength(2);
  expect(
    markers.every((m) => m.center.x === 0.25 && m.center.y === 6 / 64),
  ).toBe(true);
  labels.dispose();
});

it("reserves flag space above island rings and fades newly introduced crossing markers", () => {
  canvasFactory();
  const labels = new PlaceLabels(),
    c = camera();
  const start = {
    ...places[0],
    kind: "other" as const,
    markerRole: "start" as const,
    markerSize: 44,
    labelHidden: true,
  };
  const clock = vi.spyOn(performance, "now").mockReturnValue(0);
  labels.update(
    {
      id: "flags",
      kind: "place-labels",
      visible: true,
      markers: true,
      places: [start],
    },
    100,
  );
  const box = labels.priorityMarkerBoxes(c, 800, 800)[0];
  expect(box.left).toBeLessThan(400);
  expect(box.right).toBeGreaterThan(400);
  expect(box.top).toBeLessThan(365);
  expect(box.bottom).toBeGreaterThan(400);
  const crossing = {
    ...places[0],
    id: "crossing",
    kind: "other" as const,
    markerBadge: "1",
    fadeInMs: 180,
    labelHidden: true,
  };
  labels.update(
    {
      id: "flags",
      kind: "place-labels",
      visible: true,
      markers: true,
      places: [start, crossing],
    },
    100,
  );
  labels.view(c, 800, 800);
  const marker = labels.group.children.find(
    (o) => o.userData.placeId === crossing.id && o.userData.role === "marker",
  ) as Sprite;
  expect(marker.material.opacity).toBe(0);
  expect(labels.needsRefresh()).toBe(true);
  clock.mockReturnValue(90);
  labels.view(c, 800, 800);
  expect(marker.material.opacity).toBeCloseTo(0.5);
  // The flag has an independent material and stays fully visible.
  const flag = labels.group.children.find(
    (o) => o.userData.placeId === start.id && o.userData.role === "marker",
  ) as Sprite;
  expect(flag.material.opacity).toBe(1);
  clock.mockReturnValue(180);
  labels.view(c, 800, 800);
  expect(marker.material.opacity).toBe(1);
  expect(labels.needsRefresh()).toBe(false);
  labels.dispose();
  clock.mockRestore();
});

it("keeps Survey's place typography and marker shapes while adapting ink to graphite land", () => {
  for (const kind of ["city", "capital", "pin"] as const) {
    const original = placeStyle(kind, "ocean");
    const survey = placeStyle(kind, "survey");
    expect(survey.font).toBe(original.font);
    expect(survey.textHeight).toBe(original.textHeight);
    expect(survey.shape).toBe(original.shape);
    expect(survey.marker).not.toBe(original.marker);
  }
});

it("refreshes cached label ink when switching to Survey with unchanged places", () => {
  canvasFactory();
  const labels = new PlaceLabels();
  const layer = {
    id: "labels",
    kind: "place-labels" as const,
    places,
    visible: true,
  };
  labels.update({ ...layer, palette: "ocean" }, 100);
  const original = labels.group.children[0] as Sprite;
  const dispose = vi.spyOn(original.material, "dispose");
  labels.update({ ...layer, palette: "survey" }, 100);
  const survey = labels.group.children[0] as Sprite;
  expect(survey).not.toBe(original);
  expect(dispose).toHaveBeenCalledOnce();
  expect(survey.userData.labelColor).toBe(placeStyle("capital", "survey").text);
  labels.update({ ...layer, palette: "survey" }, 100);
  expect(labels.group.children[0]).toBe(survey);
  labels.dispose();
});

it("drops a pin vertically into its anchor and preserves its progress when feedback changes its color", () => {
  canvasFactory();
  const clock = vi.spyOn(performance, "now").mockReturnValue(0);
  const labels = new PlaceLabels(),
    c = camera();
  const pin: PlaceFeature = {
    ...places[0],
    kind: "pin",
    labelHidden: true,
    dropInMs: 340,
  };
  const layer = {
    id: "drop",
    kind: "place-labels" as const,
    visible: true,
    markers: true,
    places: [pin],
  };
  labels.update(layer, 100);
  labels.view(c, 800, 800);
  const marker = () =>
    labels.group.children.find((o) => o.userData.role === "marker") as Sprite;
  const start = marker().position.y;
  expect(start).toBeGreaterThan(0);
  expect(marker().material.opacity).toBe(0);
  clock.mockReturnValue(170);
  labels.view(c, 800, 800);
  const middle = marker().position.y;
  expect(middle).toBeLessThan(start);
  labels.update(
    { ...layer, places: [{ ...pin, visualState: "correct" }] },
    100,
  );
  labels.view(c, 800, 800);
  expect(marker().position.y).toBeCloseTo(middle);
  clock.mockReturnValue(340);
  labels.view(c, 800, 800);
  expect(marker().position.y).toBeCloseTo(0);
  expect(marker().material.opacity).toBe(1);
  expect(labels.needsRefresh()).toBe(false);
  labels.dispose();
  clock.mockRestore();
});

it("draws a pin above the target bullseye and keeps the place name clear of its body", () => {
  canvasFactory();
  const labels = new PlaceLabels(),
    c = camera();
  const pin: PlaceFeature = {
    ...places[0],
    id: "pin",
    kind: "pin",
    markerSize: 44,
    labelHidden: true,
  };
  const target: PlaceFeature = {
    ...places[0],
    id: "target",
    name: "Eiffel Tower",
    kind: "pin",
    markerRole: "target",
    markerSize: 42,
    labelFlexible: true,
  };
  labels.update(
    {
      id: "pin-reveal",
      kind: "place-labels",
      visible: true,
      markers: true,
      places: [pin, target],
    },
    100,
  );
  labels.view(c, 800, 800);
  const marker = (id: string) =>
    labels.group.children.find(
      (o) => o.userData.role === "marker" && o.userData.placeId === id,
    )!;
  const label = labels.group.children.find(
    (o) => o.userData.role === "label" && o.userData.placeId === target.id,
  )!;
  expect(marker(pin.id).renderOrder).toBeGreaterThan(
    marker(target.id).renderOrder,
  );
  expect(label.renderOrder).toBeGreaterThan(marker(pin.id).renderOrder);
  expect(label.visible).toBe(true);
  const protectedPin = labels.priorityMarkerBoxes(c, 800, 800);
  expect(protectedPin).toHaveLength(1);
  expect(protectedPin[0].top).toBeLessThan(370);
  const [box] = labels.labelBoxes();
  expect(box).toBeDefined();
  const pinBox = protectedPin[0];
  expect(
    box.right <= pinBox.left ||
      box.left >= pinBox.right ||
      box.bottom <= pinBox.top ||
      box.top >= pinBox.bottom,
  ).toBe(true);
  labels.dispose();
});

it("renders a single placement ripple behind the pin with the pin's current color", () => {
  canvasFactory();
  const clock = vi.spyOn(performance, "now").mockReturnValue(0);
  const labels = new PlaceLabels(),
    c = camera();
  const pin: PlaceFeature = {
    ...places[0],
    kind: "pin",
    name: "",
    labelHidden: true,
    placementPulse: true,
    visualState: "selected",
  };
  const layer = {
    id: "pulse",
    kind: "place-labels" as const,
    visible: true,
    markers: true,
    places: [pin],
  };
  labels.update(layer, 100);
  labels.view(c, 800, 800);
  const pulse = labels.group.children.find(
    (o) => o.userData.role === "placement-pulse",
  ) as Sprite;
  const marker = labels.group.children.find(
    (o) => o.userData.role === "marker",
  ) as Sprite;
  expect(pulse.renderOrder).toBeLessThan(marker.renderOrder);
  expect(pulse.material.color.getHexString()).toBe(
    playColors("ocean").selected.slice(1),
  );
  clock.mockReturnValue(500);
  labels.view(c, 800, 800);
  const opacity = pulse.material.opacity;
  labels.update(
    { ...layer, places: [{ ...pin, visualState: "incorrect" }] },
    100,
  );
  labels.view(c, 800, 800);
  expect(pulse.material.color.getHexString()).toBe(
    playColors("ocean").incorrect.slice(1),
  );
  expect(pulse.material.opacity).toBeCloseTo(opacity);
  clock.mockReturnValue(1200);
  labels.view(c, 800, 800);
  expect(pulse.visible).toBe(false);
  expect(labels.needsRefresh()).toBe(false);
  labels.dispose();
  clock.mockRestore();
});
