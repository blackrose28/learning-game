import type { Question } from '../questions/types';

export type MissionSupport = 'guided' | 'independent';
export type MissionObjective =
  | 'successor_vocabulary'
  | 'predecessor_vocabulary'
  | 'greater_by_vocabulary'
  | 'less_by_vocabulary'
  | 'difference_vocabulary'
  | 'sum_vocabulary'
  | 'step_order'
  | 'calculation';
export type MissionStepId =
  'successor' | 'difference' | 'find_number' | 'combine' | 'next_operation' | 'final';
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

/** The number the chain starts from: "liền sau/trước", or "lớn/bé hơn … đơn vị". */
export type NumberRelation =
  | { kind: 'successor'; number: number }
  | { kind: 'predecessor'; number: number }
  | { kind: 'greater'; number: number; offset: number }
  | { kind: 'less'; number: number; offset: number };

export interface InstructionChainV2Parameters {
  relation: NumberRelation;
  /** "hiệu" computes other − found; "tổng" computes other + found. */
  combine: 'difference' | 'sum';
  other: number;
  finalOperation: 'add' | 'subtract';
  amount: number;
}

interface InstructionChainMissionBase {
  schemaVersion: 1;
  id: string;
  family: 'instruction_chain';
  locale: 'vi';
  seed: number;
  wording: 'school' | 'plain';
  support: MissionSupport;
  prompt: string;
  steps: MissionStep[];
}

/** Internal definition. Render through getMissionView to avoid revealing solutions. */
export interface InstructionChainMissionV1 extends InstructionChainMissionBase {
  templateId: 'instruction_chain_v1';
  parameters: InstructionChainParameters;
  solution: { successor: number; difference: number; answer: number };
}

export interface InstructionChainMissionV2 extends InstructionChainMissionBase {
  templateId: 'instruction_chain_v2';
  parameters: InstructionChainV2Parameters;
  solution: { found: number; combined: number; answer: number };
}

export type InstructionChainMission = InstructionChainMissionV1 | InstructionChainMissionV2;

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
