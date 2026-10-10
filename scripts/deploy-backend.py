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
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from infrastructure import template


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", default="personal")
    parser.add_argument("--datadog-secret-arn", default=None)
    parser.add_argument("--with-datadog", action="store_true", help="Store DATADOG_API_KEY from the environment or .env.local in AWS Secrets Manager and enable monitoring")
    parser.add_argument("--datadog-site", default="datadoghq.com")
    args = parser.parse_args()
    def aws(*arguments, raw=False):
        result = subprocess.run(["aws", *arguments, "--profile", args.profile, "--region", "us-east-1"], capture_output=True, text=True)
        if result.returncode:
            raise RuntimeError(result.stderr.strip())
        return result.stdout if raw else json.loads(result.stdout or "{}")
    account = aws("sts", "get-caller-identity")["Account"]
    bucket = f"ambit-backend-artifacts-{account}-us-east-1"
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
        for name in ("handler.py", "confirmation.py"):
            info = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            package.writestr(info, (ROOT / "backend" / name).read_bytes())
    content = archive.getvalue()
    revision = hashlib.sha256(content).hexdigest()
    key = f"releases/{revision}.zip"
    stack = "ambit-production-services"
    exists = False
    try:
        previous = aws("cloudformation", "describe-stacks", "--stack-name", stack)["Stacks"][0]
        exists = True
    except RuntimeError as error:
        if "does not exist" not in str(error):
            raise
    datadog_secret = args.datadog_secret_arn
    if args.with_datadog:
        api_key = os.environ.get("DATADOG_API_KEY", "")
        if not api_key:
            for line in (ROOT / ".env.local").read_text().splitlines():
                match = re.match(r"^\s*DATADOG_API_KEY\s*=\s*(.*)$", line)
                if match:
                    api_key = match.group(1).strip().strip("\"'")
        if not re.fullmatch(r"[a-fA-F0-9]{32}", api_key):
            raise RuntimeError("DATADOG_API_KEY must contain a valid API key; its value will not be printed")
        name = "ambit/production/datadog-api-key"
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
                datadog_secret = aws("secretsmanager", "create-secret", "--name", name, "--secret-string", f"file://{secret_file}", "--tags", "Key=project,Value=ambit", "Key=environment,Value=production")["ARN"]
            else:
                aws("secretsmanager", "put-secret-value", "--secret-id", datadog_secret, "--secret-string", f"file://{secret_file}")
    values = {"ArtifactBucket": bucket, "ArtifactKey": key, "Release": revision[:12], "DatadogSite": args.datadog_site}
    parameters = [{"ParameterKey": key, "ParameterValue": value} for key, value in values.items()]
    parameters.append({"ParameterKey": "DatadogSecretArn", **({"UsePreviousValue": True} if exists and datadog_secret is None else {"ParameterValue": datadog_secret or ""})})
    parameters.append({"ParameterKey": "RateSalt", **({"UsePreviousValue": True} if exists else {"ParameterValue": secrets.token_hex(32)})})
    with tempfile.TemporaryDirectory(prefix="ambit-backend-") as directory:
        directory = Path(directory)
        (directory / "backend.zip").write_bytes(content)
        (directory / "template.json").write_text(json.dumps(template()))
        (directory / "parameters.json").write_text(json.dumps(parameters))
        aws("s3api", "put-object", "--bucket", bucket, "--key", key, "--body", str(directory / "backend.zip"))
        aws("cloudformation", "validate-template", "--template-body", f"file://{directory / 'template.json'}")
        try:
            aws("cloudformation", "update-stack" if exists else "create-stack", "--stack-name", stack, "--template-body", f"file://{directory / 'template.json'}", "--parameters", f"file://{directory / 'parameters.json'}", "--capabilities", "CAPABILITY_IAM", "--tags", "Key=project,Value=ambit", "Key=environment,Value=production")
            print("Waiting for CloudFormation…", flush=True)
            aws("cloudformation", "wait", "stack-update-complete" if exists else "stack-create-complete", "--stack-name", stack, raw=True)
        except RuntimeError as error:
            if "No updates are to be performed" not in str(error):
                raise
    outputs = {item["OutputKey"]: item["OutputValue"] for item in aws("cloudformation", "describe-stacks", "--stack-name", stack)["Stacks"][0]["Outputs"]}
    client = {"apiUrl": outputs["ApiUrl"], "auth": {"authority": outputs["Authority"], "clientId": outputs["ClientId"], "loginUrl": outputs["LoginUrl"]}}
    destination = ROOT / "deployment" / "services.json"
    if destination.exists():
        old = json.loads(destination.read_text())
        if "datadog" in old:
            client["datadog"] = old["datadog"]
    destination.write_text(json.dumps(client, indent=2) + "\n")
    print(f"Deployed {revision[:12]}. Public client configuration: deployment/services.json", flush=True)


if __name__ == "__main__":
    main()
