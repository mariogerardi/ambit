import { test } from "node:test";
import assert from "node:assert/strict";
import { supportedPython, runtimeProblems } from "./check-runtime.mjs";

test("runtime mismatches report both tools rather than hiding the second failure", () => {
  const problems = runtimeProblems("25.2.1", "11.6.2", "24.21.0", "11.19.0");
  assert.equal(problems.length, 2);
  assert.match(problems[0], /Node 25\.2\.1; expected 24\.21\.0/);
  assert.match(problems[1], /npm 11\.6\.2; expected 11\.19\.0/);
  assert.deepEqual(
    runtimeProblems("24.21.0", "11.19.0", "24.21.0", "11.19.0"),
    [],
  );
});

test("Python selection skips old and missing interpreters", () => {
  const called = [];
  const selected = supportedPython({}, (command) => {
    called.push(command);
    if (command === "python3") return { status: 0, stdout: "False\n" };
    if (command === "python3.13")
      return { status: null, error: Error("ENOENT") };
    return { status: 0, stdout: "True\n" };
  });
  assert.equal(selected, "python3.12");
  assert.deepEqual(called, ["python3", "python3.13", "python3.12"]);
});

test("an explicit Python override is honored or fails without silently selecting another", () => {
  const called = [];
  assert.equal(
    supportedPython({ PYTHON: "/chosen/python" }, (command) => {
      called.push(command);
      return { status: 0, stdout: "True\n" };
    }),
    "/chosen/python",
  );
  assert.deepEqual(called, ["/chosen/python"]);
  assert.throws(
    () =>
      supportedPython({ PYTHON: "/old/python" }, () => ({
        status: 0,
        stdout: "False\n",
      })),
    /PYTHON=\/old\/python/,
  );
  assert.throws(
    () => supportedPython({}, () => ({ status: 1, stdout: "" })),
    /Python 3\.11 or newer/,
  );
});
