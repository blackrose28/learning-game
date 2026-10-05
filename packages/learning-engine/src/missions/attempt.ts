import type { SessionStorageAdapter } from '../session/types';
import { getDefaultStorage } from '../session/storage';
import { isValidCardArrangement } from './maxSumDigitCards';
import { isAcceptedChoice, validateMission } from './mission';
import type {
  MissionAttempt,
  MissionHintEvent,
  MissionResponse,
  MissionStepId,
  ReasoningMission,
} from './types';

function assertTimestamp(timestamp: string): void {
  if (!Number.isFinite(Date.parse(timestamp)) || new Date(timestamp).toISOString() !== timestamp) {
    throw new Error('Mission timestamps must be canonical ISO dates');
  }
}

export function startMissionAttempt(
  mission: ReasoningMission,
  playerId: string,
  id: string,
  startedAt: string
): MissionAttempt {
  if (!validateMission(mission) || !playerId.trim() || !id.trim()) {
    throw new Error('Invalid mission attempt identity or definition');
  }
  assertTimestamp(startedAt);
  return {
    schemaVersion: 1,
    id,
    playerId,
    mission: structuredClone(mission),
    mode: 'training',
    startedAt,
    responses: [],
    hints: [],
  };
}

export function getActiveMissionStep(attempt: MissionAttempt): MissionStepId | null {
  if (attempt.completedAt) return null;
  if (attempt.mission.support === 'independent') return 'final';
  const completed = new Set(
    attempt.responses.filter((response) => response.correct).map((response) => response.stepId)
  );
  return attempt.mission.steps.find((step) => !completed.has(step.id))?.id ?? null;
}

function assertEvent(
  attempt: MissionAttempt,
  eventId: string,
  stepId: MissionStepId,
  timestamp: string
): void {
  if (!eventId.trim()) throw new Error('An event ID is required');
  assertTimestamp(timestamp);
  const last = [...attempt.responses, ...attempt.hints].sort((a, b) => b.sequence - a.sequence)[0];
  if (Date.parse(timestamp) < Date.parse(last?.timestamp ?? attempt.startedAt)) {
    throw new Error('Mission events must be chronological');
  }
  if (getActiveMissionStep(attempt) !== stepId) throw new Error('Mission step is not active');
}

function nextSequence(attempt: MissionAttempt): number {
  return attempt.responses.length + attempt.hints.length;
}

export function recordMissionResponse(
  attempt: MissionAttempt,
  input: Omit<MissionResponse, 'sequence' | 'correct' | 'assisted'>
): MissionAttempt {
  const existing = attempt.responses.find((response) => response.eventId === input.eventId);
  if (existing) {
    if (
      existing.stepId !== input.stepId ||
      existing.choiceId !== input.choiceId ||
      existing.timestamp !== input.timestamp ||
      existing.responseTimeMs !== input.responseTimeMs
    ) {
      throw new Error('Conflicting mission event retry');
    }
    return attempt;
  }
  if (attempt.hints.some((hint) => hint.eventId === input.eventId))
    throw new Error('Duplicate mission event ID');
  assertEvent(attempt, input.eventId, input.stepId, input.timestamp);
  if (!Number.isFinite(input.responseTimeMs) || input.responseTimeMs < 0) {
    throw new Error('Invalid mission response duration');
  }
  const step = attempt.mission.steps.find((item) => item.id === input.stepId)!;
  // A card step records the child's slots as the choice, so the arrangement itself is evidence.
  const known =
    step.input === 'cards'
      ? isValidCardArrangement(step.cards ?? [], input.choiceId)
      : step.choices.some((choice) => choice.id === input.choiceId);
  if (!known) throw new Error('Unknown mission choice');
  const correct = isAcceptedChoice(step, input.choiceId);
  // Hints or earlier remediation make later responses assisted, including later steps.
  const assisted =
    attempt.hints.length > 0 || attempt.responses.some((response) => !response.correct);
  const response: MissionResponse = {
    ...input,
    sequence: nextSequence(attempt),
    correct,
    assisted,
  };
  return {
    ...attempt,
    responses: [...attempt.responses, response],
    ...(correct && input.stepId === 'final' ? { completedAt: input.timestamp } : {}),
  };
}

export function recordMissionHint(
  attempt: MissionAttempt,
  input: Omit<MissionHintEvent, 'sequence'>
): MissionAttempt {
  const existing = attempt.hints.find((hint) => hint.eventId === input.eventId);
  if (existing) {
    if (
      existing.stepId !== input.stepId ||
      existing.level !== input.level ||
      existing.timestamp !== input.timestamp
    ) {
      throw new Error('Conflicting mission hint retry');
    }
    return attempt;
  }
  if (attempt.responses.some((response) => response.eventId === input.eventId))
    throw new Error('Duplicate mission event ID');
  assertEvent(attempt, input.eventId, input.stepId, input.timestamp);
  if (!['strategy', 'partial', 'worked'].includes(input.level))
    throw new Error('Unknown mission hint level');
  return { ...attempt, hints: [...attempt.hints, { ...input, sequence: nextSequence(attempt) }] };
}

/** Evidence only: no mastery thresholds, speed penalties, arrows, or rewards. */
export function summarizeMissionAttempt(attempt: MissionAttempt) {
  const firstResponses = attempt.responses.filter(
    (response, index, responses) =>
      responses.findIndex((item) => item.stepId === response.stepId) === index
  );
  const final = firstResponses.find((response) => response.stepId === 'final');
  return {
    completed: !!attempt.completedAt,
    independentSuccess:
      attempt.mission.support === 'independent' && final?.correct === true && !final.assisted,
    assistedCompletion:
      !!attempt.completedAt &&
      (attempt.hints.length > 0 || attempt.responses.some((response) => !response.correct)),
    firstResponses: firstResponses.map((response) => ({
      stepId: response.stepId,
      // An independent final answer establishes task outcome, not a calculation diagnosis.
      objective:
        attempt.mission.support === 'guided'
          ? attempt.mission.steps.find((step) => step.id === response.stepId)!.objective
          : null,
      correct: response.correct,
      assisted: response.assisted,
    })),
  };
}

/** Replaying events verifies dependencies, outcomes, assistance, and completion metadata. */
export function restoreMissionAttempt(value: unknown): MissionAttempt {
  if (!value || typeof value !== 'object') throw new Error('Invalid saved mission attempt');
  const saved = value as MissionAttempt;
  if (
    saved.schemaVersion !== 1 ||
    saved.mode !== 'training' ||
    !Array.isArray(saved.responses) ||
    !Array.isArray(saved.hints)
  ) {
    throw new Error('Unsupported saved mission attempt');
  }
  let attempt = startMissionAttempt(saved.mission, saved.playerId, saved.id, saved.startedAt);
  const events = [
    ...saved.responses.map((response) => ({ kind: 'response' as const, event: response })),
    ...saved.hints.map((hint) => ({ kind: 'hint' as const, event: hint })),
  ].sort((a, b) => a.event.sequence - b.event.sequence);
  events.forEach(({ kind, event }, index) => {
    if (event.sequence !== index) throw new Error('Invalid mission event sequence');
    if (kind === 'response') {
      const response = event as MissionResponse;
      attempt = recordMissionResponse(attempt, {
        eventId: response.eventId,
        stepId: response.stepId,
        choiceId: response.choiceId,
        timestamp: response.timestamp,
        responseTimeMs: response.responseTimeMs,
      });
      const actual = attempt.responses.at(-1)!;
      if (
        actual.correct !== response.correct ||
        actual.assisted !== response.assisted ||
        actual.sequence !== index
      ) {
        throw new Error('Invalid mission response evidence');
      }
    } else {
      const hint = event as MissionHintEvent;
      attempt = recordMissionHint(attempt, {
        eventId: hint.eventId,
        stepId: hint.stepId,
        level: hint.level,
        timestamp: hint.timestamp,
      });
      if (attempt.hints.at(-1)!.sequence !== index)
        throw new Error('Invalid mission hint evidence');
    }
  });
  if (attempt.completedAt !== saved.completedAt)
    throw new Error('Invalid mission completion metadata');
  return attempt;
}

export function getMissionAttemptStorageKey(playerId: string, attemptId: string): string {
  return `math_archer_mission_v1:${encodeURIComponent(playerId)}:${encodeURIComponent(attemptId)}`;
}

export function saveMissionAttempt(
  attempt: MissionAttempt,
  storage: SessionStorageAdapter = getDefaultStorage()
): void {
  const validated = restoreMissionAttempt(attempt);
  storage.setItem(
    getMissionAttemptStorageKey(validated.playerId, validated.id),
    JSON.stringify(validated)
  );
}

/** Unknown/corrupt versions throw and remain untouched for recovery; missing records return null. */
export function loadMissionAttempt(
  playerId: string,
  attemptId: string,
  storage: SessionStorageAdapter = getDefaultStorage()
): MissionAttempt | null {
  const raw = storage.getItem(getMissionAttemptStorageKey(playerId, attemptId));
  if (raw === null) return null;
  const attempt = restoreMissionAttempt(JSON.parse(raw));
  if (attempt.playerId !== playerId || attempt.id !== attemptId)
    throw new Error('Saved mission identity mismatch');
  return attempt;
}
