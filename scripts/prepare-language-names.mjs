import fs from "node:fs/promises";
import { createHash } from "node:crypto";

const metadata = JSON.parse(
  await fs.readFile("sources/languages.metadata.json", "utf8"),
);
const path = ".cache/explore/iso-languagecodes.txt";
let raw = await fs.readFile(path).catch(() => null);
if (!raw) {
  const response = await fetch(metadata.source.url);
  if (!response.ok) throw Error("Language-name download failed");
  raw = Buffer.from(await response.arrayBuffer());
  await fs.mkdir(".cache/explore", { recursive: true });
  await fs.writeFile(path, raw);
}
if (createHash("sha256").update(raw).digest("hex") !== metadata.source.sha256)
  throw Error("Language-name source checksum mismatch");

const sourceNames = new Map();
for (const line of raw.toString("utf8").split(/\r?\n/).slice(1)) {
  const [iso3, iso2, iso1, name] = line.split("\t");
  if (!name) continue;
  for (const code of [iso3, iso2, iso1]) {
    if (code) sourceNames.set(code, name);
  }
}
const countries = JSON.parse(
  await fs.readFile("src/geography/data/country-info.v1.json", "utf8"),
).countries;
const tags = [
  ...new Set(Object.values(countries).flatMap((c) => c.languages)),
].sort();
const languageNames = new Intl.DisplayNames(["en"], {
  type: "language",
  fallback: "none",
});
const regionNames = new Intl.DisplayNames(["en"], {
  type: "region",
  fallback: "none",
});
const names = {};
for (const tag of tags) {
  const [base, region] = tag.split("-");
  const sourceName = sourceNames.get(base);
  if (!sourceName) throw Error(`Missing language-name source entry: ${tag}`);
  // Expand all names during preparation so browser ICU coverage cannot leak codes.
  const language = languageNames.of(base) ?? sourceName;
  const regionName = region ? regionNames.of(region) : undefined;
  if (region && !regionName) throw Error(`Missing language region: ${tag}`);
  names[tag] = regionName ? `${language} (${regionName})` : language;
}
await fs.writeFile(
  metadata.output,
  `${JSON.stringify({ version: 1, names }, null, 2)}\n`,
);
