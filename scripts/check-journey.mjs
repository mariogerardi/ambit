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
const all = args.includes("--all");
const entry = index.find(
  (entry) =>
    entry.id === target ||
    entry.path === target ||
    entry.path.split("/").at(-1) === target,
);
if (!entry && !recipeMode && !all) {
  console.error(
    "Usage: npm run check:journey -- <journey-id-or-slug> [--json]\nUse --all for a catalog sweep, --list to list Journeys, or --recipe <answer-mode> for a complete mechanic example.",
  );
  process.exit(1);
}
const server = await createServer({
  server: { middlewareMode: true },
  logLevel: "error",
});
try {
  const { auditJourney } = await server.ssrLoadModule(
    "/src/game/journeyAudit.ts",
  );
  const regions = JSON.parse(
    await readFile("public/geography/world.v1.json", "utf8"),
  );
  const publicRoot = path.resolve("public");
  const reports = [];
  // No rendering, downloads, preparation or deployment. Unlisted editions are checked too.
  for (const selected of all ? index : [entry]) {
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
        `/src/game/${selected.module.replace(/^\.\//, "")}`,
      );
      journey = Object.values(module).find(
        (value) =>
          value && typeof value === "object" && value.id === selected.id,
      );
      if (!journey) throw Error(`Missing Journey export: ${selected.id}`);
    }
    const report = auditJourney(journey, regions, (asset) => {
      const resolved = path.resolve(publicRoot, `.${asset}`);
      return (
        resolved.startsWith(`${publicRoot}${path.sep}`) && existsSync(resolved)
      );
    });
    reports.push(report);
    if (!args.includes("--json")) {
      console.log(
        `${journey.title}: ${report.errors.length ? "FAILED" : "PASS"}`,
      );
      for (const question of all ? [] : report.questions) {
        console.log(
          `  ${question.id} — ${question.mode} (${question.control})`,
        );
        for (const state of question.states)
          console.log(
            `    ${state.stage}: ${state.context.length} context regions, ${state.places.length} places, borders ${state.borders ? "on" : "off"}`,
          );
      }
      console.log(
        `  ${report.questions.length} questions; ${Object.keys(report.sharedRules).length} shared rules; ${report.exceptions.length} reviewed exceptions; ${report.assets.length} media assets checked`,
      );
      if (!all)
        for (const exception of report.exceptions)
          console.log(
            `  Exception: ${exception.questionId} / ${exception.rule} — ${exception.reason}`,
          );
      for (const message of report.warnings) console.log(`  Note: ${message}`);
      for (const message of report.errors) console.error(`  Error: ${message}`);
    }
    if (report.errors.length) process.exitCode = 1;
  }
  if (args.includes("--json"))
    console.log(JSON.stringify(all ? reports : reports[0], null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await server.close();
}
