import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import ts from "typescript";
import { format } from "prettier";
import type { CatalogStatus, RegistrationPlan } from "./registrationTypes";

const run = promisify(execFile);
const indexPath = "src/game/journeyIndex.json";
interface Entry {
  id: string;
  module: string;
  path: string;
  title: string;
  dailyEligible?: boolean;
}
function validateModule(module: string) {
  if (!/^[A-Za-z][A-Za-z0-9]*Journey\.ts$/.test(module))
    throw Error("Choose a Journey source file.");
}

/** Never offer source removal for catalog entries that may already be released. */
export async function catalogStatus(
  root: string,
  module: string,
): Promise<CatalogStatus> {
  validateModule(module);
  const index = JSON.parse(
    await readFile(path.join(root, indexPath), "utf8"),
  ) as Entry[];
  const entry = index.find((item) => item.module === `./${module}`);
  if (!entry) return { registered: false, canRemove: false };
  const status: CatalogStatus = {
    registered: true,
    route: entry.path,
    canRemove: false,
  };
  if (entry.dailyEligible !== false)
    return {
      ...status,
      reason:
        "This Journey participates in automatic rotation. Retirement requires a source change.",
    };
  try {
    for (const ref of ["HEAD", "origin/main"]) {
      const { stdout } = await run("git", ["show", `${ref}:${indexPath}`], {
        cwd: root,
      });
      const committed = JSON.parse(stdout) as Entry[];
      if (
        committed.some(
          (item) =>
            item.id === entry.id ||
            item.module === entry.module ||
            item.path === entry.path,
        )
      )
        return {
          ...status,
          reason:
            "This Journey is already committed. Retirement must preserve existing assignments and saves.",
        };
    }
  } catch {
    return {
      ...status,
      reason:
        "Cannot verify catalog history. Only verified local, uncommitted additions can be removed here.",
    };
  }
  return { ...status, canRemove: true };
}

export async function removalPlan(
  root: string,
  module: string,
  route: string,
): Promise<RegistrationPlan> {
  const status = await catalogStatus(root, module);
  if (!status.registered || status.route !== route)
    throw Error("This Journey is not registered at that route.");
  if (!status.canRemove) throw Error(status.reason);
  const files = ["src/game/journeys.ts", indexPath, "docs/QUESTION_CATALOG.md"];
  const before = await Promise.all(
    files.map((file) => readFile(path.join(root, file), "utf8")),
  );
  const [catalog, indexText, docs] = before;
  const index = JSON.parse(indexText) as Entry[];
  const entry = index.find((item) => item.module === `./${module}`)!;
  const ast = ts.createSourceFile(
    files[0],
    catalog,
    ts.ScriptTarget.Latest,
    true,
  );
  const declaration = ast.statements.find(
    (node): node is ts.ImportDeclaration =>
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text === `./${module.slice(0, -3)}`,
  );
  const bindings = declaration?.importClause?.namedBindings;
  if (
    !declaration ||
    !bindings ||
    !ts.isNamedImports(bindings) ||
    bindings.elements.length !== 1
  )
    throw Error("Catalog format changed; remove this Journey in source.");
  const name = bindings.elements[0].name.text;
  const changes = [{ start: declaration.getFullStart(), end: declaration.end }];
  let removedEntry = false,
    removedRoute = false;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.initializer) {
      if (
        node.name.getText(ast) === "JOURNEYS" &&
        ts.isArrayLiteralExpression(node.initializer)
      ) {
        const item = node.initializer.elements.find(
          (item) => item.getText(ast) === name,
        );
        if (item) {
          changes.push({
            start: item.getFullStart(),
            end: catalog[item.end] === "," ? item.end + 1 : item.end,
          });
          removedEntry = true;
        }
      }
      if (
        node.name.getText(ast) === "paths" &&
        ts.isObjectLiteralExpression(node.initializer)
      ) {
        const item = node.initializer.properties.find(
          (item) =>
            ts.isPropertyAssignment(item) &&
            item.name.getText(ast) === `[${name}.id]` &&
            ts.isStringLiteral(item.initializer) &&
            item.initializer.text === route,
        );
        if (item) {
          changes.push({
            start: item.getFullStart(),
            end: catalog[item.end] === "," ? item.end + 1 : item.end,
          });
          removedRoute = true;
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  if (!removedEntry || !removedRoute)
    throw Error("Catalog format changed; remove this Journey in source.");
  let afterCatalog = catalog;
  for (const change of changes.sort((a, b) => b.start - a.start))
    afterCatalog =
      afterCatalog.slice(0, change.start) + afterCatalog.slice(change.end);
  const afterDocs = docs
    .split("\n")
    .filter(
      (line) =>
        !(
          line.startsWith("|") &&
          line.includes(`\`${route}\``) &&
          line.includes(`../src/game/${module}`)
        ),
    )
    .join("\n");
  if (afterDocs === docs)
    throw Error("Catalog documentation entry was not found.");
  const after = await Promise.all(
    [
      afterCatalog,
      JSON.stringify(
        index.filter((item) => item.id !== entry.id),
        null,
        2,
      ) + "\n",
      afterDocs,
    ].map((text, i) => format(text, { filepath: files[i] })),
  );
  return {
    preview: {
      action: "remove",
      title: entry.title,
      id: entry.id,
      module,
      route,
      files,
      revision: createHash("sha256")
        .update(JSON.stringify({ action: "remove", before, module, route }))
        .digest("hex"),
    },
    files,
    before,
    after,
  };
}
