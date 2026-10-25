// @vitest-environment jsdom
import { expect, it } from "vitest";
import { host, mount, world } from "./helpers/appShell";
import { createNeighborSave } from "../src/minigames/sharedNeighborsSave";
import { createMinigameSettingsSave } from "../src/minigames/minigameSettingsSave";
import { createMinigameScores } from "../src/minigames/minigameScores";
import {
  defaultMinigameSettings,
  filterMinigamePairs,
  smallCountryIds,
} from "../src/minigames/minigameSettings";
import { buildBorderGraph } from "../src/game/reasoning";
import {
  borderRunPairs,
  landTopology,
  pinpointPairs,
} from "../src/minigames/extraGames";
import { missingBorderPairs } from "../src/minigames/missingBorders";
import {
  sharedNeighborPairs,
  startNeighborRun,
} from "../src/minigames/sharedNeighbors";
import type { BorderMinigame } from "../src/minigames/sharedNeighbors";
import type { MinigameSettings } from "../src/minigames/minigameSettings";

const graph = buildBorderGraph(world);
const kinds: BorderMinigame[] = [
  "shared-neighbors",
  "missing-borders",
  "border-run",
  "pinpoint",
];
for (const kind of kinds) {
  it.each([true, false])(
    `${kind} records a completed game only with default rules (default: %s)`,
    async (defaults) => {
      const changes: Record<BorderMinigame, Partial<MinigameSettings>> = {
        "shared-neighbors": { excludeAdjacentClues: true },
        "missing-borders": { excludeSmallCountries: false },
        "border-run": { showBorders: true },
        pinpoint: { categories: ["cities"] },
      };
      const settings = {
        ...defaultMinigameSettings,
        ...(defaults ? {} : changes[kind]),
      };
      const pairs =
        kind === "pinpoint"
          ? pinpointPairs(world, settings)
          : kind === "border-run"
            ? borderRunPairs(landTopology(world))
            : filterMinigamePairs(
                kind === "missing-borders"
                  ? missingBorderPairs(world)
                  : sharedNeighborPairs(graph),
                settings,
                graph,
                kind,
                smallCountryIds(world),
              );
      const score = kind === "pinpoint" ? 2000 : 2;
      // Editable preferences deliberately differ: eligibility belongs to the run.
      createMinigameSettingsSave(undefined, kind).save({
        ...defaultMinigameSettings,
        ...(defaults ? changes[kind] : {}),
      });
      createNeighborSave(undefined, kind).save({
        version: 1,
        run: {
          ...startNeighborRun(pairs),
          kind,
          settings,
          answered: 2,
          correct: 2,
          points: kind === "pinpoint" ? score : undefined,
          ended: "finished",
          overview: true,
        },
      });
      const scores = createMinigameScores(undefined, kind);
      if (!defaults) scores.save({ "best:old-custom-rules": 9999 });
      history.replaceState(null, "", `/minigames/${kind}/play`);
      await mount();
      expect(host.querySelector(".minigame-overview")).not.toBeNull();
      expect(
        host
          .querySelector(".shared-neighbors-results")!
          .textContent!.includes("Personal best"),
      ).toBe(defaults);
      if (defaults) expect(Object.values(scores.load())).toEqual([score]);
      else {
        expect(scores.load()).toEqual({ "best:old-custom-rules": 9999 });
        expect(
          host.querySelector(".minigame-overview-note")!.textContent,
        ).toContain("doesn’t count toward your personal best");
      }
    },
  );
}
