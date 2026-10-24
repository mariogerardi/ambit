# Player save persistence

Journey progress and Study settings, active sessions, and results use independent
record registers in `src/app/recordSave.ts`, with domain codecs in `src/app/progressSaves.ts`. This
replaces shared whole-save writes that could discard another tab's results.
`src/app/usePlayerProgress.ts` coordinates these stores and their incoming events
for the account-keyed workspace; `useProgressSync.ts` owns the cloud-client lifetime.

Scope: Journey progress and Study saves. Themes and default views use their own
small device-local preference stores. Guest saves belong to the current browser
origin; signed-in players synchronize progress to their account. Legacy `wurl.*`
key names remain for compatibility. Reviewed October 21, 2026.
See [Architecture](ARCHITECTURE.md) for application owners and
[Remaining limits](#remaining-limits) for durability work.

## Storage and migration

The original `wurl.daily.v1` and `wurl.study.v1` formats remain readable. Their
engine-level data models are still version 1. Durable records use the separate
storage format 2 under `<original-key>.records.v2/`.

`registerStorage.ts` loads the `ambit-player-progress` IndexedDB database before
the player workspace mounts. Existing LocalStorage registers are copied in a
transaction and removed from LocalStorage only after commit. Damaged raw entries
are copied too; migration does not silently discard them. Field/writer addresses,
logical clocks, conflict resolution and cloud record format remain version 2.

New edits first enter a synchronous LocalStorage journal. An asynchronous
transaction commits them into IndexedDB, then removes only journal values that
still match that commit. Aborts leave the journal for retry/reload. Database
writes compare revisions inside the transaction, so a late writer cannot replace
a newer committed value. Storage events deliver journal edits across tabs;
BroadcastChannel delivers bulk restores. Large cloud/guest imports commit
directly from their durable source instead of overflowing the journal.

In-memory records cache validated values and namespace revisions. Immutable React
updates reuse history validation/serialization; unchanged history is not checked
again per keystroke. Incoming edits invalidate snapshots. Runtime callers must
replace changed objects rather than mutate previously saved ones.

Browsers without IndexedDB can use LocalStorage only if this profile has never
migrated. Database open/version failures block saving rather than treating an
incomplete journal as the whole profile. A deployment rollback must retain the
IndexedDB reader; older LocalStorage-only bundles cannot display migrated history.

Each preference field, Journey run/selection, archive entry, or Study result has independent
registers scoped to a unique writer. Logical clocks order concurrent edits;
writer IDs break equal-clock ties. Two writers never replace each other's register.
Study results use stable session IDs and are written independently from preferences.
Active Study runs and their selection pointer are independent records. Draft
text/choices are stored separately per prompt, so typing does not rewrite session
history. Navigation, refresh, and closing the tab preserve an active session;
use **Resume session** to continue. Explicitly finishing/replacing a run archives
its submitted answers.

Shared Neighbors uses the same register store under
`wurl.minigames.shared-neighbors.v1`, with the standard account suffix for signed-in
players. Its active run stores a seed, pool signature, cycle/index, current pin,
submitted feedback, cumulative score, and an optional end reason (three strikes
or finishing early). Reloads preserve both unfinished games and final results;
stale writers cannot move a run backward or reopen a finished run. Starting again
creates a new run ID and shuffle. This minigame's progress is device-local
and independent of the Daily/Study cloud namespaces. A changed pair-pool signature
starts a fresh compatible run when play resumes.
Missing Borders uses the independent `wurl.minigames.missing-borders.v1`
namespace with the same account suffix and run merge rules. It stores a selected
territory ID instead of a pin; the seed also determines the regional camera view.
Neither minigame can replace the other's progress.

Valid legacy data is copied into immutable base registers. A migration completion
marker is written only after the entire copy succeeds. Interrupted migration can
resume from the untouched original. Historical Study attempts without IDs receive
deterministic migration IDs so remounting does not duplicate their results.

The old LocalStorage addresses become compatibility projections, not the source
of truth. Study's projection contains settings only, avoiding a duplicate growing
history blob. Damaging the projection after migration does not discard durable
results. Do not treat that projection as an export of all saved data.

## Recovery and conflicts

Known version-1 saves with damaged records are recovered record by record. Before
replacement, the exact original string is backed up at
`<original-key>.recovery.<uuid>`. Failure to create the backup prevents replacement.
Malformed JSON and unsupported future formats remain untouched and block writes
to that save. Attempts for Journeys missing from the current catalog are backed
up, retained as hidden history, and excluded from active play; other dates remain writable.

The register reader ignores individual malformed entries while leaving their raw
data in place. Other valid records continue to load. Timestamps must be valid Date
values before Study history can render them.

Preference conflicts resolve per field using the latest logical revision. For the
same Journey run, answered rounds/advanced phases take precedence over stale draft
edits. Replays receive a new run ID and monotonically increasing start time, so a
late edit from an old run cannot replace a fresh replay. Daily and Archive results
have no replay action, including for admins. Admins can explicitly clear today's
attempt from the Tools tab; other players retain their completed result.

In-place Journey facelifts can declare a `saveRevision` and prior receipt names.
Daily save decoding and opening preserve submitted grades, stamp their original
receipt labels, clear obsolete unsubmitted drafts/help, and skip already graded
feedback. Completed results are not regraded. New runs capture receipt names
and the current content revision. Synced register merges apply the same upgrade.

Compass submissions additionally capture optional `Answer.bearing` version-1
evidence: locked origin/destination records, chosen angle, target, circular error,
tier and reaction. Historical compass feedback and receipts use this snapshot;
changes to coordinates or thresholds never recalculate an earned result. The
existing text register holds pending whole-degree input, including deliberate
zero, so help and restoration preserve drafts without a separate storage key.

New Journey answers also capture `points` (0–3) and `pointsVersion: 1`.
Correctness and receipt names remain independent. Answers without point snapshots
retain their old full credit (three for correct, zero for incorrect), including
previously free help and accepted pin bands. They are not regraded or reset;
results label earlier scoring. New rewards survive content facelifts. Stronger
help merged from another tab caps a versioned reward without increasing it when
help disappears. Friend summaries apply the same rule and retain correctness
counts separately from the 15-point reward total.

Progressive country recall stores version-1 `Response.recall` history with
canonical accepted/wrong/exception IDs, original entered text, the assist-supplied
country and completion reason. Playing drafts of the same round merge these
irreversible entries across stale tabs; duplicates do not consume another guess.
A third distinct wrong country ends at zero. A partial list can retain one or two
frozen points while `Answer.correct` remains false. The frontend receipt and
backend friend/activity summaries honor this explicit partial-credit evidence;
ordinary incorrect answers still earn zero. Completed answers are not merged or
regraded. Labeled multi-pins use the existing versioned construction save, with
coordinates keyed by slot ID and a frozen per-slot containment result.

Archive play uses the same date/edition/run registers as the Daily. The URL date,
not the shared `activeDate` selection pointer, determines which attempt receives
answers, so browsing history in another tab cannot redirect today's writes.
New completions capture `DailyAttempt.completedOn`, the actual New York day on
which the final answer (or early failure) was submitted. Later results views do
not alter it; same-run merges retain the earliest recorded completion day. Legacy
results without this field keep prior streak credit. A completion earned after
its scheduled date contributes points and completed-Journey totals, but cannot
retroactively fill a Daily streak. Completed public archive entries open results;
players cannot overwrite them with a replay.

The register layer still recognizes older replay runs and keeps the played Journey
when merging them across devices. **Play again** is now offered only for practice
Journeys outside the saved Daily/Archive flow. Selection pointers are
independent of run progress, so restoring an earlier Journey also works without
allowing a stale tab to change the chosen Journey. Conflicting answers at
the same progress level resolve deterministically by revision; this is not a
collaborative multi-player session.

Admin's **Clear my Journey attempt** removes the current-day attempt rather than
creating a replay. A monotonic `reset.<date>/<journeyId>` register excludes earlier
runs of that edition from local saves and server activity summaries, so stale
tabs and devices cannot restore their answers or score. New attempts start after
the reset cutoff. Other dates, editions, Study progress, and users are preserved.

Storage events refresh visible saves. Incoming updates are merged against the
pre-event baseline, preserving local results/settings already queued by React.
Active Study progress is shared across tabs and signed-in devices. Advanced
answers/phases take precedence over stale drafts of the same run. Separate
selection pointers prevent a late edit to an old run from replacing a new run.

## Account synchronization

Each Cognito subject gets a separate local namespace. The app waits for account
lookup and remounts the player workspace when accounts change. Guest progress is
imported once per save type on the first account that claims this device's guest
progress; the guest copy remains intact. Stable import writers prevent duplicate
history on retries. Subsequent accounts never inherit that guest copy or another
account's cache. Empty guest profiles do not override cloud preferences.

Authenticated `GET`/`POST /account/saves` routes store independent registers in a
private DynamoDB table. Ownership comes only from the validated JWT subject.
Reads paginate; writes accept at most 25 records/1 MB, with 300 KB per value, and
conditionally replace only older revisions of the same writer/field. There is no
client-supplied owner or admin access to other players' saves. The table has
point-in-time recovery, encryption, and retention on stack removal.

Local registers act as the durable upload queue. Sync completes the cloud restore
before uploading pending revisions, restores a new device before automatically
opening a Journey, merges against React's pre-event baseline,
and acknowledges only the revisions actually uploaded. Writes during requests
remain pending. Sync debounces uploads, reuses cloud downloads for five minutes, and checks every
five minutes while visible. Focus uses the same freshness window; reconnect and
manual retry force a fresh pull. Failures retry with bounded backoff and a fresh
pull before sending pending revisions. Signing out or
switching accounts aborts the old client's requests. Expired credentials can be
renewed; a temporary renewal failure keeps the account cache selected.

New devices fetch full values. Cached devices request `GET /account/saves?manifest=1`:
paginated field/writer clocks without answer payloads, at up to 1,000 records per
page (also bounded by DynamoDB's byte limit). Missing/newer values are fetched
through `POST /account/saves` with `{ read: [...] }`, at most ten addresses per
request. JWT ownership supplies every lookup key. Incomplete reads do not advance
acknowledgements or permit uploads. Full-value responses from older backends are
still accepted. Reopening a profile with cached progress uses the manifest too.
Refresh still scans a revision list; this is not a server-side change log and
does not reduce DynamoDB read capacity in proportion to the transferred bytes.

**Account** displays syncing, saved, offline, or failed status and offers retry.
Guest play needs no backend. Account play keeps local progress during outages and
syncs when connectivity/authentication recover. Theme/default globe preferences
and the admin's device-local Journey override are not synchronized. Practice
Journeys outside the daily saved flow remain temporary. Previously published
local Journey packs are read-only compatibility data; the former publishing
editor and AI generator have been removed. Current bundled Journeys are authored
in source, and Admin's calendar publishes date assignments rather than new packs.

## Remaining limits

### One year of play

`npm run measure:saves` runs an offline diagnostic using the real reducers,
codecs and register reader/writer with instrumented in-memory storage. It seeds
one completed Journey and one 20-question, worldwide country-map Study session
per day, with a fresh writer per visit and retained per-prompt drafts. Journey
receipts are synthetic valid answers, without drawn geometry. It checks restored
history counts and an active typing draft. Nothing reaches AWS or player data.

Before the storage/cache changes, an October 2026 run on Node 24/Apple M1 Max measured:

| Days | Local keys | Key/value UTF-8 bytes | Initial reads, both stores | Study keystroke |
| ---- | ---------: | --------------------: | -------------------------: | --------------: |
| 1    |         47 |                27,364 |                     1.3 ms |          1.0 ms |
| 30   |        801 |               740,709 |                     7.2 ms |         14.7 ms |
| 365  |      9,511 |             8,995,041 |                    77.6 ms |        169.2 ms |

Timings are single diagnostic samples, not budgets or browser latency claims.
At a year, one keystroke enumerated 19,028 keys and read 16,832 values despite
writing only two values/588 UTF-8 bytes. Both snapshots in `RecordSave.save()`
scanned and validated retained records. Completed Study sessions are retained twice
(`session.*` and `history.*`, about 2.9 MB each); 7,300 old draft registers add
about 2.0 MB. Journey registers and their compatibility projection account for
most of the remainder. Account imports, other writers, long sessions and drawn
answers can grow this further.

The year fixture contains 9,507 cloud records/about 7.78 MB of JSON: at least
96 sequential read pages (100 records per page) or 381 batches to upload the
entire locally accumulated history. Ordinary acknowledged edits upload only pending changes;
the full initial restore transfers that history. These counts exclude
network headers, DynamoDB overhead and account import duplicates.
The unchanged year's revision manifest is about 1.41 MB of JSON instead of
7.78 MB of full values; changed payloads are fetched separately. This measures
serialized fixture data, not an AWS bandwidth or billing benchmark.

An isolated headless Chrome profile rejected the year fixture with
`QuotaExceededError` after approximately 5.24 million stored characters. Fixture
insertion order is not a prediction of the exact day saving fails; the complete
year does not fit in that browser. UTF-16 size estimates and UTF-8 transfer sizes
are different measures; quota accounting is browser-specific.

After the changes, `npm run measure:saves -- --indexeddb` adds an emulated IndexedDB
run: the same year fits with about 412 KB/five keys left in LocalStorage and a
5.3 ms save including the workspace equivalence check, with zero historical
LocalStorage reads. `fake-indexeddb` is a development-only dependency, not the
browser database implementation. An isolated real Chrome check imported the
year in about 284 ms; twelve saves had a 4.4 ms median/5.6 ms maximum. Reload
preserved all 365 Study results and the final typed draft. These measure save
operations, not complete keyboard-to-paint latency or slow devices.
Two open Chrome tabs also preserved the year while exchanging a typed draft
through the journal and a bulk-restored preference through BroadcastChannel.

`npm run measure:saves -- --storage /tmp/ambit-saves.json` exports the synthetic
fixture for a separate browser check. This diagnostic never deletes player saves.
Initial reads still validate retained history; history compaction and incremental
server summaries remain follow-up work. The browser has more capacity, not
unlimited storage.

### Durability

There is no guarantee against clearing site data before pending work uploads. History and writer registers
are not automatically pruned; acknowledged retention/export controls remain
follow-up work. On quota/write failure, existing committed
records remain intact, new work stays in memory, and the app reports that saving
has failed. A later successful write can clear that failure state.

Regression tests cover interleaved writers, stale preferences/drafts, queued local
completion, migration interruption, damaged/unknown saves, account isolation,
paginated cloud reads, offline retries, writes during upload, and result preservation.
Study tests also cover final-unanswered completion, exact review replay coverage,
and eligible typed answers with and without WebGL, rejecting typed names already
given by map prompts, city distractor round trips, and Journey replay across devices. These are unit/DOM tests, not browser or
GPU verification.

Constructed answers save versioned geographic strokes/center/vertices/endpoints
in `construction`, plus a submission-time `constructionResult` with source
revision, quality tier and metrics. The existing Journey registers retain these
fields for pending drafts and completed receipts. Do not regrade restored
constructions or replace their geometry with an authored example. Geometry and
metric validation rejects corrupt or excessive payloads. Changes to frozen
scoring sources require an explicit edition/save-continuity decision.
