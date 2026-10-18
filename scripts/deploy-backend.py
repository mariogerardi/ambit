"""Deploy the independently versioned backend with CloudFormation (never prints secrets)."""
import argparse
import hashlib
import io
import json
import os
import re
from pathlib import Path
import secrets
import subprocess
import sys
import tempfile
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from infrastructure import template


def datadog_api_key():
    api_key = os.environ.get("DATADOG_API_KEY", "")
    if api_key:
        return api_key
    try:
        lines = (ROOT / ".env.local").read_text().splitlines()
    except (OSError, UnicodeError):
        return ""
    for line in lines:
        match = re.match(r"^\s*DATADOG_API_KEY\s*=\s*(.*)$", line)
        if match:
            api_key = match.group(1).strip().strip("\"'")
    return api_key


def send_deploy_event(args, api_key, status, detail):
    if not api_key:
        return
    # Event delivery must never change the deployment outcome or expose the key.
    try:
        event = {
            "title": f"Ambit backend deployment {status} ({args.environment})",
            "text": f"Stack: ambit-{args.environment}-services\n{detail}".replace(api_key, "[redacted]"),
            "tags": ["project:ambit", "service:ambit-api", f"env:{args.environment}", f"environment:{args.environment}", f"status:{status}"],
            "alert_type": {"failed": "error", "succeeded": "success", "started": "info"}[status],
        }
        request = urllib.request.Request(
            f"https://api.{args.datadog_site}/api/v1/events",
            data=json.dumps(event).encode(),
            headers={"Content-Type": "application/json", "DD-API-KEY": api_key},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=5):
            pass
    except Exception:
        print("Warning: could not send Datadog deploy event.", file=sys.stderr)


def write_client_configuration(outputs, environment, write_dev_env=False):
    client = {"apiUrl": outputs["ApiUrl"], "auth": {"authority": outputs["Authority"], "clientId": outputs["ClientId"], "loginUrl": outputs["LoginUrl"]}}
    filename = "services.json" if environment == "production" else "services.staging.json"
    destination = ROOT / "deployment" / filename
    if destination.exists():
        old = json.loads(destination.read_text())
        if "datadog" in old:
            client["datadog"] = old["datadog"]
    destination.write_text(json.dumps(client, indent=2) + "\n")
    if write_dev_env:
        values = {"VITE_API_URL": client["apiUrl"], "VITE_AUTH_AUTHORITY": client["auth"]["authority"], "VITE_AUTH_CLIENT_ID": client["auth"]["clientId"], "VITE_AUTH_LOGIN_URL": client["auth"]["loginUrl"], "VITE_DATADOG_ENV": environment}
        local = ROOT / ".env.development.local"
        lines = local.read_text().splitlines() if local.exists() else []
        # Preserve unrelated settings and comments, replacing only the staging keys.
        lines = [line for line in lines if not any(re.match(r"^\s*(?:export\s+)?" + name + r"\s*=", line) for name in values)]
        lines.extend(name + "=" + json.dumps(value) for name, value in values.items())
        local.write_text("\n".join(lines) + "\n")
    return destination.relative_to(ROOT)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", default="personal")
    parser.add_argument("--environment", choices=("production", "staging"), default="production")
    parser.add_argument("--refresh-config", action="store_true", help="Read existing stack outputs without deploying")
    parser.add_argument("--write-dev-env", action="store_true", help="Write staging settings to .env.development.local")
    parser.add_argument("--datadog-secret-arn", default=None)
    parser.add_argument("--with-datadog", action="store_true", help="Store DATADOG_API_KEY from the environment or .env.local in AWS Secrets Manager and enable monitoring")
    parser.add_argument("--datadog-site", default="datadoghq.com")
    parser.add_argument("--no-wait", action="store_true", help="Start a stack creation or update and return immediately")
    args = parser.parse_args()
    if args.write_dev_env and args.environment != "staging":
        parser.error("--write-dev-env requires --environment staging")
    stack = f"ambit-{args.environment}-services"
    def aws(*arguments, raw=False, env=None):
        result = subprocess.run(["aws", *arguments, "--profile", args.profile, "--region", "us-east-1"], capture_output=True, text=True, env=env)
        if result.returncode:
            raise RuntimeError(result.stderr.strip())
        return result.stdout if raw else json.loads(result.stdout or "{}")
    if args.refresh_config:
        deployed = aws("cloudformation", "describe-stacks", "--stack-name", stack)["Stacks"][0]
        outputs = {item["OutputKey"]: item["OutputValue"] for item in deployed.get("Outputs", [])}
        if not all(name in outputs for name in ("ApiUrl", "Authority", "ClientId", "LoginUrl")):
            raise RuntimeError(f"{stack} has no endpoints yet ({deployed['StackStatus']}). Run --refresh-config after creation finishes.")
        destination = write_client_configuration(outputs, args.environment, args.write_dev_env)
        print(f"Refreshed {args.environment} configuration: {destination}")
        if args.write_dev_env:
            print("Updated .env.development.local; restart Vite to use staging.")
        return
    api_key = datadog_api_key()
    try:
        status, revision = deploy_backend(args, aws, api_key)
    except Exception as error:
        send_deploy_event(args, api_key, "failed", f"{type(error).__name__}: {error}")
        raise
    detail = f"Release: {revision[:12]}. " + ("CloudFormation started; completion has not been verified." if status == "started" else "Deployment completed.")
    send_deploy_event(args, api_key, status, detail)


def deploy_backend(args, aws, api_key):
    stack = f"ambit-{args.environment}-services"
    account = aws("sts", "get-caller-identity")["Account"]
    bucket = f"ambit-backend-artifacts-{account}-us-east-1"

    def upload(source, key):
        destination = f"s3://{bucket}/{key}"
        try:
            aws("s3", "cp", str(source), destination, "--only-show-errors", "--no-progress", raw=True,
                env={**os.environ, "AWS_RETRY_MODE": "adaptive", "AWS_MAX_ATTEMPTS": "5"})
        except (RuntimeError, OSError) as error:
            raise RuntimeError(f"Failed to upload {destination}: {error}") from None

    try:
        aws("s3api", "head-bucket", "--bucket", bucket)
    except RuntimeError as error:
        if "404" not in str(error):
            raise
        aws("s3api", "create-bucket", "--bucket", bucket)
    aws("s3api", "put-public-access-block", "--bucket", bucket, "--public-access-block-configuration", json.dumps({key: True for key in ("BlockPublicAcls", "IgnorePublicAcls", "BlockPublicPolicy", "RestrictPublicBuckets")}))
    aws("s3api", "put-bucket-encryption", "--bucket", bucket, "--server-side-encryption-configuration", json.dumps({"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]}))
    archive = io.BytesIO()
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as package:
        for name in ("handler.py", "confirmation.py", "saves.py", "dynamodb.py", "community.py", "journey_schedule.py", "journey_lock.py", "staging_demo.py", "study-countries.json"):
            info = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            package.writestr(info, (ROOT / "backend" / name).read_bytes())
        info = zipfile.ZipInfo("journey-index.json", (2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        package.writestr(info, (ROOT / "src" / "game" / "journeyIndex.json").read_bytes())
        info = zipfile.ZipInfo("profile-avatars.json", (2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        package.writestr(info, (ROOT / "shared" / "profile-avatars.json").read_bytes())
    content = archive.getvalue()
    revision = hashlib.sha256(content).hexdigest()
    key = f"releases/{revision}.zip"
    exists = False
    try:
        aws("cloudformation", "describe-stacks", "--stack-name", stack)["Stacks"][0]
        exists = True
    except RuntimeError as error:
        if "does not exist" not in str(error):
            raise
    datadog_secret = args.datadog_secret_arn
    if args.with_datadog:
        if not re.fullmatch(r"[a-fA-F0-9]{32}", api_key):
            raise RuntimeError("DATADOG_API_KEY must contain a valid API key; its value will not be printed")
        name = f"ambit/{args.environment}/datadog-api-key"
        # The key travels through a private temporary file, never command arguments.
        with tempfile.TemporaryDirectory(prefix="ambit-secret-") as private:
            secret_file = Path(private) / "key"
            secret_file.write_text(api_key)
            secret_file.chmod(0o600)
            try:
                datadog_secret = aws("secretsmanager", "describe-secret", "--secret-id", name)["ARN"]
            except RuntimeError as error:
                if "ResourceNotFoundException" not in str(error):
                    raise
                datadog_secret = aws("secretsmanager", "create-secret", "--name", name, "--secret-string", f"file://{secret_file}", "--tags", "Key=project,Value=ambit", f"Key=environment,Value={args.environment}")["ARN"]
            else:
                aws("secretsmanager", "put-secret-value", "--secret-id", datadog_secret, "--secret-string", f"file://{secret_file}")
    values = {"ArtifactBucket": bucket, "ArtifactKey": key, "Release": revision[:12], "DatadogSite": args.datadog_site}
    parameters = [{"ParameterKey": key, "ParameterValue": value} for key, value in values.items()]
    parameters.append({"ParameterKey": "DatadogSecretArn", **({"UsePreviousValue": True} if exists and datadog_secret is None else {"ParameterValue": datadog_secret or ""})})
    parameters.append({"ParameterKey": "RateSalt", **({"UsePreviousValue": True} if exists else {"ParameterValue": secrets.token_hex(32)})})
    with tempfile.TemporaryDirectory(prefix="ambit-backend-") as directory:
        directory = Path(directory)
        (directory / "backend.zip").write_bytes(content)
        template_content = json.dumps(template(args.environment)).encode()
        (directory / "template.json").write_bytes(template_content)
        (directory / "parameters.json").write_text(json.dumps(parameters))
        upload(directory / "backend.zip", key)
        # Branding embeds vector artwork; CloudFormation's inline limit is 51 KB.
        if len(template_content) > 51200:
            template_key = "templates/" + hashlib.sha256(template_content).hexdigest() + ".json"
            upload(directory / "template.json", template_key)
            template_argument = ["--template-url", f"https://{bucket}.s3.us-east-1.amazonaws.com/{template_key}"]
        else:
            template_argument = ["--template-body", f"file://{directory / 'template.json'}"]
        aws("cloudformation", "validate-template", *template_argument)
        try:
            aws("cloudformation", "update-stack" if exists else "create-stack", "--stack-name", stack, *template_argument, "--parameters", f"file://{directory / 'parameters.json'}", "--capabilities", "CAPABILITY_IAM", "--tags", "Key=project,Value=ambit", f"Key=environment,Value={args.environment}")
            if args.no_wait:
                action = "update" if exists else "creation"
                print(f"Started {stack} {action}, release {revision[:12]}; not waiting for completion.", flush=True)
                print(f"Stack: https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/stackinfo?stackId={stack}")
                print(f"Refresh endpoints later: python3 scripts/deploy-backend.py --profile {args.profile} --environment {args.environment} --refresh-config" + (" --write-dev-env" if args.write_dev_env else ""))
                return "started", revision
            print("Waiting for CloudFormation…", flush=True)
            aws("cloudformation", "wait", "stack-update-complete" if exists else "stack-create-complete", "--stack-name", stack, raw=True)
        except RuntimeError as error:
            if "No updates are to be performed" not in str(error):
                raise
    outputs = {item["OutputKey"]: item["OutputValue"] for item in aws("cloudformation", "describe-stacks", "--stack-name", stack)["Stacks"][0]["Outputs"]}
    destination = write_client_configuration(outputs, args.environment, args.write_dev_env)
    print(f"Deployed {args.environment} {revision[:12]}. Public client configuration: {destination}", flush=True)
    if args.write_dev_env:
        print("Updated .env.development.local; restart Vite to use staging.")
    return "succeeded", revision



if __name__ == "__main__":
    main()
