// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { geoContains, geoDistance } from "d3-geo";
import { describe, expect, it, vi } from "vitest";
import type { PlaceFeature, RegionFeature } from "../src/geography/types";
import { sphericalGeometry } from "../src/geography/sphericalGeometry.mjs";
import type { Journey, Question } from "../src/game/questionContracts";
import { JOURNEYS } from "../src/game/journeys";
import { COUNTRY_FACTS } from "../src/game/countryFacts";
import { createQuestionContext } from "../src/game/questionPreparation";
import { gameReducer, initialGame } from "../src/game/state";
import type { Action, GameState } from "../src/game/state";
import { journeyWorld } from "../src/app/journeyWorld";
import { responsePlaceForName, answerPlace } from "../src/game/answerTargets";
import { highlightedPartId } from "../src/game/presentation";
import { journeyStops } from "../src/game/journeyStops";
import { pinReviewViews } from "../src/game/pinPresentation";
import { auditVisualScene } from "../src/game/journeyVisualRules";
import { GameShell } from "../src/game/GameShell";
import { cityReference, explanationPlace } from "../src/game/authoredPlaces";

const regions: RegionFeature[] = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
);
const find = (id: string) =>
  JOURNEYS.flatMap((j) => j.rounds).find((q) => q.id === id)!;
function setup(rounds: Question[]) {
  const journey: Journey = {
    id: "review-fixture",
    title: "Review",
    description: "Lifecycle fixture",
    rounds,
  };
  const context = createQuestionContext(regions, COUNTRY_FACTS, journey);
  const start = (roundIndex = 0): GameState => ({
    ...initialGame,
    phase: "playing",
    roundIndex,
  });
  const reduce = (game: GameState, ...actions: Action[]) =>
    actions.reduce((g, a) => gameReducer(g, a, journey, context), game);
  const view = (game: GameState) =>
    journeyWorld(regions, journey, game, context);
  return { journey, context, start, reduce, view };
}

describe("shared review lifecycle", () => {
  it.each(
    ["Ottawa", "Toronto"].flatMap((text) =>
      [cityReference, explanationPlace].map((style) => ({
        text,
        style,
        role: style.name,
      })),
    ),
  )(
    "preserves reviewed point roles when custom completion also declares $role: $text",
    ({ text, style }) => {
      const question = find("canada-ottawa-v1");
      const { journey, context, start, reduce, view } = setup([question]);
      const ottawa = responsePlaceForName(question, context, "Ottawa")!;
      const toronto = responsePlaceForName(question, context, "Toronto")!;
      journey.completion = {
        focus: question.focus,
        physicalFeatures: [],
        places: [ottawa, toronto].map(style),
      };
      const game = reduce(
        start(),
        { type: "text", value: text },
        { type: "submit" },
      );
      const recap = view({ ...game, phase: "finished" });
      expect(recap.places.find((p) => p.id === ottawa.id)?.visualState).toBe(
        "visited",
      );
      expect(recap.places.find((p) => p.id === toronto.id)?.visualState).toBe(
        text === "Toronto" ? "incorrect" : "hinted",
      );
    },
  );
  it.each([
    ["canada-ottawa-v1", "Toronto"],
    ["libya-capital", "Benghazi"],
    ["unexpected-turkey-capital", "Konya"],
    ["pacific-wellington", "Auckland"],
  ])("keeps a known wrong city through reveal and recap: %s", (id, name) => {
    const question = find(id);
    expect(question, id).toBeDefined();
    const { context, start, reduce, view } = setup([question]);
    const missed = reduce(
      start(),
      { type: "text", value: name },
      { type: "submit" },
    );
    expect(missed.answers[0].correct).toBe(false);
    const city = responsePlaceForName(question, context, name)!;
    expect(city, name).toBeDefined();
    for (const game of [missed, { ...missed, phase: "finished" as const }]) {
      const scene = view(game);
      expect(scene.places.find((p) => p.id === city.id)?.visualState).toBe(
        "incorrect",
      );
      expect(scene.states[city.parentId!]).not.toBe("incorrect");
    }
  });

  it("does not invent a location for unknown or ambiguous typed names", () => {
    const base = find("canada-ottawa-v1");
    const city: PlaceFeature = {
      id: "city:one",
      name: "Repeated name",
      kind: "city",
      lat: 1,
      lng: 2,
      parentId: "wurl:FRA",
      sourceId: "test",
    };
    const question = {
      ...base,
      places: [city, { ...city, id: "city:two", parentId: "wurl:ITA" }],
    };
    const { context, start, reduce, view } = setup([question]);
    expect(
      responsePlaceForName(question, context, "Unknown invented city"),
    ).toBeUndefined();
    expect(responsePlaceForName(question, context, city.name)).toBeUndefined();
    const missed = reduce(
      start(),
      { type: "text", value: city.name },
      { type: "submit" },
    );
    expect(
      view(missed).places.filter((p) => p.visualState === "incorrect"),
    ).toEqual([]);
  });

  it("retains required typed-region solutions alongside a wrong region", () => {
    const { start, reduce, view } = setup([find("canada-south-of-boston-v2")]);
    const missed = reduce(
      start(),
      { type: "ordered", index: 0, value: "Quebec" },
      { type: "submit" },
    );
    expect(missed.answers[0].correct).toBe(false);
    expect(view(missed).states["wurl:CAN-ON"]).toBe("answer");
    expect(view({ ...missed, phase: "finished" }).states).toMatchObject({
      "wurl:CAN-ON": "visited",
      "wurl:CAN-QB": "incorrect",
    });
  });

  it("recaps an accepted alternative or an example after a miss without promoting the entire valid pool", () => {
    const q: Question = {
      ...find("canada-south-of-boston-v2"),
      mode: "map-single",
      map: {
        ...find("canada-south-of-boston-v2").map!,
        candidateRole: undefined,
      },
      commitment: "immediate",
      count: 1,
      contextIds: [],
      candidateRegionIds: ["wurl:FRA", "wurl:ITA", "wurl:DEU"],
      selection: { type: "ids", ids: ["wurl:FRA", "wurl:ITA", "wurl:DEU"] },
      rule: {
        type: "country-ids",
        ids: ["wurl:FRA", "wurl:ITA"],
        match: "any",
      },
    };
    const { start, reduce, view } = setup([q]);
    const accepted = reduce(start(), { type: "select", id: "wurl:ITA" });
    expect(accepted.answers[0].correct).toBe(true);
    const recap = view({ ...accepted, phase: "finished" });
    expect(recap.states["wurl:ITA"]).toBe("visited");
    expect(recap.states["wurl:FRA"]).not.toBe("visited");
    const missed = reduce(start(), { type: "select", id: "wurl:DEU" });
    expect(missed.answers[0].correct).toBe(false);
    expect(view({ ...missed, phase: "finished" }).states).toMatchObject({
      "wurl:FRA": "visited",
      "wurl:DEU": "incorrect",
    });
    expect(view({ ...missed, phase: "finished" }).states["wurl:ITA"]).not.toBe(
      "visited",
    );
  });

  it("retains multiple answered island clues belonging to one country without leaking unplayed clues", () => {
    const sicily = find("italy-sicily");
    const sardinia: Question = {
      ...sicily,
      id: "island:sardinia-review",
      rule: { type: "choice-ids", ids: ["island:sardinia"] },
      feedbackFocus: { lat: 40, lng: 9, altitude: 0.6 },
      highlightParts: [
        {
          countryId: "wurl:ITA",
          point: { lat: 40, lng: 9 },
          name: "Sardinia",
          reveal: "part",
        },
      ],
    };
    const { journey, context, start, reduce, view } = setup([sicily, sardinia]);
    const first = reduce(
      start(),
      { type: "select", id: "island:sicily" },
      { type: "submit" },
    );
    const second = reduce(
      start(1),
      { type: "select", id: "island:sardinia" },
      { type: "submit" },
    );
    expect(first.answers[0].correct && second.answers[0].correct).toBe(true);
    const contains = (r: RegionFeature, lng: number, lat: number) =>
      geoContains(sphericalGeometry(r.geometry), [lng, lat]);
    const partial = view({ ...first, phase: "finished" });
    expect(
      partial.places.some((p) => p.id === `discovery:${sardinia.id}:wurl:ITA`),
    ).toBe(false);
    expect(
      contains(
        partial.regions.find((r) => r.id === highlightedPartId("wurl:ITA"))!,
        9,
        40,
      ),
    ).toBe(false);
    const answers = [...first.answers, ...second.answers];
    const scene = view({ ...second, phase: "finished", answers });
    const fragment = scene.regions.find(
      (r) => r.id === highlightedPartId("wurl:ITA"),
    )!;
    const mainland = scene.regions.find((r) => r.id === "wurl:ITA")!;
    for (const [lng, lat] of [
      [14, 37.6],
      [9, 40],
    ]) {
      expect(contains(fragment, lng, lat)).toBe(true);
      expect(contains(mainland, lng, lat)).toBe(false);
    }
    expect(scene.states[fragment.id]).toBe("visited");
    expect(
      scene.places
        .filter((p) => p.id.startsWith("discovery:"))
        .map((p) => p.name),
    ).toEqual(["Sicily", "Sardinia"]);
    expect(journeyStops(journey, context, answers)[1]).toEqual(
      sardinia.feedbackFocus,
    );
    expect(regions.some((r) => r.id === fragment.id)).toBe(false);
  });

  it("keeps abstract-answer illustrations contextual even if a legacy answerTarget is present", () => {
    const base = find("shared-names-tripoli");
    const q = {
      ...base,
      feedbackPlaces: base.feedbackPlaces!.map((p) => ({
        ...p,
        displayRole: undefined,
        answerTarget: true,
      })),
    };
    const { context, start, reduce, view } = setup([q]);
    const game = reduce(
      start(),
      { type: "select", id: q.choices![0].id },
      { type: "submit" },
    );
    const scene = view(game);
    expect(
      scene.places.every(
        (p) =>
          !["correct", "answer", "incorrect"].includes(p.visualState ?? ""),
      ),
    ).toBe(true);
    expect(auditVisualScene(q, context, game, scene)).toEqual([]);
    const point = scene.places.find((p) => !p.markerHidden)!;
    expect(
      auditVisualScene(q, context, game, {
        ...scene,
        places: [{ ...point, visualState: "answer" }],
      }),
    ).toContain(
      `[point-answer-role] Unbound point graded: ${q.id} / ${point.id}`,
    );
  });
});

describe("shared pin review", () => {
  const q = find("danube-vienna-pin-v1");
  const fixture = setup([q]);
  const target = answerPlace(
    q,
    q.rule.type === "pin-distance" ? q.rule.targetId : "",
  )!;
  function pin(lat: number, lng: number) {
    return fixture.reduce(
      fixture.start(),
      { type: "drop-pin", lat, lng },
      { type: "submit" },
    );
  }
  it.each([
    [0, 0],
    [0, -70],
    [30, 179],
  ])(
    "frames both locations where a shared view is possible (%s, %s)",
    (lat, lng) => {
      const game = pin(lat, lng);
      const views = pinReviewViews(q, fixture.context, game)!;
      const focus = views.overview;
      expect(Number.isFinite(focus.lat) && Number.isFinite(focus.lng)).toBe(
        true,
      );
      expect(focus.altitude).toBeLessThanOrEqual(5.5);
      const horizon = Math.acos(1 / (1 + focus.altitude!));
      for (const p of [target, game.pin!])
        expect(
          geoDistance([focus.lng, focus.lat], [p.lng, p.lat]),
        ).toBeLessThan(horizon);
      expect(fixture.view(game).focus).toEqual(focus);
    },
  );
  it("preserves correct framing and provides separate antipodal views without changing the response", () => {
    expect(pinReviewViews(q, fixture.context, fixture.start())).toBeUndefined();
    const correct = pin(target.lat, target.lng);
    const preferred = { lat: target.lat, lng: target.lng, altitude: 0.7 };
    expect(
      pinReviewViews(q, fixture.context, correct, preferred)!.overview,
    ).toEqual(preferred);
    const game = pin(-target.lat, target.lng - 180);
    const before = structuredClone(game);
    const views = pinReviewViews(q, fixture.context, game)!;
    expect(views.overview).toEqual(views.answer);
    expect(views.guess).toMatchObject(game.pin!);
    expect(game).toEqual(before);
  });
  it("uses the short path across the date line and keeps area-pin review available", () => {
    const acrossDateLine: Question = {
      ...q,
      places: [{ ...target, lat: 0, lng: 179 }],
      feedbackFocus: { lat: 0, lng: 179, altitude: 0.65 },
    };
    const dateLine = setup([acrossDateLine]);
    const game = dateLine.reduce(
      dateLine.start(),
      { type: "drop-pin", lat: 0, lng: -170 },
      { type: "submit" },
    );
    const views = pinReviewViews(acrossDateLine, dateLine.context, game)!;
    expect(Math.abs(views.overview.lng)).toBeGreaterThan(170);
    const inside: Question = {
      ...q,
      rule: { type: "pin-inside", ids: ["wurl:AUT"] },
    };
    const area = setup([inside]);
    const missed = area.reduce(
      area.start(),
      { type: "drop-pin", lat: 0, lng: 0 },
      { type: "submit" },
    );
    expect(missed.answers[0].correct).toBe(false);
    expect(pinReviewViews(inside, area.context, missed)).toMatchObject({
      guess: { lat: 0, lng: 0 },
      answer: q.feedbackFocus,
    });
  });
  it("lets the player inspect each distant location without submitting another answer", async () => {
    const game = pin(-target.lat, target.lng - 180);
    const views = pinReviewViews(q, fixture.context, game)!;
    const frame = vi.fn(),
      dispatch = vi.fn();
    const host = document.createElement("div");
    const root = createRoot(host);
    try {
      await act(async () =>
        root.render(
          <GameShell
            journey={fixture.journey}
            context={fixture.context}
            game={game}
            dispatch={dispatch}
            webgl
            frame={frame}
            onHome={() => {}}
            onStudy={() => {}}
          />,
        ),
      );
      const group = host.querySelector('[aria-label="Review pin locations"]')!;
      expect(group).not.toBeNull();
      const buttons = [...group.querySelectorAll("button")];
      expect(buttons.map((b) => b.textContent)).toEqual([
        "Show your pin",
        "Show answer",
      ]);
      await act(async () => {
        buttons[0].click();
        buttons[1].click();
      });
      expect(frame.mock.calls).toEqual([[views.guess], [views.answer]]);
      expect(dispatch).not.toHaveBeenCalled();
    } finally {
      await act(async () => root.unmount());
    }
  });
});
