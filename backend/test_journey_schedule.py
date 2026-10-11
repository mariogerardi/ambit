"""Scheduling validation, access control and concurrent-edit protection."""
import json
import unittest
from unittest.mock import patch

import test_services  # installs the offline AWS boundary
import journey_schedule as schedule
import community
from infrastructure import template


class JourneyScheduleTests(unittest.TestCase):
    def setUp(self):
        self.get = patch.object(community, "get", return_value=None)
        self.get.start()
        self.write = patch.object(community, "transact")
        self.transact = self.write.start()
        self.put = patch.object(community, "put", side_effect=lambda *args: args)
        self.put.start()
        self.addCleanup(patch.stopall)
        self.journey = sorted(schedule.JOURNEYS)[0]

    def event(self, **changes):
        data = {"date": "2026-10-20", "journeyId": self.journey, "revision": 0}
        data.update(changes)
        return {"routeKey": "PATCH /admin/journeys/schedule", "body": json.dumps(data)}

    def test_public_read_and_private_write(self):
        result = schedule.handle({"routeKey": "GET /journeys/schedule"})
        self.assertEqual(json.loads(result["body"]), {"revision": 0, "assignments": {}})
        self.assertEqual(schedule.handle(self.event())["statusCode"], 403)
        self.transact.assert_not_called()
        routes = {r["Properties"]["RouteKey"]: r["Properties"]["AuthorizationType"] for r in template()["Resources"].values() if r["Type"] == "AWS::ApiGatewayV2::Route"}
        self.assertEqual(routes["GET /journeys/schedule"], "NONE")
        self.assertEqual(routes["PATCH /admin/journeys/schedule"], "JWT")

    def test_publish_and_clear_keep_other_dates(self):
        result = schedule.handle(self.event(), True)
        published = json.loads(result["body"])
        self.assertEqual(published, {"revision": 1, "assignments": {"2026-10-20": self.journey}})
        with patch.object(community, "get", return_value=published):
            cleared = schedule.handle(self.event(journeyId=None, revision=1), True)
        self.assertEqual(json.loads(cleared["body"]), {"revision": 2, "assignments": {}})
        self.assertEqual(self.transact.call_args.args[0][0][-1], published)

    def test_invalid_dates_retired_local_ids_and_revision_never_write(self):
        for changes in ({"date": "2026-02-30"}, {"date": "2026-2-20"}, {"journeyId": "long-way-home-v2"}, {"journeyId": "local-pack"}, {"journeyId": []}, {"revision": True}):
            self.assertEqual(schedule.handle(self.event(**changes), True)["statusCode"], 400)
        self.transact.assert_not_called()

    def test_stale_revision_and_transaction_collision_return_conflict(self):
        self.assertEqual(schedule.handle(self.event(revision=1), True)["statusCode"], 409)
        self.transact.assert_not_called()
        self.transact.side_effect = community.Problem(409, "collision")
        self.assertEqual(schedule.handle(self.event(), True)["statusCode"], 409)


if __name__ == "__main__":
    unittest.main()
