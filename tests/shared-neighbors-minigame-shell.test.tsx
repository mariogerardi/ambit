// @vitest-environment jsdom
import {
  click,
  host,
  mount,
  probe,
  root,
  resetRoot,
  authProbe,
  world,
} from "./helpers/appShell";
import { act } from "react";
import { expect, it } from "vitest";
import { createNeighborSave } from "../src/minigames/sharedNeighborsSave";
import { buildBorderGraph } from "../src/game/reasoning";
import {
  sharedNeighborPairs,
  startNeighborRun,
  neighborDeck,
} from "../src/minigames/sharedNeighbors";
import { CAPITALS } from "../src/game/quizData";

it("plays, reveals, advances, and resumes the same shuffled deck without remounting Earth", async () => {
  authProbe.admin = false;
  const pairs = sharedNeighborPairs(buildBorderGraph(world));
  const run = startNeighborRun(pairs);
  createNeighborSave().save({ version: 1, run });
  const pair = neighborDeck(pairs, run.seed, 0)[0];
  await mount();
  await click("Minigames");
  await click("Preview Shared Neighbors");
  await click("Resume game");
  expect(location.pathname).toBe("/minigames/shared-neighbors/play");
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(probe.mounts).toBe(1);
  expect(probe.props!.showBorders).toBe(false);
  expect(probe.props!.regionNames).toBe("none");
  expect(probe.props!.borderRegionIds).toEqual(pair.countries);
  expect(probe.props!.states![pair.answer]).toBe("surface");
  expect(
    host.querySelector<HTMLButtonElement>(
      ".shared-neighbors-game .primary-button",
    )!.disabled,
  ).toBe(true);
  expect(host.querySelector(".minigame-answer-area")!.textContent).toContain(
    "Borders are hidden. Place your pin in the shared neighbor.",
  );
  const pin =
    CAPITALS.find((c) => c.countryId === pair.answer) ??
    world.find((c) => c.id === pair.answer)!.focus;
  await act(async () =>
    probe.props!.onCoordinateTap!({ lat: pin.lat, lng: pin.lng }),
  );
  expect(host.querySelector(".minigame-answer-area")!.textContent).toContain(
    "Pin placed. Move it or check your answer.",
  );
  expect(
    host.querySelector(".minigame-answer-area")!.textContent,
  ).not.toContain("Borders are hidden.");
  await click("Check answer");
  expect(
    host.querySelector(".shared-neighbors-feedback h2")?.textContent,
  ).toBeTruthy();
  expect(host.querySelector(".shared-neighbors-score")?.textContent).toContain(
    "1 correct",
  );
  expect(probe.props!.onCoordinateTap).toBeUndefined();
  await click("Next pair");
  const second = neighborDeck(pairs, run.seed, 0)[1];
  expect(probe.props!.borderRegionIds).toEqual(second.countries);
  expect(createNeighborSave().load().run?.index).toBe(1);
  await act(async () =>
    host.querySelector<HTMLElement>(".minigame-menu summary")!.click(),
  );
  await click("All games");
  await act(async () => root.unmount());
  resetRoot();
  await mount();
  await click("Preview Shared Neighbors");
  await click("Resume game");
  expect(probe.props!.borderRegionIds).toEqual(second.countries);
  expect(host.querySelector(".shared-neighbors-score")?.textContent).toContain(
    "1 correct",
  );
});

it("starts a new run from a direct public play link", async () => {
  authProbe.admin = false;
  history.replaceState(null, "", "/minigames/shared-neighbors/play");
  await mount();
  expect(host.querySelector(".shared-neighbors-game")).not.toBeNull();
  expect(probe.props!.onCoordinateTap).toBeTypeOf("function");
  expect(createNeighborSave().load().run).toBeDefined();
});

it("ends after three strikes, reveals the answer, and starts a fresh shuffled run", async () => {
  history.replaceState(null, "", "/minigames/shared-neighbors/play");
  await mount();
  const initial = createNeighborSave().load().run!;
  for (let strike = 1; strike <= 3; strike++) {
    await act(async () => probe.props!.onCoordinateTap!({ lat: 0, lng: -140 }));
    await click("Check answer");
    if (strike < 3) await click("Next pair");
  }
  expect(host.querySelector(".shared-neighbors-game h1")?.textContent).toBe(
    "Which country borders both?",
  );
  expect(
    host.querySelector(".shared-neighbors-feedback h2")?.textContent,
  ).toBeTruthy();
  expect(host.querySelector(".shared-neighbors-results")).toBeNull();
  expect(
    [...host.querySelectorAll("button")].some(
      (b) => b.textContent === "Play again",
    ),
  ).toBe(false);
  expect(probe.props!.onCoordinateTap).toBeUndefined();
  expect(document.activeElement).toBe(
    [...host.querySelectorAll("button")].find(
      (b) => b.textContent === "See results →",
    ),
  );
  expect(createNeighborSave().load().run?.ended).toBe("strikes");
  await click("See results");
  expect(host.querySelector(".minigame-overview")).not.toBeNull();
  expect(probe.tours.length).toBeGreaterThan(0);
  expect(probe.props!.places.some((p) => p.id.startsWith("recap:guess:"))).toBe(
    true,
  );
  await click("Play again");
  const restarted = createNeighborSave().load().run!;
  expect(restarted.id).not.toBe(initial.id);
  expect(restarted).toMatchObject({ answered: 0, correct: 0 });
  expect(probe.props!.onCoordinateTap).toBeTypeOf("function");
  expect(probe.mounts).toBe(1);
});

it("finishes early, restores the results after reload, and offers Play from the preview", async () => {
  history.replaceState(null, "", "/minigames/shared-neighbors/play");
  await mount();
  await act(async () => probe.props!.onCoordinateTap!({ lat: 0, lng: -140 }));
  await click("Finish game");
  expect(createNeighborSave().load().run).toMatchObject({
    ended: "finished",
    answered: 0,
  });
  expect(host.querySelector(".shared-neighbors-game h1")?.textContent).toBe(
    "Your neighbors, found.",
  );
  expect(probe.props!.onCoordinateTap).toBeUndefined();
  await act(async () => root.unmount());
  resetRoot();
  await mount();
  expect(host.querySelector(".shared-neighbors-game h1")?.textContent).toBe(
    "Your neighbors, found.",
  );
  await click("Choose another game");
  await click("Preview Shared Neighbors");
  expect(document.querySelector('[role="dialog"]')?.textContent).not.toContain(
    "Resume game",
  );
  await click("Play");
  expect(createNeighborSave().load().run).toMatchObject({
    answered: 0,
    correct: 0,
  });
  expect(createNeighborSave().load().run?.ended).toBeUndefined();
  expect(probe.props!.onCoordinateTap).toBeTypeOf("function");
});
