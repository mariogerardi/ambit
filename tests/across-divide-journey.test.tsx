// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { geoDistance } from "d3-geo";
import { describe, expect, it } from "vitest";
import { ACROSS_DIVIDE_JOURNEY as journey } from "../src/game/acrossDivideJourney";
import { COUNTRY_FACTS } from "../src/game/countryFacts";
import { createQuestionContext } from "../src/game/questions";
import { gameReducer, initialGame } from "../src/game/state";
import { journeyWorld } from "../src/app/journeyWorld";
import { GameShell } from "../src/game/GameShell";
import {
  answerPlace,
  pinDistance,
  pinDistanceTier,
} from "../src/game/answerTargets";
import type { RegionFeature } from "../src/geography/types";
import type { GameState } from "../src/game/state";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(regions, COUNTRY_FACTS, journey);
const play = (roundIndex: number): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex,
});
const shell = (game: GameState) =>
  renderToStaticMarkup(
    <GameShell
      journey={journey}
      context={context}
      game={game}
      dispatch={() => {}}
      webgl
      frame={() => {}}
      onHome={() => {}}
      onStudy={() => {}}
    />,
  );
const answerAt = (roundIndex: number, lat: number, lng: number) => {
  const pinned = gameReducer(
    play(roundIndex),
    { type: "drop-pin", lat, lng },
    journey,
    context,
  );
  return gameReducer(pinned, { type: "submit" }, journey, context);
};

describe("Across the Divide", () => {
  it("keeps every target hidden during play, and reference markers outside the accepted radius", () => {
    expect(journey.rounds).toHaveLength(5);
    for (const [index, round] of journey.rounds.entries()) {
      if (round.rule.type !== "pin-distance")
        throw Error("Expected distance pin");
      const target = answerPlace(round, round.rule.targetId);
      expect(target).toBeTruthy();
      const start = play(index);
      const world = journeyWorld(regions, journey, start, context);
      expect(world.places).toEqual([]);
      expect(world.states["wurl:USA"]).toBe("default");
      expect(world.focus).toEqual({ lat: 0, lng: 0, altitude: 2.05 });
      expect(world.overlays).toEqual([]);
      const html = shell(start);
      expect(html).toContain(
        `src="/journeys/bridges/${String(index + 1).padStart(2, "0")}.v1.jpg"`,
      );
      expect(html).toContain(round.image!.alt);
      expect(html).not.toContain(target!.name);
      expect(html).not.toContain(round.feedbackImage!.credit.name);
      const reference = round.guidance!.assist!.places![0];
      const distance = pinDistance(round, { ...start, pin: reference });
      expect(distance).toBeGreaterThan(300);
      const assisted = gameReducer(
        gameReducer(start, { type: "request-hint" }, journey, context),
        { type: "request-assist" },
        journey,
        context,
      );
      const hinted = gameReducer(
        start,
        { type: "request-hint" },
        journey,
        context,
      );
      const hintedWorld = journeyWorld(regions, journey, hinted, context);
      expect(hintedWorld.focus).toEqual(round.guidance!.hintMap!.focus);
      expect(hintedWorld.states[round.guidance!.hintMap!.regionIds[0]]).toBe(
        "hinted",
      );
      const assistedWorld = journeyWorld(regions, journey, assisted, context);
      expect(assistedWorld.places.map((place) => place.id)).toEqual([
        reference.id,
      ]);
      expect(
        assistedWorld.places.some((place) => place.id === target!.id),
      ).toBe(false);
      expect(assistedWorld.focus).toEqual(round.guidance!.assist!.focus);
      if (index === 0) {
        expect(
          world.regions.some((region) => region.id === "wurl:USA-CA"),
        ).toBe(false);
        expect(
          assistedWorld.regions.some((region) => region.id === "wurl:USA-CA"),
        ).toBe(true);
        expect(assistedWorld.states["wurl:USA-CA"]).toBe("hinted");
        expect(assistedWorld.states["wurl:USA"]).toBe("default");
        expect(assistedWorld.states["wurl:CAN"]).toBe("default");
      }
    }
  });

  it("uses inclusive distance bands and reveals the target, rings, and measured distance after submission", () => {
    for (const [index, round] of journey.rounds.entries()) {
      if (round.rule.type !== "pin-distance")
        throw Error("Expected distance pin");
      const target = answerPlace(round, round.rule.targetId)!;
      for (const [km, feedback] of [
        [100, "Bullseye!"],
        [100.01, "Very close."],
        [200, "Very close."],
        [200.01, "In range."],
        [300, "In range."],
        [300.01, undefined],
      ] as const) {
        const lat = target.lat + ((km / 6371.0088) * 180) / Math.PI;
        const answered = answerAt(index, lat, target.lng);
        expect(answered.answers.at(-1)?.correct, `${round.id} ${km}`).toBe(
          feedback !== undefined,
        );
        expect(pinDistanceTier(round, answered)?.feedback).toBe(feedback);
      }
      const answered = answerAt(index, target.lat, target.lng);
      const world = journeyWorld(regions, journey, answered, context);
      expect(
        world.places.find((place) => place.id === target.id),
      ).toMatchObject({ kind: "pin", visualState: "answer" });
      expect(
        world.overlays
          ?.filter((overlay) => overlay.type === "circle")
          .map((ring) => ring.radiusKm),
      ).toEqual([100, 200, 300]);
      expect(shell(answered)).toContain("Your pin was less than 1 km away.");
      expect(world.focus).toEqual({
        lat: target.lat,
        lng: target.lng,
        altitude: 0.4,
      });
      const far = answerAt(index, 0, 0);
      const farFocus = journeyWorld(regions, journey, far, context).focus;
      expect(farFocus.altitude).toBeGreaterThan(0.4);
      expect(
        Math.abs(
          geoDistance([farFocus.lng, farFocus.lat], [target.lng, target.lat]) -
            geoDistance([farFocus.lng, farFocus.lat], [0, 0]),
        ),
      ).toBeLessThan(1e-6);
    }
  });

  it("recaps five credited photographs and distances beside visited bridge markers", () => {
    let game = play(0);
    for (const [index, round] of journey.rounds.entries()) {
      if (round.rule.type !== "pin-distance")
        throw Error("Expected distance pin");
      const target = answerPlace(round, round.rule.targetId)!;
      game = gameReducer(
        game,
        { type: "drop-pin", lat: target.lat, lng: target.lng },
        journey,
        context,
      );
      game = gameReducer(game, { type: "submit" }, journey, context);
      game = gameReducer(game, { type: "next" }, journey, context);
      expect(game.roundIndex).toBe(Math.min(index + 1, 4));
    }
    expect(game.phase).toBe("finished");
    const html = shell(game);
    expect(html.match(/class="journey-photo-result"/g) ?? []).toHaveLength(5);
    expect(html.match(/km away/g) ?? []).toHaveLength(5);
    expect(html.match(/Photo: /g) ?? []).toHaveLength(5);
    expect(journeyWorld(regions, journey, game, context).places).toHaveLength(
      5,
    );
    expect(journey.completion?.views).toHaveLength(6);
  });
});
