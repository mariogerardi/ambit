import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JOURNEYS } from "../src/game/journeys";
import {
  createQuestionContext,
  canSelect,
} from "../src/game/questionPreparation";
import { COUNTRY_FACTS } from "../src/game/countryFacts";
import { gameReducer, initialGame, journeyScore } from "../src/game/state";
import type { Action, GameState } from "../src/game/state";
import type { RegionFeature } from "../src/geography/types";
import { journeyWorld } from "../src/app/journeyWorld";
import { feedbackLegend } from "../src/game/copy";
import { answerItems } from "../src/game/answerPresentation";
import { AnswerReview } from "../src/game/AnswerReview";
import { EARTH_KM } from "../src/game/spatial";
import { answerPlace } from "../src/game/answerTargets";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
function round(journeyId: string, roundId: string) {
  const journey = JOURNEYS.find((journey) => journey.id === journeyId)!;
  const index = journey.rounds.findIndex((q) => q.id === roundId);
  const question = journey.rounds[index];
  const context = createQuestionContext(regions, COUNTRY_FACTS, journey);
  const start: GameState = {
    ...initialGame,
    phase: "playing",
    roundIndex: index,
  };
  const reduce = (game: GameState, ...actions: Action[]) =>
    actions.reduce((g, a) => gameReducer(g, a, journey, context), game);
  const view = (game: GameState) =>
    journeyWorld(regions, journey, game, context);
  return { question, context, start, reduce, view };
}

describe("Journey answer roles across controls", () => {
  it("keeps merged-territory and linked-choice mistakes red while revealed solutions become purple", () => {
    const merged = round("missing-borders-v1", "missing-borders-01-iberia");
    const missed = merged.reduce(merged.start, {
      type: "select",
      id: "wurl:FRA",
    });
    const recap = merged.view({ ...missed, phase: "finished" });
    expect(missed.answers[0].correct).toBe(false);
    expect(recap.states["wurl:FRA"]).toBe("incorrect");
    expect(recap.states["wurl:ESP"]).toBe("visited");
    const province = round(
      "beyond-the-maple-leaf-v1",
      "canada-bilingual-province-v1",
    );
    const answered = province.reduce(
      province.start,
      { type: "select", id: "province:qc" },
      { type: "submit" },
    );
    expect(
      province.view({ ...answered, phase: "finished" }).states["wurl:CAN-QB"],
    ).toBe("incorrect");
  });
  it("preserves a typed city mistake against an authored reference in completion", () => {
    const city = round("not-the-obvious-city-v1", "unexpected-turkey-capital");
    const missed = city.reduce(
      city.start,
      { type: "text", value: "Istanbul" },
      { type: "submit" },
    );
    const scene = city.view({ ...missed, phase: "finished" });
    expect(scene.places.find((p) => p.name === "Istanbul")?.visualState).toBe(
      "incorrect",
    );
    expect(scene.places.find((p) => p.name === "Ankara")?.visualState).toBe(
      "visited",
    );
    expect(scene.states["wurl:TUR"]).toBe("visited");
  });
  it("preserves wrong assignments even when those cities also belong to the discovered solution", () => {
    const matching = round(
      "not-the-obvious-city-v1",
      "unexpected-south-africa-capitals",
    );
    const missed = matching.reduce(
      matching.start,
      { type: "order-card", id: "place:3369157", index: 0 },
      { type: "order-card", id: "place:964137", index: 1 },
      { type: "order-card", id: "place:1018725", index: 2 },
      { type: "submit" },
    );
    const scene = matching.view({ ...missed, phase: "finished" });
    expect(missed.answers[0].correct).toBe(false);
    for (const id of ["place:3369157", "place:964137"])
      expect(scene.places.find((p) => p.id === id)?.visualState).toBe(
        "incorrect",
      );
    expect(
      scene.places.find((p) => p.id === "place:1018725")?.visualState,
    ).toBe("visited");
    expect(scene.states["wurl:ZAF"]).toBe("visited");
  });
  it("retains an incorrect coordinate pin separately from the revealed destination", () => {
    const pin = round("down-the-danube-v1", "danube-vienna-pin-v1");
    const missed = pin.reduce(
      pin.start,
      { type: "drop-pin", lat: 0, lng: 0 },
      { type: "submit" },
    );
    const scene = pin.view({ ...missed, phase: "finished" });
    expect(scene.places.find((p) => p.sourceId === "player")).toMatchObject({
      kind: "pin",
      visualState: "incorrect",
      lat: 0,
      lng: 0,
    });
    expect(scene.places.find((p) => p.name === "Vienna")?.visualState).toBe(
      "visited",
    );
  });
  it.each([
    ["down-the-danube-v1", "danube-vienna-pin-v1", 50],
    ["not-the-obvious-city-v1", "unexpected-canberra-pin", 150],
  ] as const)(
    "gives %s distance-pin feedback three bands without changing acceptance",
    (journeyId, id, radiusKm) => {
      const { question, start, reduce, view } = round(journeyId, id);
      if (question.rule.type !== "pin-distance")
        throw Error("Expected distance pin");
      expect(question.rule.radiusKm).toBe(radiusKm);
      expect(question.rule.tiers).toHaveLength(3);
      const target = answerPlace(question, question.rule.targetId)!;
      const radii = question.rule.tiers!.map((tier) => tier.radiusKm);
      for (const [index, km] of [...radii, radiusKm + 1].entries()) {
        const game = reduce(
          start,
          {
            type: "drop-pin",
            lat: target.lat + ((km / EARTH_KM) * 180) / Math.PI,
            lng: target.lng,
          },
          { type: "submit" },
        );
        expect(journeyScore(game)).toBe(index < 3 ? 1 : 0);
        const rings = view(game).overlays!.filter(
          (overlay) => overlay.type === "circle",
        );
        expect(rings.map((ring) => ring.radiusKm)).toEqual(radii);
        expect(rings.filter((ring) => ring.active)).toHaveLength(
          index < 3 ? 1 : 0,
        );
        if (index < 3) expect(rings[index].active).toBe(true);
      }
    },
  );
  it("reviews only a submitted mistake and leaves unused choices out of feedback", () => {
    const { question, context, start, reduce, view } = round(
      "along-the-andes-v1",
      "andes-capital-v2",
    );
    const correct = reduce(
      start,
      { type: "select", id: "city:bogota" },
      { type: "submit" },
    );
    expect(
      renderToStaticMarkup(
        <AnswerReview question={question} context={context} game={correct} />,
      ),
    ).toBe("");
    expect(feedbackLegend(question, context, correct)).toEqual([]);
    const wrong = reduce(
      start,
      { type: "select", id: "city:caracas" },
      { type: "submit" },
    );
    const html = renderToStaticMarkup(
      <AnswerReview question={question} context={context} game={wrong} />,
    );
    expect(html).toContain("Your answer: ");
    expect(html).toContain("Caracas");
    expect(html).not.toMatch(/Bogotá|Paramaribo|Medellín|Not selected/);
    expect(view(wrong).selectableRegionIds).toEqual([]);
    expect(
      feedbackLegend(question, context, wrong).map((entry) => entry.label),
    ).toEqual(["Correct answer", "Incorrect pick"]);
  });

  it("keeps reference scenes free of legends and region-selection affordances", () => {
    const { question, context, start, reduce, view } = round(
      "along-the-andes-v1",
      "andes-chimborazo-v2",
    );
    const selected = reduce(start, {
      type: "select",
      id: "earth:equatorial-bulge",
    });
    expect(feedbackLegend(question, context, selected)).toEqual([]);
    expect(view(selected).selectableRegionIds).toEqual([]);
    expect(view(selected).overlays).toEqual(view(start).overlays);
  });

  it("links six province options to exactly six candidates without changing their answer IDs or enabling map input", () => {
    const { question, context, start, reduce, view } = round(
      "beyond-the-maple-leaf-v1",
      "canada-bilingual-province-v1",
    );
    const play = view(start);
    expect(
      Object.values(play.states).filter((state) => state === "clue"),
    ).toHaveLength(6);
    expect(play.regions.some((region) => region.id === "wurl:CAN-NB")).toBe(
      true,
    );
    expect(play.states["wurl:CAN-AB"]).toBe("disabled");
    expect(canSelect(question, context, "wurl:CAN-QB")).toBe(false);
    const selected = reduce(start, { type: "select", id: "province:qc" });
    expect(view(selected).states["wurl:CAN-QB"]).toBe("clue");
    expect(
      view(selected).places.some((p) => p.sourceId === "journey-response"),
    ).toBe(false);
    expect(selected.selectedIds).toEqual(["province:qc"]);
    const reveal = reduce(selected, { type: "submit" });
    expect(view(reveal).states["wurl:CAN-QB"]).toBe("incorrect");
    expect(view(reveal).states["wurl:CAN-NB"]).toBe("answer");
    expect(reveal.answers[0].correct).toBe(false);
  });

  it("does not select Spain with Portugal or grade Canada for an ocean answer", () => {
    const europe = round("same-hour-different-worlds", "same-hour-q2");
    const selected = europe.reduce(europe.start, {
      type: "select",
      id: "wurl:PRT",
    });
    expect(europe.view(selected).states["clue-part:wurl:ESP"]).toBe("hinted");
    expect(selected.phase).toBe("feedback");
    expect(europe.view(selected).states["wurl:PRT"]).toBe("incorrect");
    const ocean = round("beyond-the-maple-leaf-v1", "canada-arctic-shore-v1");
    const correct = ocean.reduce(
      ocean.start,
      { type: "select", id: "ocean:arctic" },
      { type: "submit" },
    );
    expect(correct.answers[0].correct).toBe(true);
    expect(ocean.view(correct).states["wurl:CAN"]).toBe("hinted");
  });

  it("retains reference context and grades a submitted city without grading its country", () => {
    const coast = round(
      "exceptions-to-the-rule-v1",
      "exceptions-bolivia-coast",
    );
    expect(
      coast.view(
        coast.reduce(
          coast.start,
          { type: "select", id: "wurl:CHL" },
          { type: "submit" },
        ),
      ).states["wurl:BOL"],
    ).toBe("hinted");
    const capital = round(
      "not-the-obvious-city-v1",
      "unexpected-turkey-capital",
    );
    const wrong = capital.reduce(
      capital.start,
      { type: "text", value: "Istanbul" },
      { type: "submit" },
    );
    const scene = capital.view(wrong);
    expect(scene.states["wurl:TUR"]).toBe("hinted");
    expect(scene.places.find((p) => p.name === "Istanbul")?.visualState).toBe(
      "incorrect",
    );
    expect(scene.places.find((p) => p.name === "Ankara")?.visualState).toBe(
      "answer",
    );
  });

  it("describes unchosen valid alternatives without calling them missed required answers", () => {
    const { question, context, start, reduce } = round(
      "north-america-v2",
      "canada-three-territories-v2",
    );
    const game = reduce(
      start,
      { type: "ordered", index: 0, value: "Yukon" },
      { type: "submit" },
    );
    expect(game.answers[0].correct).toBe(true);
    expect(
      feedbackLegend(question, context, game).map((entry) => entry.label),
    ).toContain("Other valid answers");
    const html = renderToStaticMarkup(
      <AnswerReview question={question} context={context} game={game} />,
    );
    expect(html).toBe("");
  });

  it("keeps incorrect matching assignments separate from membership and identifies supplied slots", () => {
    const { question, context, start, reduce } = round(
      "not-the-obvious-city-v1",
      "unexpected-south-africa-capitals",
    );
    const helped = reduce(
      start,
      { type: "request-hint" },
      { type: "request-assist" },
    );
    expect(
      answerItems(question, context, helped).find(
        (item) => item.id === "place:3369157",
      ),
    ).toMatchObject({ supplied: true, selected: true, slot: 1 });
    const game = reduce(
      helped,
      { type: "order-card", id: "place:1018725", index: 0 },
      { type: "order-card", id: "place:964137", index: 2 },
      { type: "submit" },
    );
    const html = renderToStaticMarkup(
      <AnswerReview question={question} context={context} game={game} />,
    );
    expect(html).toContain("National administration");
    expect(html).toContain("Correct: ");
    expect(html).toContain("Incorrect assignment");
    expect(game.answers[0].correct).toBe(false);
  });

  it.each([0, 225, 375, 600])(
    "shows accuracy, target and achieved ring at %s km without changing pin scoring",
    (km) => {
      const { question, context, start, reduce, view } = round(
        "along-the-andes-v1",
        "andes-aconcagua-v1",
      );
      if (question.rule.type !== "pin-distance")
        throw Error("Expected distance pin");
      const target = answerPlace(question, question.rule.targetId)!;
      const placed = reduce(start, {
        type: "drop-pin",
        lat: target.lat + ((km / EARTH_KM) * 180) / Math.PI,
        lng: target.lng,
      });
      expect(
        view(placed).overlays?.some((overlay) =>
          overlay.id.startsWith("pin-tolerance:"),
        ),
      ).toBe(false);
      expect(
        view(placed).places.some((place) => place.markerRole === "target"),
      ).toBe(false);
      const game = reduce(placed, { type: "submit" });
      const scene = view(game);
      expect(scene.places.find((p) => p.id.includes(":guess"))).toMatchObject({
        name: "",
        labelHidden: true,
      });
      expect(journeyScore(game)).toBe(km <= 450 ? 1 : 0);
      expect(scene.places.find((p) => p.id === target.id)?.markerRole).toBe(
        "target",
      );
      expect(
        scene.places.find((p) => p.id.includes(":guess"))?.accuracyBand?.index,
      ).toBe(km === 0 ? 0 : km === 225 ? 1 : km === 375 ? 2 : undefined);
      const rings = scene.overlays!.filter(
        (o) => o.type === "circle" && o.active,
      );
      expect(rings).toHaveLength(km <= 450 ? 1 : 0);
      if (km <= 450)
        expect(
          feedbackLegend(question, context, game).find((e) => e.key === "pin")
            ?.label,
        ).toContain("Your pin");
    },
  );
});
