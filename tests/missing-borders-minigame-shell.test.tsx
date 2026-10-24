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

it("plays from the preview, restores country borders on reveal, and resumes without remounting Earth", async () => {
  const pairs = missingBorderPairs(world),
    run = startNeighborRun(pairs);
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
  await act(async () => root.unmount());
  resetRoot();
  await mount();
  await click("Preview Missing Borders");
  await click("Resume game");
  expect(probe.props!.regions.some((r) => r.id === second.answer)).toBe(true);
  expect(createNeighborSave().load().run).toBeUndefined();
});

it("ends at three strikes and can restart or finish early from a direct public link", async () => {
  history.replaceState(null, "", "/minigames/missing-borders/play");
  await mount();
  const initial = createNeighborSave(undefined, "missing-borders").load().run!;
  for (let i = 1; i <= 3; i++) {
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
  expect(probe.props!.regionInteraction).toBe(true);
  expect(probe.mounts).toBe(1);
});
