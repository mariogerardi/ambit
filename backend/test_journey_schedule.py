"""Per-date scheduling, access control, locking and deterministic pool choices."""
import json
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch
from unittest.mock import MagicMock

import offline_aws  # installs the offline AWS boundary
import journey_schedule as schedule
import community
from infrastructure import template
REAL_DATE_ROWS = community.date_rows
SCHEDULE_VECTORS = json.loads((Path(__file__).resolve().parents[1] / "tests/fixtures/journey-schedule-vectors.json").read_text())


class JourneyScheduleTests(unittest.TestCase):
    def setUp(self):
        self.items = {}
        self.addCleanup(patch.stopall)
        patch.object(schedule, "current_day", return_value=date(2026, 10, 20)).start()
        patch.object(community, "get", side_effect=lambda owner, kind: self.items.get(kind)).start()
        patch.object(community, "date_rows", side_effect=lambda owner, first, last: [value for key, value in sorted(self.items.items()) if first <= key <= last]).start()
        patch.object(community, "put", side_effect=lambda owner, kind, value, previous=None: (kind, value, previous)).start()
        patch.object(community, "transact", side_effect=self.transact).start()
        self.journey = sorted(schedule.CATALOG)[0]

    def transact(self, operations):
        for kind, value, previous in operations:
            if self.items.get(kind) != previous:
                raise community.Problem(409, "collision")
            self.items[kind] = value

    def event(self, day="2026-10-20", journey=None, revision=0):
        return {"routeKey": "PATCH /admin/journeys/schedule", "body": json.dumps({"date": day, "journeyId": self.journey if journey is None else journey, "revision": revision})}

    def test_range_read_locks_today_and_routes_remain_private_for_writes(self):
        result = schedule.handle({"routeKey": "GET /journeys/schedule"})
        body = json.loads(result["body"])
        self.assertEqual(body["today"], "2026-10-20")
        self.assertEqual(body["records"]["2026-10-20"]["source"], "auto")
        self.assertEqual(schedule.handle(self.event())["statusCode"], 403)
        routes = {r["Properties"]["RouteKey"]: r["Properties"]["AuthorizationType"] for r in template()["Resources"].values() if r["Type"] == "AWS::ApiGatewayV2::Route"}
        self.assertEqual(routes["GET /journeys/schedule"], "NONE")
        self.assertEqual(routes["GET /admin/journeys/schedule"], "JWT")
        self.assertEqual(routes["PATCH /admin/journeys/schedule"], "JWT")

    def test_admin_can_read_all_history_but_guests_cannot(self):
        self.items["day:2026-10-05"] = {"day": "2026-10-05", "journeyId": self.journey, "source": "auto", "revision": 1, "lockedAt": "cutover"}
        event = {"routeKey": "GET /admin/journeys/schedule"}
        self.assertEqual(schedule.handle(event)["statusCode"], 403)
        result = json.loads(schedule.handle(event, True)["body"])
        self.assertIn("2026-10-05", result["records"])
        self.assertIn("2026-10-20", result["records"])

    def test_pool_selection_is_order_independent_and_shrinks_no_repeat_window(self):
        pool = {f"id-{i}": {"id": f"id-{i}"} for i in range(3)}
        days = [(date(2026, 10, 5).toordinal() + n) for n in range(30)]
        choices = [schedule.choose(date.fromordinal(day).isoformat(), {}, pool) for day in days]
        self.assertEqual(set(choices), set(pool))
        self.assertTrue(all(choices[index] != choices[index + 1] for index in range(len(choices) - 1)))
        self.assertEqual(choices, [schedule.choose(date.fromordinal(day).isoformat(), {}, dict(reversed(list(pool.items())))) for day in days])

    def test_automatic_schedule_covers_every_registered_journey_within_90_days(self):
        memo = {}
        choices = [
            schedule.choose(
                date.fromordinal(date(2027, 1, 1).toordinal() + offset).isoformat(),
                {},
                memo=memo,
            )
            for offset in range(90)
        ]
        self.assertEqual(set(choices), set(schedule.CATALOG))

    def test_expanding_catalog_preserves_locked_and_assigned_choices(self):
        original = {"one": {"id": "one"}}
        expanded = {**original, "two": {"id": "two"}, "three": {"id": "three"}}
        day = "2026-10-20"
        selected = schedule.choose(day, {}, original)
        for source in ("auto", "assigned"):
            records = {day: {"journeyId": selected, "source": source, "lockedAt": "locked"}}
            self.assertEqual(schedule.choose(day, records, expanded), selected)

    def test_shared_frontend_hash_and_selection_vectors_for_fixed_catalogs(self):
        self.assertEqual(schedule.SCHEDULE_VERSION, SCHEDULE_VECTORS['scheduleVersion'])
        self.assertEqual(schedule.FIRST_DAY.isoformat(), SCHEDULE_VECTORS['firstDay'])
        self.assertEqual(schedule.NO_REPEAT_DAYS, SCHEDULE_VECTORS['noRepeatDays'])
        for day, value in SCHEDULE_VECTORS['hashes'].items():
            with self.subTest(day=day, kind='hash'):
                self.assertEqual(schedule.hash_date(day), value)
        for fixture in SCHEDULE_VECTORS['catalogs']:
            catalog = {key: {'id': key} for key in fixture['ids']}
            for day, journey in fixture['selections'].items():
                with self.subTest(day=day, pool=fixture['ids']):
                    self.assertEqual(schedule.choose(day, {}, catalog), journey)
                    self.assertEqual(schedule.choose(day, {}, dict(reversed(list(catalog.items())))), journey)

    def test_missing_historical_and_future_records(self):
        missing = {"2026-10-05": {"journeyId": "removed-id", "source": "auto"}}
        self.assertEqual(schedule.choose("2026-10-05", missing), "removed-id")
        future = "2026-11-03"
        self.assertEqual(schedule.choose(future, {future: {"journeyId": "removed-id", "source": "assigned"}}), schedule.choose(future, {}))
        self.assertIn(schedule.choose("2035-01-01", {}), schedule.CATALOG)

    def test_lock_is_idempotent_and_never_overwrites_assigned(self):
        assigned = {"day": "2026-10-20", "journeyId": self.journey, "source": "assigned", "revision": 1}
        self.items["day:2026-10-20"] = assigned
        first, created = schedule.lock("2026-10-20")
        self.assertTrue(created)
        self.assertEqual(first["journeyId"], self.journey)
        second, created = schedule.lock("2026-10-20")
        self.assertFalse(created)
        self.assertEqual(second, first)

    def test_lock_on_read_race_returns_the_winning_record(self):
        winner = {"day": "2026-10-20", "journeyId": self.journey, "source": "assigned", "revision": 1, "lockedAt": "2026-10-20T00:05:00-04:00"}
        def concurrent_write(operations):
            self.items["day:2026-10-20"] = winner
            raise community.Problem(409, "collision")
        with patch.object(community, "transact", side_effect=concurrent_write):
            self.assertEqual(schedule.lock("2026-10-20"), (winner, False))

    def test_today_can_change_then_clear_to_original_auto_choice_without_confirmation(self):
        automatic, _ = schedule.lock("2026-10-20")
        changed = schedule.handle(self.event(revision=automatic["revision"]), True)
        self.assertEqual(changed["statusCode"], 200)
        record = self.items["day:2026-10-20"]
        self.assertEqual(record["journeyId"], self.journey)
        cleared = schedule.handle({"routeKey": "PATCH /admin/journeys/schedule", "body": json.dumps({"date": "2026-10-20", "journeyId": None, "revision": record["revision"]})}, True)
        self.assertEqual(cleared["statusCode"], 200)
        self.assertEqual(self.items["day:2026-10-20"]["journeyId"], automatic["journeyId"])
        self.assertEqual(len(self.items["day:2026-10-20"]["changes"]), 2)
        self.assertEqual(schedule.handle(self.event(day="2026-10-19"), True)["statusCode"], 409)

    def test_past_rewrite_requires_explicit_flag_and_records_the_change(self):
        past = {"day": "2026-10-19", "journeyId": "mediterranean-v1", "autoJourneyId": "mediterranean-v1", "source": "auto", "revision": 1, "lockedAt": "2026-10-19T00:05:00-04:00"}
        self.items["day:2026-10-19"] = past
        self.assertEqual(schedule.handle(self.event(day="2026-10-19", revision=1), True)["statusCode"], 409)
        event = self.event(day="2026-10-19", revision=1)
        event["body"] = json.dumps({**json.loads(event["body"]), "rewriteHistory": True})
        self.assertEqual(schedule.handle(event, True)["statusCode"], 200)
        changed = self.items["day:2026-10-19"]
        self.assertEqual(changed["journeyId"], self.journey)
        self.assertEqual(changed["lockedAt"], past["lockedAt"])
        self.assertEqual(changed["changes"][0]["from"], "mediterranean-v1")

    def test_future_clear_keeps_revision_and_stale_write_conflicts(self):
        self.assertEqual(schedule.handle(self.event(day="2026-11-01"), True)["statusCode"], 200)
        cleared = {"routeKey": "PATCH /admin/journeys/schedule", "body": json.dumps({"date": "2026-11-01", "journeyId": None, "revision": 1})}
        self.assertEqual(schedule.handle(cleared, True)["statusCode"], 200)
        self.assertEqual(self.items["day:2026-11-01"]["source"], "provisional")
        self.assertEqual(schedule.handle(self.event(day="2026-11-01"), True)["statusCode"], 409)

    def test_invalid_date_and_unknown_id_never_write(self):
        for day, journey in [("2026-02-30", self.journey), ("2026-11-01", "local-pack")]:
            self.assertEqual(schedule.handle(self.event(day=day, journey=journey), True)["statusCode"], 400)
        self.assertEqual(self.items, {})

    def test_date_range_query_follows_pages_without_scanning_other_keys(self):
        table = MagicMock()
        table.query.side_effect = [
            {"Items": [{"dataJson": json.dumps({"day": "2026-10-05"})}], "LastEvaluatedKey": {"pk": "journey-schedule", "sk": "day:2026-10-05"}},
            {"Items": [{"dataJson": json.dumps({"day": "2026-10-06"})}]},
        ]
        with patch.object(community, "table", return_value=table):
            self.assertEqual(REAL_DATE_ROWS("journey-schedule", "day:2026-10-05", "day:2026-10-06"), [{"day": "2026-10-05"}, {"day": "2026-10-06"}])
        self.assertIn("BETWEEN", table.query.call_args.kwargs["KeyConditionExpression"])
        self.assertTrue(table.query.call_args.kwargs["ConsistentRead"])
        self.assertIn("ExclusiveStartKey", table.query.call_args.kwargs)


if __name__ == "__main__":
    unittest.main()
