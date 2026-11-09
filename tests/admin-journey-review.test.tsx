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

async function changeSelect(label: string, value: string) {
  const select = [...host.querySelectorAll<HTMLSelectElement>("select")].find(
    (element) =>
      element.closest("label")?.textContent?.trim().startsWith(label),
  )!;
  expect(select).toBeDefined();
  await act(async () => {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await settleLoads();
}

async function openDisclosure(label: string) {
  const summary = [...host.querySelectorAll("summary")].find(
    (element) => element.textContent?.trim() === label,
  )!;
  expect(summary).toBeDefined();
  await act(async () => summary.click());
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
  expect(
    host.querySelector(".admin-review-toolbar")?.getAttribute("data-mode"),
  ).toBe("playtest");
  await click("Inspect");
  await changeSelect("Preview state", "correct");
  expect(host.querySelector(".round-feedback")).not.toBeNull();
  expect(save.load().attempts).toEqual(before);
  await changeSelect("Question", "1");
  await changeSelect("Preview state", "assist");
  await changeSelect("Preview state", "missed");
  expect(
    host.querySelector(".round-feedback.answer-discovered"),
  ).not.toBeNull();
  expect(host.querySelector(".admin-review-heading span")?.textContent).toBe(
    "2 of 5 · Capital · Requested · Missed reveal",
  );
  await changeSelect("Preview state", "play");
  expect(host.querySelector(".admin-review-heading span")?.textContent).toBe(
    "2 of 5 · Capital · Live · Question",
  );
  await click("Get a hint");
  expect(host.querySelector(".admin-review-heading span")?.textContent).toBe(
    "2 of 5 · Capital · Live · Hint",
  );
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
  await click("Inspect");
  await changeSelect("Preview state", "completion");
  expect(host.querySelector(".admin-review-heading span")?.textContent).toBe(
    "Journey completion · Requested · Sample completion",
  );
  expect(
    host.querySelector(".finish-story .journey-score")?.textContent,
  ).toContain("15/15");
  expect(host.querySelector('[aria-label="Journey review"]')).not.toBeNull();
  await openDisclosure("Advanced review tools");
  await click("Schedule this Journey");
  expect(location.search).toContain("section=schedule");
  expect(
    host.querySelector('[aria-label="Schedule reviewed Journey"]'),
  ).toBeNull();
  expect(
    host.querySelector(".schedule-proposed h4")?.textContent,
  ).toBe("Down the Danube");
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
  await click("Inspect");
  const questionSelect = [
    ...host.querySelectorAll<HTMLSelectElement>("select"),
  ].find((element) =>
    element.closest("label")?.textContent?.trim().startsWith("Question"),
  );
  expect(questionSelect?.value).toBe("2");
  await openDisclosure("Advanced review tools");
  await click("Schedule this Journey");
  expect(location.search).toContain("date=2026-10-29");
  expect(
    host.querySelector(".schedule-assignment-heading h3")?.textContent,
  ).toContain("October 29");
});
