#!/usr/bin/env python3
"""Publish a built artifact to Amplify using the AWS CLI's current identity."""

import argparse
import json
from pathlib import Path
import re
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import zipfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", default="dist", type=Path)
    parser.add_argument("--expected-commit", required=True)
    args = parser.parse_args()
    config = json.loads(
        (Path(__file__).resolve().parents[1] / "deployment/production.json").read_text()
    )
    directory = args.directory.resolve()
    if not re.fullmatch(r"[0-9a-f]{40}", args.expected_commit):
        parser.error("Expected commit must be a full Git commit SHA.")
    for required in ("index.html", "NOTICE.txt", "release.json"):
        if not (directory / required).is_file():
            parser.error(f"Missing release file: {required}")
    release = json.loads((directory / "release.json").read_text())
    if release.get("commit") != args.expected_commit:
        parser.error("Artifact commit differs from the expected commit.")

    def aws(command, *options):
        result = subprocess.run(
            [
                "aws", "amplify", command,
                "--region", config["region"],
                "--app-id", config["appId"],
                "--branch-name", config["branch"],
                *options, "--output", "json", "--no-cli-pager",
            ],
            capture_output=True, text=True,
        )
        if result.returncode:
            raise RuntimeError(f"AWS {command} failed: {result.stderr.strip()}")
        return json.loads(result.stdout)

    def verify_release():
        # Amplify's managed URL works while custom-domain DNS/certificates settle.
        base = config["validationUrl"]
        deadline = time.monotonic() + 120
        while time.monotonic() < deadline:
            try:
                request = urllib.request.Request(
                    base + "/release.json", headers={"Cache-Control": "no-cache"}
                )
                with urllib.request.urlopen(request, timeout=20) as response:
                    published = json.load(response)
                if published.get("commit") == args.expected_commit:
                    break
            except (urllib.error.URLError, ValueError):
                pass
            time.sleep(10)
        else:
            raise RuntimeError("Published release did not match the verified artifact.")
        for path in ("/", "/study", "/explore", "/journey/shared-neighbors"):
            with urllib.request.urlopen(base + path, timeout=20) as response:
                if b'<div id="root"></div>' not in response.read():
                    raise RuntimeError(f"Application route did not return the app: {path}")
        with urllib.request.urlopen(base + "/NOTICE.txt", timeout=20) as response:
            if response.read() != (directory / "NOTICE.txt").read_bytes():
                raise RuntimeError("Published source notices differ from the artifact.")
        try:
            urllib.request.urlopen(base + "/geography/missing-release-check.json", timeout=20)
        except urllib.error.HTTPError as error:
            if error.code != 404:
                raise RuntimeError("Missing geography did not return HTTP 404.") from None
        else:
            raise RuntimeError("Missing geography was incorrectly served as a valid resource.")
        print("Release identity, direct routes, notices, and missing-asset checks passed.")

    with tempfile.TemporaryDirectory(prefix="ambit-deploy-") as temporary:
        archive = Path(temporary) / "site.zip"
        with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as zipped:
            for path in sorted(directory.rglob("*")):
                if path.is_symlink():
                    parser.error("Deployment artifacts must not contain symlinks.")
                if path.is_file() and path.suffix != ".map":
                    zipped.write(path, path.relative_to(directory))
        deployment = aws("create-deployment")
        job_id = deployment["jobId"]
        try:
            request = urllib.request.Request(
                deployment["zipUploadUrl"], data=archive.read_bytes(), method="PUT",
                headers={"Content-Type": "application/zip"},
            )
            with urllib.request.urlopen(request, timeout=120) as response:
                if response.status != 200:
                    raise RuntimeError(f"Artifact upload returned HTTP {response.status}.")
            aws("start-deployment", "--job-id", job_id)
            print(f"Deploying {args.expected_commit} as Amplify job {job_id}.", flush=True)
            deadline = time.monotonic() + 600
            previous_status = None
            while time.monotonic() < deadline:
                status = aws("get-job", "--job-id", job_id)["job"]["summary"]["status"]
                if status != previous_status:
                    print(f"Deployment: {status}", flush=True)
                    previous_status = status
                if status == "SUCCEED":
                    verify_release()
                    print(f"Published {config['url']}")
                    return
                if status in ("FAILED", "CANCELLED"):
                    raise RuntimeError(f"Amplify job {job_id} ended with {status}.")
                time.sleep(10)
            raise RuntimeError(f"Amplify job {job_id} did not finish within ten minutes.")
        except urllib.error.HTTPError as error:
            # Presigned upload URLs contain credentials; never print the URL.
            raise RuntimeError(f"Artifact upload failed with HTTP {error.code}.") from None


if __name__ == "__main__":
    main()
