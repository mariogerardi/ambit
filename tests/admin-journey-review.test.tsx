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

it("reviews real outcomes without changing Daily attempts or normal practice", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-27T16:00:00Z"));
  const save = createDailySave(JOURNEY_INDEX);
  save.save(openDaily(save.load(), "2026-10-27"));
  history.replaceState(null, "", "/journey/down-the-danube?review=1");
  await mount();
  const before = structuredClone(save.load().attempts);
  expect(host.querySelector('[aria-label="Journey review"]')).not.toBeNull();
  await click("Show correct reveal");
  expect(host.querySelector(".round-feedback")).not.toBeNull();
  expect(save.load().attempts).toEqual(before);
  await act(async () => {
    const select = host.querySelector<HTMLSelectElement>(
      '[aria-label="Journey review"] select',
    )!;
    select.value = "1";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await click("Show assist");
  await click("Show missed reveal");
  expect(
    host.querySelector(".round-feedback.answer-discovered"),
  ).not.toBeNull();
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
  await click("Show sample completion");
  expect(
    host.querySelector(".finish-story .journey-score")?.textContent,
  ).toContain("15/15");
  expect(host.querySelector('[aria-label="Journey review"]')).not.toBeNull();
  await click("Schedule this Journey");
  expect(location.search).toContain("section=schedule");
  expect(
    host.querySelector('[aria-label="Schedule reviewed Journey"]'),
  ).not.toBeNull();
  expect(host.querySelector(".scheduled-journey-preview.is-draft")).toBeNull();
});

it("rejects review URLs for non-admin players", async () => {
  authProbe.admin = false;
  history.replaceState(null, "", "/journey/down-the-danube?review=1");
  await mount();
  expect(location.pathname).toBe("/");
  expect(host.querySelector('[aria-label="Journey review"]')).toBeNull();
});
