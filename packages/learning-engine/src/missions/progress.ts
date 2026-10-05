import { restoreMissionAttempt, summarizeMissionAttempt } from './attempt';
import type { MissionAttempt, MissionObjective } from './types';

export interface ReasoningSettings {
  schemaVersion: 1;
  enabledFamilies: 'instruction_chain'[];
}

export function defaultReasoningSettings(): ReasoningSettings {
  return { schemaVersion: 1, enabledFamilies: [] };
}

export function isReasoningSettings(value: unknown): value is ReasoningSettings {
  if (!value || typeof value !== 'object') return false;
  const settings = value as ReasoningSettings;
  return (
    settings.schemaVersion === 1 &&
    Array.isArray(settings.enabledFamilies) &&
    settings.enabledFamilies.length <= 1 &&
    settings.enabledFamilies.every((family) => family === 'instruction_chain')
  );
}

/** Inputs must be restored/validated first. A shared prefix includes event IDs and assistance. */
export function compareMissionAttempts(
  incoming: MissionAttempt,
  current: MissionAttempt
): 'advance' | 'unchanged' | 'stale' | 'conflict' {
  if (
    incoming.playerId !== current.playerId ||
    incoming.id !== current.id ||
    incoming.mission.id !== current.mission.id ||
    incoming.startedAt !== current.startedAt ||
    incoming.mode !== current.mode
  ) {
    return 'conflict';
  }
  const events = (attempt: MissionAttempt) =>
    [
      ...attempt.responses.map((event) => ({ kind: 'response', event })),
      ...attempt.hints.map((event) => ({ kind: 'hint', event })),
    ]
      .sort((a, b) => a.event.sequence - b.event.sequence)
      .map((event) => JSON.stringify(event));
  const next = events(incoming);
  const previous = events(current);
  for (let i = 0; i < Math.min(next.length, previous.length); i++) {
    if (next[i] !== previous[i]) return 'conflict';
  }
  return next.length === previous.length
    ? 'unchanged'
    : next.length > previous.length
      ? 'advance'
      : 'stale';
}

export interface ReasoningEvidence {
  observations: number;
  firstCorrect: number;
  unassistedObservations: number;
  unassistedCorrect: number;
}

export interface ReasoningProgress {
  schemaVersion: 1;
  playerId: string;
  startedMissions: number;
  completedMissions: number;
  assistedCompletions: number;
  independentAttempts: number;
  independentSuccesses: number;
  objectives: Partial<Record<MissionObjective, ReasoningEvidence>>;
}

/** Recompute from unique ledgers, so retries cannot inflate counts. No duration-based scoring. */
export function computeReasoningProgress(
  playerId: string,
  values: readonly MissionAttempt[]
): ReasoningProgress {
  const unique = new Map<string, MissionAttempt>();
  for (const value of values) {
    const attempt = restoreMissionAttempt(value);
    if (attempt.playerId !== playerId) throw new Error('Reasoning progress identity mismatch');
    const current = unique.get(attempt.id);
    const comparison = current ? compareMissionAttempts(attempt, current) : 'advance';
    if (comparison === 'conflict') throw new Error('Conflicting reasoning histories');
    if (comparison === 'advance') unique.set(attempt.id, attempt);
  }
  const progress: ReasoningProgress = {
    schemaVersion: 1,
    playerId,
    startedMissions: unique.size,
    completedMissions: 0,
    assistedCompletions: 0,
    independentAttempts: 0,
    independentSuccesses: 0,
    objectives: {},
  };
  for (const attempt of unique.values()) {
    const summary = summarizeMissionAttempt(attempt);
    if (summary.completed) progress.completedMissions++;
    if (summary.assistedCompletion) progress.assistedCompletions++;
    if (summary.independentSuccess) progress.independentSuccesses++;
    if (
      attempt.mission.support === 'independent' &&
      summary.firstResponses.some((response) => !response.assisted)
    ) {
      progress.independentAttempts++;
    }
    for (const response of summary.firstResponses) {
      if (!response.objective) continue;
      const evidence = progress.objectives[response.objective] ?? {
        observations: 0,
        firstCorrect: 0,
        unassistedObservations: 0,
        unassistedCorrect: 0,
      };
      evidence.observations++;
      if (response.correct) evidence.firstCorrect++;
      if (!response.assisted) {
        evidence.unassistedObservations++;
        if (response.correct) evidence.unassistedCorrect++;
      }
      progress.objectives[response.objective] = evidence;
    }
  }
  return progress;
}
