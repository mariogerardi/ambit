import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MAJOR_CITIES, DISPLAY_CAPITALS } from "../src/geography/places";
import { CAPITALS } from "../src/game/quizData";
import roster from "../src/game/data/un-members.v1.json";
import metadata from "../sources/cities.metadata.json";

describe("local major-city catalog", () => {
  it("has valid unique eligible-country points and no duplicate primary capitals", () => {
    const members = new Set(roster.members.map((c) => c.id));
    const capitals = new Set(CAPITALS.map((c) => c.id));
    expect(MAJOR_CITIES).toHaveLength(metadata.cities);
    expect(new Set(MAJOR_CITIES.map((c) => c.id)).size).toBe(
      MAJOR_CITIES.length,
    );
    for (const city of MAJOR_CITIES) {
      expect(members.has(city.parentId!)).toBe(true);
      expect(capitals.has(city.id)).toBe(false);
      expect(city.name.length).toBeGreaterThan(0);
      expect(city.lat).toBeGreaterThanOrEqual(-90);
      expect(city.lat).toBeLessThanOrEqual(90);
      expect(city.lng).toBeGreaterThanOrEqual(-180);
      expect(city.lng).toBeLessThanOrEqual(180);
      expect(city.population).toBeGreaterThanOrEqual(15_000);
      expect(city.sourceId).toBe(`geonames:${city.id.slice(6)}`);
    }
    expect(MAJOR_CITIES.find((c) => c.id === "place:5128581")).toMatchObject({
      name: "New York City",
      parentId: "wurl:USA",
      population: 8_804_190,
    });
    expect(MAJOR_CITIES.find((c) => c.id === "place:5368361")).toMatchObject({
      name: "Los Angeles",
      parentId: "wurl:USA",
      population: 3_820_914,
    });
  });
  it("preserves accented Unicode city names instead of ASCII transliterations", () => {
    expect(MAJOR_CITIES.find((c) => c.id === "place:1529102")?.name).toBe(
      "Ürümqi",
    );
    expect(MAJOR_CITIES.some((c) => c.name === "São Luís")).toBe(true);
    expect(MAJOR_CITIES.every((c) => c.name === c.name.normalize("NFC"))).toBe(
      true,
    );
    expect(DISPLAY_CAPITALS.some((c) => c.name === "São Tomé")).toBe(true);
  });
  it("retains pinned provenance and display populations without changing quiz capitals", () => {
    const asset = readFileSync(metadata.asset);
    expect(createHash("sha256").update(asset).digest("hex")).toBe(
      metadata.sha256,
    );
    expect(asset.length).toBe(metadata.bytes);
    expect(metadata.license).toBe("CC BY 4.0");
    expect(metadata.inputs).toHaveLength(2);
    expect(DISPLAY_CAPITALS).toHaveLength(193);
    expect(DISPLAY_CAPITALS.map((c) => c.id)).toEqual(
      CAPITALS.map((c) => c.id),
    );
    expect(DISPLAY_CAPITALS.every((c) => Number.isFinite(c.population))).toBe(
      true,
    );
    expect(CAPITALS.every((c) => !("population" in c))).toBe(true);
  });
});
