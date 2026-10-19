import { statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const optionStart = args.findIndex((arg) => arg.startsWith("-"));
const files = optionStart < 0 ? args : args.slice(0, optionStart);
if (
  !files.length ||
  files.some(
    (file) =>
      !/\.(test|spec)\.[cm]?[jt]sx?$/.test(file) ||
      !statSync(file, { throwIfNoEntry: false })?.isFile(),
  )
) {
  console.error(
    "Name existing test files before any options: npm test -- tests/<file>.test.ts [-t <test-name>]\nFor an intentional full run, use npm run test:all.",
  );
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(
      new URL("../node_modules/vitest/vitest.mjs", import.meta.url),
    ),
    "run",
    "--silent=passed-only",
    ...args,
  ],
  { stdio: "inherit" },
);
if (result.error) throw result.error;
if (result.signal) process.kill(process.pid, result.signal);
else process.exitCode = result.status ?? 1;
