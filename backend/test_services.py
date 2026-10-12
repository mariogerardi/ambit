"""Offline API and admin authorization checks; no AWS credentials required."""
import base64
import contextlib
import io
import json
import os
import sys
import types
import unittest
from unittest.mock import MagicMock, patch


class ClientError(Exception):
    def __init__(self, response, operation="test"):
        self.response = response
        super().__init__(operation)


# Lambda supplies boto3. Offline tests replace only the external AWS boundary.
sys.modules["boto3"] = MagicMock()
sys.modules["boto3.dynamodb"] = types.ModuleType("boto3.dynamodb")
sys.modules["boto3.dynamodb.types"] = MagicMock()
sys.modules["botocore.config"] = MagicMock()
exceptions = types.ModuleType("botocore.exceptions")
exceptions.ClientError = ClientError
sys.modules["botocore"] = types.ModuleType("botocore")
sys.modules["botocore.exceptions"] = exceptions
import handler
import confirmation
from infrastructure import template

IDENTITY = "3917155e-4282-466e-b0e3-5d91b924986b"


class ServicesTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {"ALLOWED_ORIGINS": "https://playambit.com", "RATE_SALT": "test-salt", "ADMIN_EMAIL": "mario.d.gerardi@gmail.com"})
        self.env.start()
        self.db = MagicMock()
        self.db.get_item.return_value = {}
        self.table = patch.object(handler, "table", return_value=self.db)
        self.table.start()

    def tearDown(self):
        self.table.stop()
        self.env.stop()

    def report(self):
        return {"id": IDENTITY, "kind": "question", "category": "answer", "message": "Wrong answer", "context": {"view": "journey", "questionId": "q1", "journeyId": "j1", "contentVersion": "v1", "release": "commit"}}

    def event(self, route="POST /feedback", groups=None):
        return {"routeKey": route, "headers": {"origin": "https://playambit.com", "content-type": "application/json"}, "body": json.dumps(self.report()), "requestContext": {"http": {"sourceIp": "203.0.113.1"}, "authorizer": {"jwt": {"claims": {"sub": "user-1", "cognito:groups": groups or []}}}}}

    def test_guest_report_is_saved_with_context_and_no_raw_ip(self):
        result = handler.submit(self.event())
        self.assertEqual(result["statusCode"], 201)
        item = self.db.put_item.call_args.kwargs["Item"]
        self.assertEqual(item["context"]["questionId"], "q1")
        self.assertNotIn("userId", item)
        self.assertNotIn("203.0.113.1", str(self.db.mock_calls))
        self.assertEqual(item["status"], "new")

    def test_retry_is_idempotent_and_does_not_spend_quota(self):
        self.db.get_item.return_value = {"Item": {"pk": "feedback#" + IDENTITY}}
        self.assertEqual(handler.submit(self.event())["statusCode"], 200)
        self.db.put_item.assert_not_called()
        self.db.update_item.assert_not_called()

    def test_authenticated_report_has_validated_user_identity(self):
        self.assertEqual(handler.submit(self.event(), authenticated=True)["statusCode"], 201)
        self.assertEqual(self.db.put_item.call_args.kwargs["Item"]["userId"], "user-1")

    def test_disallowed_origin_malformed_or_oversized_payload_never_write(self):
        for change, status in [({"headers": {"origin": "https://other.test", "content-type": "application/json"}}, 403), ({"body": "not JSON"}, 400), ({"body": "x" * 12001}, 413)]:
            event = self.event()
            event.update(change)
            self.assertEqual(handler.submit(event)["statusCode"], status)
        self.db.put_item.assert_not_called()

    def test_content_type_and_question_context_are_required(self):
        event = self.event()
        event["headers"]["content-type"] = "text/plain"
        self.assertEqual(handler.submit(event)["statusCode"], 415)
        data = self.report()
        del data["context"]["questionId"]
        with self.assertRaises(ValueError):
            handler.validate(data)
        data = self.report()
        data.update(kind="experience", message=" ")
        with self.assertRaises(ValueError):
            handler.validate(data)

    def test_rate_limit_returns_retryable_message(self):
        self.db.update_item.side_effect = ClientError({"Error": {"Code": "ConditionalCheckFailedException"}})
        self.assertEqual(handler.submit(self.event())["statusCode"], 429)
        self.db.put_item.assert_not_called()

    def test_guest_and_regular_account_cannot_read_or_update_admin_feedback(self):
        for route in ("GET /admin/feedback", "PATCH /admin/feedback/{id}"):
            for groups in ([], ["players"]):
                self.assertEqual(handler.review(self.event(route, groups))["statusCode"], 403)
        self.db.query.assert_not_called()
        self.db.update_item.assert_not_called()

    def test_admin_review_paginates_without_returning_internal_identifiers(self):
        self.db.query.return_value = {"Items": [{"id": IDENTITY, "pk": "private", "queue": "feedback", "expiresAt": 1, "userId": "private-user"}], "LastEvaluatedKey": {"pk": "feedback#" + IDENTITY, "queue": "feedback", "createdAt": "1#" + IDENTITY}}
        result = handler.review(self.event("GET /admin/feedback", ["admin"]))
        body = json.loads(result["body"])
        self.assertEqual(body["items"], [{"id": IDENTITY}])
        event = self.event("GET /admin/feedback", ["admin"])
        event["queryStringParameters"] = {"cursor": body["cursor"]}
        self.assertEqual(handler.review(event)["statusCode"], 200)
        self.assertIn("ExclusiveStartKey", self.db.query.call_args.kwargs)
        event["queryStringParameters"] = {"cursor": base64.urlsafe_b64encode(b'{"queue":"quota"}').decode()}
        self.assertEqual(handler.review(event)["statusCode"], 400)

    def test_admin_update_validates_status_and_missing_reports(self):
        event = self.event("PATCH /admin/feedback/{id}", "[admin]")
        event["pathParameters"] = {"id": IDENTITY}
        event["body"] = '{"status":"resolved"}'
        self.assertEqual(handler.review(event)["statusCode"], 200)
        self.db.update_item.side_effect = ClientError({"Error": {"Code": "ConditionalCheckFailedException"}})
        self.assertEqual(handler.review(event)["statusCode"], 404)
        event["body"] = '{"status":"deleted"}'
        self.assertEqual(handler.review(event)["statusCode"], 400)

    def test_only_verified_owner_signup_grants_admin(self):
        client = MagicMock()
        with patch.object(confirmation.boto3, "client", return_value=client):
            for email, verified, trigger in [("other@example.com", "true", "PostConfirmation_ConfirmSignUp"), ("mario.d.gerardi@gmail.com", "false", "PostConfirmation_ConfirmSignUp"), ("mario.d.gerardi@gmail.com", "true", "PostConfirmation_ConfirmForgotPassword")]:
                event = {"triggerSource": trigger, "request": {"userAttributes": {"email": email, "email_verified": verified}}}
                self.assertIs(confirmation.handler(event, None), event)
            client.admin_add_user_to_group.assert_not_called()
            event = {"triggerSource": "PostConfirmation_ConfirmSignUp", "userPoolId": "pool", "userName": "owner", "request": {"userAttributes": {"email": "Mario.D.Gerardi@gmail.com", "email_verified": "true"}}}
            confirmation.handler(event, None)
            client.admin_add_user_to_group.assert_called_once_with(UserPoolId="pool", Username="owner", GroupName="admin")

    def test_failure_logging_excludes_reports_tokens_and_ip(self):
        self.db.get_item.side_effect = RuntimeError("secret report or token")
        context = types.SimpleNamespace(aws_request_id="request-1")
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            result = handler.handler(self.event(), context)
        self.assertEqual(result["statusCode"], 500)
        for sensitive in ("secret report", "Wrong answer", "203.0.113.1", "user-1"):
            self.assertNotIn(sensitive, output.getvalue())
        self.assertIn('"status": 500', output.getvalue())

    def test_infrastructure_enforces_access_tokens_and_keeps_private_key_out_of_config(self):
        resources = template()["Resources"]
        for route in ("ReviewRoute", "UpdateRoute", "AccountSubmitRoute"):
            self.assertEqual(resources[route]["Properties"]["AuthorizationType"], "JWT")
            self.assertEqual(resources[route]["Properties"]["AuthorizationScopes"], ["openid"])
        self.assertEqual(resources["SubmitRoute"]["Properties"]["AuthorizationType"], "NONE")
        self.assertFalse(resources["Users"]["Properties"]["Schema"][0]["Mutable"])
        variables = resources["ApiFunction"]["Properties"]["Environment"]["Variables"]
        self.assertNotIn("DD_API_KEY", variables)
        self.assertEqual(variables["DD_CAPTURE_LAMBDA_PAYLOAD"], "false")

    def test_production_api_excludes_local_origins_and_uses_more_cpu_without_payload_capture(self):
        resources = template()["Resources"]
        self.assertEqual(resources["Api"]["Properties"]["CorsConfiguration"]["AllowOrigins"], ["https://playambit.com"])
        self.assertEqual(resources["ApiFunction"]["Properties"]["MemorySize"], 1024)
        env = resources["ApiFunction"]["Properties"]["Environment"]["Variables"]
        self.assertEqual(env["DD_TRACE_CLOUD_REQUEST_PAYLOAD_TAGGING"], "")
        self.assertEqual(env["DD_TRACE_CLOUD_RESPONSE_PAYLOAD_TAGGING"], "")
        for route in ("ReviewRoute", "UpdateRoute", "WriteJourneyScheduleRoute"):
            self.assertEqual(resources[route]["Properties"]["AuthorizationType"], "JWT")
        event = self.event("PATCH /admin/journeys/schedule")
        self.assertEqual(handler.handler(event, types.SimpleNamespace(aws_request_id="test"))["statusCode"], 403)
        event = self.event()
        event["headers"]["origin"] = "http://localhost:5173"
        self.assertEqual(handler.submit(event)["statusCode"], 403)

    def test_managed_login_is_branded_before_switching_and_preserves_auth_flow(self):
        import xml.etree.ElementTree as ET
        resources = template()["Resources"]
        self.assertEqual(resources["Users"]["Properties"]["UserPoolTier"], "ESSENTIALS")
        self.assertEqual(resources["LoginDomain"]["Properties"]["ManagedLoginVersion"], 2)
        self.assertEqual(resources["LoginDomain"]["DependsOn"], "LoginBranding")
        self.assertEqual(resources["Client"]["Properties"]["AllowedOAuthFlows"], ["code"])
        self.assertIn("https://playambit.com/auth/callback", resources["Client"]["Properties"]["CallbackURLs"])
        brand = resources["LoginBranding"]["Properties"]
        self.assertLess(len(json.dumps(brand).encode()), 2 * 1024 * 1024)
        background = next(a for a in brand["Assets"] if a["Category"] == "PAGE_BACKGROUND")
        svg = ET.fromstring(base64.b64decode(background["Bytes"]))
        self.assertEqual(svg.find("{http://www.w3.org/2000/svg}rect").get("fill"), "#071321")
        self.assertEqual(svg.find("{http://www.w3.org/2000/svg}svg").get("opacity"), ".18")
        self.assertFalse(any("href" in a for e in svg.iter() for a in e.attrib))


class SaveTests(unittest.TestCase):
    def setUp(self):
        import saves
        self.saves = saves
        self.db = MagicMock()
        self.db.query.return_value = {"Items": []}
        self.boundary = patch.object(saves, "table", return_value=self.db)
        self.boundary.start()
        self.env = patch.dict(os.environ, {"ALLOWED_ORIGINS": "https://playambit.com"})
        self.env.start()

    def tearDown(self):
        self.boundary.stop()
        self.env.stop()

    def event(self, route="POST /account/saves", subject="player-a"):
        return {"routeKey": route, "headers": {"origin": "https://playambit.com", "content-type": "application/json"}, "requestContext": {"authorizer": {"jwt": {"claims": {"sub": subject}}}}, "body": json.dumps({"userId": "player-b", "entries": [{"namespace": "study", "version": 2, "clock": 1, "writer": "device-a", "field": "settings.length", "value": 50}]})}

    def test_jwt_identity_is_the_only_owner_and_revisions_are_conditional(self):
        self.assertEqual(self.saves.handle(self.event())["statusCode"], 200)
        options = self.db.put_item.call_args.kwargs
        self.assertEqual(options["Item"]["pk"], "user#player-a")
        self.assertIn("#clock < :clock", options["ConditionExpression"])
        self.db.put_item.side_effect = ClientError({"Error": {"Code": "ConditionalCheckFailedException"}})
        self.assertEqual(self.saves.handle(self.event())["statusCode"], 200)

    def test_authentication_and_validation_precede_any_write(self):
        self.assertEqual(self.saves.handle(self.event(subject=None))["statusCode"], 401)
        for change in ({"clock": True}, {"clock": -1}, {"clock": 9007199254740992}, {"namespace": "other"}, {"value": float("nan")}, {"value": "x" * 300001}):
            event = self.event()
            body = json.loads(event["body"])
            body["entries"].append({**body["entries"][0], **change})
            event["body"] = json.dumps(body)
            self.assertEqual(self.saves.handle(event)["statusCode"], 400)
        event = self.event()
        body = json.loads(event["body"])
        body["entries"] *= 26
        event["body"] = json.dumps(body)
        self.assertEqual(self.saves.handle(event)["statusCode"], 400)
        self.db.put_item.assert_not_called()

    def test_progress_sync_invalidates_only_the_callers_social_summary(self):
        with patch.dict(os.environ, {"COMMUNITY_TABLE": "community"}), patch.object(self.saves.dynamodb, "Table") as resource:
            event = self.event()
            body = json.loads(event["body"])
            body["entries"][0].update(namespace="daily", field="run.today")
            event["body"] = json.dumps(body)
            self.assertEqual(self.saves.handle(event)["statusCode"], 200)
            resource.assert_called_with("community")
            resource.return_value.delete_item.assert_called_once_with(Key={"pk": "user#player-a", "sk": "activity-v1"})

    def test_paginated_reads_are_private_and_restore_json_types(self):
        item = {"pk": "user#player-a", **self.saves.validate({"namespace": "daily", "version": 2, "clock": 2, "writer": "a", "field": "draft", "value": {"n": 1.25, "b": True}})}
        self.db.query.return_value = {"Items": [item], "LastEvaluatedKey": {"pk": item["pk"], "sk": item["sk"]}}
        page = json.loads(self.saves.handle(self.event("GET /account/saves"))["body"])
        self.assertEqual(page["entries"][0]["value"], {"n": 1.25, "b": True})
        self.assertNotIn("pk", page["entries"][0])
        event = self.event("GET /account/saves", "player-b")
        event["queryStringParameters"] = {"cursor": page["cursor"]}
        self.assertEqual(self.saves.handle(event)["statusCode"], 400)
        self.assertEqual(self.db.query.call_count, 1)
        event = self.event("GET /account/saves")
        event["queryStringParameters"] = {"cursor": page["cursor"]}
        self.assertEqual(self.saves.handle(event)["statusCode"], 200)
        self.assertEqual(self.db.query.call_args.kwargs["ExclusiveStartKey"]["pk"], "user#player-a")

    def test_save_routes_require_jwt_and_trace_headers_are_allowed(self):
        resources = template()["Resources"]
        for name in ("ReadSavesRoute", "WriteSavesRoute"):
            self.assertEqual(resources[name]["Properties"]["AuthorizationType"], "JWT")
        self.assertIn("baggage", resources["Api"]["Properties"]["CorsConfiguration"]["AllowHeaders"])
        self.assertEqual(resources["Saves"]["DeletionPolicy"], "Retain")


if __name__ == "__main__":
    unittest.main()
