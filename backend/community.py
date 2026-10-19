"""Profiles and mutual-friend activity. Caller identity always comes from the JWT.

Handle reservations and reciprocal inboxes use conditional transactions. Private
save bodies never leave this module: friends receive only completed score totals.
"""
import base64
import json
import math
import os
import re
import secrets
import time
import uuid
from datetime import date, timedelta
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

try:
    from ddtrace import tracer
except ImportError:
    tracer = None

COUNTRIES = set(json.loads(Path(__file__).with_name("study-countries.json").read_text()))
AVATAR_CATALOG = Path(__file__).with_name("profile-avatars.json")
if not AVATAR_CATALOG.exists():
    AVATAR_CATALOG = Path(__file__).resolve().parents[1] / "shared" / "profile-avatars.json"
AVATARS = set(json.loads(AVATAR_CATALOG.read_text()))

import dynamodb
from botocore.exceptions import ClientError


class Problem(Exception):
    def __init__(self, status, message, **details):
        self.status, self.message, self.details = status, message, details


def tag_count(name, count):
    try:
        span = tracer.current_span() if tracer else None
        if span:
            span.set_tag(name, count)
    except Exception:
        # Telemetry must not interrupt account access.
        pass


def table():
    return dynamodb.Table(os.environ["COMMUNITY_TABLE"])


def response(status, body):
    return {"statusCode": status, "headers": {"Content-Type": "application/json", "Cache-Control": "no-store"}, "body": json.dumps(body)}


def key(owner, kind):
    return {"pk": owner, "sk": kind}


def get(owner, kind):
    item = table().get_item(Key=key(owner, kind), ConsistentRead=True).get("Item")
    return json.loads(item["dataJson"]) if item else None


def batch_get(addresses):
    """Strongly consistent community lookups, with bounded partial-result retries."""
    addresses = list(dict.fromkeys(addresses))
    if not addresses:
        return {}
    name = os.environ["COMMUNITY_TABLE"]
    pending = {name: {"Keys": [encoded(key(*address)) for address in addresses], "ConsistentRead": True}}
    result = {}
    for attempt in range(4):
        page = dynamodb.client.batch_get_item(RequestItems=pending)
        for item in page.get("Responses", {}).get(name, []):
            result[(item["pk"]["S"], item["sk"]["S"])] = json.loads(item["dataJson"]["S"])
        pending = page.get("UnprocessedKeys", {})
        if not pending:
            return result
        if attempt < 3:
            time.sleep(0.05 * 2 ** attempt)
    raise Problem(503, "Couldn’t load account data. Please try again.")


def packed(owner, kind, value):
    return {**key(owner, kind), "dataJson": json.dumps(value, sort_keys=True, separators=(",", ":"))}


def encoded(values):
    # Community records consist only of string keys and serialized JSON payloads.
    return {k: {"S": v} for k, v in values.items()}


def put(owner, kind, value, previous=None):
    operation = {"TableName": os.environ["COMMUNITY_TABLE"], "Item": encoded(packed(owner, kind, value)), "ConditionExpression": "attribute_not_exists(pk)"}
    if previous is not None:
        operation.update(ConditionExpression="dataJson = :old", ExpressionAttributeValues={":old": {"S": packed(owner, kind, previous)["dataJson"]}})
    return {"Put": operation}


def delete(owner, kind):
    return {"Delete": {"TableName": os.environ["COMMUNITY_TABLE"], "Key": encoded(key(owner, kind))}}


def transact(operations):
    try:
        dynamodb.client.transact_write_items(TransactItems=operations)
    except ClientError as error:
        if error.response["Error"]["Code"] == "TransactionCanceledException":
            raise Problem(409, "This changed in another session, or that handle is taken. Refresh and try again.") from None
        raise


def rows(owner, prefix, maximum=200):
    result, cursor = [], None
    while len(result) < maximum:
        options = {"KeyConditionExpression": "pk = :owner AND begins_with(sk, :prefix)", "ExpressionAttributeValues": {":owner": owner, ":prefix": prefix}, "ConsistentRead": True, "Limit": min(100, maximum - len(result)), "ScanIndexForward": False}
        if cursor:
            options["ExclusiveStartKey"] = cursor
        page = table().query(**options)
        result.extend(json.loads(item["dataJson"]) for item in page.get("Items", []))
        cursor = page.get("LastEvaluatedKey")
        if not cursor:
            break
    return result


def date_rows(owner, first, last):
    """Read an inclusive sort-key date range, following DynamoDB pagination."""
    result, cursor = [], None
    while True:
        options = {"KeyConditionExpression": "pk = :owner AND sk BETWEEN :first AND :last", "ExpressionAttributeValues": {":owner": owner, ":first": first, ":last": last}, "ConsistentRead": True}
        if cursor:
            options["ExclusiveStartKey"] = cursor
        page = table().query(**options)
        result.extend(json.loads(item["dataJson"]) for item in page.get("Items", []))
        cursor = page.get("LastEvaluatedKey")
        if not cursor:
            return result


def string(value, maximum, required=False):
    if not isinstance(value, str) or len(value) > maximum or any(ord(c) < 32 for c in value) or (required and not value.strip()):
        raise Problem(400, "Please check the profile fields.")
    return value.strip()


def settings(value, challenge=False):
    if not isinstance(value, dict):
        raise Problem(400, "Choose valid Study settings.")
    topics = value.get("topics")
    styles = value.get("styles")
    countries = value.get("countryIds")
    if not isinstance(topics, list) or not 1 <= len(topics) <= 3 or len(set(topics)) != len(topics) or any(t not in ("countries", "capitals", "flags") for t in topics):
        raise Problem(400, "Choose valid Study topics.")
    if not isinstance(styles, dict) or set(styles) != {"countries", "capitals", "flags"} or any(v not in ("map", "typing", "choices", "mixed") for v in styles.values()):
        raise Problem(400, "Choose valid answer methods.")
    if not isinstance(countries, list) or len(countries) > 193 or any(not isinstance(c, str) or c not in COUNTRIES for c in countries):
        raise Problem(400, "Choose valid countries.")
    if value.get("scope") not in ("all", "continent", "custom") or value.get("continent") not in ("AF", "AS", "EU", "NA", "SA", "OC") or (value.get("scope") == "custom" and not countries):
        raise Problem(400, "Choose a Study area.")
    length = value.get("length")
    if (type(length) is not int or length not in (10, 20, 50)) and length not in ("all", "continuous"):
        raise Problem(400, "Choose a valid session length.")
    if challenge and (type(length) is not int or length not in (10, 20, 50)):
        raise Problem(400, "Challenges need 10, 20, or 50 questions.")
    clean = {k: value[k] for k in ("topics", "styles", "countryIds", "scope", "continent", "length")}
    for k in ("borders", "countryNames", "capitalMarkers", "capitalNames", "autoAdvance"):
        if type(value.get(k)) is not bool:
            raise Problem(400, "Choose valid Study preferences.")
        clean[k] = value[k]
    for k, default in (("perTopicMethods", False), ("revisitMissed", False)):
        if type(value.get(k, default)) is not bool:
            raise Problem(400, "Choose valid Study preferences.")
        clean[k] = value.get(k, default)
    choices = value.get("choiceCount", 6)
    distractors = value.get("capitalDistractors", "study")
    if type(choices) is not int or choices not in range(2, 7) or distractors not in ("study", "region", "countryCities", "globalCities", "globalCapitals"):
        raise Problem(400, "Choose valid multiple-choice options.")
    clean.update(choiceCount=choices, capitalDistractors=distractors)
    if challenge:
        clean["revisitMissed"] = False
    return clean


def public_profile(subject):
    profile = get("user#" + subject, "profile")
    return {"id": subject, **{k: profile[k] for k in ("displayName", "handle", "avatar", "favoriteRegion", "bio")}} if profile else None


def normalized_handle(value):
    handle = string(value, 24, True).lower()
    if not re.fullmatch(r"[a-z][a-z0-9_]{2,23}", handle):
        raise Problem(400, "Handles need 3–24 letters, numbers, or underscores and must start with a letter.")
    return handle


def handle_availability(subject, value):
    handle = normalized_handle(value)
    owner = get("handle#" + handle, "owner")
    available = not owner or owner["id"] == subject
    suggestions = []
    if not available:
        for suffix in ("_explorer", "_atlas", "_world", "_2", "_3"):
            candidate = handle[:24 - len(suffix)] + suffix
            if not get("handle#" + candidate, "owner"):
                suggestions.append(candidate)
            if len(suggestions) == 3:
                break
    return {"handle": handle, "available": available, "suggestions": suggestions}


def handle_collision(subject, handle):
    availability = handle_availability(subject, handle)
    if not availability["available"]:
        raise Problem(409, "That handle is already in use. Choose another.", field="handle", suggestions=availability["suggestions"])


def save_profile(subject, body):
    owner = "user#" + subject
    handle = normalized_handle(body.get("handle"))
    records = batch_get([(owner, "profile"), ("handle#" + handle, "owner")])
    old = records.get((owner, "profile"))
    reservation = records.get(("handle#" + handle, "owner"))
    if reservation and reservation["id"] != subject:
        handle_collision(subject, handle)
    avatar = body.get("avatar", "globe")
    if not isinstance(avatar, str) or not (avatar in AVATARS or (avatar.startswith("flag:") and avatar[5:] in COUNTRIES)):
        raise Problem(400, "Choose an avatar.")
    if type(body.get("shareJourneyScores", False)) is not bool:
        raise Problem(400, "Choose whether to share Journey scores.")
    if type(body.get("revision", 0)) is not int or body.get("revision", 0) != (old or {}).get("revision", 0):
        raise Problem(409, "Your profile changed on another device. Refresh before saving.")
    presets = body.get("presets", [])
    if not isinstance(presets, list) or len(presets) > 20:
        raise Problem(400, "You can save up to 20 Study presets.")
    clean_presets = []
    for preset in presets:
        if not isinstance(preset, dict):
            raise Problem(400, "Choose valid presets.")
        identifier = str(uuid.UUID(preset.get("id", "")))
        clean_presets.append({"id": identifier, "name": string(preset.get("name"), 60, True), "settings": settings(preset.get("settings"))})
    if len({p["id"] for p in clean_presets}) != len(clean_presets):
        raise Problem(400, "Each preset needs its own identifier.")
    value = {"id": subject, "displayName": string(body.get("displayName"), 40, True), "handle": handle, "avatar": avatar, "favoriteRegion": string(body.get("favoriteRegion", ""), 60), "bio": string(body.get("bio", ""), 160), "shareJourneyScores": True, "presets": clean_presets, "revision": (old or {}).get("revision", 0) + 1}
    tag_count("profile.presets.count", len(clean_presets))
    operations = [put(owner, "profile", value, old)]
    if not old or old["handle"] != handle:
        operations.append(put("handle#" + handle, "owner", {"id": subject}))
        if old:
            operations.append(delete("handle#" + old["handle"], "owner"))
    try:
        transact(operations)
    except Problem as error:
        if error.status == 409:
            # A preflight check cannot reserve a handle. The transaction is authoritative.
            handle_collision(subject, handle)
        raise
    return value


def pair(a, b):
    return "pair#" + "#".join(sorted([a, b]))


def relationship(a, b):
    return get(pair(a, b), "relation")


def require_friend(a, b):
    relation = relationship(a, b)
    if not relation or relation["status"] != "accepted":
        raise Problem(403, "This feature is available to accepted friends.")
    return relation


def friend_action(subject, other, action):
    if not isinstance(other, str) or not other or len(other) > 200 or subject == other:
        raise Problem(400, "Choose another player.")
    previous = relationship(subject, other)
    owner, left, right = pair(subject, other), "user#" + subject, "user#" + other
    if action == "request":
        if not public_profile(subject):
            raise Problem(400, "Save your profile before adding friends.")
        if previous:
            if previous["status"] == "blocked":
                raise Problem(404, "That player is unavailable.")
            return {"saved": True}
        existing = rows(left, "friend#")
        if len(existing) >= 200 or sum(r["status"] == "outgoing" for r in existing) >= 20:
            raise Problem(429, "Please resolve your existing friend requests first.")
        if len(rows(right, "friend#")) >= 200:
            raise Problem(429, "That player’s friends list is full right now.")
        value = {"status": "requested", "requester": subject}
        transact([put(owner, "relation", value), put(left, "friend#" + other, {"id": other, "status": "outgoing"}), put(right, "friend#" + subject, {"id": subject, "status": "incoming"})])
    elif action == "accept":
        if not previous or previous["status"] != "requested" or previous["requester"] == subject:
            raise Problem(403, "Only the recipient can accept this request.")
        value = {**previous, "status": "accepted"}
        transact([put(owner, "relation", value, previous), put(left, "friend#" + other, {"id": other, "status": "accepted"}, {"id": other, "status": "incoming"}), put(right, "friend#" + subject, {"id": subject, "status": "accepted"}, {"id": subject, "status": "outgoing"})])
    elif action == "block":
        if previous and previous["status"] == "blocked" and previous["blockedBy"] != subject:
            raise Problem(404, "That player is unavailable.")
        link = get(left, "friend#" + other)
        transact([put(owner, "relation", {"status": "blocked", "blockedBy": subject}, previous), put(left, "friend#" + other, {"id": other, "status": "blocked"}, link), delete(right, "friend#" + subject)])
    elif action in ("remove", "decline", "cancel", "unblock"):
        valid = previous and ((action == "remove" and previous["status"] == "accepted") or (action == "decline" and previous["status"] == "requested" and previous["requester"] != subject) or (action == "cancel" and previous["status"] == "requested" and previous["requester"] == subject) or (action == "unblock" and previous["status"] == "blocked" and previous["blockedBy"] == subject))
        if not valid:
            raise Problem(403, "You cannot change this request.")
        # Conditional deletion prevents a stale inbox from deleting a newer block.
        deletion = delete(owner, "relation")
        deletion["Delete"].update(ConditionExpression="dataJson = :old", ExpressionAttributeValues={":old": {"S": packed(owner, "relation", previous)["dataJson"]}})
        transact([deletion, delete(left, "friend#" + other), delete(right, "friend#" + subject)])
    else:
        raise Problem(400, "Choose a valid friend action.")
    return {"saved": True}


def saved_records(subject):
    db = dynamodb.Table(os.environ["SAVES_TABLE"])
    values, cursor = {}, None
    # Match private save register semantics; never expose registers or answers.
    for _ in range(10):
        options = {"KeyConditionExpression": "pk = :owner", "ExpressionAttributeValues": {":owner": "user#" + subject}, "ProjectionExpression": "#ns, #field, writer, #clock, valueJson", "ExpressionAttributeNames": {"#ns": "namespace", "#field": "field", "#clock": "clock"}, "ConsistentRead": True, "Limit": 100}
        if cursor:
            options["ExclusiveStartKey"] = cursor
        page = db.query(**options)
        for item in page.get("Items", []):
            address = (item["namespace"], item["field"], item["writer"])
            if address not in values or int(item["clock"]) > int(values[address]["clock"]):
                values[address] = item
        cursor = page.get("LastEvaluatedKey")
        if not cursor:
            break
    if cursor:
        raise Problem(503, "There’s a lot of progress to catch up on. Please try again later.")
    return list(values.values())


def saved_values(subject, namespace, field=None):
    return [json.loads(item["valueJson"]) for item in saved_records(subject) if item["namespace"] == namespace and (not field or item["field"] == field)]


def journey_points(answers, usage):
    """Rewards are separate from correctness; old answers keep prior full credit."""
    points, legacy = 0, False
    for answer in answers:
        if not isinstance(answer, dict):
            continue
        old = "pointsVersion" not in answer and "points" not in answer
        legacy = legacy or old
        if answer.get("correct") is not True:
            continue
        if old:
            points += 3
        elif answer.get("pointsVersion") == 1 and type(answer.get("points")) is int and 0 <= answer["points"] <= 3:
            stage = usage.get(answer.get("roundId")) if isinstance(usage, dict) else None
            ceiling = 1 if stage == "assisted" else 2 if stage == "hinted" else 3
            points += min(answer["points"], ceiling)
    return min(15, points), legacy


def progress_summary(subject, fresh=False, cached_records=None):
    cached = None if fresh else (get("user#" + subject, "activity-v1") if cached_records is None else cached_records.get(("user#" + subject, "activity-v1")))
    now = int(time.time())
    if not fresh and cached and 0 <= now - cached.get("updatedAt", 0) < 60:
        return cached
    attempts, studies, resets = {}, {}, {}
    records = saved_records(subject)
    for record in records:
        if record["namespace"] == "daily" and record["field"].startswith("reset."):
            cutoff = json.loads(record["valueJson"])
            if type(cutoff) is int and 0 <= cutoff <= 9007199254740991:
                key = record["field"][6:]
                resets[key] = max(resets.get(key, 0), cutoff)
    for record in records:
        value = json.loads(record["valueJson"])
        if not isinstance(value, dict):
            continue
        if record["namespace"] == "daily" and isinstance(value.get("game"), dict):
            identity = (value.get("date"), value.get("journeyId"))
            if not all(isinstance(v, str) for v in identity):
                continue
            try:
                date.fromisoformat(identity[0])
            except ValueError:
                continue
            game = value["game"]
            started = value.get("startedAt", 0)
            version = value.get("scheduleVersion", 1)
            if game.get("phase") not in ("home", "playing", "feedback", "finished", "failed") or not isinstance(game.get("answers", []), list) or len(game.get("answers", [])) > 5 or type(started) not in (int, float) or not math.isfinite(started) or type(version) is not int or version < 1:
                continue
            cutoff = resets.get("/".join(identity))
            if cutoff is not None and started <= cutoff:
                continue
            prior = attempts.get(identity)
            rank = lambda a: (a.get("startedAt", 0), len(a["game"].get("answers", [])), a["game"].get("phase") in ("finished", "failed"))
            preferred = value if not prior or rank(value) > rank(prior) else prior
            if prior and prior.get("runId") == value.get("runId") and prior.get("startedAt", 0) == started and prior.get("scheduleVersion", 1) == version:
                usage = {}
                for candidate in (prior, value):
                    help_used = candidate["game"].get("help", {})
                    if isinstance(help_used, dict):
                        for identifier, stage in help_used.items():
                            if stage in ("hinted", "assisted") and usage.get(identifier) != "assisted":
                                usage[identifier] = stage
                if usage:
                    preferred = {**preferred, "game": {**preferred["game"], "help": usage}}
                completion_days = [candidate.get("completedOn") for candidate in (prior, value) if isinstance(candidate.get("completedOn"), str)]
                if completion_days:
                    preferred = {**preferred, "completedOn": min(completion_days)}
            attempts[identity] = preferred
        elif record["namespace"] == "study" and record["field"].startswith("history.") and isinstance(value.get("session"), dict):
            if not isinstance(value["session"].get("history", []), list) or not isinstance(value["session"].get("settings", {}), dict):
                continue
            identifier = record["field"]
            prior = studies.get(identifier)
            if not prior or len(value["session"].get("history", [])) > len(prior["session"].get("history", [])):
                studies[identifier] = value
    activity = []
    for (day, journey), attempt in sorted(attempts.items(), reverse=True):
        game = attempt["game"]
        answers = game.get("answers", [])
        if not isinstance(answers, list) or len(answers) > 5:
            continue
        completed = game.get("phase") in ("finished", "failed")
        activity.append({"date": day, "journeyId": journey, "gameId": "journey", "gameVersion": attempt.get("scheduleVersion", 1), "status": "completed" if completed else "not_started" if game.get("phase") == "home" else "in_progress", "correct": sum(a.get("correct") is True for a in answers if isinstance(a, dict)) if completed else None, "total": 5, "startedAt": attempt.get("startedAt", 0)})
        activity[-1]["streakEligible"] = attempt.get("completedOn", day) == day
        usage = game.get("help", {})
        if completed:
            points, legacy = journey_points(answers, usage)
            activity[-1].update({"points": points, "maxPoints": 15, "legacyPoints": legacy})
        if completed and isinstance(usage, dict):
            # Only aggregate help for answered rounds; never disclose IDs, clues or inputs.
            answered = {a.get("roundId") for a in answers if isinstance(a, dict) and isinstance(a.get("roundId"), str)}
            stages = [usage.get(identifier) for identifier in answered if usage.get(identifier) in ("hinted", "assisted")]
            if stages:
                assists = stages.count("assisted")
                activity[-1]["help"] = {"hints": len(stages), "assists": assists, "status": "assisted" if assists else "hinted"}
    completed_studies, correct, questions = 0, 0, 0
    for record in studies.values():
        session = record["session"]
        answers = session.get("history", [])
        if not isinstance(answers, list):
            continue
        answers = [a for a in answers if isinstance(a, dict) and type(a.get("correct")) is bool]
        questions += len(answers)
        correct += sum(a["correct"] for a in answers)
        length = session.get("settings", {}).get("length")
        complete = (type(length) is int and len(answers) >= length) or (length == "all" and not session.get("remaining") and bool(answers) and isinstance(answers[-1].get("prompt"), dict) and isinstance(session.get("prompt"), dict) and answers[-1]["prompt"].get("ordinal") == session["prompt"].get("ordinal"))
        completed_studies += session.get("phase") == "summary" and complete
    value = {"updatedAt": now, "activity": activity, "studySessions": completed_studies, "studyQuestions": questions, "studyAccuracy": int(100 * correct / questions + 0.5) if questions else None}
    if not fresh:
        # Fresh viewer reads only gate disclosure; avoid rewriting this cache on every GET.
        table().put_item(Item=packed("user#" + subject, "activity-v1", value))
    return value


def activity_date(params):
    value = (params or {}).get("date", date.today().isoformat())
    try:
        if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            raise ValueError()
        date.fromisoformat(value)
    except ValueError:
        raise Problem(400, "Choose a valid Journey date.") from None
    return value


def shared_activity(summary, viewer, today):
    completed = [a for a in summary["activity"] if a["status"] == "completed"]
    finished = {(a["date"], a["journeyId"], a["gameVersion"]) for a in viewer["activity"] if a["status"] == "completed"}
    days = {date.fromisoformat(a["date"]) for a in completed if a.get("streakEligible", True)}
    day, streak = date.fromisoformat(today), 0
    if day not in days:
        day -= timedelta(days=1)
    while day in days:
        streak += 1
        day -= timedelta(days=1)
    daily = max((a for a in summary["activity"] if a["date"] == today), key=lambda a: a["startedAt"], default=None)
    today_status = {"date": today, "status": daily["status"] if daily else "not_started", "scoreLocked": bool(daily and daily["status"] == "completed" and (today, daily["journeyId"], daily["gameVersion"]) not in finished)}
    if daily:
        today_status["journeyId"] = daily["journeyId"]
        if daily["status"] == "completed" and not today_status["scoreLocked"]:
            today_status["score"] = {k: daily[k] for k in ("date", "journeyId", "gameId", "gameVersion", "correct", "total", "help", "points", "maxPoints", "legacyPoints") if k in daily}
    # Lock historical results by Journey identity too, including admin overrides.
    scores = [{k: a[k] for k in ("date", "journeyId", "gameId", "gameVersion", "correct", "total", "help", "points", "maxPoints", "legacyPoints") if k in a} for a in completed if (a["date"], a["journeyId"], a["gameVersion"]) in finished][:30]
    return {"today": today_status, "stats": {"journeyStreak": streak, "journeysCompleted": len(completed), "studySessions": summary["studySessions"], "studyQuestions": summary["studyQuestions"], "studyAccuracy": summary["studyAccuracy"]}, "journeys": scores}


def friend_activity(subject, other, viewer, today):
    records = batch_get([(pair(subject, other), "relation"), ("user#" + other, "profile"), ("user#" + other, "activity-v1")])
    if (records.get((pair(subject, other), "relation")) or {}).get("status") != "accepted":
        raise Problem(403, "This feature is available to accepted friends.")
    profile = records.get(("user#" + other, "profile"))
    if not profile:
        raise Problem(404, "This profile is unavailable.")
    player = {"id": other, **{k: profile[k] for k in ("displayName", "handle", "avatar", "favoriteRegion", "bio")}}
    with ThreadPoolExecutor(max_workers=2) as executor:
        summary = executor.submit(progress_summary, other, cached_records=records)
        if viewer is None:
            viewer = progress_summary(subject, fresh=True)
        value = {"player": player, **shared_activity(summary.result(), viewer, today)}
    require_friend(subject, other)
    return value


def activity_page(subject, params):
    today = activity_date(params)
    cursor = (params or {}).get("cursor", "")
    if not isinstance(cursor, str) or len(cursor) > 200:
        raise Problem(400, "Invalid friends cursor.")
    # Start the viewer's independent save Query while listing friends and batching their records.
    with ThreadPoolExecutor(max_workers=8) as executor:
        viewer_future = executor.submit(progress_summary, subject, fresh=True)
        accepted = sorted((r for r in rows("user#" + subject, "friend#") if r["status"] == "accepted"), key=lambda r: r["id"])
        selected = [r for r in accepted if r["id"] > cursor][:24]
        tag_count("friends.count", len(accepted))
        tag_count("friends.page_count", len(selected))
        addresses = [(owner, kind) for entry in selected for owner, kind in (
            (pair(subject, entry["id"]), "relation"),
            ("user#" + entry["id"], "profile"),
            ("user#" + entry["id"], "activity-v1"),
        )]
        records = batch_get(addresses)
        def read_entry(entry):
            other = entry["id"]
            relation = records.get((pair(subject, other), "relation"))
            profile = records.get(("user#" + other, "profile"))
            if not relation or relation["status"] != "accepted" or not profile:
                return None
            player = {"id": other, **{k: profile[k] for k in ("displayName", "handle", "avatar", "favoriteRegion", "bio")}}
            return {"player": player, "summary": progress_summary(other, cached_records=records)}
        summaries = [entry for entry in executor.map(read_entry, selected) if entry]
        viewer = viewer_future.result()
    # Recheck access after reading private saves so a concurrent block stays private.
    relations = batch_get([(pair(subject, entry["player"]["id"]), "relation") for entry in summaries])
    entries = [{"player": entry["player"], **shared_activity(entry["summary"], viewer, today)} for entry in summaries
               if (relations.get((pair(subject, entry["player"]["id"]), "relation")) or {}).get("status") == "accepted"]
    result = {"date": today, "you": shared_activity(viewer, viewer, today), "friends": entries}
    if selected and any(r["id"] > selected[-1]["id"] for r in accepted):
        result["cursor"] = selected[-1]["id"]
    return result


def journey_scores(subject, viewer):
    return shared_activity(progress_summary(subject), viewer, date.today().isoformat())["journeys"]


def challenge_view(subject, value):
    if subject not in (value["owner"], value["opponent"]):
        raise Problem(403, "This challenge is private.")
    require_friend(value["owner"], value["opponent"])
    return {**value, "player": public_profile(value["opponent"] if subject == value["owner"] else value["owner"])}


def challenge_action(subject, identifier, body):
    owner = "challenge#" + str(uuid.UUID(identifier))
    old = get(owner, "details")
    if not old:
        raise Problem(404, "Challenge not found.")
    challenge_view(subject, old)
    action = body.get("action")
    value = {**old}
    if action == "accept" and old["status"] == "pending" and old["opponent"] == subject:
        value["status"] = "active"
    elif action == "decline" and old["status"] == "pending" and old["opponent"] == subject:
        value["status"] = "declined"
    elif action == "cancel" and old["status"] == "pending" and old["owner"] == subject:
        value["status"] = "cancelled"
    elif action == "result" and old["status"] in ("active", "completed"):
        if subject in old["results"]:
            return challenge_view(subject, old)
        run_id = str(uuid.UUID(body.get("runId", identifier)))
        records = saved_values(subject, "study", "history." + run_id)
        candidates = [r for r in records if isinstance(r, dict) and isinstance(r.get("session"), dict)]
        record = max(candidates, key=lambda r: len(r["session"].get("history", [])), default=None)
        session = (record or {}).get("session", {})
        answers = session.get("history", [])
        if session.get("phase") != "summary" or session.get("challengeId") != identifier or settings(session.get("settings")) != old["settings"] or not isinstance(answers, list) or len(answers) != old["settings"]["length"] or any(not isinstance(a, dict) or type(a.get("correct")) is not bool or a.get("prompt", {}).get("ordinal") != i for i, a in enumerate(answers)):
            raise Problem(409, "Finish this challenge and sync your progress before sharing its result.")
        value["results"] = {**old["results"], subject: {"correct": sum(a["correct"] for a in answers), "total": len(answers)}}
        if len(value["results"]) == 2:
            value["status"] = "completed"
    else:
        raise Problem(403, "You cannot change this challenge.")
    transact([put(owner, "details", value, old)])
    return challenge_view(subject, value)


def handle(event):
    subject = event.get("requestContext", {}).get("authorizer", {}).get("jwt", {}).get("claims", {}).get("sub")
    if not isinstance(subject, str) or not subject:
        return response(401, {"error": "Sign in to use your account."})
    try:
        route = event["routeKey"]
        body = {}
        if not route.startswith("GET "):
            headers = {k.lower(): v for k, v in event.get("headers", {}).items()}
            if headers.get("origin") not in os.environ["ALLOWED_ORIGINS"].split(","):
                raise Problem(403, "This origin is not allowed.")
            if not headers.get("content-type", "").startswith("application/json"):
                raise Problem(415, "Use JSON.")
            raw = event.get("body") or ""
            if event.get("isBase64Encoded"):
                raw = base64.b64decode(raw, validate=True).decode()
            if len(raw.encode()) > 60000:
                raise Problem(413, "This account update is too large.")
            body = json.loads(raw)
            if not isinstance(body, dict):
                raise Problem(400, "Use a valid account update.")
        params = event.get("pathParameters") or {}
        if route == "GET /account/profile":
            value = get("user#" + subject, "profile")
            tag_count("profile.presets.count", len(value.get("presets", [])) if value else 0)
        elif route == "PATCH /account/profile":
            value = save_profile(subject, body)
        elif route == "GET /account/handles/{handle}":
            value = handle_availability(subject, params.get("handle"))
        elif route == "GET /account/friends/activity":
            value = activity_page(subject, event.get("queryStringParameters"))
        elif route == "GET /account/friends/{id}/profile":
            other = params.get("id")
            value = friend_activity(subject, other, None, activity_date(event.get("queryStringParameters")))
        elif route == "GET /account/players/{handle}":
            handle = string(params.get("handle"), 24, True).lower()
            reservation = get("handle#" + handle, "owner")
            if not reservation or (relationship(subject, reservation["id"]) or {}).get("status") == "blocked":
                raise Problem(404, "No available player has that handle.")
            value = public_profile(reservation["id"])
        elif route == "GET /account/friends":
            value = [{**entry, "player": public_profile(entry["id"])} for entry in rows("user#" + subject, "friend#")]
        elif route == "POST /account/friends":
            handle = string(body.get("handle"), 24, True).lower()
            reservation = get("handle#" + handle, "owner")
            if not reservation:
                raise Problem(404, "No player has that handle.")
            value = friend_action(subject, reservation["id"], "request")
        elif route == "PATCH /account/friends/{id}":
            value = friend_action(subject, params.get("id"), body.get("action"))
        elif route == "GET /account/friends/{id}/journeys":
            other = params.get("id")
            require_friend(subject, other)
            value = journey_scores(other, progress_summary(subject, fresh=True))
        elif route == "GET /account/challenges":
            value = []
            for entry in rows("user#" + subject, "challenge#", 50):
                record = get("challenge#" + entry["id"], "details")
                if record and (relationship(record["owner"], record["opponent"]) or {}).get("status") == "accepted":
                    value.append(challenge_view(subject, record))
        elif route == "POST /account/challenges":
            other = string(body.get("opponent"), 200, True)
            relation = require_friend(subject, other)
            if subject == other:
                raise Problem(400, "Choose a friend to challenge.")
            recent = rows("user#" + subject, "challenge#", 50)
            if sum(e.get("createdAt", 0) > int(time.time()) - 86400 for e in recent) >= 20:
                raise Problem(429, "You can send up to 20 challenges a day.")
            identifier, created = str(uuid.uuid4()), int(time.time())
            value = {"id": identifier, "title": string(body.get("title"), 60, True), "owner": subject, "opponent": other, "settings": settings(body.get("settings"), True), "seed": secrets.randbits(32), "createdAt": created, "status": "pending", "results": {}}
            condition = {"ConditionCheck": {"TableName": os.environ["COMMUNITY_TABLE"], "Key": encoded(key(pair(subject, other), "relation")), "ConditionExpression": "dataJson = :old", "ExpressionAttributeValues": {":old": {"S": packed(pair(subject, other), "relation", relation)["dataJson"]}}}}
            inbox = {"id": identifier, "createdAt": created}
            transact([condition, put("challenge#" + identifier, "details", value), put("user#" + subject, f"challenge#{created:010d}#{identifier}", inbox), put("user#" + other, f"challenge#{created:010d}#{identifier}", inbox)])
            value = challenge_view(subject, value)
        elif route == "PATCH /account/challenges/{id}":
            value = challenge_action(subject, params.get("id", ""), body)
        else:
            raise Problem(404, "Not found.")
        return response(200, value)
    except Problem as error:
        return response(error.status, {"error": error.message, **error.details})
    except (ValueError, TypeError, KeyError, UnicodeError):
        return response(400, {"error": "Please check the account details and try again."})
