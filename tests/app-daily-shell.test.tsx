// @vitest-environment jsdom
// Install shared mocks before importing the application.
import {
  authProbe,
  click,
  host,
  member,
  mount,
  probe,
  resetRoot,
  root,
  scheduleState,
  settleLoads,
} from "./helpers/appShell";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { DAILY_KEY, localDateKey, openDaily } from "../src/app/dailyProgress";
import { createDailySave } from "../src/app/progressSaves";
import { MOBILE_LAYOUT_QUERY } from "../src/app/useMobileLayout";
import { ANDES_JOURNEY } from "../src/game/andesJourney";
import { CANADA_JOURNEY } from "../src/game/canadaJourney";
import { FIFTEENTH_JOURNEY } from "../src/game/fifteenthJourney";
import { FOURTH_JOURNEY } from "../src/game/fourthJourney";
import * as journeyRegistry from "../src/game/journeyRegistry";
import { initialGame } from "../src/game/state";

describe("app daily shell (DOM only; no browser or WebGL)", () => {
  it("plays and resumes a historical Journey from Home without replacing today's attempt", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-19T16:00:00Z"));
    authProbe.admin = false;
    const past = "2026-10-11",
      today = "2026-11-19";
    scheduleState.records[past] = {
      day: past,
      journeyId: ANDES_JOURNEY.id,
      source: "assigned",
      revision: 2,
    };
    const store = createDailySave(journeyRegistry.JOURNEY_INDEX);
    const seeded = openDaily(
      store.load(),
      today,
      false,
      journeyRegistry.JOURNEY_INDEX,
      { [today]: CANADA_JOURNEY.id },
    );
    seeded.attempts[today].game.text = "today's saved draft";
    store.save(seeded);
    await mount();
    expect(
      host.querySelector('.daily-menu [data-dd-action-name="Home Archive"]'),
    ).toBeNull();
    probe.currentView = { lat: 12, lng: 112, altitude: 1.65 };
    const archiveButton = host.querySelector(
      '[data-dd-action-name="Home Archive"]',
    )!;
    expect(archiveButton.closest(".menu-secondary")).not.toBeNull();
    expect(
      archiveButton
        .querySelector(".home-archive-face")
        ?.getAttribute("aria-hidden"),
    ).toBe("true");
    const flights = probe.focus.length;
    await click("Journey archive");
    expect(location.pathname).toBe("/archive");
    expect(probe.mounts).toBe(1);
    expect(probe.props!.active).toBe(true);
    expect(probe.props!.motion).toBe(true);
    expect(probe.currentView).toEqual({ lat: 12, lng: 112, altitude: 1.65 });
    expect(probe.focus).toHaveLength(flights);
    expect(host.querySelector(".experience.page-layout")).toBeNull();
    expect(host.querySelector(".game-scene")!.hasAttribute("inert")).toBe(
      false,
    );
    expect(host.querySelector(".account-earth")).toBeNull();
    await click("Pause Earth");
    expect(probe.props!.motion).toBe(false);
    const topline = host.querySelector(".archive-heading")!;
    expect(
      host.querySelector(".journey-archive")!.firstElementChild?.className,
    ).toContain("explore-heading");
    expect(topline.querySelector("h1")?.textContent).toBe("Journey archive.");
    expect(host.textContent).not.toContain("PAST JOURNEYS");
    expect(topline.querySelector("button")?.textContent).toContain(
      "Today’s Journey",
    );
    expect(host.textContent).not.toContain(
      "A different way to see the world, one day at a time.",
    );
    await click("Previous month");
    expect(
      host.querySelector<HTMLButtonElement>(
        'button[aria-label="Previous month"]',
      )!.disabled,
    ).toBe(true);
    const dateButton = host.querySelector<HTMLButtonElement>(
      'button[aria-label^="October 11, 2026"]',
    )!;
    expect(dateButton.disabled).toBe(false);
    await act(async () => dateButton.click());
    expect(probe.focus).toHaveLength(flights);
    await click("Play Journey");
    expect(location.pathname).toBe("/archive/2026-10-11");
    expect(
      host.querySelector(".journey-archive-context")?.textContent,
    ).toContain("October 11, 2026");
    await click("Bogotá");
    const submit = host.querySelector<HTMLButtonElement>(
      '[data-dd-action-name="Answer Submit"]',
    );
    if (submit && !submit.disabled) await act(async () => submit.click());
    await settleLoads();
    const saved = createDailySave(journeyRegistry.JOURNEY_INDEX).load();
    expect(saved.attempts[past].game.answers).toHaveLength(1);
    expect(saved.attempts[past].game.answers[0].correct).toBe(true);
    expect(saved.attempts[today]).toEqual(seeded.attempts[today]);
    await click("← Journey archive");
    await act(async () =>
      host
        .querySelector<HTMLButtonElement>(
          'button[aria-label^="October 11, 2026"]',
        )!
        .click(),
    );
    await click("Resume Journey");
    expect(host.querySelector(".round-feedback")?.textContent).toContain(
      "Bogotá",
    );
    await click("← Journey archive");
    await click("Today’s Journey");
    expect(location.pathname).toBe("/daily");
    expect(
      createDailySave(journeyRegistry.JOURNEY_INDEX).load().attempts[today],
    ).toEqual(seeded.attempts[today]);
  });

  it("records an archive completion on the day earned and opens its saved result directly", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-19T16:00:00Z"));
    authProbe.admin = false;
    const past = "2026-10-11";
    const store = createDailySave(journeyRegistry.JOURNEY_INDEX);
    const seeded = openDaily(
      store.load(),
      past,
      false,
      journeyRegistry.JOURNEY_INDEX,
      { [past]: ANDES_JOURNEY.id },
    );
    seeded.attempts[past].game = {
      ...initialGame,
      phase: "playing",
      roundIndex: 4,
      answers: ANDES_JOURNEY.rounds.slice(0, 4).map((q) => ({
        ...initialGame,
        roundId: q.id,
        correct: true,
        points: 3,
        pointsVersion: 1,
      })),
    };
    store.save(seeded);
    history.replaceState(null, "", "/archive/2026-10-11");
    await mount();
    const question = ANDES_JOURNEY.rounds[4];
    if (question.rule.type !== "choice-ids")
      throw Error("Expected final choice");
    const correctId = question.rule.ids[0];
    await click(question.choices!.find((c) => c.id === correctId)!.label);
    const submit = host.querySelector<HTMLButtonElement>(
      '[data-dd-action-name="Answer Submit"]',
    );
    if (submit && !submit.disabled) await act(async () => submit.click());
    await settleLoads();
    expect(
      createDailySave(journeyRegistry.JOURNEY_INDEX).load().attempts[past]
        .completedOn,
    ).toBe("2026-10-19");
    await click("See results");
    expect(host.querySelector(".journey-score")?.textContent).toContain(
      "15/15",
    );
    expect(host.textContent).not.toContain("Play again");
    await click("← Journey archive");
    const completedDay = host.querySelector<HTMLButtonElement>(
      'button[aria-label^="October 11, 2026"]',
    )!;
    expect(completedDay.getAttribute("aria-label")).toContain(
      "Completed · 15/15 points",
    );
    expect(
      completedDay.querySelector(".archive-completed-icon"),
    ).not.toBeNull();
    await act(async () =>
      host
        .querySelector<HTMLButtonElement>(
          'button[aria-label^="October 11, 2026"]',
        )!
        .click(),
    );
    await click("View result");
    expect(host.querySelector(".journey-score")?.textContent).toContain(
      "15/15",
    );
    expect(
      createDailySave(journeyRegistry.JOURNEY_INDEX).load().attempts[past]
        .completedOn,
    ).toBe("2026-10-19");
  });

  it.each(["2026-10-10", "2026-10-19", "2026-10-20", "2026-02-30"])(
    "does not create attempts for a blocked archive link %s",
    async (date) => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-19T16:00:00Z"));
      history.replaceState(null, "", "/archive/" + date);
      await mount();
      expect(host.textContent).toContain(
        "Choose a past day from October 11, 2026 onward.",
      );
      expect(
        createDailySave(journeyRegistry.JOURNEY_INDEX).load().attempts,
      ).toEqual({});
    },
  );

  it("clears the signed-in admin's Journey and starts a fresh attempt from Home", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 11, 12));
    authProbe.subject = "owner";
    const day = "2026-10-11";
    const save = createDailySave(journeyRegistry.JOURNEY_INDEX, "owner");
    const progress = openDaily(save.load(), day);
    save.save(progress);
    const fetcher = fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.includes("/account/saves"))
          return new Response(
            JSON.stringify(
              init?.method === "POST" ? { saved: true } : { entries: [] },
            ),
          );
        if (url.includes("/account/profile"))
          return new Response(JSON.stringify(null));
        return fetcher(url, init);
      }),
    );
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    history.replaceState(null, "", "/admin");
    await mount();
    // Let the initial account hydration run, without waiting for any real service.
    await act(async () => new Promise((resolve) => setTimeout(resolve, 30)));
    await click("Tools");
    await click("Clear my Journey attempt");
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain("Attempt cleared.");
    expect(save.load().attempts[day]).toBeUndefined();
    await click("Home");
    expect(host.querySelector(".daily-levels")?.textContent).not.toContain("✓");
    await click("Play");
    const fresh = save.load().attempts[day];
    expect(fresh.runId).not.toBe(progress.attempts[day].runId);
    expect(fresh.game).toMatchObject({
      phase: "playing",
      roundIndex: 0,
      answers: [],
    });
  });

  it("offers retained Journeys and the new sun and river Journeys in Admin", async () => {
    await mount();
    await click("Admin");
    await click("Choose a Journey");
    const options = [
      ...host.querySelectorAll<HTMLButtonElement>("[data-journey-id]"),
    ].map((button) => button.dataset.journeyId);
    expect(new Set(options)).toEqual(
      new Set(journeyRegistry.JOURNEY_INDEX.map((journey) => journey.id)),
    );
    const preview = [...host.querySelectorAll<HTMLAnchorElement>("a")].find(
      (link) => link.textContent?.includes("Preview five questions"),
    );
    expect(preview).toBeDefined();
    expect(
      journeyRegistry.JOURNEY_INDEX.some(
        (journey) =>
          `${journey.path}?review=1` === preview!.getAttribute("href"),
      ),
    ).toBe(true);
    for (const id of [
      "long-way-home-v2",
      "beyond-borders-v1",
      "silk-roads-v1",
      "north-america-v1",
      "enclosed-territories-v1",
      "borrowed-names-v1",
      "pins-and-cities-v1",
      "the-z-trail-v1",
    ])
      expect(options.includes(id)).toBe(false);
  });

  it("opens Admin on mobile without replacing Earth or losing the current attempt", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === MOBILE_LAYOUT_QUERY,
      addEventListener() {},
      removeEventListener() {},
    }));
    await mount();
    await click("Play");
    const earth = host.querySelector("canvas");
    const attempts = JSON.parse(localStorage.getItem(DAILY_KEY)!).attempts;
    await click("Admin");
    expect(host.querySelector(".mode-incoming .admin-panel")).not.toBeNull();
    expect(location.pathname + location.search).toBe(
      "/account?tab=admin&section=schedule",
    );
    expect(
      host.querySelector(".page-layout .admin-content .admin-panel"),
    ).not.toBeNull();
    expect(probe.props!.active).toBe(false);
    expect(host.querySelector("canvas")).toBe(earth);
    expect(JSON.parse(localStorage.getItem(DAILY_KEY)!).attempts).toEqual(
      attempts,
    );
    await click("Journey");
    await settleLoads();
    expect(probe.props!.active).toBe(true);
    expect(host.querySelector(".mode-incoming .question-card")).not.toBeNull();
    expect(host.querySelector("canvas")).toBe(earth);
    expect(probe.mounts).toBe(1);
  });

  it("keeps an unavailable custom attempt hidden while allowing today's Journey to save", async () => {
    const saved = {
      version: 1,
      activeDate: "2026-10-05",
      attempts: {
        "2026-10-05": {
          date: "2026-10-05",
          journeyId: "studio:published:unavailable",
          scheduleVersion: 1,
          game: { ...initialGame, phase: "playing" },
        },
      },
    };
    localStorage.setItem(DAILY_KEY, JSON.stringify(saved));
    await mount();
    await click("Play");
    const recovered = JSON.parse(localStorage.getItem(DAILY_KEY)!);
    expect(
      recovered.archivedAttempts["2026-10-05/studio:published:unavailable"],
    ).toEqual(saved.attempts["2026-10-05"]);
    expect(recovered.attempts[localDateKey()].journeyId).not.toBe(
      "studio:published:unavailable",
    );
    expect(host.textContent).not.toContain("won’t be saved after this visit");
  });

  it("publishes an assignment for new attempts without replacing a started Journey", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(new Date(2026, 9, 11, 12));
    scheduleState.assignments["2026-10-11"] = CANADA_JOURNEY.id;
    scheduleState.records["2026-10-11"] = {
      day: "2026-10-11",
      journeyId: CANADA_JOURNEY.id,
      source: "assigned",
      revision: 2,
    };
    await mount();
    await click("Play");
    await act(async () => probe.props!.onSelect(member("wurl:CAN")));
    const canvas = host.querySelector("canvas");
    await click("Admin");
    await click("Choose a Journey");
    await act(async () =>
      host
        .querySelector<HTMLButtonElement>(
          '[data-journey-id="mediterranean-v1"]',
        )!
        .click(),
    );
    await click("Assign for Oct 11");
    expect(scheduleState.assignments["2026-10-11"]).toBe("mediterranean-v1");
    expect(host.textContent).toContain(
      "Published Around the Mediterranean for Sun, Oct 11.",
    );
    expect(host.querySelector("canvas")).toBe(canvas);
    await click("Home");
    await click("Resume");
    expect(host.textContent).toContain("Well spotted.");
    expect(
      JSON.parse(localStorage.getItem(DAILY_KEY)!).attempts["2026-10-11"]
        .journeyId,
    ).toBe(CANADA_JOURNEY.id);
    await act(async () => {
      root.unmount();
      resetRoot();
    });
    localStorage.clear();
    history.replaceState(null, "", "/");
    await mount();
    expect(host.querySelector(".daily-menu h2")?.textContent).toBe(
      FOURTH_JOURNEY.title,
    );
    await click("Play");
    expect(host.textContent).toContain("Which country faces Spain across it?");
  });

  it("preserves history but expires the playable attempt at midnight and on reload", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(new Date("2026-10-06T03:59:59Z"));
    authProbe.admin = false;
    await mount();
    await click("Play");
    await act(async () => probe.props!.onSelect(member("wurl:CAN")));
    expect(host.textContent).toContain("Well spotted.");
    await act(async () => vi.advanceTimersByTime(1026));
    await settleLoads();
    const saved = JSON.parse(localStorage.getItem(DAILY_KEY)!);
    expect(saved.activeDate).toBe("2026-10-06");
    expect(saved.attempts["2026-10-05"].game.answers).toHaveLength(1);
    expect(host.textContent).toContain("Which country faces Spain across it?");
    await click("Home");
    expect(host.textContent).not.toContain("Continue 2026-10-05");
    await click("Resume");
    await act(async () => {
      root.unmount();
      resetRoot();
    });
    await mount();
    expect(host.textContent).toContain("Which country faces Spain across it?");
    expect(host.textContent).not.toContain("Canada’s federal level");
  });

  it("assigns a future calendar date and restores its rotation when cleared", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 11, 12));
    await mount();
    const offeredTitle = host.querySelector(".daily-menu h2")?.textContent;
    await click("Admin");
    await click("Mon, Oct 12");
    await click("Choose a Journey");
    await act(async () =>
      host
        .querySelector<HTMLButtonElement>(
          `[data-journey-id="${ANDES_JOURNEY.id}"]`,
        )!
        .click(),
    );
    await click("Assign for Oct 12");
    expect(scheduleState.assignments).toEqual({
      "2026-10-12": ANDES_JOURNEY.id,
    });
    expect(host.textContent).toContain(
      "Published Along the Andes for Mon, Oct 12.",
    );
    await click("Home");
    expect(host.querySelector(".daily-menu h2")?.textContent).toBe(
      offeredTitle,
    );
    await click("Admin");
    await click("Mon, Oct 12");
    await click("Use automatic selection instead");
    await click("Restore automatic selection");
    expect(scheduleState.assignments).toEqual({});
    expect(host.textContent).toContain(
      "Restored automatic selection for Mon, Oct 12.",
    );
  });

  it("blocks guessing today's edition when the shared schedule cannot load", async () => {
    const assets = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) =>
        url.includes("/journeys/schedule")
          ? Promise.resolve(new Response("unavailable", { status: 503 }))
          : assets(url, init),
      ),
    );
    await mount();
    const play = host.querySelector<HTMLButtonElement>(
      ".daily-menu .primary-button",
    )!;
    expect(play.disabled).toBe(true);
    expect(host.textContent).toContain("Retry schedule");
    expect(JSON.parse(localStorage.getItem(DAILY_KEY)!).attempts).toEqual({});
  });

  it("redirects non-admin practice URLs to Home", async () => {
    authProbe.admin = false;
    for (const path of ["/journey/mediterranean"]) {
      history.replaceState(null, "", path);
      await mount();
      expect(location.pathname).toBe("/");
      expect(host.querySelector(".daily-menu")).not.toBeNull();
      expect(host.textContent).not.toContain(
        "Which country faces Spain across it?",
      );
      await act(async () => {
        root.unmount();
        resetRoot();
      });
    }
  });

  it("introduces today's selected Journey with title, description and five-round progress", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 6, 12));
    const date = "2026-10-06";
    localStorage.setItem(
      DAILY_KEY,
      JSON.stringify({
        version: 1,
        attempts: {},
        archivedAttempts: {},
        overrides: { [date]: FIFTEENTH_JOURNEY.id },
      }),
    );
    scheduleState.assignments[date] = FIFTEENTH_JOURNEY.id;
    scheduleState.records[date] = {
      day: date,
      journeyId: FIFTEENTH_JOURNEY.id,
      source: "assigned",
      revision: 2,
    };
    await mount();
    const daily = host.querySelector(".daily-menu")!;
    expect(daily.querySelector(".daily-menu-eyebrow")?.textContent).toBe(
      "TODAY’S JOURNEY",
    );
    expect(daily.querySelector("h2")?.textContent).toBe(
      FIFTEENTH_JOURNEY.title,
    );
    expect(daily.querySelector(".daily-menu-description")?.textContent).toBe(
      FIFTEENTH_JOURNEY.description,
    );
    expect(daily.querySelector("time")).toBeNull();
    expect(daily.querySelectorAll(".daily-trail-stop")).toHaveLength(5);
  });
});
