"""Exercise real account handlers with an in-memory transactional Dynamo boundary."""
import copy
import json
import os
import unittest
from unittest.mock import patch
from unittest.mock import MagicMock

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

    def put_item(self, Item, **kwargs):
        self.items[(Item["pk"], Item["sk"])] = copy.deepcopy(Item)

    def query(self, **kwargs):
        values = kwargs["ExpressionAttributeValues"]
        if kwargs.get("ProjectionExpression"):
            return {"Items": [s for s in self.saves if s["pk"] == values[":owner"]]}
        return {"Items": [copy.deepcopy(v) for (pk, sk), v in sorted(self.items.items(), reverse=True) if pk == values[":owner"] and sk.startswith(values[":prefix"])][:kwargs["Limit"]]}

    def batch_get_item(self, RequestItems):
        name, request = next(iter(RequestItems.items()))
        items = []
        for address in request["Keys"]:
            item = self.items.get((address["pk"]["S"], address["sk"]["S"]))
            if item:
                items.append(community.encoded(copy.deepcopy(item)))
        return {"Responses": {name: items}}

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
        self.resource = patch.object(community.dynamodb, "Table")
        self.resource.start().return_value = self.db
        self.client = patch.object(community.dynamodb, "client", self.db)
        self.client.start()
        self.addCleanup(self.env.stop)
        self.addCleanup(self.resource.stop)
        self.addCleanup(self.client.stop)

    def call(self, route, subject="a", body=None, query=None, **params):
        event = {"routeKey": route, "headers": {"origin": "https://playambit.com", "content-type": "application/json"}, "requestContext": {"authorizer": {"jwt": {"claims": {"sub": subject}}}}, "pathParameters": params, "queryStringParameters": query}
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

    def test_profile_write_batches_lookups_and_tags_only_counts(self):
        span = MagicMock()
        with patch.object(community, "tracer", MagicMock(current_span=lambda: span)), \
                patch.object(self.db, "batch_get_item", wraps=self.db.batch_get_item) as batch, \
                patch.object(self.db, "get_item", wraps=self.db.get_item) as get:
            self.profile("a", "alice")
            self.assertEqual(batch.call_count, 1)
            get.assert_not_called()
            self.call("GET /account/profile", "a")
        self.assertEqual([call.args for call in span.set_tag.call_args_list], [("profile.presets.count", 0), ("profile.presets.count", 0)])

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

    def daily_record(self, subject, day="2026-10-10", journey="test", phase="finished", writer="browser", correct=3, version=1):
        attempt = {"date": day, "journeyId": journey, "scheduleVersion": version, "startedAt": 1, "game": {"phase": phase, "answers": [{"correct": i < correct, "text": "private answer", "pin": {"lat": 1, "lng": 2}} for i in range(5 if phase == "finished" else 1)]}}
        return {"pk": "user#" + subject, "namespace": "daily", "field": "run." + day + "/" + journey, "writer": writer, "clock": 1, "valueJson": json.dumps(attempt)}

    def test_scores_unlock_only_for_mutual_friends_who_finished_the_same_journey_version(self):
        self.friends()
        self.db.saves = [self.daily_record("b")]
        self.assertEqual(self.call("GET /account/friends/{id}/journeys", "a", id="b"), (200, []))
        status, value = self.call("GET /account/friends/{id}/profile", "a", id="b", query={"date": "2026-10-10"})
        self.assertEqual(status, 200)
        self.assertEqual(value["today"]["status"], "completed")
        self.assertTrue(value["today"]["scoreLocked"])
        self.assertNotIn("score", value["today"])
        self.assertNotIn("correct", json.dumps(value))
        self.db.saves += [self.daily_record("a", journey="different"), self.daily_record("a", version=2, writer="other")]
        self.assertEqual(self.call("GET /account/friends/{id}/journeys", "a", id="b"), (200, []))
        completed = self.daily_record("a", correct=4)
        value = json.loads(completed["valueJson"])
        value["startedAt"] = 2
        completed["valueJson"] = json.dumps(value)
        self.db.saves.append(completed)
        scores = self.call("GET /account/friends/{id}/journeys", "a", id="b")[1]
        self.assertEqual(scores, [{"date": "2026-10-10", "journeyId": "test", "gameId": "journey", "gameVersion": 1, "correct": 3, "total": 5}])
        self.assertNotIn("private", str(scores))
        self.assertEqual(self.call("GET /account/friends/{id}/profile", "c", id="b")[0], 403)
        self.call("PATCH /account/friends/{id}", "b", {"action": "block"}, id="a")
        self.assertEqual(self.call("GET /account/friends/{id}/profile", "a", id="b")[0], 403)

    def test_journey_reset_removes_old_scores_and_allows_a_fresh_run(self):
        self.db.saves = [self.daily_record("a"), self.daily_record("a", writer="stale"), self.daily_record("a", day="2026-10-09")]
        reset = {"pk": "user#a", "namespace": "daily", "field": "reset.2026-10-10/test", "writer": "admin", "clock": 2, "valueJson": "2"}
        self.db.saves.append(reset)
        summary = community.progress_summary("a", fresh=True)
        self.assertEqual([a["date"] for a in summary["activity"]], ["2026-10-09"])
        replay = self.daily_record("a", phase="playing", writer="fresh")
        attempt = json.loads(replay["valueJson"])
        attempt["startedAt"] = 3
        replay["valueJson"] = json.dumps(attempt)
        self.db.saves.append(replay)
        summary = community.progress_summary("a", fresh=True)
        current = next(a for a in summary["activity"] if a["date"] == "2026-10-10")
        self.assertEqual(current["status"], "in_progress")
        self.assertIsNone(current["correct"])

    def test_help_is_aggregated_monotonically_without_disclosing_clues_or_bypassing_score_lock(self):
        self.friends()
        record = self.daily_record("b")
        attempt = json.loads(record["valueJson"])
        attempt["runId"] = "same-run"
        for i, answer in enumerate(attempt["game"]["answers"]):
            answer["roundId"] = "private-round-" + str(i)
        attempt["game"]["help"] = {"private-round-0": "assisted", "private-round-1": "hinted", "not-answered": "assisted"}
        record["valueJson"] = json.dumps(attempt)
        stale = {**record, "writer": "stale"}
        old = json.loads(record["valueJson"])
        old["game"]["help"] = {"private-round-0": "hinted"}
        stale["valueJson"] = json.dumps(old)
        self.db.saves = [record, stale]
        locked = self.call("GET /account/friends/{id}/profile", "a", id="b", query={"date": "2026-10-10"})[1]
        self.assertNotIn("score", locked["today"])
        self.assertNotIn("help", json.dumps(locked))
        self.db.saves.append(self.daily_record("a"))
        scores = self.call("GET /account/friends/{id}/journeys", "a", id="b")[1]
        self.assertEqual(scores[0]["help"], {"hints": 2, "assists": 1, "status": "assisted"})
        self.assertEqual(scores[0]["correct"], 3)
        self.assertNotIn("private", json.dumps(scores))
        self.assertNotIn("not-answered", json.dumps(scores))
        # Replays are distinct attempts; assistance from the old run must not carry over.
        replay = self.daily_record("b", writer="replay")
        new = json.loads(replay["valueJson"])
        new.update({"runId": "new-run", "startedAt": 2})
        replay["valueJson"] = json.dumps(new)
        self.db.saves.append(replay)
        self.db.items.pop(("user#b", "activity-v1"), None)
        fresh_scores = self.call("GET /account/friends/{id}/journeys", "a", id="b")[1]
        self.assertNotIn("help", fresh_scores[0])

    def test_handle_availability_is_case_insensitive_and_suggests_unclaimed_alternatives(self):
        value = self.profile("a", "Alice")
        own = self.call("GET /account/handles/{handle}", "a", handle="ALICE")[1]
        self.assertTrue(own["available"])
        other = self.call("GET /account/handles/{handle}", "b", handle="Alice")[1]
        self.assertFalse(other["available"])
        self.assertEqual(len(other["suggestions"]), 3)
        self.assertEqual(self.call("GET /account/handles/{handle}", "b", handle="!!")[0], 400)
        status, error = self.call("PATCH /account/profile", "b", {**value, "revision": 0})
        self.assertEqual(status, 409)
        self.assertEqual(error["field"], "handle")
        self.assertEqual(error["suggestions"], other["suggestions"])

    def test_atomic_reservation_prevents_a_collision_even_when_both_preflight_checks_pass(self):
        with patch.object(community, "handle_availability", return_value={"available": True}):
            first = self.profile("a", "Shared")
            status, _ = self.call("PATCH /account/profile", "b", {**first, "handle": "SHARED", "revision": 0})
        self.assertEqual(status, 409)
        self.assertIsNone(community.get("user#b", "profile"))
        self.assertEqual(community.get("handle#shared", "owner"), {"id": "a"})

    def test_handle_changes_keep_friendships_and_results_on_the_account_id(self):
        self.friends()
        before = self.call("GET /account/profile", "b")[1]
        self.assertEqual(self.call("PATCH /account/profile", "b", {**before, "handle": "bob_new"})[0], 200)
        self.assertEqual(self.call("GET /account/friends", "a")[1][0]["player"]["handle"], "bob_new")
        self.assertEqual(self.call("GET /account/players/{handle}", "a", handle="bob")[0], 404)
        self.assertEqual(community.require_friend("a", "b")["status"], "accepted")

    def test_activity_has_statuses_deduplicated_stats_and_no_private_answers(self):
        self.friends()
        self.db.saves = [self.daily_record("b"), self.daily_record("b", writer="second"), self.daily_record("b", day="2026-10-09"), self.daily_record("a", phase="playing")]
        study = {"session": {"phase": "summary", "settings": SETTINGS, "history": [{"correct": i < 7, "response": "secret", "prompt": {"ordinal": i}} for i in range(10)]}}
        self.db.saves.extend({"pk": "user#b", "namespace": "study", "field": "history.run-one", "writer": writer, "clock": 1, "valueJson": json.dumps(study)} for writer in ("one", "two"))
        self.db.saves.append({"pk": "user#b", "namespace": "study", "field": "session.run-one", "writer": "one", "clock": 1, "valueJson": json.dumps(study["session"])})
        status, page = self.call("GET /account/friends/activity", "a", query={"date": "2026-10-10"})
        self.assertEqual(status, 200)
        self.assertEqual(page["you"]["today"]["status"], "in_progress")
        stats = page["friends"][0]["stats"]
        self.assertEqual(stats, {"journeyStreak": 2, "journeysCompleted": 2, "studySessions": 1, "studyQuestions": 10, "studyAccuracy": 70})
        self.assertNotIn("secret", json.dumps(page))
        self.assertNotIn("private answer", json.dumps(page))
        self.assertNotIn("email", json.dumps(page))
        self.assertEqual(self.call("GET /account/friends/activity", "a", query={"date": "2026-02-30"})[0], 400)

    def test_friend_activity_pages_are_bounded_and_include_only_accepted_relationships(self):
        self.profile("a", "alice")
        for index in range(26):
            other = f"friend{index:02d}"
            self.profile(other, other)
            community.friend_action("a", other, "request")
            community.friend_action(other, "a", "accept")
        self.profile("pending", "pending")
        community.friend_action("a", "pending", "request")
        first = self.call("GET /account/friends/activity", "a", query={"date": "2026-10-10"})[1]
        second = self.call("GET /account/friends/activity", "a", query={"date": "2026-10-10", "cursor": first["cursor"]})[1]
        self.assertEqual(len(first["friends"]), 24)
        self.assertEqual(len(second["friends"]), 2)
        self.assertNotIn("cursor", second)
        self.assertEqual(len({entry["player"]["id"] for entry in first["friends"] + second["friends"]}), 26)

    def test_activity_batches_lookups_and_rechecks_a_concurrent_block(self):
        self.friends()
        self.db.saves = [self.daily_record("a"), self.daily_record("b")]
        with patch.object(self.db, "batch_get_item", wraps=self.db.batch_get_item) as batch, patch.object(self.db, "get_item", wraps=self.db.get_item) as get, patch.object(self.db, "put_item", wraps=self.db.put_item) as put:
            status, page = self.call("GET /account/friends/activity", query={"date": "2026-10-10"})
            self.assertEqual(status, 200)
            self.assertEqual(len(page["friends"]), 1)
            self.assertEqual(batch.call_count, 2)
            get.assert_not_called()
            self.assertEqual(put.call_count, 1)  # Friend cache only; fresh viewer has no cache write.
            def read_then_block(subject):
                records = original(subject)
                if subject == "a":
                    self.db.items[(community.pair("a", "b"), "relation")] = community.packed(community.pair("a", "b"), "relation", {"status": "blocked", "blockedBy": "b"})
                return records
            original = community.saved_records
            with patch.object(community, "saved_records", side_effect=read_then_block):
                status, page = self.call("GET /account/friends/activity", query={"date": "2026-10-10"})
            self.assertEqual(status, 200)
            self.assertEqual(page["friends"], [])

    def test_activity_tags_friend_counts_without_identifiers(self):
        self.friends()
        span = MagicMock()
        with patch.object(community, "tracer", MagicMock(current_span=lambda: span)):
            status, page = self.call("GET /account/friends/activity", query={"date": "2026-10-10"})
        self.assertEqual(status, 200)
        self.assertEqual(len(page["friends"]), 1)
        self.assertEqual({call.args for call in span.set_tag.call_args_list}, {("friends.count", 1), ("friends.page_count", 1)})

    def test_partial_batches_retry_unprocessed_keys_and_fail_instead_of_omitting_friends(self):
        pending = {"community": {"Keys": [community.encoded(community.key("user#b", "profile"))], "ConsistentRead": True}}
        item = community.encoded(community.packed("user#b", "profile", {"handle": "bob"}))
        with patch.object(community.dynamodb.client, "batch_get_item", side_effect=[{"UnprocessedKeys": pending}, {"Responses": {"community": [item]}}]) as batch, patch.object(community.time, "sleep"):
            self.assertEqual(community.batch_get([("user#b", "profile")]), {("user#b", "profile"): {"handle": "bob"}})
            self.assertEqual(batch.call_args.kwargs["RequestItems"], pending)
        with patch.object(community.dynamodb.client, "batch_get_item", return_value={"UnprocessedKeys": pending}), patch.object(community.time, "sleep"), self.assertRaises(community.Problem) as raised:
            community.batch_get([("user#b", "profile")])
        self.assertEqual(raised.exception.status, 503)
        self.assertIn("account data", raised.exception.message)

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
        for name in ("ReadProfile", "WriteProfile", "HandleAvailability", "FriendActivity", "FriendProfile", "FindPlayer", "ReadFriends", "RequestFriend", "UpdateFriend", "FriendJourneys", "ReadChallenges", "CreateChallenge", "UpdateChallenge"):
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
