import { createServer } from "vite";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const index = JSON.parse(await readFile("src/game/journeyIndex.json", "utf8"));
if (args.includes("--list")) {
  for (const entry of index) console.log(`${entry.id}  ${entry.title}`);
  process.exit(0);
}
const target = args.find((arg) => !arg.startsWith("--"));
const recipeMode = args.includes("--recipe") ? target : undefined;
const entry = index.find(
  (entry) =>
    entry.id === target ||
    entry.path === target ||
    entry.path.split("/").at(-1) === target,
);
if (!entry && !recipeMode) {
  console.error(
    "Usage: npm run check:journey -- <journey-id-or-slug> [--json]\nUse --list to list Journeys, or --recipe <answer-mode> for a complete mechanic example.",
  );
  process.exit(1);
}
const server = await createServer({
  server: { middlewareMode: true },
  logLevel: "error",
});
try {
  // Load only the requested definition. No rendering, downloads, preparation or deployment.
  let journey;
  if (recipeMode) {
    const { MECHANIC_RECIPES } = await server.ssrLoadModule(
      "/src/game/recipes.ts",
    );
    const question = MECHANIC_RECIPES.find(
      (question) => question.mode === recipeMode,
    );
    if (!question) throw Error(`Unknown recipe: ${recipeMode}`);
    journey = {
      id: question.id,
      title: question.title,
      description: "Mechanic recipe",
      rounds: [question],
    };
  } else {
    const module = await server.ssrLoadModule(
      `/src/game/${entry.module.replace(/^\.\//, "")}`,
    );
    journey = Object.values(module).find(
      (value) => value && typeof value === "object" && value.id === entry.id,
    );
    if (!journey) throw Error(`Missing Journey export: ${entry.id}`);
  }
  const { auditJourney } = await server.ssrLoadModule(
    "/src/game/journeyAudit.ts",
  );
  const regions = JSON.parse(
    await readFile("public/geography/world.v1.json", "utf8"),
  );
  const publicRoot = path.resolve("public");
  const report = auditJourney(journey, regions, (asset) => {
    const resolved = path.resolve(publicRoot, `.${asset}`);
    return (
      resolved.startsWith(`${publicRoot}${path.sep}`) && existsSync(resolved)
    );
  });
  if (args.includes("--json")) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(
      `${journey.title}: ${report.errors.length ? "FAILED" : "PASS"}`,
    );
    for (const question of report.questions) {
      console.log(`  ${question.id} — ${question.mode} (${question.control})`);
      for (const state of question.states)
        console.log(
          `    ${state.stage}: ${state.context.length} context regions, ${state.places.length} places, borders ${state.borders ? "on" : "off"}`,
        );
    }
    console.log(`  ${report.assets.length} media assets checked`);
    for (const message of report.warnings) console.log(`  Note: ${message}`);
    for (const message of report.errors) console.error(`  Error: ${message}`);
  }
  if (report.errors.length) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await server.close();
}
