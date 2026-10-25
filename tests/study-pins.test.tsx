// @vitest-environment jsdom
import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { geoCircle } from "d3-geo";
import { StudyPanel } from "../src/study/StudyPanel";
import {
  defaultSettings,
  startStudy,
  studyReducer,
  validStudy,
  capitalOf,
  startPlaceStudy,
  answerLabel,
} from "../src/study/engine";
import { studyPinTarget, studyPinFeedback } from "../src/study/pins";
import { interiorAnchor } from "../src/geography/interiorAnchor";
import type { RegionFeature } from "../src/geography/types";
import type { StudySession, StudyTopic } from "../src/study/engine";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const country = regions.find((r) => r.id === "wurl:CAN")!;
const inside = interiorAnchor(country),
  outside = interiorAnchor(regions.find((r) => r.id === "wurl:BRA")!);
const settings = (topic: StudyTopic) => ({
  ...defaultSettings,
  scope: "custom" as const,
  countryIds: [country.id],
  topics: [topic],
  styles: { ...defaultSettings.styles, [topic]: "pin" as const },
  autoAdvance: false,
  revisitMissed: true,
});
const valid = (s: StudySession) =>
  validStudy({
    version: 1,
    settings: s.settings,
    session: JSON.parse(JSON.stringify(s)),
  });
const drop = (s: StudySession, point = inside) =>
  studyReducer(s, { type: "pin", ...point }, regions);
const submit = (s: StudySession) =>
  studyReducer(s, { type: "submit" }, regions);
const html = (session: StudySession) =>
  renderToStaticMarkup(
    <StudyPanel
      save={{ version: 1, settings: session.settings, session }}
      setup={false}
      active
      webgl
      onAction={() => {}}
      onSetup={() => {}}
      onSettings={() => {}}
      onStart={() => {}}
    />,
  );

it.each(["countries", "flags"] as const)(
  "grades %s pins by canonical containment, accepts pins outside the pool, and preserves honest feedback and replay",
  (topic) => {
    const fresh = startStudy(settings(topic), 42);
    expect(submit(fresh)).toBe(fresh);
    expect(studyReducer(fresh, { type: "pick", id: country.id }, regions)).toBe(
      fresh,
    );
    expect(drop(fresh, { ...inside, lat: NaN })).toBe(fresh);
    const pending = drop(fresh);
    expect(valid(pending)).toBe(true);
    const correct = submit(pending);
    expect(correct.history[0]).toMatchObject({
      correct: true,
      response: "Canada",
      pin: { lat: inside.lat, lng: inside.lng },
    });
    expect(valid(correct)).toBe(true);
    const wrong = submit(drop(fresh, outside));
    expect(wrong.history[0]).toMatchObject({
      correct: false,
      response: "Brazil",
    });
    expect(wrong.reviews).toHaveLength(1);
    expect(valid(wrong)).toBe(true);
    expect(studyReducer(wrong, { type: "next" }).pin).toBeUndefined();
    expect(
      valid({
        ...correct,
        history: [{ ...correct.history[0], pin: { lat: 91, lng: 0 } }],
      }),
    ).toBe(false);
  },
);

it("grades capital pins within 50 km and displays their distance instead of a meaningless answer label", () => {
  const fresh = startStudy(settings("capitals"), 42),
    capital = capitalOf(country.id);
  expect(studyPinTarget(fresh.prompt, regions)).toMatchObject({
    name: capital.name,
    radiusKm: 50,
  });
  expect(answerLabel(fresh.prompt)).toBe(capital.name);
  const point = (km: number) => {
    const [lng, lat] = geoCircle()
      .center([capital.lng, capital.lat])
      .radius(((km / 6371.0088) * 180) / Math.PI)().coordinates[0][0];
    return { lat, lng };
  };
  const correct = submit(drop(fresh, { ...inside, ...point(49) }));
  const wrong = submit(drop(fresh, { ...inside, ...point(51) }));
  expect(correct.history[0].correct).toBe(true);
  expect(wrong.history[0].correct).toBe(false);
  expect(wrong.history[0].response).toBe(`51 km from ${capital.name}`);
  expect(valid(correct)).toBe(true);
});

it("shows one instruction, updates it after a pin, and gives meaningful right/wrong feedback for new and already saved minigame reviews", () => {
  const fresh = startPlaceStudy([
    { id: country.id, name: country.name, ...inside, regionId: country.id },
  ]);
  expect(html(fresh)).toContain(
    "Tap land or water to place your pin, then submit.",
  );
  expect(html(fresh)).not.toContain("Place your pin inside the boundary.");
  const pending = drop(fresh);
  expect(html(pending)).toContain("Pin placed. Move it or submit your answer.");
  expect(html(pending)).not.toContain("Tap land or water");
  const correct = submit(pending),
    wrong = submit(drop(fresh, outside));
  expect(html(correct)).toContain("Your pin is inside Canada.");
  expect(html(correct)).not.toContain("Your answer:");
  expect(html(wrong)).toContain("Your pin landed in Brazil.");
  expect(html(wrong)).toContain("Correct location:");
  expect(
    studyPinFeedback({ ...wrong.history[0], response: "Pin placed" }, "Canada"),
  ).toBe("Your pin is outside Canada.");
});
