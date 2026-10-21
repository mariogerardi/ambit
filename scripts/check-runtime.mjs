import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function supportedPython(env = process.env, run = spawnSync) {
  const candidates = env.PYTHON
    ? [env.PYTHON]
    : ["python3", "python3.13", "python3.12", "python3.11"];
  for (const command of candidates) {
    const result = run(
      command,
      ["-c", "import sys; print(sys.version_info[:2] >= (3, 11))"],
      { encoding: "utf8" },
    );
    if (result.status === 0 && result.stdout.trim() === "True") return command;
  }
  throw Error(
    env.PYTHON
      ? `PYTHON=${env.PYTHON} is unavailable or older than Python 3.11.`
      : "Python 3.11 or newer is required. Install it or set PYTHON to its executable.",
  );
}

export function runtimeProblems(node, npm, pinnedNode, pinnedNpm) {
  const problems = [];
  if (node !== pinnedNode)
    problems.push(
      `Node ${node}; expected ${pinnedNode} from .nvmrc. Select the pinned runtime (nvm use).`,
    );
  if (npm !== pinnedNpm)
    problems.push(
      `npm ${npm || "unavailable"}; expected ${pinnedNpm} from packageManager. Select the pinned npm on PATH.`,
    );
  return problems;
}

function main() {
  const pinnedNode = readFileSync(
    new URL("../.nvmrc", import.meta.url),
    "utf8",
  ).trim();
  const { packageManager } = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  const pinnedNpm = packageManager.split("@")[1];
  const npm = spawnSync("npm", ["--version"], { encoding: "utf8" });
  const npmVersion = npm.status === 0 ? npm.stdout.trim() : "";
  const problems = runtimeProblems(
    process.versions.node,
    npmVersion,
    pinnedNode,
    pinnedNpm,
  );
  try {
    const python = supportedPython();
    console.log(
      `Backend interpreter: ${python} (Python >=3.11). Use this command for scripts/run-python-tests.py; PYTHON selects it for catalog checks.`,
    );
  } catch (error) {
    problems.push(error.message);
  }
  for (const problem of problems) console.error(problem);
  if (problems.length) process.exitCode = 1;
  else
    console.log(`Runtime check passed: Node ${pinnedNode}, npm ${pinnedNpm}.`);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main();
