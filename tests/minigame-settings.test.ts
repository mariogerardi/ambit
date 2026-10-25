import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { geoDistance } from "d3-geo";
import roster from "../src/game/data/un-members.v1.json";
import type { RegionFeature } from "../src/geography/types";
import { buildBorderGraph } from "../src/game/reasoning";
import { createQuestionContext } from "../src/game/questionPreparation";
import { sharedNeighborPairs } from "../src/minigames/sharedNeighbors";
import {
  missingBorderPairs,
  missingBorderJourney,
  missingBorderAnchor,
  missingBordersBase,
} from "../src/minigames/missingBorders";
import {
  defaultMinigameSettings,
  filterMinigamePairs,
  mainlandBorderGraph,
  sameMinigameSettings,
  validMinigameSettings,
  usesDefaultMinigameRules,
} from "../src/minigames/minigameSettings";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const graph = buildBorderGraph(regions);
const shared = sharedNeighborPairs(graph);
const missing = missingBorderPairs(regions);

it("keeps all default puzzles and removes adjacent clues only when requested", () => {
  expect(
    filterMinigamePairs(
      shared,
      defaultMinigameSettings,
      graph,
      "shared-neighbors",
    ),
  ).toEqual(shared);
  expect(defaultMinigameSettings.includeTerritories).toBe(true);
  expect(defaultMinigameSettings.excludeAdjacentClues).toBe(false);
  expect(defaultMinigameSettings.framing).toBe("wide");
  const filtered = filterMinigamePairs(
    shared,
    { ...defaultMinigameSettings, excludeAdjacentClues: true },
    graph,
    "shared-neighbors",
  );
  expect(filtered.length).toBeGreaterThan(0);
  expect(filtered.length).toBeLessThan(shared.length);
  for (const pair of filtered)
    expect(graph.get(pair.countries[0])?.has(pair.countries[1])).toBe(false);
  expect(shared.some((p) => p.id === "wurl:FRA|wurl:SUR")).toBe(true);
  expect(filtered.some((p) => p.id === "wurl:FRA|wurl:SUR")).toBe(false);
});

it("removes overseas/exclave-only border relationships while retaining regular archipelagic borders", () => {
  const mainland = mainlandBorderGraph(regions);
  for (const [a, b] of [
    ["FRA", "BRA"],
    ["FRA", "SUR"],
    ["RUS", "POL"],
    ["RUS", "LTU"],
    ["AGO", "COG"],
    ["AZE", "TUR"],
  ]) {
    expect(graph.get(`wurl:${a}`)?.has(`wurl:${b}`), `${a}/${b}`).toBe(true);
    expect(mainland.get(`wurl:${a}`)?.has(`wurl:${b}`), `${a}/${b}`).toBe(
      false,
    );
  }
  for (const [a, b] of [
    ["FRA", "DEU"],
    ["ESP", "PRT"],
    ["IDN", "PNG"],
    ["MYS", "BRN"],
    ["MYS", "IDN"],
  ])
    expect(mainland.get(`wurl:${a}`)?.has(`wurl:${b}`), `${a}/${b}`).toBe(true);
  expect(
    sharedNeighborPairs(mainland).some((p) => p.id === "wurl:FRA|wurl:SUR"),
  ).toBe(false);
  for (const [id, neighbors] of mainland)
    for (const neighbor of neighbors)
      expect(graph.get(id)?.has(neighbor)).toBe(true);
  expect(graph.get("wurl:FRA")?.has("wurl:BRA")).toBe(true);
});

it("excludes clues and answers, including either member of a merged territory", () => {
  const settings = {
    ...defaultMinigameSettings,
    excludedCountries: ["wurl:BRA", "wurl:RUS"],
  };
  for (const pair of filterMinigamePairs(
    shared,
    settings,
    graph,
    "shared-neighbors",
  ))
    expect(
      [...pair.countries, pair.answer].some((id) =>
        settings.excludedCountries.includes(id),
      ),
    ).toBe(false);
  for (const pair of filterMinigamePairs(
    missing,
    settings,
    graph,
    "missing-borders",
  ))
    expect(
      pair.countries.some((id) => settings.excludedCountries.includes(id)),
    ).toBe(false);
  expect(
    filterMinigamePairs(
      shared,
      { ...settings, excludedCountries: roster.members.map((c) => c.id) },
      graph,
      "shared-neighbors",
    ),
  ).toEqual([]);
});

it("filters Missing Borders by the physical region, including French Guiana in South America", () => {
  const southAmerica = filterMinigamePairs(
    missing,
    { ...defaultMinigameSettings, region: "SA" },
    graph,
    "missing-borders",
  );
  const europe = filterMinigamePairs(
    missing,
    { ...defaultMinigameSettings, region: "EU" },
    graph,
    "missing-borders",
  );
  expect(southAmerica.some((p) => p.id === "wurl:BRA|wurl:FRA")).toBe(true);
  expect(europe.some((p) => p.id === "wurl:BRA|wurl:FRA")).toBe(false);
  expect(europe.some((p) => p.id === "wurl:ESP|wurl:PRT")).toBe(true);
  expect(southAmerica.some((p) => p.id === "wurl:ESP|wurl:PRT")).toBe(false);
});

it("frames the search continent independently of the erased boundary without changing the answer", () => {
  const pair = missing.find((p) => p.id === "wurl:ESP|wurl:PRT")!;
  const base = createQuestionContext(regions, [], missingBordersBase);
  const regional = missingBorderJourney(pair, base, regions, 123, false);
  const wide = missingBorderJourney(pair, base, regions, 123, true);
  expect(wide.rounds[0].rule).toEqual(regional.rounds[0].rule);
  expect(regional.rounds[0].focus.altitude).toBe(1.25);
  expect(wide.rounds[0].focus).toEqual({ lat: 50, lng: 20, altitude: 1.05 });
  const focus = wide.rounds[0].focus,
    anchor = missingBorderAnchor(pair, regions);
  const distance =
    (geoDistance([focus.lng, focus.lat], [anchor.lng, anchor.lat]) * 180) /
    Math.PI;
  expect(distance).toBeGreaterThan(10);
  expect(
    (geoDistance([focus.lng, focus.lat], [20, 50]) * 180) / Math.PI,
  ).toBeLessThan(7);
  const selection = wide.rounds[0].selection;
  expect(selection.type).toBe("ids");
  if (selection.type === "ids") {
    expect(selection.ids).toContain("wurl:FRA");
    expect(selection.ids).toContain("wurl:DEU");
    expect(selection.ids).not.toContain("wurl:BRA");
    expect(selection.ids).not.toContain("wurl:JPN");
    expect(selection.ids).not.toContain("wurl:ATA");
    if (regional.rounds[0].selection.type === "ids")
      for (const id of regional.rounds[0].selection.ids)
        expect(selection.ids).toContain(id);
  }
});

it("validates preferences and compares country exclusions independent of selection order", () => {
  expect(validMinigameSettings(defaultMinigameSettings)).toBe(true);
  const oldFraming = {
    ...defaultMinigameSettings,
    framing: "regional" as const,
  };
  expect(
    sameMinigameSettings(
      oldFraming,
      defaultMinigameSettings,
      "shared-neighbors",
    ),
  ).toBe(true);
  expect(
    sameMinigameSettings(
      oldFraming,
      defaultMinigameSettings,
      "missing-borders",
    ),
  ).toBe(false);
  for (const patch of [
    { region: "other" },
    { framing: "other" },
    { includeTerritories: "yes" },
    { excludedCountries: ["unknown"] },
    { excludedCountries: ["wurl:FRA", "wurl:FRA"] },
  ])
    expect(
      validMinigameSettings({ ...defaultMinigameSettings, ...patch }),
    ).toBe(false);
  expect(
    sameMinigameSettings(
      {
        ...defaultMinigameSettings,
        excludedCountries: ["wurl:FRA", "wurl:BRA"],
      },
      {
        ...defaultMinigameSettings,
        excludedCountries: ["wurl:BRA", "wurl:FRA"],
      },
    ),
  ).toBe(true);
});

it("counts only a game's relevant default rules toward personal bests", () => {
  const changes = {
    "shared-neighbors": [
      { includeTerritories: false },
      { excludeAdjacentClues: true },
      { excludedCountries: ["wurl:FRA"] },
    ],
    "missing-borders": [
      { region: "EU" as const },
      { framing: "regional" as const },
      { excludeSmallCountries: false },
      { excludedCountries: ["wurl:FRA"] },
    ],
    "border-run": [{ showBorders: true }, { excludedCountries: ["wurl:FRA"] }],
    pinpoint: [
      { categories: ["cities" as const] },
      { categories: ["landmarks" as const] },
    ],
  };
  for (const [kind, options] of Object.entries(changes)) {
    const game = kind as keyof typeof changes;
    expect(usesDefaultMinigameRules(defaultMinigameSettings, game)).toBe(true);
    for (const patch of options)
      expect(
        usesDefaultMinigameRules(
          { ...defaultMinigameSettings, ...patch },
          game,
        ),
      ).toBe(false);
  }
  expect(
    usesDefaultMinigameRules(
      { ...defaultMinigameSettings, region: "EU" },
      "shared-neighbors",
    ),
  ).toBe(true);
  expect(
    usesDefaultMinigameRules(
      { ...defaultMinigameSettings, categories: ["landmarks", "cities"] },
      "pinpoint",
    ),
  ).toBe(true);
  expect(
    usesDefaultMinigameRules(
      { ...defaultMinigameSettings, showBorders: undefined },
      "border-run",
    ),
  ).toBe(true);
  expect(
    usesDefaultMinigameRules(
      { ...defaultMinigameSettings, excludeSmallCountries: undefined },
      "missing-borders",
    ),
  ).toBe(true);
});
