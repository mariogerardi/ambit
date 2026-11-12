// @vitest-environment jsdom
import { act } from "react";
import { expect, it } from "vitest";
import {
  host,
  mount,
  click,
  probe,
  world,
  resetRoot,
  root,
} from "./helpers/appShell";
import { sayWherePairs, sayWhereDeck } from "../src/minigames/sayWhere";
import { startNeighborRun } from "../src/minigames/sharedNeighbors";
import { createNeighborSave } from "../src/minigames/sharedNeighborsSave";
import { createMinigameScores } from "../src/minigames/minigameScores";
const pairs = sayWherePairs();
it("plays any qualifying country, reveals translation/sources, and resumes after reload without changing the language", async () => {
  const seed = Array.from({ length: 100 }, (_, i) => i).find(
    (seed) => sayWhereDeck(pairs, seed, 0)[0].answerIds.length > 1,
  )!;
  const pair = sayWhereDeck(pairs, seed, 0)[0];
  const store = createNeighborSave(undefined, "say-where");
  store.save({
    version: 1,
    run: { ...startNeighborRun(pairs), seed, kind: "say-where" },
  });
  history.replaceState(null, "", "/minigames/say-where/play");
  await mount();
  expect(host.querySelector('[aria-label="Say Where? game"]')).not.toBeNull();
  expect(host.querySelector(".journey-text-clue blockquote")?.textContent).toBe(
    pair.expression.native_text,
  );
  expect(host.querySelector(".journey-text-clue figcaption")).toBeNull();
  expect(host.querySelector(".say-where-sources")).toBeNull();
  await click("About Say Where?");
  expect(document.querySelector(".info-note-tooltip")?.textContent).toContain(
    "Widespread spoken use alone does not.",
  );
  expect(document.querySelector(".say-where-sources")).toBeNull();
  expect(
    document.querySelector(".info-note-tooltip")?.textContent,
  ).not.toContain(pair.language);
  await click("About Say Where?");
  const alternative = pair.answerIds[1];
  await act(async () =>
    probe.props!.onSelect(world.find((r) => r.id === alternative)!),
  );
  expect(store.load().run?.selectedId).toBe(alternative);
  await click("Check answer");
  expect(store.load().run?.correct).toBe(1);
  expect(probe.props!.states[alternative]).toBe("correct");
  expect(
    host.querySelector(".journey-text-clue figcaption")?.textContent,
  ).toContain(pair.expression.english_translation);
  expect(host.querySelector(".say-where-sources a")).toBeNull();
  await click("About Say Where?");
  expect(document.querySelectorAll(".say-where-sources a")).toHaveLength(
    pair.sources.length,
  );
  await act(async () => root.unmount());
  resetRoot();
  await mount();
  expect(
    host.querySelector(".journey-text-clue figcaption")?.textContent,
  ).toContain(pair.language);
  await click("Next expression");
  expect(host.querySelector(".journey-text-clue figcaption")).toBeNull();
  expect(document.querySelector(".say-where-sources")).toBeNull();
  expect(store.load().run?.answered).toBe(1);
  await act(async () =>
    host
      .querySelector<HTMLDetailsElement>(".minigame-menu")!
      .querySelector("summary")!
      .click(),
  );
  await click("Finish game");
  expect(
    createMinigameScores(undefined, "say-where").load()["best:say-where:v1"],
  ).toBe(1);
});
it("integrates the fifth menu card, its preview, three strikes and final results", async () => {
  history.replaceState(null, "", "/minigames/say-where");
  await mount();
  expect(
    host
      .querySelector('[role="tab"][aria-label="Say Where?"]')
      ?.getAttribute("aria-selected"),
  ).toBe("true");
  expect(host.querySelector(".minigame-customize-toggle")).toBeNull();
  await click("Start new game");
  for (let i = 0; i < 3; i++) {
    await act(async () =>
      probe.props!.onSelect(world.find((r) => r.id === "wurl:CHN")!),
    );
    await click("Check answer");
    expect(probe.tours.at(-1)?.length).toBeGreaterThan(0);
    expect(probe.tours.at(-1)).not.toContainEqual(
      world.find((r) => r.id === "wurl:CHN")!.focus,
    );
    if (i < 2) await click("Next expression");
  }
  expect(host.textContent).toContain("That was your third strike.");
  for (const visit of createNeighborSave(undefined, "say-where").load().run!
    .history!) {
    expect(visit.selectedId).toBe("wurl:CHN");
    expect(visit.point).toMatchObject({
      lat: world.find((r) => r.id === visit.ids[0])!.focus.lat,
      lng: world.find((r) => r.id === visit.ids[0])!.focus.lng,
    });
  }
  await click("See results");
  expect(host.querySelector(".minigame-overview")).not.toBeNull();
  expect(probe.props!.states["wurl:CHN"]).toBe("incorrect");
  expect(host.textContent).toContain("Expressions placed");
  expect(host.textContent).not.toContain("Study ");
  await click("Play again");
  expect(host.querySelector(".journey-text-clue figcaption")).toBeNull();
});
