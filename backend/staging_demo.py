"""Private staging demo activity, shared by the manual seeder and scheduled Lambda."""
import hashlib
import json
import os
import re
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo
from journey_schedule import choose, SCHEDULE_VERSION

ROOT = Path(__file__).resolve().parents[1]

COMMUNITY = "ambit-staging-community"
SAVES = "ambit-staging-saves"
DEMO_WRITER = "staging-demo-v1"
FRIENDS = [
    {"name": "Ada", "slug": "ada", "avatar": "flag:wurl:CAN", "answered": 5, "correct": 5, "help": None},
    {"name": "Nico", "slug": "nico", "avatar": "flag:wurl:ARG", "answered": 5, "correct": 4, "help": "hinted"},
    {"name": "Maya", "slug": "maya", "avatar": "flag:wurl:JPN", "answered": 5, "correct": 2, "help": "assisted"},
    {"name": "Owen", "slug": "owen", "avatar": "flag:wurl:GBR", "answered": 2, "correct": 1, "help": None},
    {"name": "Zara", "slug": "zara", "avatar": "flag:wurl:ZAF", "answered": 0, "correct": 0, "help": None},
]


def validate_tables(resources):
    tables = {row["LogicalResourceId"]: row["PhysicalResourceId"] for row in resources if row["ResourceType"] == "AWS::DynamoDB::Table"}
    if tables.get("Community") != COMMUNITY or tables.get("Saves") != SAVES:
        raise RuntimeError("Only the ambit-staging-services tables may be seeded.")


def packed(owner, kind, value):
    return {"pk": {"S": owner}, "sk": {"S": kind}, "dataJson": {"S": json.dumps(value, sort_keys=True, separators=(",", ":"))}}


def build_attempt(friend, journey, day, clock, version=1):
    answers = [{"roundId": row["id"], "selectedIds": [], "ordered": [], "text": "", "correct": index < friend["correct"]} for index, row in enumerate(journey["rounds"][:friend["answered"]])]
    game = {"phase": "finished" if len(answers) == 5 else "playing" if answers else "home", "roundIndex": min(len(answers), 4), "answers": answers, "selectedIds": [], "ordered": [], "text": ""}
    if friend["help"] and answers:
        game["help"] = {answers[0]["roundId"]: friend["help"]}
    return {"date": day, "journeyId": journey["id"], "scheduleVersion": version, "runId": f"staging-demo-{friend['slug']}-{day}", "startedAt": clock, "game": game}


def save_item(subject, attempt, clock):
    field = f"run.{attempt['date']}/{attempt['journeyId']}/{attempt['runId']}"
    address = json.dumps(["daily", field, DEMO_WRITER])  # Matches backend/saves.py.
    return {"pk": {"S": "user#" + subject}, "sk": {"S": hashlib.sha256(address.encode()).hexdigest()}, "namespace": {"S": "daily"}, "field": {"S": field}, "writer": {"S": DEMO_WRITER}, "clock": {"N": str(clock)}, "valueJson": {"S": json.dumps(attempt, separators=(",", ":"))}}


def choose_journey(day, catalog, schedule, records):
    resets = {}
    for row in records:
        if row.get("namespace", {}).get("S") == "daily" and row.get("field", {}).get("S", "").startswith("reset."):
            key = row["field"]["S"][6:]
            resets[key] = max(resets.get(key, 0), json.loads(row["valueJson"]["S"]))
    attempts = []
    for row in records:
        if row.get("namespace", {}).get("S") != "daily":
            continue
        value = json.loads(row["valueJson"]["S"])
        if isinstance(value, dict) and value.get("date") == day and value.get("journeyId") in catalog and isinstance(value.get("game"), dict) and value.get("startedAt", 0) > resets.get(f"{day}/{value.get('journeyId')}", -1):
            attempts.append(value)
    if attempts:
        selections = [row for row in records if row.get("namespace", {}).get("S") == "daily" and row.get("field", {}).get("S") == f"selection.{day}"]
        if selections:
            selection = json.loads(max(selections, key=lambda row: (int(row["clock"]["N"]), row["writer"]["S"]))["valueJson"]["S"])
            selected = [value for value in attempts if isinstance(selection, dict) and value["journeyId"] == selection.get("journeyId") and value.get("runId") == selection.get("runId")]
            if selected:
                attempts = selected
        active = max(attempts, key=lambda value: (value.get("startedAt", 0), len(value["game"].get("answers", []))))
        return catalog[active["journeyId"]], active.get("scheduleVersion", 1)
    records = schedule.get("records", {})
    return catalog[choose(day, records, catalog)], SCHEDULE_VERSION


def load_catalog():
    path = Path(__file__).with_name("journey-index.json")
    if not path.exists():
        path = ROOT / "src/game/journeyIndex.json"
    return {row["id"]: row for row in json.loads(path.read_text())}


def seed(aws, handle="mars_staging", day=None, dry_run=False, provision=False, catalog=None):
    """Refresh only marked demo saves; provision friendships only in the manual CLI."""
    day = day or datetime.now(ZoneInfo("America/New_York")).date().isoformat()
    date.fromisoformat(day)
    if not re.fullmatch(r"[a-zA-Z][a-zA-Z0-9_]{2,23}", handle):
        raise ValueError("Choose a valid existing staging handle.")
    handle = handle.lower()
    def get(owner, kind):
        item = aws("dynamodb", "get-item", TableName=COMMUNITY, Key={"pk": {"S": owner}, "sk": {"S": kind}}, ConsistentRead=True).get("Item")
        return json.loads(item["dataJson"]["S"]) if item else None
    def put(owner, kind, value, previous):
        operation = {"TableName": COMMUNITY, "Item": packed(owner, kind, value), "ConditionExpression": "attribute_not_exists(pk)"}
        if previous is not None:
            operation.update(ConditionExpression="dataJson = :old", ExpressionAttributeValues={":old": packed(owner, kind, previous)["dataJson"]})
        return {"Put": operation}
    reservation = get("handle#" + handle.lower(), "owner")
    if not reservation:
        raise RuntimeError("The target staging handle does not exist.")
    owner = reservation["id"]
    profile = get("user#" + owner, "profile")
    if not profile or profile["handle"] != handle.lower() or owner.startswith("staging-demo-"):
        raise RuntimeError("Choose a real staging player profile.")
    records, cursor = [], None
    while True:
        parameters = {"TableName": SAVES, "KeyConditionExpression": "pk = :owner", "ExpressionAttributeValues": {":owner": {"S": "user#" + owner}}, "ConsistentRead": True}
        if cursor:
            parameters["ExclusiveStartKey"] = cursor
        page = aws("dynamodb", "query", **parameters)
        records.extend(page.get("Items", []))
        cursor = page.get("LastEvaluatedKey")
        if not cursor:
            break
    catalog = catalog or load_catalog()
    schedule_records, cursor = {}, None
    while True:
        first = (date.fromisoformat(day) - timedelta(days=14)).isoformat()
        parameters = {"TableName": COMMUNITY, "KeyConditionExpression": "pk = :owner AND sk BETWEEN :first AND :last", "ExpressionAttributeValues": {":owner": {"S": "journey-schedule"}, ":first": {"S": "day:" + first}, ":last": {"S": "day:" + day}}, "ConsistentRead": True}
        if cursor:
            parameters["ExclusiveStartKey"] = cursor
        page = aws("dynamodb", "query", **parameters)
        for item in page.get("Items", []):
            record = json.loads(item["dataJson"]["S"])
            schedule_records[record["day"]] = record
        cursor = page.get("LastEvaluatedKey")
        if not cursor:
            break
    journey, version = choose_journey(day, catalog, {"records": schedule_records}, records)
    clock = int(datetime.now().timestamp() * 1000)
    prepared = []
    for friend in FRIENDS:
        subject, demo_handle = "staging-demo-" + friend["slug"], "staging_demo_" + friend["slug"]
        old_profile, old_handle = get("user#" + subject, "profile"), get("handle#" + demo_handle, "owner")
        if (old_profile and old_profile.get("stagingDemo") is not True) or (old_handle and old_handle.get("id") != subject):
            raise RuntimeError("A demo identity collides with an existing player; nothing was written.")
        pair = "pair#" + "#".join(sorted([owner, subject]))
        relation = get(pair, "relation")
        if relation and relation["status"] == "blocked":
            print(f"Preserving blocked demo friend @{demo_handle}.")
            continue
        if not provision and (not old_profile or not relation or relation["status"] != "accepted"):
            continue
        operations = []
        if provision:
            value = {"id": subject, "displayName": friend["name"] + " · Demo", "handle": demo_handle, "avatar": friend["avatar"], "favoriteRegion": "", "bio": "Staging demo player. Journey activity is synthetic.", "shareJourneyScores": True, "presets": [], "revision": (old_profile or {}).get("revision", 0) + 1, "stagingDemo": True}
            operations = [put("user#" + subject, "profile", value, old_profile), put("handle#" + demo_handle, "owner", {"id": subject}, old_handle), put(pair, "relation", {"status": "accepted", "requester": owner}, relation), put("user#" + owner, "friend#" + subject, {"id": subject, "status": "accepted"}, get("user#" + owner, "friend#" + subject)), put("user#" + subject, "friend#" + owner, {"id": owner, "status": "accepted"}, get("user#" + subject, "friend#" + owner))]
        item = save_item(subject, build_attempt(friend, journey, day, clock, version), clock) if friend["answered"] else None
        prepared.append((demo_handle, subject, operations, item, friend))
    print(f"{'Preview' if dry_run else 'Seed'}: @{handle}, {day} (New York), {journey['title']}.")
    for handle, subject, operations, item, friend in prepared:
        if not dry_run:
            if operations:
                aws("dynamodb", "transact-write-items", TransactItems=operations)
            if item:
                aws("dynamodb", "put-item", TableName=SAVES, Item=item)
            aws("dynamodb", "delete-item", TableName=COMMUNITY, Key={"pk": {"S": "user#" + subject}, "sk": {"S": "activity-v1"}})
        status = f"{friend['correct']}/5 completed" if friend["answered"] == 5 else "in progress" if friend["answered"] else "not started"
        print(f"  @{handle}: {status}")
    return {"date": day, "journeyId": journey["id"], "friends": len(prepared), "dryRun": dry_run}


def handler(event, context):
    # Fail before creating a client or reading/writing any records elsewhere.
    if os.environ.get("APP_ENV") != "staging" or os.environ.get("COMMUNITY_TABLE") != COMMUNITY or os.environ.get("SAVES_TABLE") != SAVES:
        raise RuntimeError("Demo activity is restricted to the staging tables.")
    import boto3
    client = boto3.client("dynamodb")
    def aws(service, operation, **parameters):
        return getattr(client, operation.replace("-", "_"))(**parameters)
    # Ignore event dates/handles: scheduled and manual invocation both use today
    # in New York and the configured staging owner. Never provision relationships.
    return seed(aws, handle=os.environ.get("DEMO_HANDLE", "mars_staging"))
