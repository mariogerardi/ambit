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
  reviewOutcomes,
  isReviewStage,
  restoreReview,
  reviewRound,
  reviewState,
} from "../src/app/journeyReview";
import { gameReducer, initialGame, startRound } from "../src/game/state";
import { recipeJourney } from "../src/game/authoringCapabilities";
import { MECHANIC_RECIPES, PRESENTATION_RECIPES } from "../src/game/recipes";
import { auditJourney } from "../src/game/journeyAudit";
import { currentReviewStage } from "../src/app/AdminJourneyReview";
import { journeyWorld } from "../src/app/journeyWorld";

const context = createQuestionContext(world, [], bird);
const day = "2026-11-02";
const clock = () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${day}T16:00:00Z`));
};
async function changeReviewState(value: string) {
  await click(
    (
      {
        hint: "Hint",
        assist: "Assist",
        missed: "Missed",
        "completion-mixed": "Mixed results",
        completion: "All correct",
        partial: "Very close.",
      } as Record<string, string>
    )[value],
  );
  await settleLoads();
}

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
    await click("Reset");
    expect(cards()).toEqual(before);
    expect(reviewRound(bird, 0).ordered).toEqual(
      startRound(bird.rounds[0], 0, () => 0).ordered,
    );
    await changeReviewState("hint");
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
    expect(host.querySelector(".review-state-buttons")).not.toBeNull();
    expect(host.textContent).not.toContain("Schedule Journey →");
    await changeReviewState("assist");
    expect(
      host.querySelector('[aria-label="First: Sweden, locked by assist"]'),
    ).not.toBeNull();
    await changeReviewState("missed");
    expect(host.querySelector(".round-feedback")).not.toBeNull();
    await changeReviewState("completion-mixed");
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
    expect(panel?.textContent).toContain("Review");
    expect(panel?.textContent).toContain("Preview · Journey completion");
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

  it("previews lower tiers through the production review shell", async () => {
    const question = MECHANIC_RECIPES.find((q) => q.id === "recipe:pin")!;
    await mount({
      reviewSource: {
        journey: recipeJourney(question),
        seed: 17,
        stage: "play",
      },
    });
    await changeReviewState("partial");
    expect(host.querySelector(".round-feedback")?.textContent).toContain(
      "Very close.",
    );
    expect(host.textContent).not.toContain("Compare question copy");
    await changeReviewState("completion");
    expect(host.querySelector(".finish-story")).not.toBeNull();
  });

  it.each(
    MECHANIC_RECIPES.filter((q) =>
      ["pin-distance", "numeric-range", "bearing-angle"].includes(q.rule.type),
    ).flatMap((q) =>
      reviewOutcomes(q)
        .filter((outcome) => outcome.stage.startsWith("tier-"))
        .map((outcome) => ({ question: q, ...outcome })),
    ),
  )(
    "grades and classifies the $stage outcome for $question.id",
    async ({ question, stage }) => {
      const journey = recipeJourney(question);
      const context = createQuestionContext(world, [], journey);
      const game = await reviewState(journey, context, 0, stage, 17);
      expect(game.phase).toBe("feedback");
      expect(game.answers[0].points).toBe(3 - Number(stage.slice(5)));
      expect(
        currentReviewStage(
          restoreReview(journey, captureReview(journey, game)),
          journey,
        ),
      ).toBe(stage);
      expect(isReviewStage(stage)).toBe(true);
    },
  );

  it("keeps a fully missed two-answer preview distinct from partial credit", async () => {
    const original = MECHANIC_RECIPES.find(
      (q) => q.partialCredit === "one-of-two",
    )!;
    expect(
      reviewOutcomes(original).some((outcome) => outcome.stage === "missed"),
    ).toBe(false);
    const question = {
      ...original,
      selection: {
        type: "ids" as const,
        ids: ["wurl:CAN", "wurl:MEX", "wurl:USA", "wurl:DEU"],
      },
    };
    const journey = recipeJourney(question);
    const context = createQuestionContext(world, [], journey);
    const missed = await reviewState(journey, context, 0, "missed", 1);
    const partial = await reviewState(journey, context, 0, "partial", 1);
    expect(missed.answers[0].points).toBe(0);
    expect(partial.answers[0].points).toBe(1);
    expect(currentReviewStage(partial, journey)).toBe("partial");
    await expect(
      reviewState(journey, context, 0, "tier-99", 1),
    ).rejects.toThrow("does not provide that outcome");
  });

  it("switches local sources and returns to Admin without remounting the globe or replacing fetch", async () => {
    history.replaceState(null, "", "/admin?section=journeys");
    await mount();
    const request = window.fetch;
    const before = JSON.stringify(createDailySave(JOURNEY_INDEX).load());
    await click("Open menu");
    const link = host.querySelector<HTMLAnchorElement>(
      'a[href="/review/journeys.html"]',
    )!;
    await act(async () =>
      link.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      ),
    );
    await settleLoads();
    expect(host.querySelector(".review-heading h2")).not.toBeNull();
    const select = host.querySelector<HTMLSelectElement>(
      ".review-journey-switch select",
    )!;
    await act(async () => {
      select.value = "imLikeABirdJourney.ts";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await settleLoads();
    expect(host.querySelector(".review-heading h2")?.textContent).toBe(
      bird.title,
    );
    await click("Assist");
    expect(
      host.querySelector('[aria-label="First: Sweden, locked by assist"]'),
    ).not.toBeNull();
    await click("← Journeys");
    expect(location.pathname).toBe("/admin");
    expect(window.fetch).toBe(request);
    expect(probe.mounts).toBe(1);
    expect(JSON.stringify(createDailySave(JOURNEY_INDEX).load())).toBe(before);
  });

  it("starts in source Review without saves, then navigates to Study in the same app", async () => {
    history.replaceState(
      null,
      "",
      "/review/journeys.html?module=imLikeABirdJourney.ts",
    );
    const writes = vi.spyOn(Storage.prototype, "setItem");
    await mount();
    expect(host.querySelector(".review-heading h2")?.textContent).toBe(
      bird.title,
    );
    expect(
      writes.mock.calls.filter(([key]) =>
        /wurl\.(daily|study)|ambit\.progress/.test(key),
      ),
    ).toEqual([]);
    await click("Open menu");
    await click("Study");
    expect(location.pathname).toBe("/study");
    expect(probe.mounts).toBe(1);
    expect(
      host.querySelector('.mode-incoming [aria-label="Journey review"]'),
    ).toBeNull();
  });

  it("omits report submission from isolated source review", async () => {
    await mount({ reviewSource: { journey: bird, seed: 1, stage: "play" } });
    await click("Question information");
    expect(
      document.querySelector('[aria-label="Question information"]'),
    ).not.toBeNull();
    expect(document.body.textContent).not.toContain("Report this question");
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
