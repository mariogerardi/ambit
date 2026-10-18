"""Scheduled daily lock; the public schedule read provides the same fallback."""
import json
import os
import urllib.request

from journey_schedule import current_day, lock


def event(status, day):
    payload = {"title": f"Ambit daily Journey {status}", "text": f"Daily Journey {status} for {day}", "tags": ["project:ambit", "service:ambit-api", f"status:{status}", f"env:{os.environ.get('APP_ENV', 'unknown')}"]}
    print(json.dumps({"event": "journey_lock", "status": status, "day": day}))
    secret = os.environ.get("DD_API_KEY_SECRET_ARN")
    if not secret:
        return
    import boto3
    key = boto3.client("secretsmanager").get_secret_value(SecretId=secret)["SecretString"]
    request = urllib.request.Request(f"https://api.{os.environ.get('DD_SITE', 'datadoghq.com')}/api/v1/events", data=json.dumps(payload).encode(), headers={"Content-Type": "application/json", "DD-API-KEY": key}, method="POST")
    with urllib.request.urlopen(request, timeout=4):
        pass


def handler(event_input, context):
    day = current_day().isoformat()
    try:
        record, created = lock(day)
    except Exception:
        try:
            event("failed", day)
        finally:
            raise
    try:
        event("locked", day)
    except Exception as error:
        print(json.dumps({"event": "journey_lock_event_failed", "errorType": type(error).__name__}))
    return {"day": day, "journeyId": record["journeyId"], "created": created}
