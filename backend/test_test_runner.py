"""Exercise CLI selection and failure reporting without loading real backend tests."""
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from xml.etree import ElementTree


class RunnerTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name)
        (self.root / "scripts").mkdir()
        (self.root / "backend").mkdir()
        shutil.copyfile(Path(__file__).resolve().parents[1] / "scripts/run-python-tests.py",
                        self.root / "scripts/run-python-tests.py")
        (self.root / "backend/test_selected.py").write_text(
            'import unittest\nclass Selected(unittest.TestCase):\n'
            '    def test_first(self): print("successful payload")\n'
            '    def test_second(self): pass\n')
        (self.root / "backend/test_other.py").write_text(
            'import unittest\nclass Other(unittest.TestCase):\n'
            '    def test_other(self): pass\n')

    def run_cli(self, *args):
        return subprocess.run([sys.executable, "scripts/run-python-tests.py", *args],
                              cwd=self.root, capture_output=True, text=True)

    def report(self):
        return ElementTree.parse(self.root / "reports/python.xml").getroot()

    def test_file_selection_excludes_unrelated_modules_and_buffers_success(self):
        result = self.run_cli("backend/test_selected.py")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.report().get("tests"), "2")
        self.assertNotIn("successful payload", result.stdout + result.stderr)

    def test_dotted_method_selection_runs_only_that_method(self):
        result = self.run_cli("backend.test_selected.Selected.test_second")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.report().get("tests"), "1")
        self.assertEqual(self.report().find("testcase").get("name"), "test_second")

    def test_no_arguments_preserves_full_ci_discovery(self):
        result = self.run_cli()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.report().get("tests"), "3")

    def test_unknown_and_empty_selections_fail_instead_of_succeeding_without_tests(self):
        (self.root / "backend/test_empty.py").write_text("")
        for target in ("backend/test_missing.py", "test_missing", "scripts/run-python-tests.py", "test_empty"):
            with self.subTest(target=target):
                result = self.run_cli(target)
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse((self.root / "reports/python.xml").exists())

    def test_failed_tests_and_imports_preserve_diagnostics_and_private_report(self):
        (self.root / "backend/test_failure.py").write_text(
            'import unittest\nclass Failure(unittest.TestCase):\n'
            '    def test_failure(self): self.fail("failure detail")\n')
        (self.root / "backend/test_broken.py").write_text('raise RuntimeError("import detail")\n')
        for target, count, detail in (("test_failure", "failures", "failure detail"),
                                     ("test_broken", "errors", "import detail")):
            with self.subTest(target=target):
                result = self.run_cli(target)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(detail, result.stderr)
                self.assertEqual(self.report().get(count), "1")
                self.assertNotIn(detail, ElementTree.tostring(self.report(), encoding="unicode"))
