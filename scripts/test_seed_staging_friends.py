import importlib.util
import json
import unittest
from unittest.mock import patch
from pathlib import Path

spec = importlib.util.spec_from_file_location("seed", Path(__file__).resolve().parents[1] / "backend/staging_demo.py")
seed = importlib.util.module_from_spec(spec)
spec.loader.exec_module(seed)


class SeedTests(unittest.TestCase):
    def test_refuses_production_resources(self):
        with self.assertRaises(RuntimeError):
            seed.validate_tables([{"LogicalResourceId": "Community", "PhysicalResourceId": "ambit-production-community", "ResourceType": "AWS::DynamoDB::Table"}])

    def test_demo_runs_use_private_registers_and_meaningful_statuses(self):
        journey = {"id": "one", "rounds": [{"id": f"q{i}"} for i in range(5)]}
        statuses = []
        for friend in seed.FRIENDS:
            attempt = seed.build_attempt(friend, journey, "2026-10-14", 123)
            record = seed.save_item("staging-demo-" + friend["slug"], attempt, 123)
            self.assertTrue(record["pk"]["S"].startswith("user#staging-demo-"))
            self.assertEqual(record["writer"]["S"], seed.DEMO_WRITER)
            self.assertEqual(json.loads(record["valueJson"]["S"]), attempt)
            self.assertEqual(sum(answer["correct"] for answer in attempt["game"]["answers"]), friend["correct"])
            statuses.append(attempt["game"]["phase"])
        self.assertEqual(statuses, ["finished", "finished", "finished", "playing", "home"])

    def test_preserves_the_players_started_edition_and_respects_resets(self):
        catalog = {"one": {"id": "one"}, "two": {"id": "two"}}
        attempt = {"date": "2026-10-14", "journeyId": "one", "startedAt": 123, "scheduleVersion": 1, "game": {"answers": []}}
        row = {"namespace": {"S": "daily"}, "field": {"S": "run.2026-10-14/one/id"}, "valueJson": {"S": json.dumps(attempt)}}
        schedule = {"assignments": {"2026-10-14": "two"}}
        self.assertEqual(seed.choose_journey("2026-10-14", catalog, schedule, [row])[0]["id"], "one")
        reset = {"namespace": {"S": "daily"}, "field": {"S": "reset.2026-10-14/one"}, "valueJson": {"S": "123"}}
        self.assertEqual(seed.choose_journey("2026-10-14", catalog, schedule, [row, reset])[0]["id"], "two")

    def test_follows_the_selected_run_when_an_older_edition_is_restored(self):
        catalog = {"one": {"id": "one"}, "two": {"id": "two"}}
        rows = []
        for index, journey in enumerate(catalog):
            value = {"date": "2026-10-14", "journeyId": journey, "runId": journey, "startedAt": index + 1, "game": {"answers": []}}
            rows.append({"namespace": {"S": "daily"}, "field": {"S": "run." + journey}, "valueJson": {"S": json.dumps(value)}})
        rows.append({"namespace": {"S": "daily"}, "field": {"S": "selection.2026-10-14"}, "clock": {"N": "5"}, "writer": {"S": "a"}, "valueJson": {"S": json.dumps({"journeyId": "one", "runId": "one"})}})
        self.assertEqual(seed.choose_journey("2026-10-14", catalog, {}, rows)[0]["id"], "one")

    def test_lambda_refuses_production_before_creating_a_client(self):
        with patch.dict(seed.os.environ, {"APP_ENV": "production", "COMMUNITY_TABLE": "ambit-production-community", "SAVES_TABLE": "ambit-production-saves"}, clear=True):
            with self.assertRaises(RuntimeError):
                seed.handler({}, None)

    def test_lambda_uses_today_and_configured_handle_instead_of_event_parameters(self):
        import sys
        from types import SimpleNamespace
        client = SimpleNamespace()
        env = {"APP_ENV": "staging", "COMMUNITY_TABLE": seed.COMMUNITY, "SAVES_TABLE": seed.SAVES, "DEMO_HANDLE": "mars_staging"}
        with patch.dict(seed.os.environ, env, clear=True), patch.dict(sys.modules, {"boto3": SimpleNamespace(client=lambda name: client)}), patch.object(seed, "seed", return_value={"friends": 5}) as generate:
            self.assertEqual(seed.handler({"date": "2000-01-01", "handle": "another_player", "provision": True}, None), {"friends": 5})
        self.assertEqual(generate.call_args.kwargs, {"handle": "mars_staging"})

    def test_daily_refresh_only_writes_demo_saves_and_keeps_removed_friends_removed(self):
        rows = {}
        rows[("handle#mars_staging", "owner")] = {"id": "real-player"}
        rows[("user#real-player", "profile")] = {"handle": "mars_staging"}
        for friend in seed.FRIENDS:
            subject = "staging-demo-" + friend["slug"]
            rows[("user#" + subject, "profile")] = {"stagingDemo": True}
            if friend["slug"] != "nico":
                rows[("pair#real-player#" + subject, "relation")] = {"status": "accepted"}
        writes = []
        def aws(service, operation, **parameters):
            if operation == "get-item":
                key = parameters["Key"]
                value = rows.get((key["pk"]["S"], key["sk"]["S"]))
                return {"Item": seed.packed("unused", "unused", value)} if value else {}
            if operation == "query":
                return {"Items": []}
            writes.append((operation, parameters))
            return {}
        journey = {"id": "one", "title": "Demo Journey", "rounds": [{"id": f"q{i}"} for i in range(5)]}
        for day in ("2026-10-14", "2026-10-15", "2026-10-15"):
            seed.seed(aws, day=day, catalog={"one": journey}, rotation=["one"])
        runs = [value["Item"] for operation, value in writes if operation == "put-item"]
        self.assertEqual(len(runs), 9)  # Ada, Maya, Owen; Nico removed, Zara unstarted.
        self.assertEqual(len({row["sk"]["S"] for row in runs}), 6)  # Retry overwrites same registers.
        self.assertEqual({json.loads(row["valueJson"]["S"])["date"] for row in runs}, {"2026-10-14", "2026-10-15"})
        for operation, value in writes:
            self.assertIn(operation, ("put-item", "delete-item"))
            key = value.get("Item", value.get("Key"))
            self.assertTrue(key["pk"]["S"].startswith("user#staging-demo-"))
        self.assertFalse(any("nico" in row["pk"]["S"] for row in runs))


if __name__ == "__main__":
    unittest.main()
