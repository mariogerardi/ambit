// @vitest-environment jsdom
import {
  authProbe,
  click,
  host,
  mount,
  probe,
  settleLoads,
} from "./helpers/appShell";
import { act } from "react";
import { expect, it, vi } from "vitest";
import { createDailySave } from "../src/app/progressSaves";
import { openDaily } from "../src/app/dailyProgress";
import { JOURNEY_INDEX } from "../src/game/journeyRegistry";
import { DANUBE_JOURNEY } from "../src/game/danubeJourney";

async function question(index: number) {
  const button = host.querySelectorAll<HTMLButtonElement>(
    ".review-question-list button",
  )[index];
  await act(async () => button.click());
  await settleLoads();
}
async function state(label: string) {
  await click(label);
  await settleLoads();
}

it("reviews real outcomes without changing Daily attempts or normal practice", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-27T16:00:00Z"));
  const save = createDailySave(JOURNEY_INDEX);
  save.save(openDaily(save.load(), "2026-10-27"));
  history.replaceState(null, "", "/journey/down-the-danube?review=1");
  await mount();
  const before = structuredClone(save.load().attempts);
  expect(host.querySelector('[aria-label="Journey review"]')).not.toBeNull();
  await state("Correct");
  expect(host.querySelector(".round-feedback")).not.toBeNull();
  expect(save.load().attempts).toEqual(before);
  await question(1);
  await state("Assist");
  await state("Missed");
  expect(
    host.querySelector(".round-feedback.answer-discovered"),
  ).not.toBeNull();
  expect(host.querySelector(".review-preview-status")?.textContent).toBe(
    "Preview · 0/3 points",
  );
  await state("Reset");
  await click("Get a hint");
  expect(host.querySelector(".review-preview-status")?.textContent).toBe(
    "Player view · Hint shown",
  );
  expect(new URLSearchParams(location.search).get("state")).toBe("hint");
  expect(save.load().attempts).toEqual(before);
  await act(async () => {
    history.pushState(null, "", "/journey/down-the-danube");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await settleLoads();
  expect(
    host.querySelector('.mode-incoming [aria-label="Journey review"]'),
  ).toBeNull();
  expect(
    host
      .querySelector(".mode-incoming .question-card")
      ?.getAttribute("data-question-id"),
  ).toBe(DANUBE_JOURNEY.rounds[0].id);
  expect(host.querySelector(".mode-incoming .round-feedback")).toBeNull();
  expect(save.load().attempts).toEqual(before);
  expect(probe.mounts).toBe(1);
});

it("previews a complete recap and returns to scheduling without publishing", async () => {
  history.replaceState(null, "", "/journey/down-the-danube?review=1");
  await mount();
  await state("All correct");
  expect(host.querySelector(".review-preview-status")?.textContent).toBe(
    "Preview · Journey completion",
  );
  expect(
    host.querySelector(".finish-story .journey-score")?.textContent,
  ).toContain("15/15");
  expect(host.querySelector('[aria-label="Journey review"]')).not.toBeNull();
  await click("Schedule Journey →");
  expect(location.search).toContain("section=schedule");
  expect(
    host.querySelector('[aria-label="Schedule reviewed Journey"]'),
  ).toBeNull();
  expect(host.querySelector(".schedule-proposed h4")?.textContent).toBe(
    "Down the Danube",
  );
});

it("rejects review URLs for non-admin players", async () => {
  authProbe.admin = false;
  history.replaceState(null, "", "/journey/down-the-danube?review=1");
  await mount();
  expect(location.pathname).toBe("/");
  expect(host.querySelector('[aria-label="Journey review"]')).toBeNull();
});

it("opens a reported question and carries the publish date back to scheduling", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-27T16:00:00Z"));
  history.replaceState(
    null,
    "",
    `/journey/down-the-danube?review=1&date=2026-10-29&question=${encodeURIComponent(DANUBE_JOURNEY.rounds[2].id)}`,
  );
  await mount();
  expect(
    host.querySelector('[aria-label="Review questions"] [aria-current="step"]')
      ?.textContent,
  ).toContain("3");
  await click("Schedule Journey →");
  expect(location.search).toContain("date=2026-10-29");
  expect(
    host.querySelector(".schedule-assignment-heading h3")?.textContent,
  ).toContain("October 29");
});

it("keeps the selected question when inspecting completion and synchronizes ordinary progression", async () => {
  history.replaceState(null, "", "/journey/down-the-danube?review=1");
  await mount();
  await question(1);
  await state("Hint");
  await state("Mixed results");
  await state("Back to question");
  expect(host.querySelector(".review-preview-status")?.textContent).toBe(
    "Preview · Hint shown",
  );
  expect(
    host.querySelector(".question-card")?.getAttribute("data-question-id"),
  ).toBe(DANUBE_JOURNEY.rounds[1].id);
  await state("Correct");
  await click("Next");
  expect(new URLSearchParams(location.search).get("question")).toBe(
    DANUBE_JOURNEY.rounds[2].id,
  );
  expect(new URLSearchParams(location.search).get("state")).toBe("play");
  await state("Hide tools");
  expect(host.querySelector("#review-controls")?.hasAttribute("hidden")).toBe(
    true,
  );
  await state("Show tools");
  expect(
    host.querySelector(".question-card")?.getAttribute("data-question-id"),
  ).toBe(DANUBE_JOURNEY.rounds[2].id);
});

it("reopens a registered outcome URL and switches Journeys with the scheduling date intact", async () => {
  history.replaceState(
    null,
    "",
    `/journey/down-the-danube?review=1&date=2026-11-10&question=${DANUBE_JOURNEY.rounds[1].id}&state=missed`,
  );
  await mount();
  expect(host.querySelector(".round-feedback")).not.toBeNull();
  const select = host.querySelector<HTMLSelectElement>(
    ".review-journey-switch select",
  )!;
  const next = JOURNEY_INDEX.find((entry) => entry.id !== DANUBE_JOURNEY.id)!;
  await act(async () => {
    select.value = next.id;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await settleLoads();
  expect(location.pathname).toBe(next.path);
  expect(new URLSearchParams(location.search).get("date")).toBe("2026-11-10");
  expect(host.querySelector(".review-heading h2")?.textContent).toBe(
    next.title,
  );
});

it("keeps fast preview preparation quiet and announces only a sustained wait", async () => {
  history.replaceState(null, "", "/journey/down-the-danube?review=1");
  await mount();
  const previews = await import("../src/app/journeyReview");
  const { createQuestionContext } = await import(
    "../src/game/questionPreparation"
  );
  const { world } = await import("./helpers/appShell");
  const prepared = await previews.reviewState(
    DANUBE_JOURNEY,
    createQuestionContext(world, [], DANUBE_JOURNEY),
    0,
    "correct",
    1,
  );
  let resolve!: (game: typeof prepared) => void;
  const pending = new Promise<typeof prepared>((done) => {
    resolve = done;
  });
  const sample = vi.spyOn(previews, "reviewState").mockReturnValueOnce(pending);
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const button = [
    ...host.querySelectorAll<HTMLButtonElement>(".review-state-buttons button"),
  ].find((button) => button.textContent === "Correct")!;
  await act(async () => button.click());
  expect(host.textContent).not.toContain("Preparing preview");
  expect(button.matches(":disabled")).toBe(false);
  await act(async () => vi.advanceTimersByTime(201));
  expect(host.textContent).toContain("Preparing preview");
  await act(async () => resolve(prepared));
  expect(host.textContent).not.toContain("Preparing preview");
  expect(host.querySelector(".review-preview-status")?.textContent).toBe(
    "Preview · 3/3 points",
  );
  sample.mockRestore();
  vi.useRealTimers();
});
