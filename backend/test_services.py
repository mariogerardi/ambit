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


if __name__ == "__main__":
    unittest.main()
