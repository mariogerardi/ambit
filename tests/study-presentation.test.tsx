// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useStudyPresentation } from "../src/study/useStudyPresentation";
import {
  capitalOf,
  defaultSettings,
  startStudy,
  startPlaceStudy,
  studyReducer,
} from "../src/study/engine";
import type { StudySettings } from "../src/study/engine";
import type { RegionFeature, VisualState } from "../src/geography/types";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const neutral: Record<string, VisualState> = Object.fromEntries(
  regions.map((r) => [r.id, "disabled"]),
);
const settings: StudySettings = {
  ...defaultSettings,
  scope: "custom",
  countryIds: ["wurl:CAN", "wurl:BRA"],
  topics: ["capitals"],
  styles: { ...defaultSettings.styles, capitals: "map" },
  length: "all",
  autoAdvance: false,
};
type Options = Parameters<typeof useStudyPresentation>[0];
const base: Options = { active: true, settings, regions, neutral };
let root: ReturnType<typeof createRoot>;
let result: ReturnType<typeof useStudyPresentation>;
function Probe(props: Options) {
  result = useStudyPresentation(props);
  return null;
}
async function render(options: Partial<Options> = {}) {
  await act(async () => root.render(<Probe {...base} {...options} />));
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  root = createRoot(document.createElement("div"));
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
});

it("withholds exact review targets until submission and clears pins between questions", async () => {
  let session = startPlaceStudy([
    { id: "place:a", name: "A", lat: 20, lng: 30 },
    { id: "place:b", name: "B", lat: 40, lng: 50 },
  ]);
  await render({ session });
  expect(result.places).toEqual([]);
  expect(result.highlight).toBeUndefined();
  expect(result.capitalFocus).toBeUndefined();
  session = studyReducer(session, { type: "pin", lat: 0, lng: 0 });
  await render({ session });
  expect(result.places).toHaveLength(1);
  expect(result.places![0]).toMatchObject({
    lat: 0,
    lng: 0,
    visualState: "selected",
  });
  session = studyReducer(session, { type: "submit" });
  await render({ session });
  expect(result.places!.find((p) => p.id === "study:target")).toMatchObject({
    lat: 20,
    lng: 30,
    visualState: "answer",
  });
  session = studyReducer(session, { type: "next" });
  await render({ session });
  expect(result.places).toEqual([]);
});
it("keeps normal capital pin targets hidden, shows the movable pin, and reveals the capital after submission", async () => {
  let session = startStudy(
    {
      ...settings,
      capitalNames: true,
      capitalMarkers: true,
      styles: { ...settings.styles, capitals: "pin" },
    },
    42,
  );
  const target = capitalOf(session.prompt.targetId);
  await render({ session });
  expect(result.places).toEqual([]);
  expect(result.capitalFocus).toBeUndefined();
  expect(result.highlight).toBeUndefined();
  session = studyReducer(session, { type: "pin", lat: 0, lng: 0 });
  await render({ session });
  expect(result.places).toHaveLength(1);
  expect(result.places![0].id).toBe("study:guess");
  session = studyReducer(session, { type: "submit" }, regions);
  await render({ session });
  expect(result.places!.find((p) => p.id === "study:target")).toMatchObject({
    name: target.name,
    lat: target.lat,
    lng: target.lng,
  });
});

it("hides a capital map answer, reveals it after a wrong pick, and clears it on advance", async () => {
  let session = startStudy(settings, 42);
  const target = session.prompt.targetId;
  const wrong = session.pool.find((id) => id !== target)!;
  await render({ session });
  expect(result.capitalFocus).toBeUndefined();
  expect(result.highlight).toBeUndefined();
  expect(result.states).toMatchObject({
    [target]: "selectable",
    [wrong]: "selectable",
  });
  expect(result.places).toEqual([]);
  expect(result.placeMarkers).toBe(false);
  expect(result.placeLabels).toBe(false);

  session = studyReducer(session, { type: "pick", id: wrong });
  await render({ session });
  expect(result.states).toMatchObject({
    [target]: "answer",
    [wrong]: "incorrect",
  });
  expect(result.places).toHaveLength(1);
  expect(result.places![0]).toMatchObject({
    id: capitalOf(target).id,
    name: capitalOf(target).name,
    markerHidden: false,
    labelHidden: false,
    priority: 1000,
  });
  expect(result.placeMarkers).toBe(true);
  expect(result.placeLabels).toBe(true);

  await render({ session: studyReducer(session, { type: "next" }) });
  expect(result.places).toEqual([]);
  expect(result.states![wrong]).toBe("selectable");
  expect(result.capitalFocus).toBeUndefined();
});

it.each(["typing", "choices"] as const)(
  "supplies the visible country clue for capital %s without disclosing the capital",
  async (style) => {
    const session = startStudy(
      { ...settings, styles: { ...settings.styles, capitals: style } },
      42,
    );
    await render({ session });
    expect(result.capitalFocus).toBe(
      regions.find((r) => r.id === session.prompt.targetId)!.focus,
    );
    expect(result.highlight).toBeUndefined();
    expect(result.places).toEqual([]);
  },
);

it.each([
  ["countries", "typing"],
  ["countries", "choices"],
  ["flags", "typing"],
  ["flags", "choices"],
] as const)(
  "frames a country silhouette but keeps the location hidden for flag clues (%s/%s)",
  async (topic, style) => {
    const session = startStudy(
      {
        ...settings,
        topics: [topic],
        styles: { ...settings.styles, [topic]: style },
      },
      42,
    );
    await render({ session });
    expect(result.capitalFocus).toBeUndefined();
    if (topic === "countries") {
      expect(result.highlight).toBe(
        regions.find((r) => r.id === session.prompt.targetId)!.focus,
      );
      expect(result.states![session.prompt.targetId]).toBe("selected");
    } else {
      expect(result.highlight).toBeUndefined();
      expect(result.states![session.prompt.targetId]).toBe("disabled");
    }
  },
);

it.each([
  { capitalMarkers: true, capitalNames: false },
  { capitalMarkers: false, capitalNames: true },
])(
  "keeps marker and label disclosure independent and inside the configured scope (%j)",
  async (hints) => {
    const preview = { ...settings, ...hints, countryNames: true };
    await render({ preview });
    const capitals = result.places!.filter((p) => p.kind === "capital");
    expect(new Set(capitals.map((p) => p.parentId))).toEqual(
      new Set(settings.countryIds),
    );
    for (const capital of capitals) {
      expect(capital.markerHidden).toBe(!hints.capitalMarkers);
      expect(capital.labelHidden).toBe(!hints.capitalNames);
    }
    expect(result.places!.filter((p) => p.kind === "landform")).toHaveLength(2);
    expect(
      result
        .places!.filter((p) => p.kind === "landform")
        .every((p) => p.markerHidden),
    ).toBe(true);
    expect(new Set(result.namedRegionIds)).toEqual(
      new Set(settings.countryIds),
    );
    expect(new Set(result.borderRegionIds)).toEqual(
      new Set(settings.countryIds),
    );
    expect(result.regionNames).toBe("committed");
    expect(result.states!["wurl:CAN"]).toBe("selected");
    expect(result.states!["wurl:MEX"]).toBe("disabled");
    await render({ preview: { ...preview, borders: false } });
    expect(result.borderRegionIds).toEqual([]);
    expect(result.borders).toBe(false);
  },
);

it("clears Study overrides when leaving the mode even with a saved session and preview", async () => {
  const session = startStudy(settings, 42);
  const preview = { ...settings, capitalNames: true, countryNames: true };
  await render({ session, preview });
  expect(result.display).toBe(session.settings);
  expect(result.places).toEqual([]);
  await render({ active: false, session, preview });
  for (const key of [
    "display",
    "states",
    "places",
    "borders",
    "regionNames",
    "borderRegionIds",
    "namedRegionIds",
    "highlight",
    "capitalFocus",
  ] as const)
    expect(result[key]).toBeUndefined();
  expect(result.placeMarkers).toBe(true);
  expect(result.placeLabels).toBe(true);
  await render();
  expect(result.states).toBe(neutral);
  expect(result.display).toBeUndefined();
});

it("reuses place and scope arrays through answer typing so the renderer does not rebuild unchanged layers", async () => {
  const session = startStudy({ ...settings, capitalMarkers: true }, 42);
  await render({ session });
  const { places, namedRegionIds, borderRegionIds } = result;
  await render({
    session: studyReducer(session, { type: "text", value: "Otta" }),
  });
  expect(result.places).toBe(places);
  expect(result.namedRegionIds).toBe(namedRegionIds);
  expect(result.borderRegionIds).toBe(borderRegionIds);
});

it("shows a reviewed mistake temporarily without losing summary colors when review ends", async () => {
  let session = startStudy({ ...settings, topics: ["countries"] }, 42);
  while (session.phase !== "summary") {
    session = studyReducer(session, {
      type: "pick",
      id: session.pool.find((id) => id !== session.prompt.targetId)!,
    });
    session = studyReducer(session, { type: "next" });
  }
  const review = session.history[0];
  await render({ session, review });
  expect(result.states![review.prompt.targetId]).toBe("answer");
  expect(result.states![review.selectedId!]).toBe("incorrect");
  expect(result.highlight).toBeUndefined();
  await render({ session });
  expect(result.states![review.prompt.targetId]).toBe("incorrect");
});
