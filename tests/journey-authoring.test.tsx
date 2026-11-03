// @vitest-environment jsdom
import {
  authProbe,
  click,
  host,
  mount,
  probe,
  scheduleState,
  settleLoads,
  world,
  root,
  resetRoot,
} from "./helpers/appShell";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { IM_LIKE_A_BIRD_JOURNEY as bird } from "../src/game/imLikeABirdJourney";
import { DRAWING_SAHARA_JOURNEY as sahara } from "../src/game/drawingSaharaJourney";
import { JOURNEY_INDEX } from "../src/game/journeyRegistry";
import { createDailySave } from "../src/app/progressSaves";
import { emptyDaily, openDaily } from "../src/app/dailyProgress";
import { createQuestionContext } from "../src/game/questionPreparation";
import {
  captureReview,
  restoreReview,
  reviewRound,
  reviewState,
} from "../src/app/journeyReview";
import { gameReducer, initialGame, startRound } from "../src/game/state";
import { recipeJourney } from "../src/game/authoringCapabilities";
import { MECHANIC_RECIPES, PRESENTATION_RECIPES } from "../src/game/recipes";
import { auditJourney } from "../src/game/journeyAudit";
import { journeyWorld } from "../src/app/journeyWorld";

const context = createQuestionContext(world, [], bird);
const day = "2026-11-02";
const clock = () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${day}T16:00:00Z`));
};

describe("Journey authoring and entry parity (DOM only)", () => {
  it("initializes fresh Daily inputs once and keeps a resumed ordering draft", async () => {
    clock();
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    scheduleState.assignments[day] = bird.id;
    scheduleState.records[day] = {
      day,
      journeyId: bird.id,
      source: "assigned",
      revision: 1,
    };
    history.replaceState(null, "", "/daily");
    await mount();
    const store = createDailySave(JOURNEY_INDEX);
    const game = store.load().attempts[day].game;
    expect(game.ordered).toEqual(
      startRound(bird.rounds[0], 0, () => 0).ordered,
    );
    expect(game.ordered).not.toEqual(bird.rounds[0].orderInitial);
    const draft = { ...game, ordered: [...game.ordered].reverse() };
    store.save({
      ...store.load(),
      attempts: { [day]: { ...store.load().attempts[day], game: draft } },
    });
    await act(async () =>
      dispatchEvent(
        new CustomEvent("ambit-progress-received", { detail: store.prefix }),
      ),
    );
    await settleLoads();
    await act(async () => root.unmount());
    resetRoot();
    await mount();
    expect(store.load().attempts[day].game.ordered).toEqual(draft.ordered);
    expect(
      gameReducer(draft, { type: "initialize-round" }, bird, context),
    ).toBe(draft);
    expect(
      gameReducer(
        { ...game, phase: "feedback" },
        { type: "initialize-round" },
        bird,
        context,
      ).phase,
    ).toBe("feedback");
    random.mockRestore();
  });

  it("uses stable fresh inputs for practice and Admin review without rerolling edits", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    history.replaceState(null, "", "/journey/im-like-a-bird?review=1");
    await mount();
    const cards = () =>
      [...host.querySelectorAll(".order-slots .order-card")].map(
        (e) => e.textContent,
      );
    const before = cards();
    await click("Restart question");
    expect(cards()).toEqual(before);
    expect(reviewRound(bird, 0).ordered).toEqual(
      startRound(bird.rounds[0], 0, () => 0).ordered,
    );
    await click("Show hint");
    expect(
      host.querySelector('[aria-label="Leave out: Italy, locked by hint"]'),
    ).not.toBeNull();
  });

  it("loads an unregistered draft through the production shell without reading or changing player progress", async () => {
    clock();
    const store = createDailySave(JOURNEY_INDEX);
    store.save(openDaily(emptyDaily, day));
    const before = JSON.stringify(store.load());
    const writes = vi.spyOn(Storage.prototype, "setItem");
    const draft = { ...bird, id: "unregistered-bird" };
    const inspect = vi.fn();
    history.replaceState(
      null,
      "",
      "/review/journeys.html?module=imLikeABirdJourney.ts",
    );
    await mount({
      reviewSource: {
        journey: draft,
        seed: 17,
        stage: "play",
        onInspect: inspect,
        navigation: <span>Draft source</span>,
      },
    });
    expect(JOURNEY_INDEX.some((j) => j.id === draft.id)).toBe(false);
    expect(host.textContent).toContain("Draft source");
    expect(host.textContent).not.toContain("Drag to rotate");
    for (const text of [
      "Show question",
      "Show hint",
      "Show assist",
      "Show correct reveal",
      "Show missed reveal",
    ]) {
      const button = [...host.querySelectorAll("button")].find(
        (b) => b.textContent?.trim() === text,
      )!;
      expect(button).toBeDefined();
      expect(button.closest("details")).toBeNull();
    }

    expect(host.textContent).not.toContain("Schedule this Journey");
    await click("Show assist");
    expect(
      host.querySelector('[aria-label="First: Sweden, locked by assist"]'),
    ).not.toBeNull();
    await click("Show missed reveal");
    expect(host.querySelector(".round-feedback")).not.toBeNull();
    await click("Show mixed completion");
    expect(host.querySelector(".finish-story")).not.toBeNull();
    expect(probe.mounts).toBe(1);
    expect(inspect).toHaveBeenLastCalledWith(0, "completion-mixed");
    expect(
      writes.mock.calls.filter(([key]) =>
        /wurl\.(daily|study)|ambit\.progress/.test(key),
      ),
    ).toEqual([]);
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(([url]) => String(url).includes("/journeys/schedule")),
    ).toBe(false);
    expect(JSON.stringify(store.load())).toBe(before);
  });

  it("keeps guest review explicitly local and preserves real signed-in account presentation", async () => {
    authProbe.admin = false;
    await mount({ reviewSource: { journey: bird, seed: 1, stage: "play" } });
    expect(host.textContent).toContain("Local workbench");
    expect(host.textContent).not.toContain("Sign in");
    expect(host.querySelector('[aria-label="Journey review"]')).not.toBeNull();
    authProbe.subject = "review-player";
    await mount({ reviewSource: { journey: bird, seed: 1, stage: "play" } });
    expect(host.querySelector('[aria-label="Account"]')).not.toBeNull();
    expect(host.textContent).not.toContain("Local workbench");
  });
  it("exits isolated draft review through real document navigation without changing the review URL", async () => {
    const onExit = vi.fn();
    history.replaceState(
      null,
      "",
      "/review/journeys.html?module=imLikeABirdJourney.ts",
    );
    await mount({
      reviewSource: { journey: bird, seed: 1, stage: "play", onExit },
    });
    await click("ambit home");
    expect(onExit).toHaveBeenCalledWith("/");
    expect(location.pathname).toBe("/review/journeys.html");
    await click("Open menu");
    await click("Home");
    expect(onExit).toHaveBeenCalledTimes(2);
  });
  it("keeps review tools separate from the question and omits completion review navigation", async () => {
    await mount({
      reviewSource: { journey: sahara, seed: 1, stage: "completion-mixed" },
    });
    expect(host.querySelector(".construction-recap-controls")).toBeNull();
    expect(host.querySelector(".journey-receipt details")).toBeNull();
    expect(host.textContent).not.toContain("Review your answer");
    expect(host.textContent).not.toContain("Stop flyover");
    const panel = host.querySelector(".journey-review-panel");
    expect(panel).not.toBeNull();
    expect(panel?.closest(".question-card, .finish-story")).toBeNull();
    expect(panel?.textContent).toContain("Journey review");
  });
  it("keeps construction inputs on the same production globe adapter in draft review", async () => {
    const draft = { ...sahara, id: "unregistered-construction" };
    await mount({ reviewSource: { journey: draft, seed: 1, stage: "play" } });
    expect(
      (
        probe.props as unknown as {
          constructionInput?: { question: { id: string } };
        }
      ).constructionInput?.question.id,
    ).toBe(draft.rounds[0].id);
  });

  it("reproduces seeded help and restores actual response captures without regrading receipts", async () => {
    const a = await reviewState(bird, context, 0, "assist", 18);
    const b = await reviewState(bird, context, 0, "assist", 18);
    expect(a).toEqual(b);
    expect(a.ordered[0]).toBe("wurl:SWE");
    expect(a.ordered).not.toContain("wurl:ITA");
    const missed = await reviewState(bird, context, 0, "missed", 18);
    expect(missed.answers[0].correct).toBe(false);
    expect(restoreReview(bird, captureReview(bird, missed))).toEqual(missed);
    expect(() =>
      restoreReview({ ...bird, saveRevision: 2 }, captureReview(bird, missed)),
    ).toThrow("does not match");
    expect(() =>
      restoreReview(
        bird,
        JSON.stringify({
          version: 1,
          journeyId: bird.id,
          revision: 1,
          game: { ...initialGame, roundIndex: 99 },
        }),
      ),
    ).toThrow("does not match");
  });

  it("previews lower tiers and paired copy through the production review shell", async () => {
    const question = MECHANIC_RECIPES.find((q) => q.id === "recipe:pin")!;
    await mount({
      reviewSource: {
        journey: recipeJourney(question),
        seed: 17,
        stage: "play",
      },
    });
    await click("Show partial / lower tier");
    expect(host.querySelector(".round-feedback")?.textContent).toContain(
      "Very close.",
    );
    const comparison = host.querySelector(".admin-review-editorial")!;
    expect(
      comparison.querySelector('[aria-label="Before answering"]')?.textContent,
    ).toContain(question.prompt);
    expect(
      comparison.querySelector('[aria-label="After answering"]')?.textContent,
    ).toContain(question.explanation);
    await click("Show sample completion");
    expect(host.querySelector(".finish-story")).not.toBeNull();
  });

  it("makes populated ordering a reusable audited composition, including help and reveal cleanup", () => {
    const question = PRESENTATION_RECIPES.find(
      (q) => q.id === "recipe:populated-country-order",
    )!;
    const journey = {
      id: "composition",
      title: "Composition",
      description: "Example",
      rounds: [question],
    };
    const context = createQuestionContext(world, [], journey);
    expect(auditJourney(journey, world).errors).toEqual([]);
    let game = gameReducer(initialGame, { type: "start" }, journey, context);
    game = gameReducer(game, { type: "request-hint" }, journey, context);
    game = gameReducer(game, { type: "request-assist" }, journey, context);
    game = gameReducer(game, { type: "clear" }, journey, context);
    expect(game.ordered[0]).toBe("wurl:CAN");
    expect(game.ordered).not.toContain("wurl:BRA");
    expect(journeyWorld(world, journey, game, context).regionInteraction).toBe(
      false,
    );
  });

  it("blocks an unknown scheduled Journey and preserves a displaced started edition", async () => {
    clock();
    scheduleState.records[day] = {
      day,
      journeyId: "newer-client-only",
      source: "assigned",
      revision: 1,
    };
    scheduleState.assignments[day] = "newer-client-only";
    history.replaceState(null, "", "/daily");
    await mount();
    expect(host.textContent).toContain(
      "Reload Ambit to open this day’s Journey",
    );
    const store = createDailySave(JOURNEY_INDEX);
    expect(store.load().attempts[day]).toBeUndefined();
    const previous = openDaily(emptyDaily, day, false, JOURNEY_INDEX, {
      [day]: bird.id,
    });
    previous.attempts[day].game.text = "saved draft";
    store.save(previous);
    await act(async () => root.unmount());
    resetRoot();
    await mount();
    expect(host.textContent).toContain(
      "Reload Ambit to open this day’s Journey",
    );
    expect(host.querySelector(".question-card")).toBeNull();
    expect(store.load().attempts[day]).toBeUndefined();
    expect(store.load().archivedAttempts?.[`${day}/${bird.id}`]).toEqual(
      previous.attempts[day],
    );
  });
});
