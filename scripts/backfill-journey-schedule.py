"""Preview or conditionally write old rotation/assignments into per-date history.

Run before the new backend is deployed. The old published map may not describe a
midday assignment that was later replaced; retain the exported preview for review.
"""
import argparse
import json
import subprocess
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
START = date(2026, 10, 5)


def aws(args, command):
    full = ["aws", *command, "--region", "us-east-1", "--output", "json"]
    if args.profile:
        full.extend(["--profile", args.profile])
    return json.loads(subprocess.check_output(full, text=True).strip() or "{}")


def plan(through, assignments, rotation, migrated_at):
    """Freeze the old visible rotation and every explicit assignment."""
    records = []
    current = START
    while current <= through:
        day = current.isoformat()
        assigned = assignments.get(day)
        automatic = rotation[(current - START).days % len(rotation)]
        records.append({"day": day, "journeyId": assigned or automatic, "autoJourneyId": automatic, "source": "assigned" if assigned else "auto", "lockedAt": migrated_at, "backfilled": True, "revision": 1})
        current += timedelta(days=1)
    for day, journey_id in assignments.items():
        if date.fromisoformat(day) > through:
            records.append({"day": day, "journeyId": journey_id, "source": "assigned", "revision": 1})
    return sorted(records, key=lambda record: record["day"])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--environment", choices=("production", "staging"), required=True)
    parser.add_argument("--profile")
    parser.add_argument("--through", default=datetime.now(ZoneInfo("America/New_York")).date().isoformat())
    parser.add_argument("--output", required=True, help="Read-only JSON review artifact")
    parser.add_argument("--apply", action="store_true", help="Conditionally write reviewed records")
    args = parser.parse_args()
    through = date.fromisoformat(args.through)
    if through < START:
        parser.error("--through must be on or after the first daily Journey")
    if through > datetime.now(ZoneInfo("America/New_York")).date():
        parser.error("--through cannot be after today")
    table = f"ambit-{args.environment}-community"
    published_key = {"pk": {"S": "journey-schedule"}, "sk": {"S": "published"}}
    published = aws(args, ["dynamodb", "get-item", "--table-name", table, "--key", json.dumps(published_key), "--consistent-read"]).get("Item")
    legacy = json.loads(published["dataJson"]["S"]) if published else {"assignments": {}}
    assignments = legacy.get("assignments", {})
    rotation = json.loads((ROOT / "scripts/legacy-journey-rotation.json").read_text())
    if not rotation:
        raise RuntimeError("The historic rotation could not be read")
    output = Path(args.output)
    if args.apply:
        if not output.exists():
            raise RuntimeError("Review a dry-run preview before applying it")
        records = json.loads(output.read_text())
        expected = plan(through, assignments, rotation, records[0]["lockedAt"])
        if records != expected:
            raise RuntimeError("The reviewed preview differs from the current published schedule; create a new preview")
    else:
        records = plan(through, assignments, rotation, datetime.now(ZoneInfo("America/New_York")).isoformat())
        output.write_text(json.dumps(records, indent=2) + "\n")
        print(f"Reviewed {len(records)} date records; preview saved to {output}")
        print("Dry run; no DynamoDB writes.")
        return
    for record in records:
        key = {"pk": {"S": "journey-schedule"}, "sk": {"S": "day:" + record["day"]}}
        existing = aws(args, ["dynamodb", "get-item", "--table-name", table, "--key", json.dumps(key), "--consistent-read"]).get("Item")
        if existing:
            if json.loads(existing["dataJson"]["S"]) != record:
                raise RuntimeError(f"Existing {record['day']} differs from the preview; stopped without overwriting")
            continue
        item = {"pk": {"S": "journey-schedule"}, "sk": {"S": "day:" + record["day"]}, "dataJson": {"S": json.dumps(record, sort_keys=True, separators=(",", ":"))}}
        check = {"TableName": table, "Key": published_key, "ConditionExpression": "dataJson = :original" if published else "attribute_not_exists(pk)"}
        if published:
            check["ExpressionAttributeValues"] = {":original": published["dataJson"]}
        operations = [{"ConditionCheck": check}, {"Put": {"TableName": table, "Item": item, "ConditionExpression": "attribute_not_exists(pk)"}}]
        try:
            aws(args, ["dynamodb", "transact-write-items", "--transact-items", json.dumps(operations)])
        except subprocess.CalledProcessError as error:
            raise RuntimeError(f"Stopped at {record['day']}; the old schedule may have changed. Review a new preview before retrying") from error
    print(f"Conditionally wrote {len(records)} date records to {table}.")


if __name__ == "__main__":
    main()
