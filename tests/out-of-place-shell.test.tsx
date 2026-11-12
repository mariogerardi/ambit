// @vitest-environment jsdom
import { act } from "react";
import { expect, it } from "vitest";
import {
  host,
  mount,
  click,
  probe,
  world,
  root,
  resetRoot,
} from "./helpers/appShell";
import { outOfPlacePairs, outOfPlaceDeck } from "../src/minigames/outOfPlace";
import { startNeighborRun } from "../src/minigames/sharedNeighbors";
import { createNeighborSave } from "../src/minigames/sharedNeighborsSave";
import { createMinigameScores } from "../src/minigames/minigameScores";
const pairs = outOfPlacePairs(world);
it("opens Out of Place with city dots and country fills, then commits the first tap immediately", async () => {
  history.replaceState(null, "", "/minigames/out-of-place");
  await mount();
  expect(
    host
      .querySelector('[role="tab"][aria-label="Out of Place"]')
      ?.getAttribute("aria-selected"),
  ).toBe("true");
  expect(host.querySelector(".minigame-customize-toggle")).toBeNull();
  await click("Start new game");
  expect(probe.props!.places).toHaveLength(6);
  expect(probe.props!.regionInteraction).toBe(true);
  expect(probe.props!.placeInteraction).toBe(true);
  expect(host.textContent).not.toContain("Check answer");
  const store = createNeighborSave(undefined, "out-of-place");
  const run = store.load().run!;
  const pair = outOfPlaceDeck(pairs, world, run.seed, run.cycle)[run.index];
  for (const item of pair.items) {
    const place = probe.props!.places.find((p) => p.id === item.id)!;
    expect(!!place.markerHidden).toBe(item.type === "country");
    if (item.type === "country")
      expect(probe.props!.states[item.id]).toBe("selectable");
  }
  await act(async () =>
    probe.props!.onPlace(
      probe.props!.places.find((p) => p.id === pair.answer)!,
    ),
  );
  expect(store.load().run?.correct).toBe(1);
  expect(store.load().run?.answered).toBe(1);
  expect(probe.props!.placeInteraction).toBe(false);
  for (const city of pair.items.filter((i) => i.type === "city"))
    expect(probe.props!.states[city.parentId]).toBe("surface");
  expect(host.textContent).toContain("Next map");
  for (const item of pair.items)
    expect(probe.props!.places.find((p) => p.id === item.id)).toMatchObject({
      name: item.name,
      lat: item.lat,
      lng: item.lng,
    });
  await act(async () => root.unmount());
  resetRoot();
  await mount();
  expect(store.load().run?.answered).toBe(1);
  expect(host.textContent).toContain("Next map");
  await click("Next map");
  expect(probe.props!.places).toHaveLength(6);
  expect(probe.props!.placeInteraction).toBe(true);
}, 15_000);
it("accepts a tap on a filled country but ignores background countries", async () => {
  const deck = outOfPlaceDeck(pairs, world, 42, 0);
  const index = deck.findIndex(
    (p) => p.items.find((i) => i.id === p.answer)!.type === "country",
  );
  expect(index).toBeGreaterThanOrEqual(0);
  const store = createNeighborSave(undefined, "out-of-place");
  store.save({
    version: 1,
    run: { ...startNeighborRun(pairs), seed: 42, index, kind: "out-of-place" },
  });
  history.replaceState(null, "", "/minigames/out-of-place/play");
  await mount();
  const pair = deck[index];
  expect(probe.props!.places.map((p) => [p.id, p.name]).sort()).toEqual(
    pair.displayed.map((p) => [p.id, p.name]).sort(),
  );
  const background = world.find((r) => !pair.items.some((i) => i.id === r.id))!;
  await act(async () => probe.props!.onSelect(background));
  expect(store.load().run?.answered).toBe(0);
  await act(async () =>
    probe.props!.onSelect(world.find((r) => r.id === pair.answer)!),
  );
  expect(store.load().run?.correct).toBe(1);
  expect(probe.props!.states[pair.answer]).toBe("correct");
});
it("handles three wrong taps, corrected-marker recap, high scores and replay", async () => {
  const store = createNeighborSave(undefined, "out-of-place");
  store.save({
    version: 1,
    run: { ...startNeighborRun(pairs), seed: 42, kind: "out-of-place" },
  });
  history.replaceState(null, "", "/minigames/out-of-place/play");
  await mount();
  for (let i = 0; i < 3; i++) {
    const run = store.load().run!;
    const pair = outOfPlaceDeck(pairs, world, run.seed, run.cycle)[run.index];
    const wrong = probe.props!.places.find((p) => p.id !== pair.answer)!;
    await act(async () => probe.props!.onPlace(wrong));
    expect(host.textContent).toContain(wrong.name);
    expect(store.load().run?.answered).toBe(i + 1);
    if (i < 2) await click("Next map");
  }
  expect(host.textContent).toContain("third strike");
  expect(
    createMinigameScores(undefined, "out-of-place").load()[
      "best:out-of-place:v1"
    ],
  ).toBe(0);
  await click("See results");
  expect(host.textContent).toContain("Mistakes spotted");
  expect(host.textContent).not.toContain("Study ");
  expect(
    probe.props!.places.some((p) => p.name !== "" && p.name !== "Missed pin"),
  ).toBe(true);
  expect(probe.props!.places.some((p) => p.kind === "pin")).toBe(false);
  expect(new Set(probe.props!.places.map((p) => p.id)).size).toBe(
    probe.props!.places.length,
  );
  for (const place of probe.props!.places.filter((p) =>
    p.id.startsWith("wurl:"),
  )) {
    expect(place.markerHidden).toBe(true);
    expect(probe.props!.states[place.id]).toBe(place.visualState);
  }
  await click("Play again");
  expect(store.load().run?.answered).toBe(0);
  expect(probe.props!.places).toHaveLength(6);
});
