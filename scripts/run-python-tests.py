#!/usr/bin/env python3
"""Run backend unittests and write a minimal JUnit report without test payloads."""

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


def main():
    suite = unittest.defaultTestLoader.discover("backend", pattern="test_*.py")
    tests = list(cases(suite))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
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
    path = Path("reports/python.xml")
    path.parent.mkdir(exist_ok=True)
    ElementTree(report).write(path, encoding="utf-8", xml_declaration=True)
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    sys.exit(main())
