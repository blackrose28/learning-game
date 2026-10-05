# Reasoning Missions — M1 Engine Contracts

Status: M1 engineering groundwork implemented, including engine, local persistence,
D1/API storage, browser offline sync, per-child settings, and evidence summaries.
See [M1 Browser Sync and Parent Controls](reasoning-missions-browser.md).
The player-facing Training mission screen is implemented in [M2 Training Pilot](reasoning-missions-training.md).

## Task and template boundaries

`LearningTask` separates existing arithmetic questions from reasoning missions.
`normalizeLearningTask` wraps an already-validated legacy `Question` without
changing its ID, choices, or fields. It is not a validator for untrusted API data.
Existing arithmetic callers are not migrated yet.

The first reasoning template is `instruction_chain_v1`, schema version 1, locale
`vi`. It supports `guided` and `independent` practice and `school` and `plain`
Vietnamese wording. Generation takes an unsigned 32-bit seed and optionally an
explicit `{ number, minuend, addend }` parameter snapshot.

Quantities and calculated results stay within 20; the successor starts from
1–9, addend from 1–9, and the difference is positive. Explicit parameters cover
the original problem: `{ number: 7, minuend: 14, addend: 9 }` → answer 15.

The template defines four steps: successor, difference expression, next operation,
and final answer. Steps have objective tags, explicit dependencies, shuffled
choices, and a correct choice ID. Choices have stable semantic IDs independent
of their display order. Numeric choices are deduplicated and include plausible
mistakes; they may exceed 20 because a mistaken plan can produce a larger value.

`validateInstructionChain` regenerates the full definition from its versioned
seed, parameters, wording, and support, and compares all fields. Unsupported
versions and changed solutions, choices, prompts, or dependencies are rejected.
Freeze the v1 generator once records are persisted in a released client; changes
to generated content or ordering require a new template/version and a reader for
the existing version.

### `instruction_chain_v2`

v2 widens the vocabulary without touching v1 (frozen; saved v1 attempts still
validate and restore). Training generates only v2; the original example is v2
with `{ relation: successor 7, combine: difference, other: 14, finalOperation: add, amount: 9 }`.

- **Starting number (`relation`):** `successor` (“số liền sau”), `predecessor`
  (“số liền trước”), `greater` (“số lớn hơn N là k đơn vị”) or `less` (“số bé hơn N
  là k đơn vị”), with `offset` 2–5 for `greater`/`less`.
- **Combine:** `difference` (“hiệu”, other − found) or `sum` (“tổng”, other + found).
- **Final instruction:** `add` (“cộng với”) or `subtract` (“trừ đi”) an amount of 1–9.
- Every quantity and intermediate result is a positive integer within 20.
- Steps: `find_number`, `combine`, `next_operation`, `final`. Objectives gain
  `predecessor_vocabulary`, `greater_by_vocabulary`, `less_by_vocabulary` and
  `sum_vocabulary`, so evidence separates a “liền trước” mistake from a “hơn/kém”
  one. Distractors model typical misreadings, such as swapping trước and sau or
  moving the wrong direction.
- Parameters are copied field by field, so unknown keys make validation fail.
  Choice order uses a separate seeded stream, so it is the same whether or not
  parameters were supplied.
- `getMissionStepFeedback` returns the retry explanation for either template.

Deploy order: the API must ship before clients, since an API without v2 rejects
v2 attempts. Older clients cannot read v2 attempts.

## Display and assistance

Mission definitions include solutions for engine validation; they are internal
data. Render with `getMissionView` so correct-choice keys and solution fields
are excluded. Independent practice always exposes only the final step, even if
the caller asks for an intermediate step. Guided callers should obtain the active
step from `getActiveMissionStep`, then request that step's view.

`getInstructionChainHint` provides strategy, partial scaffolding, and worked
explanation text. The partial hint leaves successor and difference blank. The
worked hint reveals the solution. UI integration must record the hint event
before displaying its content, then save the resulting attempt.

## Local attempt and event contracts

The initial attempt mode is Training. The caller supplies a unique attempt ID,
child ID, and canonical ISO start timestamp. The mission definition is cloned
into the attempt so mutating a generation result cannot alter saved evidence.

`recordMissionResponse` and `recordMissionHint` are pure state transitions:

- Events have caller-supplied stable IDs for retry delivery and chronological
  canonical ISO timestamps. Responses include a nonnegative duration in ms.
- A sequence number orders responses and hints, including equal timestamps.
- Guided practice requires each current step to be answered correctly before
  advancing; independent practice accepts final responses only.
- First responses stay in the ledger after correction. Any prior hint or incorrect
  response marks later responses assisted, including later steps. This is a
  conservative rule because error feedback may help with subsequent steps.
- A correct final response records completion. New events after completion are
  rejected; an identical event retry is a no-op. Conflicting retries and event IDs
  reused across hint/response kinds are rejected.

`summarizeMissionAttempt` reports completion, assisted completion, independent
first-response success, and first-response evidence. An independent final answer
has no inferred objective diagnosis. Guided objective evidence identifies the
observed step; it is not a mastery score. Durations do not incur a speed penalty.

Storage uses a distinct, versioned key with encoded child/attempt IDs:
`math_archer_mission_v1:<player>:<attempt>`. No arithmetic session, pair, skill,
reward, or arrow record is updated by these helpers.

`saveMissionAttempt` replays and validates the ledger before writing.
`loadMissionAttempt` returns null for a missing record and otherwise reconstructs
the attempt through the same transitions, checking identity, ordering, correctness,
assistance, and completion. Corrupt/unknown versions throw and are not deleted or
replaced. The future UI must offer recovery rather than silently resetting them.
Storage write errors propagate so callers can display save failures.

## Server storage and API

Migration `0006_mission_attempts.sql` adds one mission record per `(player_id, id)`
with a validated versioned JSON ledger, revision, and start/completion timestamps.
It leaves arithmetic tables intact. No mission save updates arithmetic attempts,
mastery, daily arrows, world progression, or rewards. Future reasoning aggregation
must derive evidence from these unique records, rather than incrementing counters
on every sync request.

`PUT /api/missions/attempts` accepts `{ schemaVersion: 1, attempt }`. It replays
the ledger with `restoreMissionAttempt` before writing and returns
`{ schemaVersion: 1, disposition, revision, attempt }`.

| Disposition | Behavior                                                                                                  |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| `created`   | New child/attempt record, revision 1.                                                                     |
| `advanced`  | Incoming events extend the saved history; revision increases.                                             |
| `unchanged` | Identical history; no database mutation.                                                                  |
| `stale`     | Incoming history is a prefix of the saved history; return the newer saved attempt without overwriting it. |

An existing attempt's mission identity and start time cannot change. Events must
match over the shared prefix, including IDs, timestamps, responses, and assistance.
Divergent histories return HTTP 409 `MISSION_CONFLICT` with the saved attempt and
revision in `details`. Preserve the local branch for recovery; do not silently
replace it or remove hints to turn assisted success into independent success.

Writes use primary-first D1 sessions and conditional revision updates. If another
writer wins, reload and compare again; after five failed retries return HTTP 503
`MISSION_BUSY`. This is retryable with the same attempt and event IDs. Corrupt
stored records fail validation and remain untouched.

`GET /api/missions/attempts?attemptId=...` returns
`{ schemaVersion: 1, revision, attempt }`, or HTTP 404 when absent.

Without `attemptId`, GET lists records with default `limit=50` (valid range 1–100),
ordered by `(startedAt, attemptId)` ascending. The response contains
`{ schemaVersion: 1, attempts: [{ attempt, revision }], nextCursor }`.
For subsequent pages, supply both `afterStartedAt` and `afterAttemptId` from
`nextCursor`; null means the current listing is exhausted. This is a listing
cursor, not an incremental change watermark. Restart listing to discover changes
to older attempts, or reload known attempt IDs directly.

All mission routes require authentication. Children can read/write only their own
attempts; a mismatched player ID returns HTTP 403. Parent requests use the player
ID in the attempt for PUT and a `playerId` query parameter for GET. They follow
the existing shared parent-role access model, which permits access to existing
child profiles across parent accounts. This expansion does not redefine that
model. Missing/deleted children return HTTP 404 and are not recreated by saves.

Unknown payload versions, malformed definitions, and falsified evidence return
HTTP 400. Child-profile deletion also removes that child's mission rows, with
both explicit deletion and a cascading foreign key.

Deploy migration 0006 before exposing these endpoints. The existing deployment
workflow applies pending migrations before publishing the Worker; manual deployment
requires the same order. No production migration was run during this work.

## Next work

M1 browser integration is documented in the companion specification. Mission API
types and prefix comparison are shared in the learning engine, so browser and
server retry/conflict rules remain consistent. Progress is recomputed from unique
ledgers without speed penalties or arithmetic mastery updates.

M2 now uses the browser workspace, resumable mission lookup, and per-child
settings. See [M2 Training Pilot](reasoning-missions-training.md) for the playable
loop and pending child observation. Adventure/Challenge, rewards, and daily-arrow
integration remain in M5.
