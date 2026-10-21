import { spawnSync } from "node:child_process";
import { supportedPython } from "./check-runtime.mjs";

function run(command, args) {
  const env = { ...process.env };
  if (Number(process.versions.node.split(".")[0]) >= 25)
    env.NODE_OPTIONS =
      `${env.NODE_OPTIONS ?? ""} --no-experimental-webstorage`.trim();
  const result = spawnSync(command, args, { stdio: "inherit", env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const python = supportedPython();
run(process.execPath, ["scripts/catalog-reference-report.mjs"]);
// Full-catalog geometry checks share CPU with the rest of the release suite.
run("npm", ["run", "test:all", "--", "--testTimeout=15000"]);
run(python, ["scripts/run-python-tests.py"]);
run("./node_modules/.bin/tsc", ["--noEmit"]);
