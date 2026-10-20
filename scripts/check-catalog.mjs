import { spawnSync } from "node:child_process";

function run(command, args) {
  const env = { ...process.env };
  if (Number(process.versions.node.split(".")[0]) >= 25)
    env.NODE_OPTIONS =
      `${env.NODE_OPTIONS ?? ""} --no-experimental-webstorage`.trim();
  const result = spawnSync(command, args, { stdio: "inherit", env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function supportedPython() {
  for (const command of [
    process.env.PYTHON,
    "python3",
    "python3.13",
    "python3.12",
    "python3.11",
  ].filter(Boolean)) {
    const result = spawnSync(
      command,
      ["-c", "import sys; print(sys.version_info[:2] >= (3, 11))"],
      { encoding: "utf8" },
    );
    if (result.status === 0 && result.stdout.trim() === "True") return command;
  }
  throw Error(
    "Catalog checks need Python 3.11 or newer. Set PYTHON to its executable.",
  );
}

run(process.execPath, ["scripts/catalog-reference-report.mjs"]);
// Full-catalog geometry checks share CPU with the rest of the release suite.
run("npm", ["run", "test:all", "--", "--testTimeout=15000"]);
run(supportedPython(), ["scripts/run-python-tests.py"]);
run("./node_modules/.bin/tsc", ["--noEmit"]);
