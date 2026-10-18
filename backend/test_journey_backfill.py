"""Historical choices are copied from the old visible rotation."""
import importlib.util
import json
from datetime import date
from pathlib import Path
import unittest

path = Path(__file__).resolve().parents[1] / "scripts/backfill-journey-schedule.py"
spec = importlib.util.spec_from_file_location("journey_backfill", path)
backfill = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backfill)


class BackfillTests(unittest.TestCase):
    def test_follows_old_rotation_and_retains_repeated_explicit_days(self):
        rotation = json.loads((path.parent / "legacy-journey-rotation.json").read_text())
        assignments = {"2026-10-07": "across-the-divide-v1", "2026-10-15": "across-the-divide-v1", "2026-11-01": "across-the-divide-v1"}
        records = backfill.plan(date(2026, 10, 16), assignments, rotation, "2026-10-16T09:00:00-04:00")
        by_day = {record["day"]: record for record in records}
        self.assertEqual(by_day["2026-10-05"]["journeyId"], rotation[0])
        self.assertEqual(by_day["2026-10-06"]["journeyId"], rotation[1])
        self.assertEqual(by_day["2026-10-16"]["journeyId"], rotation[0])
        for day in ("2026-10-07", "2026-10-15", "2026-11-01"):
            self.assertEqual(by_day[day]["journeyId"], "across-the-divide-v1")
            self.assertEqual(by_day[day]["source"], "assigned")
        self.assertEqual(by_day["2026-10-15"]["autoJourneyId"], rotation[10])
        self.assertTrue(by_day["2026-10-16"]["backfilled"])
        self.assertNotIn("lockedAt", by_day["2026-11-01"])


if __name__ == "__main__":
    unittest.main()
