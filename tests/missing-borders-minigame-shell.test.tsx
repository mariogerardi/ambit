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
import { missingBorderPairs } from "../src/minigames/missingBorders";
import {
  neighborDeck,
  startNeighborRun,
} from "../src/minigames/sharedNeighbors";

const pairs = missingBorderPairs(world);
const seededRun = () => ({ ...startNeighborRun(pairs), seed: 123 });

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
  await click("Back to games");
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
      (r) => !r.id.startsWith("composite:"),
    )!;
    await act(async () => probe.props!.onSelect(wrong));
    if (i < 3) await click("Next map");
  }
  expect(host.querySelector(".missing-borders-game h1")?.textContent).toBe(
    "Three strikes.",
  );
  expect(probe.props!.selectDisabled).toBe(true);
  expect(probe.props!.regionInteraction).toBe(false);
  expect(
    host.querySelector(".shared-neighbors-feedback h2")?.textContent,
  ).toContain(" + ");
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
  await click("Finish game");
  expect(host.querySelector(".missing-borders-game h1")?.textContent).toBe(
    "Game finished.",
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
