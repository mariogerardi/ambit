// @vitest-environment jsdom
import { act } from "react";
import { expect, it } from "vitest";
import {
  click,
  host,
  mount,
  probe,
  root,
  resetRoot,
  world,
} from "./helpers/appShell";
import { createNeighborSave } from "../src/minigames/sharedNeighborsSave";
import { defaultMinigameSettings } from "../src/minigames/minigameSettings";
import { createMinigameSettingsSave } from "../src/minigames/minigameSettingsSave";
import { missingBorderPairs } from "../src/minigames/missingBorders";
import {
  neighborDeck,
  startNeighborRun,
} from "../src/minigames/sharedNeighbors";

const pairs = missingBorderPairs(world);
const seededRun = () => {
  createMinigameSettingsSave(undefined, "missing-borders").save({
    ...defaultMinigameSettings,
    excludeSmallCountries: false,
  });
  return {
    ...startNeighborRun(pairs),
    seed: 123,
    settings: { ...defaultMinigameSettings, excludeSmallCountries: false },
  };
};

it("plays from the preview, restores country borders on reveal, and advances without remounting Earth", async () => {
  const run = seededRun();
  createNeighborSave(undefined, "missing-borders").save({ version: 1, run });
  const pair = neighborDeck(pairs, run.seed, 0)[0];
  await mount();
  await click("Minigames");
  await click("Preview Missing Borders");
  await click("Resume game");
  expect(location.pathname).toBe("/minigames/missing-borders/play");
  expect(probe.props!.onCoordinateTap).toBeUndefined();
  expect(probe.props!.regionInteraction).toBe(true);
  expect(probe.props!.regionNames).toBe("none");
  expect(
    host.querySelector(".missing-borders-game")?.textContent,
  ).not.toContain("Check answer");
  const merged = probe.props!.regions.find((r) => r.id === pair.answer)!;
  expect(merged).toBeDefined();
  await act(async () => probe.props!.onSelect(merged));
  expect(
    createNeighborSave(undefined, "missing-borders").load().run,
  ).toMatchObject({ answered: 1, correct: 1 });
  for (const id of pair.countries)
    expect(probe.props!.states[id]).toBe("correct");
  expect(probe.props!.regions.some((r) => r.id === pair.answer)).toBe(false);
  expect(probe.props!.regionInteraction).toBe(false);
  await click("Next map");
  const second = neighborDeck(pairs, run.seed, 0)[1];
  expect(probe.props!.regions.some((r) => r.id === second.answer)).toBe(true);
  await act(async () =>
    host.querySelector<HTMLElement>(".minigame-menu summary")!.click(),
  );
  await click("All games");
  expect(
    createNeighborSave(undefined, "missing-borders").load().run?.index,
  ).toBe(1);
  expect(probe.mounts).toBe(1);
});

it("restores saved feedback after reload and continues the same shuffled deck", async () => {
  const run = seededRun();
  const pair = neighborDeck(pairs, run.seed, 0)[0];
  createNeighborSave(undefined, "missing-borders").save({
    version: 1,
    run: {
      ...run,
      selectedId: pair.answer,
      result: true,
      answered: 1,
      correct: 1,
    },
  });
  history.replaceState(null, "", "/minigames/missing-borders/play");
  await mount();
  expect(probe.props!.regionInteraction).toBe(false);
  await act(async () => root.unmount());
  resetRoot();
  await mount();
  expect(host.querySelector(".shared-neighbors-score")?.textContent).toContain(
    "1 correct",
  );
  for (const id of pair.countries)
    expect(probe.props!.states[id]).toBe("correct");
  await click("Next map");
  const second = neighborDeck(pairs, run.seed, 0)[1];
  expect(probe.props!.regions.some((r) => r.id === second.answer)).toBe(true);
  expect(probe.props!.regionInteraction).toBe(true);
  expect(createNeighborSave().load().run).toBeUndefined();
});

it("offers the next map after a miss, then ends on the third strike and restarts", async () => {
  createNeighborSave(undefined, "missing-borders").save({
    version: 1,
    run: { ...seededRun(), index: 1, answered: 1 },
  });
  history.replaceState(null, "", "/minigames/missing-borders/play");
  await mount();
  const initial = createNeighborSave(undefined, "missing-borders").load().run!;
  for (let i = 2; i <= 3; i++) {
    const wrong = probe.props!.regions.find(
      (r) =>
        !r.id.startsWith("composite:") &&
        probe.props!.selectableRegionIds!.includes(r.id),
    )!;
    await act(async () => probe.props!.onSelect(wrong));
    if (i < 3) await click("Next map");
  }
  expect(host.querySelector(".missing-borders-game h1")?.textContent).toBe(
    "Which territory hides two countries?",
  );
  expect(probe.props!.selectDisabled).toBe(true);
  expect(probe.props!.regionInteraction).toBe(false);
  expect(
    host.querySelector(".shared-neighbors-feedback h2")?.textContent,
  ).toContain(" + ");
  await click("See results");
  await click("Play again");
  expect(
    createNeighborSave(undefined, "missing-borders").load().run?.id,
  ).not.toBe(initial.id);
  expect(probe.props!.regionInteraction).toBe(true);
  expect(
    createNeighborSave(undefined, "missing-borders").load().run,
  ).toMatchObject({ answered: 0, correct: 0 });
  expect(probe.mounts).toBe(1);
});

it("starts from a direct public link, finishes early, and reframes a fresh game", async () => {
  history.replaceState(null, "", "/minigames/missing-borders/play");
  await mount();
  const initial = createNeighborSave(undefined, "missing-borders").load().run!;
  expect(initial).toBeDefined();
  expect(host.querySelector(".minigame-action-row")).toBeNull();
  const menu = host.querySelector<HTMLDetailsElement>(".minigame-menu")!;
  await act(async () => menu.querySelector("summary")!.click());
  expect(menu.open).toBe(true);
  await act(async () =>
    menu.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    ),
  );
  expect(menu.open).toBe(false);
  await act(async () => menu.querySelector("summary")!.click());
  await click("Finish game");
  expect(host.querySelector(".missing-borders-game h1")?.textContent).toBe(
    "Your borders, uncovered.",
  );
  expect(
    createNeighborSave(undefined, "missing-borders").load().run,
  ).toMatchObject({ ended: "finished", answered: 0 });
  const focusCount = probe.focus.length;
  await click("Play again");
  expect(probe.focus.length).toBeGreaterThan(focusCount);
  expect(
    createNeighborSave(undefined, "missing-borders").load().run?.id,
  ).not.toBe(initial.id);
  expect(probe.props!.regionInteraction).toBe(true);
  expect(probe.mounts).toBe(1);
});

it("ignores countries outside the round's continent and remote parts outside its search area", async () => {
  const pairs = missingBorderPairs(world),
    run = seededRun();
  const deck = neighborDeck(pairs, run.seed, 0);
  run.index = deck.findIndex((pair) => pair.id === "wurl:BRA|wurl:FRA");
  createNeighborSave(undefined, "missing-borders").save({ version: 1, run });
  history.replaceState(null, "", "/minigames/missing-borders/play");
  await mount();
  expect(probe.props!.selectableRegionIds).toContain("wurl:SUR");
  expect(probe.props!.selectableRegionIds).not.toContain("wurl:DEU");
  const germany = probe.props!.regions.find((r) => r.id === "wurl:DEU")!;
  await act(async () => probe.props!.onSelect(germany));
  expect(
    createNeighborSave(undefined, "missing-borders").load().run?.answered,
  ).toBe(0);
  const merged = probe.props!.regions.find((r) =>
    r.id.startsWith("composite:"),
  )!;
  await act(async () =>
    probe.props!.onSelect(merged, { lat: 48.86, lng: 2.35 }),
  );
  expect(
    createNeighborSave(undefined, "missing-borders").load().run?.answered,
  ).toBe(0);
  await act(async () => probe.props!.onSelect(merged, { lat: 4, lng: -52 }));
  expect(
    createNeighborSave(undefined, "missing-borders").load().run,
  ).toMatchObject({ answered: 1, correct: 1 });
});
