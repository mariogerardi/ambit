"""Ambit's feedback API. Bodies, tokens, email addresses and IPs are never logged."""
import base64
import hashlib
import hmac
import json
import os
import re
import time
import uuid

import saves
import community
import journey_schedule
import dynamodb
from botocore.exceptions import ClientError


def table():
    return dynamodb.Table(os.environ["FEEDBACK_TABLE"])


def response(status, body):
    return {"statusCode": status, "headers": {"Content-Type": "application/json", "Cache-Control": "no-store"}, "body": json.dumps(body)}


def claims(event):
    return event.get("requestContext", {}).get("authorizer", {}).get("jwt", {}).get("claims", {})


def admin(event):
    # API Gateway validates the access token; role membership comes from Cognito.
    values = claims(event).get("cognito:groups", [])
    if isinstance(values, str):
        values = values.strip("[]").replace('"', "").replace("'", "").split(",")
    return "admin" in [v.strip() for v in values]


def text(value, maximum, required=False):
    if not isinstance(value, str) or len(value) > maximum or (required and not value.strip()):
        raise ValueError("Invalid field")
    return value.strip()


def validate(data):
    if not isinstance(data, dict):
        raise ValueError("Invalid request")
    identity = str(uuid.UUID(text(data.get("id"), 36, True)))
    kind = data.get("kind")
    category = data.get("category")
    if kind not in ("question", "experience") or category not in ("content", "answer", "globe", "usability", "bug", "idea", "other"):
        raise ValueError("Invalid category")
    message = text(data.get("message", ""), 2000)
    if kind == "experience" and not message:
        raise ValueError("Please include a message")
    context = data.get("context", {})
    if not isinstance(context, dict):
        raise ValueError("Invalid context")
    clean = {}
    for key, limit in {"view": 32, "journeyId": 100, "questionId": 160, "contentVersion": 100, "topic": 32, "targetId": 100, "method": 32, "release": 40, "device": 16, "browser": 32}.items():
        if key in context:
            clean[key] = text(context[key], limit, True)
    if kind == "question" and ("questionId" not in clean or clean.get("view") not in ("journey", "study")):
        raise ValueError("Missing question context")
    return {"id": identity, "kind": kind, "category": category, "message": message, "context": clean}


def submit(event, authenticated=False):
    headers = {k.lower(): v for k, v in event.get("headers", {}).items()}
    # Browser submissions are limited to our origins; quota also covers non-browser clients.
    if headers.get("origin") not in os.environ["ALLOWED_ORIGINS"].split(","):
        return response(403, {"error": "This origin is not allowed."})
    if not headers.get("content-type", "").startswith("application/json"):
        return response(415, {"error": "Use JSON."})
    raw = event.get("body", "") or ""
    if len(raw) > 12000:
        return response(413, {"error": "Your feedback is too long."})
    try:
        if event.get("isBase64Encoded"):
            raw = base64.b64decode(raw, validate=True).decode("utf-8")
        if len(raw.encode()) > 8000:
            return response(413, {"error": "Your feedback is too long."})
        item = validate(json.loads(raw))
    except (ValueError, TypeError, UnicodeError):
        return response(400, {"error": "Please check your feedback and try again."})
    db = table()
    key = f"feedback#{item['id']}"
    if db.get_item(Key={"pk": key}).get("Item"):
        return response(200, {"id": item["id"], "saved": True})
    now = int(time.time())
    ip = event.get("requestContext", {}).get("http", {}).get("sourceIp", "unknown")
    digest = hmac.new(os.environ["RATE_SALT"].encode(), ip.encode(), hashlib.sha256).hexdigest()
    try:
        db.update_item(Key={"pk": f"quota#{now // 3600}#{digest}"},
            UpdateExpression="SET expiresAt = :ttl ADD submissions :one",
            ConditionExpression="attribute_not_exists(submissions) OR submissions < :limit",
            ExpressionAttributeValues={":ttl": now + 7200, ":one": 1, ":limit": 10})
    except ClientError as error:
        if error.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return response(429, {"error": "You've sent several reports. Please try again in an hour."})
        raise
    item.update(pk=key, queue="feedback", createdAt=f"{now:010d}#{item['id']}", status="new", expiresAt=now + 180 * 86400)
    if authenticated:
        item["userId"] = claims(event)["sub"]
    try:
        db.put_item(Item=item, ConditionExpression="attribute_not_exists(pk)")
    except ClientError as error:
        if error.response["Error"]["Code"] != "ConditionalCheckFailedException":
            raise
    return response(201, {"id": item["id"], "saved": True})


def review(event):
    if not admin(event):
        return response(403, {"error": "Admin access required."})
    route = event["routeKey"]
    db = table()
    if route == "GET /admin/feedback":
        query = event.get("queryStringParameters") or {}
        cursor = query.get("cursor")
        options = {"IndexName": "feedback-by-date", "KeyConditionExpression": "queue = :q", "ExpressionAttributeValues": {":q": "feedback"}, "ScanIndexForward": False, "Limit": 30}
        if cursor:
            try:
                if len(cursor) > 1600:
                    raise ValueError()
                key = json.loads(base64.urlsafe_b64decode(cursor))
                if not isinstance(key, dict) or key.get("queue") != "feedback" or not str(key.get("pk", "")).startswith("feedback#"):
                    raise ValueError()
                options["ExclusiveStartKey"] = key
            except (ValueError, TypeError):
                return response(400, {"error": "Invalid page cursor."})
        page = db.query(**options)
        records = [{k: v for k, v in entry.items() if k not in ("pk", "queue", "expiresAt", "userId")} for entry in page.get("Items", [])]
        result = {"items": records}
        if page.get("LastEvaluatedKey"):
            result["cursor"] = base64.urlsafe_b64encode(json.dumps(page["LastEvaluatedKey"]).encode()).decode()
        return response(200, result)
    try:
        identifier = str(uuid.UUID(event["pathParameters"]["id"]))
        data = json.loads(event.get("body") or "{}")
        status = data.get("status")
        if status not in ("new", "reviewed", "resolved"):
            raise ValueError()
    except (ValueError, KeyError, TypeError):
        return response(400, {"error": "Invalid feedback update."})
    try:
        db.update_item(Key={"pk": f"feedback#{identifier}"}, UpdateExpression="SET #s = :s", ConditionExpression="attribute_exists(pk)", ExpressionAttributeNames={"#s": "status"}, ExpressionAttributeValues={":s": status})
    except ClientError as error:
        if error.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return response(404, {"error": "Feedback not found."})
        raise
    return response(200, {"id": identifier, "status": status})


def handler(event, context):
    status = 500
    started = time.monotonic()
    route = event.get("routeKey", "unknown")
    try:
        if route in ("POST /feedback", "POST /account/feedback"):
            result = submit(event, route == "POST /account/feedback")
        elif route in ("GET /admin/feedback", "PATCH /admin/feedback/{id}"):
            result = review(event)
        elif route in ("GET /journeys/schedule", "GET /admin/journeys/schedule", "PATCH /admin/journeys/schedule"):
            result = journey_schedule.handle(event, admin(event))
        elif route in ("GET /account/saves", "POST /account/saves"):
            result = saves.handle(event)
        elif route.startswith(("GET /account/", "POST /account/", "PATCH /account/")):
            result = community.handle(event)
        else:
            result = response(404, {"error": "Not found."})
        status = result["statusCode"]
        return result
    except Exception as error:
        print(json.dumps({"event": "request_failed", "error_type": type(error).__name__, "request_id": context.aws_request_id}))
        return response(500, {"error": "Couldn't complete the request. Please try again."})
    finally:
        print(json.dumps({"event": "api_request", "service": "ambit-api", "env": os.environ.get("APP_ENV", "production"), "version": os.environ.get("RELEASE", "unknown"), "route": route, "status": status, "duration_ms": round((time.monotonic() - started) * 1000, 1), "request_id": context.aws_request_id}))
