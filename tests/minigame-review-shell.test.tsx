// @vitest-environment jsdom
import { act } from "react";
import { expect, it } from "vitest";
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
import { defaultMinigameSettings } from "../src/minigames/minigameSettings";
import { pinpointPairs } from "../src/minigames/extraGames";
import { startNeighborRun } from "../src/minigames/sharedNeighbors";
import { createStudySave } from "../src/app/progressSaves";
import { interiorAnchor } from "../src/geography/interiorAnchor";
import { defaultSettings, startStudy, capitalOf } from "../src/study/engine";

it("starts an exact saved Study review from a minigame, accepts a map pin, archives and restores it", async () => {
  const settings = {
    ...defaultMinigameSettings,
    categories: ["countries" as const],
  };
  const country = world.find((r) => r.id === "wurl:CAN")!,
    point = interiorAnchor(country);
  const visit = {
    ids: [country.id],
    correct: false,
    point,
    pin: { lat: 0, lng: 0 },
    points: 0,
    target: {
      id: country.id,
      name: country.name,
      ...point,
      regionId: country.id,
    },
  };
  const run = {
    ...startNeighborRun(pinpointPairs(world, settings)),
    kind: "pinpoint" as const,
    settings,
    overview: true,
    ended: "finished" as const,
    answered: 1,
    correct: 0,
    points: 0,
    result: false,
    pin: { lat: 0, lng: 0 },
    history: [visit],
    review: [visit],
  };
  createMinigameSettingsSave(undefined, "pinpoint").save(settings);
  createNeighborSave(undefined, "pinpoint").save({ version: 1, run });
  history.replaceState(null, "", "/minigames/pinpoint/play");
  await mount();
  expect(host.querySelector(".minigame-overview-note")).toBeNull();
  expect(
    host.querySelectorAll(".minigame-result-actions > button"),
  ).toHaveLength(2);
  await click("Study 1 missed place");
  expect(location.pathname).toBe("/study");
  expect(host.querySelector(".study-question h1")?.textContent).toContain(
    country.name,
  );
  expect(probe.props!.places).toHaveLength(0);
  expect(probe.props!.onCoordinateTap).toBeDefined();
  expect(host.querySelector(".study-map-instruction")?.textContent).toContain(
    "Tap land or water",
  );
  expect(host.textContent).not.toContain("Place your pin inside the boundary.");
  await act(async () => probe.props!.onCoordinateTap!(point));
  expect(host.querySelector(".study-map-instruction")?.textContent).toContain(
    "Pin placed. Move it",
  );
  await act(async () => root.unmount());
  resetRoot();
  await mount();
  await click("Resume session");
  expect(createStudySave().load().session!.pin).toEqual({
    lat: point.lat,
    lng: point.lng,
  });
  await click("Submit answer");
  expect(createStudySave().load().session!.history[0].correct).toBe(true);
  expect(host.querySelector(".round-feedback")?.textContent).toContain(
    "Your pin is inside Canada.",
  );
  expect(host.querySelector(".round-feedback")?.textContent).not.toContain(
    "Your answer:",
  );
  await click("See results");
  expect(host.querySelector(".study-summary")).not.toBeNull();
  expect(createStudySave().load().history).toHaveLength(1);
  await act(async () => root.unmount());
  resetRoot();
  await mount();
  await click("Past study sessions");
  await click("View results");
  expect(host.querySelector(".study-summary")).not.toBeNull();
  await click("Repeat this session");
  expect(createStudySave().load().session!.placeReview).toHaveLength(1);
  expect(createStudySave().load().session!.phase).toBe("playing");
});

it.each(["countries", "capitals"] as const)(
  "resumes ordinary %s pin Study, submits the saved pin, and reveals feedback without leaking the target",
  async (topic) => {
    const settings = {
      ...defaultSettings,
      scope: "custom" as const,
      countryIds: ["wurl:CAN"],
      topics: [topic],
      styles: { ...defaultSettings.styles, [topic]: "pin" as const },
      autoAdvance: false,
    };
    const session = { ...startStudy(settings, 42), id: `pin-${topic}` };
    createStudySave().save({ version: 1, settings, session });
    history.replaceState(null, "", "/study");
    await mount();
    await click("Resume session");
    expect(probe.props!.onCoordinateTap).toBeDefined();
    expect(probe.props!.regionInteraction).toBe(false);
    expect(probe.props!.places).toEqual([]);
    await act(async () => probe.props!.onCoordinateTap!({ lat: 0, lng: 0 }));
    await act(async () => root.unmount());
    resetRoot();
    await mount();
    await click("Resume session");
    expect(createStudySave().load().session!.pin).toEqual({ lat: 0, lng: 0 });
    await click("Submit answer");
    expect(createStudySave().load().session!.history[0].correct).toBe(false);
    const feedback = host.querySelector(".round-feedback")!.textContent!;
    expect(feedback).not.toContain("Your answer:");
    expect(feedback).not.toContain("Pin placed");
    expect(feedback).toContain(
      topic === "capitals"
        ? `km from ${capitalOf("wurl:CAN").name}`
        : "Your pin is outside Canada.",
    );
    expect(probe.props!.places.some((p) => p.id === "study:target")).toBe(true);
  },
);
