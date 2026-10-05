# Reasoning Missions — M1 Browser Sync and Parent Controls

Status: M1 engineering groundwork implemented and verified. The playable Training
mission screen is implemented in [M2 Training Pilot](reasoning-missions-training.md). Parent/child teaching review remains
pending in M0.

## Per-child opt-in

Migration `0007_reasoning_settings.sql` adds versioned `reasoning_settings` with
`{ schemaVersion: 1, enabledFamilies: [] }` as the default for both existing and
new children. The only implemented family is `instruction_chain`; unknown families,
duplicate IDs, and unsupported settings versions are rejected.

The existing parent-only profile update endpoint saves `reasoningSettings`.
Profile lists, child login, auth inspection, and profile updates return it.
Changing names, arithmetic skill switches, or animation speed preserves reasoning
settings. Children cannot edit their own opt-in settings.

The parent dashboard has a separate **Reasoning practice** panel. Its instruction
chain switch changes only after the server returns the requested settings, so an
older server that ignores the new field cannot report a successful preference save.
Network failures leave settings unchanged. Sample preview disables editing.

Auth refresh compares reasoning settings as well as existing child fields, and
the app caches confirmed settings per child for offline use. Missing legacy settings
default to off. Existing mission history is preserved when a family is disabled;
M2 must use the setting to gate starting new missions, while sync continues to
preserve earlier work.

## Durable browser workspace

The browser uses `math_archer_mission_workspace_v1:<encoded player ID>` as a
versioned, per-child record. One local storage write stores these together:

- Validated local mission attempts and whether they are pending upload.
- Last known server snapshots and revisions.
- Conflict state and errors.
- Recovery archives containing both branches after an explicit parent choice.

`queueMissionAttempt` validates a snapshot and appends it to the local queue before
any network work. It accepts only an extension of the local history; shorter
snapshots cannot roll back saved responses. A conflicting local branch throws
without replacing the stored record. There is no durable `syncing` state that can
strand a record after refresh.

`getResumableMission` returns the newest incomplete, nonconflicting local attempt.
It does not start a new attempt or change evidence. The M2 screen should use this
instead of generating a replacement every time Training is reopened.

Standalone engine storage helpers from the initial M1 slice remain available.
The browser UI should use the workspace queue as its canonical storage so responses,
pending uploads, and recovery histories stay together.

Unknown/corrupt workspace versions are not deleted, silently reset, or uploaded.
Storage write failures propagate to the caller; M2 must display failures and must
not advance its UI as though an unsaved response is durable.

## Versioned API and sync

The API client implements validated save, load, and paginated listing methods.
It verifies versions, player/attempt identity, revisions, and replayed evidence.
Conflict errors retain the server's recovery details.

`syncMissionAttempts` first downloads the supported versioned listing, fetching
all pages before merging them. An older or incompatible API receives no mission
PUT requests. Unsupported endpoints and malformed data preserve queued snapshots.

Cloud and local records use the same prefix comparison as the server:

- Newer cloud history replaces a shorter local prefix.
- Newer local history stays queued and is uploaded.
- Equal histories clear pending status.
- Divergent histories preserve both branches and suspend automatic upload of that
  attempt until the parent reviews it.

Sync is single-flight per client instance and child. It re-reads local state after
each awaited operation so an older acknowledgment cannot erase responses queued
while an upload is in flight. Up to five drain rounds upload newly queued work;
if work remains, the result is `pending`, and another sync can continue it.

Network errors, expired auth, and server busy errors leave snapshots available for
retry with the original attempt/event IDs. Authenticated startup, profile changes,
online events, focus, and return to a visible tab run sync. The parent panel also
provides an explicit refresh action. No requests run while logged out or known
to be offline.

The listing cursor is for a complete listing, not a change watermark. Each
hydration starts from the first page so changes to previously listed attempts are
not missed. Child IDs scope every workspace, request, and response; profile
switches cannot hydrate another child's records into the active workspace.

## Evidence and recovery

`computeReasoningProgress` derives a schema-versioned summary from unique validated
ledgers. It counts started/completed missions, assisted completions, independent
first-answer attempts/successes, and observed guided objectives. It does not infer
vocabulary or calculation mastery from an independent final answer.

Objective summaries distinguish first-answer success from first-answer success
without a hint or earlier correction. Response durations never lower reasoning
scores, and retry delivery never adds extra observations. There is no new mastery
threshold or adaptive selection in this milestone; M5 calibrates those policies.

The parent panel shows these counts separately from arithmetic. Conflicting
attempts use the known cloud history for current summaries rather than counting
both branches or choosing the more flattering result.

The parent can choose **Use cloud history** for a conflict. This restores the
cloud snapshot for current work and keeps the displaced local snapshot with the
cloud snapshot in the recovery archive. Archived branches are excluded from
progress counts. M2 should block resuming a conflicting attempt and direct the
parent to this recovery panel.

## Validation and next work

The milestone passed 620 tests: 261 engine, 60 API, and 299 web. Coverage includes
the browser sync pipeline against the actual Worker and SQLite-backed test D1,
fresh-device hydration, partial-mission resume, queued response changes during
upload, old APIs, network/busy retries, conflict preservation/recovery, per-child
settings, and existing arithmetic/profile behavior. Type checks, changed-file
lint, engine build, and frontend production/PWA build pass.

Apply migration 0007 after 0006 before deploying the updated Worker. The existing
deployment workflow applies pending migrations first. This milestone was verified
locally; no production deployment or production migration was performed.

The M2 screen now uses these contracts for Training entry, guided/independent
missions, saved hints/responses, explicit continuation, and conflict blocking.
See [M2 Training Pilot](reasoning-missions-training.md). Keep M0 baseline
observations pending until collected.
