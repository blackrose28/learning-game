import { restoreMissionAttempt, summarizeMissionAttempt } from './attempt';
import { MISSION_FAMILIES } from './types';
import type { MissionAttempt, MissionFamily, MissionObjective } from './types';

export interface ReasoningSettings {
  schemaVersion: 1;
  enabledFamilies: MissionFamily[];
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
    settings.enabledFamilies.every((family) => MISSION_FAMILIES.includes(family)) &&
    new Set(settings.enabledFamilies).size === settings.enabledFamilies.length
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

export interface ReasoningFamilyProgress {
  startedMissions: number;
  completedMissions: number;
  assistedCompletions: number;
  independentAttempts: number;
  independentSuccesses: number;
}

export interface ReasoningProgress extends ReasoningFamilyProgress {
  schemaVersion: 1;
  playerId: string;
  /** Per-family counts; a family with no missions is absent. Totals above are their sum. */
  families: Partial<Record<MissionFamily, ReasoningFamilyProgress>>;
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
    families: {},
    objectives: {},
  };
  for (const attempt of unique.values()) {
    const summary = summarizeMissionAttempt(attempt);
    const family = (progress.families[attempt.mission.family] ??= {
      startedMissions: 0,
      completedMissions: 0,
      assistedCompletions: 0,
      independentAttempts: 0,
      independentSuccesses: 0,
    });
    family.startedMissions++;
    for (const counts of [progress, family]) {
      if (summary.completed) counts.completedMissions++;
      if (summary.assistedCompletion) counts.assistedCompletions++;
      if (summary.independentSuccess) counts.independentSuccesses++;
      if (
        attempt.mission.support === 'independent' &&
        summary.firstResponses.some((response) => !response.assisted)
      ) {
        counts.independentAttempts++;
      }
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
