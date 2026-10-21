#!/usr/bin/env python3
"""Run selected backend unittests, or the full suite, with a private JUnit report."""

import argparse
from pathlib import Path
import sys
import unittest
from xml.etree.ElementTree import Element, SubElement, ElementTree


def cases(suite):
    for item in suite:
        if isinstance(item, unittest.TestSuite):
            yield from cases(item)
        else:
            yield item


ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "tests", nargs="*",
        help="backend/test_file.py or test_file.TestCase.test_name; omit for the full suite",
    )
    args = parser.parse_args()
    if sys.version_info < (3, 11):
        parser.error("Python 3.11 or newer is required; select a supported interpreter (for example python3.13).")
    sys.path.insert(0, str(BACKEND))
    loader = unittest.TestLoader()
    names = []
    for target in args.tests:
        if target.endswith(".py"):
            path = Path(target).resolve()
            if path.parent != BACKEND or not path.is_file() or not path.name.startswith("test_"):
                parser.error(f"Expected an existing backend/test_*.py file: {target}")
            names.append(path.stem)
        else:
            name = target.removeprefix("backend.")
            module = name.split(".")[0]
            if not module.startswith("test_") or not (BACKEND / f"{module}.py").is_file():
                parser.error(f"Unknown backend test module: {target}")
            names.append(name)
    if names:
        suite = unittest.TestSuite()
        for name in names:
            module = name.split(".")[0]
            error_count = len(loader.errors)
            # Discovery converts all import failures into reportable test errors.
            selected = loader.discover(str(BACKEND), pattern=f"{module}.py")
            if name != module and len(loader.errors) == error_count:
                selected = loader.loadTestsFromName(name)
            suite.addTests(selected)
    else:
        suite = loader.discover(str(BACKEND), pattern="test_*.py")
    tests = list(cases(suite))
    if not tests:
        parser.error("No backend tests selected.")
    result = unittest.TextTestRunner(verbosity=0, buffer=True).run(suite)
    failures = {test.id() for test, _ in result.failures}
    errors = {test.id() for test, _ in result.errors}
    skipped = {test.id() for test, _ in result.skipped}
    report = Element("testsuite", name="backend", tests=str(result.testsRun),
                     failures=str(len(failures)), errors=str(len(errors)), skipped=str(len(skipped)))
    for test in tests:
        case = SubElement(report, "testcase", classname=test.__class__.__name__, name=test._testMethodName)
        for outcome, names in (("failure", failures), ("error", errors), ("skipped", skipped)):
            if test.id() in names:
                SubElement(case, outcome, message=outcome.capitalize())
    path = ROOT / "reports/python.xml"
    path.parent.mkdir(exist_ok=True)
    ElementTree(report).write(path, encoding="utf-8", xml_declaration=True)
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    sys.exit(main())
