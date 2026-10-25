import {
  PHYSICAL_REVISION,
  validatePhysicalSnapshot,
} from "../src/geography/physical";
import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import {
  REGIONAL_INDEX,
  subdivisionTypeLabel,
  catalogRegions,
  exploreBoundaries,
  regionalChain,
  isCanonicalRegion,
} from "../src/geography/regions";
import { validateRegions } from "../src/geography/loadLayer";
import {
  validDefaultView,
  readDefaultView,
  saveDefaultView,
} from "../src/app/worldPreferences";
import info from "../src/geography/data/country-info.v1.json";
import languageSnapshot from "../src/geography/data/language-names.v1.json";
import { languageName } from "../src/geography/languages";
import { createHash } from "node:crypto";
afterEach(() => vi.unstubAllGlobals());
describe("Explore local data and requested cleanup", () => {
  it("formats subdivision types without exposing raw source separators or spelling", () => {
    expect(subdivisionTypeLabel({
      id: "wurl:LBY-TN", parentId: "wurl:LBY", level: "ADM1",
      localType: "municipality|governarate",
    })).toBe("Municipality / Governorate");
    expect(subdivisionTypeLabel({
      id: "county", parentId: "wurl:USA-NY", level: "ADM2", localType: "county",
    })).toBe("County");
    expect(subdivisionTypeLabel({
      id: "wurl:USA-DC", parentId: "wurl:USA", level: "ADM1", localType: "state",
    })).toBe("Federal district");
    expect(subdivisionTypeLabel({
      id: "unknown", parentId: "unknown", level: "ADM1",
    })).toBe("ADM1");
  });
  it("expands every country language tag without depending on browser language coverage", () => {
    const codes = [
      ...new Set(Object.values(info.countries).flatMap((c) => c.languages)),
    ].sort();
    expect(Object.keys(languageSnapshot.names).sort()).toEqual(codes);
    for (const code of codes) {
      expect(languageName(code)).not.toBe(code);
      expect(languageName(code)).not.toBe("Language name unavailable");
    }
    expect(languageName("xal")).toBe("Kalmyk");
    expect(languageName("vmw")).toBe("Makhuwa");
    expect(languageName("cau")).toBe("Caucasian languages");
    expect(languageName("mns")).toBe("Mansi");
    expect(languageName("pt-MZ")).toBe("Portuguese (Mozambique)");
    expect(languageName("unknown-code")).toBe("Language name unavailable");
  });
  it("offers checked local subdivisions across the world, including Mexico and Australia, with readable names", () => {
    const manifest = JSON.parse(
      readFileSync("public/geography/manifest.json", "utf8"),
    ) as { level: string; key: string; assetUrl: string; parentId: string }[];
    expect(manifest.filter((l) => l.level === "ADM1").length).toBeGreaterThan(
      200,
    );
    for (const [country, count] of [
      ["MEX", 32],
      ["AUS", 9],
      ["BRA", 27],
      ["DEU", 16],
      ["JPN", 47],
    ] as const) {
      const layer = manifest.find((l) => l.key === `${country}/ADM1`)!;
      const regions = validateRegions(
        JSON.parse(readFileSync(`public${layer.assetUrl}`, "utf8")),
      );
      expect(regions).toHaveLength(count);
      expect(regions.every(isCanonicalRegion)).toBe(true);
      expect(regionalChain(`wurl:${country}`)[0].key).toBe(layer.key);
      expect(regions.every((r) => !/[ÃÂ]/.test(r.name))).toBe(true);
    }
    const mexico = JSON.parse(
      readFileSync("public/geography/mex-adm1.v1.json", "utf8"),
    );
    expect(
      mexico.find((r: { id: string }) => r.id === "wurl:MEX-CMX").name,
    ).toBe("Mexico City");
    const physical = JSON.parse(
      readFileSync("public/geography/physical.v1.json", "utf8"),
    ).features;
    expect(
      physical.some(
        (f: { kind: string; name: string }) =>
          f.kind === "landform" && f.name === "Sahara",
      ),
    ).toBe(true);
    expect(
      physical.find((f: { name: string }) => f.name === "Andes").labelAnchors
        .length,
    ).toBeGreaterThan(5);
  });
  it("has 50 US states plus DC, 13 Canadian provinces/territories, and 62 NY counties in independent branches", () => {
    expect(
      REGIONAL_INDEX.filter((r) => r.parentId === "wurl:USA"),
    ).toHaveLength(51);
    expect(
      REGIONAL_INDEX.filter((r) => r.parentId === "wurl:CAN"),
    ).toHaveLength(13);
    expect(
      REGIONAL_INDEX.filter((r) => r.parentId === "wurl:USA-NY"),
    ).toHaveLength(62);
    const world = validateRegions(
        JSON.parse(readFileSync("public/geography/world.v1.json", "utf8")),
      ),
      states = catalogRegions(
        validateRegions(
          JSON.parse(readFileSync("public/geography/usa-adm1.v1.json", "utf8")),
        ),
      );
    const result = exploreBoundaries(world, [states]);
    expect(result).toHaveLength(293);
    expect(result.find((r) => r.id === "wurl:USA")?.displayBase).toBe(true);
    expect(world).toHaveLength(242);
    expect(result.find((r) => r.id === "wurl:CAN")).toBe(
      world.find((r) => r.id === "wurl:CAN"),
    );
    expect(regionalChain("wurl:USA-NY").map((l) => l.key)).toEqual([
      "USA/ADM1",
      "USA-NY/ADM2",
    ]);
  });
  it("ships checked local regional/physical assets and country profiles with honest estimate metadata", () => {
    const manifest = JSON.parse(
      readFileSync("public/geography/manifest.json", "utf8"),
    );
    for (const layer of manifest)
      expect(
        createHash("sha256")
          .update(readFileSync(`public${layer.assetUrl}`))
          .digest("hex"),
      ).toBe(layer.sha256);
    const physical = JSON.parse(
      readFileSync("public/geography/physical.v1.json", "utf8"),
    ).features;
    expect(new Set(physical.map((f: { id: string }) => f.id)).size).toBe(
      physical.length,
    );
    for (const kind of ["river", "mountain", "ocean"])
      expect(physical.some((f: { kind: string }) => f.kind === kind)).toBe(
        true,
      );
    expect(physical.some((f: { name: string }) => f.name === "Danube")).toBe(
      true,
    );
    const world = validateRegions(
      JSON.parse(readFileSync("public/geography/world.v1.json", "utf8")),
    );
    expect(Object.keys(info.countries).sort()).toEqual(
      world.map((r) => r.id).sort(),
    );
    expect(info.countries["wurl:FRO"].listedCapital).toBe("Torshavn");
    expect(info.countries["wurl:GRL"].languages).toContain("kl");
    expect(info.countries["wurl:PSE"].population).toBeGreaterThan(0);
    expect(info.countries["wurl:ESH"].population).toBeGreaterThan(0);
    expect(info.countries["wurl:NE-SOL"].populationSource).toBe(
      "Natural Earth",
    );
    expect(info.countries["wurl:NE-ATC"]).not.toHaveProperty("listedCapital");
    expect(info.source).toContain("undated");
  });
  it("rejects the old river snapshot and conflicting label identities", () => {
    const good = JSON.parse(
      readFileSync("public/geography/physical.v1.json", "utf8"),
    );
    expect(validatePhysicalSnapshot(good).revision).toBe(PHYSICAL_REVISION);
    expect(() =>
      validatePhysicalSnapshot({ ...good, revision: "old" }),
    ).toThrow("version mismatch");
    expect(() =>
      validatePhysicalSnapshot({
        ...good,
        features: [
          good.features[0],
          { ...good.features[1], id: good.features[0].id },
        ],
      }),
    ).toThrow("duplicate labels");
  });
  it("persists a valid default view, ignores corrupted data, and reports storage failures", () => {
    let raw: string | null = null;
    vi.stubGlobal("localStorage", {
      getItem: () => raw,
      setItem: (_k: string, v: string) => (raw = v),
      removeItem: () => (raw = null),
    });
    const focus = { lat: 40, lng: -100, altitude: 0.35 };
    expect(saveDefaultView(focus)).toBe(true);
    expect(readDefaultView()).toEqual(focus);
    expect(
      validDefaultView({ version: 1, focus: { ...focus, altitude: 0 } }),
    ).toBe(false);
    expect(saveDefaultView()).toBe(true);
    expect(readDefaultView()).toBeUndefined();
    raw = "{broken";
    expect(readDefaultView()).toBeUndefined();
    vi.stubGlobal("localStorage", {
      setItem: () => {
        throw Error("full");
      },
    });
    expect(saveDefaultView(focus)).toBe(false);
  });
});
