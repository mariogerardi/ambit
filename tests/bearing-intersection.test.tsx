// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { geoDistance } from "d3-geo";
import { SILK_ROAD_INTERSECTIONS_JOURNEY as journey } from "../src/game/silkRoadIntersectionsJourney";
import {
  forwardBearingIntersections,
  initialBearing,
  pointAlongBearing,
} from "../src/game/geodesic";
import { intersectionReadings } from "../src/game/bearingIntersection";
import { validateQuestionContract } from "../src/game/questionBuilder";
import { createQuestionContext } from "../src/game/questionPreparation";
import { answerPlace } from "../src/game/answerTargets";
import { canSubmit, isCorrect } from "../src/game/questionEvaluation";
import { initialGame, gameReducer, type GameState } from "../src/game/state";
import { journeyPoints, submittedPoints } from "../src/game/points";
import { journeyWorld } from "../src/app/journeyWorld";
import { validGame } from "../src/app/daily";
import { AnswerForm } from "../src/game/AnswerForm";
import { QuestionAccuracy } from "../src/game/QuestionSupport";
import { auditJourney } from "../src/game/journeyAudit";
import { PRESENTATION_RECIPES } from "../src/game/recipes";
import { JOURNEY_INDEX } from "../src/game/journeyRegistry";
import type { RegionFeature } from "../src/geography/types";
import type { Question } from "../src/game/questionContracts";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(regions, [], journey);
const q = journey.rounds[0];
const target = (question: Question) =>
  answerPlace(
    question,
    question.rule.type === "pin-distance" ? question.rule.targetId : "",
  )!;
const playing: GameState = { ...initialGame, phase: "playing" };
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const reduce = (game: GameState, action: Parameters<typeof gameReducer>[1]) =>
  gameReducer(game, action, journey, context);

// Independent vector-plane construction for the numeric audit, not the runtime helper.
function independentlyCross(
  a: { lat: number; lng: number },
  headingA: number,
  b: { lat: number; lng: number },
  headingB: number,
) {
  const rad = Math.PI / 180;
  const cross = (a: number[], b: number[]) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const normal = (p: typeof a, heading: number) => {
    const lat = p.lat * rad,
      lng = p.lng * rad,
      theta = heading * rad;
    const point = [
      Math.cos(lat) * Math.cos(lng),
      Math.cos(lat) * Math.sin(lng),
      Math.sin(lat),
    ];
    const north = [
      -Math.sin(lat) * Math.cos(lng),
      -Math.sin(lat) * Math.sin(lng),
      Math.cos(lat),
    ];
    const east = [-Math.sin(lng), Math.cos(lng), 0];
    return cross(
      point,
      north.map((n, i) => n * Math.cos(theta) + east[i] * Math.sin(theta)),
    );
  };
  const v = cross(normal(a, headingA), normal(b, headingB));
  const length = Math.hypot(...v);
  return [1, -1].map((sign) => ({
    lat: Math.asin((sign * v[2]) / length) / rad,
    lng: Math.atan2(sign * v[1], sign * v[0]) / rad,
  }));
}

describe("Bearing Intersection geometry and contracts", () => {
  it("derives the canonical readouts and independently audited rounded intersections for all five stops", () => {
    const expected = [
      [112, 212],
      [302, 161],
      [273, 20],
      [274, 354],
      [258, 160],
    ];
    const errors = [1.825, 8.315, 7.941, 5.714, 6.856];
    journey.rounds.forEach((question, i) => {
      const readings = intersectionReadings(question);
      const t = target(question);
      expect(readings.map((r) => r.displayed)).toEqual(expected[i]);
      const solutions = forwardBearingIntersections(
        readings[0].station,
        readings[0].displayed,
        readings[1].station,
        readings[1].displayed,
      );
      expect(solutions).toHaveLength(1);
      const error =
        geoDistance([t.lng, t.lat], [solutions[0].lng, solutions[0].lat]) *
        6371.0088;
      expect(error).toBeCloseTo(errors[i], 2);
      const independent = independentlyCross(
        readings[0].station,
        expected[i][0],
        readings[1].station,
        expected[i][1],
      );
      expect(
        Math.min(
          ...independent.map(
            (p) => geoDistance([t.lng, t.lat], [p.lng, p.lat]) * 6371.0088,
          ),
        ),
      ).toBeCloseTo(error, 6);
      expect(
        isCorrect(question, context, { ...playing, pin: solutions[0] }),
      ).toBe(true);
      for (const { station } of readings)
        expect(isCorrect(question, context, { ...playing, pin: station })).toBe(
          false,
        );
    });
  });
  it("handles antimeridian/polar target geometry and rejects coincident planes", () => {
    for (const [a, b, t] of [
      [
        { lat: 10, lng: 170 },
        { lat: -10, lng: -170 },
        { lat: 15, lng: -179 },
      ],
      [
        { lat: 50, lng: 10 },
        { lat: 50, lng: 100 },
        { lat: 90, lng: 0 },
      ],
    ]) {
      const solutions = forwardBearingIntersections(
        a,
        initialBearing(a, t),
        b,
        initialBearing(b, t),
      );
      expect(solutions).toHaveLength(1);
      expect(
        geoDistance([solutions[0].lng, solutions[0].lat], [t.lng, t.lat]),
      ).toBeLessThan(1e-7);
    }
    expect(
      forwardBearingIntersections(
        { lat: 0, lng: 0 },
        90,
        { lat: 0, lng: 20 },
        90,
      ),
    ).toEqual([]);
    expect(() =>
      forwardBearingIntersections(
        { lat: 0, lng: 0 },
        NaN,
        { lat: 0, lng: 20 },
        30,
      ),
    ).toThrow();
  });
  it("works as a self-contained question and as a separate authoring recipe", () => {
    for (const question of [...journey.rounds, ...PRESENTATION_RECIPES]) {
      const single = { ...journey, rounds: [question] };
      const ctx = createQuestionContext(regions, [], single);
      const game = gameReducer(
        { ...playing, pin: target(question) },
        { type: "submit" },
        single,
        ctx,
      );
      expect(game.answers[0]).toMatchObject({ correct: true, points: 3 });
      expect(game.answers[0].bearing).toBeUndefined();
      expect(auditJourney(single, regions).errors).toEqual([]);
    }
    expect(JOURNEY_INDEX.find((j) => j.id === journey.id)).toMatchObject({
      path: "/journey/where-the-silk-roads-met",
    });
  });
  it("rejects incompatible modes, ambiguous geometry, rounding loss, hidden/duplicate stations and answer-ending assists", () => {
    const invalid: ((q: Question) => void)[] = [
      (q) => {
        q.mode = "text";
        q.rule = { type: "manual-text", answers: ["x"] };
        q.inputLabel = "City";
      },
      (q) => {
        q.bearingIntersection!.stations[1] = q.bearingIntersection!.stations[0];
      },
      (q) => {
        q.bearingIntersection!.stations[0].lat = NaN;
      },
      (q) => {
        q.bearingIntersection!.stations[0].markerHidden = true;
      },
      (q) => {
        q.bearingIntersection!.stations[0] = {
          ...q.bearingIntersection!.stations[0],
          ...target(q),
        };
      },
      (q) => {
        if (q.rule.type === "pin-distance") q.rule.targetId = "missing";
      },
      (q) => {
        if (q.rule.type === "pin-distance") q.rule.tiers![0].radiusKm = 1;
      },
      (q) => {
        if (q.rule.type === "pin-distance") {
          q.rule.radiusKm = 600;
          q.rule.tiers![2].radiusKm = 600;
        }
      },
      (q) => {
        q.bearingIntersection!.assist!.stationId = "missing";
      },
      (q) => {
        q.bearingIntersection!.assist!.halfWidthDegrees = 0;
      },
      (q) => {
        q.bearingIntersection!.assist!.reachKm = 504;
      },
      (q) => {
        q.guidance = undefined;
      },
      (q) => {
        const t = target(q);
        q.bearingIntersection!.stations = [
          {
            ...q.bearingIntersection!.stations[0],
            lat: t.lat - 10,
            lng: t.lng,
          },
          {
            ...q.bearingIntersection!.stations[1],
            lat: t.lat - 20,
            lng: t.lng,
          },
        ];
      },
    ];
    for (const mutate of invalid) {
      const bad = clone(q);
      mutate(bad);
      expect(() => validateQuestionContract(bad)).toThrow();
    }
  });
});

describe("intersection input, grading and map lifecycle", () => {
  it("shows fixed paired readouts without an editable angle, target name or premature submit", () => {
    const markup = renderToStaticMarkup(
      <AnswerForm
        question={q}
        context={context}
        game={playing}
        dispatch={() => {}}
        webgl
      />,
    );
    const root = document.createElement("div");
    root.innerHTML = markup;
    expect(root.querySelectorAll(".bearing-observations figure")).toHaveLength(
      2,
    );
    expect(root.querySelectorAll(".compass-face")).toHaveLength(2);
    expect(root.querySelector("[role=slider]")).toBeNull();
    expect(root.textContent).toContain("Lanzhou112°");
    expect(root.textContent).toContain("Datong212°");
    expect(root.textContent).not.toContain(target(q).name);
    expect(
      root.querySelector<HTMLButtonElement>(".answer-submit-button")?.disabled,
    ).toBe(true);
    expect(renderToStaticMarkup(<QuestionAccuracy question={q} />)).toContain(
      "clockwise from true north",
    );
    const ready = renderToStaticMarkup(
      <AnswerForm
        question={q}
        context={context}
        game={{ ...playing, pin: target(q) }}
        dispatch={() => {}}
        webgl
      />,
    );
    root.innerHTML = ready;
    expect(
      root.querySelector<HTMLButtonElement>(".answer-submit-button")?.disabled,
    ).toBe(false);
  });
  it("keeps inclusive tiers and help ceilings independent of observation/assist geometry", () => {
    journey.rounds.forEach((question) => {
      if (question.rule.type !== "pin-distance") throw Error();
      const t = target(question),
        tiers = question.rule.tiers!;
      tiers.forEach((tier, i) => {
        const response = {
          ...playing,
          pin: pointAlongBearing(t, 70, tier.radiusKm / 6371.0088),
        };
        expect(isCorrect(question, context, response)).toBe(true);
        expect(submittedPoints(question, response, true)).toBe(3 - i);
        expect(submittedPoints(question, response, true, "hinted")).toBe(
          Math.min(3 - i, 2),
        );
        expect(submittedPoints(question, response, true, "assisted")).toBe(1);
      });
      expect(
        isCorrect(question, context, {
          ...playing,
          pin: pointAlongBearing(
            t,
            70,
            (question.rule.radiusKm + 0.001) / 6371.0088,
          ),
        }),
      ).toBe(false);
    });
  });
  it("withholds the target/rays, preserves the pending pin through help/restoration and clears assists on reveal/advance", () => {
    let game = reduce(initialGame, { type: "start" });
    game = reduce(game, { type: "drop-pin", lat: 34, lng: 110 });
    expect(game.phase).toBe("playing");
    expect(canSubmit(q, context, game)).toBe(true);
    for (const action of [
      undefined,
      "request-hint",
      "request-assist",
    ] as const) {
      if (action) game = reduce(game, { type: action });
      game = clone(game);
      expect(validGame(game, journey)).toBe(true);
      expect(game.pin).toEqual({ lat: 34, lng: 110 });
      const scene = journeyWorld(regions, journey, game, context);
      expect(
        scene.places.filter((p) => p.sourceId !== "player").map((p) => p.id),
      ).toEqual(q.bearingIntersection!.stations.map((s) => s.id));
      expect(scene.places.some((p) => p.id === target(q).id)).toBe(false);
      expect(scene.overlays?.filter((o) => o.type === "path")).toEqual([]);
      expect(
        scene.overlays?.filter((o) => o.type === "bearing-sector"),
      ).toHaveLength(action === "request-assist" ? 1 : 0);
      expect(
        Object.values(scene.states).some((s) =>
          ["correct", "answer", "incorrect", "selectable"].includes(s),
        ),
      ).toBe(false);
    }
    game = reduce(game, { type: "submit" });
    expect(game.answers[0].points).toBe(1);
    const revealed = journeyWorld(regions, journey, game, context);
    const rays = revealed.overlays!.filter((o) => o.type === "path");
    expect(rays).toHaveLength(2);
    rays.forEach((ray, i) => {
      expect(ray).toMatchObject({ visualState: "hinted" });
      if (ray.type !== "path") throw Error();
      expect(ray.coordinates[0][0]).toBeCloseTo(
        q.bearingIntersection!.stations[i].lng,
        8,
      );
      expect(ray.coordinates[0][1]).toBeCloseTo(
        q.bearingIntersection!.stations[i].lat,
        8,
      );
      expect(ray.coordinates.at(-1)![0]).toBeCloseTo(target(q).lng, 8);
      expect(ray.coordinates.at(-1)![1]).toBeCloseTo(target(q).lat, 8);
    });
    expect(revealed.overlays?.some((o) => o.type === "bearing-sector")).toBe(
      false,
    );
    expect(revealed.overlays?.filter((o) => o.type === "circle")).toHaveLength(
      3,
    );
    game = reduce(game, { type: "next" });
    const next = journeyWorld(regions, journey, game, context);
    expect(game.pin).toBeUndefined();
    expect(next.overlays).toEqual([]);
    expect(next.places.find((p) => p.id === target(q).id)).toMatchObject({
      visualState: "hinted",
      displayRole: "reference",
    });
    expect(next.places.some((p) => p.id === target(journey.rounds[1]).id)).toBe(
      false,
    );
  });
  it("preserves every discovery and actual offshore mistake at completion with the schematic network kept separate from bearing rays", () => {
    for (const miss of [false, true]) {
      let game = reduce(initialGame, { type: "start" });
      for (const question of journey.rounds) {
        const pin = miss ? { lat: -25, lng: -140 } : target(question);
        game = reduce(game, { type: "drop-pin", ...pin });
        game = reduce(game, { type: "submit" });
        game = reduce(game, { type: "next" });
      }
      expect(game.phase).toBe("finished");
      expect(journeyPoints(game)).toBe(miss ? 0 : 15);
      expect(validGame(clone(game), journey)).toBe(true);
      const scene = journeyWorld(regions, journey, game, context);
      for (const question of journey.rounds)
        expect(
          scene.places.find((p) => p.id === target(question).id),
        ).toMatchObject({ visualState: "visited" });
      const wrong = scene.places.filter((p) => p.sourceId === "player");
      expect(wrong).toHaveLength(miss ? 5 : 0);
      wrong.forEach((p) =>
        expect(p).toMatchObject({
          lat: -25,
          lng: -140,
          visualState: "incorrect",
        }),
      );
      expect(scene.overlays).toBe(journey.completion!.overlays);
      expect(scene.overlays!.length).toBeGreaterThan(5);
      for (const overlay of scene.overlays!) {
        expect(overlay).toMatchObject({
          type: "path",
          visualState: "corridor",
        });
        expect(overlay.id).toMatch(/^silk-corridor:/);
        if (overlay.type !== "path") throw Error();
        expect(overlay.arrowhead).toBeUndefined();
        expect(overlay.opacity).toBe(1);
        expect(overlay.opacityByAltitude).toBeUndefined();
        expect(overlay.coordinates.length).toBeGreaterThan(16);
        expect(
          overlay.coordinates.every(
            ([lng, lat]) =>
              Number.isFinite(lng) &&
              Math.abs(lng) <= 180 &&
              Number.isFinite(lat) &&
              Math.abs(lat) <= 90,
          ),
        ).toBe(true);
      }
      expect(journey.completion!.mapCaption).toContain("schematic");
      expect(journey.completion!.mapAttribution!.url).toContain("unesco.org");
      expect(scene.routes).toEqual([]);
      expect(journey.completion!.views).toHaveLength(6);
    }
  });
});
