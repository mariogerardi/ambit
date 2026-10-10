"""Apply reviewed classic Cognito logo/CSS. Dry-run is the default; no secrets."""
import argparse
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Publish the reviewed branding to the configured Cognito app client")
    parser.add_argument("--profile", default="personal")
    args = parser.parse_args()
    config = json.loads((ROOT / "deployment/services.json").read_text())["auth"]
    pool = config["authority"].rsplit("/", 1)[-1]
    css = ROOT / "deployment/cognito/ambit.css"
    logo = ROOT / "deployment/cognito/ambit-logo.png"
    if len(css.read_bytes()) > 3000 or len(logo.read_bytes()) > 100000:
        raise RuntimeError("Branding assets exceed Cognito's recommended size limits")
    if not args.apply:
        print("Local branding validated. Nothing published. Add --apply after approval.")
        return
    subprocess.run(["aws", "cognito-idp", "set-ui-customization", "--region", "us-east-1", "--profile", args.profile,
        "--user-pool-id", pool, "--client-id", config["clientId"], "--css", "file://" + str(css),
        "--image-file", "fileb://" + str(logo), "--query", "UICustomization.CSSVersion", "--output", "text"], check=True)
    print("Ambit login branding applied.")


if __name__ == "__main__":
    main()
