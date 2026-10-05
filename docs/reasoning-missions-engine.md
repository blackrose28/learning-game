# Reasoning Missions — M1 Engine Contracts

Status: Engine and local persistence implemented. Server sync, D1 storage,
per-child settings, progress aggregation, and UI integration are pending.

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

## Next M1 work

1. Add additive D1 mission-attempt storage and authenticated API validation using
   `restoreMissionAttempt`. Define idempotency by child and attempt ID, including
   monotonic updates for interrupted versus completed ledgers.
2. Add offline mission sync payloads and retry behavior. Preserve server-supported
   versions and avoid sending new payloads to an older API.
3. Add per-child opt-in/family preferences and versioned reasoning progress
   hydration, with reasoning separate from arithmetic history and scoring.
4. Verify legacy profiles and queues, cross-device behavior, and the complete M1
   exit criteria before starting the M2 player-facing Training pilot.

Local persistence currently requires the caller to know the attempt ID; discovery
of the active mission, conflict handling across devices, and rewards/session
integration belong to subsequent work.
