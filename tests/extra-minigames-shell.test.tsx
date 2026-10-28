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

it.each(["shared-neighbors", "missing-borders", "border-run", "pinpoint"])(
  "keeps %s finishing under its cog and adds an arrow to its answer action",
  async (kind) => {
    history.replaceState(null, "", `/minigames/${kind}/play`);
    await mount();
    const menu = host.querySelector<HTMLDetailsElement>(".minigame-menu")!;
    expect(menu.querySelector("summary svg")).not.toBeNull();
    expect(host.querySelector(".minigame-finish-button")).toBeNull();
    const answer = host.querySelector(".minigame-action-row .primary-button");
    if (kind !== "missing-borders")
      expect(answer?.querySelector('[aria-hidden="true"]')?.textContent).toBe(
        "→",
      );
    await act(async () => menu.querySelector("summary")!.click());
    expect(menu.open).toBe(true);
    const finish = [...menu.querySelectorAll("button")].find(
      (button) => button.textContent === "Finish game",
    )!;
    expect(finish).toBeDefined();
    await act(async () => finish.click());
    expect(host.querySelector(".minigame-overview")).not.toBeNull();
    const actions = host.querySelector(".minigame-results-actions")!;
    expect(
      [...actions.querySelectorAll(".minigame-session-actions button")].map(
        (b) => b.textContent?.trim(),
      ),
    ).toEqual(["Play again →", "Choose another game"]);
    expect(host.querySelector(".minigame-result-detail")).toBeNull();
    expect(
      actions.querySelector(".minigame-result-actions")?.textContent,
    ).toContain("Share result");
    expect(actions.textContent).not.toContain("Nothing to review");
  },
);

it("keeps Pinpoint's introduction concise without a scoring dropdown", async () => {
  history.replaceState(null, "", "/minigames/pinpoint");
  await mount();
  const dialog = document.querySelector(".minigame-carousel-card")!;
  expect(dialog.querySelector(".minigame-scoring")).toBeNull();
  expect(dialog.textContent).not.toContain("How scoring works");
  expect(dialog.textContent).toContain("Play ten rounds");
  expect(dialog.textContent).not.toContain("1,040 km");
});

it("explains how to recover a Pinpoint pool with no categories", async () => {
  createMinigameSettingsSave(undefined, "pinpoint").save({
    ...defaultMinigameSettings,
    categories: [],
  });
  history.replaceState(null, "", "/minigames/pinpoint");
  await mount();
  const dialog = document.querySelector(".minigame-carousel-card")!;
  expect(dialog.textContent).toContain("Try more place categories");
  expect(
    dialog.querySelector<HTMLButtonElement>(
      ".minigame-carousel-actions .primary-button",
    )!.disabled,
  ).toBe(true);
  await click("Customize");
  await click("Reset settings");
  expect(
    dialog.querySelector<HTMLButtonElement>(
      ".minigame-carousel-actions .primary-button",
    )!.disabled,
  ).toBe(false);
});

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
  ).toEqual(["Check answer→"]);
  expect(host.querySelector(".minigame-menu-options")!.textContent).toContain(
    "Finish game",
  );
  expect(host.querySelector(".minigame-menu summary svg")).not.toBeNull();
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
  const finishState = probe.props!.states[pair.route.at(-1)!];
  expect(finishState).toBe("clue");
  vi.useFakeTimers();
  await act(async () =>
    host
      .querySelector<HTMLButtonElement>(".minigame-action-row .primary-button")!
      .click(),
  );
  expect(
    probe.props!.places.filter((p) => p.id.startsWith("border-run:crossing:")),
  ).toHaveLength(0);
  expect(probe.props!.states[pair.route.at(-1)!]).toBe(finishState);
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
    appearance: "completion",
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
      ".minigame-carousel-actions .primary-button",
    )!.disabled,
  ).toBe(true);
  await act(async () => toggles[2].click());
  await click("Start new game");
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
    expect(host.querySelector(".shared-neighbors-feedback h2")).toBeNull();
    expect(
      host.querySelector(".shared-neighbors-feedback")?.textContent,
    ).not.toContain(`${deck[i].name} ·`);
    expect(target.labelFlexible).toBe(true);
    expect(bands.map((p) => p.name)).toEqual(["1000", "500", "100"]);
    expect(
      probe.props!.overlays?.some(
        (o) =>
          o.id.startsWith("pin-distance:") &&
          o.type === "path" &&
          o.dashed === true,
      ),
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
  expect(host.querySelector(".minigame-result-detail")!.textContent).toContain(
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
  await click("Start new game");
  expect(probe.props!.showBorders).toBe(true);
  expect(
    createNeighborSave(undefined, "border-run").load().run!.settings!
      .showBorders,
  ).toBe(true);
});

it("starts regional Pinpoint with a supplied search area and resumes it without replacing progress", async () => {
  history.replaceState(null, "", "/minigames/pinpoint");
  await mount();
  expect(host.querySelector(".minigame-session")).not.toBeNull();
  expect(host.querySelector(".minigame-session-progress")).toBeNull();
  expect(host.querySelector(".minigame-high-score")?.textContent).toContain(
    "High score",
  );
  await click("Start new game");
  const save = createNeighborSave(undefined, "pinpoint");
  const initial = save.load().run!;
  expect(initial.pinpointRules).toBe("regional");
  const pair = pinpointDeck(
    pinpointPairs(world, defaultMinigameSettings),
    initial.seed,
    initial.cycle,
  )[initial.index];
  expect(pair.searchArea).toBeDefined();
  expect(host.querySelector(".minigame-search-area")).toBeNull();
  expect(host.textContent).not.toContain("Search area:");
  expect(probe.props!.states[pair.searchArea!.id]).toBe("hinted");
  await click("All games");
  await click("Pinpoint");
  expect(
    host.querySelector(".minigame-session-progress")?.textContent,
  ).toContain("1 / 10");
  await click("Resume game");
  expect(save.load().run?.id).toBe(initial.id);
  await click("All games");
  await click("Pinpoint");
  const confirm = vi.spyOn(window, "confirm");
  await click("Start new game");
  expect(location.pathname).toBe("/minigames/pinpoint");
  expect(save.load().run?.id).toBe(initial.id);
  const dialog = document.querySelector<HTMLElement>('[role="alertdialog"]')!;
  expect(dialog.textContent).toContain("unfinished game and current score");
  const [keep, discard] = dialog.querySelectorAll<HTMLButtonElement>("button");
  expect(document.activeElement).toBe(keep);
  expect(document.querySelector("main.experience")?.hasAttribute("inert")).toBe(
    true,
  );
  await act(async () => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        cancelable: true,
      }),
    );
  });
  expect(document.activeElement).toBe(discard);
  await act(async () => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", cancelable: true }),
    );
  });
  expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  expect(save.load().run?.id).toBe(initial.id);
  expect(document.activeElement?.getAttribute("aria-label")).toBe(
    "Start new game",
  );
  expect(document.querySelector("main.experience")?.hasAttribute("inert")).toBe(
    false,
  );
  await click("Start new game");
  await act(async () =>
    document
      .querySelector<HTMLButtonElement>(
        ".minigame-discard-actions .quiet-button",
      )!
      .click(),
  );
  expect(save.load().run?.id).toBe(initial.id);
  await click("Start new game");
  await act(async () =>
    document
      .querySelector<HTMLButtonElement>(
        ".minigame-discard-actions .primary-button",
      )!
      .click(),
  );
  expect(save.load().run?.id).not.toBe(initial.id);
  expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  expect(confirm).not.toHaveBeenCalled();
});

it("grades a Kingston pin against its full search region without recalculating earlier scores", async () => {
  const pairs = pinpointPairs(world, defaultMinigameSettings);
  let seed = 1;
  while (!pinpointDeck(pairs, seed, 0).some((p) => p.name === "Kingston"))
    seed++;
  const deck = pinpointDeck(pairs, seed, 0);
  const index = deck.findIndex((p) => p.name === "Kingston");
  const pair = deck[index];
  const { pointAlongBearing } = await import("../src/game/geodesic");
  const { regionalPinpointPoints } = await import(
    "../src/minigames/pinpointSearch"
  );
  const save = createNeighborSave(undefined, "pinpoint");
  const run = {
    ...startNeighborRun(pairs),
    seed,
    index,
    answered: index,
    points: 123,
    kind: "pinpoint" as const,
    pinpointRules: "regional" as const,
    settings: defaultMinigameSettings,
  };
  save.save({ version: 1, run });
  history.replaceState(null, "", "/minigames/pinpoint/play");
  await mount();
  const pin = pointAlongBearing(pair.place!, 90, 97 / 6371.0088);
  await act(async () => probe.props!.onCoordinateTap!(pin));
  await click("Check answer");
  const points = regionalPinpointPoints(97, pair.searchContext!);
  expect(points).toBeGreaterThan(500);
  expect(save.load().run!.points).toBe(123 + points);
  expect(save.load().run!.history!.at(-1)!.points).toBe(points);
  expect(
    probe.props!.routes.some((r) => r.id.startsWith("pin-distance:")),
  ).toBe(false);
  const connector = probe.props!.overlays!.find((o) =>
    o.id.startsWith("pin-distance:"),
  )!;
  expect(connector).toMatchObject({ type: "path", dashed: true });
  if (connector.type !== "path") throw Error("Expected connector");
  expect(connector.coordinates[0][0]).toBeCloseTo(pin.lng);
  expect(connector.coordinates.at(-1)![0]).toBeCloseTo(pair.place!.lng);
  expect(probe.focus.at(-1)).toMatchObject({
    lat: pair.place!.lat,
    lng: pair.place!.lng,
  });
  if (save.load().run!.ended) await click("See results");
  else {
    await act(async () =>
      host.querySelector<HTMLElement>(".minigame-menu summary")!.click(),
    );
    await click("Finish game");
  }
  const recap = probe.props!.overlays!.find(
    (o) => o.id === "recap:connector:0",
  )!;
  expect(recap).toMatchObject({ type: "path", dashed: "dotted" });
  if (recap.type !== "path") throw Error("Expected recap connector");
  expect(recap.coordinates[0]).toEqual(connector.coordinates[0]);
  expect(recap.coordinates.at(-1)).toEqual(connector.coordinates.at(-1));
});
