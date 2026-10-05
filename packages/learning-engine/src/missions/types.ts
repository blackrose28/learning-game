import type { Question } from '../questions/types';

export type MissionSupport = 'guided' | 'independent';
export type MissionFamily = 'instruction_chain' | 'daily_collection' | 'unknown_start';
export const MISSION_FAMILIES: readonly MissionFamily[] = [
  'instruction_chain',
  'daily_collection',
  'unknown_start',
];
export type MissionObjective =
  | 'successor_vocabulary'
  | 'predecessor_vocabulary'
  | 'greater_by_vocabulary'
  | 'less_by_vocabulary'
  | 'difference_vocabulary'
  | 'sum_vocabulary'
  | 'step_order'
  | 'starting_amount'
  | 'repeated_change'
  | 'choose_operation'
  | 'dozen_vocabulary'
  | 'find_unknown'
  | 'reverse_changes'
  | 'calculation'
  | 'calculation_over_20';
export type MissionStepId =
  | 'successor'
  | 'difference'
  | 'find_number'
  | 'combine'
  | 'next_operation'
  | 'start_amount'
  | 'repeated_change'
  | 'plan'
  | 'dozen_value'
  | 'find_unknown'
  | 'reverse_plan'
  | 'final';
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
  /** Equivalent valid plans (for example, add-backs in either order). Includes correctChoiceId. */
  acceptedChoiceIds?: string[];
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

interface MissionBase<Family extends MissionFamily> {
  schemaVersion: 1;
  id: string;
  family: Family;
  locale: 'vi';
  seed: number;
  wording: 'school' | 'plain';
  support: MissionSupport;
  prompt: string;
  steps: MissionStep[];
}

/** Internal definition. Render through getMissionView to avoid revealing solutions. */
export interface InstructionChainMissionV1 extends MissionBase<'instruction_chain'> {
  templateId: 'instruction_chain_v1';
  parameters: InstructionChainParameters;
  solution: { successor: number; difference: number; answer: number };
}

export interface InstructionChainMissionV2 extends MissionBase<'instruction_chain'> {
  templateId: 'instruction_chain_v2';
  parameters: InstructionChainV2Parameters;
  solution: { found: number; combined: number; answer: number };
}

export type InstructionChainMission = InstructionChainMissionV1 | InstructionChainMissionV2;

export type DailyObjectKey = 'kun_cards' | 'stickers' | 'marbles' | 'stamps' | 'shells';

export interface DailyCollectionParameters {
  /** One of the generator's reviewed names. */
  name: string;
  object: DailyObjectKey;
  /** Amount before the first collection day. */
  start: number;
  /** Amount added on each of the days; 1 first, then repeated addition of 2 or more. */
  perDay: number;
  days: number;
}

/** Internal definition. Render through getMissionView to avoid revealing solutions. */
export interface DailyCollectionMission extends MissionBase<'daily_collection'> {
  templateId: 'daily_collection_v1';
  parameters: DailyCollectionParameters;
  solution: { added: number; answer: number };
}

export type UnknownStartAction =
  'eat' | 'give_sister' | 'give_friend' | 'use' | 'take_out' | 'lose';
export type UnknownStartItem = 'candy' | 'orange' | 'sticker' | 'marble';

export interface UnknownStartChange {
  action: UnknownStartAction;
  /** Spoken count: 4 means "4"; with unit "chuc" 1 means "1 chục" (10). */
  count: number;
  unit: 'one' | 'chuc';
}

export interface UnknownStartParameters {
  name: string;
  item: UnknownStartItem;
  /** Two removals, in the order the story tells them. */
  changes: [UnknownStartChange, UnknownStartChange];
  remaining: number;
}

/** Internal definition. Render through getMissionView to avoid revealing solutions. */
export interface UnknownStartMissionV1 extends MissionBase<'unknown_start'> {
  templateId: 'unknown_start_v1';
  parameters: UnknownStartParameters;
  /** Amounts in story order, after "chục" is converted, and the original amount. */
  solution: { amounts: [number, number]; answer: number };
}

export type UnknownStartV2LossAction = UnknownStartAction;
export type UnknownStartV2GainAction = 'receive' | 'buy' | 'pick_up';

/** One event in the story: the amount goes down (loss) or up (gain). */
export interface UnknownStartV2Change {
  kind: 'gain' | 'loss';
  action: UnknownStartV2LossAction | UnknownStartV2GainAction;
  /** Spoken count: 4 means "4"; with unit "chuc" 1 means "1 chục" (10). */
  count: number;
  unit: 'one' | 'chuc';
}

export interface UnknownStartV2Parameters {
  name: string;
  item: UnknownStartItem;
  /** Two or three events in the order the story tells them, each a gain or a loss. */
  changes: UnknownStartV2Change[];
  remaining: number;
}

export interface UnknownStartMissionV2 extends MissionBase<'unknown_start'> {
  templateId: 'unknown_start_v2';
  parameters: UnknownStartV2Parameters;
  /** Unsigned amounts in story order, after "chục" is converted, and the original amount. */
  solution: { amounts: number[]; answer: number };
}

export type UnknownStartMission = UnknownStartMissionV1 | UnknownStartMissionV2;

/** Guided-only visual support. Cells for unanswered steps stay blank; independent has none. */
export interface MissionDiagram {
  caption: string;
  rows: string[][];
}

export type ReasoningMission =
  InstructionChainMission | DailyCollectionMission | UnknownStartMission;

export type LearningTask =
  | { kind: 'arithmetic'; schemaVersion: 1; question: Question }
  | { kind: 'reasoning'; schemaVersion: 1; mission: ReasoningMission };

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
  mission: ReasoningMission;
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
