import { readFileSync } from "node:fs";

const ids = new Set(
  JSON.parse(readFileSync("src/game/journeyIndex.json", "utf8")).map(
    (entry) => entry.id,
  ),
);
const snapshot = process.env.CATALOG_SCHEDULE_SNAPSHOT;
if (!snapshot) {
  console.log(
    "Catalog references: live schedule not checked (set CATALOG_SCHEDULE_SNAPSHOT to a read-only schedule export before removing an ID).",
  );
  process.exit(0);
}
const records = JSON.parse(readFileSync(snapshot, "utf8"));
if (!Array.isArray(records))
  throw Error("Schedule snapshot must be an array of date records.");
const dangling = records.filter((record) => !ids.has(record.journeyId));
for (const record of dangling)
  console.error(
    `${record.day}: ${record.journeyId} (${record.source ?? "unknown"})`,
  );
console.log(
  `Catalog references: ${records.length} dates checked, ${dangling.length} unavailable Journey IDs.`,
);
if (dangling.length) process.exitCode = 1;
