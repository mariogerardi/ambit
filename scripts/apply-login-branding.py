"""Validate or update the existing managed login style; dry-run is the default."""
import argparse
import json
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from login_branding import branding


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Publish branding to the existing managed login style (does not switch plans)")
    parser.add_argument("--profile", default="personal")
    args = parser.parse_args()
    config = json.loads((ROOT / "deployment/services.json").read_text())["auth"]
    pool = config["authority"].rsplit("/", 1)[-1]
    request = {"UserPoolId": pool, **branding()}
    if len(json.dumps(request).encode()) > 2 * 1024 * 1024:
        raise RuntimeError("Managed login branding exceeds Cognito's 2 MB request limit")
    if not args.apply:
        print("Full-page managed login branding validated. Nothing published.")
        return
    command = ["aws", "cognito-idp", "--region", "us-east-1", "--profile", args.profile]
    request["ManagedLoginBrandingId"] = subprocess.check_output([*command, "describe-managed-login-branding-by-client", "--user-pool-id", pool, "--client-id", config["clientId"], "--query", "ManagedLoginBranding.ManagedLoginBrandingId", "--output", "text"], text=True).strip()
    with tempfile.TemporaryDirectory(prefix="ambit-branding-") as directory:
        path = Path(directory) / "branding.json"
        path.write_text(json.dumps(request))
        subprocess.run([*command, "update-managed-login-branding", "--cli-input-json", "file://" + str(path), "--cli-binary-format", "base64", "--query", "ManagedLoginBranding.LastModifiedDate", "--output", "text"], check=True)
    print("Ambit login branding applied.")


if __name__ == "__main__":
    main()
