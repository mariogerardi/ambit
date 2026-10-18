"""Environment isolation and nonblocking setup, without contacting AWS."""
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from infrastructure import template

spec = importlib.util.spec_from_file_location("deploy_backend", Path(__file__).resolve().parents[1] / "scripts" / "deploy-backend.py")
deploy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)

production_spec = importlib.util.spec_from_file_location("deploy_production", Path(__file__).resolve().parents[1] / "scripts" / "deploy-production.py")
production = importlib.util.module_from_spec(production_spec)
production_spec.loader.exec_module(production)

OUTPUTS = {"ApiUrl": "https://staging.example.com", "Authority": "https://cognito.example.com/staging", "ClientId": "staging-client", "LoginUrl": "https://staging-login.example.com"}


class DeploymentTests(unittest.TestCase):
    def test_frontend_no_wait_uploads_and_starts_without_polling_or_verification(self):
        commit = "a" * 40
        commands = []
        def aws(command, **options):
            commands.append(command)
            result = {"jobId": "42", "zipUploadUrl": "https://upload.invalid/artifact"} if command[2] == "create-deployment" else {}
            return type("Result", (), {"returncode": 0, "stdout": json.dumps(result)})()
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            (directory / "index.html").write_text('<div id="root"></div>')
            (directory / "NOTICE.txt").write_text("Source notices")
            (directory / "release.json").write_text(json.dumps({"commit": commit}))
            response = type("Response", (), {"status": 200})()
            with patch.object(sys, "argv", ["deploy-production.py", "--directory", str(directory), "--expected-commit", commit, "--no-wait"]), patch.object(production.subprocess, "run", side_effect=aws), patch.object(production.urllib.request, "urlopen") as upload, patch.object(production.time, "sleep") as sleep, patch.object(sys, "stdout", new_callable=io.StringIO) as output:
                upload.return_value.__enter__.return_value = response
                production.main()
                self.assertEqual([command[2] for command in commands], ["create-deployment", "start-deployment"])
                self.assertEqual(upload.call_count, 1)
                self.assertEqual(upload.call_args.args[0].method, "PUT")
                sleep.assert_not_called()
                self.assertIn("completion has not been verified", output.getvalue())
                self.assertIn("/deployments/42", output.getvalue())

    def test_staging_has_separate_data_identity_monitoring_and_local_origins(self):
        production, staging = template()["Resources"], template("staging")["Resources"]
        for logical, field in (("Feedback", "TableName"), ("Saves", "TableName"), ("Community", "TableName"), ("Users", "UserPoolName"), ("ApiFunction", "FunctionName"), ("Confirmation", "FunctionName"), ("JourneyLockFunction", "FunctionName"), ("JourneyLockLogs", "LogGroupName"), ("AccessLogs", "LogGroupName"), ("ApiLogs", "LogGroupName"), ("ConfirmationLogs", "LogGroupName")):
            self.assertIn("ambit-staging", staging[logical]["Properties"][field])
            self.assertIn("ambit-production", production[logical]["Properties"][field])
        self.assertEqual(production["LoginDomain"]["Properties"]["Domain"], {"Fn::Sub": "ambit-${AWS::AccountId}"})
        self.assertEqual(staging["LoginDomain"]["Properties"]["Domain"], {"Fn::Sub": "ambit-staging-${AWS::AccountId}"})
        origins = staging["Api"]["Properties"]["CorsConfiguration"]["AllowOrigins"]
        self.assertEqual(set(origins), {"http://localhost:5173", "http://127.0.0.1:5173"})
        env = staging["ApiFunction"]["Properties"]["Environment"]["Variables"]
        self.assertEqual(env["ALLOWED_ORIGINS"], ",".join(origins))
        self.assertEqual(env["DD_ENV"], "staging")
        self.assertEqual(env["APP_ENV"], "staging")
        for logical in ("Authorizer", "ApiRole", "ConfirmationPolicy"):
            self.assertEqual(staging[logical]["Properties"], production[logical]["Properties"])
        with self.assertRaises(ValueError):
            template("typo")

    def test_daily_demo_schedule_and_write_permissions_are_staging_only(self):
        production, staging = template()["Resources"], template("staging")["Resources"]
        self.assertFalse(any(key.startswith("Demo") for key in production))
        schedule = staging["DemoSchedule"]["Properties"]
        self.assertEqual(schedule["ScheduleExpression"], "cron(1 0 * * ? *)")
        self.assertEqual(schedule["ScheduleExpressionTimezone"], "America/New_York")
        self.assertEqual(schedule["Target"]["Arn"], {"Fn::GetAtt": ["DemoFunction", "Arn"]})
        statements = staging["DemoRole"]["Properties"]["Policies"][0]["PolicyDocument"]["Statement"]
        self.assertIn({"Effect": "Allow", "Action": ["dynamodb:GetItem", "dynamodb:Query"], "Resource": {"Fn::GetAtt": ["Community", "Arn"]}}, statements)
        writes = [value for value in statements if value.get("Action") in ("dynamodb:PutItem", "dynamodb:DeleteItem")]
        self.assertEqual(len(writes), 2)
        for value in writes:
            self.assertEqual(value["Condition"]["ForAllValues:StringLike"]["dynamodb:LeadingKeys"], ["user#staging-demo-*"])

    def test_daily_lock_is_scheduled_in_new_york_for_both_environments(self):
        for environment in ("production", "staging"):
            resources = template(environment)["Resources"]
            schedule = resources["JourneyLockSchedule"]["Properties"]
            self.assertEqual(schedule["ScheduleExpression"], "cron(5 0 * * ? *)")
            self.assertEqual(schedule["ScheduleExpressionTimezone"], "America/New_York")
            self.assertEqual(schedule["Target"]["Arn"], {"Fn::GetAtt": ["JourneyLockFunction", "Arn"]})
            role = resources["JourneyLockRole"]["Properties"]["Policies"][0]["PolicyDocument"]["Statement"]
            self.assertIn({"Effect": "Allow", "Action": ["dynamodb:GetItem", "dynamodb:Query", "dynamodb:PutItem"], "Resource": {"Fn::GetAtt": ["Community", "Arn"]}}, role)

    def test_all_lambdas_share_conditional_datadog_layers_and_secret_access(self):
        for environment in ("production", "staging"):
            resources = template(environment)["Resources"]
            functions = {"ApiFunction": "handler.handler", "Confirmation": "confirmation.handler", "JourneyLockFunction": "journey_lock.handler"}
            if environment == "staging":
                functions["DemoFunction"] = "staging_demo.handler"
            for logical, original_handler in functions.items():
                props = resources[logical]["Properties"]
                self.assertEqual(props["Handler"]["Fn::If"], ["UseDatadog", "datadog_lambda.handler.handler", original_handler])
                self.assertEqual(props["Layers"], resources["ApiFunction"]["Properties"]["Layers"])
                variables = props["Environment"]["Variables"]
                self.assertEqual(variables["DD_LAMBDA_HANDLER"], original_handler)
                self.assertEqual(variables["DD_ENV"], environment)
                self.assertEqual(variables["DD_SERVICE"], "ambit-api")
                self.assertEqual(variables["DD_VERSION"], {"Ref": "Release"})
                self.assertEqual(variables["DD_SITE"], {"Ref": "DatadogSite"})
                self.assertEqual(variables["DD_API_KEY_SECRET_ARN"], {"Ref": "DatadogSecretArn"})
            for role in ("ApiRole", "ConfirmationPolicy", "JourneyLockRole", "DemoRole") if environment == "staging" else ("ApiRole", "ConfirmationPolicy", "JourneyLockRole"):
                props = resources[role]["Properties"]
                statements = (props["Policies"][0] if role != "ConfirmationPolicy" else props)["PolicyDocument"]["Statement"]
                self.assertIn({"Fn::If": ["UseDatadog", {"Effect": "Allow", "Action": "secretsmanager:GetSecretValue", "Resource": {"Ref": "DatadogSecretArn"}}, {"Ref": "AWS::NoValue"}]}, statements)

    def test_staging_export_preserves_production_and_unrelated_local_settings(self):
        with tempfile.TemporaryDirectory() as temporary, patch.object(deploy, "ROOT", Path(temporary)):
            root = Path(temporary)
            (root / "deployment").mkdir()
            production = root / "deployment/services.json"
            production.write_text('{"apiUrl":"production"}\n')
            local = root / ".env.development.local"
            local.write_text('# existing settings\nVITE_DATADOG_ENABLED=true\nexport VITE_API_URL=old\nVITE_AUTH_CLIENT_ID=old\n')
            for _ in range(2):
                deploy.write_client_configuration(OUTPUTS, "staging", True)
            self.assertEqual(production.read_text(), '{"apiUrl":"production"}\n')
            config = json.loads((root / "deployment/services.staging.json").read_text())
            self.assertEqual(config["auth"]["clientId"], "staging-client")
            self.assertIn('# existing settings\nVITE_DATADOG_ENABLED=true\n', local.read_text())
            self.assertEqual(local.read_text().count("VITE_API_URL="), 1)
            self.assertIn('VITE_DATADOG_ENV="staging"', local.read_text())
            self.assertFalse((root / ".env.local").exists())

    def test_refresh_only_reads_the_selected_stack_and_writes_its_configuration(self):
        commands = []
        def aws(command, **options):
            commands.append(command)
            return type("Result", (), {"returncode": 0, "stdout": json.dumps({"Stacks": [{"StackStatus": "CREATE_COMPLETE", "Outputs": [{"OutputKey": k, "OutputValue": v} for k, v in OUTPUTS.items()]}]})})()
        with patch.object(sys, "argv", ["deploy-backend.py", "--environment", "staging", "--refresh-config", "--write-dev-env"]), patch.object(deploy.subprocess, "run", side_effect=aws), patch.object(deploy, "write_client_configuration") as write, patch.object(deploy, "send_deploy_event") as event:
            deploy.main()
        event.assert_not_called()
        self.assertEqual(len(commands), 1)
        self.assertIn("ambit-staging-services", commands[0])
        self.assertIn("describe-stacks", commands[0])
        write.assert_called_once_with(OUTPUTS, "staging", True)

    def test_first_deployment_supports_no_wait_and_never_writes_production_settings(self):
        commands = []
        def aws(command, **options):
            commands.append(command)
            if "describe-stacks" in command:
                return type("Result", (), {"returncode": 1, "stderr": "Stack does not exist"})()
            result = {"Account": "123"} if "get-caller-identity" in command else {}
            return type("Result", (), {"returncode": 0, "stdout": json.dumps(result)})()
        with patch.object(sys, "argv", ["deploy-backend.py", "--environment", "staging", "--no-wait", "--write-dev-env"]), patch.object(deploy.subprocess, "run", side_effect=aws), patch.object(deploy, "write_client_configuration") as write, patch.object(deploy, "datadog_api_key", return_value=""):
            deploy.main()
        create = next(command for command in commands if "create-stack" in command)
        self.assertIn("ambit-staging-services", create)
        self.assertFalse(any("wait" in command for command in commands))
        write.assert_not_called()


class BackendDeployTests(unittest.TestCase):
    def setUp(self):
        self.commands = []
        self.stack_exists = False
        self.failures = {}
        self.failed_upload = None
        self.api_key = "a" * 32
        self.enterContext(patch.dict(deploy.os.environ, {"AWS_RETRY_MODE": "legacy", "AWS_MAX_ATTEMPTS": "1", "AWS_PROFILE": "inherited"}, clear=True))
        self.lookup = self.enterContext(patch.object(deploy, "datadog_api_key", return_value=self.api_key))
        self.http = self.enterContext(patch.object(deploy.urllib.request, "urlopen"))
        self.write = self.enterContext(patch.object(deploy, "write_client_configuration", return_value="deployment/services.staging.json"))
        self.enterContext(patch.object(deploy.subprocess, "run", side_effect=self.aws))
        self.template = self.enterContext(patch.object(deploy, "template", return_value={"artwork": "x" * 51201}))
        self.output = self.enterContext(patch.object(sys, "stdout", new_callable=io.StringIO))
        self.errors = self.enterContext(patch.object(sys, "stderr", new_callable=io.StringIO))

    def aws(self, command, **options):
        self.commands.append((command, options))
        operation = tuple(command[1:3])
        error = self.failures.get(operation)
        if operation == ("s3", "cp") and Path(command[3]).name == self.failed_upload:
            error = "An error occurred (RequestTimeout): socket timed out"
        if operation == ("cloudformation", "describe-stacks") and not self.stack_exists:
            error = "Stack does not exist"
        if error:
            return SimpleNamespace(returncode=1, stdout="", stderr=error)
        result = {}
        if operation == ("sts", "get-caller-identity"):
            result = {"Account": "123"}
        elif operation == ("cloudformation", "describe-stacks"):
            result = {"Stacks": [{"Outputs": [{"OutputKey": k, "OutputValue": v} for k, v in OUTPUTS.items()]}]}
        elif operation in (("cloudformation", "create-stack"), ("cloudformation", "update-stack")):
            self.stack_exists = True
        elif operation == ("secretsmanager", "describe-secret"):
            result = {"ARN": "arn:aws:secretsmanager:us-east-1:123:secret:datadog"}
        elif operation == ("secretsmanager", "put-secret-value"):
            secret = Path(command[command.index("--secret-string") + 1].removeprefix("file://"))
            self.assertEqual(secret.read_text(), self.api_key)
            self.assertEqual(secret.stat().st_mode & 0o777, 0o600)
        return SimpleNamespace(returncode=0, stdout=json.dumps(result), stderr="")

    def run_deploy(self, *flags):
        with patch.object(sys, "argv", ["deploy-backend.py", "--environment", "staging", *flags]):
            deploy.main()

    def event(self):
        self.http.assert_called_once()
        return json.loads(self.http.call_args.args[0].data)

    def test_both_uploads_use_adaptive_retries_and_completed_deploy_emits_success(self):
        self.run_deploy("--profile", "work", "--write-dev-env", "--datadog-site", "datadoghq.eu")
        uploads = [(command, options) for command, options in self.commands if command[1:3] == ["s3", "cp"]]
        self.assertEqual([Path(command[3]).name for command, _ in uploads], ["backend.zip", "template.json"])
        for command, options in uploads:
            self.assertIn("--only-show-errors", command)
            self.assertIn("--no-progress", command)
            self.assertEqual(command[command.index("--profile") + 1], "work")
            self.assertEqual(options["env"]["AWS_RETRY_MODE"], "adaptive")
            self.assertEqual(options["env"]["AWS_MAX_ATTEMPTS"], "5")
            self.assertEqual(options["env"]["AWS_PROFILE"], "inherited")
        self.assertEqual(deploy.os.environ["AWS_RETRY_MODE"], "legacy")
        self.assertTrue(all(options["env"] is None for command, options in self.commands if command[1] != "s3"))
        self.assertTrue(any(command[1:3] == ["cloudformation", "wait"] for command, _ in self.commands))
        self.write.assert_called_once_with(OUTPUTS, "staging", True)
        event = self.event()
        self.assertEqual(event["alert_type"], "success")
        self.assertTrue({"project:ambit", "service:ambit-api", "env:staging", "environment:staging", "status:succeeded"}.issubset(event["tags"]))
        self.assertIn("Release:", event["text"])
        request = self.http.call_args.args[0]
        self.assertEqual(request.full_url, "https://api.datadoghq.eu/api/v1/events")
        self.assertEqual(request.get_header("Dd-api-key"), self.api_key)

    def test_upload_failures_name_the_key_and_emit_error_before_cloudformation(self):
        for source in ("backend.zip", "template.json"):
            with self.subTest(source=source):
                self.commands.clear()
                self.http.reset_mock()
                self.failed_upload = source
                with self.assertRaises(RuntimeError) as raised:
                    self.run_deploy()
                destination = self.commands[-1][0][4]
                self.assertIn(destination, str(raised.exception))
                self.assertIn("RequestTimeout", str(raised.exception))
                self.assertFalse(any(command[2] in ("validate-template", "create-stack", "update-stack", "wait") for command, _ in self.commands))
                self.write.assert_not_called()
                event = self.event()
                self.assertEqual(event["alert_type"], "error")
                self.assertIn(destination, event["text"])
                self.assertIn("RequestTimeout", event["text"])
                self.assertIn("status:failed", event["tags"])

    def test_failure_before_uploads_is_reported(self):
        self.failures[("sts", "get-caller-identity")] = "ExpiredToken"
        with self.assertRaisesRegex(RuntimeError, "ExpiredToken"):
            self.run_deploy()
        self.assertIn("ExpiredToken", self.event()["text"])

    def test_cloudformation_failure_is_reported(self):
        self.failures[("cloudformation", "wait")] = "Waiter failed: UPDATE_ROLLBACK_COMPLETE"
        with self.assertRaisesRegex(RuntimeError, "UPDATE_ROLLBACK_COMPLETE"):
            self.run_deploy()
        self.assertEqual(self.event()["alert_type"], "error")
        self.write.assert_not_called()

    def test_no_wait_emits_started_without_claiming_completion(self):
        self.stack_exists = True
        self.run_deploy("--no-wait")
        self.assertTrue(any(command[2] == "update-stack" for command, _ in self.commands))
        self.assertFalse(any(command[2] == "wait" for command, _ in self.commands))
        self.write.assert_not_called()
        event = self.event()
        self.assertEqual(event["alert_type"], "info")
        self.assertIn("status:started", event["tags"])
        self.assertIn("completion has not been verified", event["text"])

    def test_no_updates_still_succeeds_with_no_wait(self):
        self.stack_exists = True
        self.failures[("cloudformation", "update-stack")] = "No updates are to be performed"
        self.run_deploy("--no-wait")
        self.assertEqual(self.event()["alert_type"], "success")
        self.write.assert_called_once()

    def test_inline_template_and_deploy_without_key_still_work(self):
        self.template.return_value = {"Resources": {}}
        self.lookup.return_value = ""
        self.run_deploy()
        self.assertEqual(sum(command[1:3] == ["s3", "cp"] for command, _ in self.commands), 1)
        validate = next(command for command, _ in self.commands if command[2] == "validate-template")
        self.assertIn("--template-body", validate)
        self.http.assert_not_called()
        self.assertEqual(self.errors.getvalue(), "")

    def test_monitoring_reuses_key_lookup_without_exposing_key_in_arguments(self):
        self.run_deploy("--with-datadog")
        self.lookup.assert_called_once_with()
        self.assertTrue(any(command[2] == "put-secret-value" for command, _ in self.commands))
        self.assertNotIn(self.api_key, json.dumps([command for command, _ in self.commands]))
        self.assertNotIn(self.api_key, self.output.getvalue() + self.errors.getvalue())

    def test_event_delivery_failure_does_not_fail_successful_deploy(self):
        self.http.side_effect = TimeoutError(self.api_key)
        self.run_deploy()
        self.write.assert_called_once()
        self.assertIn("could not send Datadog", self.errors.getvalue())
        self.assertNotIn(self.api_key, self.output.getvalue() + self.errors.getvalue())

    def test_event_delivery_failure_preserves_original_deploy_error(self):
        self.failed_upload = "template.json"
        self.http.side_effect = OSError(self.api_key)
        with self.assertRaisesRegex(RuntimeError, "Failed to upload s3://.*templates/.*RequestTimeout"):
            self.run_deploy()
        self.assertNotIn(self.api_key, self.output.getvalue() + self.errors.getvalue())


class DatadogKeyTests(unittest.TestCase):
    def test_lookup_prefers_environment_and_reads_quoted_local_key(self):
        with tempfile.TemporaryDirectory() as temporary, patch.object(deploy, "ROOT", Path(temporary)), patch.dict(deploy.os.environ, {}, clear=True):
            self.assertEqual(deploy.datadog_api_key(), "")
            (Path(temporary) / ".env.local").write_text("OTHER=value\nDATADOG_API_KEY = 'local-key'\n")
            self.assertEqual(deploy.datadog_api_key(), "local-key")
            with patch.dict(deploy.os.environ, {"DATADOG_API_KEY": "environment-key"}):
                self.assertEqual(deploy.datadog_api_key(), "environment-key")

    def test_error_detail_redacts_key_and_key_is_only_in_request_header(self):
        args = SimpleNamespace(environment="production", datadog_site="datadoghq.com")
        api_key = "b" * 32
        with patch.object(deploy.urllib.request, "urlopen") as http:
            deploy.send_deploy_event(args, api_key, "failed", f"Error included {api_key}")
        request = http.call_args.args[0]
        self.assertEqual(request.method, "POST")
        self.assertEqual(request.get_header("Dd-api-key"), api_key)
        self.assertNotIn(api_key, request.data.decode())
        event = json.loads(request.data)
        self.assertIn("[redacted]", event["text"])
        self.assertIn("env:production", event["tags"])
        self.assertEqual(http.call_args.kwargs["timeout"], 5)
