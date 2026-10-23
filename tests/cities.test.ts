import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MAJOR_CITIES, DISPLAY_CAPITALS } from "../src/geography/places";
import {
  EXPLORE_CITIES,
  EXPLORE_CITY_BY_ID,
  exploreCapital,
} from "../src/geography/places";
import { CAPITALS } from "../src/game/quizData";
import roster from "../src/game/data/un-members.v1.json";
import metadata from "../sources/cities.metadata.json";
import checksums from "../sources/checksums.json";

describe("local major-city catalog", () => {
  it("expands Explore to map territories with stable, sourced city records while preserving quiz capital conventions", () => {
    const world = JSON.parse(
      readFileSync("public/geography/world.v1.json", "utf8"),
    ) as { id: string }[];
    const ids = new Set(world.map((r) => r.id));
    expect(EXPLORE_CITY_BY_ID.size).toBe(EXPLORE_CITIES.length);
    for (const city of EXPLORE_CITIES) {
      expect(ids.has(city.parentId!)).toBe(true);
      expect(city.sourceCountryCode).toMatch(/^[A-Z]{2}$/);
      expect(city.sourceId).toBe(`geonames:${city.id.slice(6)}`);
    }
    expect(exploreCapital("wurl:JEY")).toMatchObject({
      name: "Saint Helier",
      parentId: "wurl:JEY",
    });
    expect(exploreCapital("wurl:FRO")).toMatchObject({
      name: "Tórshavn",
      parentId: "wurl:FRO",
    });
    expect(exploreCapital("wurl:NE-KOS")).toMatchObject({
      name: "Pristina",
      parentId: "wurl:NE-KOS",
    });
    expect(exploreCapital("wurl:PSE")).toMatchObject({
      name: "East Jerusalem",
      sourceFeatureCode: "PPLX",
      parentId: "wurl:PSE",
    });
    expect(exploreCapital("wurl:CYP")?.parentId).toBe("wurl:CYP");
    expect(exploreCapital("wurl:ISR")?.parentId).toBe("wurl:ISR");
    expect(EXPLORE_CITY_BY_ID.get("place:57289")).toMatchObject({
      parentId: "wurl:NE-SOL",
      sourceCountryName: "Somalia",
    });
    expect(EXPLORE_CITY_BY_ID.get("place:64021")?.parentId).toBe("wurl:NE-SOL");
    expect(MAJOR_CITIES.find((c) => c.id === "place:57289")?.parentId).toBe(
      "wurl:SOM",
    );
    // The raw Natural Earth download is an ignored preparation input. CI can
    // verify its pin through the committed source manifest without downloading it.
    const inputHashes: Record<string, string> = {
      "sources/ne-countries.geojson": checksums["ne-countries.geojson"].sha256,
      "sources/catalog-mapping.json": createHash("sha256")
        .update(readFileSync("sources/catalog-mapping.json"))
        .digest("hex"),
    };
    expect(metadata.exploreInputs).toHaveLength(
      Object.keys(inputHashes).length,
    );
    for (const input of metadata.exploreInputs)
      expect(inputHashes[input.path]).toBe(input.sha256);
  });
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
