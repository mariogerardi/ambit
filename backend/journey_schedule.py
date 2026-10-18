"""Durable New York daily choices. Automatic picks are fixed per day; today remains editable."""
import json
import re
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import community

catalog_path = Path(__file__).with_name("journey-index.json")
if not catalog_path.exists():
    catalog_path = Path(__file__).resolve().parents[1] / "src" / "game" / "journeyIndex.json"
CATALOG = {item["id"]: item for item in json.loads(catalog_path.read_text())}
OWNER = "journey-schedule"
FIRST_DAY = date(2026, 10, 5)
SCHEDULE_VERSION = 2
NO_REPEAT_DAYS = 14


def current_day():
    return datetime.now(ZoneInfo("America/New_York")).date()


def parse_day(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError("Invalid date")
    return date.fromisoformat(value)


def day_key(day):
    return "day:" + day


def hash_date(day):
    """FNV-1a 32-bit over the ASCII YYYY-MM-DD date, version 1."""
    value = 2166136261
    for character in day:
        value = ((value ^ ord(character)) * 16777619) & 0xffffffff
    return value


def successor(journey_id, catalog=CATALOG):
    matches = [item["id"] for item in catalog.values() if item.get("supersedes") == journey_id]
    return sorted(matches)[0] if matches else journey_id


def choose(day, records, catalog=CATALOG, memo=None):
    """Resolve a stored choice or deterministic provisional pick, independent of index order."""
    if memo is None:
        memo = {}
    if day in memo:
        return memo[day]
    candidates = sorted(item["id"] for item in catalog.values() if item.get("availability") == "pool")
    if not candidates:
        raise ValueError("No pool Journeys are available")
    target = parse_day(day)
    today = current_day().isoformat()
    current = min(FIRST_DAY, target)
    while current <= target:
        key = current.isoformat()
        if key not in memo:
            record = records.get(key)
            if record and record.get("source") in ("assigned", "auto") and record.get("journeyId"):
                resolved = successor(record["journeyId"], catalog)
                if resolved in catalog or key < today:
                    memo[key] = resolved
                else:
                    print(json.dumps({"event": "journey_schedule_unavailable", "day": key}))
            if key not in memo:
                recent = [memo[(current - timedelta(days=offset)).isoformat()]
                          for offset in range(1, min(NO_REPEAT_DAYS, (current - FIRST_DAY).days) + 1)]
                for window in range(len(recent), -1, -1):
                    eligible = [item for item in candidates if item not in recent[:window]]
                    if len(eligible) >= (2 if len(candidates) > 2 else 1):
                        memo[key] = eligible[hash_date(key) % len(eligible)]
                        break
        current += timedelta(days=1)
    return memo[day]


def stored(first, last):
    return {row["day"]: row for row in community.date_rows(OWNER, day_key(first), day_key(last))}


def lock(day=None, attempt=0):
    """Conditional, idempotent daily write shared by Scheduler and GET fallback."""
    day = day or current_day().isoformat()
    prior = community.get(OWNER, day_key(day))
    if prior and prior.get("lockedAt") and prior.get("source") in ("assigned", "auto"):
        return prior, False
    history = stored(FIRST_DAY.isoformat(), day)
    history.pop(day, None)
    automatic = choose(day, history)
    now = datetime.now(ZoneInfo("America/New_York")).isoformat()
    if prior and prior.get("source") == "assigned":
        updated = {**prior, "autoJourneyId": prior.get("autoJourneyId") or automatic, "lockedAt": now, "revision": prior["revision"] + 1}
    else:
        updated = {"day": day, "journeyId": automatic, "source": "auto", "autoJourneyId": automatic, "lockedAt": now, "revision": (prior or {}).get("revision", 0) + 1, **({"changes": prior["changes"]} if prior and prior.get("changes") else {})}
    try:
        community.transact([community.put(OWNER, day_key(day), updated, prior)])
        return updated, True
    except community.Problem:
        winner = community.get(OWNER, day_key(day))
        if winner and winner.get("lockedAt") and winner.get("source") in ("assigned", "auto"):
            return winner, False
        if attempt < 2:
            return lock(day, attempt + 1)
        raise


def response_records(first, last):
    return stored(first, last)


def response_payload(records, today):
    # The previously deployed web client reads these two legacy fields during
    # the coordinated backend-first cutover. New clients read per-day records.
    assignments = {day: successor(record["journeyId"]) for day, record in records.items()
                   if record.get("source") in ("assigned", "auto") and record.get("journeyId") and
                   successor(record.get("journeyId")) in CATALOG}
    return {"records": records, "today": today, "assignments": assignments, "revision": 0}


def handle(event, is_admin=False):
    route = event["routeKey"]
    if route != "GET /journeys/schedule" and not is_admin:
        return community.response(403, {"error": "Admin access required."})
    today = current_day().isoformat()
    if route == "GET /journeys/schedule":
        try:
            lock(today)
            params = event.get("queryStringParameters") or {}
            first = parse_day(params.get("from", (current_day() - timedelta(days=14)).isoformat()))
            last = parse_day(params.get("to", (current_day() + timedelta(days=45)).isoformat()))
            if last < first or (last - first).days > 120:
                raise ValueError("Date range is too large")
        except ValueError:
            return community.response(400, {"error": "Choose a valid date range."})
        # Future provisional picks depend on intervening assignments. Include
        # the locked two-week anchor and all stored choices up to the window.
        anchor = min(first, current_day() - timedelta(days=14))
        return community.response(200, response_payload(response_records(anchor.isoformat(), last.isoformat()), today))
    if route == "GET /admin/journeys/schedule":
        lock(today)
        return community.response(200, response_payload(response_records(FIRST_DAY.isoformat(), "9999-12-31"), today))
    try:
        raw = event.get("body") or "{}"
        if event.get("isBase64Encoded") or len(raw) > 2000:
            raise ValueError()
        data = json.loads(raw)
        day = data.get("date")
        parse_day(day)
        if day < today and data.get("rewriteHistory") is not True:
            return community.response(409, {"error": "Rewriting a past day requires explicit confirmation."})
        journey = data.get("journeyId")
        if journey is not None and (not isinstance(journey, str) or journey not in CATALOG):
            raise ValueError()
        revision = data.get("revision")
        if type(revision) is not int or revision < 0:
            raise ValueError()
    except (ValueError, TypeError, AttributeError):
        return community.response(400, {"error": "Choose a valid date and published Journey."})
    prior = community.get(OWNER, day_key(day))
    if revision != (prior or {}).get("revision", 0):
        return community.response(409, {"error": "The schedule changed. Refresh before saving again."})
    if journey is not None:
        updated = {"day": day, "journeyId": journey, "source": "assigned", "revision": revision + 1, **({"lockedAt": prior["lockedAt"]} if prior and prior.get("lockedAt") else {}), **({"autoJourneyId": prior["autoJourneyId"]} if prior and prior.get("autoJourneyId") else {})}
    elif day <= today:
        history = stored(FIRST_DAY.isoformat(), day)
        history.pop(day, None)
        automatic = (prior or {}).get("autoJourneyId") or choose(day, history)
        updated = {"day": day, "journeyId": automatic, "autoJourneyId": automatic, "source": "auto", "lockedAt": (prior or {}).get("lockedAt") or datetime.now(ZoneInfo("America/New_York")).isoformat(), "revision": revision + 1}
    else:
        # A revisioned tombstone prevents an old Admin tab from recreating a cleared assignment.
        updated = {"day": day, "journeyId": None, "source": "provisional", "revision": revision + 1}
    changes = list((prior or {}).get("changes", []))
    if len(changes) >= 100:
        return community.response(409, {"error": "This day has too many edits; review its history before changing it again."})
    changes.append({"at": datetime.now(ZoneInfo("America/New_York")).isoformat(), "from": (prior or {}).get("journeyId"), "to": updated["journeyId"], "source": updated["source"]})
    updated["changes"] = changes
    try:
        community.transact([community.put(OWNER, day_key(day), updated, prior)])
    except community.Problem:
        return community.response(409, {"error": "The schedule changed. Refresh before saving again."})
    return community.response(200, response_payload(response_records((parse_day(day) - timedelta(days=14)).isoformat(), (parse_day(day) + timedelta(days=45)).isoformat()), today))
