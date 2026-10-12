"""Environment isolation and nonblocking setup, without contacting AWS."""
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
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
        for logical, field in (("Feedback", "TableName"), ("Saves", "TableName"), ("Community", "TableName"), ("Users", "UserPoolName"), ("ApiFunction", "FunctionName"), ("Confirmation", "FunctionName"), ("AccessLogs", "LogGroupName"), ("ApiLogs", "LogGroupName"), ("ConfirmationLogs", "LogGroupName")):
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
        with patch.object(sys, "argv", ["deploy-backend.py", "--environment", "staging", "--refresh-config", "--write-dev-env"]), patch.object(deploy.subprocess, "run", side_effect=aws), patch.object(deploy, "write_client_configuration") as write:
            deploy.main()
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
        with patch.object(sys, "argv", ["deploy-backend.py", "--environment", "staging", "--no-wait", "--write-dev-env"]), patch.object(deploy.subprocess, "run", side_effect=aws), patch.object(deploy, "write_client_configuration") as write:
            deploy.main()
        create = next(command for command in commands if "create-stack" in command)
        self.assertIn("ambit-staging-services", create)
        self.assertFalse(any("wait" in command for command in commands))
        write.assert_not_called()
