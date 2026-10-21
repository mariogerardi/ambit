"""Private, revisioned player registers. Identity comes only from the JWT authorizer."""
import base64
import hashlib
import json
import os

import dynamodb
from botocore.exceptions import ClientError


def table():
    return dynamodb.Table(os.environ["SAVES_TABLE"])


def response(status, data):
    return {"statusCode": status, "headers": {"Content-Type": "application/json", "Cache-Control": "no-store"}, "body": json.dumps(data)}


def validate(entry):
    if not isinstance(entry, dict) or entry.get("namespace") not in ("daily", "study") or entry.get("version") != 2:
        raise ValueError()
    clock = entry.get("clock")
    if type(clock) is not int or not 0 <= clock <= 9007199254740991:
        raise ValueError()
    for key, limit in (("writer", 200), ("field", 600)):
        value = entry.get(key)
        if not isinstance(value, str) or not value or len(value) > limit or any(ord(c) < 32 for c in value):
            raise ValueError()
    if "value" not in entry:
        raise ValueError()
    value_json = json.dumps(entry["value"], allow_nan=False, ensure_ascii=False, separators=(",", ":"))
    if len(value_json.encode()) > 300000:
        raise ValueError()
    # JSON storage avoids lossy numeric conversions by the DynamoDB SDK.
    address = json.dumps([entry["namespace"], entry["field"], entry["writer"]])
    return {"sk": hashlib.sha256(address.encode()).hexdigest(), "namespace": entry["namespace"], "field": entry["field"], "writer": entry["writer"], "clock": clock, "valueJson": value_json}


def handle(event):
    subject = event.get("requestContext", {}).get("authorizer", {}).get("jwt", {}).get("claims", {}).get("sub")
    if not isinstance(subject, str) or not subject:
        return response(401, {"error": "Sign in to sync your progress."})
    owner = "user#" + subject
    if event["routeKey"] == "GET /account/saves":
        manifest = (event.get("queryStringParameters") or {}).get("manifest") == "1"
        options = {"KeyConditionExpression": "pk = :owner", "ExpressionAttributeValues": {":owner": owner}, "ConsistentRead": True, "Limit": 1000 if manifest else 100}
        if manifest:
            options.update(ProjectionExpression="#ns, #field, writer, #clock", ExpressionAttributeNames={"#ns": "namespace", "#field": "field", "#clock": "clock"})
        cursor = (event.get("queryStringParameters") or {}).get("cursor")
        if cursor:
            try:
                if len(cursor) > 2000:
                    raise ValueError()
                key = json.loads(base64.urlsafe_b64decode(cursor))
                if not isinstance(key, dict) or set(key) != {"pk", "sk"} or key["pk"] != owner or not isinstance(key["sk"], str):
                    raise ValueError()
                options["ExclusiveStartKey"] = key
            except (ValueError, TypeError):
                return response(400, {"error": "Invalid page cursor."})
        page = table().query(**options)
        result = {"entries": [{"version": 2, "namespace": item["namespace"], "field": item["field"], "writer": item["writer"], "clock": int(item["clock"]), **({} if manifest else {"value": json.loads(item["valueJson"])})} for item in page.get("Items", [])]}
        if page.get("LastEvaluatedKey"):
            result["cursor"] = base64.urlsafe_b64encode(json.dumps(page["LastEvaluatedKey"]).encode()).decode()
        return response(200, result)
    headers = {k.lower(): v for k, v in event.get("headers", {}).items()}
    if headers.get("origin") not in os.environ["ALLOWED_ORIGINS"].split(","):
        return response(403, {"error": "This origin is not allowed."})
    if not headers.get("content-type", "").startswith("application/json"):
        return response(415, {"error": "Use JSON."})
    raw = event.get("body") or ""
    if len(raw) > 1400000:
        return response(413, {"error": "Save batch is too large."})
    try:
        if event.get("isBase64Encoded"):
            raw = base64.b64decode(raw, validate=True).decode("utf-8")
        if len(raw.encode()) > 1000000:
            return response(413, {"error": "Save batch is too large."})
        data = json.loads(raw)
        if isinstance(data, dict) and set(data) == {"read"}:
            if not isinstance(data["read"], list) or not 1 <= len(data["read"]) <= 10:
                raise ValueError()
            keys = [{"pk": owner, "sk": validate({**entry, "version": 2, "clock": 0, "value": None})["sk"]} for entry in data["read"] if isinstance(entry, dict)]
            if len(keys) != len(data["read"]) or len({key["sk"] for key in keys}) != len(keys):
                raise ValueError()
            page = table().get_many(keys)
            if page.get("unprocessed"):
                return response(503, {"error": "Couldn’t restore all progress. Please retry."})
            return response(200, {"entries": [{"version": 2, "namespace": item["namespace"], "field": item["field"], "writer": item["writer"], "clock": int(item["clock"]), "value": json.loads(item["valueJson"])} for item in page.get("Items", [])]})
        if not isinstance(data, dict) or not isinstance(data.get("entries"), list) or not 1 <= len(data["entries"]) <= 25:
            raise ValueError()
        items = [validate(entry) for entry in data["entries"]]
    except (ValueError, TypeError, UnicodeError, RecursionError):
        return response(400, {"error": "Invalid save records."})
    db = table()
    for item in items:
        item["pk"] = owner
        try:
            db.put_item(Item=item, ConditionExpression="attribute_not_exists(pk) OR #clock < :clock", ExpressionAttributeNames={"#clock": "clock"}, ExpressionAttributeValues={":clock": item["clock"]})
        except ClientError as error:
            if error.response["Error"]["Code"] != "ConditionalCheckFailedException":
                raise
            # The same or newer revision is already durable; retries are harmless.
    if os.environ.get("COMMUNITY_TABLE") and any(item["namespace"] == "daily" or item["field"].startswith("history.") for item in items):
        dynamodb.Table(os.environ["COMMUNITY_TABLE"]).delete_item(Key={"pk": owner, "sk": "activity-v1"})
    return response(200, {"saved": True})
