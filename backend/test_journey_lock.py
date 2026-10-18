"""Scheduled checks report an existing lock as healthy without exposing data."""
import unittest
from datetime import date
from unittest.mock import patch

import test_services  # installs the offline AWS boundary
import journey_lock


class JourneyLockTests(unittest.TestCase):
    def test_existing_lock_still_emits_daily_health_event(self):
        with patch.object(journey_lock, "current_day", return_value=date(2026, 10, 20)), patch.object(journey_lock, "lock", return_value=({"journeyId": "test-id"}, False)), patch.object(journey_lock, "event") as event:
            self.assertFalse(journey_lock.handler({}, None)["created"])
            event.assert_called_once_with("locked", "2026-10-20")

    def test_lock_failure_emits_failed_event_and_propagates(self):
        with patch.object(journey_lock, "current_day", return_value=date(2026, 10, 20)), patch.object(journey_lock, "lock", side_effect=RuntimeError("secret payload")), patch.object(journey_lock, "event") as event:
            with self.assertRaises(RuntimeError):
                journey_lock.handler({}, None)
            event.assert_called_once_with("failed", "2026-10-20")


if __name__ == "__main__":
    unittest.main()
