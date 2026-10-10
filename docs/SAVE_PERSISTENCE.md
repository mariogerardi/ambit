# Player save persistence

Journey progress and Study settings/results use LocalStorage record registers in
`src/app/recordSave.ts`, with domain codecs in `src/app/progressSaves.ts`. This
replaces shared whole-save writes that could discard another tab's results.

Scope: Journey progress and Study saves. Themes and default views use their own
small preference stores. All saves belong to the current browser origin, and
legacy `wurl.*` key names remain for compatibility. Reviewed October 10, 2026.
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
The app does not persist active Study input, so typing does not perform save writes.

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
late edit from an old run cannot replace a fresh replay. Selection pointers are
independent of run progress, so restoring an earlier Journey also works without
allowing a stale tab to change the chosen Journey. Conflicting answers at
the same progress level resolve deterministically by revision; this is not a
collaborative multi-player session.

Storage events refresh visible saves. Incoming updates are merged against the
pre-event baseline, preserving local results/settings already queued by React.
An active Study attempt stays private to its tab. Its completed or abandoned
answers are archived under its own ID and merged with other tabs' history.

## Remaining limits

Saves remain local to the browser origin. There is no account synchronization or
guarantee against the browser/user clearing site data. History and writer registers
are not automatically pruned; retention/export controls or a larger transactional
history store remain follow-up work. On quota/write failure, existing committed
records remain intact, new work stays in memory, and the app reports that saving
has failed. A later successful write can clear that failure state.

Leaving Study through app navigation archives submitted answers and clears the
active attempt. Refreshing or closing the tab still discards the active attempt;
no unload-time archival behavior was added in this pass.

Regression tests cover interleaved writers, stale preferences/drafts, queued local
completion, migration interruption, damaged/unknown saves, and result preservation.
Study tests also cover final-unanswered completion, exact review replay coverage,
and typed answers with and without WebGL. These are unit/DOM tests, not browser or
GPU verification.
