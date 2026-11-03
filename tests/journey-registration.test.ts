import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer } from "vite";
import ts from "typescript";
import {
  registrationPlan,
  applyRegistration,
  journeyWorkbenchPlugin,
} from "../review/registrationServer";
import { POWER_TO_THE_PEOPLE_JOURNEY as template } from "../src/game/powerToThePeopleJourney";
import { auditJourney } from "../src/game/journeyAudit";

const journey = { ...template, id: "registration-test-v1" };
const module = "registrationTestJourney.ts";
const route = "/journey/registration-test";
const files = [
  `src/game/${module}`,
  "src/game/journeys.ts",
  "src/game/journeyIndex.json",
  "docs/QUESTION_CATALOG.md",
];
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "ambit-registration-"));
  roots.push(root);
  for (const file of [...files, "public/geography/world.v1.json"]) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(
      path.join(root, file),
      (
        await readFile(
          file === `src/game/${module}`
            ? "src/game/powerToThePeopleJourney.ts"
            : file,
          "utf8",
        )
      ).replaceAll(
        file === `src/game/${module}`
          ? "POWER_TO_THE_PEOPLE_JOURNEY"
          : "__unused__",
        "REGISTRATION_TEST_JOURNEY",
      ),
    );
  }
  // Fixture validation uses real geography/contracts; asset existence is covered by the Journey tests.
  const load = async (file: string): Promise<Record<string, unknown>> =>
    file.includes("journeyAudit")
      ? {
          auditJourney: (...args: Parameters<typeof auditJourney>) =>
            auditJourney(args[0], args[1], () => true),
        }
      : { REGISTRATION_TEST_JOURNEY: journey };
  const snapshot = () =>
    Promise.all(files.map((f) => readFile(path.join(root, f), "utf8")));
  return { root, load, snapshot };
}
describe("local Journey registration", () => {
  it("previews exact edits without writing, then adds a held entry with matching source, route and metadata", async () => {
    const f = await fixture(),
      before = await f.snapshot();
    const plan = await registrationPlan(f.root, module, route, f.load);
    expect(await f.snapshot()).toEqual(before);
    expect(plan.preview.files).toEqual(files);
    await applyRegistration(f.root, plan, plan.preview.revision);
    const [source, catalog, index, docs] = await f.snapshot();
    expect(source).toContain("dailyEligible: false");
    expect(catalog).toContain(
      'import { REGISTRATION_TEST_JOURNEY } from "./registrationTestJourney";',
    );
    expect(catalog).toContain("  REGISTRATION_TEST_JOURNEY,");
    expect(catalog).toContain(
      '[REGISTRATION_TEST_JOURNEY.id]: "/journey/registration-test"',
    );
    expect(
      JSON.parse(index).find((j: { id: string }) => j.id === journey.id),
    ).toMatchObject({
      dailyEligible: false,
      module: `./${module}`,
      path: route,
      saveRevision: 1,
    });
    expect(docs).toContain(`[${module}](../src/game/${module})`);
    for (const text of [source, catalog]) {
      const result = ts.transpileModule(text, {
        reportDiagnostics: true,
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
        },
      });
      expect(result.diagnostics).toEqual([]);
    }
    await expect(
      registrationPlan(f.root, module, route, f.load),
    ).rejects.toThrow("already registered");
  });
  it("preserves concurrent edits and rejects a stale or absent preview", async () => {
    const f = await fixture(),
      plan = await registrationPlan(f.root, module, route, f.load);
    await expect(
      applyRegistration(f.root, plan, "bad revision"),
    ).rejects.toThrow("Preview registration again");
    await writeFile(
      path.join(f.root, files[1]),
      plan.before[1] + "\n// User edit\n",
    );
    const changed = await f.snapshot();
    await expect(
      applyRegistration(f.root, plan, plan.preview.revision),
    ).rejects.toThrow("Preview registration again");
    expect(await f.snapshot()).toEqual(changed);
  });
  it("rejects traversal, route injection, duplicate routes and broken Journey audits without writes", async () => {
    const f = await fixture(),
      before = await f.snapshot();
    await expect(
      registrationPlan(f.root, "../../outsideJourney.ts", route, f.load),
    ).rejects.toThrow("source file");
    await expect(
      registrationPlan(f.root, module, '/journey/x\";alert(1)', f.load),
    ).rejects.toThrow("Use a route");
    await expect(
      registrationPlan(f.root, module, "/journey/down-the-danube", f.load),
    ).rejects.toThrow("already registered");
    const badLoad = async (file: string) =>
      file.includes("journeyAudit")
        ? { auditJourney: () => ({ errors: ["Missing answer"] }) }
        : f.load(file);
    await expect(
      registrationPlan(f.root, module, route, badLoad),
    ).rejects.toThrow("Missing answer");
    expect(await f.snapshot()).toEqual(before);
  });
  it("exposes mutation only to same-origin JSON on the loopback development server", async () => {
    const f = await fixture();
    const server = await createServer({
      configFile: false,
      root: f.root,
      plugins: [journeyWorkbenchPlugin()],
      server: { host: "127.0.0.1", port: 0 },
    });
    vi.spyOn(server, "ssrLoadModule").mockImplementation(f.load);
    try {
      await server.listen();
      const address = server.httpServer!.address();
      if (!address || typeof address === "string")
        throw Error("Expected local TCP server");
      const origin = `http://127.0.0.1:${address.port}`,
        url = origin + "/__journey-workbench/register";
      const before = await f.snapshot();
      const preview = await fetch(
        `${url}?${new URLSearchParams({ module, route })}`,
      );
      expect(preview.status).toBe(200);
      const plan = await preview.json();
      const body = JSON.stringify({ module, route, revision: plan.revision });
      for (const headers of [
        { "Content-Type": "application/json" },
        {
          "Content-Type": "application/json",
          Origin: "https://outside.example",
        },
        { "Content-Type": "text/plain", Origin: origin },
      ] as Record<string, string>[]) {
        const response = await fetch(url, { method: "POST", headers, body });
        expect(response.status).toBe(400);
      }
      expect(await f.snapshot()).toEqual(before);
      const registered = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin },
        body,
      });
      expect(registered.status).toBe(200);
      expect(
        JSON.parse((await f.snapshot())[2]).find(
          (j: { id: string }) => j.id === journey.id,
        ).dailyEligible,
      ).toBe(false);
    } finally {
      await server.close();
    }
  });
});
