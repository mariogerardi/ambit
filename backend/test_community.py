"""Exercise real account handlers with an in-memory transactional Dynamo boundary."""
import copy
import json
import os
import unittest
from unittest.mock import patch

from test_services import ClientError
import community
from infrastructure import template

SETTINGS = {"topics": ["capitals"], "scope": "all", "continent": "AF", "countryIds": [], "styles": {"countries": "map", "capitals": "choices", "flags": "choices"}, "borders": True, "countryNames": False, "capitalMarkers": False, "capitalNames": False, "length": 10, "autoAdvance": True, "choiceCount": 6, "capitalDistractors": "study", "perTopicMethods": False, "revisitMissed": False}


class Database:
    def __init__(self):
        self.items, self.saves = {}, []

    def get_item(self, Key, **kwargs):
        item = self.items.get((Key["pk"], Key["sk"]))
        return {"Item": copy.deepcopy(item)} if item else {}

    def query(self, **kwargs):
        values = kwargs["ExpressionAttributeValues"]
        if kwargs.get("ProjectionExpression"):
            return {"Items": [s for s in self.saves if s["pk"] == values[":owner"]]}
        return {"Items": [copy.deepcopy(v) for (pk, sk), v in sorted(self.items.items(), reverse=True) if pk == values[":owner"] and sk.startswith(values[":prefix"])][:kwargs["Limit"]]}

    def transact_write_items(self, TransactItems):
        pending = copy.deepcopy(self.items)
        for operation in TransactItems:
            kind, data = next(iter(operation.items()))
            native = lambda value: {k: next(iter(v.values())) for k, v in value.items()}
            item = native(data.get("Item", data.get("Key")))
            address = (item["pk"], item["sk"])
            existing = self.items.get(address)
            condition = data.get("ConditionExpression")
            if condition == "attribute_not_exists(pk)" and existing:
                raise ClientError({"Error": {"Code": "TransactionCanceledException"}})
            if condition == "dataJson = :old" and (not existing or existing["dataJson"] != data["ExpressionAttributeValues"][":old"]["S"]):
                raise ClientError({"Error": {"Code": "TransactionCanceledException"}})
            if kind == "Put":
                pending[address] = item
            elif kind == "Delete":
                pending.pop(address, None)
        self.items = pending


class CommunityTests(unittest.TestCase):
    def setUp(self):
        self.db = Database()
        self.env = patch.dict(os.environ, {"COMMUNITY_TABLE": "community", "SAVES_TABLE": "saves", "ALLOWED_ORIGINS": "https://playambit.com"})
        self.env.start()
        self.resource = patch.object(community.boto3, "resource")
        self.resource.start().return_value.Table.return_value = self.db
        self.client = patch.object(community.boto3, "client", return_value=self.db)
        self.client.start()
        self.addCleanup(self.env.stop)
        self.addCleanup(self.resource.stop)
        self.addCleanup(self.client.stop)

    def call(self, route, subject="a", body=None, **params):
        event = {"routeKey": route, "headers": {"origin": "https://playambit.com", "content-type": "application/json"}, "requestContext": {"authorizer": {"jwt": {"claims": {"sub": subject}}}}, "pathParameters": params}
        if body is not None:
            event["body"] = json.dumps(body)
        result = community.handle(event)
        return result["statusCode"], json.loads(result["body"])

    def profile(self, subject, handle, **changes):
        body = {"displayName": handle.title(), "handle": handle, "avatar": "globe", "favoriteRegion": "Oceania", "bio": "Curious", "revision": 0, "presets": [], **changes}
        status, result = self.call("PATCH /account/profile", subject, body)
        self.assertEqual(status, 200, result)
        return result

    def friends(self):
        self.profile("a", "alice")
        self.profile("b", "bob", shareJourneyScores=True)
        self.assertEqual(self.call("POST /account/friends", "a", {"handle": "bob"})[0], 200)
        self.assertEqual(self.call("PATCH /account/friends/{id}", "b", {"action": "accept"}, id="a")[0], 200)

    def challenge(self):
        self.friends()
        status, value = self.call("POST /account/challenges", "a", {"opponent": "b", "title": "Capitals", "settings": SETTINGS})
        self.assertEqual(status, 200, value)
        self.assertEqual(self.call("PATCH /account/challenges/{id}", "b", {"action": "accept"}, id=value["id"])[0], 200)
        return value

    def test_handle_uniqueness_profile_revision_and_private_presets(self):
        value = self.profile("a", "Alice")
        self.assertEqual(value["handle"], "alice")
        self.assertEqual(self.call("PATCH /account/profile", "b", {**value, "revision": 0})[0], 409)
        self.assertEqual(self.call("PATCH /account/profile", "a", {**value, "revision": 0})[0], 409)
        status, changed = self.call("PATCH /account/profile", "a", {**value, "handle": "alice_new", "bio": "Updated"})
        self.assertEqual(status, 200)
        self.assertEqual(changed["revision"], 2)
        self.assertEqual(self.call("GET /account/players/{handle}", "b", handle="alice")[0], 404)
        public = self.call("GET /account/players/{handle}", "b", handle="alice_new")[1]
        self.assertNotIn("presets", public)
        self.assertNotIn("revision", public)
        self.assertNotIn("email", public)
        self.assertIsNone(self.call("GET /account/profile", "b")[1])

    def test_flag_and_preset_avatars_round_trip_and_reject_arbitrary_paths(self):
        value = self.profile("a", "alice", avatar="flag:wurl:CAN")
        self.assertEqual(self.call("GET /account/profile", "a")[1]["avatar"], "flag:wurl:CAN")
        for avatar in ("flag:wurl:FAKE", "https://example.com/tracker.png", "../../secret", {}, None):
            self.assertEqual(self.call("PATCH /account/profile", "a", {**value, "avatar": avatar})[0], 400)
        self.assertEqual(self.call("PATCH /account/profile", "a", {**value, "avatar": "planet"})[0], 200)
        latest = self.call("GET /account/profile", "a")[1]
        self.assertEqual(self.call("PATCH /account/profile", "a", {**latest, "avatar": "avatar-24"})[0], 200)

    def test_friendship_requires_recipient_acceptance_and_block_prevents_recontact(self):
        self.profile("a", "alice")
        self.profile("b", "bob")
        self.assertEqual(self.call("POST /account/friends", "a", {"handle": "bob"})[0], 200)
        self.assertEqual(self.call("PATCH /account/friends/{id}", "a", {"action": "accept"}, id="b")[0], 403)
        self.assertEqual(self.call("GET /account/friends/{id}/journeys", "a", id="b")[0], 403)
        self.assertEqual(self.call("PATCH /account/friends/{id}", "b", {"action": "accept"}, id="a")[0], 200)
        self.assertEqual(self.call("GET /account/friends", "a")[1][0]["status"], "accepted")
        self.assertEqual(self.call("PATCH /account/friends/{id}", "b", {"action": "block"}, id="a")[0], 200)
        self.assertEqual(self.call("POST /account/friends", "a", {"handle": "bob"})[0], 404)
        self.assertEqual(self.call("GET /account/players/{handle}", "a", handle="bob")[0], 404)
        self.assertEqual(self.call("GET /account/friends", "a")[1], [])
        self.assertEqual(self.call("PATCH /account/friends/{id}", "a", {"action": "unblock"}, id="b")[0], 403)
        self.assertEqual(self.call("PATCH /account/friends/{id}", "b", {"action": "unblock"}, id="a")[0], 200)

    def test_only_friends_with_explicit_sharing_expose_completed_totals(self):
        self.friends()
        attempt = {"date": "2026-10-10", "journeyId": "test", "startedAt": 1, "game": {"phase": "finished", "answers": [{"correct": True, "text": "secret answer", "pin": {"lat": 1, "lng": 2}}]}}
        self.db.saves = [{"pk": "user#b", "namespace": "daily", "field": "run.test", "writer": "browser", "clock": 1, "valueJson": json.dumps(attempt)}]
        status, scores = self.call("GET /account/friends/{id}/journeys", "a", id="b")
        self.assertEqual(status, 200)
        self.assertEqual(scores, [{"date": "2026-10-10", "journeyId": "test", "correct": 1, "total": 5}])
        self.assertNotIn("secret", str(scores))
        self.assertEqual(self.call("GET /account/friends/{id}/journeys", "c", id="b")[0], 403)
        b = self.call("GET /account/profile", "b")[1]
        self.call("PATCH /account/profile", "b", {**b, "shareJourneyScores": False})
        self.assertEqual(self.call("GET /account/friends/{id}/journeys", "a", id="b")[0], 403)

    def test_challenge_participation_and_results_use_synced_sessions_not_caller_scores(self):
        challenge = self.challenge()
        identifier = challenge["id"]
        self.assertEqual(self.call("PATCH /account/challenges/{id}", "c", {"action": "result", "correct": 10}, id=identifier)[0], 403)
        self.assertEqual(self.call("PATCH /account/challenges/{id}", "a", {"action": "result", "correct": 10}, id=identifier)[0], 409)
        session = {"phase": "summary", "challengeId": identifier, "settings": SETTINGS, "history": [{"correct": i < 7, "prompt": {"ordinal": i}, "response": "private answer"} for i in range(10)]}
        run_id = "4d63bd93-9ca9-46fd-bb46-e35e6e438577"
        saved = {"pk": "user#a", "namespace": "study", "field": "history." + run_id, "writer": "browser", "clock": 1, "valueJson": json.dumps({"session": {**session, "challengeId": "another-challenge"}})}
        self.db.saves = [saved]
        self.assertEqual(self.call("PATCH /account/challenges/{id}", "a", {"action": "result", "runId": run_id}, id=identifier)[0], 409)
        saved["valueJson"] = json.dumps({"session": session})
        status, result = self.call("PATCH /account/challenges/{id}", "a", {"action": "result", "runId": run_id, "correct": 10}, id=identifier)
        self.assertEqual(status, 200, result)
        self.assertEqual(result["results"]["a"], {"correct": 7, "total": 10})
        self.assertNotIn("private answer", str(result))
        self.assertEqual(self.call("PATCH /account/challenges/{id}", "a", {"action": "result"}, id=identifier)[1]["results"], result["results"])
        self.call("PATCH /account/friends/{id}", "b", {"action": "remove"}, id="a")
        self.assertEqual(self.call("GET /account/challenges", "a")[1], [])

    def test_bad_settings_and_unknown_countries_never_write(self):
        for settings in [{**SETTINGS, "countryIds": ["wurl:XXX"]}, {**SETTINGS, "length": True}, {**SETTINGS, "topics": []}, {**SETTINGS, "styles": {}}, {**SETTINGS, "capitalDistractors": "typo"}]:
            with self.assertRaises(community.Problem):
                community.settings(settings, True)
        self.assertEqual(community.settings({**SETTINGS, "revisitMissed": True}, True)["revisitMissed"], False)

    def test_all_social_routes_are_authorized_and_storage_is_retained(self):
        resources = template()["Resources"]
        for name in ("ReadProfile", "WriteProfile", "FindPlayer", "ReadFriends", "RequestFriend", "UpdateFriend", "FriendJourneys", "ReadChallenges", "CreateChallenge", "UpdateChallenge"):
            properties = resources[name + "Route"]["Properties"]
            self.assertEqual(properties["AuthorizationType"], "JWT")
            self.assertEqual(properties["AuthorizationScopes"], ["openid"])
        self.assertEqual(resources["Community"]["DeletionPolicy"], "Retain")
        self.assertTrue(resources["Community"]["Properties"]["PointInTimeRecoverySpecification"]["PointInTimeRecoveryEnabled"])

    def test_missing_identity_disallowed_origin_and_bad_bodies_never_write(self):
        base = {"routeKey": "PATCH /account/profile", "headers": {"origin": "https://playambit.com", "content-type": "application/json"}, "requestContext": {"authorizer": {"jwt": {"claims": {"sub": "a"}}}}, "body": "{}"}
        for change, status in [({"requestContext": {}}, 401), ({"headers": {"origin": "https://other.test", "content-type": "application/json"}}, 403), ({"headers": {"origin": "https://playambit.com", "content-type": "text/plain"}}, 415), ({"body": "invalid"}, 400), ({"body": "x" * 60001}, 413)]:
            self.assertEqual(community.handle({**base, **change})["statusCode"], status)
        self.assertEqual(self.db.items, {})

    def test_backend_country_ids_match_the_frontend_source(self):
        from pathlib import Path
        roster = json.loads((Path(__file__).resolve().parents[1] / "src/game/data/un-members.v1.json").read_text())
        self.assertEqual(community.COUNTRIES, {r["id"] for r in roster["members"]})


if __name__ == "__main__":
    unittest.main()
