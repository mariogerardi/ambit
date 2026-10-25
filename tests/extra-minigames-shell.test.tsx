// @vitest-environment jsdom
import { act } from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  click,
  host,
  mount,
  probe,
  world,
  root,
  resetRoot,
} from "./helpers/appShell";
import { createNeighborSave } from "../src/minigames/sharedNeighborsSave";
import { createMinigameSettingsSave } from "../src/minigames/minigameSettingsSave";
import { createMinigameScores } from "../src/minigames/minigameScores";
import { defaultMinigameSettings } from "../src/minigames/minigameSettings";
import {
  borderRunPairs,
  landTopology,
  pinpointPairs,
  pinpointDeck,
} from "../src/minigames/extraGames";
import {
  neighborDeck,
  startNeighborRun,
} from "../src/minigames/sharedNeighbors";

afterEach(() => vi.useRealTimers());

it("plays a numeric country route, reveals numbered crossings, and saves a high score independently of the next run", async () => {
  const pairs = borderRunPairs(landTopology(world));
  const run = {
    ...startNeighborRun(pairs),
    seed: 42,
    kind: "border-run" as const,
    settings: defaultMinigameSettings,
  };
  createNeighborSave(undefined, "border-run").save({ version: 1, run });
  const pair = neighborDeck(pairs, 42, 0)[0];
  history.replaceState(null, "", "/minigames/border-run/play");
  await mount();
  const input = host.querySelector<HTMLInputElement>(".minigame-number input")!;
  expect(input).not.toBeNull();
  expect(probe.props!.onCoordinateTap).toBeUndefined();
  expect(probe.props!.showBorders).toBe(false);
  expect(probe.props!.borderRegionIds).toEqual([]);
  expect(
    probe
      .props!.places.filter((p) => p.id.startsWith("border-run:flag:"))
      .map((p) => p.markerRole),
  ).toEqual(["start", "finish"]);
  const actions = host.querySelector(".minigame-action-row")!;
  expect(
    [...actions.querySelectorAll("button")].map((b) => b.textContent),
  ).toEqual(["Finish game", "Check answer"]);
  expect(actions.nextElementSibling?.getAttribute("aria-label")).toBe(
    "Game progress",
  );
  expect(host.querySelector(".minigame-title")!.textContent).toBe("Border Run");
  expect(
    host.querySelector(".minigame-menu-options button")!.textContent,
  ).toContain("All games");
  await click("Increase answer");
  expect(input.value).toBe("1");
  await click("Decrease answer");
  expect(input.value).toBe("0");
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, pair.answer);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  vi.useFakeTimers();
  await act(async () =>
    host
      .querySelector<HTMLButtonElement>(".minigame-action-row .primary-button")!
      .click(),
  );
  expect(
    probe.props!.places.filter((p) => p.id.startsWith("border-run:crossing:")),
  ).toHaveLength(0);
  expect(probe.props!.states[pair.route[0]]).toBe("correct");
  expect(probe.props!.states[pair.route[1]]).toBe("disabled");
  await act(async () => vi.advanceTimersByTimeAsync(160));
  expect(
    probe.props!.places.filter((p) => p.id.startsWith("border-run:crossing:")),
  ).toHaveLength(1);
  expect(probe.props!.states[pair.route[1]]).toBe("disabled");
  expect(
    probe.props!.places.find((p) => p.id === "border-run:crossing:1")!.fadeInMs,
  ).toBe(180);
  await act(async () => vi.advanceTimersByTimeAsync(110));
  expect(probe.props!.states[pair.route[1]]).toBe("correct");
  expect(probe.props!.regionReveal?.ids).toEqual(pair.route.slice(0, 2));
  await act(async () => vi.advanceTimersByTimeAsync(220 * pair.route.length));
  vi.useRealTimers();
  expect(createNeighborSave(undefined, "border-run").load().run).toMatchObject({
    answered: 1,
    correct: 1,
  });
  expect(
    host.querySelector(".shared-neighbors-feedback")!.textContent,
  ).toContain("The shortest possible route was");
  for (const id of pair.route)
    expect(probe.props!.states[id]).not.toBe("disabled");
  const crossings = probe.props!.places.filter((p) =>
    p.id.startsWith("border-run:crossing:"),
  );
  expect(crossings.every((p) => p.markerSize! <= 36)).toBe(true);
  expect(crossings.map((p) => p.markerBadge)).toEqual(
    pair.route.slice(1).map((_, i) => String(i + 1)),
  );
  expect(
    probe.props!.overlays?.some((o) => o.id === "border-run:land-corridor"),
  ).toBe(false);
  expect(probe.props!.clueLocators).toHaveLength(1);
  expect(probe.props!.clueLocators![0]).toMatchObject({
    pulseOnly: true,
    repeat: true,
    anchor: { lat: crossings.at(-1)!.lat, lng: crossings.at(-1)!.lng },
  });
  await click("Next route");
  await click("Finish game");
  expect(host.querySelector(".minigame-overview")).not.toBeNull();
  expect(host.querySelector(".minigame-overview")!.textContent).not.toContain(
    "Answered",
  );
  expect(
    Object.values(createMinigameScores(undefined, "border-run").load()),
  ).toEqual([1]);
  await click("Play again");
  expect(
    host.querySelector(".shared-neighbors-game")!.textContent,
  ).not.toContain("Personal best");
  expect(createNeighborSave(undefined, "border-run").load().run!.correct).toBe(
    0,
  );
});
it("customizes Pinpoint categories and prevents a game with none selected", async () => {
  history.replaceState(null, "", "/minigames/pinpoint");
  await mount();
  await click("Customize");
  const toggles = [
    ...document.querySelectorAll<HTMLInputElement>(
      ".minigame-setting-row input",
    ),
  ];
  expect(toggles).toHaveLength(4);
  expect(toggles.map((t) => t.checked)).toEqual([true, true, false, false]);
  await act(async () => {
    toggles[0].click();
    toggles[1].click();
  });
  expect(
    document.querySelector<HTMLButtonElement>(
      ".activity-preview-actions .primary-button",
    )!.disabled,
  ).toBe(true);
  await act(async () => toggles[2].click());
  await click("Play");
  expect(
    createNeighborSave(undefined, "pinpoint").load().run!.settings!.categories,
  ).toEqual(["countries"]);
  expect(
    host.querySelector(".shared-neighbors-game h1")!.textContent,
  ).toContain("Where is");
  expect(probe.props!.onCoordinateTap).toBeTypeOf("function");
});
it("scores ten landmark pins, restores feedback, and requires See results before replay", async () => {
  const settings = {
    ...defaultMinigameSettings,
    categories: ["landmarks" as const],
  };
  createMinigameSettingsSave(undefined, "pinpoint").save(settings);
  const pairs = pinpointPairs(world, settings),
    run = {
      ...startNeighborRun(pairs),
      seed: 42,
      kind: "pinpoint" as const,
      settings,
    };
  createNeighborSave(undefined, "pinpoint").save({ version: 1, run });
  const deck = pinpointDeck(pairs, 42, 0);
  history.replaceState(null, "", "/minigames/pinpoint/play");
  await mount();
  for (let i = 0; i < 10; i++) {
    expect(host.querySelector(".minigame-photo img")).not.toBeNull();
    await act(async () =>
      probe.props!.onCoordinateTap!({
        lat: deck[i].place!.lat,
        lng: deck[i].place!.lng,
      }),
    );
    await click("Check answer");
    expect(createNeighborSave(undefined, "pinpoint").load().run!.points).toBe(
      (i + 1) * 1000,
    );
    const target = probe.props!.places.find((p) => p.id === deck[i].place!.id)!;
    const bands = probe.props!.places.filter((p) =>
      p.id.startsWith("pinpoint:band:"),
    );
    expect(target.labelHidden).toBe(false);
    expect(target.labelFlexible).toBe(true);
    expect(bands.map((p) => p.name)).toEqual(["1000", "500", "100"]);
    expect(
      probe.props!.routes.some((r) => r.id.startsWith("pin-distance:")),
    ).toBe(true);
    expect(
      bands.every(
        (p) =>
          p.labelTypography === "numeric" && p.priority! < target.priority!,
      ),
    ).toBe(true);
    if (i < 9) await click("Next place");
  }
  expect(host.querySelector(".minigame-overview")).toBeNull();
  expect(
    host.querySelector(".shared-neighbors-feedback")!.textContent,
  ).toContain("final round");
  expect(
    [...host.querySelectorAll("button")].some(
      (b) => b.textContent === "Play again",
    ),
  ).toBe(false);
  await act(async () => root.unmount());
  resetRoot();
  await mount();
  expect(
    host.querySelector(".shared-neighbors-feedback")!.textContent,
  ).toContain("1,000 points");
  await click("See results");
  expect(host.querySelector(".minigame-overview")).not.toBeNull();
  expect(probe.tours.length).toBeGreaterThan(0);
  expect(
    probe.props!.places.filter((p) => p.id.startsWith("recap:target:")),
  ).toHaveLength(10);
  expect(
    Object.values(createMinigameScores(undefined, "pinpoint").load()),
  ).toEqual([]);
  expect(
    host.querySelector(".shared-neighbors-results")!.textContent,
  ).not.toContain("Personal best");
  expect(host.querySelector(".minigame-overview-note")!.textContent).toContain(
    "Custom rules",
  );
  await click("Play again");
  expect(createNeighborSave(undefined, "pinpoint").load().run!.answered).toBe(
    0,
  );
  expect(
    host.querySelector(".shared-neighbors-game")!.textContent,
  ).not.toContain("Personal best");
  expect(probe.mounts).toBe(2);
});
it("preserves the maximum score across stale writers and isolates games and accounts", () => {
  const a = createMinigameScores(undefined, "pinpoint"),
    b = createMinigameScores(undefined, "pinpoint");
  a.save({ "best:landmarks": 8000 });
  b.save({ "best:landmarks": 2000 });
  expect(a.load()["best:landmarks"]).toBe(8000);
  expect(createMinigameScores(undefined, "border-run").load()).toEqual({});
  expect(createMinigameScores("other-account", "pinpoint").load()).toEqual({});
});

it("cannot return from a saved overview to a stale final-answer reveal", () => {
  const pairs = pinpointPairs(world, {
    ...defaultMinigameSettings,
    categories: ["landmarks"],
  });
  const run = {
    ...startNeighborRun(pairs),
    kind: "pinpoint" as const,
    pin: { lat: 0, lng: 0 },
    result: false,
    ended: "finished" as const,
    answered: 10,
    overview: false,
  };
  const a = createNeighborSave(undefined, "pinpoint"),
    b = createNeighborSave(undefined, "pinpoint");
  a.save({ version: 1, run });
  b.load();
  a.save({ version: 1, run: { ...run, overview: true } });
  b.save({ version: 1, run });
  expect(createNeighborSave(undefined, "pinpoint").load().run!.overview).toBe(
    true,
  );
});

it("can enable Border Run borders for a new run without changing the default", async () => {
  history.replaceState(null, "", "/minigames/border-run");
  await mount();
  await click("Customize");
  const toggle = document.querySelector<HTMLInputElement>(
    ".minigame-setting-row input",
  )!;
  expect(toggle.checked).toBe(false);
  await act(async () => toggle.click());
  await click("Play");
  expect(probe.props!.showBorders).toBe(true);
  expect(
    createNeighborSave(undefined, "border-run").load().run!.settings!
      .showBorders,
  ).toBe(true);
});
