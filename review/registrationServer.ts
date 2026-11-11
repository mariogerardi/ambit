import { createHash } from "node:crypto";
import { readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import { format } from "prettier";
import type { Plugin, ViteDevServer } from "vite";
import type { Journey } from "../src/game/questionContracts";
import type {
  RegistrationPlan,
  RegistrationPreview,
} from "./registrationTypes";
import { catalogStatus, removalPlan } from "./catalogRemoval";

const endpoint = "/__journey-workbench/register";
const catalogPath = "src/game/journeys.ts";
const indexPath = "src/game/journeyIndex.json";
const docsPath = "docs/QUESTION_CATALOG.md";
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const parse = (name: string, text: string) =>
  ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);
function edit(
  text: string,
  changes: { start: number; end: number; text: string }[],
) {
  return changes
    .sort((a, b) => b.start - a.start)
    .reduce(
      (value, c) => value.slice(0, c.start) + c.text + value.slice(c.end),
      text,
    );
}

/** Prepare exact local edits; no writes, scheduling, builds or deployment. */
export async function registrationPlan(
  root: string,
  module: string,
  route: string,
  load: (file: string) => Promise<Record<string, unknown>>,
): Promise<RegistrationPlan> {
  if (!/^[A-Za-z][A-Za-z0-9]*Journey\.ts$/.test(module))
    throw Error("Choose a Journey source file.");
  if (!/^\/journey\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(route))
    throw Error("Use a route such as /journey/my-journey.");
  const modulePath = `src/game/${module}`;
  if (
    (await realpath(path.join(root, modulePath))) !==
    path.join(await realpath(root), modulePath)
  )
    throw Error("Journey source must be inside this repository.");
  const exports = await load(`/${modulePath}`);
  const journeys = Object.entries(exports).filter(
    ([, v]) =>
      v &&
      typeof v === "object" &&
      Array.isArray((v as Journey).rounds) &&
      typeof (v as Journey).id === "string",
  );
  if (journeys.length !== 1)
    throw Error("Registration needs one named Journey export per source file.");
  const [exportName, value] = journeys[0];
  const journey = value as Journey;
  if (
    !/^[A-Za-z_$][\w$]*$/.test(exportName) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(journey.id)
  )
    throw Error("Invalid Journey identity.");
  if (
    journey.rounds.length !== 5 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(journey.addedAt ?? "")
  )
    throw Error("A Journey needs five rounds and an addedAt date.");
  const files = [modulePath, catalogPath, indexPath, docsPath];
  const before = await Promise.all(
    files.map((f) => readFile(path.join(root, f), "utf8")),
  );
  const [source, catalog, indexText, docs] = before;
  const index = JSON.parse(indexText) as {
    id: string;
    path: string;
    module: string;
  }[];
  if (
    index.some(
      (j) =>
        j.id === journey.id || j.path === route || j.module === `./${module}`,
    )
  )
    throw Error("This Journey, source or route is already registered.");
  const { auditJourney } = await load("/src/game/journeyAudit.ts");
  const regions = JSON.parse(
    await readFile(path.join(root, "public/geography/world.v1.json"), "utf8"),
  );
  const { existsSync } = await import("node:fs");
  const report = (
    auditJourney as (
      j: Journey,
      r: unknown,
      a: (asset: string) => boolean,
    ) => { errors: string[] }
  )(journey, regions, (asset) => {
    const resolved = path.resolve(root, "public", `.${asset}`);
    return (
      resolved.startsWith(path.join(root, "public") + path.sep) &&
      existsSync(resolved)
    );
  });
  if (report.errors.length)
    throw Error(
      `Fix the Journey audit before registering: ${report.errors.join("; ")}`,
    );
  const sourceAST = parse(module, source);
  let object: ts.ObjectLiteralExpression | undefined;
  sourceAST.forEachChild((node) => {
    if (
      ts.isVariableStatement(node) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    )
      for (const declaration of node.declarationList.declarations)
        if (
          declaration.name.getText(sourceAST) === exportName &&
          declaration.initializer &&
          ts.isObjectLiteralExpression(declaration.initializer)
        )
          object = declaration.initializer;
  });
  if (!object)
    throw Error(
      "The Journey export must be an object literal to register it here.",
    );
  const literal: ts.ObjectLiteralExpression = object;
  const eligibility = literal.properties.find(
    (p) => p.name?.getText(sourceAST) === "dailyEligible",
  );
  if (eligibility && !ts.isPropertyAssignment(eligibility))
    throw Error("Use a literal dailyEligible property.");
  const afterSource =
    eligibility && ts.isPropertyAssignment(eligibility)
      ? edit(source, [
          {
            start: eligibility.initializer.getStart(sourceAST),
            end: eligibility.initializer.end,
            text: "false",
          },
        ])
      : edit(source, [
          {
            start: literal.getStart(sourceAST) + 1,
            end: literal.getStart(sourceAST) + 1,
            text: "\n  dailyEligible: false,",
          },
        ]);
  const catalogAST = parse(catalogPath, catalog);
  let array: ts.ArrayLiteralExpression | undefined,
    paths: ts.ObjectLiteralExpression | undefined;
  const imports: ts.ImportDeclaration[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node)) imports.push(node);
    if (ts.isVariableDeclaration(node) && node.initializer) {
      if (
        node.name.getText(catalogAST) === "JOURNEYS" &&
        ts.isArrayLiteralExpression(node.initializer)
      )
        array = node.initializer;
      if (
        node.name.getText(catalogAST) === "paths" &&
        ts.isObjectLiteralExpression(node.initializer)
      )
        paths = node.initializer;
    }
    ts.forEachChild(node, visit);
  };
  visit(catalogAST);
  if (!array || !paths || !imports.length)
    throw Error("Catalog format changed; register this Journey in source.");
  if (
    imports.some(
      (i) =>
        i.moduleSpecifier.getText(catalogAST).slice(1, -1) ===
        `./${module.slice(0, -3)}`,
    )
  )
    throw Error("This source is already imported in the catalog.");
  const afterCatalog = edit(catalog, [
    {
      start: imports.at(-1)!.end,
      end: imports.at(-1)!.end,
      text: `\nimport { ${exportName} } from "./${module.slice(0, -3)}";`,
    },
    {
      start: array.elements.end,
      end: array.elements.end,
      text: `\n  ${exportName},`,
    },
    {
      start: paths.properties.end,
      end: paths.properties.end,
      text: `\n    [${exportName}.id]: ${JSON.stringify(route)},`,
    },
  ]);
  const entry = {
    id: journey.id,
    dailyEligible: false,
    addedAt: journey.addedAt,
    title: journey.title,
    ...(journey.supersedes ? { supersedes: journey.supersedes } : {}),
    ...(journey.saveRevision
      ? {
          saveRevision: journey.saveRevision,
          legacyRoundLabels: journey.legacyRoundLabels,
        }
      : {}),
    description: journey.description,
    path: route,
    module: `./${module}`,
    rounds: journey.rounds.map(
      ({ id, label, progressLabel, resolvedLabel }) => ({
        id,
        label,
        ...(progressLabel ? { progressLabel } : {}),
        ...(journey.saveRevision && resolvedLabel ? { resolvedLabel } : {}),
      }),
    ),
  };
  const afterIndex =
    JSON.stringify(
      [...index, entry].sort((a, b) => a.id.localeCompare(b.id)),
      null,
      2,
    ) + "\n";
  const tableStart = docs.indexOf("## Bundled Journeys");
  const tableEnd = docs.indexOf("\n\n", docs.indexOf("| Title", tableStart));
  if (tableStart < 0 || tableEnd < 0)
    throw Error("Catalog documentation table was not found.");
  const title = journey.title.replaceAll("|", "\\|").replace(/[\r\n]/g, " ");
  const afterDocs =
    docs.slice(0, tableEnd) +
    `\n| ${title} | \`${route}\` | [${module}](../src/game/${module}) |` +
    docs.slice(tableEnd);
  const revision = hash(JSON.stringify({ before, module, route, journey }));
  const preview: RegistrationPreview = {
    action: "add",
    title: journey.title,
    id: journey.id,
    module,
    route,
    revision,
    files,
  };
  const after = await Promise.all(
    [afterSource, afterCatalog, afterIndex, afterDocs].map((text, i) =>
      format(text, { filepath: files[i] }),
    ),
  );
  return {
    preview,
    files,
    before,
    after,
  };
}

export async function applyRegistration(
  root: string,
  plan: RegistrationPlan,
  revision: string,
) {
  if (plan.preview.revision !== revision)
    throw Error("Source changed. Preview registration again.");
  const current = await Promise.all(
    plan.files.map((f) => readFile(path.join(root, f), "utf8")),
  );
  if (current.some((v, i) => v !== plan.before[i]))
    throw Error("Source changed. Preview registration again.");
  const written: number[] = [];
  try {
    for (let i = 0; i < plan.files.length; i++) {
      await writeFile(path.join(root, plan.files[i]), plan.after[i]);
      written.push(i);
    }
  } catch (error) {
    for (const i of written)
      if (
        (await readFile(path.join(root, plan.files[i]), "utf8")) ===
        plan.after[i]
      )
        await writeFile(path.join(root, plan.files[i]), plan.before[i]);
    throw error;
  }
}

export function journeyWorkbenchPlugin(): Plugin {
  return {
    name: "ambit-local-journey-registration",
    apply: "serve",
    configureServer(server: ViteDevServer) {
      let registering = false;
      server.middlewares.use(endpoint, async (req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        try {
          const host = new URL(`http://${req.headers.host}`);
          if (
            !["127.0.0.1", "localhost", "[::1]"].includes(host.hostname) ||
            (req.headers.origin && req.headers.origin !== host.origin)
          )
            throw Error("Use the local Journey workbench.");
          if (req.method !== "GET" && req.method !== "POST") {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: "Method not allowed." }));
            return;
          }
          if (
            req.method === "POST" &&
            (req.headers.origin !== host.origin ||
              req.headers["content-type"] !== "application/json")
          )
            throw Error("Registration requires a same-origin JSON request.");
          if (registering) {
            res.statusCode = 409;
            res.end(
              JSON.stringify({
                error: "A registration is in progress. Preview again.",
              }),
            );
            return;
          }
          let input: {
            module?: string;
            route?: string;
            revision?: string;
            action?: string;
          };
          if (req.method === "GET")
            input = Object.fromEntries(new URL(req.url!, host).searchParams);
          else {
            let body = "";
            for await (const chunk of req) {
              body += chunk;
              if (body.length > 4096)
                throw Error("Registration request is too large.");
            }
            input = JSON.parse(body);
          }
          if (typeof input.module !== "string")
            throw Error("Choose a Journey and route.");
          const root = server.config.root;
          if (input.action === "status" && req.method === "GET") {
            res.end(JSON.stringify(await catalogStatus(root, input.module)));
            return;
          }
          if (typeof input.route !== "string")
            throw Error("Choose a Journey and route.");
          if (input.action && !["add", "remove"].includes(input.action))
            throw Error("Unknown catalog action.");
          registering = true;
          try {
            const plan =
              input.action === "remove"
                ? await removalPlan(root, input.module, input.route)
                : await registrationPlan(
                    root,
                    input.module,
                    input.route,
                    (file) => server.ssrLoadModule(file),
                  );
            if (req.method === "POST") {
              if (typeof input.revision !== "string")
                throw Error("Preview registration first.");
              await applyRegistration(root, plan, input.revision);
            }
            res.end(JSON.stringify(plan.preview));
          } finally {
            registering = false;
          }
        } catch (error) {
          res.statusCode = 400;
          res.end(
            JSON.stringify({
              error:
                error instanceof Error ? error.message : "Registration failed.",
            }),
          );
        }
      });
    },
  };
}
