// @vitest-environment jsdom
// Install shared mocks before importing the application.
import {
  authProbe,
  click,
  host,
  member,
  mount,
  probe,
} from "./helpers/appShell";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { DAILY_KEY, openDaily } from "../src/app/dailyProgress";
import { createDailySave } from "../src/app/progressSaves";
import { ANDES_JOURNEY } from "../src/game/andesJourney";
import { CANADA_JOURNEY } from "../src/game/canadaJourney";
import { DANUBE_JOURNEY } from "../src/game/danubeJourney";
import { SHARED_NAMES_JOURNEY } from "../src/game/sharedNamesJourney";
import { ADRIATIC_REPUBLICS, FOURTH_JOURNEY } from "../src/game/fourthJourney";
import * as journeyRegistry from "../src/game/journeyRegistry";
import { NORTH_AMERICA_JOURNEY as FIFTH_JOURNEY } from "../src/game/northAmericaJourney";
import { initialGame } from "../src/game/state";

describe("app journey shell (DOM only; no browser or WebGL)", () => {
  it.each([CANADA_JOURNEY, ANDES_JOURNEY])(
    "renders usable third-question choices for $title",
    async (journey) => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(2026, 9, 5, 12));
      const date = "2026-10-05";
      localStorage.setItem(
        DAILY_KEY,
        JSON.stringify({
          version: 1,
          activeDate: date,
          attempts: {
            [date]: {
              date,
              journeyId: journey.id,
              scheduleVersion: 1,
              game: { ...initialGame, phase: "playing", roundIndex: 2 },
            },
          },
        }),
      );
      history.replaceState(null, "", "/daily");
      await mount();
      const choices = [
        ...host.querySelectorAll<HTMLButtonElement>(
          ".mode-incoming .candidate-grid button",
        ),
      ];
      expect(choices).toHaveLength(6);
      if (journey === CANADA_JOURNEY) {
        expect(
          probe.props!.regions.some((region) => region.id === "wurl:CAN-NB"),
        ).toBe(true);
        expect(probe.props!.states["wurl:CAN"]).not.toBe("hinted");
        await click("New Brunswick");
        await click("Submit answer");
        expect(probe.props!.states["wurl:CAN-NB"]).toBe("correct");
        expect(probe.props!.states["wurl:CAN-ON"]).toBe("disabled");
        expect(host.querySelector(".round-feedback")!.textContent).toContain(
          "Correct answer: New Brunswick",
        );
      } else {
        expect(probe.props!.regionInteraction).toBe(true);
        expect(probe.props!.regionNames).toBe("all");
        expect(host.textContent).toContain(
          "Which two countries share Lake Titicaca?",
        );
        expect(host.textContent).not.toContain("Choose two countries.");
        await click("Peru");
        expect(
          host.querySelector<HTMLButtonElement>(
            ".mode-incoming .question-answer-actions .answer-submit-button",
          )!.disabled,
        ).toBe(true);
        await act(async () => probe.props!.onSelect(member("wurl:BOL")));
        await click("Submit answer");
        expect(host.querySelector(".round-feedback")!.textContent).toContain(
          "Well spotted.",
        );
        expect(probe.props!.states["wurl:PER"]).toBe("correct");
        expect(probe.props!.states["wurl:BOL"]).toBe("correct");
      }
    },
  );

  it.each(
    (["finished", "failed"] as const).flatMap((phase) =>
      [true, false].map((admin) => ({ phase, admin })),
    ),
  )(
    "keeps $phase Daily results without replay (admin: $admin)",
    async ({ phase, admin }) => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(2026, 9, 6, 12));
      authProbe.admin = admin;
      const date = "2026-10-06";
      const save = createDailySave(journeyRegistry.JOURNEY_INDEX);
      const progress = openDaily(
        save.load(),
        date,
        false,
        journeyRegistry.JOURNEY_INDEX,
      );
      const attempt = progress.attempts[date];
      save.save({
        ...progress,
        attempts: {
          [date]: {
            ...attempt,
            game: {
              ...attempt.game,
              phase,
              roundIndex: 4,
              answers: journeyRegistry.JOURNEY_INDEX.find(
                (journey) => journey.id === attempt.journeyId,
              )!.rounds.map((round) => ({
                roundId: round.id,
                correct: true,
                selectedIds: [],
                text: "",
                ordered: [],
              })),
            },
          },
        },
      });
      history.replaceState(null, "", "/daily");
      await mount();
      if (phase === "finished")
        expect(host.textContent).not.toContain("JOURNEY COMPLETE");
      await click("Open menu");
      expect(host.querySelector(".app-menu-caption")).toBeNull();
      await click("Close menu");
      expect(host.querySelector(".journey-replay")).toBeNull();
      expect(host.querySelector(".journey-receipt")).not.toBeNull();
      expect(save.load().attempts[date].runId).toBe(attempt.runId);
      expect(save.load().attempts[date].game.phase).toBe(phase);
    },
  );

  it.each([false, true])(
    "tours finished Journey answers and stops on navigation (reduced motion: %s)",
    async (reduced) => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(2026, 9, 6, 12));
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches: reduced && query === "(prefers-reduced-motion: reduce)",
        addEventListener() {},
        removeEventListener() {},
      }));
      const date = "2026-10-06";
      localStorage.setItem(
        DAILY_KEY,
        JSON.stringify({
          version: 1,
          activeDate: date,
          attempts: {
            [date]: {
              date,
              journeyId: SHARED_NAMES_JOURNEY.id,
              scheduleVersion: 1,
              game: {
                ...initialGame,
                phase: "finished",
                roundIndex: 4,
                answers: SHARED_NAMES_JOURNEY.rounds.map((round) => ({
                  roundId: round.id,
                  correct: true,
                  selectedIds: [],
                  text: "",
                  ordered: [],
                  pin: { lat: 0, lng: 0 },
                })),
              },
            },
          },
        }),
      );
      history.replaceState(null, "", "/daily");
      await mount();
      expect(
        [...host.querySelectorAll(".finish-actions button")].map(
          (button) => button.textContent,
        ),
      ).toEqual(["Share result", "Sign in to compare with friends →"]);
      expect(
        host.querySelector(".finish-story .completion-navigation"),
      ).toBeNull();
      expect(host.textContent).not.toContain(
        "The same Journey, with a fresh start.",
      );
      if (reduced) {
        expect(probe.tours).toHaveLength(0);
        expect(probe.focus.at(-1)).toMatchObject(
          SHARED_NAMES_JOURNEY.completion!.focus,
        );
        const controls = host.querySelector(
          '[aria-label="Completion map views"]',
        )!;
        expect(controls.textContent).toContain("Map overview");
        expect(
          controls.querySelector<HTMLButtonElement>("button:nth-of-type(2)")
            ?.disabled,
        ).toBe(true);
        const views = SHARED_NAMES_JOURNEY.completion!.views!;
        for (const [index, view] of views.entries()) {
          await click("Next view");
          expect(probe.focus.at(-1)).toMatchObject(view);
          expect(controls.textContent).toContain(
            `Map view ${index + 1} of ${views.length}`,
          );
        }
        expect(
          controls.querySelector<HTMLButtonElement>("button:last-of-type")
            ?.disabled,
        ).toBe(true);
        await click("Previous view");
        expect(probe.focus.at(-1)).toMatchObject(views.at(-2)!);
        await click("Overview");
        expect(probe.focus.at(-1)).toMatchObject(
          SHARED_NAMES_JOURNEY.completion!.focus,
        );
        expect(probe.tours).toHaveLength(0);
        await click("Study");
        expect(location.pathname).toBe("/study");
        expect(
          host.querySelector('.mode-incoming [aria-label="Study setup"]'),
        ).not.toBeNull();
      } else {
        expect(
          host.querySelector('[aria-label="Completion map views"]'),
        ).toBeNull();
        expect(probe.tours).toHaveLength(1);
        expect(probe.tours[0]).toEqual(SHARED_NAMES_JOURNEY.completion!.views);
        const before = probe.tourCancellations;
        await click("Home");
        expect(probe.tourCancellations).toBeGreaterThan(before);
        expect(probe.tours).toHaveLength(1);
      }
    },
  );

  it("resumes North America with one typing-only field and reveals the state route after submission", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(new Date(2026, 9, 5, 12));
    const date = "2026-10-05";
    localStorage.setItem(
      DAILY_KEY,
      JSON.stringify({
        version: 1,
        activeDate: date,
        overrides: { [date]: FIFTH_JOURNEY.id },
        attempts: {
          [date]: {
            date,
            journeyId: FIFTH_JOURNEY.id,
            scheduleVersion: 1,
            game: { ...initialGame, phase: "playing", roundIndex: 2 },
          },
        },
      }),
    );
    await mount();
    await click("Resume");
    expect(host.textContent).toContain("Name a U.S. state that borders Mexico");
    expect(probe.props!.showBorders).toBe(false);
    expect(probe.props!.regionNames).toBe("none");
    expect(probe.props!.places).toHaveLength(0);
    const fields = [
      ...host.querySelectorAll<HTMLInputElement>(
        ".mode-incoming .answer-form input",
      ),
    ];
    expect(fields).toHaveLength(1);
    const enter = async (field: HTMLInputElement, value: string) =>
      act(async () => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )!.set!.call(field, value);
        field.dispatchEvent(new Event("input", { bubbles: true }));
      });
    await enter(fields[0], "CA");
    await act(async () =>
      probe.props!.onSelect(
        probe.props!.regions.find((r) => r.id === "wurl:USA-TX")!,
      ),
    );
    expect(fields[0].value).toBe("CA");
    await click("Submit answer");
    expect(host.textContent).toContain("Nicely remembered.");
    expect(probe.props!.states["wurl:USA-CA"]).toBe("correct");
    const next = [...host.querySelectorAll<HTMLButtonElement>("button")].find(
      (b) => !b.closest("[inert]") && b.textContent?.includes("Next"),
    )!;
    await act(async () => next.click());
    expect(host.textContent).toContain(
      "fewest number of state border crossings",
    );
    expect(probe.props!.showBorders).toBe(false);
    await enter(
      host.querySelector<HTMLInputElement>(
        ".mode-incoming .answer-form input",
      )!,
      "4",
    );
    await click("Submit answer");
    expect(probe.props!.showBorders).toBe(true);
    expect(host.textContent).toContain(
      "California → Arizona → New Mexico → Oklahoma → Missouri",
    );
    await click("Admin");
    expect(host.textContent).toContain("Daily Journey schedule");
    await click("Choose a Journey");
    expect(
      host.querySelector('[data-journey-id="north-america-v2"]'),
    ).not.toBeNull();
    expect(probe.mounts).toBe(1);
  });

  it("plays the Danube through visible controls and supplies progressive river geography and an authored completion", async () => {
    history.replaceState(null, "", "/journey/down-the-danube");
    await mount();
    expect(probe.props!.physicalFeatures?.map((f) => f.name)).toEqual([
      "Danube",
    ]);
    const copy = host.querySelector(".mode-incoming .journey-question-copy")!;
    expect(copy.querySelector(".journey-lead-in")?.textContent).toContain(
      "southern Germany",
    );
    expect(copy.querySelector(".journey-prompt")?.textContent).toContain(
      "Which other river",
    );
    const actions = host.querySelector(
      ".mode-incoming .question-answer-actions",
    )!;
    const buttons = actions.querySelectorAll<HTMLButtonElement>("button");
    expect(buttons[0].textContent).toContain("Get a hint");
    expect(buttons[0].disabled).toBe(false);
    expect(buttons[0].type).toBe("button");
    expect(buttons[1].textContent).toContain("Submit answer");
    await click("Get a hint");
    expect(host.textContent).toContain("toward Lake Constance");
    await click("Need an assist?");
    expect(
      probe.props!.places?.find((p) => p.name === "Lake Constance")
        ?.markerHidden,
    ).toBe(true);
    await click("Rhine");
    await click("Submit answer");
    expect(
      host.querySelector(".mode-incoming .feedback-label")?.textContent,
    ).toContain("Nice connection.");
    expect(probe.props!.states["wurl:DEU"]).toBe("hinted");
    expect(probe.props!.physicalFeatures?.map((f) => f.name)).toContain(
      "Rhine",
    );
    await click("Next");
    expect(probe.props!.showBorders).toBe(true);
    expect(probe.props!.places).toEqual([]);
    expect(probe.props!.regionNames).toBe("none");
    expect(probe.props!.onCoordinateTap).toBeTypeOf("function");
    await act(async () =>
      probe.props!.onCoordinateTap!({ lat: 48.208, lng: 16.373 }),
    );
    await click("Submit pin");
    expect(probe.props!.physicalFeatures?.map((f) => f.name)).toContain(
      "Danube",
    );
    await click("Next");
    const answer = host.querySelector<HTMLInputElement>(
      ".mode-incoming #written-answer",
    )!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(answer, "Budapest");
      answer.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await click("Submit answer");
    expect(probe.props!.places.map((p) => p.name)).toEqual(["Budapest"]);
    expect(probe.props!.states["wurl:HUN"]).toBe("hinted");
    expect(
      host
        .querySelector(".mode-incoming .river-banks-diagram svg")
        ?.getAttribute("aria-label"),
    ).toContain("Schematic");
    await click("Next");
    expect(probe.props!.regionInteraction).toBe(false);
    expect(probe.props!.selectDisabled).toBe(false);
    expect(probe.props!.namedRegionIds).toEqual([]);
    expect(probe.props!.physicalFeatures?.some((f) => f.paths?.length)).toBe(
      true,
    );
    expect(probe.props!.places.some((p) => p.name === "Iron Gates")).toBe(true);
    await click("Croatia");
    const croatiaButton = [
      ...host.querySelectorAll(".mode-incoming button"),
    ].find((b) => b.textContent?.includes("Croatia"))!;
    expect(croatiaButton.getAttribute("aria-pressed")).toBe("true");
    expect(probe.props!.states["wurl:HRV"]).toBe("clue");
    expect(
      probe.props!.places.some((p) => p.sourceId === "journey-response"),
    ).toBe(false);
    await click("Croatia");
    expect(probe.props!.states["wurl:HRV"]).toBe("clue");
    await click("Serbia");
    await click("Romania");
    await click("Submit answer");
    expect(
      host.querySelector(".mode-incoming .journey-correct-answer")?.textContent,
    ).toContain("Romania");
    await click("Next");
    expect(probe.props!.physicalFeatures?.length).toBe(5);
    await click("Black Sea");
    await click("Submit answer");
    expect(probe.props!.physicalFeatures?.map((f) => f.name)).toContain(
      "Black Sea",
    );
    const toursBeforeCompletion = probe.tours.length;
    await click("See results");
    expect(probe.tours.length).toBe(toursBeforeCompletion + 1);
    expect(probe.tours.at(-1)).toEqual(DANUBE_JOURNEY.completion!.views);
    expect(probe.tours.at(-1)!.length).toBeGreaterThan(1);
    expect(
      host.querySelector(".mode-incoming .journey-score")?.textContent,
    ).toContain("13/15");
    expect(
      host.querySelector(".mode-incoming .journey-correct-count")?.textContent,
    ).toBe("5/5 correct answers");
    expect(
      host.querySelector(".mode-incoming .journey-receipt")?.textContent,
    ).toContain("Vienna");
    expect(probe.props!.places.map((p) => p.name)).toEqual([
      "Danube seepage",
      "Vienna",
      "Budapest",
      "Iron Gates",
      "Danube Delta",
    ]);
    expect(
      probe.props!.physicalFeatures?.some((f) => f.name === "Black Sea"),
    ).toBe(true);
  });

  it("allows four coastal republic picks through the globe's eligibility states before submitting", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 5, 12));
    const date = "2026-10-05";
    localStorage.setItem(
      DAILY_KEY,
      JSON.stringify({
        version: 1,
        activeDate: date,
        attempts: {
          [date]: {
            date,
            journeyId: FOURTH_JOURNEY.id,
            scheduleVersion: 1,
            game: { ...initialGame, phase: "playing", roundIndex: 3 },
          },
        },
      }),
    );
    history.replaceState(null, "", "/daily");
    await mount();
    for (const id of ADRIATIC_REPUBLICS) {
      expect(probe.props!.states[id]).not.toBe("disabled");
      await act(async () => probe.props!.onSelect(member(id)));
      expect(probe.props!.states[id]).toBe("selected");
    }
    expect(
      JSON.parse(localStorage.getItem(DAILY_KEY)!).attempts[date].game
        .selectedIds,
    ).toHaveLength(4);
    await click("Submit answer");
    expect(host.textContent).toContain("Well spotted.");
  });

  it("lets Island Instincts use either country taps or six immediate choices without making the clue answerable", async () => {
    history.replaceState(null, "", "/journey/island-instincts");
    await mount();
    const canvas = host.querySelector("canvas");
    expect(
      host.querySelectorAll(".mode-incoming .candidate-grid button"),
    ).toHaveLength(6);
    expect(
      host.querySelector(".mode-incoming .question-card")!.textContent,
    ).toContain("Andaman and Nicobar");
    const clue = probe.props!.regions.find(
      (r) => r.id === "clue-part:wurl:IND",
    )!;
    expect(probe.props!.clueLocators).toEqual([
      expect.objectContaining({ label: "Andaman & Nicobar", region: clue }),
    ]);
    await act(async () => probe.props!.onSelect(clue));
    expect(host.querySelector(".mode-incoming .round-feedback")).toBeNull();
    await act(async () =>
      probe.props!.onSelect(
        probe.props!.regions.find((r) => r.id === "wurl:IND")!,
      ),
    );
    expect(
      host.querySelector(".mode-incoming .round-feedback")!.textContent,
    ).toContain("Correct answer: India");
    expect(probe.props!.states["clue-part:wurl:IND"]).toBe("correct");
    expect(probe.props!.clueLocators).toEqual([]);
    await act(async () => probe.props!.onSelect(member("wurl:MMR")));
    expect(
      host.querySelector(".mode-incoming .round-feedback")!.textContent,
    ).toContain("Correct answer: India");
    await click("Next");
    expect(
      host.querySelector(".mode-incoming .question-card")!.textContent,
    ).toContain("Bioko Norte");
    expect(probe.props!.clueLocators?.map((c) => c.label)).toEqual(["Bioko"]);
    const answer = [
      ...host.querySelectorAll<HTMLButtonElement>(
        ".mode-incoming .candidate-grid button",
      ),
    ].find((b) => b.textContent?.includes("Equatorial Guinea"))!;
    await act(async () => answer.click());
    expect(
      host.querySelector(".mode-incoming .round-feedback")!.textContent,
    ).toContain("Correct answer: Equatorial Guinea");
    expect(probe.props!.states["wurl:GNQ"]).toBe("correct");
    expect(host.querySelector("canvas")).toBe(canvas);
  });
});
