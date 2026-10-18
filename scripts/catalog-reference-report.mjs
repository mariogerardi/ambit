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
const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map(({ type, value }) => [type, value]));
const today = `${parts.year}-${parts.month}-${parts.day}`;
const dangling = records.filter((record) => record.journeyId && !ids.has(record.journeyId));
const future = dangling.filter((record) => record.day >= today);
for (const record of dangling)
  console.error(`${record.day}: ${record.journeyId} (${record.source ?? "unknown"}; ${record.day < today ? "historical, unavailable in Archive" : "clear or reassign before deployment"})`);
console.log(
  `Catalog references: ${records.length} dates checked, ${dangling.length} unavailable Journey IDs, ${future.length} current or future references requiring action.`,
);
if (future.length) process.exitCode = 1;
