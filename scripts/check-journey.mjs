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
const moduleTarget = args.includes("--module")
  ? args[args.indexOf("--module") + 1]
  : undefined;
const all = args.includes("--all");
const capabilities = args.includes("--capabilities");
const entry = index.find(
  (entry) =>
    entry.id === target ||
    entry.path === target ||
    entry.path.split("/").at(-1) === target,
);
if (
  (!entry && !recipeMode && !all && !moduleTarget && !capabilities) ||
  (moduleTarget &&
    (!/^src\/game\/[^/]+Journey\.ts$/.test(moduleTarget) || all || recipeMode))
) {
  console.error(
    "Usage: npm run check:journey -- <journey-id-or-slug> [--json]\nUse --module src/game/<name>Journey.ts for an unregistered draft, --all for a catalog sweep, --list to list Journeys, or --recipe <answer-mode-or-composition> for a complete mechanic example. Use --capabilities [--json] for live reuse evidence and recipe preview links.",
  );
  process.exit(1);
}
const server = await createServer({
  server: { middlewareMode: true, hmr: false },
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
  const { recipeJourney, authoringCapabilities } = await server.ssrLoadModule(
    "/src/game/authoringCapabilities.ts",
  );
  if (capabilities) {
    const { JOURNEYS } = await server.ssrLoadModule("/src/game/journeys.ts");
    const { MECHANIC_RECIPES, PRESENTATION_RECIPES } =
      await server.ssrLoadModule("/src/game/recipes.ts");
    const catalog = authoringCapabilities(
      JOURNEYS,
      [...MECHANIC_RECIPES, ...PRESENTATION_RECIPES],
      regions,
    );
    console.log(
      args.includes("--json")
        ? JSON.stringify(catalog, null, 2)
        : catalog
            .map(
              (item) =>
                `${item.id} — ${item.availability}\n  ${item.control} / ${item.demonstratedRule}; stages: ${item.evidence.stages.join(", ")}\n  Requires: ${item.requires.join("; ")}\n  Preview: ${item.preview}\n  ${item.auditCommand}\n  Limits: ${item.limits.join(" ")}\n  Checks: ${item.evidence.checks.join(", ")}${item.evidence.errors.length ? `\n  Errors: ${item.evidence.errors.join("; ")}` : ""}`,
            )
            .join("\n\n"),
    );
  }
  // No rendering, downloads, preparation or deployment. Every registered Journey is checked.
  for (const selected of capabilities ? [] : all ? index : [entry]) {
    let journey;
    if (recipeMode) {
      const { MECHANIC_RECIPES, PRESENTATION_RECIPES } =
        await server.ssrLoadModule("/src/game/recipes.ts");
      const question = [...MECHANIC_RECIPES, ...PRESENTATION_RECIPES].find(
        (question) => question.id === `recipe:${recipeMode}`,
      );
      if (!question) throw Error(`Unknown recipe: ${recipeMode}`);
      journey = recipeJourney(question);
    } else if (moduleTarget) {
      const module = await server.ssrLoadModule(`/${moduleTarget}`);
      journey = Object.values(module).find(
        (value) =>
          value &&
          typeof value === "object" &&
          Array.isArray(value.rounds) &&
          typeof value.id === "string",
      );
      if (!journey) throw Error(`Missing Journey export: ${moduleTarget}`);
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
        console.log(
          `    Clue: ${[question.editorial.before.leadIn, question.editorial.before.prompt].filter(Boolean).join(" ")}`,
        );
        console.log(
          `    Reveal: ${question.editorial.after.heading} ${question.editorial.after.answer} — ${question.editorial.after.explanation}`,
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
  if (args.includes("--json") && !capabilities)
    console.log(JSON.stringify(all ? reports : reports[0], null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await server.close();
}
