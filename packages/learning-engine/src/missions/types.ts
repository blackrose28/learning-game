import type { Question } from '../questions/types';

export type MissionSupport = 'guided' | 'independent';
export type MissionObjective =
  'successor_vocabulary' | 'difference_vocabulary' | 'step_order' | 'calculation';
export type MissionStepId = 'successor' | 'difference' | 'next_operation' | 'final';
export type MissionHintLevel = 'strategy' | 'partial' | 'worked';

export interface InstructionChainParameters {
  number: number;
  minuend: number;
  addend: number;
}

export interface MissionChoice {
  id: string;
  label: string;
  value: number | string;
}

export interface MissionStep {
  id: MissionStepId;
  objective: MissionObjective;
  prompt: string;
  dependsOn: MissionStepId[];
  choices: MissionChoice[];
  correctChoiceId: string;
}

/** Internal definition. Render through getMissionView to avoid revealing solutions. */
export interface InstructionChainMission {
  schemaVersion: 1;
  id: string;
  templateId: 'instruction_chain_v1';
  family: 'instruction_chain';
  locale: 'vi';
  seed: number;
  wording: 'school' | 'plain';
  support: MissionSupport;
  parameters: InstructionChainParameters;
  prompt: string;
  steps: MissionStep[];
  solution: { successor: number; difference: number; answer: number };
}

export type LearningTask =
  | { kind: 'arithmetic'; schemaVersion: 1; question: Question }
  | { kind: 'reasoning'; schemaVersion: 1; mission: InstructionChainMission };

/** Normalize already-validated legacy questions without changing their history or IDs. */
export function normalizeLearningTask(task: Question | LearningTask): LearningTask {
  return 'kind' in task ? task : { kind: 'arithmetic', schemaVersion: 1, question: task };
}

export interface MissionResponse {
  sequence: number;
  eventId: string;
  stepId: MissionStepId;
  choiceId: string;
  correct: boolean;
  assisted: boolean;
  timestamp: string;
  responseTimeMs: number;
}

export interface MissionHintEvent {
  sequence: number;
  eventId: string;
  stepId: MissionStepId;
  level: MissionHintLevel;
  timestamp: string;
}

export interface MissionAttempt {
  schemaVersion: 1;
  id: string;
  playerId: string;
  mission: InstructionChainMission;
  mode: 'training';
  startedAt: string;
  completedAt?: string;
  responses: MissionResponse[];
  hints: MissionHintEvent[];
}

export interface StoredMissionAttempt {
  attempt: MissionAttempt;
  revision: number;
}

export interface MissionSaveRequest {
  schemaVersion: 1;
  attempt: MissionAttempt;
}

export interface MissionSaveResponse extends StoredMissionAttempt {
  schemaVersion: 1;
  disposition: 'created' | 'advanced' | 'unchanged' | 'stale';
}

export interface MissionAttemptPage {
  schemaVersion: 1;
  attempts: StoredMissionAttempt[];
  nextCursor: { startedAt: string; attemptId: string } | null;
}
