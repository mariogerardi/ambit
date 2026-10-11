# Player save persistence

Journey progress and Study settings, active sessions, and results use LocalStorage record registers in
`src/app/recordSave.ts`, with domain codecs in `src/app/progressSaves.ts`. This
replaces shared whole-save writes that could discard another tab's results.

Scope: Journey progress and Study saves. Themes and default views use their own
small device-local preference stores. Guest saves belong to the current browser
origin; signed-in players synchronize progress to their account. Legacy `wurl.*`
key names remain for compatibility. Reviewed October 10, 2026.
See [Architecture](ARCHITECTURE.md) for application owners and
[Release readiness](RELEASE_READINESS.md) for remaining durability work.

## Storage and migration

The original `wurl.daily.v1` and `wurl.study.v1` formats remain readable. Their
engine-level data models are still version 1. Durable records use the separate
storage format 2 under `<original-key>.records.v2/`.

Each preference field, Journey run/selection, archive entry, or Study result has independent
registers scoped to a unique writer. Logical clocks order concurrent edits;
writer IDs break equal-clock ties. Two writers never replace each other's register.
Study results use stable session IDs and are written independently from preferences.
Active Study runs and their selection pointer are independent records. Draft
text/choices are stored separately per prompt, so typing does not rewrite session
history. Navigation, refresh, and closing the tab preserve an active session;
use **Resume session** to continue. Explicitly finishing/replacing a run archives
its submitted answers.

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
to that save. Temporarily unavailable locally published Journey references also
retain the existing protection against replacement.

The register reader ignores individual malformed entries while leaving their raw
data in place. Other valid records continue to load. Timestamps must be valid Date
values before Study history can render them.

Preference conflicts resolve per field using the latest logical revision. For the
same Journey run, answered rounds/advanced phases take precedence over stale draft
edits. Replays receive a new run ID and monotonically increasing start time, so a
late edit from an old run cannot replace a fresh replay. Daily Journey replay is
available only to admins; ordinary players can still view their completed result.
The Journey's **Play again**
action creates that new run rather than resetting the old run's forward-only state;
it keeps the played Journey even when the admin's local override is absent on a
second device. Selection pointers are
independent of run progress, so restoring an earlier Journey also works without
allowing a stale tab to change the chosen Journey. Conflicting answers at
the same progress level resolve deterministically by revision; this is not a
collaborative multi-player session.

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

Local registers act as the durable upload queue. Sync pulls all cloud pages
before uploading pending revisions, restores a new device before automatically
opening a Journey, merges against React's pre-event baseline,
and acknowledges only the revisions actually uploaded. Writes during requests
remain pending. Sync debounces changes, checks every minute while visible, and
retries on focus/reconnection with bounded backoff after failures. Signing out or
switching accounts aborts the old client's requests. Expired credentials can be
renewed; a temporary renewal failure keeps the account cache selected.

**Account** displays syncing, saved, offline, or failed status and offers retry.
Guest play needs no backend. Account play keeps local progress during outages and
syncs when connectivity/authentication recover. Theme/default globe preferences
and the admin's device-local Journey override are not synchronized. Practice
Journeys outside the daily saved flow remain temporary. Published Journey content
still uses the existing local publishing system.

## Remaining limits

There is no guarantee against clearing site data before pending work uploads. History and writer registers
are not automatically pruned; retention/export controls or a larger transactional
history store remain follow-up work. On quota/write failure, existing committed
records remain intact, new work stays in memory, and the app reports that saving
has failed. A later successful write can clear that failure state.

Regression tests cover interleaved writers, stale preferences/drafts, queued local
completion, migration interruption, damaged/unknown saves, account isolation,
paginated cloud reads, offline retries, writes during upload, and result preservation.
Study tests also cover final-unanswered completion, exact review replay coverage,
and eligible typed answers with and without WebGL, rejecting typed names already
given by map prompts, city distractor round trips, and Journey replay across devices. These are unit/DOM tests, not browser or
GPU verification.
