"""Shared date assignments. Only authenticated admins may edit; writes are conditional."""
import json
import re
from datetime import date
from pathlib import Path

import community

catalog = Path(__file__).with_name("journey-index.json")
if not catalog.exists():
    catalog = Path(__file__).resolve().parents[1] / "src" / "game" / "journeyIndex.json"
JOURNEYS = {item["id"] for item in json.loads(catalog.read_text())}
OWNER, KIND = "journey-schedule", "published"


def handle(event, is_admin=False):
    if event["routeKey"] != "GET /journeys/schedule" and not is_admin:
        return community.response(403, {"error": "Admin access required."})
    previous = community.get(OWNER, KIND)
    current = previous or {"revision": 0, "assignments": {}}
    if event["routeKey"] == "GET /journeys/schedule":
        return community.response(200, current)
    try:
        raw = event.get("body") or "{}"
        if event.get("isBase64Encoded") or len(raw) > 2000:
            raise ValueError()
        data = json.loads(raw)
        if not isinstance(data, dict):
            raise ValueError()
        day = data.get("date")
        if not isinstance(day, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", day):
            raise ValueError()
        date.fromisoformat(day)
        journey = data.get("journeyId")
        if journey is not None and (not isinstance(journey, str) or journey not in JOURNEYS):
            raise ValueError()
        revision = data.get("revision")
        if type(revision) is not int or revision < 0:
            raise ValueError()
    except (ValueError, TypeError):
        return community.response(400, {"error": "Choose a valid date and published Journey."})
    if revision != current["revision"]:
        return community.response(409, {"error": "The schedule changed. Refresh before saving again."})
    assignments = dict(current["assignments"])
    if journey is None:
        assignments.pop(day, None)
    else:
        assignments[day] = journey
    if len(assignments) > 1000:
        return community.response(400, {"error": "The schedule can hold up to 1,000 assigned dates."})
    updated = {"revision": revision + 1, "assignments": assignments}
    try:
        community.transact([community.put(OWNER, KIND, updated, previous)])
    except community.Problem as error:
        return community.response(error.status, {"error": "The schedule changed. Refresh before saving again."})
    return community.response(200, updated)
