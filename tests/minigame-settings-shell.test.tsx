// @vitest-environment jsdom
import { act } from "react";
import { expect, it } from "vitest";
import { click, host, mount, probe, world } from "./helpers/appShell";
import roster from "../src/game/data/un-members.v1.json";
import { buildBorderGraph } from "../src/game/reasoning";
import {
  sharedNeighborPairs,
  startNeighborRun,
} from "../src/minigames/sharedNeighbors";
import { createNeighborSave } from "../src/minigames/sharedNeighborsSave";
import { createMinigameSettingsSave } from "../src/minigames/minigameSettingsSave";
import { defaultMinigameSettings } from "../src/minigames/minigameSettings";

it("customizes Shared Neighbors without changing an unfinished run until Start new game", async () => {
  const initial = startNeighborRun(
    sharedNeighborPairs(buildBorderGraph(world)),
  );
  createNeighborSave().save({ version: 1, run: initial });
  history.replaceState(null, "", "/minigames/shared-neighbors");
  await mount();
  await click("Customize");
  const toggles = document.querySelectorAll<HTMLInputElement>(
    ".minigame-setting-row input",
  );
  expect(toggles[0].checked).toBe(true);
  expect(toggles[1].checked).toBe(false);
  expect(
    document.querySelector(".minigame-score-eligibility")!.textContent,
  ).toContain("Default rules");
  await act(async () => toggles[0].click());
  expect(
    document.querySelector(".minigame-score-eligibility")!.textContent,
  ).toContain("Custom rules");
  await act(async () => toggles[1].click());
  await act(async () =>
    document
      .querySelector<HTMLElement>(".minigame-country-picker summary")!
      .click(),
  );
  const brazil = [
    ...document.querySelectorAll<HTMLLabelElement>(
      ".minigame-country-list label",
    ),
  ]
    .find((label) => label.textContent === "Brazil")!
    .querySelector<HTMLInputElement>("input")!;
  await act(async () => brazil.click());
  expect(createNeighborSave().load().run).toEqual(initial);
  expect(
    createMinigameSettingsSave(undefined, "shared-neighbors").load(),
  ).toMatchObject({
    includeTerritories: false,
    excludeAdjacentClues: true,
    excludedCountries: ["wurl:BRA"],
  });
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
    "Starting a new game replaces your current game.",
  );
  await click("Start new game");
  const run = createNeighborSave().load().run!;
  expect(run.id).not.toBe(initial.id);
  expect(run.settings).toMatchObject({
    includeTerritories: false,
    excludeAdjacentClues: true,
    excludedCountries: ["wurl:BRA"],
  });
  expect(location.pathname).toBe("/minigames/shared-neighbors/play");
  expect(probe.mounts).toBe(1);
});

it("starts Missing Borders centered on the chosen continent", async () => {
  history.replaceState(null, "", "/minigames/missing-borders");
  await mount();
  await click("Customize");
  const selects = document.querySelectorAll<HTMLSelectElement>(
    ".minigame-setting-row select",
  );
  await act(async () => {
    selects[0].value = "EU";
    selects[0].dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(
    document.querySelector(
      '.minigame-search-choices button[aria-pressed="true"]',
    )?.textContent,
  ).toBe("Continent-wide");
  await click("Regional");
  await click("Continent-wide");
  await click("Play");
  expect(
    createNeighborSave(undefined, "missing-borders").load().run?.settings,
  ).toMatchObject({
    region: "EU",
    framing: "wide",
    excludeSmallCountries: true,
  });
  expect(probe.focus.at(-1)).toEqual({ lat: 50, lng: 20, altitude: 1.05 });
  expect(host.querySelector(".missing-borders-game")).not.toBeNull();
  expect(probe.props!.regionInteraction).toBe(true);
});

it("explains an empty pool, prevents starting it, and restores playable defaults", async () => {
  createMinigameSettingsSave(undefined, "shared-neighbors").save({
    ...defaultMinigameSettings,
    excludedCountries: roster.members.map((c) => c.id),
  });
  history.replaceState(null, "", "/minigames/shared-neighbors");
  await mount();
  expect(
    document.querySelector<HTMLButtonElement>(
      ".activity-preview-actions .primary-button",
    )!.disabled,
  ).toBe(true);
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
    "No puzzles match these settings.",
  );
  expect(createNeighborSave().load().run).toBeUndefined();
  await click("Customize");
  await click("Reset settings");
  expect(
    document.querySelector(".minigame-score-eligibility")!.textContent,
  ).toContain("Default rules");
  expect(
    document.querySelector<HTMLButtonElement>(
      ".activity-preview-actions .primary-button",
    )!.disabled,
  ).toBe(false);
  await click("Play");
  expect(createNeighborSave().load().run?.settings).toEqual(
    defaultMinigameSettings,
  );
  expect(probe.props!.onCoordinateTap).toBeTypeOf("function");
});
