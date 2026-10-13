#!/usr/bin/env python3
"""Create synthetic friends/results in the fixed staging stack; never touch real saves.

Use this once to provision demo identities/friendships, or to refresh manually.
The staging-only scheduled Lambda uses the same generator for daily activity.
"""
import argparse
import json
import re
import subprocess
import tempfile
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from staging_demo import seed, validate_tables

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", default="personal")
    parser.add_argument("--handle", default="mars_staging")
    parser.add_argument("--date", default=datetime.now(ZoneInfo("America/New_York")).date().isoformat())
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    date.fromisoformat(args.date)
    if not re.fullmatch(r"[a-zA-Z][a-zA-Z0-9_]{2,23}", args.handle):
        parser.error("Choose a valid existing staging handle.")
    def aws(service, operation, **parameters):
        with tempfile.TemporaryDirectory(prefix="ambit-staging-seed-") as directory:
            request = Path(directory) / "request.json"
            request.write_text(json.dumps(parameters))
            result = subprocess.run(["aws", service, operation, "--cli-input-json", "file://" + str(request), "--profile", args.profile, "--region", "us-east-1", "--output", "json"], capture_output=True, text=True)
        if result.returncode:
            raise RuntimeError(result.stderr.strip())
        return json.loads(result.stdout or "{}")
    resources = aws("cloudformation", "list-stack-resources", StackName="ambit-staging-services")["StackResourceSummaries"]
    validate_tables(resources)
    seed(aws, args.handle, args.date, args.dry_run, provision=True)
    print("No records changed." if args.dry_run else "Only demo profiles/saves and reciprocal staging friendships were changed.")


if __name__ == "__main__":
    main()
